-- Batch 4 — Learner engine (PRD v3.0 §06, §07, §08.3; QA LEA-001..016, TOK-019).
--  * Discovery berversi: setiap simpan menambah versi + riwayat (LEA-001/002).
--  * Star Ranking = ledger aktivitas idempoten; refund membalik (LEA-013/014). Bukan sertifikasi.
--  * Kehadiran webinar hanya dengan bukti operator (LEA-006); summary kontributor wajib sebelum asesmen webinar dirilis (LEA-007).
--  * Asesmen dirilis hanya setelah review manusia (LEA-008); esai tidak pernah diberi skor final otomatis (LEA-009).
--  * Token: ledger tersedia untuk transparansi, penerbitan & penukaran OFF (TOK-019).

-- ============ discovery berversi ============
alter table public.st_learner_profiles add column if not exists version int not null default 1,
  add column if not exists privacy_version text;
create table public.st_discovery_versions (
  id bigint generated always as identity primary key,
  person_id uuid not null references public.st_profiles(id) on delete cascade,
  version int not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  unique (person_id, version)
);
alter table public.st_discovery_versions enable row level security;
revoke all on public.st_discovery_versions from anon;
create policy "discovery: sendiri / commander" on public.st_discovery_versions for select to authenticated
  using (person_id = (select auth.uid()) or (select public.st_is_commander()));

create or replace function public.st_discovery_before() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then new.version := old.version + 1; else new.version := 1; end if;
  return new;
end $$;
create or replace function public.st_discovery_after() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.st_discovery_versions (person_id, version, data)
  values (new.person_id, new.version, to_jsonb(new) - 'person_id' - 'version') on conflict do nothing;
  return new;
end $$;
create trigger b_st_lp before insert or update on public.st_learner_profiles for each row execute function public.st_discovery_before();
create trigger c_st_lp after insert or update on public.st_learner_profiles for each row execute function public.st_discovery_after();

-- ============ Star Ranking ============
create table public.st_star_events (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.st_profiles(id) on delete cascade,
  code text not null check (code in ('EBOOK_PURCHASE','WEBINAR_ATTENDANCE','WEBINAR_ASSESSMENT_PASS','EBOOK_ESSAY_PASS','REVERSAL')),
  units int not null,
  source_ref text not null,
  idem_key text not null unique,
  reverses uuid references public.st_star_events(id),
  created_at timestamptz not null default now()
);
create index st_star_events_person on public.st_star_events (person_id, created_at desc);
alter table public.st_star_events enable row level security;
revoke all on public.st_star_events from anon;
revoke insert, update, delete on public.st_star_events from authenticated;
create policy "bintang: sendiri / commander" on public.st_star_events for select to authenticated
  using (person_id = (select auth.uid()) or (select public.st_is_commander()));

