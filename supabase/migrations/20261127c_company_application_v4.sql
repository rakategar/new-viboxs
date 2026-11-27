-- v4 WP02 — Company Application end-to-end (QA V4-CA-001..012, V4-CP-001, V4-MG-003, COM-001..004).
--  * Satu antrean Commander untuk pengajuan dari EDU /for-companies (tanpa akun, edge company-apply) dan Studio /company.
--  * Kolom v4: WhatsApp E.164, industri, alamat, email PIC, tujuan, logo + dokumen NIB (bucket privat st-company),
--    consent komunikasi & data, sumber + idempotency.
--  * Status v4: SUBMITTED → IN_COMMANDER_QUEUE → REVIEW → NEED_INFO | REJECTED | VERIFIED → COMPANY_INVITE_SENT → ACTIVE | SUSPENDED.
--    APPLIED (v3) dipetakan ke IN_COMMANDER_QUEUE.
--  * VERIFIED tidak lagi memberi role langsung: sistem mengirim undangan aman (jalur WP01) ke email PIC;
--    role company_partner aktif setelah undangan diterima (V4-CA-010).
--  * Email konfirmasi & status lewat st_outbox. WhatsApp: provider belum ada → baris skipped_provider_off (V4-CA-009).
--  * Backfill V4-MG-003: 2 pendaftaran lama di submissions → st_companies source='backfill', tanpa email otomatis.
-- Rollback: kolom baru nullable/default; kembalikan st_company_apply/st_company_decide dari 20261125d dan
--   constraint status lama (update status IN_COMMANDER_QUEUE/SUBMITTED → APPLIED dulu).

alter table public.st_outbox add column if not exists subject_id uuid;
create index if not exists st_outbox_subject on public.st_outbox (subject_id);
update public.st_outbox o set subject_id = i.application_id from public.st_invites i where o.topic = 'invite.activation' and o.aggregate_id = i.id and o.subject_id is null;

alter table public.st_companies alter column owner_id drop not null;
alter table public.st_companies
  add column if not exists company_whatsapp text,
  add column if not exists industry text,
  add column if not exists address text,
  add column if not exists pic_email text,
  add column if not exists purpose text,
  add column if not exists nib_doc_path text,
  add column if not exists logo_path text,
  add column if not exists logo_rights boolean not null default false,
  add column if not exists data_consent boolean not null default false,
  add column if not exists comm_consent_email boolean not null default true,
  add column if not exists comm_consent_wa boolean not null default false,
  add column if not exists source text not null default 'studio',
  add column if not exists source_ref text,
  add column if not exists idem_key text,
  add column if not exists ip_hash text,
  add column if not exists invite_id uuid,
  add column if not exists needs_completion boolean not null default false;
alter table public.st_companies drop constraint if exists st_companies_status_check;
update public.st_companies set status = 'IN_COMMANDER_QUEUE' where status = 'APPLIED';
alter table public.st_companies add constraint st_companies_status_check check (status in
  ('SUBMITTED','IN_COMMANDER_QUEUE','REVIEW','NEED_INFO','REJECTED','VERIFIED','COMPANY_INVITE_SENT','ACTIVE','SUSPENDED'));
alter table public.st_companies alter column status set default 'IN_COMMANDER_QUEUE';
alter table public.st_companies drop constraint if exists st_companies_wa_check;
alter table public.st_companies add constraint st_companies_wa_check check (company_whatsapp is null or company_whatsapp ~ '^\+[1-9][0-9]{7,14}$');
alter table public.st_companies drop constraint if exists st_companies_purpose_check;
alter table public.st_companies add constraint st_companies_purpose_check check (purpose is null or purpose in ('hiring','services','both'));
alter table public.st_companies drop constraint if exists st_companies_source_check;
alter table public.st_companies add constraint st_companies_source_check check (source in ('edu','studio','backfill'));
create unique index if not exists st_companies_idem on public.st_companies (idem_key) where idem_key is not null;
create unique index if not exists st_companies_source_ref on public.st_companies (source, source_ref) where source_ref is not null;

