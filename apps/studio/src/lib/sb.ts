import { createClient, type PostgrestError } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from '@viboxs/shared/backend';

/**
 * Klien Supabase Studio. Sesi host-only (localStorage studio.viboxs.com), terpisah dari CMS EDU.
 * Otorisasi SELALU di server (RLS + RPC security definer) — UI hanya menyembunyikan yang tidak relevan.
 */
export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'viboxs-studio', detectSessionInUrl: true },
});

export type Role = 'commander' | 'operator' | 'ranger' | 'trainer' | 'learner' | 'opc_founder' | 'business_partner' | 'collaborator';

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
export interface Payment { id: string; payable_id: string; amount: number; reference: string; paid_at: string; created_at: string }
export interface Message { id: string; thread_type: string; thread_id: string; ranger_id: string | null; author_id: string; author_name: string | null; acting_as: string | null; body: string; created_at: string }
export interface ProgramDraft {
  id: string; owner_id: string; title: string; slug: string; type: 'ebook' | 'webinar' | 'workshop' | 'ecourse'; path: 'ai' | 'biz' | 'career';
  pricing: 'free' | 'paid' | 'invitation' | 'sponsored'; summary: string; for_who: string; level: string; outcomes: string[]; tags: string[];
  schedule_at: string | null; duration: string | null; capacity: number | null; rights_declared: boolean; status: string; review_note: string | null; edu_slug: string | null; updated_at: string;
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
