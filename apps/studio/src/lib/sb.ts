import { STUDIO_ORIGIN } from '@viboxs/shared/ecosystem';
import { createClient, type PostgrestError } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from '@viboxs/shared/backend';

/**
 * Klien Supabase Studio. Sesi host-only (localStorage studio.viboxs.com), terpisah dari CMS EDU.
 * Otorisasi SELALU di server (RLS + RPC security definer) — UI hanya menyembunyikan yang tidak relevan.
 */
export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'viboxs-studio', detectSessionInUrl: true },
});

export type Role = 'commander' | 'operator' | 'ranger' | 'trainer' | 'learner' | 'opc_founder' | 'business_partner' | 'collaborator' | 'company_partner';

export interface Profile { id: string; display_name: string; email: string | null; headline: string | null; skills: string[]; created_at: string }
export interface Me { roles: Role[]; active_role: Role | null; is_commander: boolean; profile: Profile }

export interface Notification { id: string; recipient_id: string | null; audience: string | null; kind: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string }
export interface Application {
  id: string; ref: string; type: Exclude<Role, 'commander' | 'operator' | 'learner'>; source: string; source_ref: string | null; person_id: string | null;
  name: string | null; email: string | null; payload: Record<string, unknown>; status: string; reviewer_note: string | null; created_at: string; updated_at: string;
}
export interface Invite { id: string; email: string; roles: Role[]; status: string; expires_at: string; created_at: string; accepted_at: string | null; application_id: string | null }
export interface Grant { id: string; person_id: string; role: Role; status: string; note: string | null; created_at: string }
export interface Lead { id: string; ref: string; source: string; source_ref: string | null; name: string | null; contact: string | null; company: string | null; summary: string | null; payload: Record<string, unknown>; status: string; notes: string | null; created_at: string }
export interface Mission {
  id: string; ref: string; title: string; category: string; brief: string; deliverables: string; acceptance: string; skill_tags: string[];
  due_at: string | null; offer_close_at: string | null; fee_type: string; negotiation_allowed: boolean; revisions_included: number | null;
  status: string; status_reason: string | null; created_at: string; updated_at: string;
}
export interface MissionPrivate { mission_id: string; lead_id: string | null; client_quote: number | null; cost_ceiling: number | null; internal_notes: string | null }
export interface Bid { id: string; mission_id: string; ranger_id: string; kind: string; amount: number | null; duration_days: number | null; note: string | null; created_by: string; created_at: string }
export interface Assignment { id: string; mission_id: string; ranger_id: string; agreed_fee: number; payout_schedule: string; agreement_terms: string; agreement_version: number; agreement_state: string; accepted_at: string | null; created_at: string }
export interface Deliverable { id: string; mission_id: string; ranger_id: string; version: number; url: string; note: string | null; status: string; review_note: string | null; reviewed_at: string | null; created_at: string }
export interface Payable { id: string; beneficiary_id: string; source_type: string; source_id: string | null; label: string; amount: number; currency: string; schedule: string | null; status: string; note: string | null; approved_at: string | null; created_at: string }
export interface Payment { id: string; payable_id: string; amount: number; reference: string; paid_at: string; created_at: string; method: string | null; proof_path: string | null }
export interface Message { id: string; thread_type: string; thread_id: string; ranger_id: string | null; author_id: string; author_name: string | null; acting_as: string | null; body: string; created_at: string }
export interface ProgramDraft {
  id: string; owner_id: string; title: string; slug: string; type: 'ebook' | 'webinar' | 'workshop' | 'ecourse'; path: 'ai' | 'biz' | 'career';
  pricing: 'free' | 'paid' | 'invitation' | 'sponsored'; summary: string; for_who: string; level: string; outcomes: string[]; tags: string[];
  schedule_at: string | null; duration: string | null; capacity: number | null; rights_declared: boolean; status: string; review_note: string | null; edu_slug: string | null; updated_at: string;
  price: number | null; accepts_tokens: boolean; public_name: string | null; toc: string[]; cover_url: string | null; refund_terms: string | null; support_contact: string | null;
  edu_program_id: string | null; publish_error: string | null;
}
export interface LearnerProfile { person_id: string; goal: string | null; level: string | null; hours: string | null; interests: string[]; formats: string[]; answers: Record<string, unknown>; updated_at: string }
export interface Points { id: string; campaign: string; reason: string; points: number; note: string | null; created_at: string }
export interface Org {
  id: string; owner_id: string; name: string; kind: string; sector: string; description: string; website: string | null; location: string | null;
  offers: string[]; needs: string[]; visibility: 'private' | 'network' | 'discoverable'; verified_identity: boolean; verified_ownership: boolean; partner_contracted: boolean; updated_at: string;
}
export interface Product { id: string; org_id: string; name: string; tagline: string; category: string; platform: string; url: string | null; status: string; updated_at: string }
export interface ConnectRequest { id: string; from_org: string; to_org: string; intent: string; message: string; viboxs_involved: boolean; status: string; created_by: string; created_at: string; decided_at: string | null }
export interface Workspace { id: string; request_id: string; title: string; status: string; approval: string | null; created_at: string; updated_at: string }
export interface Flag { key: string; label: string; description: string | null; enabled: boolean; locked: boolean; config: Record<string, unknown>; updated_at: string }
export interface Audit { id: number; actor_id: string | null; acting_as: string | null; action: string; entity: string; entity_id: string | null; detail: { from?: string; to?: string }; created_at: string }

