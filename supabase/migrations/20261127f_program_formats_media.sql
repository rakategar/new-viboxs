-- v4 WP04 — Form produk dinamis + media + auto-publish (QA V4-PF-001..015, CON-001..015 regresi). PRD v4 §08.2–08.3.
--  * Format: ebook | webinar | workshop | kit | ecourse. E-course tidak bisa diajukan/tayang sampai LMS siap (V4-PF-005).
--  * Field khusus format di format_fields (jsonb). Field yang tidak relevan DIBUANG server setiap kali disimpan (V4-PF-009).
--  * Validasi lengkap saat status menjadi `submitted` (trigger) — UI tidak bisa melewatinya (V4-PF-006/007).
--  * Media: cover/poster wajib, diunggah ke bucket PRIVAT st-program-media (staging). Bucket publik edu-media hanya
--    bisa diisi Commander SETELAH program disetujui → tidak ada URL publik sebelum approve (V4-PF-008).
--  * Auto-publish: st_review_draft(approved) → klien Commander menyalin cover ke edu-media → st_send_to_edu menayangkan
--    (published=true). Status "Tayang" hanya dari ACK edu_programs.published; gagal → publish_failed + alert + retry (V4-PF-010..013).
--  * Hak media wajib (rights_media) sebelum submit & approve (V4-PF-015). Riwayat review di st_program_reviews.
--  * Email "Program tayang" ke kontributor hanya setelah ACK (outbox program.published).
-- Rollback: drop trigger s_st_prog_shape/c_st_prog_mail/g_st_prog_priv; drop st_program_reviews; drop functions baru;
--   kembalikan st_send_to_edu dari 20261125b + patch MFA (20261125i) + patch demo (20261127a); hapus kolom baru; bucket dibiarkan.

-- ============ kolom ============
alter table public.st_program_drafts drop constraint if exists st_program_drafts_type_check;
alter table public.st_program_drafts add constraint st_program_drafts_type_check check (type in ('ebook','webinar','workshop','kit','ecourse'));
alter table public.st_program_drafts
  add column if not exists format_fields jsonb not null default '{}'::jsonb,
  add column if not exists cover_path text,
  add column if not exists cover_alt text,
  add column if not exists cover_ratio text check (cover_ratio is null or cover_ratio in ('4:5','16:9','1:1')),
  add column if not exists rights_media boolean not null default false,
  add column if not exists submitted_at timestamptz;

insert into public.st_flags (key, label, description, enabled, locked, config) values
  ('media_public_base', 'Basis URL media publik EDU', 'Prefix URL publik bucket edu-media (cover/poster program yang sudah disetujui).', true, true,
   '{"base":"https://lbouqcovrnuhahrcnpki.supabase.co/storage/v1/object/public/edu-media/","cover_max_mb":5}'::jsonb)
on conflict (key) do nothing;

