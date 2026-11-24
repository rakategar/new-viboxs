-- Batch 2 — EDU Commerce: satu mesin order untuk guest EDU & member Studio (PRD v3.0 §05, §13, Runbook WP-05).
-- Diterapkan lewat MCP apply_migration. Invariant yang dijaga DATABASE:
--  * Harga & produk dibaca server dari edu_programs (bukan dari klien); order menyimpan snapshot (CON-010).
--  * PAID hanya lewat edu_apply_payment() yang dipanggil edge function setelah verifikasi signature + cek status Midtrans.
--  * Transisi idempoten: webhook ganda = satu PAID, satu entitlement, satu baris split (CHE-009).
--  * anon tidak membaca apa pun; buyer hanya order/entitlement miliknya; Commander semua.
--  * Join URL webinar & file e-book di tabel privat — hanya keluar lewat edge function untuk pemilik entitlement.

-- ============ program: id kanonis + pemilik ============
alter table public.edu_programs add column if not exists id uuid not null default gen_random_uuid();
alter table public.edu_programs add constraint edu_programs_id_key unique (id);
alter table public.edu_programs add column if not exists draft_id uuid unique;
alter table public.edu_programs add column if not exists contributor_id uuid references public.st_profiles(id) on delete set null;

create table public.edu_program_private (
  program_id uuid primary key references public.edu_programs(id) on delete cascade,
  meeting_url text check (meeting_url is null or meeting_url ~ '^https://'),
  ebook_path text,
  access_note text,
  updated_at timestamptz not null default now()
);

-- ============ order ============
create table public.edu_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  order_source text not null check (order_source in ('EDU_PUBLIC_GUEST','STUDIO_MEMBER')),
  buyer_id uuid references auth.users(id) on delete set null,
  email text not null,
  email_hash text not null,
  buyer_name text not null,
  phone text,
  program_id uuid not null references public.edu_programs(id) on delete restrict,
  program_slug text not null,
  product jsonb not null,
  list_price numeric(14,2) not null check (list_price >= 0),
  token_value numeric(14,2) not null default 0 check (token_value >= 0),
  cash_charged numeric(14,2) not null check (cash_charged >= 0),
  currency text not null default 'IDR',
  status text not null default 'CREATED' check (status in ('CREATED','PAYMENT_PENDING','PAID_VERIFIED','FULFILLED','COMPLETED','EXPIRED','FAILED','CANCELLED','REFUNDED','PARTIALLY_REFUNDED','CHARGEBACK')),
  status_reason text,
  idempotency_key text not null unique,
  access_token_hash text not null,
  gateway text,
  gateway_env text,
  gateway_txn_id text,
  payment_type text,
  redirect_url text,
  return_to text,
  expires_at timestamptz,
  paid_at timestamptz,
  fulfilled_at timestamptz,
  refunded_amount numeric(14,2) not null default 0,
  access_email_status text not null default 'pending',
  policy_versions jsonb not null default '{}'::jsonb,
  attribution jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index edu_orders_email on public.edu_orders (email_hash, created_at desc);
create index edu_orders_buyer on public.edu_orders (buyer_id, created_at desc);
create index edu_orders_program on public.edu_orders (program_id, status);