create or replace function public.st_award_star(p_person uuid, p_code text, p_units int, p_ref text, p_key text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_person is null or not exists (select 1 from public.st_profiles where id = p_person) then return; end if;
  insert into public.st_star_events (person_id, code, units, source_ref, idem_key) values (p_person, p_code, p_units, p_ref, p_key) on conflict (idem_key) do nothing;
end $$;
create or replace function public.st_reverse_star(p_key text) returns void language plpgsql security definer set search_path = '' as $$
declare e record;
begin
  select * into e from public.st_star_events where idem_key = p_key;
  if not found then return; end if;
  insert into public.st_star_events (person_id, code, units, source_ref, idem_key, reverses)
  values (e.person_id, 'REVERSAL', -e.units, e.source_ref, 'REV:' || p_key, e.id) on conflict (idem_key) do nothing;
end $$;

/** +10 untuk e-book berbayar yang terverifikasi (sekali per produk & identitas); refund/chargeback membalik. */
create or replace function public.edu_entitlement_star() returns trigger language plpgsql security definer set search_path = '' as $$
declare o record; v_key text;
begin
  select o2.cash_charged, o2.product ->> 'type' as type into o from public.edu_orders o2 where o2.id = new.order_id;
  if o.type <> 'ebook' or o.cash_charged <= 0 or new.buyer_id is null then return new; end if;
  v_key := 'EBOOK_PURCHASE:' || new.program_id || ':' || new.buyer_id;
  if new.revoked_at is null then perform public.st_award_star(new.buyer_id, 'EBOOK_PURCHASE', 10, new.program_slug, v_key);
  elsif tg_op = 'UPDATE' and old.revoked_at is null then perform public.st_reverse_star(v_key); end if;
  return new;
end $$;
create trigger c_edu_ent_star after insert or update on public.edu_entitlements for each row execute function public.edu_entitlement_star();

-- ============ kehadiran (bukti operator) ============
create table public.edu_attendance (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null unique references public.edu_entitlements(id) on delete restrict,
  program_id uuid not null references public.edu_programs(id) on delete restrict,
  evidence text not null,
  verified_by uuid,
  created_at timestamptz not null default now()
);
alter table public.edu_attendance enable row level security;
revoke all on public.edu_attendance from anon;
revoke insert, update, delete on public.edu_attendance from authenticated;
create policy "hadir: peserta / commander" on public.edu_attendance for select to authenticated using (
  (select public.st_is_commander()) or exists (select 1 from public.edu_entitlements e where e.id = entitlement_id and e.buyer_id = (select auth.uid())));

create or replace function public.edu_mark_attendance(p_entitlement uuid, p_evidence text) returns void
language plpgsql security definer set search_path = '' as $$
declare e record; p record;
begin
  if not public.st_is_commander() then raise exception 'Hanya Commander / operator yang memverifikasi kehadiran.' using errcode = '42501'; end if;
  select * into e from public.edu_entitlements where id = p_entitlement;
  if not found or e.revoked_at is not null then raise exception 'Akses peserta tidak aktif.'; end if;
  select * into p from public.edu_programs where id = e.program_id;
  if p.data ->> 'type' = 'ebook' then raise exception 'E-book tidak memakai kehadiran.'; end if;
  if nullif(p.data ->> 'startsAt', '')::timestamptz is null or (p.data ->> 'startsAt')::timestamptz > now() then raise exception 'Sesi belum berlangsung.'; end if;
  if length(trim(coalesce(p_evidence, ''))) < 5 then raise exception 'Tulis bukti kehadiran (mis. laporan peserta Zoom, durasi hadir).'; end if;
  insert into public.edu_attendance (entitlement_id, program_id, evidence, verified_by) values (e.id, e.program_id, trim(p_evidence), auth.uid()) on conflict (entitlement_id) do nothing;
  if e.buyer_id is not null then
    perform public.st_award_star(e.buyer_id, 'WEBINAR_ATTENDANCE', 25, e.program_slug, 'WEBINAR_ATTENDANCE:' || e.program_id || ':' || e.buyer_id);
  end if;
end $$;

-- ============ summary sesi kontributor ============
create table public.st_session_summaries (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null unique references public.edu_programs(id) on delete restrict,
  author_id uuid not null references public.st_profiles(id) on delete cascade,
  outcomes text not null,
  modules text not null,
  examples text,
  materials text,
  skills text[] not null default '{}',
  quality_note text,
  submitted_at timestamptz not null default now(),
  late boolean not null default false
);
alter table public.st_session_summaries enable row level security;
revoke all on public.st_session_summaries from anon;
revoke insert, update, delete on public.st_session_summaries from authenticated;
create policy "summary: penulis / commander" on public.st_session_summaries for select to authenticated
  using (author_id = (select auth.uid()) or (select public.st_is_commander()));

create or replace function public.st_submit_summary(p_program uuid, p_outcomes text, p_modules text, p_examples text, p_materials text, p_skills text[], p_quality text) returns void
language plpgsql security definer set search_path = '' as $$
declare p record; v_due timestamptz;
begin
  select * into p from public.edu_programs where id = p_program;
  if not found or p.contributor_id is distinct from auth.uid() or not public.st_acting('trainer') then raise exception 'Hanya kontributor pemilik program.' using errcode = '42501'; end if;
  if p.data ->> 'type' = 'ebook' then raise exception 'Summary sesi hanya untuk webinar/workshop.'; end if;
  if nullif(p.data ->> 'startsAt', '')::timestamptz is null or (p.data ->> 'startsAt')::timestamptz > now() then raise exception 'Summary diisi setelah sesi berlangsung.'; end if;
  if length(trim(coalesce(p_outcomes, ''))) < 30 or length(trim(coalesce(p_modules, ''))) < 30 then raise exception 'Lengkapi hasil belajar dan modul (masing-masing min. 30 karakter).'; end if;
  v_due := (p.data ->> 'startsAt')::timestamptz + make_interval(days => coalesce((public.edu_policy() ->> 'summary_due_days')::int, 2)) + interval '3 hours';
  insert into public.st_session_summaries (program_id, author_id, outcomes, modules, examples, materials, skills, quality_note, late)
  values (p.id, auth.uid(), trim(p_outcomes), trim(p_modules), nullif(trim(coalesce(p_examples, '')), ''), nullif(trim(coalesce(p_materials, '')), ''), coalesce(p_skills, '{}'), nullif(trim(coalesce(p_quality, '')), ''), now() > v_due)
  on conflict (program_id) do update set outcomes = excluded.outcomes, modules = excluded.modules, examples = excluded.examples, materials = excluded.materials,
    skills = excluded.skills, quality_note = excluded.quality_note, submitted_at = now();
  perform public.st_notify(null, 'commander', 'edu.session.summary_submitted', 'Summary sesi masuk', p.data ->> 'title', '/command/assessments');
end $$;

/** Daftar sesi (webinar/workshop) yang summary-nya terlambat — alert Commander (CON-014). */
create or replace function public.st_overdue_summaries() returns table (program_id uuid, title text, starts_at timestamptz, due_at timestamptz, contributor text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.data ->> 'title', (p.data ->> 'startsAt')::timestamptz,
    (p.data ->> 'startsAt')::timestamptz + make_interval(days => coalesce((public.edu_policy() ->> 'summary_due_days')::int, 2)) + interval '3 hours',
    (select display_name from public.st_profiles where id = p.contributor_id)
  from public.edu_programs p
  where public.st_is_commander() and p.contributor_id is not null and p.data ->> 'type' <> 'ebook' and nullif(p.data ->> 'startsAt', '') is not null
    and coalesce(p.data ->> 'status', '') <> 'CANCELLED'
    and (p.data ->> 'startsAt')::timestamptz + make_interval(days => coalesce((public.edu_policy() ->> 'summary_due_days')::int, 2)) + interval '3 hours' < now()
    and not exists (select 1 from public.st_session_summaries s where s.program_id = p.id)
$$;

-- ============ asesmen ============
create table public.st_assessments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.edu_programs(id) on delete restrict,
  kind text not null check (kind in ('webinar','ebook')),
  title text not null,
  questions jsonb not null default '[]'::jsonb,
  pass_score int not null default 70 check (pass_score between 1 and 100),
  status text not null default 'DRAFT' check (status in ('DRAFT','IN_REVIEW','NEEDS_REVISION','RELEASED','ARCHIVED')),
  version int not null default 1,
  author_id uuid not null default auth.uid() references public.st_profiles(id) on delete cascade,
  review_note text,
  reviewed_by uuid,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.st_assessments enable row level security;
revoke all on public.st_assessments from anon;
revoke delete on public.st_assessments from authenticated;
create policy "asesmen: commander" on public.st_assessments for all to authenticated using ((select public.st_is_commander())) with check ((select public.st_is_commander()));
create policy "asesmen: penulis baca" on public.st_assessments for select to authenticated using (author_id = (select auth.uid()));
create policy "asesmen: kontributor buat" on public.st_assessments for insert to authenticated with check (
  author_id = (select auth.uid()) and (select public.st_acting('trainer')) and status = 'DRAFT'
  and exists (select 1 from public.edu_programs p where p.id = program_id and p.contributor_id = (select auth.uid())));
create policy "asesmen: kontributor ubah" on public.st_assessments for update to authenticated
  using (author_id = (select auth.uid()) and (select public.st_acting('trainer')) and status in ('DRAFT','NEEDS_REVISION'))
  with check (author_id = (select auth.uid()) and status in ('DRAFT','IN_REVIEW'));
create trigger t_st_asm before update on public.st_assessments for each row execute function public.touch_updated_at();

/** Validasi bentuk soal + syarat summary sebelum review (LEA-007). */
create or replace function public.st_assessment_guard() returns trigger language plpgsql security definer set search_path = '' as $$
declare q jsonb; v_type text;
begin
  select data ->> 'type' into v_type from public.edu_programs where id = new.program_id;
  if new.kind = 'ebook' and v_type <> 'ebook' or new.kind = 'webinar' and v_type = 'ebook' then raise exception 'Jenis asesmen tidak sesuai format program.'; end if;
  if tg_op = 'UPDATE' and old.status = 'RELEASED' and new.questions is distinct from old.questions then raise exception 'Asesmen yang sudah dirilis tidak bisa diubah — buat versi baru.'; end if;
  if new.status in ('IN_REVIEW','RELEASED') then
    if jsonb_typeof(new.questions) <> 'array' or jsonb_array_length(new.questions) = 0 then raise exception 'Tambahkan minimal satu soal.'; end if;
    for q in select * from jsonb_array_elements(new.questions) loop
      if length(coalesce(q ->> 'prompt', '')) < 10 then raise exception 'Setiap soal wajib punya pertanyaan (min. 10 karakter).'; end if;
      if length(coalesce(q ->> 'source', '')) < 3 then raise exception 'Setiap soal wajib punya acuan sumber (modul/bab/halaman).'; end if;
      if q ->> 'type' = 'mcq' then
        if jsonb_array_length(coalesce(q -> 'options', '[]')) < 2 or (q ->> 'answer') is null or (q ->> 'answer')::int >= jsonb_array_length(q -> 'options') then
          raise exception 'Soal pilihan ganda wajib punya ≥2 opsi dan kunci jawaban.'; end if;
      elsif q ->> 'type' = 'essay' then
        if length(coalesce(q ->> 'rubric', '')) < 20 then raise exception 'Soal esai wajib punya rubrik penilaian (min. 20 karakter).'; end if;
      else raise exception 'Tipe soal tidak dikenal.'; end if;
    end loop;
    if new.kind = 'webinar' and not exists (select 1 from public.st_session_summaries where program_id = new.program_id) then
      raise exception 'Summary sesi belum dikirim — asesmen webinar belum bisa direview.';
    end if;
  end if;
  if new.status = 'RELEASED' and not public.st_is_commander() then raise exception 'Rilis asesmen hanya oleh reviewer (Commander).' using errcode = '42501'; end if;
  if tg_op = 'UPDATE' and new.status = 'IN_REVIEW' and old.status <> 'IN_REVIEW' then
    perform public.st_notify(null, 'commander', 'learn.assessment.submitted', 'Asesmen menunggu review', new.title, '/command/assessments');
  end if;
  return new;
end $$;
create trigger g_st_asm before insert or update on public.st_assessments for each row execute function public.st_assessment_guard();

create or replace function public.st_assessment_decide(p_id uuid, p_release boolean, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare a record;
begin
  if not public.st_is_commander() then raise exception 'Hanya Commander.' using errcode = '42501'; end if;
  select * into a from public.st_assessments where id = p_id for update;
  if a.status <> 'IN_REVIEW' then raise exception 'Asesmen tidak sedang menunggu review.'; end if;
  if not p_release and length(trim(coalesce(p_note, ''))) < 10 then raise exception 'Tulis catatan revisi (min. 10 karakter).'; end if;
  update public.st_assessments set status = case when p_release then 'RELEASED' else 'NEEDS_REVISION' end, review_note = nullif(trim(coalesce(p_note, '')), ''),
    reviewed_by = auth.uid(), released_at = case when p_release then now() end where id = p_id;
  perform public.st_notify(a.author_id, null, 'learn.assessment.reviewed', case when p_release then 'Asesmen dirilis ke peserta' else 'Asesmen perlu revisi' end, a.title, '/creator/assessments');
end $$;

create table public.st_assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.st_assessments(id) on delete restrict,
  person_id uuid not null references public.st_profiles(id) on delete cascade,
  assessment_version int not null,
  answers jsonb not null,
  mcq_correct int not null default 0,
  mcq_total int not null default 0,
  status text not null check (status in ('SCORED','NEEDS_REVIEW','REVIEWED')),
  score numeric(5,2),
  feedback text,
  reviewer_id uuid,
  reviewed_at timestamptz,
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (assessment_id, person_id)
);
alter table public.st_assessment_attempts enable row level security;
revoke all on public.st_assessment_attempts from anon;
revoke insert, update, delete on public.st_assessment_attempts from authenticated;
create policy "jawaban: sendiri / commander" on public.st_assessment_attempts for select to authenticated
  using (person_id = (select auth.uid()) or (select public.st_is_commander()));

create or replace function public.st_entitled(p_program uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.edu_entitlements where program_id = p_program and buyer_id = auth.uid() and revoked_at is null)
$$;

/** Daftar asesmen yang dirilis untuk program yang benar-benar dimiliki learner (LEA-011). */
create or replace function public.st_my_assessments() returns table (id uuid, program_id uuid, program_title text, kind text, title text, pass_score int, questions int,
  attempt_status text, score numeric, feedback text)
language sql stable security definer set search_path = '' as $$
  select a.id, a.program_id, p.data ->> 'title', a.kind, a.title, a.pass_score, jsonb_array_length(a.questions), t.status, t.score, t.feedback
  from public.st_assessments a join public.edu_programs p on p.id = a.program_id
  left join public.st_assessment_attempts t on t.assessment_id = a.id and t.person_id = auth.uid()
  where a.status = 'RELEASED' and public.st_entitled(a.program_id)
  order by a.released_at desc
$$;

/** Soal tanpa kunci jawaban & rubrik — hanya untuk pemilik entitlement. */
create or replace function public.st_assessment_paper(p_id uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare a record;
begin
  select * into a from public.st_assessments where id = p_id and status = 'RELEASED';
  if not found or not public.st_entitled(a.program_id) then raise exception 'Asesmen hanya untuk peserta program ini.' using errcode = '42501'; end if;
  return jsonb_build_object('id', a.id, 'title', a.title, 'kind', a.kind, 'pass_score', a.pass_score,
    'questions', (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('type', q ->> 'type', 'prompt', q ->> 'prompt', 'options', q -> 'options', 'source', q ->> 'source'))), '[]'::jsonb)
                  from jsonb_array_elements(a.questions) q));
