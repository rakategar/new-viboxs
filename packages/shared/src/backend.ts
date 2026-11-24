/**
 * Backend bersama ekosistem VIBOXS (Supabase project "viboxs").
 * Kunci di bawah adalah publishable key — memang aman di sisi klien; akses data dijaga RLS.
 */
export const SUPABASE_URL = 'https://lbouqcovrnuhahrcnpki.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_ev2rhaxq5lSOzafWMEt9mA_6UdjZBdO';

export type SubmitKind = 'contact' | 'mission' | 'collab' | 'help' | 'notify' | 'register';
export type SubmitSite = 'corporate' | 'services' | 'edu';

/** URL edge function penerima form: simpan ke database + email otomatis ke admin@viboxs.com. */
export const submitUrl = (kind: SubmitKind, site: SubmitSite) => `${SUPABASE_URL}/functions/v1/submit?kind=${kind}&site=${site}`;

/** Kirim form. Resolve → nomor referensi; reject → Error berisi pesan yang aman ditampilkan. */
export async function submitForm(kind: SubmitKind, site: SubmitSite, data: Record<string, unknown>): Promise<string> {
  const ac = new AbortController();
  const t = window.setTimeout(() => ac.abort(), 15000);
  try {
    const res = await fetch(submitUrl(kind, site), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: ac.signal,
    });
    const j = await res.json().catch(() => null);
    if (res.ok && j && typeof j.ref === 'string') return j.ref;
    throw new Error(j?.error && res.status !== 500 ? String(j.error) : 'Pesan belum terkirim. Coba lagi sebentar.');
  } catch (e) {
    if ((e as Error).name === 'AbortError' || !navigator.onLine) throw new Error('Koneksi terputus. Periksa internet lalu coba lagi.');
    throw e;
  } finally {
    window.clearTimeout(t);
  }
}

/** Panggil edge function (EDU checkout/order). Resolve → { status, data } apa adanya; status bayar SELALU dari server. */
export async function callEdge<T = Record<string, unknown>>(name: string, body: unknown, jwt?: string): Promise<{ status: number; data: T & { error?: string; code?: string } }> {
  const ac = new AbortController();
  const t = window.setTimeout(() => ac.abort(), 25000);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST', signal: ac.signal,
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({ error: 'Respons server tidak terbaca.' }));
    return { status: res.status, data };
  } catch (e) {
    if ((e as Error).name === 'AbortError' || !navigator.onLine) return { status: 0, data: { error: 'Koneksi terputus. Periksa internet lalu coba lagi.' } as T & { error: string } };
    throw e;
  } finally {
    window.clearTimeout(t);
  }
}

/** RPC publik (anon) — mis. edu_public_config, edu_showcase. */
export async function publicRpc<T>(fn: string, args: Record<string, unknown> = {}, signal?: AbortSignal): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST', signal, headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(fn);
  return r.json();
}
