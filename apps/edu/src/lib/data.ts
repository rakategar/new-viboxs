/**
 * Katalog EDU — port bertipe dari edu-data.js (Claude Design).
 * SEMUA item berlabel [contoh]: belum ada produk/jadwal/harga yang approved.
 * Harga selalu "[Harga]" atau "Gratis" — PRICE HOLD, jangan menulis angka.
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
}

const D_WEB = {
  outcomes: ['Memahami konsep inti topik dengan contoh dari pekerjaan sehari-hari', 'Mempraktikkan satu alur kerja langsung selama sesi', 'Membawa pulang worksheet untuk dipakai ulang'],
  agenda: [['Pembuka & konteks', '10 menit'], ['Konsep inti dengan contoh', '30 menit'], ['Praktik terpandu', '35 menit'], ['Tanya jawab', '15 menit']] as [string, string][],
  receive: ['Link sesi dikirim ke email setelah registrasi', 'Worksheet PDF', 'Replay — [belum dipastikan]'],
  access: 'Link sesi dikirim H-1 dan 1 jam sebelum sesi. Worksheet dapat diunduh setelah sesi.',
};

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
  { slug: 'riset-pasar-opc', type: 'webinar', path: 'biz', title: 'Pengantar Riset Pasar untuk OPC', summary: 'Cara sederhana memvalidasi ide sebelum membangun produk.', forWho: 'Calon founder dan OPC', level: 'Pemula', status: 'COMPLETED', past: true, free: true, day: 'Kamis', date: '5 November 2026', dShort: '05', mShort: 'NOV', time: '19.00–20.30 WIB', dur: '90 menit', mode: 'Online', loc: 'Zoom', cap: '[Kapasitas]', sortDate: '2026-11-05', added: -1, tags: ['riset', 'pasar', 'validasi'] },
];

export const PROGRAMS: Program[] = RAW.map((p) =>
  p.type === 'ebook' ? p : { ...p, outcomes: p.outcomes || D_WEB.outcomes, agenda: p.agenda || D_WEB.agenda, receive: p.receive || D_WEB.receive, access: p.access || D_WEB.access, lang: 'Bahasa Indonesia' },
);

/** Katalog terisi atau kosong (kondisi produksi saat ini = kosong). Fixtures berlabel [contoh]. */
export const CATALOG_FILLED = (import.meta.env.VITE_EDU_CATALOG ?? 'example') !== 'empty';

export const bySlug = (slug?: string) => PROGRAMS.find((p) => p.slug === slug);
export const FEATURED = ['dasar-ai-kerja-harian', 'sop-bisnis-satu-orang', 'panduan-prompt-operasional', 'distribusi-konten-opc', 'komunikasi-tertulis-kerja', 'otomasi-spreadsheet-ai'];

export const FORMATS = [
  { id: 'ebook', name: 'E-book', kicker: 'Digital Guides', desc: 'Panduan digital yang bisa dibaca kapan saja. Kamu tahu format file, isi, dan cara aksesnya sebelum membeli.', card: 'panduan-prompt-operasional',
    spec: [['Format file', 'PDF & EPUB'], ['Ringkasan isi', '7 bab · pola prompt & contoh'], ['Cara akses', 'Link unduhan dikirim ke email'], ['Harga', '[Harga]']],
    fallback: 'Belum tersedia. Tombol beli hanya muncul setelah file final, hak distribusi, dan harga disetujui.' },
  { id: 'webinar', name: 'Live Webinar', kicker: 'Sesi langsung', desc: 'Sesi online terjadwal dengan fasilitator. Jadwal selalu ditulis lengkap dalam WIB.', card: 'dasar-ai-kerja-harian',
    spec: [['Hari & tanggal', 'Kamis, 3 Desember 2026'], ['Jam', '19.00–20.30 WIB'], ['Durasi', '90 menit'], ['Online / offline', 'Online · Zoom'], ['Harga', 'Gratis']],
    fallback: 'Jadwal webinar berikutnya belum diumumkan. Aktifkan pemberitahuan untuk kabar pertama.' },
  { id: 'workshop', name: 'Workshop', kicker: 'Praktik terpandu', desc: 'Sesi praktik lebih panjang dengan kapasitas terbatas dan output yang jelas di akhir sesi.', card: 'sop-bisnis-satu-orang',
    spec: [['Modus', 'Online · Zoom'], ['Kapasitas', '[Kapasitas] peserta'], ['Lokasi / joining', 'Link dikirim setelah pembayaran'], ['Output', '1 SOP siap pakai']],
    fallback: 'Workshop tampil setelah kapasitas dan penyelenggara pasti.' },
];

export const STEPS: [string, string][] = [
  ['Pilih program', 'Pastikan statusnya “Pendaftaran dibuka” atau “Tersedia”.'],
  ['Periksa detailnya', 'Materi, durasi, harga, dan ketentuan tertulis sebelum kamu mendaftar.'],
  ['Isi identitas seperlunya', 'Nama dan email. Persetujuan pemasaran terpisah dan opsional.'],
  ['Bayar atau konfirmasi', 'Program gratis cukup dikonfirmasi. Program berbayar lewat penyedia pembayaran.'],
  ['Terima bukti & akses', 'Tiket, link, atau file dikirim ke email — beserta jalur bantuan.'],
];

export interface Faq { g: string; q: string; a: string }
export const FAQ: Faq[] = [
  { g: 'Pendaftaran', q: 'Apakah saya perlu membuat akun untuk melihat program?', a: 'Tidak. Semua informasi program bisa dibaca tanpa login. Data diri hanya diminta saat kamu mendaftar.' },
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
const CTA: Record<StatusCode, (p: Program) => string> = {
  OPEN: (p) => (p.free ? 'Daftar gratis' : 'Lihat detail & daftar'), AVAILABLE: () => 'Lihat detail e-book', FULL: () => 'Lihat sesi',
  ANNOUNCED: () => 'Dapatkan pemberitahuan', CLOSED: () => 'Lihat detail', RESCHEDULED: () => 'Lihat jadwal baru',
  CANCELLED: () => 'Info pembatalan', COMPLETED: () => 'Lihat arsip',
};
export const ctaFor = (p: Program) => CTA[p.status](p);
export const priceOf = (p: Program) => (p.free ? 'Gratis' : '[Harga]');
export const whenOf = (p: Program) => (p.type === 'ebook' ? `${p.fileFmt} · ${p.lang}` : p.day ? `${p.day}, ${p.date}` : p.date || '');
export const timeOf = (p: Program) => (p.type === 'ebook' ? 'Link unduhan dikirim ke email' : `${p.time} · ${p.mode}`);
export const pathName = (id: string) => PATHS.find((x) => x.id === id)?.name || '';
export const lcFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
export const hrefOf = (p: Program, from: 'programs' | 'events' = 'programs') =>
  p.type === 'ebook' ? `/library/${p.slug}` : from === 'events' ? `/events/${p.slug}` : `/programs/${p.slug}`;

export const byDate = (a: Program, b: Program) => a.sortDate.localeCompare(b.sortDate);
export const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export const rid = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export const TITLES: Record<string, string> = {
  '/': 'VIBOXS EDU — Belajar keterampilan yang bisa langsung dipraktikkan',
  '/programs': 'Katalog program — VIBOXS EDU',
  '/events': 'Jadwal event — VIBOXS EDU',
  '/corporate-training': 'Training untuk tim — VIBOXS EDU',
  '/help': 'Bantuan & FAQ — VIBOXS EDU',
};
