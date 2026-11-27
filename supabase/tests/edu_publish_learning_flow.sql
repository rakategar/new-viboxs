-- Uji alur Batch 3–4 + AI assist (dijalankan 2026-11-24 lewat MCP execute_sql). Satu transaksi → ROLLBACK.
-- Kontributor publish (ACK by id, resend tanpa duplikat, slug terkunci) → order guest gratis → klaim akun → summary → review → rilis → jawaban → Star.
-- Catatan: update yang ditolak RLS tidak melempar error (0 baris) — asersi memeriksa STATE, bukan error.
begin;
create temp table _r (t text, ok boolean, info text) on commit drop;
grant all on _r to authenticated;
create or replace function pg_temp.expect_fail(q text) returns text language plpgsql as $$
begin execute q; return 'NO ERROR'; exception when others then return sqlerrm; end $$;
insert into auth.users (id, email, aud, role, email_confirmed_at) values
 ('00000000-0000-0000-0000-0000000000c9','cmd9@x.test','authenticated','authenticated', now()),
 ('00000000-0000-0000-0000-0000000000f1','trainer@x.test','authenticated','authenticated', now()),
 ('00000000-0000-0000-0000-0000000000f2','buyer@x.test','authenticated','authenticated', now());
insert into public.st_profiles (id, email, display_name, active_role) values
 ('00000000-0000-0000-0000-0000000000f1','trainer@x.test','Trainer','trainer'),
 ('00000000-0000-0000-0000-0000000000f2','buyer@x.test','Buyer','learner');
insert into public.st_role_grants (person_id, role) values ('00000000-0000-0000-0000-0000000000f1','trainer'), ('00000000-0000-0000-0000-0000000000f2','learner');
create temp table _ids (k text primary key, v uuid); grant all on _ids to authenticated;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f1","email":"trainer@x.test","role":"authenticated"}';
with x as (insert into public.st_program_drafts (title, slug, type, pricing, summary, for_who, outcomes, rights_declared, schedule_at, status)
  values ('Uji Webinar QA', 'uji-webinar-qa-zz', 'webinar', 'free', 'Ringkasan cukup panjang untuk lolos validasi review program.', 'Tester', array['a','b'], true, now() + interval '3 day', 'draft') returning id)
insert into _ids select 'draft', id from x;
insert into _r select 'trainer self-approve ditolak RLS', r like '%row-level security%', r from (select pg_temp.expect_fail($$update public.st_program_drafts set status = 'approved' where id = (select v from _ids where k='draft')$$) r) q;
insert into _r select 'trainer self-approve has no effect', status = 'draft', status from public.st_program_drafts where id = (select v from _ids where k='draft');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c9","email":"cmd9@x.test","role":"authenticated","app_metadata":{"role":"admin"}}';
update public.st_program_drafts set status = 'approved' where id = (select v from _ids where k='draft');
-- v4 WP04: approve → langsung tayang (status "Tayang" dari ACK edu_programs.published)
insert into _r select 'CON-007 send returns slug', public.st_send_to_edu((select v from _ids where k='draft')) = 'uji-webinar-qa-zz', '';
insert into _r select 'CON-007 v4 draft langsung published', status = 'published', status from public.st_program_drafts where id = (select v from _ids where k='draft');
insert into _r select 'CON-007 v4 tayang di katalog', published, '' from public.edu_programs where draft_id = (select v from _ids where k='draft');
select public.st_send_to_edu((select v from _ids where k='draft'));
insert into _r select 'CON-009 resend = no duplicate', count(*) = 1, count(*)::text from public.edu_programs where draft_id = (select v from _ids where k='draft');
insert into _r select 'CON-003 meeting url not in public data', not (data ? 'meeting_url'), '' from public.edu_programs where draft_id = (select v from _ids where k='draft');
update public.edu_programs set published = false where draft_id = (select v from _ids where k='draft');
insert into _r select 'CON-008 unpublish CMS → publish_queued', status = 'publish_queued', status from public.st_program_drafts where id = (select v from _ids where k='draft');
update public.edu_programs set published = true where draft_id = (select v from _ids where k='draft');
insert into _r select 'CON-008 ACK by id → published', status = 'published', status from public.st_program_drafts where id = (select v from _ids where k='draft');
insert into _r select 'slug locked after publish', r like '%terkunci%', r from (select pg_temp.expect_fail($$update public.edu_programs set slug = 'ganti-slug' where draft_id = (select v from _ids where k='draft')$$) r) q;

