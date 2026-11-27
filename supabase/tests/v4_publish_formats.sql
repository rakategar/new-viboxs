-- v4 WP04 — Form produk dinamis + media + auto-publish (QA V4-PF-001..015). Satu transaksi lalu ROLLBACK.
-- BELUM DIJALANKAN (sesi tanpa MCP Supabase, 27 Nov 2026). Jalankan setelah migrasi 20261127f diterapkan; harapan: semua ok = true.
begin;
create temp table _r (t text, ok boolean, info text) on commit drop;
grant all on _r to authenticated, anon;
create or replace function pg_temp.expect_fail(q text) returns text language plpgsql as $$
begin execute q; return 'NO ERROR'; exception when others then return sqlerrm; end $$;
create or replace function pg_temp.chk() returns jsonb language sql as $$
  select '{"identity":true,"rights":true,"media":true,"copy":true,"schedule":true,"price":true}'::jsonb $$;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
 ('00000000-0000-0000-0000-0000000f0c01','cmdpf@x.test','authenticated','authenticated', now()),
 ('00000000-0000-0000-0000-0000000f0a01','creatorpf@x.test','authenticated','authenticated', now()),
 ('00000000-0000-0000-0000-0000000f0b01','other@x.test','authenticated','authenticated', now());
insert into public.st_profiles (id, email, display_name, active_role) values
 ('00000000-0000-0000-0000-0000000f0a01','creatorpf@x.test','Creator PF','trainer'),
 ('00000000-0000-0000-0000-0000000f0b01','other@x.test','Other','trainer');
insert into public.st_role_grants (person_id, role) values ('00000000-0000-0000-0000-0000000f0a01','trainer'), ('00000000-0000-0000-0000-0000000f0b01','trainer');

-- Draft e-book & webinar milik kontributor
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000f0a01","email":"creatorpf@x.test","role":"authenticated"}';
insert into public.st_program_drafts (id, title, slug, type, path, pricing, summary, for_who, level, outcomes, toc, format_fields, rights_declared)
values ('00000000-0000-0000-0000-0000000fd001','Panduan Prompt Uji PF','panduan-prompt-uji-pf','ebook','ai','free',
  'Panduan praktis menyusun prompt untuk pekerjaan operasional harian di bisnis kecil.','Pemilik usaha kecil','Pemula',
  array['Menyusun prompt','Memeriksa hasil'], array['Bab 1','Bab 2'],
  '{"pages":"40","license":"Penggunaan pribadi","version":"1.0","preview":"Cuplikan bab pertama tentang struktur prompt.","speaker_bio":"bocor"}', true);
insert into _r select 'V4-PF-009 field webinar dibuang dari draft e-book', not (format_fields ? 'speaker_bio') and format_fields ? 'license', format_fields::text
  from public.st_program_drafts where id = '00000000-0000-0000-0000-0000000fd001';
insert into _r select 'V4-PF-006 e-book tanpa cover tidak bisa diajukan', r like '%cover%', r from (select pg_temp.expect_fail($$update public.st_program_drafts set status = 'submitted' where id = '00000000-0000-0000-0000-0000000fd001'$$) r) q;

-- path cover milik draft lain ditolak
insert into _r select 'unggah ke folder draft orang lain ditolak', r <> 'NO ERROR', r from (select pg_temp.expect_fail($$insert into storage.objects (bucket_id, name, metadata) values ('st-program-media', 'drafts/00000000-0000-0000-0000-0000000fd0ff/c.webp', '{"mimetype":"image/webp"}')$$) r) q;
insert into storage.objects (bucket_id, name, metadata) values ('st-program-media', 'drafts/00000000-0000-0000-0000-0000000fd001/cover-1.webp', '{"mimetype":"image/webp"}');
insert into _r select 'V4-PF-008 cover staging tidak bisa ditaruh di bucket publik oleh kontributor', r <> 'NO ERROR', r from (select pg_temp.expect_fail($$insert into storage.objects (bucket_id, name, metadata) values ('edu-media', 'programs/00000000-0000-0000-0000-0000000fd001/cover-1.webp', '{"mimetype":"image/webp"}')$$) r) q;
update public.st_program_drafts set cover_path = 'drafts/00000000-0000-0000-0000-0000000fd001/cover-1.webp', cover_ratio = '4:5', cover_alt = 'Sampul panduan prompt' where id = '00000000-0000-0000-0000-0000000fd001';
insert into _r select 'V4-PF-015 tanpa hak media tidak bisa diajukan', r like '%hak pakai cover%', r from (select pg_temp.expect_fail($$update public.st_program_drafts set status = 'submitted' where id = '00000000-0000-0000-0000-0000000fd001'$$) r) q;
update public.st_program_drafts set rights_media = true where id = '00000000-0000-0000-0000-0000000fd001';
insert into _r select 'V4-PF-001 e-book tanpa file tidak bisa diajukan', r like '%file e-book%', r from (select pg_temp.expect_fail($$update public.st_program_drafts set status = 'submitted' where id = '00000000-0000-0000-0000-0000000fd001'$$) r) q;
insert into _r select 'path file e-book ke program lain ditolak', r like '%tidak sah%', r from (select pg_temp.expect_fail($$insert into public.st_program_private (draft_id, ebook_path) values ('00000000-0000-0000-0000-0000000fd001', 'programs/rahasia/buku.pdf')$$) r) q;
insert into public.st_program_private (draft_id, ebook_path) values ('00000000-0000-0000-0000-0000000fd001', 'drafts/00000000-0000-0000-0000-0000000fd001/buku.pdf');
update public.st_program_drafts set status = 'submitted' where id = '00000000-0000-0000-0000-0000000fd001';
insert into _r select 'e-book lengkap → submitted', status = 'submitted' and submitted_at is not null, status from public.st_program_drafts where id = '00000000-0000-0000-0000-0000000fd001';

