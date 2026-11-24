-- Batch 5 — Company Workspace + firewall Ranger (PRD v3.0 §03.2–03.5, §09, §10; Runbook WP-02/WP-09; QA COM-*, RAN-*).
--  * Ranger AKTIF (grant ranger belum dicabut ATAU status ACTIVE/DEACTIVATION_REQUESTED) tidak pernah keluar dari talent search,
--    apa pun nilai talent_opt_in-nya. Penegakan di server (fungsi security definer), bukan di UI.
--  * Perusahaan hanya mencari learner opt-in, tidak membaca tabel talent/profil secara langsung; kontak keluar setelah kandidat menerima.
--  * Ranger baru hanya dari EDU Learner, kecuali undangan bertanda legacy_import (RAN-001/002).
--  * Bukti transfer Ranger disimpan di bucket privat; penerima hanya melihat bukti untuk payable miliknya.

-- ============ peran company_partner ============
alter table public.st_role_grants drop constraint if exists st_role_grants_role_check;
alter table public.st_role_grants add constraint st_role_grants_role_check
  check (role in ('commander','operator','ranger','trainer','learner','opc_founder','business_partner','collaborator','company_partner'));

-- ============ status Ranger ============
create table public.st_ranger_status (
  person_id uuid primary key references public.st_profiles(id) on delete cascade,
  origin text not null check (origin in ('legacy_import','edu_pipeline')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','DEACTIVATION_REQUESTED','INACTIVE')),
  request_reason text,
  requested_at timestamptz,
  clearance_note text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.st_ranger_status enable row level security;
revoke all on public.st_ranger_status from anon;
revoke insert, update, delete on public.st_ranger_status from authenticated;
create policy "status ranger: sendiri / commander" on public.st_ranger_status for select to authenticated
  using (person_id = (select auth.uid()) or (select public.st_is_commander()));
create trigger t_st_rstat before update on public.st_ranger_status for each row execute function public.touch_updated_at();
create trigger a_st_rstat after insert or update on public.st_ranger_status for each row execute function public.st_audit_trg();

insert into public.st_ranger_status (person_id, origin, status)
select distinct person_id, 'legacy_import', 'ACTIVE' from public.st_role_grants where role = 'ranger' and status <> 'revoked'
on conflict do nothing;

/** Ranger dianggap aktif selama grant belum dicabut ATAU clearance Commander belum tercatat. */
create or replace function public.st_ranger_active(p uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.st_role_grants g where g.person_id = p and g.role = 'ranger' and g.status <> 'revoked')
      or exists (select 1 from public.st_ranger_status s where s.person_id = p and s.status in ('ACTIVE','DEACTIVATION_REQUESTED'))
$$;

alter table public.st_invites add column if not exists legacy boolean not null default false;

drop function if exists public.st_create_invite(text, text[], uuid, int);
create or replace function public.st_create_invite(p_email text, p_roles text[], p_application uuid, p_days int, p_legacy boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_token text; v_id uuid;
begin
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  if p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then raise exception 'Email tidak valid.'; end if;
  if coalesce(array_length(p_roles, 1), 0) = 0 or not (p_roles <@ array['ranger','trainer','opc_founder','business_partner','collaborator','operator']) then
    raise exception 'Pilih minimal satu peran profesional yang valid.';
  end if;
  update public.st_invites set status = 'revoked' where lower(email) = lower(p_email) and status = 'pending';
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.st_invites (token_hash, email, roles, application_id, expires_at, created_by, legacy)
  values (encode(extensions.digest(v_token, 'sha256'), 'hex'), lower(trim(p_email)), p_roles, p_application, now() + make_interval(days => greatest(1, least(coalesce(p_days, 7), 30))), auth.uid(), coalesce(p_legacy, false) and 'ranger' = any(p_roles))
  returning id into v_id;
  if p_application is not null then update public.st_applications set status = 'invited', decided_by = auth.uid(), decided_at = now() where id = p_application; end if;
  return jsonb_build_object('id', v_id, 'token', v_token);
end $$;

/** Menutup undangan hiring yang masih terbuka bila orang ini menjadi Ranger aktif (COM-006). */
create or replace function public.st_ranger_activated(p uuid, p_origin text) returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.st_ranger_status (person_id, origin, status) values (p, p_origin, 'ACTIVE')
  on conflict (person_id) do update set status = 'ACTIVE', request_reason = null, requested_at = null;
  update public.st_talent_profiles set opt_in = false where person_id = p and opt_in;
  update public.st_hiring_invites set status = 'WITHDRAWN', decided_at = now() where candidate_id = p and status in ('SENT','ACCEPTED');
end $$;

create or replace function public.st_accept_invite(p_token text) returns text[]
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); i record; r text;
begin
  if uid is null then raise exception 'Masuk dulu dengan email yang diundang.' using errcode = '42501'; end if;
  select * into i from public.st_invites where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') for update;
  if not found then raise exception 'Undangan tidak valid.'; end if;
  if i.status <> 'pending' then raise exception 'Undangan ini sudah % — minta undangan baru ke Commander.', case i.status when 'accepted' then 'dipakai' when 'revoked' then 'dicabut' else 'kedaluwarsa' end; end if;
  if i.expires_at < now() then update public.st_invites set status = 'expired' where id = i.id; raise exception 'Undangan kedaluwarsa — minta undangan baru ke Commander.'; end if;
  if lower(auth.jwt() ->> 'email') <> lower(i.email) then raise exception 'Undangan ini untuk email lain. Masuk dengan email yang diundang.' using errcode = '42501'; end if;
  insert into public.st_profiles (id, email, display_name) values (uid, i.email, split_part(i.email, '@', 1)) on conflict (id) do nothing;
  if 'ranger' = any(i.roles) and not i.legacy and not public.st_has_role('learner')
     and not exists (select 1 from public.st_ranger_status where person_id = uid and origin = 'legacy_import') then
    raise exception 'Ranger baru wajib berasal dari EDU Learner terverifikasi. Daftar sebagai Learner dulu, lalu buka undangan ini lagi.';
  end if;
  foreach r in array i.roles loop
    if not public.st_has_role(r) then
      insert into public.st_role_grants (person_id, role, invite_id, granted_by, note) values (uid, r, i.id, i.created_by, 'Dari undangan Commander');
    end if;
  end loop;
  if 'ranger' = any(i.roles) then perform public.st_ranger_activated(uid, case when i.legacy then 'legacy_import' else 'edu_pipeline' end); end if;
  update public.st_invites set status = 'accepted', accepted_by = uid, accepted_at = now() where id = i.id;
  if i.application_id is not null then update public.st_applications set status = 'active', person_id = coalesce(person_id, uid) where id = i.application_id; end if;
  update public.st_profiles set active_role = i.roles[1] where id = uid;
  perform public.st_notify(null, 'commander', 'invite.accepted', 'Undangan diterima', i.email || ' · ' || array_to_string(i.roles, ', '), '/command/people');
  return i.roles;
end $$;

create or replace function public.st_set_grant(p_person uuid, p_role text, p_status text, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  if p_role = 'commander' and p_person <> auth.uid() then raise exception 'Peran Commander tidak diberikan dari dashboard.'; end if;
  if p_role = 'company_partner' and p_status = 'active' then raise exception 'Peran perusahaan hanya lewat verifikasi perusahaan.'; end if;
  if p_status = 'active' then
    if exists (select 1 from public.st_role_grants where person_id = p_person and role = p_role and status = 'active') then return; end if;
    if p_role = 'ranger' and not exists (select 1 from public.st_role_grants where person_id = p_person and role = 'learner' and status = 'active')
       and not exists (select 1 from public.st_ranger_status where person_id = p_person and origin = 'legacy_import') then
      raise exception 'Ranger baru wajib berasal dari EDU Learner (atau tercatat legacy import).';
    end if;
    update public.st_role_grants set status = 'active', note = p_note where person_id = p_person and role = p_role and status = 'suspended';
    if not found then insert into public.st_role_grants (person_id, role, granted_by, note) values (p_person, p_role, auth.uid(), p_note); end if;
    if p_role = 'ranger' then
      perform public.st_ranger_activated(p_person, coalesce((select origin from public.st_ranger_status where person_id = p_person), 'edu_pipeline'));
    end if;
  else
    update public.st_role_grants set status = p_status, note = p_note where person_id = p_person and role = p_role and status <> 'revoked';
    update public.st_profiles set active_role = null where id = p_person and active_role = p_role;
  end if;
  perform public.st_notify(p_person, null, 'role.' || p_status, case p_status when 'active' then 'Peran baru aktif: ' when 'suspended' then 'Peran ditangguhkan: ' else 'Peran dicabut: ' end || p_role, p_note, '/workspace');
end $$;

create or replace function public.st_ranger_request_deactivation(p_reason text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.st_acting('ranger') then raise exception 'Hanya Ranger aktif.' using errcode = '42501'; end if;
  if length(trim(coalesce(p_reason, ''))) < 15 then raise exception 'Jelaskan alasan (min. 15 karakter).'; end if;
  insert into public.st_ranger_status (person_id, origin, status, request_reason, requested_at) values (auth.uid(), 'legacy_import', 'DEACTIVATION_REQUESTED', trim(p_reason), now())
  on conflict (person_id) do update set status = 'DEACTIVATION_REQUESTED', request_reason = excluded.request_reason, requested_at = now();
  perform public.st_notify(null, 'commander', 'ranger.deactivation_requested', 'Permintaan nonaktif Ranger', left(p_reason, 120), '/command/people');
end $$;

/** RAN-014/015: clearance Commander. Misi terbuka memblokir; persetujuan mencabut peran Ranger, opt-in talent tetap terpisah. */
create or replace function public.st_ranger_decide_deactivation(p_person uuid, p_approve boolean, p_note text) returns void language plpgsql security definer set search_path = '' as $$
declare v_open int;
begin
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  if length(trim(coalesce(p_note, ''))) < 15 then raise exception 'Catat hasil pemeriksaan clearance (misi, pembayaran, aset, NDA) — min. 15 karakter.'; end if;
  if p_approve then
    select count(*) into v_open from public.st_assignments a join public.st_missions m on m.id = a.mission_id
     where a.ranger_id = p_person and m.status not in ('paid','closed','withdrawn','cancelled');
    if v_open > 0 then raise exception 'Masih ada % misi terbuka/belum lunas — selesaikan serah-terima dulu.', v_open; end if;
    if exists (select 1 from public.st_payables where beneficiary_id = p_person and status in ('pending_approval','approved','partially_paid')) then
      raise exception 'Masih ada payable yang belum tuntas.'; end if;
    update public.st_role_grants set status = 'revoked', note = 'Deaktivasi disetujui: ' || left(p_note, 200) where person_id = p_person and role = 'ranger' and status <> 'revoked';
    update public.st_profiles set active_role = null where id = p_person and active_role = 'ranger';
    update public.st_ranger_status set status = 'INACTIVE', clearance_note = trim(p_note), decided_by = auth.uid(), decided_at = now() where person_id = p_person;
  else
    update public.st_ranger_status set status = 'ACTIVE', clearance_note = trim(p_note), decided_by = auth.uid(), decided_at = now() where person_id = p_person;
  end if;
  perform public.st_notify(p_person, null, 'ranger.deactivation_decided', case when p_approve then 'Deaktivasi Ranger disetujui' else 'Deaktivasi Ranger belum disetujui' end, p_note, '/workspace');
end $$;

-- ============ perusahaan ============
create table public.st_companies (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('CMP-' || upper(substr(md5(random()::text), 1, 6))),
  owner_id uuid not null references public.st_profiles(id) on delete cascade,
  legal_name text not null,
  nib text,
  business_domain text,
  business_email text not null,
  pic_name text not null,
  pic_role text not null,
  hiring_needs text not null,
  website text check (website is null or website = '' or website ~ '^https?://'),
  authority_statement boolean not null,
  terms_version text not null,
  status text not null default 'APPLIED' check (status in ('APPLIED','REVIEW','NEED_INFO','REJECTED','VERIFIED','ACTIVE','SUSPENDED')),
  grants text[] not null default '{}',
  review_note text,
  verified_by uuid,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index st_companies_owner_open on public.st_companies (owner_id) where status not in ('REJECTED');
alter table public.st_companies enable row level security;
revoke all on public.st_companies from anon;
revoke insert, update, delete on public.st_companies from authenticated;
create policy "perusahaan: pemilik / commander" on public.st_companies for select to authenticated
  using (owner_id = (select auth.uid()) or (select public.st_is_commander()));
create trigger t_st_cmp before update on public.st_companies for each row execute function public.touch_updated_at();
create trigger a_st_cmp after insert or update on public.st_companies for each row execute function public.st_audit_trg();

/** Perusahaan aktif milik pemanggil — hanya saat bertindak sebagai company_partner dan sudah diverifikasi. */
create or replace function public.st_my_company(p_grant text) returns uuid language sql stable security definer set search_path = '' as $$
  select c.id from public.st_companies c
  where c.owner_id = auth.uid() and c.status in ('VERIFIED','ACTIVE') and public.st_acting('company_partner')
    and (p_grant is null or p_grant = any(c.grants)) limit 1
$$;

create or replace function public.st_company_apply(p jsonb) returns text language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_ref text; v_ex record;
begin
  if uid is null then raise exception 'Belum masuk.' using errcode = '42501'; end if;
  if public.st_ranger_active(uid) then raise exception 'Akun Ranger aktif tidak dapat mendaftarkan perusahaan hiring.' using errcode = '42501'; end if;
  if length(trim(coalesce(p ->> 'legal_name', ''))) < 3 then raise exception 'Isi nama legal perusahaan.'; end if;
  if coalesce(p ->> 'business_email', '') !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then raise exception 'Email bisnis tidak valid.'; end if;
  if length(trim(coalesce(p ->> 'pic_name', ''))) < 3 or length(trim(coalesce(p ->> 'pic_role', ''))) < 2 then raise exception 'Isi nama dan jabatan PIC.'; end if;
  if length(trim(coalesce(p ->> 'hiring_needs', ''))) < 30 then raise exception 'Jelaskan kebutuhan rekrutmen (min. 30 karakter).'; end if;
  if coalesce((p ->> 'authority_statement')::boolean, false) is not true then raise exception 'Pernyataan kewenangan wajib dicentang.'; end if;
  insert into public.st_profiles (id, email, display_name) values (uid, auth.jwt() ->> 'email', split_part(auth.jwt() ->> 'email', '@', 1)) on conflict (id) do nothing;
  select * into v_ex from public.st_companies where owner_id = uid and status not in ('REJECTED') for update;
  if found then
    if v_ex.status not in ('APPLIED','NEED_INFO') then raise exception 'Pengajuan perusahaan Anda sudah diproses (status %).', v_ex.status; end if;
    update public.st_companies set legal_name = trim(p ->> 'legal_name'), nib = nullif(trim(coalesce(p ->> 'nib', '')), ''), business_domain = nullif(trim(coalesce(p ->> 'business_domain', '')), ''),
      business_email = lower(trim(p ->> 'business_email')), pic_name = trim(p ->> 'pic_name'), pic_role = trim(p ->> 'pic_role'), hiring_needs = trim(p ->> 'hiring_needs'),
      website = nullif(trim(coalesce(p ->> 'website', '')), ''), authority_statement = true, terms_version = coalesce(p ->> 'terms_version', 'company-terms-draft-2026-11'), status = 'APPLIED'
    where id = v_ex.id returning ref into v_ref;
  else
    insert into public.st_companies (owner_id, legal_name, nib, business_domain, business_email, pic_name, pic_role, hiring_needs, website, authority_statement, terms_version)
    values (uid, trim(p ->> 'legal_name'), nullif(trim(coalesce(p ->> 'nib', '')), ''), nullif(trim(coalesce(p ->> 'business_domain', '')), ''), lower(trim(p ->> 'business_email')),
      trim(p ->> 'pic_name'), trim(p ->> 'pic_role'), trim(p ->> 'hiring_needs'), nullif(trim(coalesce(p ->> 'website', '')), ''), true, coalesce(p ->> 'terms_version', 'company-terms-draft-2026-11'))
    returning ref into v_ref;
  end if;
  perform public.st_notify(null, 'commander', 'company.applied', 'Perusahaan mengajukan verifikasi', trim(p ->> 'legal_name'), '/command/companies');
  return v_ref;
end $$;

create or replace function public.st_company_decide(p_id uuid, p_status text, p_note text) returns void language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  if p_status not in ('REVIEW','NEED_INFO','REJECTED','VERIFIED','SUSPENDED') then raise exception 'Status tidak dikenal.'; end if;
  if p_status <> 'REVIEW' and length(trim(coalesce(p_note, ''))) < 10 then raise exception 'Tulis catatan keputusan (min. 10 karakter).'; end if;
  select * into c from public.st_companies where id = p_id for update;
  if not found then raise exception 'Perusahaan tidak ditemukan.'; end if;
  if p_status = 'VERIFIED' and public.st_ranger_active(c.owner_id) then raise exception 'PIC ini Ranger aktif — tidak boleh memegang workspace perusahaan.'; end if;
  update public.st_companies set status = p_status, review_note = nullif(trim(coalesce(p_note, '')), ''),
    grants = case when p_status = 'VERIFIED' then array['HIRING_VIEW','HIRING_MANAGE','SERVICES_CATALOG','SERVICES_LEAD'] when p_status in ('SUSPENDED','REJECTED') then '{}' else grants end,
    verified_by = case when p_status = 'VERIFIED' then auth.uid() else verified_by end, verified_at = case when p_status = 'VERIFIED' then now() else verified_at end
  where id = p_id;
  if p_status = 'VERIFIED' then
    update public.st_role_grants set status = 'active' where person_id = c.owner_id and role = 'company_partner' and status = 'suspended';
    if not found and not exists (select 1 from public.st_role_grants where person_id = c.owner_id and role = 'company_partner' and status = 'active') then
      insert into public.st_role_grants (person_id, role, granted_by, note) values (c.owner_id, 'company_partner', auth.uid(), 'Verifikasi perusahaan ' || c.ref);
    end if;
  elsif p_status in ('SUSPENDED','REJECTED') then
    update public.st_role_grants set status = 'suspended', note = p_note where person_id = c.owner_id and role = 'company_partner' and status = 'active';
    update public.st_profiles set active_role = null where id = c.owner_id and active_role = 'company_partner';
  end if;
  perform public.st_notify(c.owner_id, null, 'company.' || lower(p_status),
    case p_status when 'VERIFIED' then 'Perusahaan terverifikasi — Company Workspace aktif' when 'NEED_INFO' then 'Verifikasi perusahaan butuh info tambahan'
      when 'REJECTED' then 'Verifikasi perusahaan ditolak' when 'SUSPENDED' then 'Workspace perusahaan ditangguhkan' else 'Pengajuan perusahaan sedang ditinjau' end,
    p_note, '/company');
end $$;

-- ============ talent opt-in ============
create table public.st_talent_profiles (
  person_id uuid primary key default auth.uid() references public.st_profiles(id) on delete cascade,
  opt_in boolean not null default false,
  alias text,
  headline text,
  skills text[] not null default '{}',
  availability text check (availability is null or availability in ('now','1month','3months','not_now')),
  work_pref text check (work_pref is null or work_pref in ('remote','hybrid','onsite','any')),
  portfolio_url text check (portfolio_url is null or portfolio_url = '' or portfolio_url ~ '^https://'),
  show_star boolean not null default false,
  show_assessments boolean not null default false,
  consent_version text,
  opted_in_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.st_talent_profiles enable row level security;
revoke all on public.st_talent_profiles from anon;
create policy "talent: sendiri" on public.st_talent_profiles for all to authenticated
  using (person_id = (select auth.uid())) with check (person_id = (select auth.uid()));
create policy "talent: commander baca" on public.st_talent_profiles for select to authenticated using ((select public.st_is_commander()));

create table public.st_talent_blocks (
  person_id uuid not null references public.st_profiles(id) on delete cascade,
  company_id uuid not null references public.st_companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (person_id, company_id)
);
alter table public.st_talent_blocks enable row level security;
revoke all on public.st_talent_blocks from anon;
revoke insert, update, delete on public.st_talent_blocks from authenticated;
create policy "blok: sendiri" on public.st_talent_blocks for select to authenticated using (person_id = (select auth.uid()));

/** Opt-in eksplisit + consent tercatat; Ranger aktif tidak bisa opt-in; cabut → undangan baru terblokir. */
create or replace function public.st_talent_guard() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.opt_in and (tg_op = 'INSERT' or not old.opt_in) then
    if not public.st_has_role('learner') then raise exception 'Opt-in talent hanya untuk EDU Learner.'; end if;
    if public.st_ranger_active(new.person_id) then raise exception 'Ranger aktif tidak dapat tampil ke perusahaan. Ajukan deaktivasi ke Commander bila ingin melamar kerja.'; end if;
    if length(trim(coalesce(new.alias, ''))) < 2 or cardinality(new.skills) = 0 then raise exception 'Isi nama tampilan dan minimal satu keahlian sebelum opt-in.'; end if;
    new.opted_in_at := now();
    insert into public.st_consents (person_id, purpose, version, choice) values (new.person_id, 'talent_opt_in', coalesce(new.consent_version, 'talent-consent-draft-2026-11'), true);
  elsif tg_op = 'UPDATE' and old.opt_in and not new.opt_in then
    insert into public.st_consents (person_id, purpose, version, choice) values (new.person_id, 'talent_opt_in', coalesce(new.consent_version, 'talent-consent-draft-2026-11'), false);
    update public.st_hiring_invites set status = 'WITHDRAWN', decided_at = now() where candidate_id = new.person_id and status = 'SENT';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger g_st_talent before insert or update on public.st_talent_profiles for each row execute function public.st_talent_guard();

create or replace function public.st_star_total(p uuid) returns int language sql stable security definer set search_path = '' as $$
  select coalesce(sum(units), 0)::int from public.st_star_events where person_id = p
$$;
create or replace function public.st_star_label(n int) returns text language sql immutable set search_path = '' as $$
  select case when n >= 700 then 'Star V' when n >= 450 then 'Star IV' when n >= 250 then 'Star III' when n >= 100 then 'Star II' else 'Star I' end
$$;

/** COM-003..007: hanya learner opt-in, BUKAN Ranger aktif, tidak memblokir perusahaan ini; tanpa email/telepon. */
create or replace function public.st_company_talent_search(p_q text, p_skill text) returns table (candidate_id uuid, alias text, headline text, skills text[],
  availability text, work_pref text, portfolio_url text, star_label text, assessments_passed int, invited text)
language plpgsql stable security definer set search_path = '' as $$
declare v_cmp uuid := public.st_my_company('HIRING_VIEW');
begin
  if v_cmp is null then raise exception 'Hanya perusahaan terverifikasi dengan akses hiring.' using errcode = '42501'; end if;
  return query
  select t.person_id, t.alias, t.headline, t.skills, t.availability, t.work_pref, nullif(t.portfolio_url, ''),
    case when t.show_star then public.st_star_label(public.st_star_total(t.person_id)) end,
    case when t.show_assessments then (select count(*)::int from public.st_assessment_attempts a join public.st_assessments s on s.id = a.assessment_id
                                        where a.person_id = t.person_id and a.status in ('SCORED','REVIEWED') and a.score >= s.pass_score) end,
    (select h.status from public.st_hiring_invites h where h.company_id = v_cmp and h.candidate_id = t.person_id order by h.created_at desc limit 1)
  from public.st_talent_profiles t
  where t.opt_in
    and exists (select 1 from public.st_role_grants g where g.person_id = t.person_id and g.role = 'learner' and g.status = 'active')
    and not public.st_ranger_active(t.person_id)
    and not exists (select 1 from public.st_talent_blocks b where b.person_id = t.person_id and b.company_id = v_cmp)
    and (coalesce(p_q, '') = '' or t.alias ilike '%' || p_q || '%' or t.headline ilike '%' || p_q || '%')
    and (coalesce(p_skill, '') = '' or exists (select 1 from unnest(t.skills) s where s ilike '%' || p_skill || '%'))
  order by t.opted_in_at desc
  limit 50;
end $$;

-- ============ undangan hiring & thread ============
create table public.st_hiring_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.st_companies(id) on delete cascade,
  candidate_id uuid not null references public.st_profiles(id) on delete cascade,
  vacancy_title text not null,
  message text not null,
  status text not null default 'SENT' check (status in ('SENT','ACCEPTED','DECLINED','BLOCKED','WITHDRAWN','CLOSED')),
  stage text check (stage is null or stage in ('SHORTLISTED','INTERVIEW','OFFER','HIRED','CLOSED')),
  interview_at timestamptz,
  interview_url text check (interview_url is null or interview_url ~ '^https://'),
  created_by uuid not null default auth.uid(),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index st_hiring_open on public.st_hiring_invites (company_id, candidate_id) where status in ('SENT','ACCEPTED');
alter table public.st_hiring_invites enable row level security;
revoke all on public.st_hiring_invites from anon;
revoke insert, update, delete on public.st_hiring_invites from authenticated;
create trigger t_st_hire before update on public.st_hiring_invites for each row execute function public.touch_updated_at();
create trigger a_st_hire after insert or update on public.st_hiring_invites for each row execute function public.st_audit_trg();

create or replace function public.st_hiring_party(p_invite uuid) returns text language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.st_hiring_invites h join public.st_companies c on c.id = h.company_id
                 where h.id = p_invite and c.owner_id = auth.uid() and c.status in ('VERIFIED','ACTIVE') and public.st_acting('company_partner')) then 'company'
    when exists (select 1 from public.st_hiring_invites h where h.id = p_invite and h.candidate_id = auth.uid()) then 'candidate'
  end
$$;

create policy "hiring: pihak / commander" on public.st_hiring_invites for select to authenticated
  using ((select public.st_hiring_party(id)) is not null or (select public.st_is_commander()));

/** Catatan HR privat — tidak pernah terlihat kandidat. */
create table public.st_hiring_notes (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.st_hiring_invites(id) on delete cascade,
  body text not null check (length(body) between 1 and 2000),
  author_id uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.st_hiring_notes enable row level security;
revoke all on public.st_hiring_notes from anon;
create policy "catatan hr: perusahaan" on public.st_hiring_notes for all to authenticated
  using ((select public.st_hiring_party(invite_id)) = 'company') with check ((select public.st_hiring_party(invite_id)) = 'company' and author_id = (select auth.uid()));

create or replace function public.st_hiring_invite(p_candidate uuid, p_title text, p_message text) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_cmp uuid := public.st_my_company('HIRING_MANAGE'); v_n int; v_id uuid; v_name text;
begin
  if v_cmp is null then raise exception 'Hanya perusahaan terverifikasi dengan akses hiring.' using errcode = '42501'; end if;
  if length(trim(coalesce(p_title, ''))) < 3 or length(trim(coalesce(p_message, ''))) < 30 then raise exception 'Isi posisi dan pesan undangan (min. 30 karakter).'; end if;
  if not exists (select 1 from public.st_talent_profiles t where t.person_id = p_candidate and t.opt_in)
     or not exists (select 1 from public.st_role_grants g where g.person_id = p_candidate and g.role = 'learner' and g.status = 'active')
     or public.st_ranger_active(p_candidate)
     or exists (select 1 from public.st_talent_blocks b where b.person_id = p_candidate and b.company_id = v_cmp) then
    raise exception 'Kandidat tidak tersedia.' using errcode = '42501';
  end if;
  select count(*) into v_n from public.st_hiring_invites where company_id = v_cmp and created_at > now() - interval '1 day';
  if v_n >= 20 then raise exception 'Batas 20 undangan per hari tercapai.'; end if;
  insert into public.st_hiring_invites (company_id, candidate_id, vacancy_title, message) values (v_cmp, p_candidate, trim(p_title), trim(p_message)) returning id into v_id;
  select legal_name into v_name from public.st_companies where id = v_cmp;
  perform public.st_notify(p_candidate, null, 'hiring.invited', 'Undangan rekrutmen dari ' || v_name, trim(p_title), '/learn/career');
  return v_id;
exception when unique_violation then raise exception 'Kandidat ini sudah punya undangan aktif dari perusahaan Anda.';
end $$;

create or replace function public.st_hiring_respond(p_invite uuid, p_decision text) returns void language plpgsql security definer set search_path = '' as $$
declare h record;
begin
  select * into h from public.st_hiring_invites where id = p_invite for update;
  if not found or h.candidate_id <> auth.uid() then raise exception 'Tidak berhak.' using errcode = '42501'; end if;
  if p_decision not in ('ACCEPTED','DECLINED','BLOCKED','WITHDRAWN') then raise exception 'Keputusan tidak dikenal.'; end if;
  if p_decision = 'ACCEPTED' and (h.status <> 'SENT' or public.st_ranger_active(auth.uid())) then raise exception 'Undangan ini tidak bisa diterima.'; end if;
  if p_decision in ('DECLINED','BLOCKED') and h.status not in ('SENT','ACCEPTED') then raise exception 'Undangan sudah ditutup.'; end if;
  update public.st_hiring_invites set status = p_decision, stage = case when p_decision = 'ACCEPTED' then 'SHORTLISTED' else stage end, decided_at = now() where id = h.id;
  if p_decision = 'BLOCKED' then insert into public.st_talent_blocks (person_id, company_id) values (auth.uid(), h.company_id) on conflict do nothing; end if;
  perform public.st_notify((select owner_id from public.st_companies where id = h.company_id), null, 'hiring.' || lower(p_decision),
    case p_decision when 'ACCEPTED' then 'Kandidat menerima undangan' when 'WITHDRAWN' then 'Kandidat menarik diri' else 'Kandidat tidak melanjutkan' end, h.vacancy_title, '/company/pipeline');
end $$;

create or replace function public.st_hiring_update(p_invite uuid, p_stage text, p_interview_at timestamptz, p_interview_url text) returns void language plpgsql security definer set search_path = '' as $$
declare h record;
begin
  select * into h from public.st_hiring_invites where id = p_invite for update;
  if public.st_hiring_party(p_invite) is distinct from 'company' then raise exception 'Tidak berhak.' using errcode = '42501'; end if;
  if h.status <> 'ACCEPTED' then raise exception 'Tahap hanya bisa diubah setelah kandidat menerima undangan.'; end if;
  if p_stage not in ('SHORTLISTED','INTERVIEW','OFFER','HIRED','CLOSED') then raise exception 'Tahap tidak dikenal.'; end if;
  update public.st_hiring_invites set stage = p_stage, interview_at = p_interview_at, interview_url = nullif(trim(coalesce(p_interview_url, '')), ''),
    status = case when p_stage = 'CLOSED' then 'CLOSED' else status end where id = h.id;
  perform public.st_notify(h.candidate_id, null, 'hiring.stage', 'Perkembangan rekrutmen: ' || p_stage, h.vacancy_title, '/learn/career');
end $$;

/** Kontak kandidat hanya untuk perusahaan pihak undangan yang SUDAH diterima (COM-011/012). */
create or replace function public.st_hiring_contact(p_invite uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare h record;
begin
  select * into h from public.st_hiring_invites where id = p_invite;
  if public.st_hiring_party(p_invite) is distinct from 'company' or h.status <> 'ACCEPTED' then raise exception 'Kontak hanya terbuka setelah kandidat menerima undangan.' using errcode = '42501'; end if;
  return (select jsonb_build_object('name', p.display_name, 'email', p.email) from public.st_profiles p where p.id = h.candidate_id);
end $$;

/** Ringkasan undangan untuk kedua pihak tanpa membuka tabel profil/perusahaan. */
create or replace function public.st_hiring_list() returns table (id uuid, side text, company text, candidate_alias text, vacancy_title text, message text, status text,
  stage text, interview_at timestamptz, interview_url text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select h.id, public.st_hiring_party(h.id), c.legal_name, t.alias, h.vacancy_title, h.message, h.status, h.stage, h.interview_at,
    case when h.status = 'ACCEPTED' then h.interview_url end, h.created_at
  from public.st_hiring_invites h join public.st_companies c on c.id = h.company_id left join public.st_talent_profiles t on t.person_id = h.candidate_id
  where public.st_hiring_party(h.id) is not null
  order by h.created_at desc
$$;

alter table public.st_messages drop constraint if exists st_messages_thread_type_check;
alter table public.st_messages add constraint st_messages_thread_type_check check (thread_type in ('mission','workspace','hiring'));
create policy "pesan hiring: baca" on public.st_messages for select to authenticated
  using (thread_type = 'hiring' and (select public.st_hiring_party(thread_id)) is not null);
create policy "pesan hiring: kirim" on public.st_messages for insert to authenticated with check (
  thread_type = 'hiring' and ranger_id is null and author_id = (select auth.uid()) and (select public.st_hiring_party(thread_id)) is not null
  and exists (select 1 from public.st_hiring_invites h where h.id = thread_id and h.status = 'ACCEPTED'));

create or replace function public.st_message_before() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select p.display_name, p.active_role into new.author_name, new.acting_as from public.st_profiles p where p.id = auth.uid();
  if new.thread_type = 'workspace' then
    select o.name into new.author_name from public.st_workspaces w join public.st_requests r on r.id = w.request_id
      join public.st_orgs o on o.id in (r.from_org, r.to_org) and o.owner_id = auth.uid() where w.id = new.thread_id limit 1;
  elsif new.thread_type = 'hiring' then
    if public.st_hiring_party(new.thread_id) = 'company' then
      select c.legal_name into new.author_name from public.st_hiring_invites h join public.st_companies c on c.id = h.company_id where h.id = new.thread_id;
    else
      select coalesce(t.alias, 'Kandidat') into new.author_name from public.st_talent_profiles t where t.person_id = auth.uid();
    end if;
  end if;
  return new;
end $$;

-- ============ Services lead dari perusahaan (COM-015: lead, bukan mission) ============
alter table public.st_leads drop constraint if exists st_leads_source_check;
alter table public.st_leads add constraint st_leads_source_check check (source in ('services','manual','company'));
alter table public.st_leads add column if not exists company_id uuid references public.st_companies(id) on delete set null;

create or replace function public.st_company_lead(p_summary text, p_budget text, p_timeline text) returns text language plpgsql security definer set search_path = '' as $$
declare v_cmp uuid := public.st_my_company('SERVICES_LEAD'); c record; v_ref text;
begin
  if v_cmp is null then raise exception 'Hanya perusahaan terverifikasi.' using errcode = '42501'; end if;
  if length(trim(coalesce(p_summary, ''))) < 40 then raise exception 'Jelaskan kebutuhan proyek (min. 40 karakter).'; end if;
  select * into c from public.st_companies where id = v_cmp;
  insert into public.st_leads (source, source_ref, name, contact, company, summary, payload, company_id)
  values ('company', null, c.pic_name, c.business_email, c.legal_name, left(trim(p_summary), 300),
    jsonb_build_object('summary', trim(p_summary), 'budget', nullif(trim(coalesce(p_budget, '')), ''), 'timeline', nullif(trim(coalesce(p_timeline, '')), ''), 'company_ref', c.ref), v_cmp)
  returning ref into v_ref;
  perform public.st_notify(null, 'commander', 'services.lead', 'Brief Services dari perusahaan', c.legal_name, '/command/leads');
  return v_ref;
end $$;

create or replace function public.st_company_leads() returns table (ref text, summary text, status text, created_at timestamptz) language sql stable security definer set search_path = '' as $$
  select l.ref, l.summary, case l.status when 'converted' then 'won' else l.status end, l.created_at from public.st_leads l
  where l.company_id = public.st_my_company(null) order by l.created_at desc
$$;

-- ============ bukti transfer (RAN-011..013) ============
alter table public.st_payments add column if not exists method text, add column if not exists proof_path text,
  add column if not exists proof_sha256 text, add column if not exists verified_by uuid;

drop function if exists public.st_record_payment(uuid, numeric, text, date);
create or replace function public.st_record_payment(p_payable uuid, p_amount numeric, p_reference text, p_paid_at date,
  p_method text default null, p_proof_path text default null, p_proof_sha256 text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare p record; v_total numeric; v_status text;
begin
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  select * into p from public.st_payables where id = p_payable for update;
  if p.status not in ('approved','partially_paid') then raise exception 'Payable harus disetujui dulu.'; end if;
  if length(trim(coalesce(p_reference, ''))) < 4 then raise exception 'Isi referensi/bukti transfer.'; end if;
  if p_proof_path is not null and p_proof_path not like 'payments/' || p_payable || '/%' then raise exception 'Lokasi bukti transfer tidak sah.'; end if;
  select coalesce(sum(amount), 0) into v_total from public.st_payments where payable_id = p_payable;
  if p_amount <= 0 or v_total + p_amount > p.amount then raise exception 'Nominal melebihi sisa payable (sisa %).', p.amount - v_total; end if;
  insert into public.st_payments (payable_id, amount, reference, paid_at, recorded_by, method, proof_path, proof_sha256, verified_by)
  values (p_payable, p_amount, p_reference, coalesce(p_paid_at, current_date), auth.uid(), nullif(trim(coalesce(p_method, '')), ''), p_proof_path, p_proof_sha256, auth.uid());
  v_status := case when v_total + p_amount >= p.amount then 'paid' else 'partially_paid' end;
  update public.st_payables set status = v_status where id = p_payable;
  if v_status = 'paid' and p.source_type = 'mission' then update public.st_missions set status = 'paid' where id = p.source_id; end if;
  perform public.st_notify(p.beneficiary_id, null, 'payout.status', case when v_status = 'paid' then 'Pembayaran tercatat lunas' else 'Pembayaran sebagian tercatat' end, p.label,
    case when p.source_type = 'program' then '/creator/earnings' else '/missions/earnings' end);
  return v_status;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('st-proofs', 'st-proofs', false, 5242880, array['image/png','image/jpeg','image/webp','application/pdf']) on conflict (id) do nothing;
create policy "st-proofs: commander kelola" on storage.objects for all to authenticated
  using (bucket_id = 'st-proofs' and (select public.st_is_commander())) with check (bucket_id = 'st-proofs' and (select public.st_is_commander()));
create policy "st-proofs: penerima baca" on storage.objects for select to authenticated using (
  bucket_id = 'st-proofs' and (storage.foldername(name))[1] = 'payments'
  and exists (select 1 from public.st_payables p where p.id::text = (storage.foldername(name))[2] and p.beneficiary_id = (select auth.uid())));

-- ============ grants ============
revoke execute on function public.st_ranger_activated(uuid, text), public.st_talent_guard(), public.st_star_label(int), public.st_ranger_active(uuid), public.st_star_total(uuid) from public, anon, authenticated;
revoke execute on function public.st_create_invite(text, text[], uuid, int, boolean), public.st_accept_invite(text), public.st_set_grant(uuid, text, text, text),
  public.st_ranger_request_deactivation(text), public.st_ranger_decide_deactivation(uuid, boolean, text), public.st_my_company(text), public.st_company_apply(jsonb),
  public.st_company_decide(uuid, text, text), public.st_company_talent_search(text, text), public.st_hiring_party(uuid),
  public.st_hiring_invite(uuid, text, text), public.st_hiring_respond(uuid, text), public.st_hiring_update(uuid, text, timestamptz, text), public.st_hiring_contact(uuid),
  public.st_hiring_list(), public.st_company_lead(text, text, text), public.st_company_leads(),
  public.st_record_payment(uuid, numeric, text, date, text, text, text) from public, anon;
grant execute on function public.st_create_invite(text, text[], uuid, int, boolean), public.st_accept_invite(text), public.st_set_grant(uuid, text, text, text),
  public.st_ranger_request_deactivation(text), public.st_ranger_decide_deactivation(uuid, boolean, text), public.st_my_company(text), public.st_company_apply(jsonb),
  public.st_company_decide(uuid, text, text), public.st_company_talent_search(text, text), public.st_hiring_party(uuid),
  public.st_hiring_invite(uuid, text, text), public.st_hiring_respond(uuid, text), public.st_hiring_update(uuid, text, timestamptz, text), public.st_hiring_contact(uuid),
  public.st_hiring_list(), public.st_company_lead(text, text, text), public.st_company_leads(),
  public.st_record_payment(uuid, numeric, text, date, text, text, text) to authenticated;
