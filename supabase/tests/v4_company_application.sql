-- v4 WP02 — Company Application (QA V4-CA-001..012, V4-CP-001, V4-MG-003, COM-001..004). Hasil 2026-11-27: 28/28. Satu transaksi lalu ROLLBACK.
begin;
create temp table _r (t text, ok boolean, info text) on commit drop;
grant all on _r to authenticated, anon;
create temp table _k (k text primary key, v text) on commit drop;
grant all on _k to authenticated, anon;
create or replace function pg_temp.expect_fail(q text) returns text language plpgsql as $$
begin execute q; return 'NO ERROR'; exception when others then return sqlerrm; end $$;
create or replace function pg_temp.base() returns jsonb language sql as $$
  select jsonb_build_object('legal_name','PT Uji Zq','nib','1234567890','industry','Teknologi','address','Jl. Uji No. 1, Bandung',
    'business_email','hr@ujizq.test','company_whatsapp','0812-3456-7890','pic_name','Pic Uji','pic_role','HR Lead','purpose','hiring',
    'hiring_needs','Butuh dua analis data junior yang paham spreadsheet dan AI.','authority_statement',true,'data_consent',true,
    'logo_path','companies/x/logo.png','logo_rights',true,'idem_key','idem-zq-1')
$$;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
 ('00000000-0000-0000-0000-0000000c0c01','cmdco@x.test','authenticated','authenticated', now()),
 ('00000000-0000-0000-0000-0000000c0a01','learnerco@x.test','authenticated','authenticated', now()),
 ('00000000-0000-0000-0000-0000000c0b01','rangerco@x.test','authenticated','authenticated', now());
insert into public.st_profiles (id, email, display_name, active_role) values
 ('00000000-0000-0000-0000-0000000c0a01','learnerco@x.test','Learner','learner'), ('00000000-0000-0000-0000-0000000c0b01','rangerco@x.test','Ranger','ranger');
insert into public.st_role_grants (person_id, role) values ('00000000-0000-0000-0000-0000000c0a01','learner'), ('00000000-0000-0000-0000-0000000c0b01','ranger');
insert into public.st_ranger_status (person_id, origin, status) values ('00000000-0000-0000-0000-0000000c0b01','legacy_import','ACTIVE');

-- Klien tidak bisa memanggil inti pengajuan
set local role anon;
insert into _r select 'anon tidak bisa memanggil st_company_submit', r like '%permission denied%', r from (select pg_temp.expect_fail($$select public.st_company_submit('{}'::jsonb, 'edu', null, null)$$) r) q;
reset role;

