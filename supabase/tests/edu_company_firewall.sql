-- Uji negatif Batch 2–6 + lowongan & AI (Runbook §6, QA COM-*, RAN-*, LEA-*, SHO-*). Hasil 2026-11-24: 39/39. Satu transaksi lalu ROLLBACK — tidak meninggalkan data.
-- Jalankan lewat MCP execute_sql; tiap aktor disimulasikan dengan set local role authenticated + request.jwt.claims.
begin;
create temp table _r (t text, ok boolean, info text) on commit drop;
grant all on _r to authenticated;
create or replace function pg_temp.expect_fail(q text) returns text language plpgsql as $$
begin execute q; return 'NO ERROR'; exception when others then return sqlerrm; end $$;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
 ('00000000-0000-0000-0000-00000000c001','cmd@x.test','authenticated','authenticated', now()),
 ('00000000-0000-0000-0000-00000000a001','learner@x.test','authenticated','authenticated', now()),
 ('00000000-0000-0000-0000-00000000a002','quiet@x.test','authenticated','authenticated', now()),
 ('00000000-0000-0000-0000-00000000b001','ranger@x.test','authenticated','authenticated', now()),
 ('00000000-0000-0000-0000-00000000d001','hr1@x.test','authenticated','authenticated', now()),
 ('00000000-0000-0000-0000-00000000d002','hr2@x.test','authenticated','authenticated', now()),
 ('00000000-0000-0000-0000-00000000e001','newranger@x.test','authenticated','authenticated', now());
insert into public.st_profiles (id, email, display_name, active_role) values
 ('00000000-0000-0000-0000-00000000a001','learner@x.test','Learner A','learner'),
 ('00000000-0000-0000-0000-00000000a002','quiet@x.test','Quiet','learner'),
 ('00000000-0000-0000-0000-00000000b001','ranger@x.test','Ranger R','ranger'),
 ('00000000-0000-0000-0000-00000000d001','hr1@x.test','HR Satu','company_partner'),
 ('00000000-0000-0000-0000-00000000d002','hr2@x.test','HR Dua','company_partner'),
 ('00000000-0000-0000-0000-00000000e001','newranger@x.test','Baru',null);
insert into public.st_role_grants (person_id, role) values
 ('00000000-0000-0000-0000-00000000a001','learner'), ('00000000-0000-0000-0000-00000000a002','learner'),
 ('00000000-0000-0000-0000-00000000b001','ranger'), ('00000000-0000-0000-0000-00000000b001','learner'),
 ('00000000-0000-0000-0000-00000000d001','company_partner'), ('00000000-0000-0000-0000-00000000d002','company_partner');
insert into public.st_ranger_status (person_id, origin, status) values ('00000000-0000-0000-0000-00000000b001','legacy_import','ACTIVE');
insert into public.st_companies (id, owner_id, legal_name, business_email, pic_name, pic_role, hiring_needs, authority_statement, terms_version, status, grants) values
 ('00000000-0000-0000-0000-0000000cc001','00000000-0000-0000-0000-00000000d001','PT Satu','hr1@x.test','HR Satu','HR','Rekrut admin operasional dua orang remote', true,'t','VERIFIED', array['HIRING_VIEW','HIRING_MANAGE','SERVICES_LEAD']),
 ('00000000-0000-0000-0000-0000000cc002','00000000-0000-0000-0000-00000000d002','PT Dua','hr2@x.test','HR Dua','HR','Rekrut desainer grafis untuk tim pemasaran', true,'t','VERIFIED', array['HIRING_VIEW','HIRING_MANAGE','SERVICES_LEAD']);

-- Learner A opt-in (jalur normal)
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000a001","email":"learner@x.test","role":"authenticated"}';
insert into public.st_talent_profiles (person_id, opt_in, alias, skills) values ('00000000-0000-0000-0000-00000000a001', true, 'Learner A', array['admin','spreadsheet']);
insert into _r select 'COM-003 learner opt-in tercatat consent', count(*) = 1, '' from public.st_consents where person_id = '00000000-0000-0000-0000-00000000a001' and purpose = 'talent_opt_in';

-- Ranger aktif mencoba opt-in → ditolak server
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000b001","email":"ranger@x.test","role":"authenticated"}';
insert into _r select 'RAN active ranger opt-in rejected', r like '%Ranger aktif%', r from (select pg_temp.expect_fail($$insert into public.st_talent_profiles (person_id, opt_in, alias, skills) values ('00000000-0000-0000-0000-00000000b001', true, 'R', array['backend'])$$) r) q;
insert into _r select 'RAN-016 ranger cannot call talent search', r like '%perusahaan terverifikasi%', r from (select pg_temp.expect_fail($$select * from public.st_company_talent_search('', '')$$) r) q;
insert into _r select 'RAN-017 ranger sees no companies', count(*) = 0, count(*)::text from public.st_companies;
insert into _r select 'RAN ranger sees no vacancies', count(*) = 0, count(*)::text from public.st_vacancies;

