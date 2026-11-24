-- Batch 3 — Contributor publish (PRD v3.0 §08, Runbook WP-03, QA CON-001..012).
--  * Satu draft ↔ satu program EDU kanonis (edu_programs.draft_id). Kirim ulang = update, bukan produk baru (CON-009).
--  * PUBLISH_FAILED tercatat bila adapter gagal; retry idempoten.
--  * ACK berbasis draft_id, bukan slug — rename/hapus di CMS tidak lagi memutus status.
--  * Join URL webinar & file e-book disimpan di tabel privat (bukan di data publik) — CON-003.
--  * Kontributor hanya melihat penjualan programnya sendiri, agregat tanpa data pembeli (CON-011/012).

alter table public.st_program_drafts
  add column if not exists price numeric(14,2) check (price is null or price >= 0),
  add column if not exists accepts_tokens boolean not null default false,
  add column if not exists public_name text,
  add column if not exists toc text[] not null default '{}',
  add column if not exists cover_url text check (cover_url is null or cover_url = '' or cover_url ~ '^https://'),
  add column if not exists refund_terms text,
  add column if not exists support_contact text,
  add column if not exists agreement_version text,
  add column if not exists edu_program_id uuid,
  add column if not exists publish_error text;
alter table public.st_program_drafts drop constraint if exists st_program_drafts_status_check;
alter table public.st_program_drafts add constraint st_program_drafts_status_check
  check (status in ('draft','submitted','needs_revision','approved','publish_queued','publish_failed','published','cancelled','completed','archived'));

create table public.st_program_private (
  draft_id uuid primary key references public.st_program_drafts(id) on delete cascade,
  meeting_url text check (meeting_url is null or meeting_url ~ '^https://'),
  ebook_path text,
  updated_at timestamptz not null default now()
);
alter table public.st_program_private enable row level security;
revoke all on public.st_program_private from anon;
create policy "privat program: pemilik" on public.st_program_private for all to authenticated
  using (exists (select 1 from public.st_program_drafts d where d.id = draft_id and d.owner_id = (select auth.uid())) and (select public.st_acting('trainer')))
  with check (exists (select 1 from public.st_program_drafts d where d.id = draft_id and d.owner_id = (select auth.uid())) and (select public.st_acting('trainer')));
create policy "privat program: commander baca" on public.st_program_private for select to authenticated using ((select public.st_is_commander()));
create trigger t_st_prog_priv before update on public.st_program_private for each row execute function public.touch_updated_at();

-- status sensitif hanya oleh server: pemilik tidak bisa menaikkan diri ke approved/published
create or replace function public.st_program_guard() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or public.st_is_commander() then return new; end if;
  if new.edu_program_id is distinct from old.edu_program_id or new.edu_slug is distinct from old.edu_slug
     or new.reviewed_by is distinct from old.reviewed_by or new.publish_error is distinct from old.publish_error then
    raise exception 'Kolom ini hanya diisi sistem.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger g_st_prog before update on public.st_program_drafts for each row execute function public.st_program_guard();

