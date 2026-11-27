-- v4 WP03 — Bukti bank internal-only (QA V4-BP-005..010, V4-MG-001, RAN-012). Satu transaksi lalu ROLLBACK.
-- BELUM DIJALANKAN (sesi tanpa MCP Supabase, 27 Nov 2026). Jalankan setelah migrasi 20261127e diterapkan; harapan: semua baris ok = true.
begin;
create temp table _r (t text, ok boolean, info text) on commit drop;
grant all on _r to authenticated, anon;
create temp table _k (k text primary key, v text) on commit drop;
grant all on _k to authenticated, anon;
create or replace function pg_temp.expect_fail(q text) returns text language plpgsql as $$
begin execute q; return 'NO ERROR'; exception when others then return sqlerrm; end $$;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
 ('00000000-0000-0000-0000-0000000b0c01','cmdbp@x.test','authenticated','authenticated', now()),
 ('00000000-0000-0000-0000-0000000b0a01','rangerbp@x.test','authenticated','authenticated', now()),
 ('00000000-0000-0000-0000-0000000b0b01','creatorbp@x.test','authenticated','authenticated', now()),
 ('00000000-0000-0000-0000-0000000b0d01','opbp@x.test','authenticated','authenticated', now()),
 ('00000000-0000-0000-0000-0000000b0e01','opfin@x.test','authenticated','authenticated', now());
insert into public.st_profiles (id, email, display_name, active_role) values
 ('00000000-0000-0000-0000-0000000b0a01','rangerbp@x.test','Ranger BP','ranger'),
 ('00000000-0000-0000-0000-0000000b0b01','creatorbp@x.test','Creator BP','trainer'),
 ('00000000-0000-0000-0000-0000000b0d01','opbp@x.test','Operator','operator'),
 ('00000000-0000-0000-0000-0000000b0e01','opfin@x.test','Operator Finance','operator');
insert into public.st_role_grants (person_id, role) values ('00000000-0000-0000-0000-0000000b0a01','ranger'), ('00000000-0000-0000-0000-0000000b0b01','trainer'),
 ('00000000-0000-0000-0000-0000000b0d01','operator'), ('00000000-0000-0000-0000-0000000b0e01','operator');
insert into public.st_payables (id, beneficiary_id, source_type, label, amount, status) values
 ('00000000-0000-0000-0000-0000000b9a01','00000000-0000-0000-0000-0000000b0a01','adjustment','Honor uji Ranger', 500000, 'approved'),
 ('00000000-0000-0000-0000-0000000b9b01','00000000-0000-0000-0000-0000000b0b01','program','Bagi hasil uji', 300000, 'approved');

-- objek bukti di storage (seolah sudah diunggah Commander)
insert into storage.objects (bucket_id, name) values
 ('st-proofs','payments/00000000-0000-0000-0000-0000000b9a01/1-ranger.png'),
 ('st-proofs','payments/00000000-0000-0000-0000-0000000b9a01/2-ranger-v2.png'),
 ('st-proofs','payments/00000000-0000-0000-0000-0000000b9b01/1-creator.pdf');

-- V4-MG-001: policy lama penerima sudah hilang
insert into _r select 'V4-MG-001 policy storage penerima dihapus', count(*) = 0, count(*)::text from pg_policies where schemaname = 'storage' and policyname = 'st-proofs: penerima baca';
insert into _r select 'V4-MG-001 RLS payment penerima dihapus', count(*) = 0, count(*)::text from pg_policies where tablename = 'st_payments' and policyname = 'payment: penerima';
insert into _r select 'immutable: tanpa policy update/delete di st-proofs', count(*) = 0, string_agg(policyname || ':' || cmd, ',')
  from pg_policies where schemaname = 'storage' and tablename = 'objects' and (qual like '%st-proofs%' or with_check like '%st-proofs%') and cmd in ('UPDATE','DELETE','ALL');