-- Paksa baris opt-in Ranger (lewati trigger) untuk membuktikan filter server tetap menyaring (COM-005)
reset role;
set local session_replication_role = replica;
insert into public.st_talent_profiles (person_id, opt_in, alias, skills, opted_in_at) values ('00000000-0000-0000-0000-00000000b001', true, 'Ranger R', array['backend'], now());
set local session_replication_role = origin;

-- Perusahaan 1
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000d001","email":"hr1@x.test","role":"authenticated"}';
insert into _r select 'COM-004 company finds opt-in learner', count(*) = 1, string_agg(alias, ',') from public.st_company_talent_search('', '') where alias = 'Learner A';
insert into _r select 'COM-005 active ranger never in search', count(*) = 0, count(*)::text from public.st_company_talent_search('', '') where alias = 'Ranger R';
insert into _r select 'COM-003 non opt-in learner hidden', count(*) = 0, '' from public.st_company_talent_search('Quiet', '');
insert into _r select 'COM direct talent table read = own only', count(*) = 0, count(*)::text from public.st_talent_profiles;
insert into _r select 'COM-010 company sees no missions', count(*) = 0, '' from public.st_missions;
insert into _r select 'COM-010 company sees no payables', count(*) = 0, '' from public.st_payables;
insert into _r select 'COM-009 company sees no tokens/stars', (select count(*) from public.st_token_ledger) + (select count(*) from public.st_star_events) = 0, '';
insert into _r select 'company sees no edu orders', count(*) = 0, '' from public.edu_orders;
insert into _r select 'invite to active ranger rejected', r like '%tidak tersedia%', r from (select pg_temp.expect_fail($$select public.st_hiring_invite('00000000-0000-0000-0000-00000000b001', 'Backend', 'Kami tertarik dengan pengalaman backend Anda untuk proyek internal.')$$) r) q;
insert into public.st_vacancies (company_id, title, skills, work_mode, contract_type, comp_range, show_comp, process, hr_contact)
  values ('00000000-0000-0000-0000-0000000cc001', 'Admin operasional', array['spreadsheet'], 'remote', 'fulltime', 'Rp6-8 juta', false, 'Wawancara 2 tahap', 'hr-internal@satu.test');
create temp table _inv as select public.st_hiring_invite_for('00000000-0000-0000-0000-00000000a001', (select id from public.st_vacancies where title = 'Admin operasional'), 'Kami membuka posisi admin operasional remote, tertarik berdiskusi?') id;
grant select on _inv to authenticated;
create temp table _vac as select id from public.st_vacancies; grant select on _vac to authenticated;
insert into _r select 'VAC company sees own vacancy', count(*) = 1, '' from public.st_vacancies;
insert into _r select 'VAC invite linked to vacancy', vacancy_id is not null, '' from public.st_hiring_invites where id = (select id from _inv);
insert into _r select 'COM-011 contact hidden before acceptance', r like '%setelah kandidat menerima%', r from (select pg_temp.expect_fail($$select public.st_hiring_contact((select id from _inv))$$) r) q;
insert into _r select 'COM-011 no message before acceptance', r <> 'NO ERROR', r from (select pg_temp.expect_fail($$insert into public.st_messages (thread_type, thread_id, body) values ('hiring', (select id from _inv), 'halo')$$) r) q;

-- Perusahaan 2 tidak melihat pipeline perusahaan 1 (COM-007)
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000d002","email":"hr2@x.test","role":"authenticated"}';
insert into _r select 'COM-007 other company cannot see invites', count(*) = 0, count(*)::text from public.st_hiring_invites;
insert into _r select 'COM-007 other company hiring_list empty', count(*) = 0, '' from public.st_hiring_list();
insert into _r select 'VAC other company cannot read vacancies', count(*) = 0, count(*)::text from public.st_vacancies;
insert into _r select 'VAC other company cannot invite via foreign vacancy', r like '%tidak ditemukan%', r from (select pg_temp.expect_fail($$select public.st_hiring_invite_for('00000000-0000-0000-0000-00000000a001', (select id from _vac), 'Pesan undangan yang cukup panjang untuk lolos validasi.')$$) r) q;
insert into _r select 'VAC other company cannot read vacancy brief', r like '%Tidak berhak%', r from (select pg_temp.expect_fail($$select public.st_hiring_vacancy((select id from _inv))$$) r) q;
insert into _r select 'COM-007 contact by guessed id denied', r <> 'NO ERROR', r from (select pg_temp.expect_fail($$select public.st_hiring_contact((select id from _inv))$$) r) q;

