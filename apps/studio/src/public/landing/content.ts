import { I } from '../../ui/kit';
import type { Flow } from './Workflow';

/** Konten landing Studio. Semua klaim = aturan sistem (PRD), bukan metrik/testimoni. */

export type IconKey = keyof typeof I;

export const ROLES: { k: string; t: string; d: string; icon: IconKey; tag: string }[] = [
  { k: 'commander', t: 'Commander', d: 'Aplikasi, undangan, lead, misi, review EDU, payout, audit.', icon: 'shield', tag: 'Founder' },
  { k: 'ranger', t: 'Ranger', d: 'Penawaran untuk Anda, kontrak, deliverable berversi, honor pribadi.', icon: 'target', tag: 'Undangan' },
  { k: 'trainer', t: 'EDU Contributor', d: 'Draft webinar, workshop, e-book — tayang hanya setelah review.', icon: 'book', tag: 'Undangan' },
  { k: 'learner', t: 'EDU Learner', d: 'Asesmen awal & rekomendasi dari katalog EDU yang sedang tayang.', icon: 'compass', tag: 'Daftar sendiri' },
  { k: 'opc', t: 'OPC Founder', d: 'Profil usaha, produk showcase, dan permintaan kolaborasi Connect.', icon: 'box', tag: 'Undangan' },
  { k: 'partner', t: 'Business Partner', d: 'Workspace dua pihak antar bisnis terverifikasi.', icon: 'link', tag: 'Undangan' },
];

export const INVARIANTS = ['draft ≠ tayang', 'diajukan ≠ disetujui', 'klik ≠ pembelian', 'tawaran ≠ fee', 'diterima ≠ dibayar', 'minat ≠ membership', 'poin ≠ rupiah'];

export const SOON: { t: string; d: string }[] = [
  { t: 'Professional AI Tools', d: 'PRD Builder, Design System Builder, AI Quality Inspector untuk Ranger.' },
  { t: 'Dede AI Advisor', d: 'Panduan metodologi founder dengan knowledge base terkurasi.' },
  { t: 'Affiliate EDU', d: 'Tautan referral lintas peran. Belum ada komisi aktif.' },
  { t: 'Penukaran poin', d: 'Early Points tercatat. Aturan tukar menunggu persetujuan.' },
  { t: 'Konektor Universe', d: 'Produk OPC tetap “Antre” sampai konektor benar-benar aktif.' },
  { t: 'Investor Network', d: 'Visi eksplorasi — bukan janji pendanaan atau akses investor.' },
];

/** Ikon yang "bernapas" di section ekosistem — modul Studio sendiri, bukan logo pihak ketiga. */
export const TILES: { icon: IconKey; label: string }[] = [
  { icon: 'lead', label: 'Lead Services' }, { icon: 'inbox', label: 'Aplikasi' }, { icon: 'key', label: 'Undangan' },
  { icon: 'target', label: 'Missions' }, { icon: 'chat', label: 'Thread' }, { icon: 'box', label: 'Deliverable' },
  { icon: 'wallet', label: 'Payable' }, { icon: 'book', label: 'Program EDU' }, { icon: 'compass', label: 'Asesmen' },
  { icon: 'star', label: 'Early Points' }, { icon: 'link', label: 'Connect' }, { icon: 'users', label: 'Peran' },
  { icon: 'bell', label: 'Realtime' }, { icon: 'eye', label: 'Audit' }, { icon: 'lock', label: 'Firewall' },
  { icon: 'sliders', label: 'Feature flag' },
];