-- Commander mencatat transfer + bukti (V4-BP-005)
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000b0c01","email":"cmdbp@x.test","role":"authenticated","aal":"aal2","app_metadata":{"role":"admin"}}';
insert into _r select 'hash wajib valid', r like '%Hash%', r from (select pg_temp.expect_fail($$select public.st_record_payment('00000000-0000-0000-0000-0000000b9a01', 500000, 'TRX-RNG-0001', current_date, 'bank_transfer', 'payments/00000000-0000-0000-0000-0000000b9a01/1-ranger.png', 'abc')$$) r) q;
insert into _r select 'path di luar folder payable ditolak', r like '%Lokasi%', r from (select pg_temp.expect_fail($$select public.st_record_payment('00000000-0000-0000-0000-0000000b9a01', 500000, 'TRX-RNG-0001', current_date, 'bank_transfer', 'payments/00000000-0000-0000-0000-0000000b9b01/1-creator.pdf', repeat('a', 64))$$) r) q;
select public.st_record_payment('00000000-0000-0000-0000-0000000b9a01', 500000, 'TRX-RNG-0001', current_date, 'bank_transfer', 'payments/00000000-0000-0000-0000-0000000b9a01/1-ranger.png', repeat('a', 64));
select public.st_record_payment('00000000-0000-0000-0000-0000000b9b01', 100000, 'TRX-CRT-0002', current_date, 'bank_transfer', 'payments/00000000-0000-0000-0000-0000000b9b01/1-creator.pdf', repeat('b', 64));
insert into _k select 'pr', id::text from public.st_payments where payable_id = '00000000-0000-0000-0000-0000000b9a01';
insert into _r select 'V4-BP-005 hash + versi 1 + pengunggah tercatat', proof_version = 1 and proof_uploaded_by = '00000000-0000-0000-0000-0000000b0c01' and proof_sha256 = repeat('a', 64), proof_version::text
  from public.st_payments where id = (select v::uuid from _k where k = 'pr');
insert into _r select 'V4-BP-005 riwayat versi bukti', count(*) = 1, count(*)::text from public.st_payment_proofs where payment_id = (select v::uuid from _k where k = 'pr');
insert into _r select 'V4-BP-005 audit pembayaran + bukti', count(*) >= 2, count(*)::text from public.st_audit where entity in ('st_payments','st_payment_proofs') and actor_id = '00000000-0000-0000-0000-0000000b0c01';
insert into _r select 'file bukti yang sama tidak bisa dipakai ulang', r like '%sudah dipakai%', r from (select pg_temp.expect_fail(format('select public.st_payment_add_proof(%L, %L, %L, %L)', (select v from _k where k = 'pr'), 'payments/00000000-0000-0000-0000-0000000b9a01/1-ranger.png', repeat('c', 64), 'Ganti bukti salah')) r) q;
select public.st_payment_add_proof((select v::uuid from _k where k = 'pr'), 'payments/00000000-0000-0000-0000-0000000b9a01/2-ranger-v2.png', repeat('d', 64), 'Bukti pertama terpotong');
insert into _r select 'versi baru = path baru, versi lama tetap', (select proof_version from public.st_payments where id = (select v::uuid from _k where k = 'pr')) = 2
  and (select count(*) from public.st_payment_proofs where payment_id = (select v::uuid from _k where k = 'pr')) = 2, '';
insert into _r select 'Commander bisa membaca objek bukti', count(*) = 3, count(*)::text from storage.objects where bucket_id = 'st-proofs' and name like 'payments/00000000-0000-0000-0000-0000000b9%';
-- email "Pembayaran berhasil": tanpa path/hash bukti, referensi disamarkan
insert into _r select 'V4-BP-008 email payout tanpa bukti', count(*) = 1 and bool_and(not (payload ? 'proof_path') and not (payload::text like '%payments/%') and payload ->> 'reference_masked' = '••••0001'),
  string_agg(payload::text, ' | ') from public.st_outbox where topic = 'payout.paid' and recipient = 'rangerbp@x.test';
insert into _r select 'V4-BP-009 email kontributor (sebagian) diantre', count(*) = 1 and bool_and((payload ->> 'partial')::boolean), count(*)::text from public.st_outbox where topic = 'payout.paid' and recipient = 'creatorbp@x.test';