-- Kandidat menerima → kontak & thread terbuka (COM-013)
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000a001","email":"learner@x.test","role":"authenticated"}';
insert into _r select 'VAC candidate sees brief w/o HR contact & hidden comp', not (v ? 'hr_contact') and not (v ? 'comp_range') and v ->> 'title' = 'Admin operasional', v::text from (select public.st_hiring_vacancy((select id from _inv)) v) q;
select public.st_hiring_respond((select id from _inv), 'ACCEPTED');
insert into public.st_messages (thread_type, thread_id, body) values ('hiring', (select id from _inv), 'Terima kasih, saya tertarik.');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000d001","email":"hr1@x.test","role":"authenticated"}';
insert into _r select 'COM-013 contact after acceptance', (public.st_hiring_contact((select id from _inv)) ->> 'email') = 'learner@x.test', '';
insert into _r select 'COM-013 company reads thread', count(*) = 1, '' from public.st_messages where thread_type = 'hiring';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000d002","email":"hr2@x.test","role":"authenticated"}';
insert into _r select 'COM-007 other company cannot read thread', count(*) = 0, '' from public.st_messages where thread_type = 'hiring';

-- Learner tanpa entitlement tidak bisa membuka asesmen / order orang lain (LEA-011, CHE-012)
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000a002","email":"quiet@x.test","role":"authenticated"}';
insert into _r select 'LEA-011 my_assessments empty w/o entitlement', count(*) = 0, '' from public.st_my_assessments();
insert into _r select 'CHE-012 learner sees no other orders', count(*) = 0, '' from public.edu_orders;
insert into _r select 'AUT-013 learner cannot decide company', r like '%Hanya Commander%', r from (select pg_temp.expect_fail($$select public.st_company_decide('00000000-0000-0000-0000-0000000cc001', 'SUSPENDED', 'percobaan tanpa hak')$$) r) q;
insert into _r select 'AUT-013 learner cannot refund', r like '%Hanya Commander%', r from (select pg_temp.expect_fail($$select public.edu_record_refund(gen_random_uuid(), 1000, 'percobaan tanpa hak akses')$$) r) q;
insert into _r select 'TOK-019 token redeem denied', r like '%belum aktif%', r from (select pg_temp.expect_fail($$select public.st_token_redeem('EDU000000-00000000', 10)$$) r) q;
insert into _r select 'learner cannot self-grant company role', r <> 'NO ERROR', r from (select pg_temp.expect_fail($$insert into public.st_role_grants (person_id, role) values ('00000000-0000-0000-0000-00000000a002', 'company_partner')$$) r) q;
insert into _r select 'learner cannot read AI suggestions / runs of others', (select count(*) from public.st_attempt_ai_suggestions) + (select count(*) from public.st_ai_runs where person_id <> auth.uid()) = 0, '';

-- RAN-002: Ranger baru tanpa riwayat Learner ditolak saat menerima undangan non-legacy
reset role;
insert into public.st_invites (token_hash, email, roles, expires_at) values (encode(extensions.digest('tok-new-ranger', 'sha256'), 'hex'), 'newranger@x.test', array['ranger'], now() + interval '1 day');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000e001","email":"newranger@x.test","role":"authenticated"}';
insert into _r select 'RAN-002 new ranger bypassing learner rejected', r like '%EDU Learner%', r from (select pg_temp.expect_fail($$select public.st_accept_invite('tok-new-ranger')$$) r) q;

-- SHO-007 / SHO-003: showcase publik kosong & tanpa kolom privat
reset role;
insert into _r select 'SHO-007 no approved profile → empty', count(*) = 0, '' from public.edu_showcase();
insert into _r select 'SHO-003 showcase API has no owner/contact columns', not exists (
  select 1 from information_schema.routines r join information_schema.parameters p on p.specific_name = r.specific_name
  where r.routine_name = 'edu_showcase' and p.parameter_mode = 'OUT' and p.parameter_name in ('owner_id','email','phone','fee')), '';
insert into _r select 'anon cannot read talent/companies/vacancies', not has_table_privilege('anon', 'public.st_talent_profiles', 'select') and not has_table_privilege('anon', 'public.st_companies', 'select') and not has_table_privilege('anon', 'public.st_vacancies', 'select'), '';

select * from _r;
rollback;
