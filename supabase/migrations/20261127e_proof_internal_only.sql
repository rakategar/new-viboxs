-- v4 WP03 — Bukti bank internal-only (QA V4-BP-005..010, V4-MG-001, RAN-012). Override v3 O1.
-- Penerima (Ranger/Kontributor) TIDAK lagi bisa membuka bukti transfer lewat jalan mana pun:
--   1) storage policy "st-proofs: penerima baca" dihapus;
--   2) RLS "payment: penerima" dihapus — penerima membaca lewat RPC st_my_payments() tanpa proof_path/proof_sha256;
--   3) UI Earnings tidak lagi membuat signed URL (lihat apps/studio/src/app/ranger/Earnings.tsx).
-- Signed URL lama berumur 300 detik dan sudah kedaluwarsa sendiri; tidak ada URL baru yang bisa dibuat penerima.
-- Bukti immutable: storage hanya INSERT + SELECT (tanpa UPDATE/DELETE), versi baru = path baru, riwayat di st_payment_proofs.
-- Akses evidence: Commander, atau Operator aktif dengan izin FINANCE_EVIDENCE (st_staff_permissions). Operator tanpa izin ditolak.
-- Rollback: create policy "st-proofs: penerima baca" & "payment: penerima" seperti 20261125d/20261120; drop st_payment_proofs,
--   st_staff_permissions, st_my_payments(), st_payment_add_proof(), st_can_finance_evidence(); kembalikan st_record_payment 20261125d+MFA.