create table public.edu_payment_events (
  id bigint generated always as identity primary key,
  order_id uuid references public.edu_orders(id) on delete set null,
  order_no text,
  provider text not null default 'midtrans',
  source text not null check (source in ('webhook','status_check','checkout')),
  transaction_status text,
  fraud_status text,
  status_code text,
  gross_amount numeric(14,2),
  signature_valid boolean,
  verified boolean not null default false,
  transition text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index edu_payment_events_order on public.edu_payment_events (order_no, created_at desc);

create table public.edu_entitlements (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.edu_orders(id) on delete restrict,
  program_id uuid not null references public.edu_programs(id) on delete restrict,
  program_slug text not null,
  buyer_id uuid references auth.users(id) on delete set null,
  email_hash text not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoke_reason text
);
create index edu_entitlements_buyer on public.edu_entitlements (buyer_id) where revoked_at is null;
create index edu_entitlements_email on public.edu_entitlements (email_hash) where revoked_at is null;

create table public.edu_refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.edu_orders(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  reason text not null,
  source text not null check (source in ('provider','commander')),
  provider_ref text,
  recorded_by uuid,
  created_at timestamptz not null default now()
);
create unique index edu_refunds_provider on public.edu_refunds (order_id, provider_ref) where provider_ref is not null;

/** Ledger bagi hasil append-only (PRD §07.3): baris 'sale' sekali per order; refund/chargeback = baris negatif. */
create table public.edu_order_splits (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.edu_orders(id) on delete restrict,
  program_id uuid not null references public.edu_programs(id) on delete restrict,
  contributor_id uuid references public.st_profiles(id) on delete set null,
  kind text not null check (kind in ('sale','refund','chargeback')),
  refund_id uuid unique references public.edu_refunds(id) on delete restrict,
  basis numeric(14,2) not null,
  contributor_share numeric(14,2) not null,
  platform_fee numeric(14,2) not null,
  reserve numeric(14,2) not null,
  token_value numeric(14,2) not null default 0,
  contributor_cash numeric(14,2) not null,
  rule_version text not null,
  payable_id uuid references public.st_payables(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index edu_order_splits_sale on public.edu_order_splits (order_id) where kind = 'sale';

create trigger t_edu_prog_priv before update on public.edu_program_private for each row execute function public.touch_updated_at();
create trigger t_edu_orders before update on public.edu_orders for each row execute function public.touch_updated_at();
create trigger a_edu_orders after insert or update on public.edu_orders for each row execute function public.st_audit_trg();

-- ============ RLS ============
alter table public.edu_program_private enable row level security;
alter table public.edu_orders enable row level security;
alter table public.edu_payment_events enable row level security;
alter table public.edu_entitlements enable row level security;
alter table public.edu_refunds enable row level security;
alter table public.edu_order_splits enable row level security;
revoke all on public.edu_program_private, public.edu_orders, public.edu_payment_events, public.edu_entitlements, public.edu_refunds, public.edu_order_splits from anon;
revoke insert, update, delete on public.edu_orders, public.edu_payment_events, public.edu_entitlements, public.edu_refunds, public.edu_order_splits from authenticated;

create policy "private program: commander" on public.edu_program_private for all to authenticated
  using ((select public.st_is_commander())) with check ((select public.st_is_commander()));
create policy "order: pembeli / commander" on public.edu_orders for select to authenticated
  using (buyer_id = (select auth.uid()) or (select public.st_is_commander()));
create policy "payment event: commander" on public.edu_payment_events for select to authenticated using ((select public.st_is_commander()));
create policy "entitlement: pemilik / commander" on public.edu_entitlements for select to authenticated
  using (buyer_id = (select auth.uid()) or (select public.st_is_commander()));
create policy "refund: commander" on public.edu_refunds for select to authenticated using ((select public.st_is_commander()));
create policy "split: commander" on public.edu_order_splits for select to authenticated using ((select public.st_is_commander()));

-- ============ konfigurasi kebijakan (Runbook §4 — tidak di-hardcode di halaman) ============
insert into public.st_flags (key, label, description, enabled, locked, config) values
  ('edu_payments_enabled', 'Pembayaran EDU online (Midtrans)', 'Nyalakan HANYA setelah QA sandbox lulus dan server key production terpasang. OFF = program berbayar menampilkan "Pembayaran online sedang disiapkan".', false, false, '{}'),
  ('edu_policy', 'Kebijakan EDU v1', 'Parameter bagi hasil 95/4/1, token, SLA summary & payout. Ubah hanya dengan persetujuan Commander + Finance.', true, false,
   '{"version":"edu-policy-v1","contributor_pct":95,"platform_pct":4,"reserve_pct":1,"token_value_idr":10,"edu_token_max_pct":20,"edu_token_max_value_idr":50000,"service_token_max_pct":10,"service_token_max_value_idr":100000,"service_token_30d_limit_idr":250000,"token_default_expiry_months":12,"summary_due_days":2,"payout_processing_days":7,"order_expiry_minutes":60,"learner_membership_price":0}'),
  ('token_redemption_enabled', 'Penukaran token', 'OFF sampai ada sign-off Legal + Finance + Commander. Diubah lewat migrasi, bukan dashboard.', false, true, '{}'),
  ('ranger_active_talent_discovery', 'Ranger aktif di Talent Search', 'Invariant keamanan — Ranger aktif tidak pernah tampil ke perusahaan.', false, true, '{}'),
  ('company_talent_opt_in_default', 'Default opt-in talent', 'Invariant privasi — default FALSE.', false, true, '{}'),
  ('opc_connect_enabled', 'OPC Connect publik', 'DEFERRED.', false, true, '{}')
on conflict (key) do nothing;

-- ============ helper ============
create or replace function public.edu_email_hash(p text) returns text language sql immutable set search_path = '' as $$
  select encode(extensions.digest(lower(trim(p)), 'sha256'), 'hex')
$$;

create or replace function public.edu_policy() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((select config from public.st_flags where key = 'edu_policy'), '{}'::jsonb)
$$;

/** Status publik untuk klien EDU/Studio: apakah tombol bayar boleh tampil. */
create or replace function public.edu_public_config() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('payments_enabled', coalesce((select enabled from public.st_flags where key = 'edu_payments_enabled'), false))
$$;

/** Entitlement + split + notifikasi. Dipanggil hanya dari fungsi transisi di bawah (sudah memegang lock order). */
create or replace function public.edu_fulfill(p_order uuid) returns void language plpgsql security definer set search_path = '' as $$
declare o record; pol jsonb := public.edu_policy(); b numeric; c numeric; f numeric; r numeric;
begin
  select * into o from public.edu_orders where id = p_order;
  insert into public.edu_entitlements (order_id, program_id, program_slug, buyer_id, email_hash)
  values (o.id, o.program_id, o.program_slug, o.buyer_id, o.email_hash) on conflict (order_id) do nothing;
  update public.edu_orders set status = 'FULFILLED', fulfilled_at = coalesce(fulfilled_at, now()) where id = o.id and status in ('CREATED','PAYMENT_PENDING','PAID_VERIFIED');
  b := o.cash_charged + o.token_value;
  if b > 0 then
    c := floor(b * coalesce((pol ->> 'contributor_pct')::numeric, 95) / 100);
    f := floor(b * coalesce((pol ->> 'platform_pct')::numeric, 4) / 100);
    r := b - c - f;  -- sisa pembulatan masuk reserve secara eksplisit (Runbook §4 identity check)
    insert into public.edu_order_splits (order_id, program_id, contributor_id, kind, basis, contributor_share, platform_fee, reserve, token_value, contributor_cash, rule_version)
    values (o.id, o.program_id, (o.product ->> 'contributor_id')::uuid, 'sale', b, c, f, r, o.token_value, greatest(0, c - o.token_value), coalesce(pol ->> 'version', 'edu-policy-v1'))
    on conflict (order_id) where kind = 'sale' do nothing;
  end if;
  if o.cash_charged > 0 then
    perform public.st_notify(null, 'commander', 'edu.order.paid_verified', 'Order EDU terbayar: ' || o.order_no, (o.product ->> 'title') || ' · ' || o.cash_charged::text, '/command/edu-orders');
  end if;
  if o.product ->> 'contributor_id' is not null then
    perform public.st_notify((o.product ->> 'contributor_id')::uuid, null, 'edu.order.new', 'Peserta baru: ' || (o.product ->> 'title'), case when o.cash_charged > 0 then 'Pembayaran terverifikasi' else 'Pendaftaran gratis' end, '/creator/sales');
  end if;
end $$;

/**
 * Buat order (dipanggil edge function edu-checkout dengan service role).
 * Harga, status program, kapasitas, dan entitlement ganda diperiksa di sini — bukan di klien.
 */
create or replace function public.edu_create_order(p_slug text, p_email text, p_name text, p_phone text, p_buyer uuid, p_source text,
  p_idem text, p_allow_paid boolean, p_return_to text, p_policy jsonb, p_attr jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pg record; v_free boolean; v_price numeric; v_type text; v_start timestamptz; v_cap int; v_used int; v_hash text; v_ex record;
  v_token text; v_no text; v_id uuid; v_recent int; pol jsonb := public.edu_policy();
begin
  if p_source not in ('EDU_PUBLIC_GUEST','STUDIO_MEMBER') then raise exception 'SOURCE_INVALID'; end if;
  if coalesce(p_email, '') !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then raise exception 'EMAIL_INVALID'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'NAME_REQUIRED'; end if;
  if coalesce(length(p_idem), 0) not between 16 and 80 then raise exception 'IDEMPOTENCY_REQUIRED'; end if;
  v_hash := public.edu_email_hash(p_email);

  -- kunci idempotensi sama → kembalikan order yang sama (tanpa token baru); data berbeda → konflik
  select * into v_ex from public.edu_orders where idempotency_key = p_idem;
  if found then
    if v_ex.email_hash <> v_hash or v_ex.program_slug <> p_slug then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    return jsonb_build_object('order_no', v_ex.order_no, 'status', v_ex.status, 'cash', v_ex.cash_charged, 'existing', true, 'redirect_url', v_ex.redirect_url);
  end if;

  select * into pg from public.edu_programs where slug = p_slug and published for share;
  if not found then raise exception 'PROGRAM_NOT_FOUND'; end if;
  v_type := pg.data ->> 'type';
  if coalesce(pg.data ->> 'status', '') in ('CANCELLED','COMPLETED','SOLD_OUT') then raise exception 'PROGRAM_CLOSED'; end if;
  v_start := nullif(pg.data ->> 'startsAt', '')::timestamptz;
  if v_type <> 'ebook' and v_start is not null and v_start < now() then raise exception 'PROGRAM_CLOSED'; end if;
  v_free := coalesce((pg.data ->> 'free')::boolean, false);
  v_price := case when v_free then 0 else nullif(pg.data ->> 'price', '')::numeric end;
  if not v_free and (v_price is null or v_price < 1000) then raise exception 'PRICE_NOT_SET'; end if;
  if not v_free and not p_allow_paid then raise exception 'PAYMENTS_DISABLED'; end if;

  -- sudah punya akses aktif → jangan menagih dua kali
  select o.order_no into v_no from public.edu_entitlements e join public.edu_orders o on o.id = e.order_id
   where e.program_id = pg.id and e.revoked_at is null and (e.email_hash = v_hash or (p_buyer is not null and e.buyer_id = p_buyer)) limit 1;
  if found then raise exception 'ALREADY_OWNED:%', v_no; end if;

  select count(*) into v_recent from public.edu_orders where email_hash = v_hash and created_at > now() - interval '1 hour';
  if v_recent >= 6 then raise exception 'RATE_LIMITED'; end if;

  v_cap := nullif(regexp_replace(coalesce(pg.data ->> 'capacity', pg.data ->> 'cap', ''), '\D', '', 'g'), '')::int;
  if v_type <> 'ebook' and v_cap is not null then
    select count(*) into v_used from public.edu_entitlements where program_id = pg.id and revoked_at is null;
    if v_used >= v_cap then raise exception 'SOLD_OUT'; end if;
  end if;

  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  v_no := 'EDU' || to_char(now() at time zone 'Asia/Jakarta', 'YYMMDD') || '-' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8));
  insert into public.edu_orders (order_no, order_source, buyer_id, email, email_hash, buyer_name, phone, program_id, program_slug, product,
    list_price, cash_charged, status, idempotency_key, access_token_hash, gateway, return_to, expires_at, policy_versions, attribution)
  values (v_no, p_source, p_buyer, lower(trim(p_email)), v_hash, trim(p_name), nullif(trim(coalesce(p_phone, '')), ''), pg.id, pg.slug,
    jsonb_strip_nulls(jsonb_build_object('title', pg.data ->> 'title', 'type', v_type, 'free', v_free, 'price', v_price, 'startsAt', pg.data ->> 'startsAt',
      'date', pg.data ->> 'date', 'time', pg.data ->> 'time', 'contributor_id', pg.contributor_id, 'accepts_tokens', false)),
    v_price, v_price, case when v_free then 'CREATED' else 'PAYMENT_PENDING' end, p_idem, encode(extensions.digest(v_token, 'sha256'), 'hex'),
    case when v_free then null else 'midtrans' end, p_return_to,
    case when v_free then null else now() + make_interval(mins => coalesce((pol ->> 'order_expiry_minutes')::int, 60)) end,
    coalesce(p_policy, '{}'::jsonb) || jsonb_build_object('edu_policy', pol ->> 'version'), coalesce(p_attr, '{}'::jsonb))
  returning id into v_id;
  if v_free then perform public.edu_fulfill(v_id); end if;
  return jsonb_build_object('order_no', v_no, 'order_id', v_id, 'status', (select status from public.edu_orders where id = v_id), 'cash', v_price,
    'access_token', v_token, 'existing', false, 'item', left(coalesce(pg.data ->> 'title', pg.slug), 50));
end $$;

/** Simpan hasil permintaan Snap (atau kegagalannya) — tidak mengubah status bayar. */
create or replace function public.edu_set_gateway(p_order_no text, p_env text, p_redirect text, p_error text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_error is not null then
    update public.edu_orders set status = 'FAILED', status_reason = left(p_error, 300) where order_no = p_order_no and status = 'PAYMENT_PENDING';
  else
    update public.edu_orders set gateway_env = p_env, redirect_url = p_redirect where order_no = p_order_no;
  end if;
end $$;

/**
 * Transisi status dari Midtrans (webhook terverifikasi ATAU cek status server-ke-server).
 * Pemanggil WAJIB sudah memverifikasi signature dan/atau mengambil status langsung dari API Midtrans.
 */
create or replace function public.edu_apply_payment(p_order_no text, p_txn_status text, p_fraud text, p_gross numeric, p_txn_id text,
  p_payment_type text, p_source text, p_signature_valid boolean, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o record; v_new text; v_tr text := 'noop'; v_refund numeric; v_rid uuid;
begin
  select * into o from public.edu_orders where order_no = p_order_no for update;
  if not found then
    insert into public.edu_payment_events (order_no, source, transaction_status, fraud_status, gross_amount, signature_valid, verified, transition, payload)
    values (p_order_no, p_source, p_txn_status, p_fraud, p_gross, p_signature_valid, false, 'unknown_order', coalesce(p_payload, '{}'::jsonb));
    return jsonb_build_object('transition', 'unknown_order');
  end if;

  v_new := case
    when p_txn_status in ('settlement') then 'PAID'
    when p_txn_status = 'capture' and coalesce(p_fraud, 'accept') = 'accept' then 'PAID'
    when p_txn_status = 'capture' then 'PENDING'
    when p_txn_status in ('pending','authorize') then 'PENDING'
    when p_txn_status = 'expire' then 'EXPIRED'
    when p_txn_status in ('deny','failure') then 'FAILED'
    when p_txn_status = 'cancel' then 'CANCELLED'
    when p_txn_status = 'refund' then 'REFUND'
    when p_txn_status = 'partial_refund' then 'PARTIAL_REFUND'
    when p_txn_status = 'chargeback' or p_txn_status = 'partial_chargeback' then 'CHARGEBACK'
    else 'UNKNOWN' end;

  if v_new = 'PAID' then
    if o.status in ('PAID_VERIFIED','FULFILLED','COMPLETED','REFUNDED','PARTIALLY_REFUNDED','CHARGEBACK') then v_tr := 'noop_already_paid';
    elsif p_gross is null or p_gross <> o.cash_charged then
      v_tr := 'amount_mismatch';
      perform public.st_notify(null, 'commander', 'edu.payment.mismatch', 'Nominal pembayaran tidak cocok: ' || o.order_no, 'Diterima ' || coalesce(p_gross::text, '?') || ', seharusnya ' || o.cash_charged::text, '/command/edu-orders');
    else
      update public.edu_orders set status = 'PAID_VERIFIED', paid_at = now(), gateway_txn_id = p_txn_id, payment_type = p_payment_type, status_reason = null where id = o.id;
      perform public.edu_fulfill(o.id);
      v_tr := 'paid';
    end if;
  elsif v_new = 'PENDING' then
    if o.status in ('CREATED','FAILED','EXPIRED') then
      update public.edu_orders set status = 'PAYMENT_PENDING', gateway_txn_id = p_txn_id, payment_type = p_payment_type where id = o.id; v_tr := 'pending';
    elsif o.status = 'PAYMENT_PENDING' then
      update public.edu_orders set gateway_txn_id = coalesce(p_txn_id, gateway_txn_id), payment_type = coalesce(p_payment_type, payment_type) where id = o.id;
    end if;
  elsif v_new in ('EXPIRED','FAILED','CANCELLED') then
    if o.status in ('CREATED','PAYMENT_PENDING') then
      update public.edu_orders set status = v_new, status_reason = p_txn_status where id = o.id; v_tr := lower(v_new);
    end if;
  elsif v_new in ('REFUND','PARTIAL_REFUND') then
    v_refund := greatest(0, coalesce(nullif(p_payload ->> 'refund_amount', '')::numeric, case when v_new = 'REFUND' then o.cash_charged - o.refunded_amount end, 0));
    if v_refund > 0 and o.status in ('FULFILLED','COMPLETED','PAID_VERIFIED','PARTIALLY_REFUNDED') then
      insert into public.edu_refunds (order_id, amount, reason, source, provider_ref)
      values (o.id, least(v_refund, o.cash_charged - o.refunded_amount), 'Refund dari Midtrans', 'provider', coalesce(p_payload ->> 'refund_key', p_txn_status || ':' || v_refund::text))
      on conflict (order_id, provider_ref) where provider_ref is not null do nothing returning id into v_rid;
      if v_rid is not null then perform public.edu_apply_refund(v_rid); v_tr := 'refund'; end if;
    end if;
  elsif v_new = 'CHARGEBACK' then
    if o.status <> 'CHARGEBACK' and o.status in ('FULFILLED','COMPLETED','PAID_VERIFIED','PARTIALLY_REFUNDED') then
      update public.edu_orders set status = 'CHARGEBACK', status_reason = 'chargeback' where id = o.id;
      update public.edu_entitlements set revoked_at = now(), revoke_reason = 'Chargeback' where order_id = o.id and revoked_at is null;
      insert into public.edu_order_splits (order_id, program_id, contributor_id, kind, basis, contributor_share, platform_fee, reserve, token_value, contributor_cash, rule_version)
      select order_id, program_id, contributor_id, 'chargeback', -basis, -contributor_share, -platform_fee, -reserve, -token_value, -contributor_cash, rule_version
        from public.edu_order_splits where order_id = o.id and kind = 'sale';
      perform public.st_notify(null, 'commander', 'edu.order.chargeback', 'Chargeback: ' || o.order_no, 'Akses dicabut; payable kontributor ditahan.', '/command/edu-orders');
      v_tr := 'chargeback';
    end if;
  end if;

  insert into public.edu_payment_events (order_id, order_no, source, transaction_status, fraud_status, gross_amount, signature_valid, verified, transition, payload)
  values (o.id, p_order_no, p_source, p_txn_status, p_fraud, p_gross, p_signature_valid, true, v_tr, coalesce(p_payload, '{}'::jsonb));
  return jsonb_build_object('transition', v_tr, 'status', (select status from public.edu_orders where id = o.id));
end $$;

/** Terapkan satu baris refund: status order, pencabutan akses (refund penuh), dan split negatif proporsional. */
create or replace function public.edu_apply_refund(p_refund uuid) returns void language plpgsql security definer set search_path = '' as $$
declare rf record; o record; s record; ratio numeric; v_total numeric;
begin
  select * into rf from public.edu_refunds where id = p_refund;
  select * into o from public.edu_orders where id = rf.order_id for update;
  v_total := o.refunded_amount + rf.amount;
  if v_total > o.cash_charged then raise exception 'Refund melebihi nominal tunai order.'; end if;
  update public.edu_orders set refunded_amount = v_total,
    status = case when v_total >= o.cash_charged then 'REFUNDED' else 'PARTIALLY_REFUNDED' end, status_reason = left(rf.reason, 300) where id = o.id;
  if v_total >= o.cash_charged then
    update public.edu_entitlements set revoked_at = now(), revoke_reason = 'Refund penuh' where order_id = o.id and revoked_at is null;
  end if;
  select * into s from public.edu_order_splits where order_id = o.id and kind = 'sale';
  if found and s.basis > 0 then
    ratio := rf.amount / s.basis;
    insert into public.edu_order_splits (order_id, program_id, contributor_id, kind, refund_id, basis, contributor_share, platform_fee, reserve, token_value, contributor_cash, rule_version)
    values (o.id, o.program_id, s.contributor_id, 'refund', rf.id, -rf.amount, -round(s.contributor_share * ratio), -round(s.platform_fee * ratio),
            -(rf.amount - round(s.contributor_share * ratio) - round(s.platform_fee * ratio)), 0, -round(s.contributor_cash * ratio), s.rule_version);
  end if;
end $$;

/** Commander mencatat refund yang sudah dieksekusi di dashboard Midtrans / transfer manual. */
create or replace function public.edu_record_refund(p_order uuid, p_amount numeric, p_reason text) returns text
language plpgsql security definer set search_path = '' as $$
declare o record; v_id uuid;
begin
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  select * into o from public.edu_orders where id = p_order for update;
  if not found or o.status not in ('FULFILLED','COMPLETED','PAID_VERIFIED','PARTIALLY_REFUNDED') then raise exception 'Order ini tidak dalam status terbayar.'; end if;
  if length(trim(coalesce(p_reason, ''))) < 10 then raise exception 'Tulis alasan refund (min. 10 karakter).'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > o.cash_charged - o.refunded_amount then raise exception 'Nominal refund melebihi sisa (%).', o.cash_charged - o.refunded_amount; end if;
  insert into public.edu_refunds (order_id, amount, reason, source, recorded_by) values (o.id, p_amount, trim(p_reason), 'commander', auth.uid()) returning id into v_id;
  perform public.edu_apply_refund(v_id);
  return (select status from public.edu_orders where id = o.id);
end $$;

/** Tampilan order untuk halaman status: dipanggil edge function setelah token guest / JWT pemilik / tautan email bertanda tangan dicek. */
create or replace function public.edu_order_view(p_order_no text, p_token text, p_uid uuid, p_trusted boolean default false) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare o record; v_access jsonb; v_meet text; v_file text; v_note text; ok boolean;
begin
  select * into o from public.edu_orders where order_no = p_order_no;
  if not found then return null; end if;
  ok := p_trusted or (p_token is not null and o.access_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')) or (p_uid is not null and o.buyer_id = p_uid);
  if not ok then return null; end if;
  if exists (select 1 from public.edu_entitlements where order_id = o.id and revoked_at is null) then
    select meeting_url, ebook_path, access_note into v_meet, v_file, v_note from public.edu_program_private where program_id = o.program_id;
    v_access := jsonb_strip_nulls(jsonb_build_object('meeting_url', v_meet, 'ebook_path', v_file, 'note', v_note, 'pending', v_meet is null and v_file is null));
  end if;
  return jsonb_build_object('order_no', o.order_no, 'status', o.status, 'source', o.order_source, 'product', o.product - 'contributor_id', 'slug', o.program_slug,
    'cash', o.cash_charged, 'refunded', o.refunded_amount, 'created_at', o.created_at, 'paid_at', o.paid_at, 'expires_at', o.expires_at,
    'redirect_url', case when o.status = 'PAYMENT_PENDING' and o.expires_at > now() then o.redirect_url end,
    'email_hint', regexp_replace(o.email, '^(.).*(@.*)$', '\1•••\2'), 'program_id', o.program_id, 'buyer_name', o.buyer_name, 'access', v_access);
end $$;

/** CHE-004: tautkan order guest ke akun HANYA bila email akun sudah terverifikasi & sama persis. */
create or replace function public.edu_claim_orders() returns int language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_email text; v_conf timestamptz; n int;
begin
  if uid is null then raise exception 'Belum masuk.' using errcode = '42501'; end if;
  select email, email_confirmed_at into v_email, v_conf from auth.users where id = uid;
  if v_conf is null or v_email is null then return 0; end if;
  update public.edu_orders set buyer_id = uid where email_hash = public.edu_email_hash(v_email) and buyer_id is null;
  get diagnostics n = row_count;
  update public.edu_entitlements set buyer_id = uid where email_hash = public.edu_email_hash(v_email) and buyer_id is null;
  return n;
end $$;

revoke execute on function public.edu_create_order(text, text, text, text, uuid, text, text, boolean, text, jsonb, jsonb), public.edu_set_gateway(text, text, text, text),
  public.edu_apply_payment(text, text, text, numeric, text, text, text, boolean, jsonb), public.edu_apply_refund(uuid), public.edu_fulfill(uuid),
  public.edu_order_view(text, text, uuid, boolean), public.edu_policy() from public, anon, authenticated;
revoke execute on function public.edu_record_refund(uuid, numeric, text), public.edu_claim_orders() from public, anon;
grant execute on function public.edu_record_refund(uuid, numeric, text), public.edu_claim_orders() to authenticated;
revoke execute on function public.edu_public_config() from public;
grant execute on function public.edu_public_config() to anon, authenticated;

-- e-book & bukti privat: bucket tanpa akses publik; file keluar hanya lewat signed URL dari edge function / pemilik.
insert into storage.buckets (id, name, public, file_size_limit) values ('edu-private', 'edu-private', false, 52428800) on conflict (id) do nothing;
create policy "edu-private: commander kelola" on storage.objects for all to authenticated
  using (bucket_id = 'edu-private' and (select public.st_is_commander())) with check (bucket_id = 'edu-private' and (select public.st_is_commander()));

-- ============ revisi: jalur QA sandbox terpisah (diterapkan sebagai migrasi edu_create_order_qa_fixture) ============
-- Header Origin bisa dipalsukan, jadi "uji lokal" TIDAK boleh membuka pembayaran sandbox untuk program publik.
-- edu_create_order(..., p_qa boolean default false):
--   p_qa = true  → hanya program fixture (data.qa = true, tidak pernah terbit) — dipakai edge function saat MIDTRANS_IS_PRODUCTION=false
--   p_qa = false → hanya program terbit dan bukan fixture; berbayar hanya bila flag edu_payments_enabled ON *dan* mode production.
-- Fixture: qa-sandbox-webinar (Rp15.000) & qa-sandbox-gratis, published=false; trigger g_edu_prog_qa menolak penayangan fixture.
-- Definisi lengkap: lihat riwayat migrasi Supabase "edu_create_order_qa_fixture" (isi identik dengan fungsi di atas + filter p_qa).
