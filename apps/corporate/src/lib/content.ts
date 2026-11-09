// Semua copy berstatus PROPOSED (lihat 02_DESIGN_CORPORATE.md) — founder memilih final.

import { LAUNCH, ORIGIN, type DestKey } from '@viboxs/shared/ecosystem';

// Status peluncuran subdomain sekarang ada di packages/shared/src/ecosystem.ts (LAUNCH),
// dipakai bersama oleh Corporate & Services.
export { LAUNCH, type DestKey };

/** Form kontak umum: nonaktif sampai kebijakan privasi & penerima pesan siap. */
export const CONTACT_FORM_ENDPOINT: string | null = null;

/** Karya: tetap kosong sampai ada studi kasus yang disetujui (route /work tersembunyi dari menu). */
export const CASE_STUDIES: unknown[] = [];

export interface Dest {
  key: DestKey;
  name: string;
  role: string;
  tag: string;
  domain: string;
  verb: string;
  desc: string;
  cta: string;
  q: string;
  owns: string[];
}

export const DEST: Record<DestKey, Dest> = {
  universe: {
    key: 'universe', name: 'Universe', role: 'Komunitas OPC', tag: 'OPC', domain: 'universe.viboxs.com', verb: 'Terhubung',
    desc: 'Untuk Anda yang membangun bisnis sebagai One Person Company dan ingin bertumbuh bersama jejaring.',
    cta: 'Kenali Universe', q: 'Ingin membangun bersama ekosistem?',
    owns: ['Aktivitas komunitas One Person Company', 'Jejaring antar-founder', 'Informasi manfaat & keanggotaan'],
  },
  edu: {
    key: 'edu', name: 'EDU', role: 'Pembelajaran', tag: 'Learning', domain: 'edu.viboxs.com', verb: 'Belajar',
    desc: 'Untuk Anda yang ingin belajar, berlatih, dan meningkatkan kemampuan di era AI.',
    cta: 'Lihat program EDU', q: 'Ingin belajar dan meningkatkan kemampuan?',
    owns: ['Program dan kelas', 'Jadwal sesi', 'Materi & latihan'],
  },
  services: {
    key: 'services', name: 'Services', role: 'Solusi bisnis', tag: 'Build', domain: 'services.viboxs.com', verb: 'Membangun',
    desc: 'Untuk organisasi dan founder yang membutuhkan solusi digital, sistem, atau pendampingan profesional.',
    cta: 'Lihat solusi profesional', q: 'Butuh solusi digital untuk bisnis?',
    owns: ['Konsultasi kebutuhan', 'Perancangan & pembangunan solusi', 'Pendampingan profesional'],
  },
};

export const ORDER: DestKey[] = ['universe', 'edu', 'services'];

export const isPending = (k: DestKey) => LAUNCH[k] !== 'live';
export const destHref = (k: DestKey) => (isPending(k) ? `/disiapkan/${k}` : ORIGIN[k]);

export const KW: Record<DestKey, string[]> = {
  universe: ['opc', 'sendiri', 'solo', 'founder', 'komunitas', 'jejaring', 'network', 'satu orang', 'freelance', 'berbagi', 'kolaborasi'],
  edu: ['belajar', 'kelas', 'kursus', 'pelatihan', 'training', 'program', 'sesi', 'materi', 'skill', 'kemampuan', 'workshop', 'latihan', 'ajar'],
  services: ['solusi', 'sistem', 'aplikasi', 'website', 'situs', 'otomasi', 'proyek', 'perusahaan', 'konsultasi', 'integrasi', 'dashboard', 'laporan', 'proses', 'organisasi', 'tim kami', 'digital'],
};

export function matchIntent(t: string): DestKey | null {
  const s = (t || '').toLowerCase();
  let best: DestKey | null = null;
  let bs = 0;
  ORDER.forEach((k) => {
    const sc = KW[k].reduce((a, w) => a + (s.includes(w) ? 1 : 0), 0);
    if (sc > bs) { bs = sc; best = k; }
  });
  return best;
}

export const PHRASES = [
  'Saya ingin memulai bisnis sendiri dengan bantuan AI',
  'Tim kami perlu merapikan proses laporan mingguan',
  'Saya mau belajar memakai AI untuk pekerjaan sehari-hari',
];

export const CHIPS: { label: string; key: DestKey }[] = [
  { label: 'Saya membangun bisnis sendiri', key: 'universe' },
  { label: 'Saya ingin belajar memakai AI', key: 'edu' },
  { label: 'Bisnis saya butuh solusi digital', key: 'services' },
];

export const STEPS = [
  { label: 'Pahami kebutuhan', file: 'ringkasan-kebutuhan.md', title: 'Mulai dari masalah, bukan dari teknologi.', body: 'Kami memetakan konteks, proses yang berjalan, dan batasan Anda. Hasilnya ringkasan kebutuhan yang disepakati bersama sebelum ada keputusan teknis.' },
  { label: 'Rancang solusi', file: 'rancangan-alur.md', title: 'Pilihan yang jelas, beserta batasannya.', body: 'Alternatif solusi dipetakan berdampingan — cakupan, risiko, dan kebutuhan data — supaya keputusan diambil dengan informasi lengkap.' },
  { label: 'Bangun & uji', file: 'daftar-uji.md', title: 'Dibangun bertahap, diuji sebelum dipakai.', body: 'Solusi dibangun per bagian dan diuji dengan data contoh serta pengguna internal sebelum diserahkan ke tim Anda.' },
  { label: 'Dukung', file: 'catatan-pendampingan.md', title: 'Didampingi sampai benar-benar terpakai.', body: 'Pendampingan pemakaian dan perbaikan berdasarkan masukan nyata. Lingkup dukungan disepakati per kebutuhan.' },
];

export const INTENTS = [
  { k: 'universe', title: 'Universe', desc: 'Aktivitas & keanggotaan komunitas OPC' },
  { k: 'edu', title: 'EDU', desc: 'Program, kelas, dan jadwal belajar' },
  { k: 'services', title: 'Services', desc: 'Kebutuhan proyek, sistem, atau pendampingan' },
  { k: 'umum', title: 'Pertanyaan umum', desc: 'Media, kemitraan, atau hal lain tentang VIBOXS' },
] as const;

export const NAV = [
  { to: '/', label: 'Beranda' },
  { to: '/ecosystem', label: 'Ekosistem' },
  ...(CASE_STUDIES.length ? [{ to: '/work', label: 'Karya' }] : []),
  { to: '/about', label: 'Tentang' },
  { to: '/contact', label: 'Kontak' },
];

export const TITLES: Record<string, string> = {
  '/': 'VIBOXS — Ekosistem Bisnis & AI Venture Studio',
  '/ecosystem': 'Ekosistem VIBOXS — Universe, EDU & Services',
  '/about': 'Tentang VIBOXS — AI Venture Studio',
  '/contact': 'Kontak VIBOXS — Pilih Jalur Kebutuhan',
  '/work': 'Karya — VIBOXS',
};
