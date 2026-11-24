-- Lowongan perusahaan (PRD v3.0 §09.3 langkah 2): jabatan, kebutuhan kemampuan, lokasi/remote, jenis kontrak,
-- rentang kompensasi (opsional ditampilkan), proses seleksi, kontak HR internal.
--  * Bukan papan lowongan publik: hanya perusahaan pemilik yang membaca; kandidat melihat ringkasan lowongan HANYA lewat undangan miliknya.
--  * Kontak HR internal tidak pernah ditampilkan ke kandidat. Kompensasi tampil ke kandidat hanya bila show_comp.
create table public.st_vacancies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.st_companies(id) on delete cascade,
  title text not null check (length(trim(title)) >= 3),
  skills text[] not null default '{}',
  location text,
  work_mode text not null default 'remote' check (work_mode in ('onsite','hybrid','remote')),
  contract_type text not null default 'fulltime' check (contract_type in ('fulltime','parttime','contract','internship','freelance')),
  comp_range text,
  show_comp boolean not null default false,
  process text,
  hr_contact text,
  status text not null default 'OPEN' check (status in ('OPEN','CLOSED')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index st_vacancies_company on public.st_vacancies (company_id, status);
alter table public.st_vacancies enable row level security;
revoke all on public.st_vacancies from anon;
revoke delete on public.st_vacancies from authenticated;
create policy "lowongan: perusahaan pemilik / commander" on public.st_vacancies for select to authenticated
  using (company_id = (select public.st_my_company('HIRING_VIEW')) or (select public.st_is_commander()));
create policy "lowongan: buat" on public.st_vacancies for insert to authenticated
  with check (company_id = (select public.st_my_company('HIRING_MANAGE')));
create policy "lowongan: ubah" on public.st_vacancies for update to authenticated
  using (company_id = (select public.st_my_company('HIRING_MANAGE')))
  with check (company_id = (select public.st_my_company('HIRING_MANAGE')));
create trigger t_st_vac before update on public.st_vacancies for each row execute function public.touch_updated_at();

alter table public.st_hiring_invites add column if not exists vacancy_id uuid references public.st_vacancies(id) on delete set null;

/** Undangan berdasar lowongan: judul diambil dari lowongan OPEN milik perusahaan; aturan opt-in/Ranger/batas harian tetap dari st_hiring_invite. */
create or replace function public.st_hiring_invite_for(p_candidate uuid, p_vacancy uuid, p_message text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v record; v_id uuid;
begin
  select * into v from public.st_vacancies where id = p_vacancy and company_id = public.st_my_company('HIRING_MANAGE');
  if not found then raise exception 'Lowongan tidak ditemukan.' using errcode = '42501'; end if;
  if v.status <> 'OPEN' then raise exception 'Lowongan sudah ditutup.'; end if;
  v_id := public.st_hiring_invite(p_candidate, v.title, p_message);
  update public.st_hiring_invites set vacancy_id = v.id where id = v_id;
  return v_id;
end $$;

/** Ringkasan lowongan untuk pihak undangan. Kandidat: tanpa kontak HR; kompensasi hanya bila show_comp. */
create or replace function public.st_hiring_vacancy(p_invite uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_side text := public.st_hiring_party(p_invite); v record;
begin
  if v_side is null then raise exception 'Tidak berhak.' using errcode = '42501'; end if;
  select x.* into v from public.st_hiring_invites h join public.st_vacancies x on x.id = h.vacancy_id where h.id = p_invite;
  if not found then return null; end if;
  return jsonb_strip_nulls(jsonb_build_object('title', v.title, 'skills', v.skills, 'location', v.location, 'work_mode', v.work_mode,
    'contract_type', v.contract_type, 'process', v.process, 'comp_range', case when v.show_comp or v_side = 'company' then v.comp_range end));
end $$;

revoke execute on function public.st_hiring_invite_for(uuid, uuid, text), public.st_hiring_vacancy(uuid) from public, anon;
grant execute on function public.st_hiring_invite_for(uuid, uuid, text), public.st_hiring_vacancy(uuid) to authenticated;