-- ============ riwayat review ============
create table if not exists public.st_program_reviews (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.st_program_drafts(id) on delete cascade,
  decision text not null check (decision in ('approved','needs_revision')),
  note text,
  checks jsonb not null default '{}'::jsonb,
  reviewer_id uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists st_program_reviews_draft on public.st_program_reviews (draft_id, created_at desc);
alter table public.st_program_reviews enable row level security;
revoke all on public.st_program_reviews from anon, authenticated;
grant select on public.st_program_reviews to authenticated;
drop policy if exists "review program: commander / pemilik" on public.st_program_reviews;
create policy "review program: commander / pemilik" on public.st_program_reviews for select to authenticated using (
  (select public.st_is_commander()) or exists (select 1 from public.st_program_drafts d where d.id = draft_id and d.owner_id = (select auth.uid())));

-- ============ storage ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('st-program-media', 'st-program-media', false, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('edu-media', 'edu-media', true, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Pemilik draft: unggah & baca hanya di folder drafts/<id draft miliknya>/ selama draft masih bisa diedit.
create or replace function public.st_draft_media_ok(p_folder text, p_editing boolean) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.st_program_drafts d where d.id::text = p_folder and d.owner_id = auth.uid()
    and public.st_acting('trainer') and (not p_editing or d.status in ('draft','needs_revision')))
$$;
create or replace function public.st_draft_publishable(p_folder text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.st_is_commander() and exists (select 1 from public.st_program_drafts d where d.id::text = p_folder
    and d.status in ('approved','publish_queued','publish_failed','published'))
$$;
revoke execute on function public.st_draft_media_ok(text, boolean), public.st_draft_publishable(text) from public, anon;
grant execute on function public.st_draft_media_ok(text, boolean), public.st_draft_publishable(text) to authenticated;

drop policy if exists "st-program-media: pemilik unggah" on storage.objects;
drop policy if exists "st-program-media: pemilik baca" on storage.objects;
drop policy if exists "st-program-media: commander baca" on storage.objects;
drop policy if exists "edu-media: commander unggah" on storage.objects;
drop policy if exists "edu-media: commander baca" on storage.objects;
drop policy if exists "edu-private: kontributor unggah draft" on storage.objects;
drop policy if exists "edu-private: kontributor baca draft" on storage.objects;
create policy "st-program-media: pemilik unggah" on storage.objects for insert to authenticated with check (
  bucket_id = 'st-program-media' and (storage.foldername(name))[1] = 'drafts' and public.st_draft_media_ok((storage.foldername(name))[2], true));
create policy "st-program-media: pemilik baca" on storage.objects for select to authenticated using (
  bucket_id = 'st-program-media' and (storage.foldername(name))[1] = 'drafts' and public.st_draft_media_ok((storage.foldername(name))[2], false));
create policy "st-program-media: commander baca" on storage.objects for select to authenticated using (
  bucket_id = 'st-program-media' and (select public.st_is_commander()));
create policy "edu-media: commander unggah" on storage.objects for insert to authenticated with check (
  bucket_id = 'edu-media' and (storage.foldername(name))[1] = 'programs' and public.st_draft_publishable((storage.foldername(name))[2]));
create policy "edu-media: commander baca" on storage.objects for select to authenticated using (
  bucket_id = 'edu-media' and (select public.st_is_commander()));
-- File e-book/kit: kontributor unggah ke edu-private/drafts/<id>/ (privat; keluar hanya lewat signed URL edge edu-order).
create policy "edu-private: kontributor unggah draft" on storage.objects for insert to authenticated with check (
  bucket_id = 'edu-private' and (storage.foldername(name))[1] = 'drafts' and public.st_draft_media_ok((storage.foldername(name))[2], true));
create policy "edu-private: kontributor baca draft" on storage.objects for select to authenticated using (
  bucket_id = 'edu-private' and (storage.foldername(name))[1] = 'drafts' and public.st_draft_media_ok((storage.foldername(name))[2], false));

-- Path file e-book di tabel privat: kontributor hanya boleh menunjuk folder draft miliknya (cegah menunjuk file program lain).
create or replace function public.st_program_private_guard() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or public.st_is_commander() then return new; end if;
  if new.ebook_path is not null and (new.ebook_path not like 'drafts/' || new.draft_id || '/%' or new.ebook_path like '%..%') then
    raise exception 'Lokasi file produk tidak sah.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists g_st_prog_priv on public.st_program_private;
create trigger g_st_prog_priv before insert or update on public.st_program_private for each row execute function public.st_program_private_guard();
revoke execute on function public.st_program_private_guard() from public, anon, authenticated;

-- ============ bentuk & validasi per format ============
create or replace function public.st_format_keys(p_type text) returns text[] language sql immutable set search_path = '' as $$
  select case p_type
    when 'ebook' then array['pages','license','version','preview']
    when 'webinar' then array['speaker_bio','timezone','agenda','faq','summary_due']
    when 'workshop' then array['speaker_bio','timezone','agenda','sessions','resources','assignment','output']
    when 'kit' then array['files','license','version','preview']
    else array[]::text[] end
$$;
create or replace function public.st_cover_ratio(p_type text) returns text language sql immutable set search_path = '' as $$
  select case p_type when 'ebook' then '4:5' when 'kit' then '4:5' when 'webinar' then '16:9' when 'workshop' then '16:9' else '16:9' end
$$;

/** Pesan galat pertama untuk draft yang akan diajukan/disetujui; null = lengkap. */
create or replace function public.st_program_check(d public.st_program_drafts) returns text
language plpgsql stable security definer set search_path = '' as $$
declare f jsonb := coalesce(d.format_fields, '{}'::jsonb); pv record; x jsonb;
  t text := lower(d.type);
begin
  if t = 'ecourse' then return 'E-course segera hadir — belum bisa diajukan sampai delivery LMS siap.'; end if;
  if length(trim(coalesce(d.title, ''))) < 6 then return 'Judul minimal 6 karakter.'; end if;
  if length(trim(coalesce(d.summary, ''))) < 40 then return 'Ringkasan minimal 40 karakter.'; end if;
  if length(trim(coalesce(d.for_who, ''))) < 3 then return 'Isi sasaran peserta.'; end if;
  if cardinality(d.outcomes) < 2 then return 'Tulis minimal 2 hasil belajar.'; end if;
  if not d.rights_declared then return 'Nyatakan hak atas materi sebelum mengajukan.'; end if;
  if not d.rights_media then return 'Nyatakan hak pakai cover/poster sebelum mengajukan.'; end if;
  if d.pricing = 'paid' and (d.price is null or d.price < 1000) then return 'Program berbayar wajib punya harga final (min. Rp1.000).'; end if;
  if d.pricing = 'paid' and length(trim(coalesce(d.refund_terms, ''))) < 10 then return 'Tulis ketentuan refund/reschedule untuk program berbayar.'; end if;
  -- cover/poster
  if d.cover_path is null or d.cover_path not like 'drafts/' || d.id || '/%' or d.cover_path like '%..%' then
    return case when t in ('webinar','workshop') then 'Unggah poster/banner (16:9) sebelum mengajukan.' else 'Unggah cover (4:5) sebelum mengajukan.' end;
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'st-program-media' and o.name = d.cover_path
                 and coalesce(o.metadata ->> 'mimetype', '') in ('image/png','image/jpeg','image/webp')) then
    return 'File cover/poster tidak ditemukan atau formatnya tidak didukung. Unggah ulang (PNG, JPG, atau WebP).';
  end if;
  if coalesce(d.cover_ratio, '') <> public.st_cover_ratio(t) then return format('Rasio cover untuk format ini harus %s.', public.st_cover_ratio(t)); end if;
  if length(trim(coalesce(d.cover_alt, ''))) < 5 then return 'Isi teks alternatif (alt text) cover minimal 5 karakter.'; end if;
  select * into pv from public.st_program_private where draft_id = d.id;

  if t = 'ebook' then
    if cardinality(d.toc) < 2 then return 'Isi daftar isi minimal 2 bab.'; end if;
    if coalesce(f ->> 'pages', '') !~ '^[0-9]{1,5}$' then return 'Isi jumlah halaman.'; end if;
    if (f ->> 'pages')::int < 1 then return 'Isi jumlah halaman.'; end if;
    if length(trim(coalesce(f ->> 'license', ''))) < 3 then return 'Isi lisensi e-book.'; end if;
    if length(trim(coalesce(f ->> 'version', ''))) < 1 then return 'Isi versi e-book.'; end if;
    if length(trim(coalesce(f ->> 'preview', ''))) < 20 then return 'Isi preview berizin (cuplikan) minimal 20 karakter.'; end if;
    if pv.ebook_path is null then return 'Unggah file e-book (PDF/ePub).'; end if;
  elsif t = 'kit' then
    if coalesce(jsonb_typeof(f -> 'files'), '') <> 'array' or jsonb_array_length(f -> 'files') < 1 then return 'Isi daftar file kit minimal 1.'; end if;
    for x in select * from jsonb_array_elements(f -> 'files') loop
      if length(trim(coalesce(x ->> 'name', ''))) < 3 then return 'Setiap file kit wajib punya nama.'; end if;
      if coalesce(jsonb_typeof(x -> 'toc'), '') <> 'array' or jsonb_array_length(x -> 'toc') < 1 then return format('Isi daftar isi untuk file "%s".', x ->> 'name'); end if;
      if length(trim(coalesce(x ->> 'license', ''))) < 3 then return format('Isi lisensi untuk file "%s".', x ->> 'name'); end if;
    end loop;
    if length(trim(coalesce(f ->> 'preview', ''))) < 20 then return 'Isi preview berizin minimal 20 karakter.'; end if;
    if pv.ebook_path is null then return 'Unggah paket file kit (ZIP/PDF).'; end if;
  else -- webinar / workshop
    if length(trim(coalesce(f ->> 'timezone', ''))) = 0 or not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = f ->> 'timezone') then
      return 'Pilih zona waktu yang valid (mis. Asia/Jakarta).';
    end if;
    if length(trim(coalesce(f ->> 'speaker_bio', ''))) < 30 and t = 'webinar' then return 'Isi bio pembicara minimal 30 karakter.'; end if;
    if coalesce(jsonb_typeof(f -> 'agenda'), '') <> 'array' or jsonb_array_length(f -> 'agenda') < 2 then return 'Isi agenda minimal 2 butir.'; end if;
    if d.capacity is null or d.capacity < 1 then return case when t = 'workshop' then 'Isi jumlah peserta maksimal.' else 'Isi kapasitas peserta.' end; end if;
    if pv.meeting_url is null then return 'Isi tautan sesi privat (Zoom/Meet).'; end if;
    if t = 'webinar' then
      if d.schedule_at is null or d.schedule_at < now() then return 'Isi tanggal & jam webinar di masa depan.'; end if;
      if length(trim(coalesce(d.duration, ''))) = 0 then return 'Isi durasi webinar.'; end if;
      if coalesce(jsonb_typeof(f -> 'faq'), '') <> 'array' or jsonb_array_length(f -> 'faq') < 1 then return 'Isi minimal 1 FAQ.'; end if;
      for x in select * from jsonb_array_elements(f -> 'faq') loop
        if length(trim(coalesce(x ->> 'q', ''))) < 5 or length(trim(coalesce(x ->> 'a', ''))) < 5 then return 'Setiap FAQ wajib punya pertanyaan dan jawaban.'; end if;
      end loop;
      if length(trim(coalesce(f ->> 'summary_due', ''))) = 0 then return 'Isi tenggat summary sesi.'; end if;
    else
      if coalesce(jsonb_typeof(f -> 'sessions'), '') <> 'array' or jsonb_array_length(f -> 'sessions') < 1 then return 'Isi minimal 1 sesi workshop.'; end if;
      for x in select * from jsonb_array_elements(f -> 'sessions') loop
        begin
          if (x ->> 'starts_at')::timestamptz < now() then return 'Semua sesi workshop harus di masa depan.'; end if;
        exception when others then return 'Tanggal sesi workshop tidak valid.';
        end;
        if length(trim(coalesce(x ->> 'dur', ''))) = 0 then return 'Isi durasi setiap sesi workshop.'; end if;
      end loop;
      if length(trim(coalesce(f ->> 'resources', ''))) < 10 then return 'Isi resources workshop.'; end if;
      if length(trim(coalesce(f ->> 'assignment', ''))) < 10 then return 'Isi tugas/assignment workshop.'; end if;
      if length(trim(coalesce(f ->> 'output', ''))) < 10 then return 'Isi output latihan workshop.'; end if;
    end if;
  end if;
  return null;
end $$;
revoke execute on function public.st_program_check(public.st_program_drafts) from public, anon, authenticated;

/** Simpan hanya data yang relevan untuk format terpilih (V4-PF-009) dan validasi saat diajukan. */
create or replace function public.st_program_shape() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_err text; v_first timestamptz;
begin
  new.format_fields := coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(case when jsonb_typeof(new.format_fields) = 'object' then new.format_fields else '{}'::jsonb end) e
                                  where e.key = any(public.st_format_keys(new.type))), '{}'::jsonb);
  if new.type in ('ebook','kit','ecourse') then new.schedule_at := null; new.capacity := case when new.type = 'ecourse' then new.capacity end; end if;
  if new.type <> 'ebook' then new.toc := '{}'; end if;
  if new.type = 'workshop' and jsonb_typeof(new.format_fields -> 'sessions') = 'array' then
    begin
      select min((s ->> 'starts_at')::timestamptz) into v_first from jsonb_array_elements(new.format_fields -> 'sessions') s;
      if v_first is not null then new.schedule_at := v_first; end if;
    exception when others then null; -- tanggal rusak ditolak oleh st_program_check saat diajukan
    end;
  end if;
  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status is distinct from 'submitted') and auth.uid() is not null and not public.st_is_commander() then
    v_err := public.st_program_check(new);
    if v_err is not null then raise exception '%', v_err using errcode = '22023'; end if;
    new.submitted_at := now();
  end if;
  return new;
