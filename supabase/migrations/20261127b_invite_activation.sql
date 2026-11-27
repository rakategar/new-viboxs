-- v4 WP01 — Aktivasi Kontributor aman (QA V4-AT-001..010, V4-CP-002, AUT-005..008).
--  * Setujui aplikasi = 1 langkah: approve → undangan sekali pakai (default 24 jam) → email aktivasi lewat outbox.
--  * Token undangan TIDAK PERNAH dikembalikan ke browser. Plaintext hanya disimpan sementara di st_outbox_secrets
--    (tanpa grant ke anon/authenticated) untuk dikirim edge function st-notify, lalu dihapus setelah terkirim.
--  * Email tidak pernah berisi password. Username = email yang diundang. Link dibangun dari STUDIO_ORIGIN di server.
--  * Resend mencabut undangan lama (perilaku st_create_invite v3 dipertahankan). Permintaan kirim ulang dari pemegang
--    tautan kedaluwarsa hanya memberi tahu Commander, tidak menerbitkan token baru otomatis (V4-AT-005).
--  * st_outbox generik dipakai juga oleh WP02 (pengajuan perusahaan). WhatsApp: baris skipped_provider_off.
-- Rollback: drop function st_application_approve, st_invite_reissue, st_invite_request_resend, st_issue_invite,
--   st_outbox_claim, st_outbox_done; drop table st_outbox_secrets, st_outbox; kembalikan st_create_invite/st_invite_peek
--   dari 20261125d (signature lama p_days).

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

insert into public.st_flags (key, label, description, enabled, locked, config) values
  ('invite_policy', 'Kebijakan undangan', 'Masa berlaku tautan aktivasi (jam). v4: default 24 jam, sekali pakai.', true, false, '{"expiry_hours":24}'::jsonb)
on conflict (key) do nothing;

alter table public.st_invites add column if not exists resend_requested_at timestamptz;

create table if not exists public.st_outbox (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  aggregate_id uuid not null,
  channel text not null check (channel in ('email','whatsapp')),
  recipient text not null,
  template text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','sending','sent','failed','retry_pending','skipped_provider_off','cancelled')),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  sent_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (topic, aggregate_id, channel)
);
create index if not exists st_outbox_due on public.st_outbox (next_attempt_at) where status in ('queued','retry_pending','sending');
alter table public.st_outbox enable row level security;
revoke all on public.st_outbox from anon, authenticated;
grant select on public.st_outbox to authenticated;
create policy "outbox: commander baca" on public.st_outbox for select to authenticated using ((select public.st_is_commander()));
create trigger t_st_outbox before update on public.st_outbox for each row execute function public.touch_updated_at();

create table if not exists public.st_outbox_secrets (
  outbox_id uuid primary key references public.st_outbox(id) on delete cascade,
  secret text not null,
  expires_at timestamptz not null
);
alter table public.st_outbox_secrets enable row level security;
revoke all on public.st_outbox_secrets from anon, authenticated;

