import { callEdge, publicRpc } from '@viboxs/shared/backend';
import { sb } from './sb';

/** Checkout & status order member memakai backend EDU yang sama (edu-checkout / edu-order) dengan JWT Studio. */
export async function eduEdge<T>(fn: 'edu-checkout' | 'edu-order', body: Record<string, unknown>) {
  const { data } = await sb.auth.getSession();
  return callEdge<T>(fn, body, data.session?.access_token);
}

export async function paymentsEnabled() {
  try { return (await publicRpc<{ payments_enabled?: boolean }>('edu_public_config')).payments_enabled === true; } catch { return false; }
}

export const idemKey = (slug: string, uid: string) => {
  const k = `st-idem:${slug}:${uid}`;
  try { const v = sessionStorage.getItem(k); if (v) return v; const n = crypto.randomUUID(); sessionStorage.setItem(k, n); return n; } catch { return crypto.randomUUID(); }
};

/** AI assist (DeepSeek via edge st-ai). Hasil selalu draf/saran — keputusan tetap manusia. Gagal → lempar pesan, alur manual tetap jalan. */
export async function aiAssist<T>(body: { action: 'assessment_draft'; program_id: string; mcq: number; essay: number } | { action: 'essay_suggest'; attempt_id: string } | { action: 'discovery_summary' }) {
  const { data } = await sb.auth.getSession();
  const r = await callEdge<T>('st-ai', body, data.session?.access_token, 70000);
  if (r.status !== 200) throw new Error(r.data.error ?? 'AI tidak tersedia. Lanjutkan manual.');
  return r.data as T;
}
