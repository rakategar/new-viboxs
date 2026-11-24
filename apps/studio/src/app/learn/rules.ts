import { SUPABASE_KEY, SUPABASE_URL } from '@viboxs/shared/backend';
import type { LearnerProfile } from '../../lib/sb';

/**
 * Asesmen berbasis ATURAN (rules-v1) — bukan AI, bukan psikometri (PRD §09.3).
 * Setiap rekomendasi membawa alasan yang bisa dibaca dan dikoreksi pengguna.
 */
export const GOALS: [string, string, string[]][] = [
  ['ai_daily', 'Memakai AI untuk kerja harian', ['ai', 'prompt', 'produktivitas', 'dokumen']],
  ['start_biz', 'Memulai / merapikan bisnis sendiri (OPC)', ['opc', 'bisnis', 'sop', 'operasional']],
  ['grow_sales', 'Menambah pelanggan & distribusi konten', ['konten', 'distribusi', 'marketing']],
  ['career', 'Naik level di pekerjaan', ['komunikasi', 'karier', 'produktivitas']],
  ['data', 'Mengolah data & laporan', ['spreadsheet', 'data', 'keuangan', 'otomasi']],
];
export const LEVELS: [string, string][] = [['new', 'Baru mulai'], ['some', 'Sudah pernah mencoba'], ['regular', 'Rutin memakai di pekerjaan']];
export const HOURS: [string, string][] = [['lt2', '< 2 jam / minggu'], ['2to5', '2–5 jam / minggu'], ['gt5', '> 5 jam / minggu']];
export const FORMATS: [string, string][] = [['webinar', 'Live webinar'], ['workshop', 'Workshop praktik'], ['ebook', 'E-book / belajar mandiri']];
export const INTERESTS: [string, string][] = [
  ['ai', 'AI & prompt'], ['opc', 'One Person Company'], ['sop', 'SOP & operasional'], ['konten', 'Konten & distribusi'], ['keuangan', 'Keuangan dasar'],
  ['spreadsheet', 'Spreadsheet'], ['komunikasi', 'Komunikasi kerja'], ['otomasi', 'Otomasi'],
];

export interface EduProgram { slug: string; type: string; path: string; title: string; summary: string; level?: string; status: string; free: boolean; date?: string; tags: string[]; price?: number; startsAt?: string; forWho?: string; time?: string; outcomes?: string[]; toc?: string[]; facilitator?: string }

/** Ambil katalog EDU yang benar-benar tayang (published) — sumber kanonis adalah EDU. */
export async function fetchCatalog(): Promise<EduProgram[]> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/edu_programs?select=data&published=is.true&order=position.asc`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  if (!r.ok) throw new Error('Katalog EDU tidak dapat dimuat.');
  return ((await r.json()) as { data: EduProgram }[]).map((x) => x.data);
}

const ACTIVE = ['OPEN', 'ANNOUNCED', 'AVAILABLE', 'RESCHEDULED'];

export function recommend(lp: LearnerProfile, catalog: EduProgram[]) {
  const goalTags = GOALS.find((g) => g[0] === lp.goal)?.[2] ?? [];
  const want = new Set([...goalTags, ...lp.interests]);
  return catalog
    .filter((p) => ACTIVE.includes(p.status))
    .map((p) => {
      const reasons: string[] = [];
      let score = 0;
      const hit = p.tags.filter((t) => want.has(t));
      if (hit.length) { score += hit.length * 2; reasons.push(`Topik cocok dengan tujuan/minat: ${hit.slice(0, 3).join(', ')}`); }
      if (lp.formats.includes(p.type)) { score += 2; reasons.push(`Format yang Anda pilih (${p.type})`); }
      const lvl = (p.level ?? '').toLowerCase();
      if (lp.level === 'new' && /pemula|semua/.test(lvl)) { score += 1; reasons.push('Cocok untuk pemula'); }
      if (lp.level === 'regular' && /menengah/.test(lvl)) { score += 1; reasons.push('Level menengah sesuai pengalaman Anda'); }
      if (lp.hours === 'lt2' && p.type === 'ebook') { score += 1; reasons.push('Bisa dipelajari sesuai waktu luang'); }
      if (p.free) reasons.push('Gratis');
      return { p, score, reasons };
    })
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score);
}
