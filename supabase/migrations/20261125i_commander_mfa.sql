-- MFA Commander (PRD v3.0 §03.1 & §17, QA AUT-016): payout, refund, approval, undangan & rilis butuh sesi MFA (JWT aal2).
--  * Ditegakkan di server lewat st_require_mfa() di awal RPC sensitif — bukan hanya di UI.
--  * Di balik flag `commander_mfa_required` (default OFF) agar Commander tidak terkunci sebelum mendaftarkan authenticator.
--    Mengubah flag ini sendiri wajib dari sesi aal2 (trigger st_flag_mfa_guard); SQL console (tanpa JWT) tetap bisa untuk darurat.
--  * Non-Commander tidak terpengaruh: fungsi tetap menolak mereka lewat cek perannya sendiri.

insert into public.st_flags (key, label, description, enabled, locked) values
  ('commander_mfa_required', 'MFA wajib untuk Commander', 'Payout, refund, approval, undangan & rilis butuh sesi MFA (authenticator). Nyalakan setelah authenticator terdaftar.', false, false)
on conflict (key) do nothing;

create or replace function public.st_aal2() returns boolean language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
$$;

create or replace function public.st_require_mfa() returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if public.st_is_commander() and coalesce((select enabled from public.st_flags where key = 'commander_mfa_required'), false) and not public.st_aal2() then
    raise exception 'Aksi ini butuh verifikasi MFA. Masukkan kode authenticator (masuk ulang bila perlu).' using errcode = '42501';
  end if;
end $$;

create or replace function public.st_flag_mfa_guard() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.key = 'commander_mfa_required' and new.enabled is distinct from old.enabled and auth.uid() is not null and not public.st_aal2() then
    raise exception 'Setelan MFA hanya bisa diubah dari sesi yang sudah diverifikasi authenticator.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists g_st_flag_mfa on public.st_flags;
create trigger g_st_flag_mfa before update on public.st_flags for each row execute function public.st_flag_mfa_guard();

-- Sisipkan `perform public.st_require_mfa();` di awal blok utama RPC sensitif (idempoten).
do $$
declare f regprocedure; def text;
begin
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('st_record_payment','st_payable_decide','edu_record_refund','st_release_program_payable',
             'st_set_grant','st_create_invite','st_company_decide','st_assessment_decide','st_showcase_decide','st_showcase_set_income',
             'st_ranger_decide_deactivation','st_send_to_edu','st_appoint','st_review_attempt') loop
    def := pg_get_functiondef(f);
    continue when def like '%st_require_mfa()%';
    def := regexp_replace(def, E'\\nbegin[ \\t]*\\n', E'\nbegin\n  perform public.st_require_mfa();\n', 'i');
    if def not like '%st_require_mfa()%' then raise exception 'Gagal menyisipkan MFA ke %', f; end if;
    execute def;
  end loop;
end $$;

revoke execute on function public.st_require_mfa(), public.st_flag_mfa_guard() from public, anon;
grant execute on function public.st_require_mfa() to authenticated;
grant execute on function public.st_aal2() to authenticated;

-- Perbaikan: payable tak dikenal kini ditolak dengan pesan jelas (sebelumnya lolos cek status karena NULL).
create or replace function public.st_payable_decide(p_id uuid, p_approve boolean, p_note text) returns void
language plpgsql security definer set search_path = '' as $function$
declare p record;
begin
  perform public.st_require_mfa();
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  select * into p from public.st_payables where id = p_id for update;
  if not found then raise exception 'Payable tidak ditemukan.'; end if;
  if p.status <> 'pending_approval' then raise exception 'Payable ini sudah diputuskan.'; end if;
  if not p_approve and length(trim(coalesce(p_note, ''))) < 5 then raise exception 'Alasan penolakan wajib diisi.'; end if;
  update public.st_payables set status = case when p_approve then 'approved' else 'rejected' end, note = p_note, approved_by = auth.uid(), approved_at = now() where id = p_id;
  if p.source_type = 'mission' and p_approve then update public.st_missions set status = 'payable_approved' where id = p.source_id and status = 'payable_pending_approval'; end if;
  perform public.st_notify(p.beneficiary_id, null, 'payout.status', case when p_approve then 'Honor disetujui — menunggu transfer' else 'Payable ditolak' end, p.label, '/missions/earnings');
end $function$;