/* ---------------- workflow ilustrasi (koordinat viewBox) ---------------- */
export const HERO_FLOW: Flow = {
  w: 1200, h: 420,
  nodes: [
    { id: 'lead', kind: 'box', x: 40, y: 98, icon: 'lead', t: 'Lead', s: 'service.viboxs.com' },
    { id: 'cmd', kind: 'agent', x: 186, y: 98, icon: 'shield', t: 'Commander', s: 'konversi & brief' },
    { id: 'brief', kind: 'sub', x: 196, y: 288, icon: 'file', t: 'Brief', s: 'tersanitasi' },
    { id: 'fw', kind: 'sub', x: 286, y: 288, icon: 'lock', t: 'Harga klien', s: 'privat' },
    { id: 'aud', kind: 'sub', x: 376, y: 288, icon: 'eye', t: 'Audit', s: 'tiap aksi' },
    { id: 'offer', kind: 'box', x: 500, y: 98, icon: 'target', t: 'Offer', s: 'Ranger terpilih' },
    { id: 'bid', kind: 'box', x: 640, y: 98, icon: 'chat', t: 'Bid & kontrak', s: 'fee disepakati' },
  ],
  edges: [['lead', 'cmd'], ['cmd', 'offer'], ['offer', 'bid'], ['cmd', 'brief', 'sub'], ['cmd', 'fw', 'sub'], ['cmd', 'aud', 'sub']],
  queue: [
    { id: 'deliv', kind: 'box', x: 780, y: 98, icon: 'box', t: 'Deliverable', s: 'v1 → v2' },
    { id: 'qc', kind: 'box', x: 920, y: 98, icon: 'check', t: 'Diterima', s: 'QC Commander' },
    { id: 'pay', kind: 'box', x: 1060, y: 98, icon: 'wallet', t: 'Payable', s: 'dibayar ≠ diterima' },
  ],
};

const f = (w: number, nodes: Flow["nodes"], edges: Flow["edges"]): Flow => ({ w, h: 350, nodes, edges });

