-- VIBOXS Studio (studio.viboxs.com) — skema MVP sesuai PRD v1.0 (20 Nov 2026).
-- Diterapkan ke project Supabase "viboxs" lewat MCP; file ini catatan skema.
--
-- Invariant yang dijaga DATABASE (bukan sekadar UI):
--  * Akses profesional hanya dari undangan Commander (st_accept_invite). Self-register hanya Learner.
--  * Firewall Missions ↔ Connect: harga klien/margin di st_mission_private (Commander saja);
--    Connect hanya untuk konteks bisnis aktif (st_business_ctx) — role Ranger tidak pernah lolos.
--  * Konteks peran aktif disimpan di server (st_profiles.active_role, diganti lewat st_switch_role).
--  * Status uang: agreed → payable (pending_approval) → approved → paid hanya dari catatan pembayaran.
--  * Program EDU dari kontributor tidak pernah auto-publish; Studio menulis draft ke edu_programs
--    dengan published=false, status "published" baru tercatat saat EDU benar-benar menayangkan.

-- ============ helper ============
create table public.st_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  email text,
  headline text,
  skills text[] not null default '{}',
  active_role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.st_role_grants (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.st_profiles(id) on delete cascade,
  role text not null check (role in ('commander','operator','ranger','trainer','learner','opc_founder','business_partner','collaborator')),
  status text not null default 'active' check (status in ('active','suspended','revoked')),
  invite_id uuid,
  granted_by uuid,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index st_role_grants_active on public.st_role_grants (person_id, role) where status = 'active';

create or replace function public.st_is_commander() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
    or exists (select 1 from public.st_role_grants g where g.person_id = auth.uid() and g.role = 'commander' and g.status = 'active')
$$;

create or replace function public.st_has_role(r text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.st_role_grants g where g.person_id = auth.uid() and g.role = r and g.status = 'active')
$$;

/** Peran aktif sah: punya grant aktif DAN sedang bertindak sebagai peran itu (context switch server-side). */
create or replace function public.st_acting(r text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.st_profiles p join public.st_role_grants g on g.person_id = p.id and g.role = p.active_role and g.status = 'active'
    where p.id = auth.uid() and p.active_role = r)
$$;

/** Konteks bisnis Connect. Ranger, Learner, dan Trainer tanpa org tidak pernah lolos. */
create or replace function public.st_business_ctx() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.st_is_commander() or exists (
    select 1 from public.st_profiles p join public.st_role_grants g on g.person_id = p.id and g.role = p.active_role and g.status = 'active'
    where p.id = auth.uid() and p.active_role in ('opc_founder','business_partner','collaborator','trainer'))
$$;

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

-- ============ notifikasi & audit ============
create table public.st_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.st_profiles(id) on delete cascade,
  audience text check (audience in ('commander')),
  kind text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (recipient_id is not null or audience is not null)
);
create index st_notifications_rcpt on public.st_notifications (recipient_id, created_at desc);
create index st_notifications_aud on public.st_notifications (audience, created_at desc);

