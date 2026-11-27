-- v4 WP01 — aktivasi Kontributor (QA V4-AT-001..010, AUT-005..008). Hasil 2026-11-27: 25/25. Satu transaksi lalu ROLLBACK.
-- Token dibaca dari st_outbox_secrets sebagai postgres (meniru edge st-notify); klien tidak pernah bisa membacanya.
begin;
create temp table _r (t text, ok boolean, info text) on commit drop;
grant all on _r to authenticated, anon;
create temp table _k (k text primary key, v text) on commit drop;
grant all on _k to authenticated, anon;
create or replace function pg_temp.expect_fail(q text) returns text language plpgsql as $$
begin execute q; return 'NO ERROR'; exception when others then return sqlerrm; end $$;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
 ('00000000-0000-0000-0000-0000000ac001','cmdact@x.test','authenticated','authenticated', now()),
 ('00000000-0000-0000-0000-0000000ac0a1','learnerkontrib@x.test','authenticated','authenticated', now());
insert into public.st_profiles (id, email, display_name, active_role) values ('00000000-0000-0000-0000-0000000ac0a1','learnerkontrib@x.test','Learner Lama','learner');
insert into public.st_role_grants (person_id, role) values ('00000000-0000-0000-0000-0000000ac0a1','learner');
insert into public.st_applications (id, type, source, name, email, payload) values
 ('00000000-0000-0000-0000-0000000aa001','trainer','edu','Kontributor Baru','kontribbaru@x.test','{}'),
 ('00000000-0000-0000-0000-0000000aa002','trainer','edu','Learner Lama','learnerkontrib@x.test','{}');

-- Bukan Commander tidak bisa approve
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000ac0a1","email":"learnerkontrib@x.test","role":"authenticated"}';
insert into _r select 'non-commander tidak bisa approve', r like '%Hanya Commander%', r
  from (select pg_temp.expect_fail($$select public.st_application_approve('00000000-0000-0000-0000-0000000aa001', null)$$) r) q;

-- Commander: approve = 1 langkah
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000ac001","email":"cmdact@x.test","role":"authenticated","app_metadata":{"role":"admin"}}';
insert into _k select 'inv1', (public.st_application_approve('00000000-0000-0000-0000-0000000aa001', 'Portofolio cukup.') ->> 'invite_id');
insert into _r select 'V4-AT-001 approve → 1 undangan pending', count(*) = 1, count(*)::text from public.st_invites where email = 'kontribbaru@x.test' and status = 'pending';
insert into _r select 'V4-AT-001 masa berlaku 24 jam', bool_and(expires_at between now() + interval '23 hours 59 minutes' and now() + interval '24 hours 1 minute'), max(expires_at)::text from public.st_invites where id = (select v::uuid from _k where k = 'inv1');
insert into _r select 'V4-AT-001 aplikasi → invited', status = 'invited', status from public.st_applications where id = '00000000-0000-0000-0000-0000000aa001';
insert into _r select 'V4-AT-002 1 email outbox, template kontributor, tanpa password', count(*) = 1 and bool_and(template = 'contributor_approved' and not (payload ? 'password') and payload ->> 'email' = 'kontribbaru@x.test'), count(*)::text
  from public.st_outbox where aggregate_id = (select v::uuid from _k where k = 'inv1');
insert into _r select 'Commander tidak bisa membaca secret token', r like '%permission denied%', r from (select pg_temp.expect_fail($$select * from public.st_outbox_secrets$$) r) q;
insert into _r select 'Commander tidak bisa memanggil worker outbox', r like '%permission denied%', r from (select pg_temp.expect_fail($$select * from public.st_outbox_claim(5)$$) r) q;
insert into _r select 'Commander tidak bisa menerbitkan undangan tanpa RPC resmi', r like '%permission denied%', r
  from (select pg_temp.expect_fail($$select public.st_issue_invite('a@x.test', array['trainer'], null, 1, false, null)$$) r) q;

reset role;
insert into _k select 'tok1', s.secret from public.st_outbox_secrets s join public.st_outbox o on o.id = s.outbox_id where o.aggregate_id = (select v::uuid from _k where k = 'inv1');
insert into _r select 'peek: email lengkap + belum punya akun', (public.st_invite_peek((select v from _k where k = 'tok1')) ->> 'email') = 'kontribbaru@x.test'
  and (public.st_invite_peek((select v from _k where k = 'tok1')) ->> 'has_account') = 'false', public.st_invite_peek((select v from _k where k = 'tok1'))::text;

-- Kirim ulang: token lama dicabut, outbox lama dibatalkan, secret lama dihapus
set local role authenticated;
insert into _k select 'inv2', (public.st_application_approve('00000000-0000-0000-0000-0000000aa001', null) ->> 'invite_id');
reset role;
insert into _r select 'V4-AT-004 resend mencabut undangan lama', status = 'revoked', status from public.st_invites where id = (select v::uuid from _k where k = 'inv1');
insert into _r select 'V4-AT-004 outbox lama dibatalkan & secret dihapus', o.status = 'cancelled' and not exists (select 1 from public.st_outbox_secrets s where s.outbox_id = o.id), o.status
  from public.st_outbox o where o.aggregate_id = (select v::uuid from _k where k = 'inv1');
insert into _k select 'tok2', s.secret from public.st_outbox_secrets s join public.st_outbox o on o.id = s.outbox_id where o.aggregate_id = (select v::uuid from _k where k = 'inv2');
insert into _r select 'hanya 1 undangan pending per email', count(*) = 1, count(*)::text from public.st_invites where email = 'kontribbaru@x.test' and status = 'pending';