/** Pesan error yang aman ditampilkan. Pesan dari RPC kita sudah berbahasa Indonesia. */
export function errMsg(e: unknown): string {
  const pe = e as PostgrestError & { message?: string };
  const m = pe?.message || String(e);
  if (/row-level security|permission denied|42501/i.test(m + (pe?.code ?? ''))) return pe.message && !/row-level|permission denied/i.test(pe.message) ? pe.message : 'Akses ditolak untuk peran yang sedang aktif.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Koneksi terputus. Periksa internet lalu coba lagi.';
  if (/duplicate key/i.test(m)) return 'Data yang sama sudah ada.';
  if (/violates check constraint/i.test(m)) return 'Ada isian yang formatnya belum sesuai.';
  return m.replace(/^.*?ERROR:\s*/, '');
}

/** Panggil RPC, lempar Error dengan pesan aman. */
export async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(errMsg(error));
  return data as T;
}

/** Ambil baris tabel, lempar Error dengan pesan aman. */
export async function must<T>(q: PromiseLike<{ data: T | null; error: PostgrestError | null }>): Promise<T> {
  const { data, error } = await q;
  if (error) throw new Error(errMsg(error));
  return data as T;
}

export const PRIVACY_VERSION = 'learner-privacy-draft-2026-11';

/**
 * Origin untuk semua tautan email (verifikasi, reset, undangan). Jangan pakai location.origin di produksi:
 * tautan yang dibuat dari dev server/preview akan menunjuk ke host itu (bug P00-005 "localhost").
 * Hanya dev lokal yang memakai origin-nya sendiri.
 */
export const authOrigin = () =>
  /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? location.origin : STUDIO_ORIGIN;

/* ---------- Batch 2–6: EDU commerce, learner engine, company, showcase ---------- */
export interface EduOrder {
  id: string; order_no: string; order_source: 'EDU_PUBLIC_GUEST' | 'STUDIO_MEMBER'; buyer_id: string | null; email: string; buyer_name: string; program_id: string; program_slug: string;
  product: { title: string; type: string; free: boolean; price?: number; startsAt?: string; qa?: boolean }; cash_charged: number; refunded_amount: number; status: string; status_reason: string | null;
  gateway_env: string | null; payment_type: string | null; paid_at: string | null; created_at: string; access_email_status: string;
}
export interface Entitlement { id: string; order_id: string; program_id: string; program_slug: string; buyer_id: string | null; granted_at: string; revoked_at: string | null; revoke_reason: string | null }
export interface StarEvent { id: string; code: string; units: number; source_ref: string; created_at: string }
export interface TokenRow { id: string; wallet: string; delta: number; state: string; source: string; expires_at: string | null; created_at: string }
export interface Question { type: 'mcq' | 'essay'; prompt: string; options?: string[]; answer?: number; rubric?: string; source: string }
export interface Assessment { id: string; program_id: string; kind: 'webinar' | 'ebook'; title: string; questions: Question[]; pass_score: number; status: string; version: number; author_id: string; review_note: string | null; released_at: string | null; updated_at: string }
export interface Attempt { id: string; assessment_id: string; person_id: string; answers: unknown[]; mcq_correct: number; mcq_total: number; status: string; score: number | null; feedback: string | null; history: Record<string, unknown>[]; created_at: string; reviewed_at: string | null }
export interface CreatorSale { program_id: string; slug: string; title: string; published: boolean; kind: string; starts_at: string | null; paid_orders: number; free_orders: number; refunded_orders: number; active_participants: number; basis: number; contributor_share: number; token_value: number; contributor_cash: number; released: number }
export interface Company {
  id: string; ref: string; owner_id: string; legal_name: string; nib: string | null; business_domain: string | null; business_email: string; pic_name: string; pic_role: string; hiring_needs: string;
  website: string | null; status: string; grants: string[]; review_note: string | null; verified_at: string | null; created_at: string;
}
export interface Talent { person_id: string; opt_in: boolean; alias: string | null; headline: string | null; skills: string[]; availability: string | null; work_pref: string | null; portfolio_url: string | null; show_star: boolean; show_assessments: boolean; opted_in_at: string | null }
export interface HiringRow { id: string; side: 'company' | 'candidate'; company: string; candidate_alias: string | null; vacancy_title: string; message: string; status: string; stage: string | null; interview_at: string | null; interview_url: string | null; created_at: string }
export interface Showcase {
  id: string; kind: 'ranger' | 'opc'; owner_id: string; display_name: string; specialization: string; summary: string; evidence: { label: string; url: string }[]; image_url: string | null; link: string | null;
  product_status: string | null; consent_at: string | null; consent_version: string | null; income_consent: boolean; income_amount: number | null; income_from: string | null; income_to: string | null;
  status: string; review_note: string | null; approved_at: string | null; review_due: string | null; updated_at: string;
}
export interface RangerStatus { person_id: string; origin: string; status: string; request_reason: string | null; requested_at: string | null; clearance_note: string | null; decided_at: string | null }
