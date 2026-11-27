-- v4 WP00 — Isolasi akun demo (QA V4-MG-005, P00 v4).
--  * Akun demo ditandai app_metadata.demo=true (hanya bisa diisi service role / SQL), disalin ke st_profiles.is_demo.
--    Pengguna tidak bisa mengubah kolom ini sendiri (grant UPDATE st_profiles per kolom, is_demo tidak termasuk).
--  * Jalur talent: perusahaan nyata tidak pernah melihat/mengundang kandidat demo; perusahaan demo hanya kandidat demo.
--  * Program milik akun demo tidak bisa dikirim ke katalog EDU kecuali flag demo_publish_sandbox ON (default OFF).
--  * Showcase milik akun demo tidak bisa PUBLIC_APPROVED dan tidak pernah tampil di edu_showcase().
-- Diterapkan sebagai penggantian teks persis pada definisi live agar bagian lain fungsi tidak berubah.
-- Rollback: alter table st_profiles drop column is_demo (cascade fungsi helper), lalu jalankan ulang definisi
-- fungsi dari 20261125d/20261125e/20261125h/20261125i.

alter table public.st_profiles add column if not exists is_demo boolean not null default false;
update public.st_profiles p set is_demo = true
  from auth.users u where u.id = p.id and coalesce(u.raw_app_meta_data ->> 'demo', '') = 'true' and not p.is_demo;
grant select (is_demo) on public.st_profiles to authenticated;

create or replace function public.st_is_demo(p uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select is_demo from public.st_profiles where id = p), false)
      or coalesce((select raw_app_meta_data ->> 'demo' = 'true' from auth.users where id = p), false);
$$;
create or replace function public.st_company_is_demo(c uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select public.st_is_demo(owner_id) or legal_name like '[DEMO]%' from public.st_companies where id = c), false);
$$;
-- Hanya dipakai di dalam fungsi security definer lain; tidak dibuka ke klien.
revoke execute on function public.st_is_demo(uuid), public.st_company_is_demo(uuid) from public, anon, authenticated;

insert into public.st_flags (key, label, description, enabled, locked) values
  ('demo_publish_sandbox', 'Publikasi program akun demo', 'Bila ON, program milik akun demo boleh dikirim ke katalog EDU (hanya untuk uji sandbox). Default OFF agar katalog publik tidak berisi produk demo.', false, false)
on conflict (key) do nothing;

do $$
declare def text; old_sql text; new_sql text;
begin
  -- 1) Talent search: kandidat harus satu "dunia" (demo/nyata) dengan perusahaan.
  def := pg_get_functiondef('public.st_company_talent_search(text,text)'::regprocedure);
  old_sql := $o$and not public.st_ranger_active(t.person_id)$o$;
  new_sql := $n$and not public.st_ranger_active(t.person_id)
    and public.st_is_demo(t.person_id) = public.st_company_is_demo(v_cmp)$n$;
  if position('st_company_is_demo' in def) = 0 then
    if position(old_sql in def) = 0 then raise exception 'Predikat ranger tidak ditemukan di st_company_talent_search.'; end if;
    execute replace(def, old_sql, new_sql);
  end if;

  -- 2) Undangan hiring (st_hiring_invite_for memanggil fungsi ini).
  def := pg_get_functiondef('public.st_hiring_invite(uuid,text,text)'::regprocedure);
  old_sql := $o$or public.st_ranger_active(p_candidate)$o$;
  new_sql := $n$or public.st_ranger_active(p_candidate)
     or public.st_is_demo(p_candidate) <> public.st_company_is_demo(v_cmp)$n$;
  if position('st_company_is_demo' in def) = 0 then
    if position(old_sql in def) = 0 then raise exception 'Predikat ranger tidak ditemukan di st_hiring_invite.'; end if;
    execute replace(def, old_sql, new_sql);
  end if;

  -- 3) Kirim ke EDU: tolak program akun demo kecuali sandbox ON.
  def := pg_get_functiondef('public.st_send_to_edu(uuid)'::regprocedure);
  old_sql := $o$if not d.rights_declared then$o$;
  new_sql := $n$if public.st_is_demo(d.owner_id) and not coalesce((select enabled from public.st_flags where key = 'demo_publish_sandbox'), false) then
    raise exception 'Program milik akun demo tidak dikirim ke katalog EDU publik (flag demo_publish_sandbox OFF).';
  end if;
  if not d.rights_declared then$n$;
  if position('demo_publish_sandbox' in def) = 0 then
    if position(old_sql in def) = 0 then raise exception 'Cek hak materi tidak ditemukan di st_send_to_edu.'; end if;
    execute replace(def, old_sql, new_sql);
  end if;

  -- 4) Showcase: Commander tidak bisa menayangkan profil akun demo.
  def := pg_get_functiondef('public.st_showcase_decide(uuid,boolean,text)'::regprocedure);
  old_sql := $o$if s.status <> 'SUBMITTED' then$o$;
  new_sql := $n$if p_approve and public.st_is_demo(s.owner_id) then raise exception 'Profil akun demo tidak boleh tayang publik.'; end if;
  if s.status <> 'SUBMITTED' then$n$;
  if position('st_is_demo' in def) = 0 then
    if position(old_sql in def) = 0 then raise exception 'Cek status tidak ditemukan di st_showcase_decide.'; end if;
    execute replace(def, old_sql, new_sql);
  end if;

  -- 5) Showcase publik: lapis kedua, akun demo tidak pernah ikut.
  def := pg_get_functiondef('public.edu_showcase()'::regprocedure);
  old_sql := $o$where s.status = 'PUBLIC_APPROVED' and s.review_due >= current_date$o$;
  new_sql := $n$where s.status = 'PUBLIC_APPROVED' and s.review_due >= current_date and not public.st_is_demo(s.owner_id)$n$;
  if position('st_is_demo' in def) = 0 then
    if position(old_sql in def) = 0 then raise exception 'Filter status tidak ditemukan di edu_showcase.'; end if;
    execute replace(def, old_sql, new_sql);
  end if;
end $$;

-- 6) Lapis terakhir di katalog: baris EDU milik akun demo tidak pernah bisa published=true (sandbox hanya mengizinkan draft).
create or replace function public.edu_program_qa_guard() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.published and coalesce((new.data ->> 'qa')::boolean, false) then raise exception 'Program fixture QA tidak boleh ditayangkan.'; end if;
  if new.published and new.contributor_id is not null and public.st_is_demo(new.contributor_id) then
    raise exception 'Program milik akun demo tidak boleh ditayangkan di katalog publik.';
  end if;
  return new;
end $$;