export const SHOWCASE: { k: string; tab: string; pix: string; h: string; d: string; cta: [string, string]; flow: Flow }[] = [
  {
    k: 'commander', tab: 'Commander', pix: 'crown', cta: ['/login', 'Masuk sebagai Commander'],
    h: 'Bagaimana Commander mengendalikan siapa masuk, dan ke mana.',
    d: 'Aplikasi dari EDU & input manual masuk ke satu inbox. Commander menyetujui, membuat undangan sekali pakai, lalu bisa menangguhkan atau mencabut peran kapan saja — semua tercatat di audit.',
    flow: f(890, [
      { id: 'a', kind: 'box', x: 20, y: 90, icon: 'inbox', t: 'Aplikasi', s: 'EDU · manual' },
      { id: 'c', kind: 'agent', x: 160, y: 90, icon: 'shield', t: 'Commander', s: 'review & putuskan' },
      { id: 'n', kind: 'sub', x: 180, y: 270, icon: 'file', t: 'Catatan', s: 'privat' },
      { id: 'u', kind: 'sub', x: 300, y: 270, icon: 'eye', t: 'Audit', s: 'otomatis' },
      { id: 'i', kind: 'box', x: 480, y: 90, icon: 'key', t: 'Undangan', s: 'sekali pakai' },
      { id: 'r', kind: 'box', x: 640, y: 90, icon: 'users', t: 'Peran aktif', s: 'email cocok' },
      { id: 's', kind: 'box', x: 800, y: 90, icon: 'lock', t: 'Cabut', s: 'kapan saja' },
    ], [['a', 'c'], ['c', 'i'], ['i', 'r'], ['r', 's'], ['c', 'n', 'sub'], ['c', 'u', 'sub']]),
  },
  {
    k: 'ranger', tab: 'Ranger', pix: 'target', cta: ['/login', 'Masuk sebagai Ranger'],
    h: 'Bagaimana Ranger bekerja tanpa pernah melihat data klien.',
    d: 'Hanya Ranger yang ditargetkan melihat penawaran. Bid tiap Ranger privat, kontrak diterima sebelum mulai, deliverable tersimpan berversi, dan honor yang terlihat hanya milik sendiri.',
    flow: f(890, [
      { id: 'o', kind: 'box', x: 20, y: 90, icon: 'target', t: 'Penawaran', s: 'ditargetkan' },
      { id: 'b', kind: 'box', x: 160, y: 90, icon: 'chat', t: 'Bid', s: 'privat' },
      { id: 'k', kind: 'agent', x: 300, y: 90, icon: 'file', t: 'Kontrak', s: 'diterima dulu' },
      { id: 't', kind: 'sub', x: 340, y: 270, icon: 'chat', t: 'Thread', s: 'per Ranger' },
      { id: 'd', kind: 'box', x: 640, y: 90, icon: 'box', t: 'Deliverable', s: 'berversi' },
      { id: 'h', kind: 'box', x: 800, y: 90, icon: 'wallet', t: 'Honor', s: 'milik sendiri' },
    ], [['o', 'b'], ['b', 'k'], ['k', 'd'], ['d', 'h'], ['k', 't', 'sub']]),
  },
  {
    k: 'trainer', tab: 'EDU Contributor', pix: 'book', cta: ['/login', 'Masuk sebagai Contributor'],
    h: 'Bagaimana program kontributor sampai ke EDU — tanpa tayang diam-diam.',
    d: 'Kontributor menyusun draft dan mengajukan review. Commander memeriksa checklist, lalu mengirim ke CMS EDU sebagai belum tayang. Status “Tayang” hanya muncul setelah EDU benar-benar menayangkan.',
    flow: f(890, [
      { id: 'd', kind: 'box', x: 20, y: 90, icon: 'file', t: 'Draft', s: 'kontributor' },
      { id: 'r', kind: 'box', x: 160, y: 90, icon: 'check', t: 'Ajukan', s: 'review' },
      { id: 'c', kind: 'agent', x: 300, y: 90, icon: 'shield', t: 'Review', s: 'checklist Commander' },
      { id: 'l', kind: 'sub', x: 340, y: 270, icon: 'eye', t: 'Hak cipta', s: 'dideklarasikan' },
      { id: 'e', kind: 'box', x: 640, y: 90, icon: 'book', t: 'CMS EDU', s: 'belum tayang' },
      { id: 'p', kind: 'box', x: 800, y: 90, icon: 'spark', t: 'Tayang', s: 'oleh EDU' },
    ], [['d', 'r'], ['r', 'c'], ['c', 'e'], ['e', 'p'], ['c', 'l', 'sub']]),
  },
  {
    k: 'learner', tab: 'EDU Learner', pix: 'person', cta: ['/daftar', 'Daftar sebagai Learner'],
    h: 'Bagaimana Learner mendapat rekomendasi yang bisa dijelaskan.',
    d: 'Satu-satunya peran yang bisa daftar sendiri. Asesmen singkat dinilai dengan aturan terbuka, rekomendasi hanya dari program EDU yang sedang tayang — lengkap dengan alasannya.',
    flow: f(890, [
      { id: 'u', kind: 'box', x: 20, y: 90, icon: 'user', t: 'Daftar', s: 'gratis' },
      { id: 'a', kind: 'agent', x: 160, y: 90, icon: 'compass', t: 'Asesmen', s: 'aturan rules-v1' },
      { id: 'p', kind: 'sub', x: 200, y: 270, icon: 'star', t: 'Early Points', s: 'belum ditukar' },
      { id: 'r', kind: 'box', x: 500, y: 90, icon: 'spark', t: 'Rekomendasi', s: 'beralasan' },
      { id: 'c', kind: 'box', x: 660, y: 90, icon: 'book', t: 'Katalog EDU', s: 'yang tayang' },
    ], [['u', 'a'], ['a', 'r'], ['r', 'c'], ['a', 'p', 'sub']]),
  },
  {
    k: 'opc', tab: 'OPC & Partner', pix: 'grid', cta: ['/login', 'Masuk sebagai OPC / Partner'],
    h: 'Bagaimana bisnis saling menemukan di VIBOXS Connect.',
    d: 'Profil usaha bersifat opt-in. Produk masuk antrean Universe dan tidak diklaim tayang. Permintaan kolaborasi membuka workspace dua pihak — tanpa ACC rutin Commander bila VIBOXS tidak terlibat.',
    flow: f(890, [
      { id: 'o', kind: 'box', x: 20, y: 90, icon: 'user', t: 'Profil usaha', s: 'opt-in' },
      { id: 'p', kind: 'box', x: 160, y: 90, icon: 'box', t: 'Produk', s: 'antre Universe' },
      { id: 'c', kind: 'agent', x: 300, y: 90, icon: 'link', t: 'Connect', s: 'permintaan kolaborasi' },
      { id: 'f', kind: 'sub', x: 340, y: 270, icon: 'lock', t: 'Ranger', s: 'tidak bisa masuk' },
      { id: 'w', kind: 'box', x: 640, y: 90, icon: 'users', t: 'Workspace', s: 'dua pihak' },
      { id: 'k', kind: 'box', x: 800, y: 90, icon: 'file', t: 'Kesepakatan', s: 'antar pihak' },
    ], [['o', 'p'], ['p', 'c'], ['c', 'w'], ['w', 'k'], ['c', 'f', 'sub']]),
  },
];