-- Ranger: tidak bisa membaca bukti (V4-BP-006, RAN-012)
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000b0a01","email":"rangerbp@x.test","role":"authenticated"}';
insert into _r select 'V4-BP-006 Ranger tidak melihat objek bukti (path ditebak)', count(*) = 0, count(*)::text from storage.objects where bucket_id = 'st-proofs';
insert into _r select 'V4-BP-006 Ranger tidak membaca st_payments langsung', count(*) = 0, count(*)::text from public.st_payments;
insert into _r select 'V4-BP-006 Ranger tidak membaca riwayat bukti', count(*) = 0, count(*)::text from public.st_payment_proofs;
insert into _r select 'RAN-012 Ranger melihat status, nominal, tanggal, ref tersamar', count(*) = 1 and bool_and(amount = 500000 and status = 'PAID' and reference_masked = '••••0001'), count(*)::text from public.st_my_payments();
insert into _r select 'st_my_payments tidak punya kolom bukti', not exists (select 1 from pg_proc p where p.proname = 'st_my_payments' and pg_get_function_result(p.oid) like '%proof%'), '';
insert into _r select 'Ranger tidak bisa mengunggah ke st-proofs', r <> 'NO ERROR', r from (select pg_temp.expect_fail($$insert into storage.objects (bucket_id, name) values ('st-proofs', 'payments/00000000-0000-0000-0000-0000000b9a01/palsu.png')$$) r) q;
insert into _r select 'Ranger tidak bisa menambah versi bukti', r like '%Commander%', r from (select pg_temp.expect_fail(format('select public.st_payment_add_proof(%L, %L, %L, %L)', (select v from _k where k = 'pr'), 'payments/00000000-0000-0000-0000-0000000b9a01/3.png', repeat('e', 64), 'coba coba')) r) q;
insert into _r select 'notifikasi in-app Ranger tanpa tautan bukti', count(*) = 1 and bool_and(title = 'Pembayaran berhasil' and link = '/missions/earnings'), string_agg(title || ' ' || coalesce(link, ''), ',')
  from public.st_notifications where recipient_id = '00000000-0000-0000-0000-0000000b0a01' and kind = 'payout.status';

-- Kontributor (V4-BP-007)
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000b0b01","email":"creatorbp@x.test","role":"authenticated"}';
insert into _r select 'V4-BP-007 Kontributor tidak melihat objek bukti', count(*) = 0, count(*)::text from storage.objects where bucket_id = 'st-proofs';
insert into _r select 'V4-BP-007 Kontributor hanya melihat pembayarannya sendiri', count(*) = 1 and bool_and(amount = 100000), count(*)::text from public.st_my_payments();

-- Operator tanpa izin (V4-BP-010) lalu dengan izin FINANCE_EVIDENCE
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000b0d01","email":"opbp@x.test","role":"authenticated"}';
insert into _r select 'V4-BP-010 Operator tanpa izin evidence ditolak', count(*) = 0, count(*)::text from storage.objects where bucket_id = 'st-proofs';
insert into _r select 'Operator tidak bisa memberi izin sendiri', r like '%Commander%', r from (select pg_temp.expect_fail($$select public.st_set_staff_permission('00000000-0000-0000-0000-0000000b0d01', 'FINANCE_EVIDENCE', true, null)$$) r) q;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000b0c01","email":"cmdbp@x.test","role":"authenticated","aal":"aal2","app_metadata":{"role":"admin"}}';
insert into _r select 'izin evidence hanya untuk Operator', r like '%Operator aktif%', r from (select pg_temp.expect_fail($$select public.st_set_staff_permission('00000000-0000-0000-0000-0000000b0a01', 'FINANCE_EVIDENCE', true, null)$$) r) q;
select public.st_set_staff_permission('00000000-0000-0000-0000-0000000b0e01', 'FINANCE_EVIDENCE', true, 'Finance internal');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000b0e01","email":"opfin@x.test","role":"authenticated"}';
insert into _r select 'Operator dengan FINANCE_EVIDENCE bisa membaca bukti', count(*) = 3, count(*)::text from storage.objects where bucket_id = 'st-proofs' and name like 'payments/00000000-0000-0000-0000-0000000b9%';
insert into _r select 'Operator finance tidak bisa mengunggah bukti', r <> 'NO ERROR', r from (select pg_temp.expect_fail($$insert into storage.objects (bucket_id, name) values ('st-proofs', 'payments/00000000-0000-0000-0000-0000000b9a01/op.png')$$) r) q;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000b0c01","email":"cmdbp@x.test","role":"authenticated","aal":"aal2","app_metadata":{"role":"admin"}}';
select public.st_set_staff_permission('00000000-0000-0000-0000-0000000b0e01', 'FINANCE_EVIDENCE', false, 'Dicabut');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000b0e01","email":"opfin@x.test","role":"authenticated"}';
insert into _r select 'izin dicabut → akses bukti hilang', count(*) = 0, count(*)::text from storage.objects where bucket_id = 'st-proofs';

reset role;
select t, ok, info from _r order by ok, t;
rollback;
