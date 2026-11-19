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