-- Validasi server (meniru edge company-apply, service role = postgres)
insert into _r select 'V4-CA-002 email wajib', r like '%Email perusahaan%', r from (select pg_temp.expect_fail(format('select public.st_company_submit(%L::jsonb, %L, null, null)', (pg_temp.base() - 'business_email')::text, 'edu')) r) q;
insert into _r select 'V4-CA-003 WhatsApp tidak valid ditolak', r like '%WhatsApp%', r from (select pg_temp.expect_fail(format('select public.st_company_submit(%L::jsonb, %L, null, null)', (pg_temp.base() || '{"company_whatsapp":"12345"}')::text, 'edu')) r) q;
insert into _r select 'V4-CA-004 logo + izin wajib dari EDU', r like '%logo%', r from (select pg_temp.expect_fail(format('select public.st_company_submit(%L::jsonb, %L, null, null)', (pg_temp.base() - 'logo_path')::text, 'edu')) r) q;
insert into _r select 'kesepakatan data wajib', r like '%Kesepakatan%', r from (select pg_temp.expect_fail(format('select public.st_company_submit(%L::jsonb, %L, null, null)', (pg_temp.base() || '{"data_consent":false}')::text, 'edu')) r) q;
insert into _k select 'c1', (public.st_company_submit(pg_temp.base(), 'edu', null, 'iphash-zq') ->> 'id');
insert into _r select 'V4-CA-001 masuk antrean Commander', status = 'IN_COMMANDER_QUEUE' and source = 'edu' and owner_id is null, status from public.st_companies where id = (select v::uuid from _k where k = 'c1');
insert into _r select 'WA dinormalisasi ke E.164', company_whatsapp = '+6281234567890', company_whatsapp from public.st_companies where id = (select v::uuid from _k where k = 'c1');
insert into _r select 'V4-CA-007 1 email konfirmasi di outbox', count(*) = 1, count(*)::text from public.st_outbox where subject_id = (select v::uuid from _k where k = 'c1') and channel = 'email' and topic = 'company.application';
insert into _r select 'V4-CA-009 WhatsApp dicatat skipped_provider_off', count(*) = 1 and bool_and(status = 'skipped_provider_off'), string_agg(status, ',') from public.st_outbox where subject_id = (select v::uuid from _k where k = 'c1') and channel = 'whatsapp';
insert into _r select 'V4-CA-001 notifikasi Commander', count(*) = 1, count(*)::text from public.st_notifications where kind = 'company_application.submitted' and body like 'PT Uji Zq%';
insert into _r select 'V4-CA-006 idem key sama → ref sama, tanpa baris baru', (public.st_company_submit(pg_temp.base(), 'edu', null, 'iphash-zq') ->> 'duplicate') = 'true'
  and (select count(*) from public.st_companies where legal_name = 'PT Uji Zq') = 1, '';
insert into _r select 'V4-CA-006 duplikat cepat (idem baru, data sama) → ref lama', (public.st_company_submit(pg_temp.base() || '{"idem_key":"idem-zq-2"}', 'edu', null, 'iphash-zq') ->> 'id') = (select v from _k where k = 'c1'), '';
insert into _r select 'V4-CA-006 tetap 1 email konfirmasi', count(*) = 1, count(*)::text from public.st_outbox where subject_id = (select v::uuid from _k where k = 'c1') and topic = 'company.application' and channel = 'email';

-- Pihak lain tidak melihat pengajuan
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000c0a01","email":"learnerco@x.test","role":"authenticated"}';
insert into _r select 'V4-CA-011 learner tidak melihat pengajuan perusahaan', count(*) = 0, count(*)::text from public.st_companies;
insert into _r select 'V4-CA-011 learner tidak melihat outbox', count(*) = 0, count(*)::text from public.st_outbox;
select public.st_company_apply(pg_temp.base() || '{"legal_name":"PT Learner Zq","business_email":"hr@learnerzq.test","idem_key":"idem-zq-3","logo_path":"companies/lain/logo.png"}');
insert into _r select 'Studio apply: pemilik = akun pengaju, path logo dari klien dibuang', owner_id = '00000000-0000-0000-0000-0000000c0a01' and logo_path is null, coalesce(logo_path, 'null')
  from public.st_companies where legal_name = 'PT Learner Zq';

-- Commander: VERIFIED → undangan aman, role belum aktif
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000c0c01","email":"cmdco@x.test","role":"authenticated","app_metadata":{"role":"admin"}}';
select public.st_company_decide((select v::uuid from _k where k = 'c1'), 'VERIFIED', 'Identitas & kewenangan PIC sudah dicek.');
insert into _r select 'V4-CA-010 VERIFIED → COMPANY_INVITE_SENT', status = 'COMPANY_INVITE_SENT' and invite_id is not null, status from public.st_companies where id = (select v::uuid from _k where k = 'c1');
insert into _r select 'V4-CA-010 undangan company_partner ke email perusahaan', i.roles = array['company_partner'] and i.email = 'hr@ujizq.test' and i.status = 'pending', i.email
  from public.st_invites i join public.st_companies c on c.invite_id = i.id where c.id = (select v::uuid from _k where k = 'c1');
