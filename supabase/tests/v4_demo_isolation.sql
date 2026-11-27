-- v4 WP00 — isolasi akun demo (QA V4-MG-005). Hasil 2026-11-27: 15/15. Satu transaksi lalu ROLLBACK — tidak meninggalkan data.
-- Dunia demo (app_metadata.demo=true) dan dunia nyata tidak saling melihat di jalur talent, katalog EDU, dan showcase.
begin;
create temp table _r (t text, ok boolean, info text) on commit drop;
grant all on _r to authenticated;
create or replace function pg_temp.expect_fail(q text) returns text language plpgsql as $$
begin execute q; return 'NO ERROR'; exception when others then return sqlerrm; end $$;

insert into auth.users (id, email, aud, role, email_confirmed_at, raw_app_meta_data) values
 ('00000000-0000-0000-0000-0000000d0c01','cmdz@x.test','authenticated','authenticated', now(), '{}'),
 ('00000000-0000-0000-0000-0000000d0a01','reallearner@x.test','authenticated','authenticated', now(), '{}'),
 ('00000000-0000-0000-0000-0000000d0a02','demolearner@x.test','authenticated','authenticated', now(), '{"demo":true}'),
 ('00000000-0000-0000-0000-0000000d0d01','realhr@x.test','authenticated','authenticated', now(), '{}'),
 ('00000000-0000-0000-0000-0000000d0d02','demohr@x.test','authenticated','authenticated', now(), '{"demo":true}'),
 ('00000000-0000-0000-0000-0000000d0f01','demotrainer@x.test','authenticated','authenticated', now(), '{"demo":true}');
insert into public.st_profiles (id, email, display_name, active_role, is_demo) values
 ('00000000-0000-0000-0000-0000000d0a01','reallearner@x.test','Real Zq','learner', false),
 ('00000000-0000-0000-0000-0000000d0a02','demolearner@x.test','[DEMO] Zq','learner', true),
 ('00000000-0000-0000-0000-0000000d0d01','realhr@x.test','HR Nyata','company_partner', false),
 ('00000000-0000-0000-0000-0000000d0d02','demohr@x.test','[DEMO] HR','company_partner', true),
 ('00000000-0000-0000-0000-0000000d0f01','demotrainer@x.test','[DEMO] Trainer','trainer', true);
insert into public.st_role_grants (person_id, role) values
 ('00000000-0000-0000-0000-0000000d0a01','learner'), ('00000000-0000-0000-0000-0000000d0a02','learner'),
 ('00000000-0000-0000-0000-0000000d0d01','company_partner'), ('00000000-0000-0000-0000-0000000d0d02','company_partner'),
 ('00000000-0000-0000-0000-0000000d0f01','trainer');
insert into public.st_companies (id, owner_id, legal_name, business_email, pic_name, pic_role, hiring_needs, authority_statement, terms_version, status, grants) values
 ('00000000-0000-0000-0000-0000000dcc01','00000000-0000-0000-0000-0000000d0d01','PT Nyata Zq','realhr@x.test','HR Nyata','HR','Rekrut admin operasional dua orang remote', true,'t','VERIFIED', array['HIRING_VIEW','HIRING_MANAGE']),
 ('00000000-0000-0000-0000-0000000dcc02','00000000-0000-0000-0000-0000000d0d02','[DEMO] PT Zq','demohr@x.test','[DEMO] HR','HR','Rekrut desainer grafis untuk tim pemasaran', true,'t','VERIFIED', array['HIRING_VIEW','HIRING_MANAGE']);

-- Kedua learner opt-in lewat jalur normal
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000d0a01","role":"authenticated"}';
insert into public.st_talent_profiles (person_id, opt_in, alias, skills) values ('00000000-0000-0000-0000-0000000d0a01', true, 'Real Zq', array['zqskill']);
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000d0a02","role":"authenticated"}';
insert into public.st_talent_profiles (person_id, opt_in, alias, skills) values ('00000000-0000-0000-0000-0000000d0a02', true, '[DEMO] Zq', array['zqskill']);
insert into _r select 'is_demo tidak bisa diubah pengguna', r like '%permission denied%', r
  from (select pg_temp.expect_fail($$update public.st_profiles set is_demo = false where id = '00000000-0000-0000-0000-0000000d0a02'$$) r) q;
insert into _r select 'helper st_is_demo tidak terbuka ke klien', r like '%permission denied%', r
  from (select pg_temp.expect_fail($$select public.st_is_demo('00000000-0000-0000-0000-0000000d0a01')$$) r) q;

