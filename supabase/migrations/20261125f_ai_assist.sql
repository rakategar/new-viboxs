-- AI assist (PRD v3.0 §07.2–07.4, §17 "AI: deterministic fallback, model/provider version, cost budget,
-- prompt injection defense, human review"). Provider: DeepSeek (secret DEEPSEEK_API_KEY di edge function st-ai).
--  * AI hanya menyusun DRAF soal dan SARAN nilai esai — rilis asesmen & skor final tetap oleh reviewer manusia.
--  * Rekomendasi AI hanya memilih dari katalog tayang; server menyaring ulang. Fallback = rules-v1 (tanpa AI).
--  * Setiap panggilan tercatat (model, versi prompt, token) untuk audit & batas biaya harian.

insert into public.st_flags (key, label, description, enabled, locked, config) values
  ('ai_assist_enabled', 'AI assist (DeepSeek)', 'Draf soal, saran nilai esai, ringkasan rekomendasi. Tanpa AI semua alur tetap jalan manual.', true, false,
   '{"per_person_daily": 15, "global_daily": 300}'::jsonb)
on conflict (key) do nothing;

create table public.st_ai_runs (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.st_profiles(id) on delete set null,
  purpose text not null check (purpose in ('assessment_draft','essay_suggest','discovery_summary')),
  ref_id text,
  provider text not null default 'deepseek',
  model text,
  prompt_version text not null,
  status text not null check (status in ('ok','invalid_output','provider_error','budget_exceeded','disabled')),
  input_tokens int,
  output_tokens int,
  error text,
  created_at timestamptz not null default now()
);
create index st_ai_runs_day on public.st_ai_runs (created_at desc);
create index st_ai_runs_person on public.st_ai_runs (person_id, created_at desc);
alter table public.st_ai_runs enable row level security;
revoke all on public.st_ai_runs from anon;
revoke insert, update, delete on public.st_ai_runs from authenticated;
create policy "ai run: sendiri / commander" on public.st_ai_runs for select to authenticated
  using (person_id = (select auth.uid()) or (select public.st_is_commander()));

-- Saran AI untuk reviewer (bukan skor). Tabel terpisah agar peserta TIDAK bisa membaca saran sebelum reviewer memutuskan
-- (RLS attempts mengizinkan peserta membaca baris miliknya). Ditulis edge function (service role); dibaca Commander saja.
create table public.st_attempt_ai_suggestions (
  attempt_id uuid primary key references public.st_assessment_attempts(id) on delete cascade,
  suggestion jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.st_attempt_ai_suggestions enable row level security;
revoke all on public.st_attempt_ai_suggestions from anon;
revoke insert, update, delete on public.st_attempt_ai_suggestions from authenticated;
create policy "saran AI: commander" on public.st_attempt_ai_suggestions for select to authenticated using ((select public.st_is_commander()));

/** Konteks draf soal: hanya kontributor pemilik program (acting trainer). Webinar wajib sudah ada summary. */
create or replace function public.st_ai_assessment_context(p_program uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare p record; s record;
begin
  select * into p from public.edu_programs where id = p_program;
  if not found or p.contributor_id is distinct from auth.uid() or not public.st_acting('trainer') then
    raise exception 'Hanya kontributor pemilik program.' using errcode = '42501';
  end if;
  select * into s from public.st_session_summaries where program_id = p.id;
  if p.data ->> 'type' <> 'ebook' and s.id is null then raise exception 'Kirim summary sesi dulu — draf soal webinar disusun dari summary.'; end if;
  return jsonb_build_object(
    'kind', case when p.data ->> 'type' = 'ebook' then 'ebook' else 'webinar' end,
    'title', p.data ->> 'title', 'summary', p.data ->> 'summary', 'outcomes', p.data -> 'outcomes', 'toc', p.data -> 'toc', 'level', p.data ->> 'level',
    'session', case when s.id is null then null else jsonb_build_object('outcomes', s.outcomes, 'modules', s.modules, 'examples', s.examples, 'materials', s.materials, 'skills', s.skills) end);
end $$;

revoke execute on function public.st_ai_assessment_context(uuid) from public, anon;
grant execute on function public.st_ai_assessment_context(uuid) to authenticated;