end $$;

create or replace function public.st_attempt_star(p_attempt uuid) returns void language plpgsql security definer set search_path = '' as $$
declare t record; a record;
begin
  select * into t from public.st_assessment_attempts where id = p_attempt;
  select * into a from public.st_assessments where id = t.assessment_id;
  if t.score is null or t.score < a.pass_score then return; end if;
  if a.kind = 'webinar' then
    perform public.st_award_star(t.person_id, 'WEBINAR_ASSESSMENT_PASS', 60, a.title, 'WEBINAR_ASSESSMENT_PASS:' || a.id || ':' || t.person_id);
  else
    perform public.st_award_star(t.person_id, 'EBOOK_ESSAY_PASS', 50, a.title, 'EBOOK_ESSAY_PASS:' || a.program_id || ':' || t.person_id);
  end if;
end $$;

/** Kirim jawaban. PG dinilai mesin; ada esai → antrean review manusia (tanpa skor final otomatis). */
create or replace function public.st_submit_attempt(p_id uuid, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a record; q jsonb; i int := 0; v_ok int := 0; v_mcq int := 0; v_essay boolean := false; v_ans jsonb; v_id uuid; v_score numeric;
begin
  select * into a from public.st_assessments where id = p_id and status = 'RELEASED';
  if not found or not public.st_entitled(a.program_id) then raise exception 'Asesmen hanya untuk peserta program ini.' using errcode = '42501'; end if;
  if exists (select 1 from public.st_assessment_attempts where assessment_id = p_id and person_id = auth.uid()) then raise exception 'Jawaban sudah dikirim. Ajukan banding bila ingin ditinjau ulang.'; end if;
  if jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) <> jsonb_array_length(a.questions) then raise exception 'Jawab semua soal.'; end if;
  for q in select * from jsonb_array_elements(a.questions) loop
    v_ans := p_answers -> i;
    if q ->> 'type' = 'mcq' then
      v_mcq := v_mcq + 1;
      if jsonb_typeof(v_ans) = 'number' and (v_ans #>> '{}')::int = (q ->> 'answer')::int then v_ok := v_ok + 1; end if;
    else
      v_essay := true;
      if length(coalesce(v_ans #>> '{}', '')) < 30 then raise exception 'Jawaban esai minimal 30 karakter.'; end if;
    end if;
    i := i + 1;
  end loop;
  v_score := case when v_essay then null when v_mcq = 0 then null else round(100.0 * v_ok / v_mcq, 2) end;
  insert into public.st_assessment_attempts (assessment_id, person_id, assessment_version, answers, mcq_correct, mcq_total, status, score)
  values (p_id, auth.uid(), a.version, p_answers, v_ok, v_mcq, case when v_essay then 'NEEDS_REVIEW' else 'SCORED' end, v_score) returning id into v_id;
  if v_essay then perform public.st_notify(null, 'commander', 'learn.assessment.review', 'Jawaban esai menunggu penilaian', a.title, '/command/assessments');
  else perform public.st_attempt_star(v_id); end if;
  return jsonb_build_object('status', case when v_essay then 'NEEDS_REVIEW' else 'SCORED' end, 'score', v_score, 'mcq_correct', v_ok, 'mcq_total', v_mcq);
end $$;

/** Banding: kembali ke antrean reviewer; skor & riwayat lama tetap tersimpan (LEA-012). */
create or replace function public.st_appeal_attempt(p_attempt uuid, p_reason text) returns void language plpgsql security definer set search_path = '' as $$
declare t record;
begin
  select * into t from public.st_assessment_attempts where id = p_attempt for update;
  if not found or t.person_id <> auth.uid() then raise exception 'Tidak berhak.' using errcode = '42501'; end if;
  if t.status = 'NEEDS_REVIEW' then raise exception 'Jawaban sedang ditinjau.'; end if;
  if length(trim(coalesce(p_reason, ''))) < 15 then raise exception 'Jelaskan alasan banding (min. 15 karakter).'; end if;
  update public.st_assessment_attempts set status = 'NEEDS_REVIEW',
    history = history || jsonb_build_array(jsonb_build_object('event', 'appeal', 'reason', trim(p_reason), 'prev_score', t.score, 'at', now())) where id = t.id;
  perform public.st_notify(null, 'commander', 'learn.assessment.appeal', 'Banding asesmen', left(p_reason, 120), '/command/assessments');
end $$;

create or replace function public.st_review_attempt(p_attempt uuid, p_score numeric, p_feedback text) returns void language plpgsql security definer set search_path = '' as $$
declare t record;
begin
  if not public.st_is_commander() then raise exception 'Hanya reviewer (Commander).' using errcode = '42501'; end if;
  select * into t from public.st_assessment_attempts where id = p_attempt for update;
  if t.status <> 'NEEDS_REVIEW' then raise exception 'Jawaban ini tidak menunggu review.'; end if;
  if p_score is null or p_score < 0 or p_score > 100 then raise exception 'Skor 0–100.'; end if;
  if length(trim(coalesce(p_feedback, ''))) < 15 then raise exception 'Tulis umpan balik yang menjelaskan skor (min. 15 karakter).'; end if;
  update public.st_assessment_attempts set status = 'REVIEWED', score = greatest(coalesce(t.score, 0), p_score) , feedback = trim(p_feedback), reviewer_id = auth.uid(), reviewed_at = now(),
    history = history || jsonb_build_array(jsonb_build_object('event', 'review', 'score', p_score, 'prev_score', t.score, 'reviewer', auth.uid(), 'at', now())) where id = t.id;
  perform public.st_attempt_star(t.id);
  perform public.st_notify(t.person_id, null, 'learn.assessment.reviewed', 'Hasil asesmen tersedia', 'Skor ' || p_score::text, '/learn/report');
end $$;

-- ============ token ledger (penerbitan & penukaran OFF) ============
create table public.st_token_ledger (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.st_profiles(id) on delete cascade,
  wallet text not null check (wallet in ('learner','contributor')),
  delta int not null,
  state text not null check (state in ('AWARDED','AVAILABLE','RESERVED','SPENT','RELEASED','EXPIRED','REVERSED')),
  source text not null,
  idem_key text not null unique,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.st_token_ledger enable row level security;
revoke all on public.st_token_ledger from anon;
revoke insert, update, delete on public.st_token_ledger from authenticated;
create policy "token: sendiri / commander" on public.st_token_ledger for select to authenticated
  using (person_id = (select auth.uid()) or (select public.st_is_commander()));

/** TOK-019: server menolak penukaran selama flag OFF. Tidak ada jalur lain untuk memakai token. */
create or replace function public.st_token_redeem(p_order_no text, p_tokens int) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce((select enabled from public.st_flags where key = 'token_redemption_enabled'), false) then
    raise exception 'Penukaran token belum aktif — menunggu persetujuan Legal & Finance.' using errcode = '42501';
  end if;
  raise exception 'Penukaran token belum diimplementasikan untuk checkout.';
end $$;

revoke execute on function public.st_discovery_before(), public.st_discovery_after(), public.st_award_star(uuid, text, int, text, text), public.st_reverse_star(text),
  public.edu_entitlement_star(), public.st_assessment_guard(), public.st_attempt_star(uuid) from public, anon, authenticated;
revoke execute on function public.edu_mark_attendance(uuid, text), public.st_submit_summary(uuid, text, text, text, text, text[], text), public.st_overdue_summaries(),
  public.st_assessment_decide(uuid, boolean, text), public.st_entitled(uuid), public.st_my_assessments(), public.st_assessment_paper(uuid),
  public.st_submit_attempt(uuid, jsonb), public.st_appeal_attempt(uuid, text), public.st_review_attempt(uuid, numeric, text), public.st_token_redeem(text, int) from public, anon;
grant execute on function public.edu_mark_attendance(uuid, text), public.st_submit_summary(uuid, text, text, text, text, text[], text), public.st_overdue_summaries(),
  public.st_assessment_decide(uuid, boolean, text), public.st_entitled(uuid), public.st_my_assessments(), public.st_assessment_paper(uuid),
  public.st_submit_attempt(uuid, jsonb), public.st_appeal_attempt(uuid, text), public.st_review_attempt(uuid, numeric, text), public.st_token_redeem(text, int) to authenticated;
