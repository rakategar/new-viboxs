/**
 * Katalog EDU. Sumber kebenaran = tabel `edu_programs` (published) di Supabase.
 * PRD v3.0 §02.1: produksi TIDAK pernah menampilkan produk contoh — katalog kosong adalah keadaan jujur.
 * Data contoh (DEMO_PROGRAMS) hanya untuk dev lokal dengan VITE_EDU_CATALOG=example.
 * Harga hanya tampil bila diisi CMS (`price`, IDR); selain itu "Harga belum diumumkan".
 */

export type StatusCode = 'ANNOUNCED' | 'OPEN' | 'FULL' | 'CLOSED' | 'RESCHEDULED' | 'CANCELLED' | 'COMPLETED' | 'AVAILABLE';
export type Tone = 'success' | 'info' | 'warning' | 'muted' | 'accent2' | 'danger';
export type ProgType = 'webinar' | 'workshop' | 'ebook';

export const STATUS: Record<StatusCode, { label: string; tone: Tone; live?: boolean; note?: string }> = {
  ANNOUNCED: { label: 'Diumumkan', tone: 'info', note: 'Sesi sudah diumumkan, tetapi pendaftaran belum dibuka. Aktifkan pemberitahuan untuk kabar berikutnya.' },
  OPEN: { label: 'Pendaftaran dibuka', tone: 'success', live: true },
  FULL: { label: 'Penuh', tone: 'warning', note: 'Pendaftaran penuh. Dapatkan pemberitahuan sesi berikutnya.' },
  CLOSED: { label: 'Ditutup', tone: 'muted', note: 'Sesi ini tidak lagi menerima peserta baru.' },
  RESCHEDULED: { label: 'Dijadwal ulang', tone: 'accent2', note: 'Jadwal sesi ini berubah. Peserta terdaftar menerima pemberitahuan lewat email yang mereka gunakan.' },
  CANCELLED: { label: 'Dibatalkan', tone: 'danger', note: 'Sesi ini dibatalkan. Peserta terdaftar akan dihubungi terkait pengembalian dana atau pemindahan sesi. Butuh bantuan? Hubungi tim EDU.' },
  COMPLETED: { label: 'Selesai', tone: 'muted', note: 'Sesi ini telah berlangsung dan kini menjadi arsip. Replay hanya tersedia bila termasuk dalam hak peserta.' },
  AVAILABLE: { label: 'Tersedia', tone: 'success' },
};
export const STATUS_ORDER: StatusCode[] = ['ANNOUNCED', 'OPEN', 'FULL', 'CLOSED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED'];
export const STATUS_EFFECT: Partial<Record<StatusCode, string>> = {
  ANNOUNCED: 'Informasional — CTA pemberitahuan', OPEN: 'Registrasi aktif', FULL: 'Tombol nonaktif + pemberitahuan sesi berikutnya',
  CLOSED: 'Tidak menerima peserta', RESCHEDULED: 'Tanggal baru + tanda perubahan', CANCELLED: 'Penjelasan + bantuan', COMPLETED: 'Arsip; replay hanya bila termasuk hak',
};

export const TYPE: Record<ProgType, string> = { webinar: 'Live Webinar', workshop: 'Workshop', ebook: 'E-book' };

export interface Path { id: string; n: string; name: string; desc: string; topics: string[] }
export const PATHS: Path[] = [
  { id: 'ai', n: '01', name: 'Start with AI', desc: 'Fondasi kerja dan penggunaan AI yang relevan untuk tugas sehari-hari.', topics: ['Prompting dasar', 'AI untuk dokumen', 'Etika penggunaan'] },
  { id: 'biz', n: '02', name: 'Build Your Business', desc: 'Skill bisnis, operasional, dan distribusi untuk founder dan OPC.', topics: ['SOP & operasional', 'Distribusi konten', 'Riset pasar'] },
  { id: 'career', n: '03', name: 'Work & Career', desc: 'Komunikasi, produktivitas, dan kapabilitas profesional.', topics: ['Komunikasi tertulis', 'Produktivitas', 'Presentasi'] },
];