/** Adapter Studio → EDU. Idempoten per draft; gagal → PUBLISH_FAILED (bukan error yang hilang). */
create or replace function public.st_send_to_edu(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare d record; pv record; v_slug text; v_data jsonb; v_pid uuid; v_err text;
begin
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  select * into d from public.st_program_drafts where id = p_id for update;
  if d.status not in ('approved','publish_failed','publish_queued','published') then raise exception 'Hanya program berstatus Disetujui yang bisa dikirim ke EDU.'; end if;
  if not d.rights_declared then raise exception 'Kontributor belum menyatakan hak materi.'; end if;
  if d.type = 'ecourse' then raise exception 'EDU belum mendukung e-course (delivery belum siap). Program tetap Disetujui di Studio.'; end if;
  if d.pricing = 'paid' and (d.price is null or d.price < 1000) then raise exception 'Program berbayar wajib punya harga final (min. Rp1.000) sebelum dikirim.'; end if;
  select * into pv from public.st_program_private where draft_id = d.id;
  begin
    v_data := jsonb_strip_nulls(jsonb_build_object(
      'type', d.type, 'path', d.path, 'title', d.title, 'summary', d.summary, 'forWho', d.for_who, 'level', d.level,
      'status', case when d.type = 'ebook' then 'AVAILABLE' else 'OPEN' end, 'free', d.pricing = 'free',
      'price', case when d.pricing = 'paid' then d.price end,
      'startsAt', case when d.type <> 'ebook' and d.schedule_at is not null then to_char(d.schedule_at at time zone 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS"+07:00"') end,
      'date', case when d.type <> 'ebook' and d.schedule_at is null then 'Tanggal menyusul' end,
      'sortDate', coalesce(to_char(d.schedule_at at time zone 'Asia/Jakarta', 'YYYY-MM-DD'), case when d.type = 'ebook' then '9999' else '9990' end),
      'dur', nullif(d.duration, ''), 'mode', case when d.type = 'ebook' then null else 'Online' end,
      'loc', case when d.type = 'ebook' then null else 'Tautan sesi dikirim hanya ke peserta terdaftar' end,
      'capacity', d.capacity, 'cap', case when d.capacity is not null then d.capacity::text || ' peserta' end,
      'added', extract(epoch from now())::bigint, 'tags', to_jsonb(d.tags), 'outcomes', to_jsonb(d.outcomes),
      'toc', case when cardinality(d.toc) > 0 then to_jsonb(d.toc) end, 'cover', nullif(d.cover_url, ''),
      'facilitator', nullif(trim(coalesce(d.public_name, '')), ''), 'author', case when d.type = 'ebook' then nullif(trim(coalesce(d.public_name, '')), '') end,
      'refundTerms', nullif(d.refund_terms, ''), 'acceptsTokens', false));
    select id, slug into v_pid, v_slug from public.edu_programs where draft_id = d.id for update;
    if found then
      update public.edu_programs set data = v_data || jsonb_build_object('slug', v_slug), contributor_id = d.owner_id where id = v_pid;
    else
      v_slug := d.slug;
      if exists (select 1 from public.edu_programs where slug = v_slug) then v_slug := v_slug || '-' || substr(replace(d.id::text, '-', ''), 1, 4); end if;
      insert into public.edu_programs (slug, data, published, position, draft_id, contributor_id)
      values (v_slug, v_data || jsonb_build_object('slug', v_slug), false, 999, d.id, d.owner_id) returning id into v_pid;
    end if;
    insert into public.edu_program_private (program_id, meeting_url, ebook_path) values (v_pid, pv.meeting_url, pv.ebook_path)
    on conflict (program_id) do update set meeting_url = excluded.meeting_url, ebook_path = coalesce(excluded.ebook_path, public.edu_program_private.ebook_path);
  exception when others then
    v_err := sqlerrm;
  end;
  if v_err is not null then
    update public.st_program_drafts set status = 'publish_failed', publish_error = left(v_err, 300) where id = p_id;
    perform public.st_notify(null, 'commander', 'edu.program.publish_failed', 'Kirim ke EDU gagal', d.title || ': ' || left(v_err, 120), '/command/edu-review');
    return 'FAILED: ' || v_err;
  end if;
  update public.st_program_drafts set status = case when (select published from public.edu_programs where id = v_pid) then 'published' else 'publish_queued' end,
    edu_slug = v_slug, edu_program_id = v_pid, publish_error = null where id = p_id;
  return v_slug;
end $$;

/** ACK dari EDU berbasis draft_id: hanya penayangan nyata di EDU yang membuat status "published". */
create or replace function public.st_edu_ack() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.draft_id is null then return new; end if;
  if new.published then
    update public.st_program_drafts set status = 'published', edu_slug = new.slug, edu_program_id = new.id where id = new.draft_id and status in ('publish_queued','publish_failed');
  else
    update public.st_program_drafts set status = 'publish_queued' where id = new.draft_id and status = 'published';
  end if;
  return new;
end $$;

/** Slug program kontributor terkunci (permalink & ACK); hapus program yang sudah punya order ditolak. */
create or replace function public.edu_program_guard() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if old.draft_id is not null and new.slug <> old.slug then raise exception 'Slug program dari kontributor Studio terkunci (permalink & ACK).'; end if;
    if new.id <> old.id or (old.draft_id is not null and new.draft_id is distinct from old.draft_id) then raise exception 'ID kanonis program tidak bisa diubah.'; end if;
    return new;
  end if;
  if exists (select 1 from public.edu_orders where program_id = old.id) then
    raise exception 'Program ini sudah punya order — sembunyikan (unpublish) atau ubah status menjadi Dibatalkan, jangan dihapus.';
  end if;
  update public.st_program_drafts set status = 'publish_failed', publish_error = 'Entri EDU dihapus admin CMS — kirim ulang bila perlu.', edu_program_id = null
   where id = old.draft_id;
  return old;
end $$;
create trigger g_edu_prog before update or delete on public.edu_programs for each row execute function public.edu_program_guard();

/** CON-011/012: penjualan program milik sendiri — agregat, tanpa identitas pembeli. */
create or replace function public.st_creator_sales() returns table (program_id uuid, slug text, title text, published boolean, kind text, starts_at timestamptz, paid_orders bigint, free_orders bigint,
  refunded_orders bigint, active_participants bigint, basis numeric, contributor_share numeric, token_value numeric, contributor_cash numeric, released numeric)
language sql stable security definer set search_path = '' as $$
  select p.id, p.slug, p.data ->> 'title', p.published, p.data ->> 'type', nullif(p.data ->> 'startsAt', '')::timestamptz,
    (select count(*) from public.edu_orders o where o.program_id = p.id and o.cash_charged > 0 and o.status in ('PAID_VERIFIED','FULFILLED','COMPLETED','PARTIALLY_REFUNDED')),
    (select count(*) from public.edu_orders o where o.program_id = p.id and o.cash_charged = 0 and o.status = 'FULFILLED'),
    (select count(*) from public.edu_orders o where o.program_id = p.id and o.status in ('REFUNDED','CHARGEBACK')),
    (select count(*) from public.edu_entitlements e where e.program_id = p.id and e.revoked_at is null),
    coalesce((select sum(s.basis) from public.edu_order_splits s where s.program_id = p.id), 0),
    coalesce((select sum(s.contributor_share) from public.edu_order_splits s where s.program_id = p.id), 0),
    coalesce((select sum(s.token_value) from public.edu_order_splits s where s.program_id = p.id), 0),
    coalesce((select sum(s.contributor_cash) from public.edu_order_splits s where s.program_id = p.id), 0),
    coalesce((select sum(s.contributor_cash) from public.edu_order_splits s where s.program_id = p.id and s.payable_id is not null), 0)
  from public.edu_programs p
  where p.contributor_id = auth.uid() and public.st_acting('trainer')
  order by p.updated_at desc
$$;

/**
 * Commander: jadikan bagi hasil yang sudah eligible sebagai payable (manual, dengan bukti transfer nanti).
 * Eligible: webinar/workshop setelah sesi lewat; e-book 7 hari setelah dibayar (jendela refund awal). Tidak pernah auto-PAID.
 */
create or replace function public.st_release_program_payable(p_program uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare p record; v_sum numeric; v_n int; v_pay uuid;
begin
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  select * into p from public.edu_programs where id = p_program for update;
  if p.contributor_id is null then raise exception 'Program ini tidak terhubung ke kontributor Studio.'; end if;
  create temp table if not exists _elig (id uuid) on commit drop;
  delete from _elig;
  insert into _elig select s.id from public.edu_order_splits s join public.edu_orders o on o.id = s.order_id
   where s.program_id = p.id and s.payable_id is null and o.status not in ('CHARGEBACK')
     and (case when p.data ->> 'type' = 'ebook' then o.paid_at < now() - interval '7 days'
               else nullif(p.data ->> 'startsAt', '')::timestamptz < now() - interval '3 hours' end);
  select coalesce(sum(s.contributor_cash), 0), count(distinct s.order_id) into v_sum, v_n from public.edu_order_splits s where s.id in (select id from _elig);
  if v_sum <= 0 then raise exception 'Belum ada bagi hasil yang eligible (sesi belum selesai, masa refund e-book belum lewat, atau saldo nol).'; end if;
  insert into public.st_payables (beneficiary_id, source_type, source_id, label, amount, schedule, note)
  values (p.contributor_id, 'program', gen_random_uuid(), (p.data ->> 'title') || ' · ' || v_n || ' order', v_sum, 'custom_terms', 'Bagi hasil 95% basis dikurangi token; kebijakan ' || coalesce(public.edu_policy() ->> 'version', 'v1'))
  returning id into v_pay;
  update public.edu_order_splits set payable_id = v_pay where id in (select id from _elig);
  perform public.st_notify(p.contributor_id, null, 'payout.status', 'Bagi hasil masuk antrean persetujuan', p.data ->> 'title', '/creator/earnings');
  return v_pay;
end $$;

revoke execute on function public.st_program_guard(), public.edu_program_guard() from public, anon, authenticated;
revoke execute on function public.st_creator_sales(), public.st_release_program_payable(uuid) from public, anon;
grant execute on function public.st_creator_sales(), public.st_release_program_payable(uuid) to authenticated;

-- program lama yang dikirim berbasis slug: tautkan draft_id agar ACK baru tetap bekerja
update public.edu_programs e set draft_id = d.id, contributor_id = d.owner_id
  from public.st_program_drafts d where d.edu_slug = e.slug and e.draft_id is null;