-- ============ izin staf (FINANCE_EVIDENCE) ============
create table if not exists public.st_staff_permissions (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.st_profiles(id) on delete cascade,
  permission text not null check (permission in ('FINANCE_EVIDENCE')),
  status text not null default 'active' check (status in ('active','revoked')),
  granted_by uuid,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists st_staff_permissions_active on public.st_staff_permissions (person_id, permission) where status = 'active';
alter table public.st_staff_permissions enable row level security;
revoke all on public.st_staff_permissions from anon, authenticated;
grant select on public.st_staff_permissions to authenticated;
drop policy if exists "izin staf: commander / diri sendiri" on public.st_staff_permissions;
create policy "izin staf: commander / diri sendiri" on public.st_staff_permissions for select to authenticated
  using ((select public.st_is_commander()) or person_id = (select auth.uid()));
drop trigger if exists a_st_staff_perm on public.st_staff_permissions;
create trigger a_st_staff_perm after insert or update on public.st_staff_permissions for each row execute function public.st_audit_trg();

create or replace function public.st_can_finance_evidence() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.st_is_commander() or exists (
    select 1 from public.st_staff_permissions sp
    join public.st_role_grants g on g.person_id = sp.person_id and g.role = 'operator' and g.status = 'active'
    where sp.person_id = auth.uid() and sp.permission = 'FINANCE_EVIDENCE' and sp.status = 'active')
$$;
revoke execute on function public.st_can_finance_evidence() from public, anon;
grant execute on function public.st_can_finance_evidence() to authenticated;

create or replace function public.st_set_staff_permission(p_person uuid, p_permission text, p_active boolean, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.st_require_mfa();
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  if p_permission not in ('FINANCE_EVIDENCE') then raise exception 'Izin tidak dikenal.'; end if;
  if p_active then
    if not exists (select 1 from public.st_role_grants where person_id = p_person and role = 'operator' and status = 'active') then
      raise exception 'Izin ini hanya untuk Operator aktif.';
    end if;
    insert into public.st_staff_permissions (person_id, permission, granted_by, note) values (p_person, p_permission, auth.uid(), p_note)
    on conflict (person_id, permission) where status = 'active' do nothing;
  else
    update public.st_staff_permissions set status = 'revoked', note = coalesce(p_note, note), updated_at = now()
    where person_id = p_person and permission = p_permission and status = 'active';
  end if;
end $$;
revoke execute on function public.st_set_staff_permission(uuid, text, boolean, text) from public, anon;
grant execute on function public.st_set_staff_permission(uuid, text, boolean, text) to authenticated;

-- ============ storage st-proofs: tanpa akses penerima, tanpa overwrite ============
drop policy if exists "st-proofs: penerima baca" on storage.objects;
drop policy if exists "st-proofs: commander kelola" on storage.objects;
drop policy if exists "st-proofs: finance baca" on storage.objects;
drop policy if exists "st-proofs: commander unggah" on storage.objects;
create policy "st-proofs: finance baca" on storage.objects for select to authenticated
  using (bucket_id = 'st-proofs' and (select public.st_can_finance_evidence()));
create policy "st-proofs: commander unggah" on storage.objects for insert to authenticated
  with check (bucket_id = 'st-proofs' and (storage.foldername(name))[1] = 'payments' and (select public.st_is_commander()));
-- Sengaja tidak ada policy UPDATE/DELETE: file bukti tidak bisa diganti atau dihapus dari klien.

-- ============ st_payments: penerima tidak membaca tabel langsung ============
drop policy if exists "payment: penerima" on public.st_payments;
alter table public.st_payments add column if not exists proof_version int not null default 0,
  add column if not exists proof_uploaded_by uuid, add column if not exists proof_uploaded_at timestamptz;
update public.st_payments set proof_version = 1, proof_uploaded_by = coalesce(proof_uploaded_by, recorded_by), proof_uploaded_at = coalesce(proof_uploaded_at, created_at)
where proof_path is not null and proof_version = 0;

create table if not exists public.st_payment_proofs (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.st_payments(id) on delete restrict,
  version int not null check (version > 0),
  path text not null unique,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  note text,
  uploaded_by uuid,
  uploaded_at timestamptz not null default now(),
  unique (payment_id, version)
);
alter table public.st_payment_proofs enable row level security;
revoke all on public.st_payment_proofs from anon, authenticated;
grant select on public.st_payment_proofs to authenticated;
drop policy if exists "bukti: finance" on public.st_payment_proofs;
create policy "bukti: finance" on public.st_payment_proofs for select to authenticated using ((select public.st_can_finance_evidence()));
drop trigger if exists a_st_pmt_proof on public.st_payment_proofs;
create trigger a_st_pmt_proof after insert on public.st_payment_proofs for each row execute function public.st_audit_trg();
-- Backfill riwayat versi 1 untuk bukti lama (hash lama mungkin null → pakai placeholder nol agar riwayat tetap utuh).
insert into public.st_payment_proofs (payment_id, version, path, sha256, uploaded_by, uploaded_at, note)
select id, 1, proof_path, coalesce(nullif(proof_sha256, ''), repeat('0', 64)), coalesce(proof_uploaded_by, recorded_by), coalesce(proof_uploaded_at, created_at), 'backfill v3'
from public.st_payments p where proof_path is not null and not exists (select 1 from public.st_payment_proofs x where x.payment_id = p.id)
on conflict do nothing;

-- ============ catat transfer (versi 1 bukti + email "Pembayaran berhasil" tanpa lampiran) ============
create or replace function public.st_payment_mail(p_payment uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  select pm.id, pm.amount, pm.paid_at, pm.reference, p.label, p.source_type, p.status, p.amount as total, pr.email, pr.display_name, pr.is_demo
    into r from public.st_payments pm join public.st_payables p on p.id = pm.payable_id join public.st_profiles pr on pr.id = p.beneficiary_id
   where pm.id = p_payment;
  if not found or r.email is null or r.is_demo then return; end if;
  insert into public.st_outbox (topic, aggregate_id, subject_id, channel, recipient, template, payload)
  values ('payout.paid', r.id, r.id, 'email', r.email, 'payout_paid', jsonb_build_object(
    'name', r.display_name, 'category', case r.source_type when 'program' then 'program EDU' when 'mission' then 'misi VIBOXS' else 'honor VIBOXS' end,
    'label', r.label, 'amount', r.amount, 'paid_at', r.paid_at, 'partial', r.status <> 'paid',
    'reference_masked', case when length(r.reference) > 4 then repeat('•', 4) || right(r.reference, 4) else '••••' end,
    'link', case when r.source_type = 'program' then '/creator/earnings' else '/missions/earnings' end))
  on conflict (topic, aggregate_id, channel) do nothing;
end $$;
revoke execute on function public.st_payment_mail(uuid) from public, anon, authenticated;

drop function if exists public.st_record_payment(uuid, numeric, text, date, text, text, text);
create or replace function public.st_record_payment(p_payable uuid, p_amount numeric, p_reference text, p_paid_at date,
  p_method text default null, p_proof_path text default null, p_proof_sha256 text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare p record; v_total numeric; v_status text; v_pay uuid;
begin
  perform public.st_require_mfa();
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  select * into p from public.st_payables where id = p_payable for update;
  if not found then raise exception 'Payable tidak ditemukan.'; end if;
  if p.status not in ('approved','partially_paid') then raise exception 'Payable harus disetujui dulu.'; end if;
  if length(trim(coalesce(p_reference, ''))) < 4 then raise exception 'Isi referensi/bukti transfer.'; end if;
  if p_proof_path is not null then
    if p_proof_path not like 'payments/' || p_payable || '/%' or p_proof_path like '%..%' then raise exception 'Lokasi bukti transfer tidak sah.'; end if;
    if coalesce(p_proof_sha256, '') !~ '^[0-9a-f]{64}$' then raise exception 'Hash bukti transfer tidak valid.'; end if;
    if exists (select 1 from public.st_payment_proofs where path = p_proof_path) then raise exception 'File bukti ini sudah dipakai.'; end if;
  end if;
  select coalesce(sum(amount), 0) into v_total from public.st_payments where payable_id = p_payable;
  if p_amount is null or p_amount <= 0 or v_total + p_amount > p.amount then raise exception 'Nominal melebihi sisa payable (sisa %).', p.amount - v_total; end if;
  insert into public.st_payments (payable_id, amount, reference, paid_at, recorded_by, method, proof_path, proof_sha256, verified_by,
    proof_version, proof_uploaded_by, proof_uploaded_at)
  values (p_payable, p_amount, trim(p_reference), coalesce(p_paid_at, current_date), auth.uid(), nullif(trim(coalesce(p_method, '')), ''), p_proof_path, p_proof_sha256, auth.uid(),
    case when p_proof_path is null then 0 else 1 end, case when p_proof_path is null then null else auth.uid() end, case when p_proof_path is null then null else now() end)
  returning id into v_pay;
  if p_proof_path is not null then
    insert into public.st_payment_proofs (payment_id, version, path, sha256, uploaded_by) values (v_pay, 1, p_proof_path, p_proof_sha256, auth.uid());
  end if;
  v_status := case when v_total + p_amount >= p.amount then 'paid' else 'partially_paid' end;
  update public.st_payables set status = v_status where id = p_payable;
  if v_status = 'paid' and p.source_type = 'mission' then update public.st_missions set status = 'paid' where id = p.source_id; end if;
  -- In-app & email: status + nominal + tanggal saja, tanpa lampiran/tautan bukti (V4-BP-008/009).
  perform public.st_notify(p.beneficiary_id, null, 'payout.status',
    case when v_status = 'paid' then 'Pembayaran berhasil' else 'Pembayaran sebagian berhasil' end,
    p.label || ' · ' || to_char(p_amount, 'FM999G999G999G990') || ' IDR · ' || to_char(coalesce(p_paid_at, current_date), 'DD-MM-YYYY'),
    case when p.source_type = 'program' then '/creator/earnings' else '/missions/earnings' end);
  perform public.st_payment_mail(v_pay);
  return v_status;
end $$;
revoke execute on function public.st_record_payment(uuid, numeric, text, date, text, text, text) from public, anon;
grant execute on function public.st_record_payment(uuid, numeric, text, date, text, text, text) to authenticated;

-- Versi bukti baru (mis. bukti salah unggah): file lama tetap ada, path baru, versi naik.
create or replace function public.st_payment_add_proof(p_payment uuid, p_path text, p_sha256 text, p_note text) returns int
language plpgsql security definer set search_path = '' as $$
declare pm record; v int;
begin
  perform public.st_require_mfa();
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  select * into pm from public.st_payments where id = p_payment for update;
  if not found then raise exception 'Pembayaran tidak ditemukan.'; end if;
  if p_path is null or p_path not like 'payments/' || pm.payable_id || '/%' or p_path like '%..%' then raise exception 'Lokasi bukti transfer tidak sah.'; end if;
  if coalesce(p_sha256, '') !~ '^[0-9a-f]{64}$' then raise exception 'Hash bukti transfer tidak valid.'; end if;
  if length(trim(coalesce(p_note, ''))) < 5 then raise exception 'Tulis alasan mengganti bukti.'; end if;
  if exists (select 1 from public.st_payment_proofs where path = p_path) then raise exception 'File bukti ini sudah dipakai.'; end if;
  v := coalesce((select max(version) from public.st_payment_proofs where payment_id = p_payment), 0) + 1;
  insert into public.st_payment_proofs (payment_id, version, path, sha256, uploaded_by, note) values (p_payment, v, p_path, p_sha256, auth.uid(), trim(p_note));
  update public.st_payments set proof_path = p_path, proof_sha256 = p_sha256, proof_version = v, proof_uploaded_by = auth.uid(), proof_uploaded_at = now() where id = p_payment;
  return v;
end $$;
revoke execute on function public.st_payment_add_proof(uuid, text, text, text) from public, anon;
grant execute on function public.st_payment_add_proof(uuid, text, text, text) to authenticated;

-- ============ tampilan penerima: tanpa proof_path/proof_sha256 ============
create or replace function public.st_my_payments() returns table (
  id uuid, payable_id uuid, amount numeric, reference_masked text, paid_at date, method text, status text)
language sql stable security definer set search_path = '' as $$
  select pm.id, pm.payable_id, pm.amount,
    case when length(pm.reference) > 4 then repeat('•', 4) || right(pm.reference, 4) else '••••' end,
    pm.paid_at, pm.method, 'PAID'::text
  from public.st_payments pm join public.st_payables p on p.id = pm.payable_id
  where p.beneficiary_id = auth.uid()
  order by pm.paid_at desc, pm.created_at desc
$$;
revoke execute on function public.st_my_payments() from public, anon;
grant execute on function public.st_my_payments() to authenticated;