insert into _r select 'V4-CA-008 email status VERIFIED diantre', count(*) = 1, count(*)::text from public.st_outbox where subject_id = (select v::uuid from _k where k = 'c1') and topic = 'company.status' and channel = 'email';
insert into _r select 'email undangan perusahaan terhubung ke company', count(*) = 1, count(*)::text from public.st_outbox where subject_id = (select v::uuid from _k where k = 'c1') and topic = 'invite.activation' and template = 'company_invite';

-- Backfill butuh dilengkapi sebelum verifikasi
reset role;
insert into public.st_companies (id, legal_name, nib, business_email, pic_name, pic_role, hiring_needs, authority_statement, terms_version, source, source_ref, status, needs_completion)
values ('00000000-0000-0000-0000-0000000ccb01','PT Backfill Zq','123','bf@zq.test','Bf','HR','—', true,'t','backfill','VBX-ZQ','SUBMITTED', true);
set local role authenticated;
insert into _r select 'V4-MG-003 backfill belum lengkap tidak bisa diverifikasi', r like '%belum lengkap%', r from (select pg_temp.expect_fail($$select public.st_company_decide('00000000-0000-0000-0000-0000000ccb01', 'VERIFIED', 'Sudah dicek identitasnya.')$$) r) q;
select public.st_company_complete('00000000-0000-0000-0000-0000000ccb01', '{"company_whatsapp":"081299990000","industry":"Ritel","address":"Jl. Lengkap No. 9, Jakarta","purpose":"both"}');
insert into _r select 'V4-MG-003 dilengkapi Commander → masuk antrean', status = 'IN_COMMANDER_QUEUE' and not needs_completion, status from public.st_companies where id = '00000000-0000-0000-0000-0000000ccb01';

-- Email PIC milik Ranger aktif → verifikasi ditolak
reset role;
insert into _k select 'c2', (public.st_company_submit(pg_temp.base() || '{"legal_name":"PT Ranger Zq","business_email":"rangerco@x.test","idem_key":"idem-zq-4"}', 'edu', null, null) ->> 'id');
set local role authenticated;
insert into _r select 'firewall: email PIC Ranger aktif ditolak', r like '%Ranger aktif%', r from (select pg_temp.expect_fail(format('select public.st_company_decide(%L, %L, %L)', (select v from _k where k = 'c2'), 'VERIFIED', 'Identitas sudah dicek lengkap.')) r) q;

-- PIC membuat akun lalu menerima undangan (in-app, email login terverifikasi)
reset role;
insert into auth.users (id, email, aud, role, email_confirmed_at) values ('00000000-0000-0000-0000-0000000c0d01','hr@ujizq.test','authenticated','authenticated', now());
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000c0d01","email":"hr@ujizq.test","role":"authenticated"}';
insert into _r select 'sebelum diterima: belum ada akses perusahaan', public.st_my_company(null) is null, '';
insert into _r select 'st_my_invites menampilkan undangan perusahaan', count(*) = 1, count(*)::text from public.st_my_invites();
select public.st_accept_invite_by_id((select id from public.st_my_invites() limit 1));
reset role;
insert into _r select 'diterima → ACTIVE + pemilik terhubung', status = 'ACTIVE' and owner_id = '00000000-0000-0000-0000-0000000c0d01', status from public.st_companies where id = (select v::uuid from _k where k = 'c1');
set local role authenticated;
insert into _r select 'COM-003 workspace aktif setelah undangan diterima', public.st_my_company('HIRING_VIEW') = (select v::uuid from _k where k = 'c1'), '';
insert into _r select 'undangan tidak bisa dipakai dua kali', r like '%dipakai%', r from (select pg_temp.expect_fail(format('select public.st_accept_invite_by_id(%L)', (select invite_id from public.st_companies where id = (select v::uuid from _k where k = 'c1')))) r) q;

select t, ok, info from _r order by ok, t;
rollback;