-- Perusahaan nyata
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000d0d01","role":"authenticated"}';
insert into _r select 'perusahaan nyata melihat learner nyata', count(*) = 1, string_agg(alias, ',') from public.st_company_talent_search('', 'zqskill') where alias = 'Real Zq';
insert into _r select 'perusahaan nyata TIDAK melihat learner demo', count(*) = 0, string_agg(alias, ',') from public.st_company_talent_search('', '') where alias like '[DEMO]%';
insert into _r select 'perusahaan nyata tidak bisa mengundang learner demo', r like '%tidak tersedia%', r
  from (select pg_temp.expect_fail($$select public.st_hiring_invite('00000000-0000-0000-0000-0000000d0a02', 'Admin', repeat('Halo, kami tertarik dengan profilmu. ', 2))$$) r) q;

-- Perusahaan demo
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000d0d02","role":"authenticated"}';
insert into _r select 'perusahaan demo hanya melihat learner demo', count(*) >= 1 and bool_and(alias like '[DEMO]%'), string_agg(alias, ',') from public.st_company_talent_search('', '');
insert into _r select 'perusahaan demo tidak bisa mengundang learner nyata', r like '%tidak tersedia%', r
  from (select pg_temp.expect_fail($$select public.st_hiring_invite('00000000-0000-0000-0000-0000000d0a01', 'Admin', repeat('Halo, kami tertarik dengan profilmu. ', 2))$$) r) q;
insert into _r select 'perusahaan demo bisa mengundang learner demo', r = 'NO ERROR', r
  from (select pg_temp.expect_fail($$select public.st_hiring_invite('00000000-0000-0000-0000-0000000d0a02', 'Admin', repeat('Halo, kami tertarik dengan profilmu. ', 2))$$) r) q;

-- Program milik akun demo tidak bisa tayang di katalog EDU
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000d0f01","role":"authenticated"}';
create temp table _ids (k text primary key, v uuid); grant all on _ids to authenticated;
with x as (insert into public.st_program_drafts (title, slug, type, pricing, summary, for_who, outcomes, rights_declared, schedule_at, status)
  values ('[DEMO] Webinar Zq', 'demo-webinar-zq', 'webinar', 'free', 'Ringkasan cukup panjang untuk lolos validasi review program.', 'Tester', array['a','b'], true, now() + interval '3 day', 'submitted') returning id)
insert into _ids select 'draft', id from x;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000d0c01","role":"authenticated","app_metadata":{"role":"admin"}}';
update public.st_program_drafts set status = 'approved' where id = (select v from _ids where k = 'draft');
insert into _r select 'V4-MG-005 draft demo ditolak kirim ke EDU', r like '%akun demo%', r
  from (select pg_temp.expect_fail(format('select public.st_send_to_edu(%L)', (select v from _ids where k = 'draft'))) r) q;
insert into _r select 'V4-MG-005 tidak ada baris edu_programs demo', count(*) = 0, count(*)::text from public.edu_programs where slug like 'demo-webinar-zq%';
reset role;
update public.st_flags set enabled = true where key = 'demo_publish_sandbox';
set local role authenticated;
insert into _r select 'sandbox ON: draft demo boleh dikirim (tetap unpublished)', public.st_send_to_edu((select v from _ids where k = 'draft')) like 'demo-webinar-zq%', '';
insert into _r select 'sandbox ON: baris EDU tetap published=false', bool_and(not published), count(*)::text from public.edu_programs where slug like 'demo-webinar-zq%';
reset role;
insert into _r select 'sandbox ON: CMS tetap tidak bisa menayangkan produk demo', r like '%akun demo%', r
  from (select pg_temp.expect_fail($$update public.edu_programs set published = true where slug like 'demo-webinar-zq%'$$) r) q;
set local role authenticated;

-- Showcase demo tidak bisa tayang
reset role;
insert into public.st_showcase (kind, owner_id, display_name, specialization, evidence, consent_at, status, product_status)
  values ('opc', '00000000-0000-0000-0000-0000000d0a02', '[DEMO] Zq', 'Spesialis uji', '[{"label":"x","url":"https://example.com"}]', now(), 'SUBMITTED', 'Beta');
set local role authenticated;
insert into _r select 'showcase demo ditolak tayang', r like '%akun demo%', r
  from (select pg_temp.expect_fail(format('select public.st_showcase_decide(%L, true, %L)', (select id from public.st_showcase where owner_id = '00000000-0000-0000-0000-0000000d0a02'), 'Identitas dan bukti sudah dicek.')) r) q;
reset role;
update public.st_showcase set status = 'PUBLIC_APPROVED', review_due = current_date + 30 where owner_id = '00000000-0000-0000-0000-0000000d0a02';
insert into _r select 'edu_showcase tidak memuat demo (lapis kedua)', count(*) = 0, count(*)::text from public.edu_showcase() where display_name like '[DEMO]%';

select t, ok, info from _r order by ok, t;
rollback;