end $$;
drop trigger if exists s_st_prog_shape on public.st_program_drafts;
create trigger s_st_prog_shape before insert or update on public.st_program_drafts for each row execute function public.st_program_shape();
revoke execute on function public.st_program_shape() from public, anon, authenticated;

-- ============ review Commander (satu klik → auto-publish) ============
create or replace function public.st_review_draft(p_id uuid, p_decision text, p_note text, p_checks jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare d public.st_program_drafts; v_err text; k text;
  v_keys text[] := array['identity','rights','media','copy','schedule','price'];
begin
  perform public.st_require_mfa();
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  select * into d from public.st_program_drafts where id = p_id for update;
  if not found then raise exception 'Program tidak ditemukan.'; end if;
  if d.status <> 'submitted' then raise exception 'Program ini tidak sedang menunggu review.'; end if;
  if p_decision = 'needs_revision' then
    if length(trim(coalesce(p_note, ''))) < 10 then raise exception 'Tulis alasan revisi yang bisa ditindaklanjuti (min. 10 karakter).'; end if;
  elsif p_decision = 'approved' then
    foreach k in array v_keys loop
      if coalesce((p_checks ->> k)::boolean, false) is not true then raise exception 'Lengkapi checklist review sebelum menyetujui.'; end if;
    end loop;
    if not d.rights_media then raise exception 'Hak pakai cover/poster belum dinyatakan — minta revisi.'; end if;
    v_err := public.st_program_check(d);
    if v_err is not null then raise exception 'Belum bisa disetujui: %', v_err; end if;
    if public.st_is_demo(d.owner_id) and not coalesce((select enabled from public.st_flags where key = 'demo_publish_sandbox'), false) then
      raise exception 'Program milik akun demo tidak ditayangkan di katalog EDU publik.';
    end if;
  else
    raise exception 'Keputusan tidak dikenal.';
  end if;
  insert into public.st_program_reviews (draft_id, decision, note, checks) values (p_id, p_decision, nullif(trim(coalesce(p_note, '')), ''), coalesce(p_checks, '{}'::jsonb));
  update public.st_program_drafts set status = p_decision, review_note = nullif(trim(coalesce(p_note, '')), ''), reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
  return jsonb_build_object('status', p_decision, 'cover_path', d.cover_path,
    'public_path', case when d.cover_path is not null then 'programs/' || d.id || '/' || regexp_replace(d.cover_path, '^.*/', '') end);
end $$;
revoke execute on function public.st_review_draft(uuid, text, text, jsonb) from public, anon;
grant execute on function public.st_review_draft(uuid, text, text, jsonb) to authenticated;

-- ============ adapter Studio → EDU: kini langsung menayangkan ============
create or replace function public.st_send_to_edu(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare d record; pv record; v_slug text; v_data jsonb; v_pid uuid; v_err text; f jsonb; v_cover text; v_pub text; v_base text;
  v_digital boolean;
begin
  perform public.st_require_mfa();
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  select * into d from public.st_program_drafts where id = p_id for update;
  if not found then raise exception 'Program tidak ditemukan.'; end if;
  if d.status not in ('approved','publish_failed','publish_queued','published') then raise exception 'Hanya program berstatus Disetujui yang bisa dikirim ke EDU.'; end if;
  if public.st_is_demo(d.owner_id) and not coalesce((select enabled from public.st_flags where key = 'demo_publish_sandbox'), false) then
    raise exception 'Program milik akun demo tidak dikirim ke katalog EDU publik (flag demo_publish_sandbox OFF).';
  end if;
  if not d.rights_declared then raise exception 'Kontributor belum menyatakan hak materi.'; end if;
  if d.type = 'ecourse' then raise exception 'E-course segera hadir — belum bisa tayang sampai delivery LMS siap. Program tetap Disetujui di Studio.'; end if;
  if d.pricing = 'paid' and (d.price is null or d.price < 1000) then raise exception 'Program berbayar wajib punya harga final (min. Rp1.000) sebelum dikirim.'; end if;
  if d.cover_path is not null and not d.rights_media then raise exception 'Hak pakai cover/poster belum dinyatakan.'; end if;
  v_digital := d.type in ('ebook','kit');
  f := coalesce(d.format_fields, '{}'::jsonb);
  select * into pv from public.st_program_private where draft_id = d.id;
  begin
    -- cover v4: harus sudah disalin ke bucket publik edu-media oleh Commander setelah approve
    if d.cover_path is not null then
      v_pub := 'programs/' || d.id || '/' || regexp_replace(d.cover_path, '^.*/', '');
      if not exists (select 1 from storage.objects o where o.bucket_id = 'edu-media' and o.name = v_pub) then
        raise exception 'Cover belum tersalin ke media publik EDU — tekan "Tayangkan ulang".';
      end if;
      v_base := (select config ->> 'base' from public.st_flags where key = 'media_public_base');
      if coalesce(v_base, '') !~ '^https://' then raise exception 'Basis URL media publik belum dikonfigurasi.'; end if;
      v_cover := v_base || v_pub;
    else
      v_cover := nullif(d.cover_url, ''); -- draft lama (v3): URL sampul https
    end if;
    v_data := jsonb_strip_nulls(jsonb_build_object(
      'type', d.type, 'path', d.path, 'title', d.title, 'summary', d.summary, 'forWho', d.for_who, 'level', d.level,
      'status', case when v_digital then 'AVAILABLE' else 'OPEN' end, 'free', d.pricing = 'free',
      'price', case when d.pricing = 'paid' then d.price end,
      'startsAt', case when not v_digital and d.schedule_at is not null then to_char(d.schedule_at at time zone 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS"+07:00"') end,
      'date', case when not v_digital and d.schedule_at is null then 'Tanggal menyusul' end,
      'sortDate', coalesce(to_char(d.schedule_at at time zone 'Asia/Jakarta', 'YYYY-MM-DD'), case when v_digital then '9999' else '9990' end),
      'dur', nullif(d.duration, ''), 'mode', case when v_digital then null else 'Online' end,
      'loc', case when v_digital then null else 'Tautan sesi dikirim hanya ke peserta terdaftar' end,
      'capacity', case when not v_digital then d.capacity end, 'cap', case when not v_digital and d.capacity is not null then d.capacity::text || ' peserta' end,
      'added', extract(epoch from now())::bigint, 'tags', to_jsonb(d.tags), 'outcomes', to_jsonb(d.outcomes),
      'toc', case when cardinality(d.toc) > 0 then to_jsonb(d.toc) end,
      'cover', v_cover, 'coverAlt', nullif(trim(coalesce(d.cover_alt, '')), ''), 'coverRatio', d.cover_ratio,
      'facilitator', nullif(trim(coalesce(d.public_name, '')), ''), 'author', case when v_digital then nullif(trim(coalesce(d.public_name, '')), '') end,
      'refundTerms', nullif(d.refund_terms, ''), 'acceptsTokens', false,
      -- field format (v4 §08.2); meeting URL & file TIDAK pernah masuk data publik
      'pages', f ->> 'pages', 'license', f ->> 'license', 'version', f ->> 'version', 'preview', f ->> 'preview',
      'speakerBio', f ->> 'speaker_bio', 'timezone', f ->> 'timezone', 'summaryDue', f ->> 'summary_due',
      'agenda', case when jsonb_typeof(f -> 'agenda') = 'array' then (select jsonb_agg(jsonb_build_array(a ->> 'item', coalesce(a ->> 'dur', ''))) from jsonb_array_elements(f -> 'agenda') a) end,
      'faq', case when jsonb_typeof(f -> 'faq') = 'array' then f -> 'faq' end,
      'sessions', case when jsonb_typeof(f -> 'sessions') = 'array' then (select jsonb_agg(jsonb_build_object('startsAt', s ->> 'starts_at', 'dur', s ->> 'dur') order by s ->> 'starts_at') from jsonb_array_elements(f -> 'sessions') s) end,
      'resources', f ->> 'resources', 'assignment', f ->> 'assignment', 'output', f ->> 'output',
      'kitFiles', case when jsonb_typeof(f -> 'files') = 'array' then f -> 'files' end));
    select id, slug into v_pid, v_slug from public.edu_programs where draft_id = d.id for update;
    if found then
      update public.edu_programs set data = v_data || jsonb_build_object('slug', v_slug), contributor_id = d.owner_id, published = true where id = v_pid;
    else
      v_slug := d.slug;
      if exists (select 1 from public.edu_programs where slug = v_slug) then v_slug := v_slug || '-' || substr(replace(d.id::text, '-', ''), 1, 4); end if;
      insert into public.edu_programs (slug, data, published, position, draft_id, contributor_id)
      values (v_slug, v_data || jsonb_build_object('slug', v_slug), true, 999, d.id, d.owner_id) returning id into v_pid;
    end if;
    insert into public.edu_program_private (program_id, meeting_url, ebook_path)
    values (v_pid, case when not v_digital then pv.meeting_url end, case when v_digital then pv.ebook_path end)
    on conflict (program_id) do update set
      meeting_url = case when v_digital then null else excluded.meeting_url end,
      ebook_path = case when v_digital then coalesce(excluded.ebook_path, public.edu_program_private.ebook_path) else null end;
  exception when others then
    v_err := sqlerrm;
  end;
  if v_err is not null then
    update public.st_program_drafts set status = 'publish_failed', publish_error = left(v_err, 300) where id = p_id;
    perform public.st_notify(null, 'commander', 'edu.program.publish_failed', 'Publikasi EDU gagal', d.title || ': ' || left(v_err, 120), '/command/edu-review');
    return 'FAILED: ' || v_err;
  end if;
  -- "Tayang" hanya bila baris EDU benar-benar published (ACK); selain itu tetap antre.
  update public.st_program_drafts set status = case when (select published from public.edu_programs where id = v_pid) then 'published' else 'publish_queued' end,
    edu_slug = v_slug, edu_program_id = v_pid, publish_error = null where id = p_id;
  return v_slug;
end $$;
revoke execute on function public.st_send_to_edu(uuid) from public, anon;
grant execute on function public.st_send_to_edu(uuid) to authenticated;

-- ============ email "Program tayang" hanya setelah ACK ============
create or replace function public.st_program_mail() returns trigger language plpgsql security definer set search_path = '' as $$
declare pr record;
begin
  if new.status = 'published' and old.status is distinct from 'published' then
    select email, display_name, is_demo into pr from public.st_profiles where id = new.owner_id;
    if pr.email is not null and not coalesce(pr.is_demo, false) then
      insert into public.st_outbox (topic, aggregate_id, subject_id, channel, recipient, template, payload)
      values ('program.published', new.id, new.id, 'email', pr.email, 'program_published',
        jsonb_build_object('name', pr.display_name, 'title', new.title, 'slug', new.edu_slug, 'type', new.type))
      on conflict (topic, aggregate_id, channel) do nothing;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists c_st_prog_mail on public.st_program_drafts;
create trigger c_st_prog_mail after update of status on public.st_program_drafts for each row execute function public.st_program_mail();
revoke execute on function public.st_program_mail() from public, anon, authenticated;

-- ============ KIT = produk digital seperti e-book untuk kelayakan bagi hasil ============
do $$
declare def text;
begin
  def := pg_get_functiondef('public.st_release_program_payable(uuid)'::regprocedure);
  if position($o$p.data ->> 'type' = 'ebook' then o.paid_at$o$ in def) > 0 then
    execute replace(def, $o$p.data ->> 'type' = 'ebook' then o.paid_at$o$, $n$p.data ->> 'type' in ('ebook','kit') then o.paid_at$n$);
  elsif position($o$('ebook','kit')$o$ in def) = 0 then
    raise exception 'Kelayakan e-book tidak ditemukan di st_release_program_payable.';
  end if;
end $$;
