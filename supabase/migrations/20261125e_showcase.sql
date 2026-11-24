-- Batch 6 — Showcase Rangers & OPC (PRD v3.0 §11; Runbook §5; QA SHO-001..007).
--  * Profil hanya dibuat pemiliknya sendiri (consent), tayang hanya setelah Commander menyetujui (PUBLIC_APPROVED).
--  * Nominal pendapatan hanya dari payable LUNAS yang dihitung server + consent terpisah; tidak pernah diketik manual.
--  * Label "EDU Graduate" dihitung dari asesmen lulus, bukan diisi.
--  * Publik membaca lewat edu_showcase() dengan allowlist kolom — tanpa id pemilik, kontak, atau fee.

create table public.st_showcase (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('ranger','opc')),
  owner_id uuid not null default auth.uid() references public.st_profiles(id) on delete cascade,
  display_name text not null check (length(display_name) between 2 and 60),
  specialization text not null check (length(specialization) between 3 and 80),
  summary text not null default '' check (length(summary) <= 400),
  evidence jsonb not null default '[]'::jsonb,
  image_url text check (image_url is null or image_url = '' or image_url ~ '^https://'),
  link text check (link is null or link = '' or link ~ '^https://'),
  product_status text check (product_status is null or product_status in ('In Development','Beta','Available')),
  consent_version text,
  consent_at timestamptz,
  income_consent boolean not null default false,
  income_amount numeric(14,2),
  income_from date,
  income_to date,
  status text not null default 'DRAFT' check (status in ('DRAFT','SUBMITTED','PUBLIC_APPROVED','REJECTED','WITHDRAWN')),
  review_note text,
  approved_by uuid,
  approved_at timestamptz,
  review_due date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, kind)
);
alter table public.st_showcase enable row level security;
revoke all on public.st_showcase from anon;
revoke delete on public.st_showcase from authenticated;
create policy "showcase: pemilik" on public.st_showcase for select to authenticated using (owner_id = (select auth.uid()));
create policy "showcase: pemilik buat" on public.st_showcase for insert to authenticated with check (
  owner_id = (select auth.uid()) and status = 'DRAFT'
  and ((kind = 'ranger' and (select public.st_acting('ranger'))) or (kind = 'opc' and (select public.st_acting('opc_founder')))));
create policy "showcase: pemilik ubah" on public.st_showcase for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()) and status in ('DRAFT','SUBMITTED','WITHDRAWN'));
create policy "showcase: commander" on public.st_showcase for all to authenticated using ((select public.st_is_commander())) with check ((select public.st_is_commander()));
create trigger t_st_show before update on public.st_showcase for each row execute function public.touch_updated_at();
create trigger a_st_show after insert or update on public.st_showcase for each row execute function public.st_audit_trg();

/** Pemilik tidak bisa menyetujui diri sendiri, mengetik nominal, atau mengubah profil yang sudah tayang tanpa review ulang. */
create or replace function public.st_showcase_guard() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or public.st_is_commander() then return new; end if;
  if new.income_amount is distinct from (case when tg_op = 'UPDATE' then old.income_amount end)
     or new.income_from is distinct from (case when tg_op = 'UPDATE' then old.income_from end)
     or new.approved_by is distinct from (case when tg_op = 'UPDATE' then old.approved_by end) then
    raise exception 'Nominal & persetujuan hanya diisi sistem.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    if old.status = 'PUBLIC_APPROVED' and new.status = 'PUBLIC_APPROVED' then raise exception 'Profil tayang — tarik (withdraw) dulu untuk mengubah.'; end if;
    if new.status = 'SUBMITTED' and old.status <> 'SUBMITTED' then
      if new.consent_at is null then raise exception 'Setujui publikasi profil terlebih dulu.'; end if;
      if jsonb_typeof(new.evidence) <> 'array' or jsonb_array_length(new.evidence) = 0 then raise exception 'Lampirkan minimal satu bukti karya (tautan https).'; end if;
      if new.kind = 'opc' and new.product_status is null then raise exception 'Pilih status produk berdasarkan bukti.'; end if;
      perform public.st_notify(null, 'commander', 'showcase.submitted', 'Profil showcase menunggu review', new.display_name, '/command/showcase');
    end if;
    if not new.income_consent then new.income_amount := null; new.income_from := null; new.income_to := null; end if;
  end if;
  return new;
end $$;
create trigger g_st_show before insert or update on public.st_showcase for each row execute function public.st_showcase_guard();