export interface Program {
  slug: string; type: ProgType; path: string; title: string; summary: string; forWho: string; level: string;
  status: StatusCode; free: boolean; past?: boolean;
  day?: string; date?: string; dShort?: string; mShort?: string; prevDate?: string; time?: string; dur?: string;
  mode?: string; loc?: string; cap?: string; sortDate: string; added: number; tags: string[];
  outcomes?: string[]; agenda?: [string, string][]; receive?: string[]; access?: string; lang?: string;
  fileFmt?: string; version?: string; author?: string; pages?: string; toc?: string[];
  /** Harga dalam Rupiah (bilangan bulat). Kosong = belum diumumkan. Diabaikan bila `free`. */
  price?: number;
  /** Waktu mulai ISO 8601 dengan offset (mis. 2026-12-03T19:00:00+07:00). Dipakai kalender & status otomatis. */
  startsAt?: string;
  /** Nama fasilitator — hanya diisi setelah ia menyetujui publikasi profil. */
  facilitator?: string;
  /** URL sampul berhak pakai (e-book). */
  cover?: string;
}

/** Data contoh untuk pengembangan lokal saja (tidak pernah ikut ke produksi). */
const RAW: Program[] = [
  { slug: 'dasar-ai-kerja-harian', type: 'webinar', path: 'ai', title: 'Dasar AI untuk Kerja Harian', summary: 'Kenali cara memakai asisten AI untuk merangkum, menyusun draf, dan merapikan dokumen kerja — dengan batasan yang jelas.', forWho: 'Profesional dan founder yang baru mulai memakai AI', level: 'Pemula · tanpa prasyarat', status: 'OPEN', free: true, day: 'Kamis', date: '3 Desember 2026', dShort: '03', mShort: 'DES', time: '19.00–20.30 WIB', dur: '90 menit', mode: 'Online', loc: 'Zoom — link dikirim lewat email', cap: '[Kapasitas]', sortDate: '2026-12-03', added: 6, tags: ['ai', 'prompt', 'dokumen', 'produktivitas'],
    outcomes: ['Menulis instruksi (prompt) yang jelas untuk merangkum dan menyusun draf', 'Memeriksa ulang hasil AI sebelum dipakai di pekerjaan', 'Mengenali data apa yang tidak boleh dimasukkan ke alat AI'],
    agenda: [['Apa yang bisa dan tidak bisa dilakukan AI', '15 menit'], ['Struktur prompt: tujuan, konteks, format', '25 menit'], ['Praktik: merangkum dokumen kerja', '30 menit'], ['Tanya jawab', '20 menit']] },
  { slug: 'sop-bisnis-satu-orang', type: 'workshop', path: 'biz', title: 'Menyusun SOP untuk Bisnis Satu Orang', summary: 'Workshop praktik menulis SOP sederhana untuk pekerjaan berulang, agar operasional tetap berjalan saat kamu fokus ke hal lain.', forWho: 'Founder OPC dan pelaku usaha mandiri', level: 'Menengah · sudah menjalankan usaha', status: 'OPEN', free: false, day: 'Sabtu', date: '12 Desember 2026', dShort: '12', mShort: 'DES', time: '09.00–12.00 WIB', dur: '3 jam', mode: 'Online', loc: 'Zoom — kamera aktif dianjurkan', cap: '[Kapasitas] peserta', sortDate: '2026-12-12', added: 5, tags: ['sop', 'operasional', 'opc', 'bisnis'],
    outcomes: ['Memetakan 3–5 pekerjaan berulang yang layak dijadikan SOP', 'Menulis satu SOP lengkap dengan format yang bisa dipakai ulang', 'Menentukan kapan SOP perlu diperbarui'],
    agenda: [['Memetakan pekerjaan berulang', '40 menit'], ['Anatomi SOP yang bisa dipakai', '30 menit'], ['Praktik menulis SOP sendiri', '70 menit'], ['Review berpasangan & penutup', '40 menit']],
    receive: ['Template SOP (dokumen yang bisa diedit)', 'Worksheet pemetaan pekerjaan', 'Ringkasan materi PDF', 'Replay — [belum dipastikan]'],
    access: 'Link workshop dan materi pra-sesi dikirim setelah pembayaran terkonfirmasi. Template dapat diakses selama [masa berlaku — menunggu kebijakan].' },
  { slug: 'panduan-prompt-operasional', type: 'ebook', path: 'ai', title: 'Panduan Prompt untuk Operasional Bisnis', summary: 'Panduan digital berisi pola prompt untuk email pelanggan, ringkasan rapat, dan dokumen operasional — lengkap dengan contoh dan catatan pemeriksaan.', forWho: 'Pelaku usaha dan tim kecil yang ingin memakai AI secara konsisten', level: 'Pemula–menengah', status: 'AVAILABLE', free: false, fileFmt: 'PDF & EPUB', lang: 'Bahasa Indonesia', version: 'v1.0', author: '[Nama penulis — menunggu persetujuan publikasi]', pages: '[Jumlah halaman]', sortDate: '9999', added: 4, tags: ['prompt', 'ai', 'operasional', 'email', 'e-book'],
    toc: ['Cara memakai panduan ini', 'Prinsip dasar menulis prompt', 'Pola untuk email & pesan pelanggan', 'Pola untuk ringkasan rapat', 'Pola untuk dokumen operasional', 'Memeriksa hasil sebelum dipakai', 'Batasan & data yang tidak boleh dibagikan'] },
  { slug: 'komunikasi-tertulis-kerja', type: 'webinar', path: 'career', title: 'Komunikasi Tertulis yang Jelas di Tempat Kerja', summary: 'Menulis pesan, email, dan laporan singkat yang mudah dipahami dan ditindaklanjuti.', forWho: 'Karyawan dan profesional di semua level', level: 'Semua level', status: 'FULL', free: true, day: 'Rabu', date: '25 November 2026', dShort: '25', mShort: 'NOV', time: '16.00–17.00 WIB', dur: '60 menit', mode: 'Online', loc: 'Zoom', cap: '[Kapasitas]', sortDate: '2026-11-25', added: 3, tags: ['komunikasi', 'email', 'karier'] },
  { slug: 'distribusi-konten-opc', type: 'webinar', path: 'biz', title: 'Distribusi Konten untuk Founder OPC', summary: 'Menyusun ritme distribusi konten yang realistis untuk bisnis yang dijalankan sendiri.', forWho: 'Founder OPC dan kreator bisnis', level: 'Pemula–menengah', status: 'RESCHEDULED', free: false, day: 'Selasa', date: '8 Desember 2026', dShort: '08', mShort: 'DES', prevDate: 'Selasa, 1 Desember 2026', time: '19.30–21.00 WIB', dur: '90 menit', mode: 'Online', loc: 'Zoom', cap: '[Kapasitas]', sortDate: '2026-12-08', added: 2, tags: ['konten', 'distribusi', 'opc', 'marketing'] },
  { slug: 'otomasi-spreadsheet-ai', type: 'workshop', path: 'ai', title: 'Otomasi Spreadsheet dengan Bantuan AI', summary: 'Merapikan data, membuat rumus, dan laporan sederhana di spreadsheet dengan bantuan AI.', forWho: 'Admin, staf operasional, dan founder', level: 'Pemula', status: 'ANNOUNCED', free: false, day: '', date: 'Tanggal menyusul', dShort: '—', mShort: 'TBA', time: 'Jam menyusul', dur: '3 jam', mode: 'Online', loc: 'Diumumkan bersama jadwal', cap: '[Kapasitas]', sortDate: '9990', added: 7, tags: ['spreadsheet', 'otomasi', 'ai', 'data'] },
  { slug: 'laporan-keuangan-sederhana', type: 'webinar', path: 'biz', title: 'Membaca Laporan Keuangan Sederhana', summary: 'Memahami laba rugi dan arus kas untuk keputusan bisnis harian.', forWho: 'Founder dan pelaku usaha kecil', level: 'Pemula', status: 'CLOSED', free: true, day: 'Jumat', date: '20 November 2026', dShort: '20', mShort: 'NOV', time: '19.00–20.00 WIB', dur: '60 menit', mode: 'Online', loc: 'Zoom', cap: '[Kapasitas]', sortDate: '2026-11-20', added: 1, tags: ['keuangan', 'bisnis'] },
  { slug: 'etika-ai-kantor', type: 'webinar', path: 'ai', title: 'Etika Penggunaan AI di Kantor', summary: 'Batasan, kerahasiaan data, dan atribusi saat memakai AI untuk pekerjaan.', forWho: 'Karyawan dan pimpinan tim', level: 'Semua level', status: 'CANCELLED', free: true, day: 'Selasa', date: '17 November 2026', dShort: '17', mShort: 'NOV', time: '15.00–16.00 WIB', dur: '60 menit', mode: 'Online', loc: 'Zoom', cap: '[Kapasitas]', sortDate: '2026-11-17', added: 0, tags: ['etika', 'ai', 'data'] },
  { slug: 'qa-sandbox-webinar', type: 'webinar', path: 'ai', title: '[QA] Webinar uji pembayaran sandbox', summary: 'Fixture lokal untuk menguji checkout Midtrans sandbox end-to-end. Tidak pernah tayang di produksi.', forWho: 'Tim QA', level: '-', status: 'OPEN', free: false, price: 15000, startsAt: '2030-01-15T19:00:00+07:00', sortDate: '2030-01-15', added: 8, tags: ['ai'] },
  { slug: 'riset-pasar-opc', type: 'webinar', path: 'biz', title: 'Pengantar Riset Pasar untuk OPC', summary: 'Cara sederhana memvalidasi ide sebelum membangun produk.', forWho: 'Calon founder dan OPC', level: 'Pemula', status: 'COMPLETED', past: true, free: true, day: 'Kamis', date: '5 November 2026', dShort: '05', mShort: 'NOV', time: '19.00–20.30 WIB', dur: '90 menit', mode: 'Online', loc: 'Zoom', cap: '[Kapasitas]', sortDate: '2026-11-05', added: -1, tags: ['riset', 'pasar', 'validasi'] },
];


