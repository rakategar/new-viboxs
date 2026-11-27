-- v4 WP05 (bagian Points) — Hapus Points, Token saja (QA V4-TV-001..003, V4-MG-002). Override v3 O5.
--  * Kampanye early_points_campaign OFF + terkunci; st_register_learner tidak lagi memberi poin.
--  * st_points menjadi arsip read-only: tidak ada INSERT/UPDATE/DELETE dari siapa pun (trigger), hanya Commander yang membaca.
--  * Tidak ada konversi Points → Token.
-- Rollback: drop trigger g_st_points_ro; drop policy "poin: arsip commander"; buat lagi policy "poin sendiri / commander" (20261120);
--   kembalikan st_register_learner dari 20261120; update st_flags set locked = false where key = 'early_points_campaign'.

update public.st_flags set enabled = false, locked = true,
  description = 'DIARSIPKAN (v4 WP05): Points dihapus, hanya Token. Data lama tersimpan read-only tanpa konversi.'
where key = 'early_points_campaign';

do $$
declare def text; old_sql text := $o$select enabled, config into f from public.st_flags where key = 'early_points_campaign';$o$;
begin
  def := pg_get_functiondef('public.st_register_learner(text,text,boolean)'::regprocedure);
  if position('v4 WP05' in def) > 0 then return; end if;
  if position(old_sql in def) = 0 then raise exception 'Blok Early Points tidak ditemukan di st_register_learner.'; end if;
  execute replace(def, old_sql, $n$select false as enabled, null::jsonb as config into f; -- v4 WP05: Points dihapus, tidak ada poin baru$n$);
end $$;

-- arsip read-only
revoke insert, update, delete, truncate on public.st_points from anon, authenticated;
create or replace function public.st_points_readonly() returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Points sudah diarsipkan (v4) — data read-only.' using errcode = '42501';
end $$;
drop trigger if exists g_st_points_ro on public.st_points;
create trigger g_st_points_ro before insert or update or delete on public.st_points for each row execute function public.st_points_readonly();
revoke execute on function public.st_points_readonly() from public, anon, authenticated;

drop policy if exists "poin sendiri / commander" on public.st_points;
drop policy if exists "poin: arsip commander" on public.st_points;
create policy "poin: arsip commander" on public.st_points for select to authenticated using ((select public.st_is_commander()));