-- Webinar tanpa poster (V4-PF-007) dan ganti format
insert into public.st_program_drafts (id, title, slug, type, path, pricing, summary, for_who, level, outcomes, toc, capacity, schedule_at, duration, format_fields, rights_declared, rights_media)
values ('00000000-0000-0000-0000-0000000fd002','Webinar Uji PF Satu','webinar-uji-pf-satu','webinar','ai','free',
  'Sesi langsung tentang memakai AI untuk merangkum dokumen kerja dengan aman.','Profesional','Pemula',
  array['Merangkum','Memeriksa'], array['tidak relevan'], 50, now() + interval '10 days', '90 menit',
  '{"speaker_bio":"Praktisi AI operasional selama lima tahun di UMKM.","timezone":"Asia/Jakarta","agenda":[{"item":"Pembuka","dur":"10 menit"},{"item":"Praktik","dur":"60 menit"}],"faq":[{"q":"Apakah gratis?","a":"Ya, gratis."}],"summary_due":"H+2","pages":"99"}', true, true);
insert into _r select 'V4-PF-002 webinar: toc & pages tidak tersimpan', toc = '{}' and not (format_fields ? 'pages'), format_fields::text from public.st_program_drafts where id = '00000000-0000-0000-0000-0000000fd002';
insert into _r select 'V4-PF-007 webinar tanpa poster tidak bisa diajukan', r like '%poster%', r from (select pg_temp.expect_fail($$update public.st_program_drafts set status = 'submitted' where id = '00000000-0000-0000-0000-0000000fd002'$$) r) q;
update public.st_program_drafts set type = 'ebook' where id = '00000000-0000-0000-0000-0000000fd002';
insert into _r select 'V4-PF-009 ganti ke e-book: jadwal, kapasitas & field webinar dibuang', schedule_at is null and capacity is null and format_fields = '{}'::jsonb, format_fields::text
  from public.st_program_drafts where id = '00000000-0000-0000-0000-0000000fd002';
update public.st_program_drafts set type = 'ecourse' where id = '00000000-0000-0000-0000-0000000fd002';
insert into _r select 'V4-PF-005 e-course tidak bisa diajukan', r like '%E-course%', r from (select pg_temp.expect_fail($$update public.st_program_drafts set status = 'submitted' where id = '00000000-0000-0000-0000-0000000fd002'$$) r) q;
update public.st_program_drafts set type = 'kit', format_fields = '{"files":[{"name":"Template SOP","toc":[]}],"license":"Pribadi","preview":"Contoh halaman template SOP pertama."}' where id = '00000000-0000-0000-0000-0000000fd002';
insert into _r select 'V4-PF-004 kit: setiap file wajib daftar isi', r <> 'NO ERROR', r from (select pg_temp.expect_fail($$update public.st_program_drafts set status = 'submitted' where id = '00000000-0000-0000-0000-0000000fd002'$$) r) q;

-- Kontributor tidak bisa menyetujui/menayangkan sendiri
insert into _r select 'kontributor tidak bisa review', r like '%Commander%', r from (select pg_temp.expect_fail($$select public.st_review_draft('00000000-0000-0000-0000-0000000fd001', 'approved', null, pg_temp.chk())$$) r) q;
insert into _r select 'kontributor tidak bisa kirim ke EDU', r like '%Commander%', r from (select pg_temp.expect_fail($$select public.st_send_to_edu('00000000-0000-0000-0000-0000000fd001')$$) r) q;

