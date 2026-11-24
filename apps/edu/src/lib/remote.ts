import { SUPABASE_KEY, SUPABASE_URL } from '@viboxs/shared/backend';
import { applyRemote, type Program, type RemoteContent } from './data';

// v2: cache v1 bisa berisi 9 program contoh lama — jangan pernah dibaca lagi.
const CACHE = 'edu-content-v2';
const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

async function fetchRemote(signal: AbortSignal): Promise<RemoteContent> {
  const [pr, ct] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/edu_programs?select=data&published=is.true&order=position.asc`, { headers: H, signal }),
    fetch(`${SUPABASE_URL}/rest/v1/edu_content?select=key,value`, { headers: H, signal }),
  ]);
  if (!pr.ok || !ct.ok) throw new Error('remote');
  const programs = ((await pr.json()) as { data: Program }[]).map((r) => r.data);
  const rows = (await ct.json()) as { key: string; value: unknown }[];
  const c: RemoteContent = { programs };
  for (const r of rows) (c as Record<string, unknown>)[r.key] = r.value;
  return c;
}

/**
 * Ambil konten CMS sebelum render pertama (maks ~2,5 dtk). Gagal/timeout → cache terakhir → katalog kosong (bukan data contoh).
 * Halaman membaca data secara sinkron, jadi cukup diterapkan sekali di sini.
 */
export async function loadContent() {
  const ac = new AbortController();
  const t = window.setTimeout(() => ac.abort(), 2500);
  try { localStorage.removeItem('edu-content-v1'); } catch { /* abaikan */ }
  try {
    const c = await fetchRemote(ac.signal);
    applyRemote(c);
    try { localStorage.setItem(CACHE, JSON.stringify(c)); } catch { /* storage penuh/diblokir */ }
  } catch {
    try { const c = localStorage.getItem(CACHE); if (c) applyRemote(JSON.parse(c)); } catch { /* abaikan */ }
  } finally {
    window.clearTimeout(t);
  }
}
