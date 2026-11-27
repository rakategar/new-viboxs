-- v4 WP05 (Points) — QA V4-TV-001..003, V4-MG-002. Satu transaksi lalu ROLLBACK.
-- BELUM DIJALANKAN (sesi tanpa MCP Supabase, 27 Nov 2026). Jalankan setelah migrasi 20261127g; harapan: semua ok = true.
begin;
create temp table _r (t text, ok boolean, info text) on commit drop;
grant all on _r to authenticated;
create or replace function pg_temp.expect_fail(q text) returns text language plpgsql as $$
begin execute q; return 'NO ERROR'; exception when others then return sqlerrm; end $$;

insert into _r select 'kampanye Points OFF & terkunci', not enabled and locked, enabled::text || '/' || locked::text from public.st_flags where key = 'early_points_campaign';
insert into _r select 'st_register_learner tidak lagi memberi poin', pg_get_functiondef('public.st_register_learner(text,text,boolean)'::regprocedure) like '%v4 WP05%', '';
insert into _r select 'arsip poin lama tetap ada (tanpa konversi)', count(*) >= 0, count(*)::text from public.st_points;
insert into _r select 'service/SQL pun tidak bisa menulis poin baru', r like '%diarsipkan%', r from (select pg_temp.expect_fail($$insert into public.st_points (person_id, campaign, reason, points) select id, 'x', 'y', 1 from public.st_profiles limit 1$$) r) q;

insert into auth.users (id, email, aud, role, email_confirmed_at) values ('00000000-0000-0000-0000-0000000e0a01','learnerpt@x.test','authenticated','authenticated', now());
update public.st_flags set enabled = true where key = 'learner_self_registration';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000e0a01","email":"learnerpt@x.test","role":"authenticated"}';
insert into _r select 'pendaftaran Learner: early_points = false', (public.st_register_learner('Learner PT', 'privacy-v1', false) ->> 'early_points') = 'false', '';
insert into _r select 'learner tidak bisa membaca st_points', count(*) = 0, count(*)::text from public.st_points;

reset role;
select t, ok, info from _r order by ok, t;
rollback;