-- Commander
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000f0c01","email":"cmdpf@x.test","role":"authenticated","aal":"aal2","app_metadata":{"role":"admin"}}';
insert into _r select 'Commander membaca cover staging', count(*) = 1, count(*)::text from storage.objects where bucket_id = 'st-program-media' and name like 'drafts/00000000-0000-0000-0000-0000000fd001/%';
insert into _r select 'checklist wajib lengkap', r like '%checklist%', r from (select pg_temp.expect_fail($$select public.st_review_draft('00000000-0000-0000-0000-0000000fd001', 'approved', null, '{"identity":true}')$$) r) q;
insert into _r select 'V4-PF-008 belum approve → Commander pun tidak bisa menaruh cover publik', r <> 'NO ERROR', r from (select pg_temp.expect_fail($$insert into storage.objects (bucket_id, name, metadata) values ('edu-media', 'programs/00000000-0000-0000-0000-0000000fd001/cover-1.webp', '{"mimetype":"image/webp"}')$$) r) q;
insert into _r select 'V4-PF-014 revisi butuh catatan', r like '%alasan revisi%', r from (select pg_temp.expect_fail($$select public.st_review_draft('00000000-0000-0000-0000-0000000fd001', 'needs_revision', 'kurang', null)$$) r) q;
select public.st_review_draft('00000000-0000-0000-0000-0000000fd001', 'approved', 'Siap tayang.', pg_temp.chk());
insert into _r select 'riwayat review tercatat', count(*) = 1, count(*)::text from public.st_program_reviews where draft_id = '00000000-0000-0000-0000-0000000fd001';
-- tanpa salinan cover: kirim gagal jujur (bukan tayang palsu)
insert into _r select 'V4-PF-012 cover belum tersalin → FAILED, bukan tayang', public.st_send_to_edu('00000000-0000-0000-0000-0000000fd001') like 'FAILED%'
  and (select status from public.st_program_drafts where id = '00000000-0000-0000-0000-0000000fd001') = 'publish_failed', '';
insert into _r select 'tidak ada baris EDU tayang saat gagal', count(*) = 0, count(*)::text from public.edu_programs where draft_id = '00000000-0000-0000-0000-0000000fd001' and published;
insert into storage.objects (bucket_id, name, metadata) values ('edu-media', 'programs/00000000-0000-0000-0000-0000000fd001/cover-1.webp', '{"mimetype":"image/webp"}');
insert into _r select 'V4-PF-010/011 retry → tayang (ACK)', public.st_send_to_edu('00000000-0000-0000-0000-0000000fd001') = 'panduan-prompt-uji-pf'
  and (select status from public.st_program_drafts where id = '00000000-0000-0000-0000-0000000fd001') = 'published', '';
insert into _r select 'V4-PF-011 data publik: cover URL publik, tanpa path privat', (data ->> 'cover') like 'https://%/edu-media/programs/%' and data ->> 'coverRatio' = '4:5' and data ->> 'license' = 'Penggunaan pribadi'
  and data::text not like '%drafts/%', data ->> 'cover' from public.edu_programs where draft_id = '00000000-0000-0000-0000-0000000fd001';
insert into _r select 'file e-book diteruskan ke tabel privat EDU', ebook_path = 'drafts/00000000-0000-0000-0000-0000000fd001/buku.pdf', ebook_path
  from public.edu_program_private where program_id = (select id from public.edu_programs where draft_id = '00000000-0000-0000-0000-0000000fd001');
select public.st_send_to_edu('00000000-0000-0000-0000-0000000fd001');
insert into _r select 'V4-PF-013 kirim ulang tetap satu baris kanonis', count(*) = 1, count(*)::text from public.edu_programs where draft_id = '00000000-0000-0000-0000-0000000fd001';
insert into _r select 'email "Program tayang" diantre sekali setelah ACK', count(*) = 1, count(*)::text from public.st_outbox where topic = 'program.published' and aggregate_id = '00000000-0000-0000-0000-0000000fd001';

-- Pihak lain tidak bisa membaca media staging
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000f0b01","email":"other@x.test","role":"authenticated"}';
insert into _r select 'kontributor lain tidak melihat media staging', count(*) = 0, count(*)::text from storage.objects where bucket_id in ('st-program-media','edu-private') and name like 'drafts/00000000-0000-0000-0000-0000000fd00%';

reset role;
select t, ok, info from _r order by ok, t;
rollback;