/** Alur untuk scrollytelling (langkah 1 & 2). */
export const SCROLL_FLOW_A: Flow = f(760, [
  { id: 'l', kind: 'box', x: 20, y: 70, icon: 'lead', t: 'Lead', s: 'klien' },
  { id: 'c', kind: 'agent', x: 150, y: 70, icon: 'shield', t: 'Commander', s: 'sanitasi brief' },
  { id: 'b', kind: 'sub', x: 170, y: 250, icon: 'file', t: 'Brief', s: 'tanpa kontak' },
  { id: 'p', kind: 'sub', x: 290, y: 250, icon: 'lock', t: 'Harga', s: 'privat' },
  { id: 'r', kind: 'box', x: 470, y: 70, icon: 'target', t: 'Ranger', s: 'lihat brief' },
  { id: 'x', kind: 'box', x: 620, y: 70, icon: 'chat', t: 'Bid', s: 'privat' },
], [['l', 'c'], ['c', 'r'], ['r', 'x'], ['c', 'b', 'sub'], ['c', 'p', 'sub']]);

export const SCROLL_FLOW_B: Flow = f(760, [
  { id: 'd', kind: 'box', x: 20, y: 70, icon: 'box', t: 'Deliverable', s: 'v2' },
  { id: 'q', kind: 'agent', x: 150, y: 70, icon: 'user', t: 'Persetujuan', s: 'manusia, bukan otomatis' },
  { id: 'v', kind: 'sub', x: 170, y: 250, icon: 'check', t: 'QC', s: 'checklist' },
  { id: 'n', kind: 'sub', x: 290, y: 250, icon: 'file', t: 'Revisi', s: 'tertaut versi' },
  { id: 'a', kind: 'box', x: 470, y: 70, icon: 'check', t: 'Payable', s: 'disetujui' },
  { id: 'p', kind: 'box', x: 620, y: 70, icon: 'wallet', t: 'Transfer', s: 'dicatat + bukti' },
], [['d', 'q'], ['q', 'a'], ['a', 'p'], ['q', 'v', 'sub'], ['q', 'n', 'sub']]);

export const FEATURES: { t: string; d: string }[] = [
  { t: 'Brief tersanitasi', d: 'Ranger hanya melihat brief dan aset yang diizinkan. Kontak, harga klien, dan margin tinggal di tabel yang hanya bisa dibaca Commander.' },
  { t: 'Persetujuan manusia', d: 'Tidak ada misi yang dibuat otomatis dari lead, tidak ada pemenang yang ditunjuk otomatis, dan payable baru lunas setelah transfer dicatat.' },
  { t: 'Riwayat versi', d: 'Setiap kiriman deliverable menjadi versi baru. Revisi tertaut ke versi dan lingkupnya — tidak ada yang tertimpa.' },
  { t: 'Jejak audit', d: 'Pergantian peran, keputusan, dan perubahan data penting tercatat dengan siapa, sebagai apa, dan kapan.' },
];

export const SECURITY: { pix: string; t: string; d: string }[] = [
  { pix: 'lock', t: 'Izin dijaga di database', d: 'Row-level security per peran. Menu yang disembunyikan bukan satu-satunya pagar.' },
  { pix: 'eye', t: 'Jejak audit', d: 'Aksi penting dicatat beserta konteks peran yang sedang aktif.' },
  { pix: 'code', t: 'Aksi lewat RPC server', d: 'Bid, kontrak, payout, dan undangan divalidasi di server — bukan di browser.' },
  { pix: 'person', t: 'Satu identitas, banyak peran', d: 'Ganti konteks peran, izin server ikut berganti pada permintaan berikutnya.' },
];