create or replace function public.st_showcase_decide(p_id uuid, p_approve boolean, p_note text) returns void language plpgsql security definer set search_path = '' as $$
declare s record;
begin
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  select * into s from public.st_showcase where id = p_id for update;
  if s.status <> 'SUBMITTED' then raise exception 'Profil tidak sedang menunggu review.'; end if;
  if length(trim(coalesce(p_note, ''))) < 10 then raise exception 'Catat hasil verifikasi identitas & bukti (min. 10 karakter).'; end if;
  update public.st_showcase set status = case when p_approve then 'PUBLIC_APPROVED' else 'REJECTED' end, review_note = trim(p_note),
    approved_by = case when p_approve then auth.uid() end, approved_at = case when p_approve then now() end,
    review_due = case when p_approve then current_date + 180 end where id = p_id;
  perform public.st_notify(s.owner_id, null, 'showcase.decided', case when p_approve then 'Profil showcase tayang' else 'Profil showcase belum disetujui' end, p_note, '/showcase');
end $$;

/** SHO-002: nominal = jumlah transfer tercatat atas payable mission LUNAS milik pemilik dalam periode, hanya bila pemilik setuju. */
create or replace function public.st_showcase_set_income(p_id uuid, p_from date, p_to date) returns numeric language plpgsql security definer set search_path = '' as $$
declare s record; v numeric;
begin
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  select * into s from public.st_showcase where id = p_id for update;
  if s.kind <> 'ranger' then raise exception 'Nominal hanya untuk profil Ranger.'; end if;
  if not s.income_consent then raise exception 'Pemilik belum menyetujui publikasi nominal.'; end if;
  if p_from is null or p_to is null or p_from > p_to then raise exception 'Periode tidak valid.'; end if;
  select coalesce(sum(pm.amount), 0) into v from public.st_payments pm join public.st_payables p on p.id = pm.payable_id
   where p.beneficiary_id = s.owner_id and p.source_type = 'mission' and p.status = 'paid' and pm.paid_at between p_from and p_to;
  update public.st_showcase set income_amount = nullif(v, 0), income_from = p_from, income_to = p_to where id = p_id;
  return v;
end $$;

/** API publik showcase: maksimal 5 per jenis, hanya PUBLIC_APPROVED yang belum lewat tanggal review. */
create or replace function public.edu_showcase() returns table (kind text, display_name text, specialization text, summary text, evidence jsonb, image_url text, link text,
  product_status text, income_amount numeric, income_period text, edu_graduate boolean, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select x.kind, x.display_name, x.specialization, x.summary, x.evidence, x.image_url, x.link, x.product_status, x.income_amount, x.income_period, x.edu_graduate, x.updated_at from (
    select s.kind, s.display_name, s.specialization, s.summary,
      (select coalesce(jsonb_agg(jsonb_build_object('label', e ->> 'label', 'url', e ->> 'url')), '[]'::jsonb) from jsonb_array_elements(s.evidence) e where (e ->> 'url') ~ '^https://') as evidence,
      nullif(s.image_url, '') as image_url, nullif(s.link, '') as link, s.product_status,
      case when s.income_consent then s.income_amount end as income_amount,
      case when s.income_consent and s.income_amount is not null then to_char(s.income_from, 'Mon YYYY') || ' – ' || to_char(s.income_to, 'Mon YYYY') end as income_period,
      exists (select 1 from public.st_assessment_attempts a join public.st_assessments y on y.id = a.assessment_id
              where a.person_id = s.owner_id and a.status in ('SCORED','REVIEWED') and a.score >= y.pass_score) as edu_graduate,
      s.updated_at,
      row_number() over (partition by s.kind order by s.approved_at) as rn
    from public.st_showcase s
    where s.status = 'PUBLIC_APPROVED' and s.review_due >= current_date
      and (s.kind <> 'ranger' or exists (select 1 from public.st_role_grants g where g.person_id = s.owner_id and g.role = 'ranger' and g.status = 'active'))
  ) x where rn <= 5
$$;

revoke execute on function public.st_showcase_guard() from public, anon, authenticated;
revoke execute on function public.st_showcase_decide(uuid, boolean, text), public.st_showcase_set_income(uuid, date, date) from public, anon;
grant execute on function public.st_showcase_decide(uuid, boolean, text), public.st_showcase_set_income(uuid, date, date) to authenticated;
revoke execute on function public.edu_showcase() from public;
grant execute on function public.edu_showcase() to anon, authenticated;