create or replace function public.st_notify(p_recipient uuid, p_audience text, p_kind text, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = '' as $$
  insert into public.st_notifications (recipient_id, audience, kind, title, body, link) values (p_recipient, p_audience, p_kind, p_title, p_body, p_link)
$$;
revoke execute on function public.st_notify(uuid, text, text, text, text, text) from public, anon, authenticated;

create table public.st_audit (
  id bigint generated always as identity primary key,
  actor_id uuid,
  acting_as text,
  action text not null,
  entity text not null,
  entity_id text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index st_audit_created on public.st_audit (created_at desc);

/** Audit generik: siapa (dan sebagai peran apa) mengubah status/record penting. Tanpa PII payload. */
create or replace function public.st_audit_trg() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_old text; v_new text; v_id text;
begin
  v_id := coalesce(to_jsonb(new) ->> 'id', to_jsonb(new) ->> 'key', to_jsonb(new) ->> 'mission_id', to_jsonb(old) ->> 'id');
  v_old := case when tg_op = 'UPDATE' then coalesce(to_jsonb(old) ->> 'status', to_jsonb(old) ->> 'enabled', to_jsonb(old) ->> 'agreement_state') end;
  v_new := coalesce(to_jsonb(new) ->> 'status', to_jsonb(new) ->> 'enabled', to_jsonb(new) ->> 'agreement_state');
  if tg_op = 'UPDATE' and v_old is not distinct from v_new and tg_table_name not in ('st_mission_private','st_orgs','st_assignments') then return new; end if;
  insert into public.st_audit (actor_id, acting_as, action, entity, entity_id, detail)
  values (auth.uid(), (select p.active_role from public.st_profiles p where p.id = auth.uid()), lower(tg_op), tg_table_name, v_id,
          jsonb_strip_nulls(jsonb_build_object('from', v_old, 'to', v_new)));
  return new;
end $$;

-- ============ rekrutmen & akses ============
create table public.st_applications (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('APL-' || upper(substr(md5(random()::text), 1, 6))),
  type text not null check (type in ('ranger','trainer','opc_founder','business_partner','collaborator')),
  source text not null default 'studio' check (source in ('studio','edu','services','corporate','universe','manual')),
  source_ref text,
  person_id uuid references public.st_profiles(id) on delete set null,
  name text, email text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'submitted' check (status in ('submitted','in_review','need_info','approved','declined','invited','active')),
  reviewer_note text,
  decided_by uuid, decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index st_applications_src on public.st_applications (source, source_ref) where source_ref is not null;

create table public.st_invites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  email text not null,
  roles text[] not null,
  application_id uuid references public.st_applications(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  expires_at timestamptz not null,
  created_by uuid,
  accepted_by uuid, accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.st_consents (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.st_profiles(id) on delete cascade,
  purpose text not null,
  version text not null,
  choice boolean not null,
  created_at timestamptz not null default now()
);

create table public.st_flags (
  key text primary key,
  label text not null,
  description text,
  enabled boolean not null default false,
  locked boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

-- ============ Services lead ============
create table public.st_leads (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('LED-' || upper(substr(md5(random()::text), 1, 6))),
  source text not null check (source in ('services','manual')),
  source_ref text,
  name text, contact text, company text, summary text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new','contacted','negotiating','won','lost','converted')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index st_leads_src on public.st_leads (source, source_ref) where source_ref is not null;

-- ============ Missions ============
create table public.st_missions (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('MSN-' || upper(substr(md5(random()::text), 1, 6))),
  title text not null,
  category text not null default 'web' check (category in ('web','system','ai','design','video','content','ads','other')),
  brief text not null default '',
  deliverables text not null default '',
  acceptance text not null default '',
  skill_tags text[] not null default '{}',
  due_at timestamptz,
  offer_close_at timestamptz,
  fee_type text not null default 'fixed' check (fee_type in ('fixed','milestone','negotiable')),
  negotiation_allowed boolean not null default true,
  revisions_included int,
  status text not null default 'draft' check (status in ('draft','offered','bidding','negotiation','assigned_pending_agreement','in_progress','on_hold','submitted','review','revision_requested','accepted','payable_pending_approval','payable_approved','paid','closed','withdrawn','cancelled','disputed')),
  status_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

/** Data komersial klien — HANYA Commander. Tidak pernah ikut payload Ranger. */
create table public.st_mission_private (
  mission_id uuid primary key references public.st_missions(id) on delete cascade,
  lead_id uuid references public.st_leads(id) on delete set null,
  client_quote numeric(14,2),
  cost_ceiling numeric(14,2),
  internal_notes text,
  updated_at timestamptz not null default now()
);

create table public.st_mission_targets (
  mission_id uuid not null references public.st_missions(id) on delete cascade,
  ranger_id uuid not null references public.st_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (mission_id, ranger_id)
);

create table public.st_bids (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.st_missions(id) on delete cascade,
  ranger_id uuid not null references public.st_profiles(id) on delete cascade,
  kind text not null check (kind in ('bid','counter','accept_counter','decline','withdraw')),
  amount numeric(14,2) check (amount is null or amount >= 0),
  duration_days int check (duration_days is null or duration_days > 0),
  note text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create index st_bids_mission on public.st_bids (mission_id, ranger_id, created_at);

create table public.st_assignments (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.st_missions(id) on delete cascade,
  ranger_id uuid not null references public.st_profiles(id) on delete cascade,
  agreed_fee numeric(14,2) not null check (agreed_fee >= 0),
  payout_schedule text not null default 'on_acceptance' check (payout_schedule in ('on_acceptance','milestone','monthly_accumulated','custom_terms')),
  agreement_terms text not null default '',
  agreement_version int not null default 1,
  agreement_state text not null default 'pending' check (agreement_state in ('pending','executed')),
  accepted_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (mission_id, ranger_id)
);

create table public.st_deliverables (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.st_missions(id) on delete cascade,
  ranger_id uuid not null references public.st_profiles(id) on delete cascade,
  version int not null default 1,
  url text not null check (url ~ '^https://'),
  note text,
  status text not null default 'submitted' check (status in ('submitted','revision_requested','accepted','rejected')),
  review_note text,
  reviewed_by uuid, reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (mission_id, ranger_id, version)
);

create table public.st_payables (
  id uuid primary key default gen_random_uuid(),
  beneficiary_id uuid not null references public.st_profiles(id) on delete restrict,
  source_type text not null check (source_type in ('mission','program','adjustment')),
  source_id uuid,
  label text not null,
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'IDR',
  schedule text,
  status text not null default 'pending_approval' check (status in ('pending_approval','approved','rejected','partially_paid','paid')),
  note text,
  approved_by uuid, approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index st_payables_src on public.st_payables (source_type, source_id, beneficiary_id) where source_type <> 'adjustment';

create table public.st_payments (
  id uuid primary key default gen_random_uuid(),
  payable_id uuid not null references public.st_payables(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  reference text not null,
  paid_at date not null,
  recorded_by uuid,
  created_at timestamptz not null default now()
);

create table public.st_messages (
  id uuid primary key default gen_random_uuid(),
  thread_type text not null check (thread_type in ('mission','workspace')),
  thread_id uuid not null,
  ranger_id uuid,             -- thread mission bersifat pribadi per Ranger
  author_id uuid not null default auth.uid(),
  author_name text,
  acting_as text,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index st_messages_thread on public.st_messages (thread_type, thread_id, created_at);

-- ============ EDU contributor & learner ============
create table public.st_program_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.st_profiles(id) on delete cascade,
  title text not null,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  type text not null default 'webinar' check (type in ('ebook','webinar','workshop','ecourse')),
  path text not null default 'ai' check (path in ('ai','biz','career')),
  pricing text not null default 'free' check (pricing in ('free','paid','invitation','sponsored')),
  summary text not null default '',
  for_who text not null default '',
  level text not null default '',
  outcomes text[] not null default '{}',
  tags text[] not null default '{}',
  schedule_at timestamptz,
  duration text,
  capacity int check (capacity is null or capacity > 0),
  rights_declared boolean not null default false,
  status text not null default 'draft' check (status in ('draft','submitted','needs_revision','approved','publish_queued','published','archived')),
  review_note text,
  reviewed_by uuid, reviewed_at timestamptz,
  edu_slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.st_learner_profiles (
  person_id uuid primary key default auth.uid() references public.st_profiles(id) on delete cascade,
  goal text, level text, hours text,
  interests text[] not null default '{}',
  formats text[] not null default '{}',
  answers jsonb not null default '{}'::jsonb,
  rules_version text not null default 'rules-v1',
  updated_at timestamptz not null default now()
);

create table public.st_points (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.st_profiles(id) on delete cascade,
  campaign text not null,
  reason text not null,
  points int not null,
  note text,
  created_at timestamptz not null default now(),
  unique (person_id, campaign, reason)
);

-- ============ OPC, showcase, Connect ============
create table public.st_orgs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.st_profiles(id) on delete cascade,
  name text not null,
  kind text not null default 'opc' check (kind in ('opc','partner','collaborator','trainer')),
  sector text not null default '',
  description text not null default '',
  website text check (website is null or website = '' or website ~ '^https?://'),
  location text,
  offers text[] not null default '{}',
  needs text[] not null default '{}',
  visibility text not null default 'private' check (visibility in ('private','network','discoverable')),
  verified_identity boolean not null default false,
  verified_ownership boolean not null default false,
  partner_contracted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.st_products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.st_orgs(id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.st_profiles(id) on delete cascade,
  name text not null,
  tagline text not null default '',
  category text not null default '',
  platform text not null default 'web',
  url text check (url is null or url = '' or url ~ '^https://'),
  status text not null default 'draft' check (status in ('draft','queued','published','unpublished','flagged')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.st_requests (
  id uuid primary key default gen_random_uuid(),
  from_org uuid not null references public.st_orgs(id) on delete cascade,
  to_org uuid not null references public.st_orgs(id) on delete cascade,
  intent text not null check (intent in ('FIND_MARKETING_PARTNER','FIND_TECHNOLOGY_PARTNER','FIND_EDUCATOR','FIND_DISTRIBUTOR','CO_MARKETING','SPONSORSHIP_INQUIRY','BRAND_COLLABORATION','CREATOR_BRAND_FIT','OTHER_B2B')),
  message text not null check (length(message) between 10 and 2000),
  viboxs_involved boolean not null default false,
  status text not null default 'requested' check (status in ('requested','accepted','declined','needs_info','withdrawn','reported')),
  decided_by uuid, decided_at timestamptz,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_org <> to_org)
);

create table public.st_workspaces (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.st_requests(id) on delete cascade,
  title text not null,
  status text not null default 'active' check (status in ('active','proposal_exchanged','agreed','in_progress','completed','cancelled','disputed')),
  approval text check (approval in ('awaiting_commander','approved_viboxs_scope','denied_viboxs_scope')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ helper berbasis data (security definer → tidak rekursif di RLS) ============
create or replace function public.st_owns_org(o uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.st_orgs x where x.id = o and x.owner_id = auth.uid())
$$;
create or replace function public.st_org_linked(o uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.st_requests r join public.st_orgs mine on mine.owner_id = auth.uid() and mine.id in (r.from_org, r.to_org)
                 where o in (r.from_org, r.to_org))
$$;
create or replace function public.st_ws_member(w uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.st_workspaces ws join public.st_requests r on r.id = ws.request_id
                 join public.st_orgs o on o.id in (r.from_org, r.to_org) and o.owner_id = auth.uid() where ws.id = w)
$$;
create or replace function public.st_ranger_sees(m uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.st_acting('ranger') and (
    exists (select 1 from public.st_mission_targets t join public.st_missions x on x.id = t.mission_id
            where t.mission_id = m and t.ranger_id = auth.uid() and x.status <> 'draft')
    or exists (select 1 from public.st_assignments a where a.mission_id = m and a.ranger_id = auth.uid()))
$$;

-- ============ RLS ============
alter table public.st_profiles enable row level security;
alter table public.st_role_grants enable row level security;
alter table public.st_notifications enable row level security;
alter table public.st_audit enable row level security;
alter table public.st_applications enable row level security;
alter table public.st_invites enable row level security;
alter table public.st_consents enable row level security;
alter table public.st_flags enable row level security;
alter table public.st_leads enable row level security;
alter table public.st_missions enable row level security;
alter table public.st_mission_private enable row level security;
alter table public.st_mission_targets enable row level security;
alter table public.st_bids enable row level security;
alter table public.st_assignments enable row level security;
alter table public.st_deliverables enable row level security;
alter table public.st_payables enable row level security;
alter table public.st_payments enable row level security;
alter table public.st_messages enable row level security;
alter table public.st_program_drafts enable row level security;
alter table public.st_learner_profiles enable row level security;
alter table public.st_points enable row level security;
alter table public.st_orgs enable row level security;
alter table public.st_products enable row level security;
alter table public.st_requests enable row level security;
alter table public.st_workspaces enable row level security;

-- anon tidak membaca apa pun di Studio
revoke all on public.st_profiles, public.st_role_grants, public.st_notifications, public.st_audit, public.st_applications, public.st_invites,
  public.st_consents, public.st_flags, public.st_leads, public.st_missions, public.st_mission_private, public.st_mission_targets, public.st_bids,
  public.st_assignments, public.st_deliverables, public.st_payables, public.st_payments, public.st_messages, public.st_program_drafts,
  public.st_learner_profiles, public.st_points, public.st_orgs, public.st_products, public.st_requests, public.st_workspaces from anon;

-- profil: hanya kolom aman yang bisa diubah pemilik; active_role hanya lewat st_switch_role
revoke update, insert, delete on public.st_profiles from authenticated;
grant update (display_name, headline, skills) on public.st_profiles to authenticated;
create policy "profil sendiri / commander" on public.st_profiles for select to authenticated using (id = (select auth.uid()) or (select public.st_is_commander()));
create policy "ubah profil sendiri" on public.st_profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "grant sendiri / commander" on public.st_role_grants for select to authenticated using (person_id = (select auth.uid()) or (select public.st_is_commander()));
create policy "commander kelola grant" on public.st_role_grants for update to authenticated using ((select public.st_is_commander())) with check ((select public.st_is_commander()));

create policy "notifikasi milik sendiri" on public.st_notifications for select to authenticated
  using (recipient_id = (select auth.uid()) or (audience = 'commander' and (select public.st_is_commander())));
create policy "tandai dibaca" on public.st_notifications for update to authenticated
  using (recipient_id = (select auth.uid()) or (audience = 'commander' and (select public.st_is_commander())))
  with check (recipient_id = (select auth.uid()) or (audience = 'commander' and (select public.st_is_commander())));

create policy "audit commander" on public.st_audit for select to authenticated using ((select public.st_is_commander()));

create policy "aplikasi: commander / pemohon" on public.st_applications for select to authenticated using ((select public.st_is_commander()) or person_id = (select auth.uid()));
create policy "aplikasi: commander ubah" on public.st_applications for update to authenticated using ((select public.st_is_commander())) with check ((select public.st_is_commander()));
create policy "aplikasi: commander input manual" on public.st_applications for insert to authenticated with check ((select public.st_is_commander()) and source = 'manual');

create policy "undangan: commander" on public.st_invites for select to authenticated using ((select public.st_is_commander()));
create policy "undangan: commander ubah" on public.st_invites for update to authenticated using ((select public.st_is_commander())) with check ((select public.st_is_commander()));

create policy "consent sendiri" on public.st_consents for select to authenticated using (person_id = (select auth.uid()) or (select public.st_is_commander()));

create policy "flag terbaca" on public.st_flags for select to authenticated using (true);
create policy "flag diubah commander (kecuali invariant)" on public.st_flags for update to authenticated using ((select public.st_is_commander()) and not locked) with check ((select public.st_is_commander()) and not locked);

create policy "lead: commander" on public.st_leads for all to authenticated using ((select public.st_is_commander())) with check ((select public.st_is_commander()) and (source = 'manual' or source_ref is not null));

create policy "mission: commander" on public.st_missions for all to authenticated using ((select public.st_is_commander())) with check ((select public.st_is_commander()));
create policy "mission: ranger eligible/assigned" on public.st_missions for select to authenticated using ((select public.st_ranger_sees(id)));
create policy "mission private: commander saja" on public.st_mission_private for all to authenticated using ((select public.st_is_commander())) with check ((select public.st_is_commander()));
create policy "target: commander" on public.st_mission_targets for all to authenticated using ((select public.st_is_commander())) with check ((select public.st_is_commander()));
create policy "target: ranger sendiri" on public.st_mission_targets for select to authenticated using (ranger_id = (select auth.uid()) and (select public.st_acting('ranger')));

create policy "bid: commander baca" on public.st_bids for select to authenticated using ((select public.st_is_commander()));
create policy "bid: commander tanggapi" on public.st_bids for insert to authenticated
  with check ((select public.st_is_commander()) and kind in ('counter','decline') and created_by = (select auth.uid()));
create policy "bid: ranger baca miliknya" on public.st_bids for select to authenticated using (ranger_id = (select auth.uid()) and (select public.st_acting('ranger')));
create policy "bid: ranger ajukan" on public.st_bids for insert to authenticated with check (
  ranger_id = (select auth.uid()) and created_by = (select auth.uid()) and kind in ('bid','accept_counter','withdraw')
  and (select public.st_acting('ranger'))
  and exists (select 1 from public.st_mission_targets t join public.st_missions m on m.id = t.mission_id
              where t.mission_id = st_bids.mission_id and t.ranger_id = (select auth.uid()) and m.status in ('offered','bidding','negotiation')
                and (m.offer_close_at is null or m.offer_close_at > now())));

create policy "assignment: commander" on public.st_assignments for all to authenticated using ((select public.st_is_commander())) with check ((select public.st_is_commander()));
create policy "assignment: ranger sendiri" on public.st_assignments for select to authenticated using (ranger_id = (select auth.uid()) and (select public.st_acting('ranger')));

create policy "deliverable: commander" on public.st_deliverables for select to authenticated using ((select public.st_is_commander()));
create policy "deliverable: ranger baca" on public.st_deliverables for select to authenticated using (ranger_id = (select auth.uid()) and (select public.st_acting('ranger')));
create policy "deliverable: ranger serahkan" on public.st_deliverables for insert to authenticated with check (
  ranger_id = (select auth.uid()) and status = 'submitted' and (select public.st_acting('ranger'))
  and exists (select 1 from public.st_assignments a join public.st_missions m on m.id = a.mission_id
              where a.mission_id = st_deliverables.mission_id and a.ranger_id = (select auth.uid()) and a.agreement_state = 'executed'
                and m.status in ('in_progress','revision_requested')));

create policy "payable: commander" on public.st_payables for select to authenticated using ((select public.st_is_commander()));
create policy "payable: penerima" on public.st_payables for select to authenticated using (beneficiary_id = (select auth.uid()));
create policy "payment: commander" on public.st_payments for select to authenticated using ((select public.st_is_commander()));
create policy "payment: penerima" on public.st_payments for select to authenticated
  using (exists (select 1 from public.st_payables p where p.id = payable_id and p.beneficiary_id = (select auth.uid())));

create policy "pesan: baca" on public.st_messages for select to authenticated using (
  (thread_type = 'mission' and ((select public.st_is_commander()) or (ranger_id = (select auth.uid()) and (select public.st_acting('ranger')))))
  or (thread_type = 'workspace' and (select public.st_business_ctx()) and (select public.st_ws_member(thread_id))));
create policy "pesan: kirim" on public.st_messages for insert to authenticated with check (
  author_id = (select auth.uid()) and (
    (thread_type = 'mission' and ranger_id is not null and (
      (select public.st_is_commander())
      or (ranger_id = (select auth.uid()) and (select public.st_acting('ranger'))
          and exists (select 1 from public.st_assignments a where a.mission_id = thread_id and a.ranger_id = (select auth.uid())))))
    or (thread_type = 'workspace' and ranger_id is null and (select public.st_business_ctx()) and (select public.st_ws_member(thread_id)))));

create policy "draft program: commander" on public.st_program_drafts for select to authenticated using ((select public.st_is_commander()));
create policy "draft program: pemilik baca" on public.st_program_drafts for select to authenticated using (owner_id = (select auth.uid()));
create policy "draft program: pemilik buat" on public.st_program_drafts for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select public.st_acting('trainer')) and status in ('draft','submitted'));
create policy "draft program: pemilik ubah" on public.st_program_drafts for update to authenticated
  using (owner_id = (select auth.uid()) and (select public.st_acting('trainer')) and status in ('draft','needs_revision'))
  with check (owner_id = (select auth.uid()) and status in ('draft','submitted'));
create policy "draft program: commander putuskan" on public.st_program_drafts for update to authenticated
  using ((select public.st_is_commander())) with check ((select public.st_is_commander()));

create policy "profil belajar sendiri" on public.st_learner_profiles for all to authenticated
  using (person_id = (select auth.uid())) with check (person_id = (select auth.uid()) and (select public.st_has_role('learner')));
create policy "poin sendiri / commander" on public.st_points for select to authenticated using (person_id = (select auth.uid()) or (select public.st_is_commander()));

create policy "org: commander" on public.st_orgs for all to authenticated using ((select public.st_is_commander())) with check ((select public.st_is_commander()));
create policy "org: pemilik" on public.st_orgs for select to authenticated using (owner_id = (select auth.uid()) and (select public.st_business_ctx()));
create policy "org: buat" on public.st_orgs for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.st_business_ctx())
  and not verified_identity and not verified_ownership and not partner_contracted);
create policy "org: ubah" on public.st_orgs for update to authenticated using (owner_id = (select auth.uid()) and (select public.st_business_ctx()))
  with check (owner_id = (select auth.uid()));
create policy "org: discover (opt-in)" on public.st_orgs for select to authenticated using ((select public.st_business_ctx()) and visibility in ('network','discoverable'));
create policy "org: pihak permintaan" on public.st_orgs for select to authenticated using ((select public.st_business_ctx()) and (select public.st_org_linked(id)));

create policy "produk: commander" on public.st_products for all to authenticated using ((select public.st_is_commander())) with check ((select public.st_is_commander()));
create policy "produk: pemilik" on public.st_products for select to authenticated using (owner_id = (select auth.uid()) and (select public.st_business_ctx()));
create policy "produk: buat" on public.st_products for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.st_business_ctx())
  and (select public.st_owns_org(org_id)) and status in ('draft','queued'));
create policy "produk: ubah" on public.st_products for update to authenticated using (owner_id = (select auth.uid()) and (select public.st_business_ctx()) and status <> 'flagged')
  with check (owner_id = (select auth.uid()) and status in ('draft','queued','unpublished'));
create policy "produk: hapus draft" on public.st_products for delete to authenticated using (owner_id = (select auth.uid()) and status in ('draft','unpublished'));

create policy "permintaan: commander" on public.st_requests for select to authenticated using ((select public.st_is_commander()));
create policy "permintaan: pihak" on public.st_requests for select to authenticated using ((select public.st_business_ctx())
  and ((select public.st_owns_org(from_org)) or (select public.st_owns_org(to_org))));
create policy "permintaan: kirim" on public.st_requests for insert to authenticated with check (
  created_by = (select auth.uid()) and status = 'requested' and (select public.st_business_ctx())
  and (select public.st_owns_org(from_org))
  and exists (select 1 from public.st_orgs o where o.id = to_org and o.visibility in ('network','discoverable')));

create policy "workspace: anggota" on public.st_workspaces for select to authenticated using ((select public.st_business_ctx()) and (select public.st_ws_member(id)));
create policy "workspace: commander (oversight VIBOXS)" on public.st_workspaces for select to authenticated using ((select public.st_is_commander()) and approval is not null);
create policy "workspace: anggota ubah" on public.st_workspaces for update to authenticated using ((select public.st_business_ctx()) and (select public.st_ws_member(id)))
  with check ((select public.st_ws_member(id)));
create policy "workspace: commander putuskan" on public.st_workspaces for update to authenticated using ((select public.st_is_commander()) and approval is not null)
  with check ((select public.st_is_commander()));

-- ============ trigger ============
create trigger t_st_prof before update on public.st_profiles for each row execute function public.touch_updated_at();
create trigger t_st_grant before update on public.st_role_grants for each row execute function public.touch_updated_at();
create trigger t_st_app before update on public.st_applications for each row execute function public.touch_updated_at();
create trigger t_st_inv before update on public.st_invites for each row execute function public.touch_updated_at();
create trigger t_st_lead before update on public.st_leads for each row execute function public.touch_updated_at();
create trigger t_st_msn before update on public.st_missions for each row execute function public.touch_updated_at();
create trigger t_st_mpriv before update on public.st_mission_private for each row execute function public.touch_updated_at();
create trigger t_st_pay before update on public.st_payables for each row execute function public.touch_updated_at();
create trigger t_st_prog before update on public.st_program_drafts for each row execute function public.touch_updated_at();
create trigger t_st_lp before update on public.st_learner_profiles for each row execute function public.touch_updated_at();
create trigger t_st_org before update on public.st_orgs for each row execute function public.touch_updated_at();
create trigger t_st_prod before update on public.st_products for each row execute function public.touch_updated_at();
create trigger t_st_req before update on public.st_requests for each row execute function public.touch_updated_at();
create trigger t_st_ws before update on public.st_workspaces for each row execute function public.touch_updated_at();

create trigger a_st_grant after insert or update on public.st_role_grants for each row execute function public.st_audit_trg();
create trigger a_st_app after insert or update on public.st_applications for each row execute function public.st_audit_trg();
create trigger a_st_inv after insert or update on public.st_invites for each row execute function public.st_audit_trg();
create trigger a_st_msn after insert or update on public.st_missions for each row execute function public.st_audit_trg();
create trigger a_st_mpriv after insert or update on public.st_mission_private for each row execute function public.st_audit_trg();
create trigger a_st_asg after insert or update on public.st_assignments for each row execute function public.st_audit_trg();
create trigger a_st_del after insert or update on public.st_deliverables for each row execute function public.st_audit_trg();
create trigger a_st_pay after insert or update on public.st_payables for each row execute function public.st_audit_trg();
create trigger a_st_pmt after insert on public.st_payments for each row execute function public.st_audit_trg();
create trigger a_st_prog after insert or update on public.st_program_drafts for each row execute function public.st_audit_trg();
create trigger a_st_flag after update on public.st_flags for each row execute function public.st_audit_trg();
create trigger a_st_org after update on public.st_orgs for each row execute function public.st_audit_trg();
create trigger a_st_req after insert or update on public.st_requests for each row execute function public.st_audit_trg();

/** Badge verifikasi hanya Commander; pemilik tidak bisa menyetelnya sendiri. */
create or replace function public.st_org_guard() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not public.st_is_commander() and (new.verified_identity is distinct from old.verified_identity
     or new.verified_ownership is distinct from old.verified_ownership or new.partner_contracted is distinct from old.partner_contracted
     or new.owner_id is distinct from old.owner_id) then
    raise exception 'Badge verifikasi hanya bisa diubah Commander.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger g_st_org before update on public.st_orgs for each row execute function public.st_org_guard();

/** Status produk "published" hanya lewat konektor Universe (belum ada) atau Commander. */
create or replace function public.st_product_guard() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'published' and not public.st_is_commander() then
    raise exception 'Konektor Universe belum aktif — produk tetap dalam antrean.' using errcode = '42501';
  end if;
  return new;
end $$;
/** Anggota workspace hanya boleh MEMINTA keterlibatan VIBOXS; keputusannya milik Commander. */
create or replace function public.st_ws_guard() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.approval is distinct from old.approval and not public.st_is_commander()
     and not (old.approval is null and new.approval = 'awaiting_commander') then
    raise exception 'Persetujuan keterlibatan VIBOXS hanya diputuskan Commander.' using errcode = '42501';
  end if;
  if new.approval = 'awaiting_commander' and old.approval is null then
    perform public.st_notify(null, 'commander', 'connect.viboxs', 'Kolaborasi meminta keterlibatan VIBOXS', new.title, '/command/business');
  end if;
  return new;
end $$;
create trigger g_st_ws before update on public.st_workspaces for each row execute function public.st_ws_guard();

/** Nama & peran penulis pesan diisi server (tidak dipercaya dari klien). */
create or replace function public.st_message_before() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select p.display_name, p.active_role into new.author_name, new.acting_as from public.st_profiles p where p.id = auth.uid();
  if new.thread_type = 'workspace' then
    select o.name into new.author_name from public.st_workspaces w join public.st_requests r on r.id = w.request_id
      join public.st_orgs o on o.id in (r.from_org, r.to_org) and o.owner_id = auth.uid() where w.id = new.thread_id limit 1;
  end if;
  return new;
end $$;
create trigger b_st_msg before insert on public.st_messages for each row execute function public.st_message_before();

create trigger g_st_prod before insert or update on public.st_products for each row execute function public.st_product_guard();

/** Versi deliverable dihitung server; status mission ikut bergerak + notifikasi Commander. */
create or replace function public.st_deliverable_before() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select coalesce(max(version), 0) + 1 into new.version from public.st_deliverables where mission_id = new.mission_id and ranger_id = new.ranger_id;
  return new;
end $$;
create trigger b_st_del before insert on public.st_deliverables for each row execute function public.st_deliverable_before();

create or replace function public.st_deliverable_after() returns trigger language plpgsql security definer set search_path = '' as $$
declare m record;
begin
  update public.st_missions set status = 'submitted' where id = new.mission_id returning ref, title into m;
  perform public.st_notify(null, 'commander', 'deliverable.submitted', 'Deliverable masuk: ' || m.ref, m.title || ' · versi ' || new.version, '/command/missions/' || new.mission_id);
  return new;
end $$;
create trigger c_st_del after insert on public.st_deliverables for each row execute function public.st_deliverable_after();

create or replace function public.st_bid_after() returns trigger language plpgsql security definer set search_path = '' as $$
declare m record;
begin
  select id, ref, title, status into m from public.st_missions where id = new.mission_id;
  if new.kind = 'bid' and m.status = 'offered' then update public.st_missions set status = 'bidding' where id = m.id; end if;
  if new.kind = 'counter' and m.status in ('offered','bidding') then update public.st_missions set status = 'negotiation' where id = m.id; end if;
  if new.kind in ('bid','accept_counter','withdraw') then
    perform public.st_notify(null, 'commander', 'bid.' || new.kind,
      case new.kind when 'bid' then 'Tawaran baru: ' when 'accept_counter' then 'Counteroffer diterima: ' else 'Tawaran ditarik: ' end || m.ref,
      m.title, '/command/missions/' || m.id);
  else
    perform public.st_notify(new.ranger_id, null, 'bid.' || new.kind,
      case new.kind when 'counter' then 'Counteroffer dari Commander: ' else 'Tawaran Anda tidak dilanjutkan: ' end || m.ref, m.title, '/missions/' || m.id);
  end if;
  return new;
end $$;
create trigger c_st_bid after insert on public.st_bids for each row execute function public.st_bid_after();

create or replace function public.st_message_after() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.thread_type = 'mission' then
    if new.author_id = new.ranger_id then
      perform public.st_notify(null, 'commander', 'message', 'Pesan baru di thread misi', left(new.body, 120), '/command/missions/' || new.thread_id);
    else
      perform public.st_notify(new.ranger_id, null, 'message', 'Pesan baru dari Commander', left(new.body, 120), '/missions/' || new.thread_id);
    end if;
  end if;
  return new;
end $$;
create trigger c_st_msg after insert on public.st_messages for each row execute function public.st_message_after();

create or replace function public.st_program_after() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status is distinct from 'submitted') then
    perform public.st_notify(null, 'commander', 'edu.program.submitted', 'Program EDU menunggu review', new.title, '/command/edu-review');
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status and new.status in ('needs_revision','approved','publish_queued','published') then
    perform public.st_notify(new.owner_id, null, 'edu.program.' || new.status,
      case new.status when 'needs_revision' then 'Program perlu revisi' when 'approved' then 'Program disetujui'
                      when 'publish_queued' then 'Program dikirim ke EDU' else 'Program tayang di EDU' end, new.title, '/creator/programs');
  end if;
  return new;
end $$;
create trigger c_st_prog after insert or update on public.st_program_drafts for each row execute function public.st_program_after();

/** ACK dari EDU: begitu edu_programs ditayangkan, status draft Studio ikut menjadi "published". */
create or replace function public.st_edu_ack() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.published then
    update public.st_program_drafts set status = 'published' where edu_slug = new.slug and status = 'publish_queued';
  else
    update public.st_program_drafts set status = 'publish_queued' where edu_slug = new.slug and status = 'published';
  end if;
  return new;
end $$;
create trigger st_edu_ack after insert or update of published on public.edu_programs for each row execute function public.st_edu_ack();

create or replace function public.st_request_after() returns trigger language plpgsql security definer set search_path = '' as $$
declare o record;
begin
  if tg_op = 'INSERT' then
    select owner_id, name into o from public.st_orgs where id = new.to_org;
    perform public.st_notify(o.owner_id, null, 'connect.request', 'Permintaan kolaborasi baru',
      (select name from public.st_orgs where id = new.from_org), '/connect/requests');
    if new.viboxs_involved then
      perform public.st_notify(null, 'commander', 'connect.viboxs', 'Kolaborasi melibatkan VIBOXS', 'Perlu persetujuan Commander saat disepakati', '/command/business');
    end if;
  elsif new.status is distinct from old.status and new.status in ('accepted','declined','needs_info') then
    perform public.st_notify(new.created_by, null, 'connect.' || new.status,
      case new.status when 'accepted' then 'Permintaan diterima — workspace dibuat' when 'declined' then 'Permintaan ditolak' else 'Penerima meminta info tambahan' end,
      (select name from public.st_orgs where id = new.to_org), '/connect/requests');
  end if;
  return new;
end $$;
create trigger c_st_req after insert or update on public.st_requests for each row execute function public.st_request_after();

-- ============ integrasi situs publik → Studio ============
/** Lead "Start a Mission" (Services) dan pendaftar kolaborator EDU masuk otomatis — idempoten per ref. */
create or replace function public.st_from_submission() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'mission' then
    insert into public.st_leads (source, source_ref, name, contact, company, summary, payload)
    values ('services', new.ref, new.name, coalesce(new.email, new.phone), new.payload ->> 'orgName', coalesce(new.subject, new.payload ->> 'kategori'), new.payload)
    on conflict (source, source_ref) where source_ref is not null do nothing;
    if found then perform public.st_notify(null, 'commander', 'services.lead', 'Lead Services baru', coalesce(new.name, new.ref), '/command/leads'); end if;
  elsif new.kind = 'collab' then
    insert into public.st_applications (type, source, source_ref, name, email, payload)
    values ('trainer', 'edu', new.ref, new.name, new.email, new.payload)
    on conflict (source, source_ref) where source_ref is not null do nothing;
    if found then perform public.st_notify(null, 'commander', 'application.submitted', 'Pendaftar kontributor EDU', coalesce(new.name, new.ref), '/command/applications'); end if;
  end if;
  return new;
end $$;
create trigger st_from_submission after insert on public.submissions for each row execute function public.st_from_submission();

insert into public.st_leads (source, source_ref, name, contact, company, summary, payload, created_at)
select 'services', s.ref, s.name, coalesce(s.email, s.phone), s.payload ->> 'orgName', coalesce(s.subject, s.payload ->> 'kategori'), s.payload, s.created_at
from public.submissions s where s.kind = 'mission' on conflict do nothing;
insert into public.st_applications (type, source, source_ref, name, email, payload, created_at)
select 'trainer', 'edu', s.ref, s.name, s.email, s.payload, s.created_at
from public.submissions s where s.kind = 'collab' on conflict do nothing;

-- ============ RPC (semua mutasi sensitif lewat sini) ============
/** Dipanggil setelah login: pastikan profil ada, kembalikan peran & konteks aktif. */
create or replace function public.st_bootstrap() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_roles text[]; v_active text; v_cmd boolean;
begin
  if uid is null then raise exception 'Belum masuk.' using errcode = '42501'; end if;
  insert into public.st_profiles (id, email, display_name)
  values (uid, auth.jwt() ->> 'email', coalesce(auth.jwt() -> 'user_metadata' ->> 'display_name', split_part(auth.jwt() ->> 'email', '@', 1)))
  on conflict (id) do update set email = excluded.email;
  v_cmd := public.st_is_commander();
  if v_cmd and not public.st_has_role('commander') then
    insert into public.st_role_grants (person_id, role, granted_by, note) values (uid, 'commander', uid, 'Akun admin VIBOXS');
  end if;
  select coalesce(array_agg(role order by created_at), '{}') into v_roles from public.st_role_grants where person_id = uid and status = 'active';
  select active_role into v_active from public.st_profiles where id = uid;
  if v_active is null or not (v_active = any(v_roles)) then
    v_active := case when 'commander' = any(v_roles) then 'commander' else v_roles[1] end;
    update public.st_profiles set active_role = v_active where id = uid;
  end if;
  return jsonb_build_object('roles', v_roles, 'active_role', v_active, 'is_commander', v_cmd,
    'profile', (select to_jsonb(p) - 'active_role' from public.st_profiles p where p.id = uid));
end $$;

create or replace function public.st_switch_role(p_role text) returns text
language plpgsql security definer set search_path = '' as $$
begin
  if not public.st_has_role(p_role) then raise exception 'Peran ini tidak aktif untuk akun Anda.' using errcode = '42501'; end if;
  update public.st_profiles set active_role = p_role where id = auth.uid();
  insert into public.st_audit (actor_id, acting_as, action, entity, entity_id) values (auth.uid(), p_role, 'switch_role', 'st_profiles', auth.uid()::text);
  return p_role;
end $$;

/** Self-register EDU Learner: SATU-SATUNYA jalur pembuatan peran tanpa undangan. */
create or replace function public.st_register_learner(p_name text, p_privacy_version text, p_marketing boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); f record; v_count int; v_awarded boolean := false;
begin
  if uid is null then raise exception 'Belum masuk.' using errcode = '42501'; end if;
  if coalesce(p_privacy_version, '') = '' then raise exception 'Persetujuan privasi wajib.'; end if;
  select enabled into f from public.st_flags where key = 'learner_self_registration';
  if not coalesce(f.enabled, false) then raise exception 'Pendaftaran Learner sedang ditutup.'; end if;
  insert into public.st_profiles (id, email, display_name) values (uid, auth.jwt() ->> 'email', coalesce(nullif(trim(p_name), ''), split_part(auth.jwt() ->> 'email', '@', 1)))
  on conflict (id) do update set display_name = coalesce(nullif(trim(p_name), ''), public.st_profiles.display_name);
  if not public.st_has_role('learner') then
    insert into public.st_role_grants (person_id, role, granted_by, note) values (uid, 'learner', uid, 'Self-register EDU Learner');
    insert into public.st_consents (person_id, purpose, version, choice) values (uid, 'privacy_learner', p_privacy_version, true), (uid, 'marketing', p_privacy_version, coalesce(p_marketing, false));
  end if;
  update public.st_profiles set active_role = 'learner' where id = uid and active_role is null;
  -- Early Points: hanya bila kampanye dinyalakan Commander, dalam kuota, sekali per identitas.
  select enabled, config into f from public.st_flags where key = 'early_points_campaign';
  if coalesce(f.enabled, false) then
    perform pg_advisory_xact_lock(hashtext('st_early_points'));
    select count(*) into v_count from public.st_points where campaign = 'early_2026' and reason = 'EARLY_SIGNUP';
    if v_count < coalesce((f.config ->> 'quota')::int, 500) then
      insert into public.st_points (person_id, campaign, reason, points, note) values (uid, 'early_2026', 'EARLY_SIGNUP', coalesce((f.config ->> 'points')::int, 100), 'Early Points — belum dapat ditukar')
      on conflict do nothing;
      v_awarded := found;
    end if;
  end if;
  return jsonb_build_object('ok', true, 'early_points', v_awarded);
end $$;

/** Learner mengajukan jalur profesional — hanya membuat aplikasi, tidak pernah memberi peran. */
create or replace function public.st_apply(p_type text, p_payload jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_ref text; v_recent int;
begin
  if uid is null then raise exception 'Belum masuk.' using errcode = '42501'; end if;
  if p_type not in ('ranger','trainer','opc_founder','business_partner','collaborator') then raise exception 'Jenis aplikasi tidak dikenal.'; end if;
  if public.st_has_role(p_type) then raise exception 'Peran ini sudah aktif di akun Anda.'; end if;
  if exists (select 1 from public.st_applications where person_id = uid and type = p_type and status in ('submitted','in_review','need_info','approved','invited')) then
    raise exception 'Aplikasi untuk jalur ini masih diproses.';
  end if;
  select count(*) into v_recent from public.st_applications where person_id = uid and created_at > now() - interval '1 day';
  if v_recent >= 3 then raise exception 'Terlalu banyak aplikasi hari ini. Coba lagi besok.'; end if;
  if length(coalesce(p_payload ->> 'experience', '')) < 20 then raise exception 'Ceritakan pengalaman minimal 20 karakter.'; end if;
  insert into public.st_applications (type, source, person_id, name, email, payload)
  values (p_type, 'studio', uid, (select display_name from public.st_profiles where id = uid), auth.jwt() ->> 'email', p_payload)
  returning ref into v_ref;
  perform public.st_notify(null, 'commander', 'application.submitted', 'Aplikasi profesional baru', v_ref || ' · ' || p_type, '/command/applications');
  return v_ref;
end $$;

/** Commander membuat undangan sekali pakai. Token mentah hanya dikembalikan SEKALI; DB menyimpan hash. */
create or replace function public.st_create_invite(p_email text, p_roles text[], p_application uuid, p_days int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_token text; v_id uuid;
begin
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  if p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then raise exception 'Email tidak valid.'; end if;
  if coalesce(array_length(p_roles, 1), 0) = 0 or not (p_roles <@ array['ranger','trainer','opc_founder','business_partner','collaborator','operator']) then
    raise exception 'Pilih minimal satu peran profesional yang valid.';
  end if;
  -- undangan lama untuk email yang sama otomatis dicabut (REC-07)
  update public.st_invites set status = 'revoked' where lower(email) = lower(p_email) and status = 'pending';
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.st_invites (token_hash, email, roles, application_id, expires_at, created_by)
  values (encode(extensions.digest(v_token, 'sha256'), 'hex'), lower(trim(p_email)), p_roles, p_application, now() + make_interval(days => greatest(1, least(coalesce(p_days, 7), 30))), auth.uid())
  returning id into v_id;
  if p_application is not null then update public.st_applications set status = 'invited', decided_by = auth.uid(), decided_at = now() where id = p_application; end if;
  return jsonb_build_object('id', v_id, 'token', v_token);
end $$;

/** Info minimal undangan untuk halaman /invite (tanpa membocorkan email lengkap). */
create or replace function public.st_invite_peek(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select jsonb_build_object('roles', i.roles,
      'state', case when i.status <> 'pending' then i.status when i.expires_at < now() then 'expired' else 'pending' end,
      'email_hint', regexp_replace(i.email, '^(.).*(@.*)$', '\1•••\2'), 'expires_at', i.expires_at)
    from public.st_invites i where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')), jsonb_build_object('state', 'invalid'))
$$;

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
  foreach r in array i.roles loop
    if not public.st_has_role(r) then
      insert into public.st_role_grants (person_id, role, invite_id, granted_by, note) values (uid, r, i.id, i.created_by, 'Dari undangan Commander');
    end if;
  end loop;
  update public.st_invites set status = 'accepted', accepted_by = uid, accepted_at = now() where id = i.id;
  if i.application_id is not null then update public.st_applications set status = 'active', person_id = coalesce(person_id, uid) where id = i.application_id; end if;
  update public.st_profiles set active_role = i.roles[1] where id = uid;
  perform public.st_notify(null, 'commander', 'invite.accepted', 'Undangan diterima', i.email || ' · ' || array_to_string(i.roles, ', '), '/command/people');
  return i.roles;
end $$;

/** Commander mempublikasikan penawaran ke Ranger terpilih saja (MIS-02/03). */
create or replace function public.st_offer_mission(p_mission uuid, p_rangers uuid[]) returns int
language plpgsql security definer set search_path = '' as $$
declare m record; r uuid; n int := 0;
begin
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  select * into m from public.st_missions where id = p_mission for update;
  if m.status not in ('draft','offered','bidding','negotiation') then raise exception 'Mission tidak dalam tahap penawaran.'; end if;
  if length(trim(m.brief)) < 20 then raise exception 'Lengkapi brief (sanitasi) sebelum ditawarkan.'; end if;
  foreach r in array coalesce(p_rangers, '{}') loop
    if not exists (select 1 from public.st_role_grants g where g.person_id = r and g.role = 'ranger' and g.status = 'active') then continue; end if;
    insert into public.st_mission_targets (mission_id, ranger_id) values (p_mission, r) on conflict do nothing;
    if found then
      n := n + 1;
      perform public.st_notify(r, null, 'mission.offered', 'Penawaran misi baru: ' || m.ref, m.title, '/missions/' || p_mission);
    end if;
  end loop;
  if n = 0 and not exists (select 1 from public.st_mission_targets where mission_id = p_mission) then raise exception 'Pilih minimal satu Ranger aktif.'; end if;
  if m.status = 'draft' then update public.st_missions set status = 'offered' where id = p_mission; end if;
  return n;
end $$;

/** Commander menunjuk Ranger dengan fee yang disepakati → assignment menunggu perjanjian (MIS-06/07). */
create or replace function public.st_appoint(p_mission uuid, p_ranger uuid, p_fee numeric, p_schedule text, p_terms text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare m record; v_id uuid;
begin
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  select * into m from public.st_missions where id = p_mission for update;
  if m.status not in ('offered','bidding','negotiation','assigned_pending_agreement') then raise exception 'Mission tidak bisa ditunjuk pada status ini.'; end if;
  if not exists (select 1 from public.st_mission_targets where mission_id = p_mission and ranger_id = p_ranger) then raise exception 'Ranger ini tidak termasuk penerima penawaran.'; end if;
  if p_fee is null or p_fee < 0 then raise exception 'Fee yang disepakati wajib diisi.'; end if;
  if length(trim(coalesce(p_terms, ''))) < 20 then raise exception 'Isi ringkasan ketentuan perjanjian (min. 20 karakter).'; end if;
  insert into public.st_assignments (mission_id, ranger_id, agreed_fee, payout_schedule, agreement_terms, created_by)
  values (p_mission, p_ranger, p_fee, p_schedule, p_terms, auth.uid()) returning id into v_id;
  update public.st_missions set status = 'assigned_pending_agreement' where id = p_mission;
  perform public.st_notify(p_ranger, null, 'mission.awarded', 'Anda ditunjuk untuk ' || m.ref, 'Tinjau dan terima perjanjian sebelum mulai bekerja.', '/missions/' || p_mission);
  return v_id;
end $$;

create or replace function public.st_accept_agreement(p_assignment uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare a record;
begin
  select * into a from public.st_assignments where id = p_assignment for update;
  if not found or a.ranger_id <> auth.uid() or not public.st_acting('ranger') then raise exception 'Tidak berhak.' using errcode = '42501'; end if;
  if a.agreement_state = 'executed' then return; end if;
  update public.st_assignments set agreement_state = 'executed', accepted_at = now() where id = a.id;
  update public.st_missions set status = 'in_progress' where id = a.mission_id and status = 'assigned_pending_agreement';
  perform public.st_notify(null, 'commander', 'agreement.executed', 'Perjanjian misi diterima Ranger', (select ref || ' · ' || title from public.st_missions where id = a.mission_id), '/command/missions/' || a.mission_id);
end $$;

/** Review deliverable: revisi / terima. Terima → payable menunggu approval (bukan "paid"). */
create or replace function public.st_review_deliverable(p_id uuid, p_decision text, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare d record; a record; m record;
begin
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  select * into d from public.st_deliverables where id = p_id for update;
  if d.status <> 'submitted' then raise exception 'Deliverable ini sudah direview.'; end if;
  select * into m from public.st_missions where id = d.mission_id;
  if p_decision = 'revision' then
    if length(trim(coalesce(p_note, ''))) < 10 then raise exception 'Tulis lingkup revisi (min. 10 karakter).'; end if;
    update public.st_deliverables set status = 'revision_requested', review_note = p_note, reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
    update public.st_missions set status = 'revision_requested' where id = d.mission_id;
    perform public.st_notify(d.ranger_id, null, 'review.revision_requested', 'Revisi diminta: ' || m.ref, p_note, '/missions/' || d.mission_id);
  elsif p_decision = 'accept' then
    update public.st_deliverables set status = 'accepted', review_note = p_note, reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
    select * into a from public.st_assignments where mission_id = d.mission_id and ranger_id = d.ranger_id;
    insert into public.st_payables (beneficiary_id, source_type, source_id, label, amount, schedule)
    values (d.ranger_id, 'mission', d.mission_id, m.ref || ' · ' || m.title, a.agreed_fee, a.payout_schedule)
    on conflict do nothing;
    update public.st_missions set status = 'payable_pending_approval' where id = d.mission_id;
    perform public.st_notify(d.ranger_id, null, 'review.accepted', 'Deliverable diterima: ' || m.ref, 'Honor masuk antrean persetujuan pembayaran.', '/missions/earnings');
  else
    raise exception 'Keputusan tidak dikenal.';
  end if;
end $$;

create or replace function public.st_payable_decide(p_id uuid, p_approve boolean, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare p record;
begin
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  select * into p from public.st_payables where id = p_id for update;
  if p.status <> 'pending_approval' then raise exception 'Payable ini sudah diputuskan.'; end if;
  if not p_approve and length(trim(coalesce(p_note, ''))) < 5 then raise exception 'Alasan penolakan wajib diisi.'; end if;
  update public.st_payables set status = case when p_approve then 'approved' else 'rejected' end, note = p_note, approved_by = auth.uid(), approved_at = now() where id = p_id;
  if p.source_type = 'mission' and p_approve then update public.st_missions set status = 'payable_approved' where id = p.source_id and status = 'payable_pending_approval'; end if;
  perform public.st_notify(p.beneficiary_id, null, 'payout.status', case when p_approve then 'Honor disetujui — menunggu transfer' else 'Payable ditolak' end, p.label, '/missions/earnings');
end $$;

/** Catat transfer manual + bukti. "Paid" hanya bila total pembayaran ≥ payable. */
create or replace function public.st_record_payment(p_payable uuid, p_amount numeric, p_reference text, p_paid_at date) returns text
language plpgsql security definer set search_path = '' as $$
declare p record; v_total numeric; v_status text;
begin
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  select * into p from public.st_payables where id = p_payable for update;
  if p.status not in ('approved','partially_paid') then raise exception 'Payable harus disetujui dulu.'; end if;
  if length(trim(coalesce(p_reference, ''))) < 4 then raise exception 'Isi referensi/bukti transfer.'; end if;
  select coalesce(sum(amount), 0) into v_total from public.st_payments where payable_id = p_payable;
  if p_amount <= 0 or v_total + p_amount > p.amount then raise exception 'Nominal melebihi sisa payable (sisa %).', p.amount - v_total; end if;
  insert into public.st_payments (payable_id, amount, reference, paid_at, recorded_by) values (p_payable, p_amount, p_reference, coalesce(p_paid_at, current_date), auth.uid());
  v_status := case when v_total + p_amount >= p.amount then 'paid' else 'partially_paid' end;
  update public.st_payables set status = v_status where id = p_payable;
  if v_status = 'paid' and p.source_type = 'mission' then update public.st_missions set status = 'paid' where id = p.source_id; end if;
  perform public.st_notify(p.beneficiary_id, null, 'payout.status', case when v_status = 'paid' then 'Pembayaran tercatat lunas' else 'Pembayaran sebagian tercatat' end, p.label, '/missions/earnings');
  return v_status;
end $$;

/** Approved → kirim ke EDU sebagai draft (published=false). Tayang hanya bila EDU menayangkan. */
create or replace function public.st_send_to_edu(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare d record; v_slug text; v_data jsonb; t timestamp;
  bulan text[] := array['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  bln text[] := array['JAN','FEB','MAR','APR','MEI','JUN','JUL','AGU','SEP','OKT','NOV','DES'];
  hari text[] := array['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
begin
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  select * into d from public.st_program_drafts where id = p_id for update;
  if d.status <> 'approved' then raise exception 'Hanya program berstatus Disetujui yang bisa dikirim ke EDU.'; end if;
  if not d.rights_declared then raise exception 'Kontributor belum menyatakan hak materi.'; end if;
  if d.type = 'ecourse' then raise exception 'EDU belum mendukung e-course (delivery belum siap). Program tetap Disetujui di Studio.'; end if;
  t := d.schedule_at at time zone 'Asia/Jakarta';
  v_slug := d.slug;
  if exists (select 1 from public.edu_programs where slug = v_slug) then v_slug := v_slug || '-' || substr(d.id::text, 1, 4); end if;
  v_data := jsonb_strip_nulls(jsonb_build_object(
    'slug', v_slug, 'type', d.type, 'path', d.path, 'title', d.title, 'summary', d.summary, 'forWho', d.for_who, 'level', d.level,
    'status', case when d.type = 'ebook' then 'AVAILABLE' else 'ANNOUNCED' end, 'free', d.pricing = 'free',
    'day', case when t is null then '' else hari[extract(dow from t)::int + 1] end,
    'date', case when t is null then 'Tanggal menyusul' else extract(day from t)::int || ' ' || bulan[extract(month from t)::int] || ' ' || extract(year from t)::int end,
    'dShort', case when t is null then '—' else to_char(t, 'DD') end,
    'mShort', case when t is null then 'TBA' else bln[extract(month from t)::int] end,
    'time', case when t is null then 'Jam menyusul' else to_char(t, 'HH24.MI') || ' WIB' end,
    'dur', d.duration, 'mode', case when d.type = 'ebook' then null else 'Online' end,
    'cap', case when d.capacity is null then '[Kapasitas]' else d.capacity::text || ' peserta' end,
    'sortDate', coalesce(to_char(t, 'YYYY-MM-DD'), case when d.type = 'ebook' then '9999' else '9990' end),
    'added', extract(epoch from now())::bigint, 'tags', to_jsonb(d.tags), 'outcomes', to_jsonb(d.outcomes),
    'author', '[Kontributor Studio — menunggu persetujuan publikasi nama]'));
  insert into public.edu_programs (slug, data, published, position) values (v_slug, v_data, false, 999);
  update public.st_program_drafts set status = 'publish_queued', edu_slug = v_slug where id = p_id;
  return v_slug;
end $$;

create or replace function public.st_decide_request(p_id uuid, p_decision text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare r record; v_ws uuid;
begin
  select * into r from public.st_requests where id = p_id for update;
  if not found or not public.st_business_ctx() or not public.st_owns_org(r.to_org) then raise exception 'Hanya organisasi penerima yang bisa memutuskan.' using errcode = '42501'; end if;
  if r.status not in ('requested','needs_info') then raise exception 'Permintaan ini sudah diputuskan.'; end if;
  if p_decision not in ('accepted','declined','needs_info') then raise exception 'Keputusan tidak dikenal.'; end if;
  update public.st_requests set status = p_decision, decided_by = auth.uid(), decided_at = now() where id = p_id;
  if p_decision = 'accepted' then
    insert into public.st_workspaces (request_id, title, approval)
    values (p_id, (select a.name || ' × ' || b.name from public.st_orgs a, public.st_orgs b where a.id = r.from_org and b.id = r.to_org),
            case when r.viboxs_involved then 'awaiting_commander' end)
    on conflict (request_id) do nothing returning id into v_ws;
  end if;
  return v_ws;
end $$;

/** Commander memberi peran tambahan ke orang yang sudah punya akun (REC-08) / suspend / cabut. */
create or replace function public.st_set_grant(p_person uuid, p_role text, p_status text, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  if p_role = 'commander' and p_person <> auth.uid() then raise exception 'Peran Commander tidak diberikan dari dashboard.'; end if;
  if p_status = 'active' then
    if exists (select 1 from public.st_role_grants where person_id = p_person and role = p_role and status = 'active') then return; end if;
    update public.st_role_grants set status = 'active', note = p_note where person_id = p_person and role = p_role and status = 'suspended';
    if not found then insert into public.st_role_grants (person_id, role, granted_by, note) values (p_person, p_role, auth.uid(), p_note); end if;
  else
    update public.st_role_grants set status = p_status, note = p_note where person_id = p_person and role = p_role and status <> 'revoked';
    update public.st_profiles set active_role = null where id = p_person and active_role = p_role;
  end if;
  perform public.st_notify(p_person, null, 'role.' || p_status, case p_status when 'active' then 'Peran baru aktif: ' when 'suspended' then 'Peran ditangguhkan: ' else 'Peran dicabut: ' end || p_role, p_note, '/workspace');
end $$;

revoke execute on function public.st_bootstrap(), public.st_switch_role(text), public.st_register_learner(text, text, boolean), public.st_apply(text, jsonb),
  public.st_create_invite(text, text[], uuid, int), public.st_accept_invite(text), public.st_offer_mission(uuid, uuid[]),
  public.st_appoint(uuid, uuid, numeric, text, text), public.st_accept_agreement(uuid), public.st_review_deliverable(uuid, text, text),
  public.st_payable_decide(uuid, boolean, text), public.st_record_payment(uuid, numeric, text, date), public.st_send_to_edu(uuid),
  public.st_decide_request(uuid, text), public.st_set_grant(uuid, text, text, text) from public, anon;
grant execute on function public.st_bootstrap(), public.st_switch_role(text), public.st_register_learner(text, text, boolean), public.st_apply(text, jsonb),
  public.st_create_invite(text, text[], uuid, int), public.st_accept_invite(text), public.st_offer_mission(uuid, uuid[]),
  public.st_appoint(uuid, uuid, numeric, text, text), public.st_accept_agreement(uuid), public.st_review_deliverable(uuid, text, text),
  public.st_payable_decide(uuid, boolean, text), public.st_record_payment(uuid, numeric, text, date), public.st_send_to_edu(uuid),
  public.st_decide_request(uuid, text), public.st_set_grant(uuid, text, text, text) to authenticated;
revoke execute on function public.st_invite_peek(text) from public;
grant execute on function public.st_invite_peek(text) to anon, authenticated;

-- ============ feature flags (PRD §20.1) ============
insert into public.st_flags (key, label, description, enabled, locked, config) values
  ('learner_self_registration', 'Self-register EDU Learner', 'Learner boleh membuat akun sendiri (hanya peran Learner).', true, false, '{}'),
  ('professional_self_registration', 'Self-register profesional', 'Selalu OFF: akses profesional hanya lewat undangan Commander.', false, true, '{}'),
  ('auto_create_mission_from_service_lead', 'Lead → mission otomatis', 'OFF: Commander mengonversi lead secara manual.', false, true, '{}'),
  ('auto_award_mission', 'Award mission otomatis', 'OFF: penunjukan Ranger selalu oleh Commander.', false, true, '{}'),
  ('b2b_connect_enabled', 'VIBOXS Connect', 'Jejaring B2B untuk peran bisnis terverifikasi.', true, false, '{}'),
  ('connect_for_ranger_role', 'Connect untuk peran Ranger', 'Invariant keamanan — tidak bisa diaktifkan.', false, true, '{}'),
  ('edu_contributor_publish_without_approval', 'Publish EDU tanpa approval', 'Invariant — program kontributor selalu lewat approval.', false, true, '{}'),
  ('early_points_campaign', 'Kampanye Early Points', '100 poin untuk 500 Learner terverifikasi pertama. Nyalakan setelah ketentuan disahkan.', false, false, '{"points":100,"quota":500}'),
  ('edu_affiliate', 'Affiliate EDU', 'Coming Soon — belum ada komisi atau tautan berbayar.', false, true, '{}'),
  ('points_redemption', 'Penukaran poin', 'Coming Soon — menunggu persetujuan finance.', false, true, '{}'),
  ('ranger_paid_ai_tools', 'Professional AI Tools', 'Coming Soon.', false, true, '{}'),
  ('dede_ai_advisor', 'Dede AI Advisor', 'Coming Soon.', false, true, '{}'),
  ('automatic_contributor_payouts', 'Payout otomatis', 'FUTURE — payout dicatat manual.', false, true, '{}'),
  ('universe_product_auto_publish', 'Auto-publish produk ke Universe', 'Menunggu konektor Universe; produk masuk antrean.', false, true, '{}'),
  ('investor_network', 'Investor Network', 'Coming Soon — bukan janji pendanaan.', false, true, '{}');

-- realtime untuk notifikasi & thread
alter publication supabase_realtime add table public.st_notifications, public.st_messages;

-- fungsi trigger tidak bisa dipanggil lewat REST; helper RLS hanya untuk user yang login
revoke execute on function public.st_audit_trg(), public.st_bid_after(), public.st_deliverable_after(), public.st_deliverable_before(), public.st_edu_ack(),
  public.st_from_submission(), public.st_message_after(), public.st_message_before(), public.st_org_guard(), public.st_product_guard(),
  public.st_program_after(), public.st_request_after(), public.st_ws_guard() from public, anon, authenticated;
revoke execute on function public.st_acting(text), public.st_business_ctx(), public.st_has_role(text), public.st_is_commander(),
  public.st_org_linked(uuid), public.st_owns_org(uuid), public.st_ranger_sees(uuid), public.st_ws_member(uuid) from public, anon;
grant execute on function public.st_acting(text), public.st_business_ctx(), public.st_has_role(text), public.st_is_commander(),
  public.st_org_linked(uuid), public.st_owns_org(uuid), public.st_ranger_sees(uuid), public.st_ws_member(uuid) to authenticated;