const TZ = 'Asia/Jakarta';
const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('id-ID', { timeZone: TZ, ...o });

/** Tanggal lokal Jakarta (YYYY-MM-DD) dari ISO — kunci kalender, tidak bergantung zona waktu perangkat. */
export const jktDay = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));

/**
 * Normalisasi program dari CMS. TIDAK mengarang outcome/agenda: field kosong tetap kosong dan bagiannya disembunyikan.
 * Bila `startsAt` diisi, label tanggal diturunkan darinya (WIB) dan sesi yang sudah lewat otomatis masuk arsip.
 */
export const normalizeProgram = (p: Program): Program => {
  const n: Program = { ...p, tags: p.tags || [], lang: p.lang || 'Bahasa Indonesia' };
  if (p.type !== 'ebook' && p.startsAt && !Number.isNaN(Date.parse(p.startsAt))) {
    const d = new Date(p.startsAt);
    n.day = fmt({ weekday: 'long' }).format(d);
    n.date = fmt({ day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    n.dShort = fmt({ day: '2-digit' }).format(d);
    n.mShort = fmt({ month: 'short' }).format(d).replace('.', '').toUpperCase();
    n.sortDate = jktDay(p.startsAt);
    if (!p.time) n.time = `${fmt({ hour: '2-digit', minute: '2-digit' }).format(d).replace(':', '.')} WIB`;
    const end = d.getTime() + 3 * 3600e3; // sesi dianggap lewat 3 jam setelah mulai bila tidak ditandai lain
    if (Date.now() > end) n.past = true;
  } else if (p.type !== 'ebook' && /^\d{4}-\d{2}-\d{2}$/.test(p.sortDate || '') && p.sortDate < jktDay(new Date().toISOString())) {
    n.past = true; // hanya tanggal (tanpa jam): lewat setelah hari itu berakhir di WIB
  }
  if (n.past && ['OPEN', 'FULL', 'RESCHEDULED', 'ANNOUNCED', 'CLOSED'].includes(n.status)) n.status = 'COMPLETED';
  return n;
};

/** Data contoh — hanya untuk pengembangan lokal (`VITE_EDU_CATALOG=example`) dan tombol impor dev di CMS. */
export const DEMO_PROGRAMS: Program[] = RAW;
const DEV_DEMO = import.meta.env.DEV && import.meta.env.VITE_EDU_CATALOG === 'example';
export const PROGRAMS: Program[] = DEV_DEMO ? RAW.map(normalizeProgram) : [];

/** Katalog terisi bila ada program terpublikasi (dan CMS tidak menutupnya lewat settings.catalogFilled=false). */
export let CATALOG_FILLED = PROGRAMS.length > 0;

export const bySlug = (slug?: string) => PROGRAMS.find((p) => p.slug === slug);
export let FEATURED: string[] = DEV_DEMO ? ['dasar-ai-kerja-harian', 'sop-bisnis-satu-orang', 'panduan-prompt-operasional'] : [];

export const FORMATS = [
  { id: 'webinar', name: 'Live Webinar', kicker: 'Sesi langsung', desc: 'Sesi online terjadwal bersama kontributor. Jadwal ditulis lengkap dalam WIB; tautan sesi hanya dikirim ke peserta terdaftar.' },
  { id: 'workshop', name: 'Workshop', kicker: 'Praktik terpandu', desc: 'Sesi praktik lebih panjang dengan kapasitas terbatas dan hasil kerja yang jelas di akhir sesi.' },
  { id: 'ebook', name: 'E-book', kicker: 'Digital Library', desc: 'Panduan digital yang bisa dibaca kapan saja. Daftar isi, format file, dan lisensinya tertulis sebelum membeli.' },
];

/** Cara EDU bekerja (PRD v3.0 §15.1). */
export const STEPS: [string, string][] = [
  ['Kenali posisi awalmu', 'Ceritakan tujuan, kemampuan saat ini, dan waktu belajarmu di Studio. Bukan tes kepribadian.'],
  ['Ikuti pembelajaran yang relevan', 'Pilih webinar, workshop, atau e-book yang sesuai kebutuhan — hanya program yang benar-benar terbit.'],
  ['Ukur pemahamanmu', 'Assessment dan refleksi tertulis membantu melihat apa yang sudah kamu kuasai.'],
  ['Lihat perkembanganmu', 'Riwayat belajar dan progres tersimpan di akunmu, terpisah dari sertifikasi profesi.'],
  ['Jajaki peluang berikutnya', 'Ajukan diri ke jalur yang tersedia. Setiap jalur punya kriteria dan seleksi masing-masing.'],
];

export interface Faq { g: string; q: string; a: string }
export const FAQ: Faq[] = [
  { g: 'Pendaftaran', q: 'Apakah saya perlu membuat akun untuk melihat program?', a: 'Tidak. Semua informasi program bisa dibaca tanpa login. Data diri hanya diminta saat kamu mendaftar.' },
  { g: 'Pendaftaran', q: 'Apa bedanya membeli sebagai tamu dan sebagai EDU Learner?', a: 'Kamu tetap bisa membeli tanpa akun. Sebagai EDU Learner (gratis), riwayat belajar, peta pembelajaran, dan assessment tersimpan di VIBOXS Studio.' },
  { g: 'Pendaftaran', q: 'Apakah menjadi EDU Learner menjamin pekerjaan atau diterima sebagai Ranger?', a: 'Tidak. Pendaftaran tidak menjamin diterima bekerja, mendapat proyek, atau menjadi Ranger. Setiap jalur punya kriteria dan proses seleksi tersendiri.' },
  { g: 'Pendaftaran', q: 'Bagaimana saya tahu pendaftaran sudah berhasil?', a: 'Kamu menerima email konfirmasi berisi nomor registrasi atau order, beserta petunjuk akses. Jika tidak masuk dalam 15 menit, periksa folder spam lalu hubungi bantuan.' },
  { g: 'Pembayaran', q: 'Saya sudah membayar, tetapi status masih menunggu.', a: 'Verifikasi bisa memerlukan waktu sesuai penyedia pembayaran. Jangan membayar ulang sebelum status diperbarui — hubungi bantuan dengan nomor order bila status tidak berubah.' },
  { g: 'Pembayaran', q: 'Apakah ada biaya tambahan?', a: 'Total biaya, termasuk pajak atau biaya layanan bila ada, ditampilkan di ringkasan order sebelum kamu membayar.' },
  { g: 'Akses', q: 'Link sesi atau file tidak saya terima.', a: 'Gunakan formulir bantuan dengan topik “Link hilang” dan sertakan email yang kamu gunakan saat mendaftar.' },
  { g: 'Akses', q: 'Apakah ada replay untuk webinar?', a: 'Hanya bila tertulis di bagian “Yang kamu terima” pada halaman program. Jika tidak tertulis, replay tidak termasuk.' },
  { g: 'Perubahan', q: 'Bagaimana jika sesi dijadwal ulang atau dibatalkan?', a: 'Kamu menerima email pemberitahuan. Untuk sesi berbayar yang dibatalkan, tim kami menghubungi terkait pengembalian dana atau pemindahan sesi sesuai kebijakan.' },
  { g: 'Perubahan', q: 'Bisakah saya memindahkan tiket ke orang lain?', a: 'Ketentuan transfer tiket mengikuti kebijakan program masing-masing dan tertulis di halaman detail.' },
];
export const FAQ_G = ['Semua', 'Pendaftaran', 'Pembayaran', 'Akses', 'Perubahan'];

export const SUPPORT: [string, string][] = [
  ['Link atau file hilang', 'Kirim ulang akses ke email terdaftar'],
  ['Salah memasukkan email', 'Pindahkan akses ke email yang benar'],
  ['File tidak bisa dibuka', 'Kirim ulang file atau format alternatif'],
  ['Pembayaran belum terverifikasi', 'Cek status dengan nomor order'],
  ['Refund & perubahan jadwal', 'Sesuai kebijakan pembelian'],
];

/* ---------- turunan tampilan ---------- */
export const rupiah = (n: number) => `Rp${Math.round(n).toLocaleString('id-ID')}`;
const CTA: Record<StatusCode, (p: Program) => string> = {
  OPEN: (p) => (p.free ? 'Daftar gratis' : 'Lihat detail & daftar'), AVAILABLE: () => 'Lihat detail e-book', FULL: () => 'Lihat sesi',
  ANNOUNCED: () => 'Dapatkan pemberitahuan', CLOSED: () => 'Lihat detail', RESCHEDULED: () => 'Lihat jadwal baru',
  CANCELLED: () => 'Info pembatalan', COMPLETED: () => 'Lihat arsip',
};
export const ctaFor = (p: Program) => CTA[p.status](p);
export const priceOf = (p: Program) => (p.free ? 'Gratis' : typeof p.price === 'number' && p.price > 0 ? rupiah(p.price) : 'Harga belum diumumkan');
/**
 * Pembayaran online dibuka hanya bila server menyalakan flag `edu_payments_enabled` (Commander, setelah QA sandbox lulus).
 * Nilai ini cuma menentukan tampilan tombol — edge function edu-checkout tetap menolak bila flag OFF.
 */
export let PAYMENTS_ENABLED = false;
export const setPaymentsEnabled = (v: boolean) => { PAYMENTS_ENABLED = v; };
/** Program berbayar tanpa harga final tidak boleh masuk checkout. */
export const hasPrice = (p: Program) => p.free || (typeof p.price === 'number' && p.price > 0);
/** Fixture QA sandbox (slug `qa-…`) hanya ada di dev lokal; server memprosesnya lewat jalur QA terpisah. */
export const isQa = (p: Program) => import.meta.env.DEV && p.slug.startsWith('qa-');
/** Bisa masuk checkout sekarang? Gratis selalu; berbayar bila harga final & pembayaran dibuka (atau fixture QA di dev). */
export const canPay = (p: Program) => p.free || (hasPrice(p) && (PAYMENTS_ENABLED || isQa(p)));
export const whenOf = (p: Program) => (p.type === 'ebook' ? [p.fileFmt, p.lang].filter(Boolean).join(' · ') : p.day ? `${p.day}, ${p.date}` : p.date || 'Jadwal menyusul');
export const timeOf = (p: Program) => (p.type === 'ebook' ? 'Akses dikirim setelah pembelian terverifikasi' : [p.time, p.mode].filter(Boolean).join(' · '));
export const pathName = (id: string) => PATHS.find((x) => x.id === id)?.name || '';
export const lcFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
export const hrefOf = (p: Program, from: 'programs' | 'events' = 'programs') =>
  p.type === 'ebook' ? `/digital-library/${p.slug}` : from === 'events' ? `/events/${p.slug}` : `/programs/${p.slug}`;

export const byDate = (a: Program, b: Program) => (a.sortDate || '9999').localeCompare(b.sortDate || '9999');
export const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export const rid = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export const DESCS: Record<string, string> = {
  '/': 'VIBOXS EDU: belajar AI dengan arah yang jelas. Temukan pembelajaran sesuai kebutuhan, ukur perkembangan, dan bangun rekam belajar untuk langkah berikutnya.',
  '/programs': 'Katalog program VIBOXS EDU: webinar, workshop, dan e-book tentang AI untuk kerja, karier, dan bisnis. Hanya program yang benar-benar terbit.',
  '/events': 'Kalender webinar dan workshop VIBOXS EDU. Semua waktu dalam WIB (Asia/Jakarta).',
  '/digital-library': 'Digital Library VIBOXS EDU: e-book dan kit praktis tentang AI, lengkap dengan daftar isi, format, dan lisensi.',
  '/edu-learner': 'Gabung EDU Learner gratis: peta belajar personal, riwayat pembelajaran, assessment, dan akses pengajuan peluang profesional.',
  '/for-companies': 'Temukan talenta AI dari pembelajar yang memilih tersedia untuk peluang kerja, dalam workspace perusahaan terverifikasi VIBOXS.',
  '/for-teams': 'Program pelatihan AI dan produktivitas untuk tim perusahaan, disusun bersama VIBOXS Services.',
  '/kolaborator': 'Jadi kontributor VIBOXS EDU: terbitkan webinar, workshop, atau e-book AI. Kelola jadwal, materi, dan laporan pendapatan dalam satu dashboard.',
  '/help': 'Pusat bantuan VIBOXS EDU: pendaftaran, pembayaran, akses materi, dan perubahan jadwal. Hubungi admin@viboxs.com.',
};

export const TITLES: Record<string, string> = {
  '/': 'VIBOXS EDU — Belajar AI dengan Arah yang Jelas',
  '/programs': 'Katalog program — VIBOXS EDU',
  '/events': 'Kalender event — VIBOXS EDU',
  '/digital-library': 'Digital Library — VIBOXS EDU',
  '/edu-learner': 'EDU Learner — VIBOXS EDU',
  '/for-companies': 'Untuk Perusahaan — VIBOXS EDU',
  '/for-teams': 'Program Tim — VIBOXS EDU',
  '/kolaborator': 'Jadi Kontributor — VIBOXS EDU',
  '/help': 'Bantuan & FAQ — VIBOXS EDU',
};

/* ================= Konten halaman utama (dikelola CMS /admin) ================= */
export interface HomeContent {
  announcement: { on: boolean; text: string; link: string; linkLabel: string };
  hero: { chip: string; title: string; accent: string; lead: string; cta1: string; cta2: string; note: string };
  marquee: string[];
  paths: { eyebrow: string; title: string; desc: string };
  featured: { eyebrow: string; title: string; slugs: string[] };
  formats: { eyebrow: string; title: string; note: string };
  schedule: { eyebrow: string; title: string; desc: string };
  enroll: { eyebrow: string; title: string; desc: string };
  collab: { eyebrow: string; title: string; desc: string; cta: string };
  learner: { eyebrow: string; title: string; desc: string; cta: string };
  opportunity: { eyebrow: string; title: string; desc: string };
  companies: { eyebrow: string; title: string; desc: string; cta: string };
  closing: { title: string; desc: string; cta1: string; cta2: string };
  sections: Record<SectionKey, boolean>;
}
export type SectionKey = 'marquee' | 'enroll' | 'learner' | 'collab' | 'opportunity' | 'featured' | 'schedule' | 'paths' | 'formats' | 'bridges' | 'closing';
/** Urutan blok beranda mengikuti PRD v3.0 §04.2. */
export const SECTION_LABEL: Record<SectionKey, string> = {
  marquee: 'Marquee topik', enroll: 'Cara EDU bekerja', learner: 'Ajakan EDU Learner', collab: 'Ajakan kontributor', opportunity: 'Jalur kesempatan',
  featured: 'Program pilihan', schedule: 'Jadwal terdekat', paths: 'Jalur topik', formats: 'Penjelasan format', bridges: 'Perusahaan & Program Tim', closing: 'Penutup & FAQ',
};

/** Copy PRD v3.0 §15 (Public Copy Deck). Tidak menjanjikan pekerjaan, proyek, atau penghasilan. */
export const DEFAULT_HOME: HomeContent = {
  announcement: { on: false, text: '', link: '', linkLabel: 'Lihat' },
  hero: {
    chip: 'EDU LEARNER · VIBOXS', title: 'Belajar AI dengan Arah yang Jelas.', accent: 'Buka Peluang Nyata untuk Berkembang.',
    lead: 'Temukan pembelajaran yang sesuai kebutuhanmu, ukur perkembangan kemampuan, dan bangun rekam belajar yang bisa mendukung langkah berikutnya dalam karier atau bisnis.',
    cta1: 'Gabung EDU Learner', cta2: 'Jelajahi Program', note: 'Gratis untuk membuat akun. Produk tertentu berbayar.',
  },
  marquee: ['Prompting dasar', 'AI untuk dokumen', 'Otomasi kerja', 'SOP & operasional', 'Distribusi konten', 'Riset pasar', 'Komunikasi tertulis', 'Produktivitas'],
  paths: { eyebrow: 'Jalur topik', title: 'Mulai dari tujuanmu.', desc: 'Jalur topik adalah cara memfilter program — bukan program sertifikasi.' },
  featured: { eyebrow: 'Program pilihan', title: 'Yang bisa kamu ikuti sekarang.', slugs: [...FEATURED] },
  formats: { eyebrow: 'Format belajar', title: 'Cara belajar yang sesuai ritmemu.', note: 'Kursus on-demand belum tersedia dan akan tampil setelah platform belajarnya siap.' },
  schedule: { eyebrow: 'Jadwal terdekat', title: 'Sesi yang sudah terkonfirmasi.', desc: 'Semua jam dalam WIB. Sesi yang sudah lewat tidak tampil di sini.' },
  enroll: { eyebrow: 'Cara EDU bekerja', title: 'Dari tujuan, ke pembelajaran, ke langkah berikutnya.', desc: 'Discovery, belajar, assessment, perkembangan, lalu kesempatan — setiap tahap tercatat dan bisa kamu lihat sendiri.' },
  learner: {
    eyebrow: 'EDU Learner', title: 'Lebih dari sekadar membeli kelas.',
    desc: 'Setiap perjalanan belajar punya tujuan, riwayat, dan langkah berikutnya. Sebagai EDU Learner kamu mendapat peta belajar, riwayat pembelajaran, assessment, dan akses pengajuan peluang profesional.',
    cta: 'Gabung EDU Learner',
  },
  collab: {
    eyebrow: 'Kontributor EDU', title: 'Fokus mengajar. VIBOXS membantu materimu menemukan pembelajar yang tepat.',
    desc: 'Trainer, educator, dan training center dapat menerbitkan webinar, workshop, atau e-book AI lewat dashboard kontributor. Setiap pengajuan dikurasi; eksposur tidak menjamin penjualan.',
    cta: 'Ajukan Menjadi Kontributor',
  },
  opportunity: {
    eyebrow: 'Jalur kesempatan', title: 'Kembangkan kemampuan untuk langkah berikutnya.',
    desc: 'Kembangkan kemampuan untuk menjajaki seleksi Rangers, kesempatan perusahaan partner, atau langkah membangun bisnis melalui ekosistem VIBOXS. Semua jalur memiliki kriteria, proses seleksi, dan ketersediaan masing-masing.',
  },
  companies: {
    eyebrow: 'Untuk perusahaan', title: 'Temukan talenta AI yang relevan dengan kebutuhan tim Anda.',
    desc: 'Hanya pembelajar yang memilih tersedia untuk peluang kerja yang dapat ditemukan, melalui workspace perusahaan terverifikasi.',
    cta: 'Pelajari untuk perusahaan',
  },
  closing: { title: 'Mulai dari kemampuanmu hari ini.', desc: 'Gabung EDU Learner untuk memetakan tujuan belajarmu, atau lihat program yang sudah terbit.', cta1: 'Gabung EDU Learner', cta2: 'Jelajahi Program' },
  sections: { marquee: true, enroll: true, learner: true, collab: true, opportunity: true, featured: true, schedule: true, paths: false, formats: false, bridges: true, closing: true },
};

export interface Settings { catalogFilled: boolean; seoTitle: string; seoDesc: string }
export const DEFAULT_SETTINGS: Settings = { catalogFilled: true, seoTitle: TITLES['/'], seoDesc: DESCS['/'] };

/** Objek hidup yang dibaca halaman. Diisi ulang dari database saat aplikasi dimuat. */
export const HOME: HomeContent = structuredClone(DEFAULT_HOME);
export const DEFAULT_PATHS: Path[] = structuredClone(PATHS);
export const DEFAULT_FAQ: Faq[] = structuredClone(FAQ);
export const DEFAULT_STEPS: [string, string][] = structuredClone(STEPS);

const fill = <T,>(arr: T[], next: unknown) => { if (Array.isArray(next) && next.length) arr.splice(0, arr.length, ...(next as T[])); };
/** Gabungkan objek dalam secara dangkal per bagian, agar field baru tetap punya default. */
function mergeHome(v: Partial<HomeContent>) {
  for (const k of Object.keys(DEFAULT_HOME) as (keyof HomeContent)[]) {
    const d = DEFAULT_HOME[k], n = v[k];
    if (n == null) continue;
    (HOME as unknown as Record<string, unknown>)[k] = Array.isArray(d) ? (Array.isArray(n) ? n : d) : typeof d === 'object' ? { ...d, ...(n as object) } : n;
  }
}

export interface RemoteContent { programs?: Program[]; home?: Partial<HomeContent>; paths?: Path[]; faq?: Faq[]; steps?: [string, string][]; settings?: Partial<Settings> }
/** Terapkan konten dari CMS ke data hidup. Data yang kosong/hilang tetap memakai bawaan. */
export function applyRemote(c: RemoteContent) {
  // Daftar dari server adalah kebenaran — termasuk bila kosong (tidak ada fallback ke data contoh).
  if (Array.isArray(c.programs) && !DEV_DEMO) PROGRAMS.splice(0, PROGRAMS.length, ...c.programs.filter((p) => p && p.slug && p.title).map(normalizeProgram));
  if (c.home) mergeHome(c.home);
  fill(PATHS, c.paths);
  fill(FAQ, c.faq);
  fill(STEPS, c.steps);
  if (c.settings) {
    if (c.settings.catalogFilled === false) CATALOG_FILLED = false;
    if (c.settings.seoTitle) TITLES['/'] = c.settings.seoTitle;
    if (c.settings.seoDesc) DESCS['/'] = c.settings.seoDesc;
  }
  if (c.settings?.catalogFilled !== false) CATALOG_FILLED = PROGRAMS.length > 0;
  FEATURED = HOME.featured.slugs.filter((s) => bySlug(s));
  // Tanpa pilihan manual: tampilkan program aktif terdekat (dinamis, bukan hard-code).
  if (!FEATURED.length) FEATURED = PROGRAMS.filter((p) => !p.past && ['OPEN', 'AVAILABLE', 'RESCHEDULED', 'ANNOUNCED'].includes(p.status)).sort(byDate).slice(0, 6).map((p) => p.slug);
}
