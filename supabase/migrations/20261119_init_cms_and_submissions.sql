-- Project Supabase "viboxs" (ref lbouqcovrnuhahrcnpki). Sudah diterapkan lewat MCP; file ini sebagai catatan skema.
-- Akun admin dibuat terpisah (auth.users, app_metadata.role = 'admin') — kredensial TIDAK disimpan di repo.

create or replace function public.is_admin() returns boolean
language sql stable security invoker set search_path = '' as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  kind text not null check (kind in ('contact','mission','collab','help','notify','register')),
  site text not null,
  name text, email text, phone text, subject text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new','review','accepted','rejected','done','spam')),
  admin_note text,
  email_status text not null default 'pending',
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index submissions_kind_created on public.submissions (kind, created_at desc);
create index submissions_ip_created on public.submissions (ip_hash, created_at desc);
alter table public.submissions enable row level security;
-- tidak ada akses anon: kiriman masuk lewat edge function "submit" (service role)
create policy "admin read submissions" on public.submissions for select to authenticated using ((select public.is_admin()));
create policy "admin update submissions" on public.submissions for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin delete submissions" on public.submissions for delete to authenticated using ((select public.is_admin()));

create table public.edu_programs (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  data jsonb not null,
  published boolean not null default true,
  position int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.edu_programs enable row level security;
create policy "public read published programs" on public.edu_programs for select to anon, authenticated using (published or (select public.is_admin()));
create policy "admin insert programs" on public.edu_programs for insert to authenticated with check ((select public.is_admin()));
create policy "admin update programs" on public.edu_programs for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin delete programs" on public.edu_programs for delete to authenticated using ((select public.is_admin()));

create table public.edu_content (
  key text primary key,            -- home | paths | faq | steps | settings
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.edu_content enable row level security;
create policy "public read content" on public.edu_content for select to anon, authenticated using (true);
create policy "admin insert content" on public.edu_content for insert to authenticated with check ((select public.is_admin()));
create policy "admin update content" on public.edu_content for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin delete content" on public.edu_content for delete to authenticated using ((select public.is_admin()));

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger t_sub before update on public.submissions for each row execute function public.touch_updated_at();
create trigger t_prog before update on public.edu_programs for each row execute function public.touch_updated_at();
create trigger t_cont before update on public.edu_content for each row execute function public.touch_updated_at();
