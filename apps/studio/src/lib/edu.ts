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