reset role;
insert into _ids select 'prog', id from public.edu_programs where draft_id = (select v from _ids where k='draft');
insert into _ids select 'order', (public.edu_create_order('uji-webinar-qa-zz', 'buyer@x.test', 'Buyer', null, null, 'EDU_PUBLIC_GUEST', 'idem-uji-000000000001', false, null, '{}', '{}') ->> 'order_id')::uuid;
insert into _r select 'CHE-002 guest free order fulfilled', status = 'FULFILLED', status from public.edu_orders where id = (select v from _ids where k='order');
insert into _r select 'delete program w/ orders blocked', r like '%sudah punya order%', r from (select pg_temp.expect_fail($$delete from public.edu_programs where id = (select v from _ids where k='prog')$$) r) q;
insert into _r select 'second order same email = ALREADY_OWNED', r like 'ALREADY_OWNED%', r from (select pg_temp.expect_fail($$select public.edu_create_order('uji-webinar-qa-zz', 'BUYER@x.test', 'Buyer', null, null, 'EDU_PUBLIC_GUEST', 'idem-uji-000000000002', false, null, '{}', '{}')$$) r) q;
update public.edu_programs set data = data || jsonb_build_object('startsAt', to_char(now() - interval '1 day', 'YYYY-MM-DD"T"HH24:MI:SS"+00:00"')) where id = (select v from _ids where k='prog');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f2","email":"buyer@x.test","role":"authenticated"}';
insert into _r select 'CHE-004 claim guest order (verified email)', public.edu_claim_orders() = 1, '';
insert into _r select 'My Learning sees entitlement', count(*) = 1, '' from public.edu_entitlements;

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f2","email":"buyer@x.test","role":"authenticated"}';
insert into _r select 'AI context denied to non-owner', r like '%Hanya kontributor%', r from (select pg_temp.expect_fail($$select public.st_ai_assessment_context((select v from _ids where k='prog'))$$) r) q;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f1","email":"trainer@x.test","role":"authenticated"}';
insert into _r select 'AI draft needs session summary first', r like '%summary sesi%', r from (select pg_temp.expect_fail($$select public.st_ai_assessment_context((select v from _ids where k='prog'))$$) r) q;
insert into _r select 'CON-012 creator sales own only', count(*) = 1 and sum(free_orders) = 1, count(*)::text from public.st_creator_sales();
with x as (insert into public.st_assessments (program_id, kind, title, questions) values ((select v from _ids where k='prog'), 'webinar', 'Asesmen uji',
  '[{"type":"mcq","prompt":"Apa langkah pertama menulis prompt?","options":["Tujuan","Warna"],"answer":0,"source":"Modul 1"}]') returning id)
insert into _ids select 'asm', id from x;
insert into _r select 'LEA-007 no review before summary', r like '%Summary sesi belum%', r from (select pg_temp.expect_fail($$update public.st_assessments set status = 'IN_REVIEW' where id = (select v from _ids where k='asm')$$) r) q;
select public.st_submit_summary((select v from _ids where k='prog'), 'Peserta mampu menulis prompt yang jelas untuk kerja harian.', 'Modul 1 struktur prompt, Modul 2 praktik merangkum dokumen.', null, null, array['prompt'], null);
update public.st_assessments set status = 'IN_REVIEW' where id = (select v from _ids where k='asm');
update public.st_assessments set status = 'RELEASED' where id = (select v from _ids where k='asm');
insert into _r select 'LEA-008 contributor self-release has no effect', status = 'IN_REVIEW', status from public.st_assessments where id = (select v from _ids where k='asm');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f2","email":"buyer@x.test","role":"authenticated"}';
insert into _r select 'LEA-008 not visible before release', count(*) = 0, '' from public.st_my_assessments();
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c9","email":"cmd9@x.test","role":"authenticated","app_metadata":{"role":"admin"}}';
select public.st_assessment_decide((select v from _ids where k='asm'), true, 'Soal sesuai summary, kunci benar');
select public.edu_mark_attendance((select id from public.edu_entitlements where order_id = (select v from _ids where k='order')), 'Laporan Zoom hadir 80 menit');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f2","email":"buyer@x.test","role":"authenticated"}';
insert into _r select 'released → visible to entitled', count(*) = 1, '' from public.st_my_assessments();
insert into _r select 'paper hides answer key', not ((public.st_assessment_paper((select v from _ids where k='asm')) -> 'questions' -> 0) ? 'answer'), '';
insert into _r select 'MCQ auto scored 100', (public.st_submit_attempt((select v from _ids where k='asm'), '[0]') ->> 'score')::numeric = 100, '';
insert into _r select 'LEA-013 duplicate attempt blocked', r like '%sudah dikirim%', r from (select pg_temp.expect_fail($$select public.st_submit_attempt((select v from _ids where k='asm'), '[0]')$$) r) q;
insert into _r select 'LEA-014 stars 25 (hadir) + 60 (lulus) = 85', sum(units) = 85, sum(units)::text from public.st_star_events;
reset role;
insert into public.st_attempt_ai_suggestions (attempt_id, suggestion) select id, '{"items":[]}' from public.st_assessment_attempts where assessment_id = (select v from _ids where k='asm');
set local role authenticated;
insert into _r select 'AI suggestion hidden from learner', count(*) = 0, count(*)::text from public.st_attempt_ai_suggestions;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f1","email":"trainer@x.test","role":"authenticated"}';
insert into _r select 'AI context for owner after summary', public.st_ai_assessment_context((select v from _ids where k='prog')) ->> 'kind' = 'webinar', '';
insert into _r select 'AI suggestion hidden from contributor', count(*) = 0, '' from public.st_attempt_ai_suggestions;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c9","email":"cmd9@x.test","role":"authenticated","app_metadata":{"role":"admin"}}';
insert into _r select 'AI suggestion visible to commander', count(*) = 1, count(*)::text from public.st_attempt_ai_suggestions;
reset role;
select * from _r;
rollback;