-- Bucket privat logo & dokumen. Diunggah hanya oleh edge function (service role); dibaca Commander lewat signed URL.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('st-company', 'st-company', false, 5242880, array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "st-company: commander baca" on storage.objects;
create policy "st-company: commander baca" on storage.objects for select to authenticated
  using (bucket_id = 'st-company' and (select public.st_is_commander()));
drop policy if exists "st-company: pemilik baca" on storage.objects;
create policy "st-company: pemilik baca" on storage.objects for select to authenticated
  using (bucket_id = 'st-company' and exists (select 1 from public.st_companies c where c.owner_id = (select auth.uid()) and (storage.foldername(name))[2] = c.id::text));

insert into public.st_flags (key, label, description, enabled, locked) values
  ('company_wa_notifications', 'Notifikasi WhatsApp perusahaan', 'Kirim status pengajuan ke WhatsApp perusahaan. OFF sampai provider WhatsApp resmi terhubung dan diuji; selama OFF copy hanya menyebut email.', false, false)
on conflict (key) do nothing;

/** Normalisasi nomor WA Indonesia: 08… / 628… / +628… → +628…; selain itu harus sudah E.164. */
create or replace function public.st_norm_wa(p text) returns text language sql immutable set search_path = '' as $$
  select case
    when p is null or btrim(p) = '' then null
    when regexp_replace(p, '[\s\-().]', '', 'g') ~ '^0[0-9]{8,13}$' then '+62' || substr(regexp_replace(p, '[\s\-().]', '', 'g'), 2)
    when regexp_replace(p, '[\s\-().]', '', 'g') ~ '^62[0-9]{8,13}$' then '+' || regexp_replace(p, '[\s\-().]', '', 'g')
    else regexp_replace(p, '[\s\-().]', '', 'g') end
$$;

/**
 * Inti pengajuan (dipakai edge company-apply dan st_company_apply). Validasi server untuk semua kolom wajib.
 * Idempoten per idem_key; pengajuan terbuka yang sama (email + nama legal) mengembalikan ref lama tanpa email kedua.
 */
create or replace function public.st_company_submit(p jsonb, p_source text, p_owner uuid, p_ip_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_ref text; v_ex record; v_wa text := public.st_norm_wa(p ->> 'company_whatsapp');
  v_email text := lower(trim(coalesce(p ->> 'business_email', ''))); v_pic text := nullif(lower(trim(coalesce(p ->> 'pic_email', ''))), '');
  v_idem text := nullif(trim(coalesce(p ->> 'idem_key', '')), ''); v_n int;
begin
  if p_source not in ('edu','studio') then raise exception 'Sumber tidak dikenal.'; end if;
  if v_idem is not null then
    select id, ref into v_ex from public.st_companies where idem_key = v_idem;
    if found then return jsonb_build_object('id', v_ex.id, 'ref', v_ex.ref, 'duplicate', true); end if;
  end if;
  if length(trim(coalesce(p ->> 'legal_name', ''))) < 3 then raise exception 'Isi nama legal perusahaan.'; end if;
  if length(trim(coalesce(p ->> 'nib', ''))) < 5 then raise exception 'Isi nomor NIB atau identitas usaha.'; end if;
  if length(trim(coalesce(p ->> 'industry', ''))) < 2 then raise exception 'Isi industri perusahaan.'; end if;
  if length(trim(coalesce(p ->> 'address', ''))) < 10 then raise exception 'Isi alamat usaha (min. 10 karakter).'; end if;
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then raise exception 'Email perusahaan tidak valid.'; end if;
  if v_pic is not null and v_pic !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then raise exception 'Email PIC tidak valid.'; end if;
  if v_wa is null or v_wa !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'Nomor WhatsApp perusahaan tidak valid. Contoh: 0812xxxxxxx atau +62812xxxxxxx.'; end if;
  if length(trim(coalesce(p ->> 'pic_name', ''))) < 3 or length(trim(coalesce(p ->> 'pic_role', ''))) < 2 then raise exception 'Isi nama dan jabatan PIC.'; end if;
  if coalesce(p ->> 'purpose', '') not in ('hiring','services','both') then raise exception 'Pilih tujuan penggunaan.'; end if;
  if length(trim(coalesce(p ->> 'hiring_needs', ''))) < 30 then raise exception 'Jelaskan kebutuhan kandidat/layanan (min. 30 karakter).'; end if;
  if coalesce(p ->> 'website', '') <> '' and (p ->> 'website') !~ '^https?://' then raise exception 'Website harus diawali https://'; end if;
  if coalesce((p ->> 'authority_statement')::boolean, false) is not true then raise exception 'Pernyataan kewenangan wajib dicentang.'; end if;
  if coalesce((p ->> 'data_consent')::boolean, false) is not true then raise exception 'Kesepakatan penggunaan data wajib dicentang.'; end if;
  if p_source = 'edu' and (coalesce(p ->> 'logo_path', '') = '' or coalesce((p ->> 'logo_rights')::boolean, false) is not true) then
    raise exception 'Unggah logo perusahaan dan nyatakan izin pemakaiannya.';
  end if;
  if p_ip_hash is not null then
    select count(*) into v_n from public.st_companies where ip_hash = p_ip_hash and created_at > now() - interval '1 hour';
    if v_n >= 5 then raise exception 'Terlalu banyak pengajuan. Coba lagi nanti.'; end if;
  end if;
  select id, ref into v_ex from public.st_companies
   where lower(business_email) = v_email and lower(trim(legal_name)) = lower(trim(p ->> 'legal_name'))
     and status in ('SUBMITTED','IN_COMMANDER_QUEUE','REVIEW','NEED_INFO') limit 1;
  if found then return jsonb_build_object('id', v_ex.id, 'ref', v_ex.ref, 'duplicate', true); end if;

  insert into public.st_companies (id, owner_id, legal_name, nib, business_domain, business_email, pic_name, pic_role, pic_email, hiring_needs, website,
    authority_statement, terms_version, company_whatsapp, industry, address, purpose, nib_doc_path, logo_path, logo_rights, data_consent,
    comm_consent_email, comm_consent_wa, source, idem_key, ip_hash, status)
  values (coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid()), p_owner, trim(p ->> 'legal_name'), trim(p ->> 'nib'), nullif(trim(coalesce(p ->> 'business_domain', '')), ''), v_email, trim(p ->> 'pic_name'), trim(p ->> 'pic_role'),
    v_pic, trim(p ->> 'hiring_needs'), nullif(trim(coalesce(p ->> 'website', '')), ''), true, coalesce(nullif(p ->> 'terms_version', ''), 'company-terms-draft-2026-11'),
    v_wa, trim(p ->> 'industry'), trim(p ->> 'address'), p ->> 'purpose', nullif(p ->> 'nib_doc_path', ''), nullif(p ->> 'logo_path', ''),
    coalesce((p ->> 'logo_rights')::boolean, false), true, true, coalesce((p ->> 'comm_consent_wa')::boolean, false), p_source, v_idem, p_ip_hash, 'IN_COMMANDER_QUEUE')
  returning id, ref into v_id, v_ref;
  perform public.st_company_queue_notice(v_id, 'company.application', jsonb_build_object('ref', v_ref));
  perform public.st_notify(null, 'commander', 'company_application.submitted', 'Pengajuan Company Partner baru', trim(p ->> 'legal_name') || ' · ' || v_ref, '/command/companies');
  return jsonb_build_object('id', v_id, 'ref', v_ref, 'duplicate', false);
end $$;
revoke execute on function public.st_company_submit(jsonb, text, uuid, text) from public, anon, authenticated;

/** Antre email (+ WhatsApp tercatat skipped bila provider OFF / tanpa consent). Penerima: email perusahaan + email PIC bila beda. */
create or replace function public.st_company_queue_notice(p_company uuid, p_topic text, p_payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare c record; v_agg uuid := case when p_topic = 'company.application' then p_company else gen_random_uuid() end;
begin
  select * into c from public.st_companies where id = p_company;
  if not found then return; end if;
  insert into public.st_outbox (topic, aggregate_id, subject_id, channel, recipient, template, payload)
  values (p_topic, v_agg, c.id, 'email', c.business_email, p_topic, p_payload || jsonb_build_object('name', c.pic_name, 'company', c.legal_name, 'ref', c.ref))
  on conflict (topic, aggregate_id, channel) do nothing;
  if c.company_whatsapp is not null then
    insert into public.st_outbox (topic, aggregate_id, subject_id, channel, recipient, template, payload, status, last_error)
    values (p_topic, v_agg, c.id, 'whatsapp', c.company_whatsapp, p_topic, jsonb_build_object('ref', c.ref, 'status', p_payload ->> 'status'),
      'skipped_provider_off', case when not c.comm_consent_wa then 'Tanpa consent WhatsApp' else 'Provider WhatsApp belum terhubung (flag company_wa_notifications OFF)' end)
    on conflict (topic, aggregate_id, channel) do nothing;
  end if;
end $$;
revoke execute on function public.st_company_queue_notice(uuid, text, jsonb) from public, anon, authenticated;

/** Studio /company (pengguna sudah masuk): kolom v4 yang sama, pemilik = akun ini. Pengajuan NEED_INFO bisa dilengkapi ulang. */
create or replace function public.st_company_apply(p jsonb) returns text language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_ex record; r jsonb; v_wa text := public.st_norm_wa(p ->> 'company_whatsapp');
begin
  if uid is null then raise exception 'Belum masuk.' using errcode = '42501'; end if;
  if public.st_ranger_active(uid) then raise exception 'Akun Ranger aktif tidak dapat mendaftarkan perusahaan hiring.' using errcode = '42501'; end if;
  insert into public.st_profiles (id, email, display_name) values (uid, auth.jwt() ->> 'email', split_part(auth.jwt() ->> 'email', '@', 1)) on conflict (id) do nothing;
  select * into v_ex from public.st_companies where owner_id = uid and status not in ('REJECTED') for update;
  if found then
    if v_ex.status not in ('SUBMITTED','NEED_INFO') then raise exception 'Pengajuan perusahaan Anda sudah diproses (status %).', v_ex.status; end if;
    if v_wa is null or v_wa !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'Nomor WhatsApp perusahaan tidak valid.'; end if;
    if length(trim(coalesce(p ->> 'hiring_needs', ''))) < 30 then raise exception 'Jelaskan kebutuhan kandidat/layanan (min. 30 karakter).'; end if;
    update public.st_companies set legal_name = trim(p ->> 'legal_name'), nib = nullif(trim(coalesce(p ->> 'nib', '')), ''), business_domain = nullif(trim(coalesce(p ->> 'business_domain', '')), ''),
      business_email = lower(trim(p ->> 'business_email')), pic_name = trim(p ->> 'pic_name'), pic_role = trim(p ->> 'pic_role'), hiring_needs = trim(p ->> 'hiring_needs'),
      website = nullif(trim(coalesce(p ->> 'website', '')), ''), company_whatsapp = v_wa, industry = nullif(trim(coalesce(p ->> 'industry', '')), ''),
      address = nullif(trim(coalesce(p ->> 'address', '')), ''), purpose = coalesce(nullif(p ->> 'purpose', ''), purpose), pic_email = nullif(lower(trim(coalesce(p ->> 'pic_email', ''))), ''),
      comm_consent_wa = coalesce((p ->> 'comm_consent_wa')::boolean, comm_consent_wa), needs_completion = false, status = 'IN_COMMANDER_QUEUE'
    where id = v_ex.id;
    perform public.st_notify(null, 'commander', 'company_application.updated', 'Pengajuan perusahaan dilengkapi', v_ex.legal_name || ' · ' || v_ex.ref, '/command/companies');
    return v_ex.ref;
  end if;
  -- id & path file hanya boleh diisi edge company-apply (service role), bukan dari klien.
  r := public.st_company_submit((p - 'id' - 'logo_path' - 'nib_doc_path' - 'logo_rights') || jsonb_build_object('data_consent', coalesce((p ->> 'data_consent')::boolean, false)), 'studio', uid, null);
  return r ->> 'ref';
end $$;

/**
 * Keputusan Commander. VERIFIED → undangan aman company_partner ke email PIC (status COMPANY_INVITE_SENT);
 * role aktif setelah undangan diterima. Setiap keputusan (kecuali REVIEW internal) mengantre email status.
 */
create or replace function public.st_company_decide(p_id uuid, p_status text, p_note text) returns void language plpgsql security definer set search_path = '' as $$
declare c record; v_inv uuid; v_to text;
begin
  perform public.st_require_mfa();
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  if p_status not in ('REVIEW','NEED_INFO','REJECTED','VERIFIED','SUSPENDED') then raise exception 'Status tidak dikenal.'; end if;
  if p_status <> 'REVIEW' and length(trim(coalesce(p_note, ''))) < 10 then raise exception 'Tulis catatan keputusan (min. 10 karakter).'; end if;
  select * into c from public.st_companies where id = p_id for update;
  if not found then raise exception 'Perusahaan tidak ditemukan.'; end if;
  if p_status = 'VERIFIED' then
    if c.status not in ('SUBMITTED','IN_COMMANDER_QUEUE','REVIEW','NEED_INFO','COMPANY_INVITE_SENT') then raise exception 'Status % tidak bisa diverifikasi ulang.', c.status; end if;
    if c.needs_completion then raise exception 'Data pengajuan belum lengkap (WhatsApp/logo/alamat). Minta info ke perusahaan dulu.'; end if;
    if c.owner_id is not null and public.st_ranger_active(c.owner_id) then raise exception 'PIC ini Ranger aktif — tidak boleh memegang workspace perusahaan.'; end if;
    -- Pengajuan dari Studio: undangan ke email login pemilik (agar bisa diterima akun yang sama). Dari EDU: email PIC/perusahaan.
    v_to := coalesce((select u.email from auth.users u where u.id = c.owner_id), c.pic_email, c.business_email);
    if exists (select 1 from auth.users u where lower(u.email) = lower(v_to) and public.st_ranger_active(u.id)) then
      raise exception 'Email PIC milik Ranger aktif — tidak boleh memegang workspace perusahaan.';
    end if;
  end if;
  update public.st_companies set status = p_status, review_note = nullif(trim(coalesce(p_note, '')), ''),
    grants = case when p_status = 'VERIFIED' then array['HIRING_VIEW','HIRING_MANAGE','SERVICES_CATALOG','SERVICES_LEAD'] when p_status in ('SUSPENDED','REJECTED') then '{}' else grants end,
    verified_by = case when p_status = 'VERIFIED' then auth.uid() else verified_by end, verified_at = case when p_status = 'VERIFIED' then now() else verified_at end
  where id = p_id;
  if p_status = 'VERIFIED' then
    v_inv := public.st_issue_invite(v_to, array['company_partner'], null, null, false, c.pic_name);
    update public.st_outbox set subject_id = c.id where topic = 'invite.activation' and aggregate_id = v_inv;
    update public.st_companies set status = 'COMPANY_INVITE_SENT', invite_id = v_inv where id = p_id;
    -- Pemilik lama (pengajuan dari Studio) yang grant-nya pernah ditangguhkan tetap menunggu undangan diterima.
  elsif p_status in ('SUSPENDED','REJECTED') then
    if c.owner_id is not null then
      update public.st_role_grants set status = 'suspended', note = p_note where person_id = c.owner_id and role = 'company_partner' and status = 'active';
      update public.st_profiles set active_role = null where id = c.owner_id and active_role = 'company_partner';
    end if;
    if c.invite_id is not null then update public.st_invites set status = 'revoked' where id = c.invite_id and status = 'pending'; end if;
  end if;
  if p_status <> 'REVIEW' then
    perform public.st_company_queue_notice(p_id, 'company.status', jsonb_build_object('status', p_status, 'note', nullif(trim(coalesce(p_note, '')), '')));
  end if;
  if c.owner_id is not null then
    perform public.st_notify(c.owner_id, null, 'company.' || lower(p_status),
      case p_status when 'VERIFIED' then 'Perusahaan terverifikasi — cek email untuk aktivasi Company Workspace' when 'NEED_INFO' then 'Verifikasi perusahaan butuh info tambahan'
        when 'REJECTED' then 'Verifikasi perusahaan ditolak' when 'SUSPENDED' then 'Workspace perusahaan ditangguhkan' else 'Pengajuan perusahaan sedang ditinjau' end,
      p_note, '/company');
  end if;
end $$;

/** Commander: kirim ulang undangan Company (mis. kedaluwarsa). */
create or replace function public.st_company_reinvite(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare c record; v_inv uuid;
begin
  perform public.st_require_mfa();
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  select * into c from public.st_companies where id = p_id for update;
  if not found or c.status <> 'COMPANY_INVITE_SENT' then raise exception 'Undangan hanya bisa dikirim ulang untuk perusahaan terverifikasi yang belum aktif.'; end if;
  v_inv := public.st_issue_invite(coalesce((select u.email from auth.users u where u.id = c.owner_id), c.pic_email, c.business_email), array['company_partner'], null, null, false, c.pic_name);
  update public.st_outbox set subject_id = c.id where topic = 'invite.activation' and aggregate_id = v_inv;
  update public.st_companies set invite_id = v_inv where id = p_id;
end $$;
revoke execute on function public.st_company_reinvite(uuid) from public, anon;
grant execute on function public.st_company_reinvite(uuid) to authenticated;

/** Commander melengkapi data dari balasan perusahaan (backfill / NEED_INFO via email). Tercatat di audit (trigger a_st_cmp). */
create or replace function public.st_company_complete(p_id uuid, p jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare c record; v_wa text := public.st_norm_wa(p ->> 'company_whatsapp');
begin
  perform public.st_require_mfa();
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  select * into c from public.st_companies where id = p_id for update;
  if not found then raise exception 'Perusahaan tidak ditemukan.'; end if;
  if c.status not in ('SUBMITTED','IN_COMMANDER_QUEUE','REVIEW','NEED_INFO') then raise exception 'Data hanya bisa dilengkapi sebelum verifikasi.'; end if;
  if v_wa is null or v_wa !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'Nomor WhatsApp perusahaan tidak valid.'; end if;
  if length(trim(coalesce(p ->> 'industry', ''))) < 2 then raise exception 'Isi industri perusahaan.'; end if;
  if length(trim(coalesce(p ->> 'address', ''))) < 10 then raise exception 'Isi alamat usaha (min. 10 karakter).'; end if;
  if coalesce(p ->> 'purpose', '') not in ('hiring','services','both') then raise exception 'Pilih tujuan penggunaan.'; end if;
  update public.st_companies set company_whatsapp = v_wa, industry = trim(p ->> 'industry'), address = trim(p ->> 'address'), purpose = p ->> 'purpose',
    nib = coalesce(nullif(trim(coalesce(p ->> 'nib', '')), ''), nib), needs_completion = false,
    status = case when status = 'SUBMITTED' then 'IN_COMMANDER_QUEUE' else status end
  where id = p_id;
end $$;
revoke execute on function public.st_company_complete(uuid, jsonb) from public, anon;
grant execute on function public.st_company_complete(uuid, jsonb) to authenticated;

-- Undangan company_partner diterima → perusahaan ACTIVE, owner = akun penerima. Ranger aktif ditolak.
do $$
declare def text; old_sql text; new_sql text;
begin
  def := pg_get_functiondef('public.st_accept_invite(text)'::regprocedure);
  old_sql := $o$  foreach r in array i.roles loop$o$;
  new_sql := $n$  if 'company_partner' = any(i.roles) then
    if public.st_ranger_active(uid) then raise exception 'Akun Ranger aktif tidak dapat memegang Company Workspace.' using errcode = '42501'; end if;
    update public.st_companies set owner_id = uid, status = 'ACTIVE' where invite_id = i.id and status = 'COMPANY_INVITE_SENT' and (owner_id is null or owner_id = uid);
    if not found then raise exception 'Perusahaan untuk undangan ini tidak ditemukan atau sudah dipegang akun lain. Hubungi Commander.'; end if;
    update public.st_role_grants set status = 'active', note = 'Undangan Company diterima'
     where id = (select g.id from public.st_role_grants g where g.person_id = uid and g.role = 'company_partner' and g.status = 'suspended' order by g.created_at desc limit 1)
       and not exists (select 1 from public.st_role_grants g where g.person_id = uid and g.role = 'company_partner' and g.status = 'active');
  end if;
  foreach r in array i.roles loop$n$;
  if position('invite_id = i.id' in def) = 0 then
    if position(old_sql in def) = 0 then raise exception 'Loop peran tidak ditemukan di st_accept_invite.'; end if;
    execute replace(def, old_sql, new_sql);
  end if;
end $$;

-- Backfill V4-MG-003: pendaftaran perusahaan lama yang tersangkut di submissions (form EDU v3). Tanpa email otomatis.
insert into public.st_companies (owner_id, legal_name, nib, business_domain, business_email, pic_name, pic_role, hiring_needs, website,
  authority_statement, terms_version, source, source_ref, status, needs_completion, review_note, created_at)
select null, trim(s.payload ->> 'perusahaan'), nullif(trim(coalesce(s.payload ->> 'nib', '')), ''), null, lower(s.email), coalesce(nullif(trim(s.payload ->> 'nama'), ''), s.name),
  coalesce(nullif(trim(s.payload ->> 'jabatan'), ''), '—'), coalesce(nullif(trim(s.payload ->> 'kebutuhan'), ''), '—'),
  case when coalesce(s.payload ->> 'domain', '') ~ '^https?://' then s.payload ->> 'domain' end,
  coalesce((s.payload ->> 'pernyataan_kewenangan')::boolean, false), 'company-terms-draft-2026-11', 'backfill', s.ref, 'SUBMITTED', true,
  'Backfill dari form EDU v3 (' || s.ref || '). Lengkapi WhatsApp, logo, alamat, industri, tujuan sebelum verifikasi.', s.created_at
from public.submissions s
where s.kind = 'contact' and s.payload ->> 'intent' = 'Company Partner (hiring)' and coalesce(trim(s.payload ->> 'perusahaan'), '') <> '' and s.email is not null
  and not exists (select 1 from public.st_companies c where (c.source = 'backfill' and c.source_ref = s.ref)
                  or (lower(c.business_email) = lower(s.email) and lower(trim(c.legal_name)) = lower(trim(s.payload ->> 'perusahaan'))));

-- Undangan untuk akun yang sudah masuk: email login terverifikasi = bukti kepemilikan email, setara token.
-- Dipakai bila email tidak sampai, dan untuk akun yang sudah ada (Learner → Kontributor, PIC Studio → Company).
create or replace function public.st_my_invites() returns table (id uuid, roles text[], expires_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.id, i.roles, i.expires_at from public.st_invites i
  where i.status = 'pending' and i.expires_at > now() and auth.uid() is not null
    and lower(i.email) = lower(auth.jwt() ->> 'email')
    and exists (select 1 from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null)
  order by i.created_at desc
$$;
revoke execute on function public.st_my_invites() from public, anon;
grant execute on function public.st_my_invites() to authenticated;

-- st_accept_invite_by_id = st_accept_invite dengan pencarian per id (aturan peran identik). Dibuat dari definisi live.
do $$
declare def text; old_sql text;
begin
  def := pg_get_functiondef('public.st_accept_invite(text)'::regprocedure);
  old_sql := $o$where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') for update;$o$;
  if position(old_sql in def) = 0 then raise exception 'Pencarian token tidak ditemukan di st_accept_invite.'; end if;
  def := replace(def, old_sql, $n$where id = p_invite for update;
  if found and not exists (select 1 from auth.users u where u.id = uid and u.email_confirmed_at is not null) then
    raise exception 'Verifikasi email akun Anda terlebih dulu.' using errcode = '42501';
  end if;$n$);
  def := replace(def, 'public.st_accept_invite(p_token text)', 'public.st_accept_invite_by_id(p_invite uuid)');
  execute def;
end $$;
revoke execute on function public.st_accept_invite_by_id(uuid) from public, anon;
grant execute on function public.st_accept_invite_by_id(uuid) to authenticated;