-- Pemegang tautan membuat akun (meniru st-activate), lalu menerima
insert into auth.users (id, email, aud, role, email_confirmed_at) values ('00000000-0000-0000-0000-0000000ac0b1','kontribbaru@x.test','authenticated','authenticated', now());
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000ac0b1","email":"kontribbaru@x.test","role":"authenticated"}';
insert into _r select 'V4-AT-004 token lama ditolak', r like '%dicabut%', r from (select pg_temp.expect_fail(format('select public.st_accept_invite(%L)', (select v from _k where k = 'tok1'))) r) q;
insert into _r select 'V4-AT-003 token baru diterima → peran trainer', public.st_accept_invite((select v from _k where k = 'tok2')) = array['trainer'], '';
insert into _r select 'nama tampilan dari aplikasi', display_name = 'Kontributor Baru', display_name from public.st_profiles where id = '00000000-0000-0000-0000-0000000ac0b1';
insert into _r select 'V4-AT-003 token dipakai dua kali ditolak', r like '%dipakai%', r from (select pg_temp.expect_fail(format('select public.st_accept_invite(%L)', (select v from _k where k = 'tok2'))) r) q;
reset role;
insert into _r select 'aplikasi → active', status = 'active', status from public.st_applications where id = '00000000-0000-0000-0000-0000000aa001';

-- Learner yang sudah punya akun → peran ditambahkan ke identitas yang sama (V4-AT-007)
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000ac001","email":"cmdact@x.test","role":"authenticated","app_metadata":{"role":"admin"}}';
insert into _k select 'inv3', (public.st_application_approve('00000000-0000-0000-0000-0000000aa002', null) ->> 'invite_id');
reset role;
insert into _r select 'V4-AT-007 email existing → template has_account', (payload ->> 'has_account') = 'true', payload ->> 'has_account' from public.st_outbox where aggregate_id = (select v::uuid from _k where k = 'inv3');
insert into _k select 'tok3', s.secret from public.st_outbox_secrets s join public.st_outbox o on o.id = s.outbox_id where o.aggregate_id = (select v::uuid from _k where k = 'inv3');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000ac0a1","email":"learnerkontrib@x.test","role":"authenticated"}';
select public.st_accept_invite((select v from _k where k = 'tok3'));
reset role;
insert into _r select 'V4-AT-007 satu person_id, learner + trainer', count(distinct person_id) = 1 and count(*) = 2, string_agg(role, ',' order by role)
  from public.st_role_grants where person_id = '00000000-0000-0000-0000-0000000ac0a1' and status = 'active';

-- Kedaluwarsa ditolak + permintaan kirim ulang anonim hanya memberi tahu Commander
update public.st_invites set status = 'pending', expires_at = now() - interval '1 minute' where id = (select v::uuid from _k where k = 'inv1');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000ac0b1","email":"kontribbaru@x.test","role":"authenticated"}';
insert into _r select 'V4-AT-005 token kedaluwarsa ditolak', r like '%kedaluwarsa%', r from (select pg_temp.expect_fail(format('select public.st_accept_invite(%L)', (select v from _k where k = 'tok1'))) r) q;
reset role;
set local role anon;
select public.st_invite_request_resend((select v from _k where k = 'tok1'));
select public.st_invite_request_resend((select v from _k where k = 'tok1'));
select public.st_invite_request_resend('tidak-ada');
reset role;
insert into _r select 'V4-AT-005 minta kirim ulang → 1 notifikasi Commander, tanpa token baru', count(*) = 1, count(*)::text from public.st_notifications where kind = 'invite.resend_requested' and body like 'kontribbaru@x.test%';
insert into _r select 'V4-AT-005 tidak ada undangan baru otomatis', count(*) = 0, count(*)::text from public.st_invites where email = 'kontribbaru@x.test' and status = 'pending' and expires_at > now();

-- Worker: sukses menghapus secret; token kedaluwarsa → failed tanpa retry
insert into _k select 'ob3', id::text from public.st_outbox where aggregate_id = (select v::uuid from _k where k = 'inv3');
select public.st_outbox_done((select v::uuid from _k where k = 'ob3'), true, null);
insert into _r select 'outbox sent → secret dihapus', o.status = 'sent' and not exists (select 1 from public.st_outbox_secrets where outbox_id = o.id), o.status from public.st_outbox o where o.id = (select v::uuid from _k where k = 'ob3');
update public.st_outbox set status = 'sending', attempts = 1 where aggregate_id = (select v::uuid from _k where k = 'inv2');
select public.st_outbox_done((select id from public.st_outbox where aggregate_id = (select v::uuid from _k where k = 'inv2')), false, 'smtp timeout');
insert into _r select 'gagal sementara → retry_pending dengan backoff', status = 'retry_pending' and next_attempt_at > now(), status from public.st_outbox where aggregate_id = (select v::uuid from _k where k = 'inv2');
select public.st_outbox_done((select id from public.st_outbox where aggregate_id = (select v::uuid from _k where k = 'inv2')), false, 'TOKEN_EXPIRED: x');
insert into _r select 'token kedaluwarsa → failed', status = 'failed', status from public.st_outbox where aggregate_id = (select v::uuid from _k where k = 'inv2');

select t, ok, info from _r order by ok, t;
rollback;