/** Internal: terbitkan undangan + antre email aktivasi. Tidak dibuka ke klien. */
create or replace function public.st_issue_invite(p_email text, p_roles text[], p_application uuid, p_hours int, p_legacy boolean, p_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_token text; v_id uuid; v_ob uuid; v_hours int; v_exp timestamptz; v_email text := lower(trim(p_email)); v_has boolean; v_tpl text;
begin
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then raise exception 'Email tidak valid.'; end if;
  if coalesce(array_length(p_roles, 1), 0) = 0 or not (p_roles <@ array['ranger','trainer','opc_founder','business_partner','collaborator','operator','company_partner']) then
    raise exception 'Pilih minimal satu peran profesional yang valid.';
  end if;
  v_hours := greatest(1, least(coalesce(p_hours, ((select config ->> 'expiry_hours' from public.st_flags where key = 'invite_policy'))::int, 24), 168));
  v_exp := now() + make_interval(hours => v_hours);
  update public.st_invites set status = 'revoked' where lower(email) = v_email and status = 'pending';
  update public.st_outbox set status = 'cancelled', last_error = 'Diganti undangan baru'
   where topic = 'invite.activation' and status in ('queued','retry_pending','failed')
     and aggregate_id in (select id from public.st_invites where lower(email) = v_email and status = 'revoked');
  delete from public.st_outbox_secrets s using public.st_outbox o where o.id = s.outbox_id and o.status = 'cancelled';
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.st_invites (token_hash, email, roles, application_id, expires_at, created_by, legacy)
  values (encode(extensions.digest(v_token, 'sha256'), 'hex'), v_email, p_roles, p_application, v_exp, auth.uid(), coalesce(p_legacy, false) and 'ranger' = any(p_roles))
  returning id into v_id;
  v_has := exists (select 1 from auth.users where lower(email) = v_email);
  v_tpl := case when 'trainer' = any(p_roles) then 'contributor_approved' when 'company_partner' = any(p_roles) then 'company_invite' else 'role_invite' end;
  insert into public.st_outbox (topic, aggregate_id, channel, recipient, template, payload)
  values ('invite.activation', v_id, 'email', v_email, v_tpl,
    jsonb_build_object('name', nullif(trim(coalesce(p_name, '')), ''), 'email', v_email, 'roles', to_jsonb(p_roles), 'hours', v_hours, 'expires_at', v_exp, 'has_account', v_has))
  returning id into v_ob;
  insert into public.st_outbox_secrets (outbox_id, secret, expires_at) values (v_ob, v_token, v_exp);
  if p_application is not null then update public.st_applications set status = 'invited', decided_by = auth.uid(), decided_at = now() where id = p_application; end if;
  return v_id;
end $$;
revoke execute on function public.st_issue_invite(text, text[], uuid, int, boolean, text) from public, anon, authenticated;

-- Undangan manual (Commander → Orang & undangan). Token tidak lagi dikembalikan; dikirim lewat email.
drop function if exists public.st_create_invite(text, text[], uuid, integer, boolean);
create or replace function public.st_create_invite(p_email text, p_roles text[], p_application uuid, p_hours int default null, p_legacy boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public.st_require_mfa();
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  if 'company_partner' = any(p_roles) then raise exception 'Undangan perusahaan dibuat dari verifikasi perusahaan.'; end if;
  v_id := public.st_issue_invite(p_email, p_roles, p_application, p_hours, p_legacy,
    (select name from public.st_applications where id = p_application));
  return jsonb_build_object('id', v_id);
end $$;
revoke execute on function public.st_create_invite(text, text[], uuid, int, boolean) from public, anon;
grant execute on function public.st_create_invite(text, text[], uuid, int, boolean) to authenticated;

/** Setujui aplikasi + kirim aktivasi dalam satu langkah. Juga dipakai untuk "Kirim ulang aktivasi". */
create or replace function public.st_application_approve(p_id uuid, p_note text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a record; v_inv uuid;
begin
  perform public.st_require_mfa();
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  select * into a from public.st_applications where id = p_id for update;
  if not found then raise exception 'Aplikasi tidak ditemukan.'; end if;
  if a.status not in ('submitted','in_review','need_info','approved','invited') then raise exception 'Aplikasi berstatus % tidak bisa disetujui.', a.status; end if;
  if coalesce(a.email, '') = '' then raise exception 'Aplikasi ini tidak memiliki email — minta pemohon mendaftar ulang.'; end if;
  update public.st_applications set status = 'approved', reviewer_note = coalesce(nullif(trim(coalesce(p_note, '')), ''), reviewer_note),
    decided_by = auth.uid(), decided_at = now() where id = p_id;
  v_inv := public.st_issue_invite(a.email, array[a.type], a.id, null, false, a.name);
  return jsonb_build_object('invite_id', v_inv);
end $$;
revoke execute on function public.st_application_approve(uuid, text) from public, anon;
grant execute on function public.st_application_approve(uuid, text) to authenticated;

/** Kirim ulang undangan yang sudah ada (orang & peran sama); undangan lama dicabut. */
create or replace function public.st_invite_reissue(p_invite uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare i record; v_id uuid;
begin
  perform public.st_require_mfa();
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  select * into i from public.st_invites where id = p_invite;
  if not found then raise exception 'Undangan tidak ditemukan.'; end if;
  if i.status = 'accepted' then raise exception 'Undangan sudah diterima — tidak perlu dikirim ulang.'; end if;
  v_id := public.st_issue_invite(i.email, i.roles, i.application_id, null, i.legacy,
    (select name from public.st_applications where id = i.application_id));
  return jsonb_build_object('id', v_id);
end $$;
revoke execute on function public.st_invite_reissue(uuid) from public, anon;
grant execute on function public.st_invite_reissue(uuid) to authenticated;

/** Pemegang tautan kedaluwarsa/dicabut minta kirim ulang → hanya notifikasi Commander (maks. 1×/jam). Selalu diam. */
create or replace function public.st_invite_request_resend(p_token text)
returns void language plpgsql security definer set search_path = '' as $$
declare i record;
begin
  select * into i from public.st_invites where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex') for update;
  if not found or i.status = 'accepted' then return; end if;
  if i.resend_requested_at is not null and i.resend_requested_at > now() - interval '1 hour' then return; end if;
  update public.st_invites set resend_requested_at = now() where id = i.id;
  perform public.st_notify(null, 'commander', 'invite.resend_requested', 'Permintaan kirim ulang undangan', i.email || ' · ' || array_to_string(i.roles, ', '), '/command/people');
end $$;
revoke execute on function public.st_invite_request_resend(text) from public;
grant execute on function public.st_invite_request_resend(text) to anon, authenticated;

/** Halaman /invite: pemegang tautan melihat email lengkap (= username) dan apakah akun sudah ada. */
create or replace function public.st_invite_peek(p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((
    select case when i.status = 'pending' and i.expires_at >= now() then
        jsonb_build_object('state', 'pending', 'roles', i.roles, 'email', i.email, 'expires_at', i.expires_at,
          'has_account', exists (select 1 from auth.users u where lower(u.email) = lower(i.email)))
      else jsonb_build_object('state', case when i.status <> 'pending' then i.status else 'expired' end, 'roles', i.roles,
          'email_hint', regexp_replace(i.email, '^(.).*(@.*)$', '\1•••\2'))
      end
    from public.st_invites i where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')), jsonb_build_object('state', 'invalid'))
$$;

/** Edge st-activate (service role): validasi token sebelum membuat akun. */
create or replace function public.st_invite_for_activation(p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((
    select jsonb_build_object('state', case when i.status <> 'pending' then i.status when i.expires_at < now() then 'expired' else 'pending' end,
      'email', i.email, 'name', (select a.name from public.st_applications a where a.id = i.application_id),
      'has_account', exists (select 1 from auth.users u where lower(u.email) = lower(i.email)))
    from public.st_invites i where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')), jsonb_build_object('state', 'invalid'))
$$;
revoke execute on function public.st_invite_for_activation(text) from public, anon, authenticated;

-- Nama tampilan awal dari aplikasi (bukan potongan email) saat undangan diterima.
do $$
declare def text; old_sql text; new_sql text;
begin
  def := pg_get_functiondef('public.st_accept_invite(text)'::regprocedure);
  old_sql := $o$values (uid, i.email, split_part(i.email, '@', 1)) on conflict (id) do nothing;$o$;
  new_sql := $n$values (uid, i.email, coalesce((select nullif(trim(a.name), '') from public.st_applications a where a.id = i.application_id), split_part(i.email, '@', 1))) on conflict (id) do nothing;$n$;
  if position('a.id = i.application_id' in def) = 0 then
    if position(old_sql in def) = 0 then raise exception 'Insert profil tidak ditemukan di st_accept_invite.'; end if;
    execute replace(def, old_sql, new_sql);
  end if;
end $$;

/** Worker outbox (service role): klaim baris jatuh tempo; 'sending' > 10 menit dianggap macet dan diambil ulang. */
create or replace function public.st_outbox_claim(p_limit int)
returns table (id uuid, topic text, aggregate_id uuid, channel text, recipient text, template text, payload jsonb, attempts int, secret text)
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with due as (
    select o.id from public.st_outbox o
    where o.channel = 'email' and ((o.status in ('queued','retry_pending') and o.next_attempt_at <= now()) or (o.status = 'sending' and o.updated_at < now() - interval '10 minutes'))
    order by o.next_attempt_at limit greatest(1, least(coalesce(p_limit, 10), 25)) for update skip locked
  ), upd as (
    update public.st_outbox o set status = 'sending', attempts = o.attempts + 1 from due where o.id = due.id
    returning o.id, o.topic, o.aggregate_id, o.channel, o.recipient, o.template, o.payload, o.attempts
  )
  select u.id, u.topic, u.aggregate_id, u.channel, u.recipient, u.template, u.payload, u.attempts, s.secret
  from upd u left join public.st_outbox_secrets s on s.outbox_id = u.id and s.expires_at > now();
end $$;

create or replace function public.st_outbox_done(p_id uuid, p_ok boolean, p_error text)
returns void language plpgsql security definer set search_path = '' as $$
declare o record;
begin
  select * into o from public.st_outbox where id = p_id for update;
  if not found then return; end if;
  if p_ok then
    update public.st_outbox set status = 'sent', sent_at = now(), last_error = null where id = p_id;
    delete from public.st_outbox_secrets where outbox_id = p_id;
  elsif o.attempts >= 5 or coalesce(p_error, '') like 'TOKEN_EXPIRED%' then
    update public.st_outbox set status = 'failed', last_error = left(p_error, 300) where id = p_id;
    perform public.st_notify(null, 'commander', 'outbox.failed', 'Email gagal terkirim', o.recipient || ' · ' || o.template, '/command/people');
  else
    update public.st_outbox set status = 'retry_pending', last_error = left(p_error, 300),
      next_attempt_at = now() + make_interval(mins => (power(2, o.attempts))::int) where id = p_id;
  end if;
end $$;
revoke execute on function public.st_outbox_claim(int), public.st_outbox_done(uuid, boolean, text) from public, anon, authenticated;

/** Commander: kirim ulang email outbox yang gagal (token yang sama selama undangan masih berlaku). */
create or replace function public.st_outbox_retry(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  update public.st_outbox set status = 'queued', attempts = 0, next_attempt_at = now(), last_error = null
   where id = p_id and status in ('failed','retry_pending');
end $$;
revoke execute on function public.st_outbox_retry(uuid) from public, anon;
grant execute on function public.st_outbox_retry(uuid) to authenticated;

-- Fallback pengiriman: pg_cron tiap 5 menit memanggil st-notify HANYA bila ada email jatuh tempo (retry/backoff).
select cron.unschedule(jobid) from cron.job where jobname = 'st-notify-outbox';
select cron.schedule('st-notify-outbox', '*/5 * * * *', $c$
  select net.http_post(url := 'https://lbouqcovrnuhahrcnpki.supabase.co/functions/v1/st-notify',
    headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb)
  where exists (select 1 from public.st_outbox where channel = 'email'
    and ((status in ('queued','retry_pending') and next_attempt_at <= now()) or (status = 'sending' and updated_at < now() - interval '10 minutes')));
$c$);

-- Aplikasi ditolak setelah undangan terkirim → undangan pending dicabut dan email antre dibatalkan.
create or replace function public.st_application_after() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'declined' and old.status <> 'declined' then
    update public.st_invites set status = 'revoked' where application_id = new.id and status = 'pending';
    update public.st_outbox set status = 'cancelled', last_error = 'Aplikasi ditolak'
     where topic = 'invite.activation' and status in ('queued','retry_pending','failed','sending')
       and aggregate_id in (select id from public.st_invites where application_id = new.id);
    delete from public.st_outbox_secrets s using public.st_outbox o where o.id = s.outbox_id and o.status = 'cancelled';
  end if;
  return new;
end $$;
drop trigger if exists st_app_after on public.st_applications;
create trigger st_app_after after update of status on public.st_applications for each row execute function public.st_application_after();
revoke execute on function public.st_application_after() from public, anon, authenticated;

-- Undangan dicabut/kedaluwarsa dari jalur mana pun (mis. tombol "Cabut") → email antre dibatalkan, secret dihapus.
create or replace function public.st_invite_after() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('revoked','expired') and old.status = 'pending' then
    update public.st_outbox set status = 'cancelled', last_error = 'Undangan ' || new.status
     where topic = 'invite.activation' and aggregate_id = new.id and status in ('queued','retry_pending','failed','sending');
    delete from public.st_outbox_secrets s using public.st_outbox o where o.id = s.outbox_id and o.aggregate_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists st_invite_after on public.st_invites;
create trigger st_invite_after after update of status on public.st_invites for each row execute function public.st_invite_after();
revoke execute on function public.st_invite_after() from public, anon, authenticated;
