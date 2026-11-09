// Copy services.viboxs.com — dari "VIBOXS Services.dc.html" + services-data.js (Claude Design).
// Semua copy berstatus PROPOSED (03_DESIGN_SERVICES.md). Founder memilih final.

/**
 * Endpoint penerima brief Start a Mission (POST JSON → { ref }).
 * null = formulir NONAKTIF sampai kebijakan privasi & penerima lead siap (brief §6, INTAKE_ENABLED=false).
 * Set lewat env VITE_INTAKE_ENDPOINT di Vercel ketika sudah siap.
 */
export const INTAKE_ENDPOINT: string | null = import.meta.env.VITE_INTAKE_ENDPOINT || null;

/** Studi kasus yang sudah disetujui klien (maks 3). Kosong → state kosong yang jujur, /work tidak di menu. */
export const CASE_STUDIES: { slug: string; title: string }[] = [];

export type SvcKey = 'websites' | 'automation' | 'dashboards' | 'ai' | 'growth';
export type CatKey = SvcKey | 'advisory' | 'training' | 'infra' | 'unsure';

export interface Service {
  key: SvcKey;
  n: string;
  name: string;
  slug: string;
  photo?: string;
  photoAlt?: string;
  problem: string;
  promise: string;
  who: string;
  inputs: string[];
  outputs: string[];
  chips: string[];
  forWhom: [string, string][];
  deliv: [string, string][];
  cases: [string, string][];
  exclLead: string;
  excl: string[];
  exclShort: string;
}

export const SVC_ORDER: SvcKey[] = ['websites', 'automation', 'dashboards', 'ai', 'growth'];

export const SVC: Record<SvcKey, Service> = {
  websites: {
    key: 'websites', n: '01', name: 'Websites & Systems', slug: 'websites',
    photo: '/assets/photo-membangun.jpeg', photoAlt: 'Dua orang meninjau kode di layar komputer',
    problem: 'Identitas online, lead, transaksi, dan alur produk digital yang terfragmentasi.',
    promise: 'Website komersial, landing page, form, booking, alur produk digital, dan aplikasi bisnis — dibangun sesuai ruang lingkup yang disepakati.',
    who: 'Founder, pemilik bisnis, korporat',
    inputs: ['Identitas online belum jelas', 'Lead & transaksi tercecer', 'Alur produk terfragmentasi'],
    outputs: ['Website', 'Landing page', 'Booking & form', 'Sistem produk'],
    chips: ['Website', 'Landing page', 'Booking', 'Form', 'Sistem produk'],
    forWhom: [
      ['Founder OPC', 'Butuh kehadiran online yang menjelaskan penawaran dan menerima permintaan tanpa admin manual.'],
      ['Pemilik bisnis', 'Lead masuk dari banyak kanal dan sulit dilacak; booking masih lewat chat satu per satu.'],
      ['Korporat', 'Butuh situs atau portal yang mengikuti standar keamanan, aksesibilitas, dan dokumentasi internal.'],
    ],
    deliv: [['Interface responsif untuk desktop dan mobile', ''], ['Form dan alur booking', ''], ['Integrasi analitik', ''], ['Admin panel atau CRM', 'Jika disepakati'], ['Dokumentasi teknis', '']],
    cases: [['Website corporate', 'Profil, layanan, dan kanal kontak yang jelas.'], ['Halaman promosi', 'Landing page untuk satu kampanye atau penawaran.'], ['Program edukasi', 'Informasi program, jadwal, dan pendaftaran.'], ['Portal bisnis', 'Area login untuk klien atau mitra.']],
    exclLead: 'Tidak termasuk dalam biaya, kecuali disebut di SOW:',
    excl: ['Hosting berbayar', 'Copywriting', 'Fotografi', 'Domain', 'Maintenance', 'Transfer hak kekayaan intelektual'],
    exclShort: 'Hosting berbayar, copywriting, foto, domain, maintenance, dan transfer IP tidak termasuk kecuali disebut di SOW.',
  },
  automation: {
    key: 'automation', n: '02', name: 'AI Automation', slug: 'automation',
    problem: 'Pekerjaan repetitif dan follow-up yang tidak konsisten.',
    promise: 'Alur kerja otomatis untuk routing, notifikasi, pencatatan CRM, dan administrasi — dengan aturan dan titik pengecekan yang jelas.',
    who: 'Pemilik bisnis, operator, tim admin',
    inputs: ['Input data berulang', 'Follow-up terlewat', 'Serah-terima antar tim lambat'],
    outputs: ['Workflow', 'Routing & notifikasi', 'Pencatatan CRM', 'Administrasi'],
    chips: ['Workflow', 'Routing', 'Notifikasi', 'CRM', 'Administrasi'],
    forWhom: [['Founder OPC', 'Waktu habis untuk menyalin data dan mengingat follow-up.'], ['Bisnis yang berkembang', 'Permintaan masuk lebih cepat dari kemampuan tim memprosesnya.'], ['Institusi / perusahaan', 'Proses persetujuan berpindah lewat email dan sulit dilacak.']],
    deliv: [['Peta alur kerja yang disepakati', ''], ['Workflow otomatis dengan aturan tertulis', ''], ['Notifikasi dan routing ke orang yang tepat', ''], ['Integrasi ke CRM atau spreadsheet', 'Jika disepakati'], ['Log aktivitas dan panduan penanganan error', '']],
    cases: [['Follow-up lead', 'Pengingat dan tugas otomatis setelah form masuk.'], ['Routing permintaan', 'Permintaan diteruskan ke tim sesuai kategori.'], ['Administrasi rutin', 'Rekap dan dokumen berulang disusun otomatis.'], ['Onboarding klien', 'Checklist dan pesan sambutan terjadwal.']],
    exclLead: 'Yang tidak kami janjikan:',
    excl: ['Alur yang berjalan tanpa error sama sekali', 'Operasi 24/7 tanpa pengawasan', 'Pesan massal tanpa aturan consent penerima'],
    exclShort: 'Tidak menjanjikan tanpa error, 24/7, atau pesan massal tanpa aturan consent.',
  },
  dashboards: {
    key: 'dashboards', n: '03', name: 'Dashboard & Internal Systems', slug: 'dashboards',
    photo: '/assets/photo-diskusi.jpeg', photoAlt: 'Tim berdiskusi di depan layar berisi grafik',
    problem: 'Data tersebar di banyak file dan keputusan jadi lambat.',
    promise: 'Dashboard, form yang terhubung, admin panel, dan aplikasi internal untuk melihat kondisi bisnis dari satu tempat.',
    who: 'Operator, manajer, tim internal',
    inputs: ['Data di banyak spreadsheet', 'Laporan disusun manual', 'Status pekerjaan tidak terlihat'],
    outputs: ['Dashboard', 'Form terhubung', 'Admin panel', 'Internal apps'],
    chips: ['Dashboard', 'Form terhubung', 'Admin panel', 'Internal apps'],
    forWhom: [['Founder OPC', 'Angka penting tersebar di beberapa aplikasi.'], ['Bisnis yang berkembang', 'Laporan mingguan disusun ulang dari nol setiap kali.'], ['Institusi / perusahaan', 'Butuh tampilan data dengan hak akses per peran.']],
    deliv: [['Dashboard dengan metrik yang disepakati', ''], ['Form input yang terhubung ke data', ''], ['Admin panel dengan hak akses', ''], ['Integrasi sumber data lama', 'Setelah audit'], ['Dokumentasi struktur data', '']],
    cases: [['Laporan operasional', 'Ringkasan harian dari beberapa sumber.'], ['Pelacakan permintaan', 'Status tiap permintaan dari masuk sampai selesai.'], ['Admin panel', 'Kelola data tanpa menyentuh database.'], ['Aplikasi internal', 'Alat kerja kecil untuk satu proses spesifik.']],
    exclLead: 'Batasan yang perlu diketahui:',
    excl: ['Data sensitif tidak dipublikasikan', 'Integrasi sistem lama perlu audit terlebih dahulu', 'Akurasi bergantung pada data yang diinput'],
    exclShort: 'Data sensitif tidak dipublikasi; integrasi lama perlu audit; akurasi bergantung pada data input.',
  },
  ai: {
    key: 'ai', n: '04', name: 'AI Integration', slug: 'ai-integration',
    problem: 'AI dibutuhkan di workflow spesifik, dengan kontrol yang jelas.',
    promise: 'Asisten kontekstual dan integrasi data di dalam alur kerja Anda — dengan batasan, log, dan persetujuan manusia di titik yang menentukan.',
    who: 'Tim operasional, layanan pelanggan, korporat',
    inputs: ['Tugas berbasis dokumen berulang', 'Pengetahuan internal tersebar', 'Keputusan perlu dicek manusia'],
    outputs: ['Asisten kontekstual', 'Integrasi data', 'Human approval', 'Log & batasan'],
    chips: ['Asisten kontekstual', 'Integrasi data', 'Human approval'],
    forWhom: [['Founder OPC', 'Ingin AI membantu menyusun draf tanpa kehilangan kontrol.'], ['Bisnis yang berkembang', 'Tim menjawab pertanyaan serupa dari dokumen yang sama.'], ['Institusi / perusahaan', 'Butuh AI yang patuh pada kebijakan data dan bisa diaudit.']],
    deliv: [['Pemetaan use case dan batasannya', ''], ['Asisten kontekstual pada data yang disepakati', ''], ['Alur persetujuan manusia (human approval)', ''], ['Integrasi ke aplikasi yang sudah dipakai', 'Jika disepakati'], ['Panduan pemakaian dan evaluasi', '']],
    cases: [['Draf balasan', 'Draf jawaban yang dicek tim sebelum dikirim.'], ['Ringkasan dokumen', 'Ringkasan dari arsip internal beserta sumbernya.'], ['Klasifikasi permintaan', 'Label otomatis yang bisa dikoreksi.'], ['Asisten internal', 'Tanya-jawab pada dokumen yang diizinkan.']],
    exclLead: 'Ditentukan per SOW:',
    excl: ['Biaya token/API dan lisensi', 'Standar keamanan data', 'Penanganan risiko hallucination', 'Tahap human review'],
    exclShort: 'Biaya token/API, lisensi, keamanan, risiko hallucination, dan human review ditentukan per SOW.',
  },
  growth: {
    key: 'growth', n: '05', name: 'Growth & Content', slug: 'growth-content',
    problem: 'Konten berjalan, tetapi tidak terhubung ke akuisisi.',
    promise: 'Funnel, brand activation, dan alur content-to-lead yang menghubungkan konten dengan langkah berikutnya calon pelanggan.',
    who: 'Founder, tim marketing, brand',
    inputs: ['Konten tanpa tujuan lanjutan', 'Kampanye sulit diukur', 'Lead tidak ditindaklanjuti'],
    outputs: ['Funnel', 'Brand activation', 'Content-to-lead', 'Pelacakan kampanye'],
    chips: ['Funnel', 'Brand activation', 'Content-to-lead'],
    forWhom: [['Founder OPC', 'Rutin membuat konten tetapi belum ada jalur ke penawaran.'], ['Bisnis yang berkembang', 'Kampanye berjalan, tetapi hasilnya sulit dibaca.'], ['Institusi / perusahaan', 'Butuh aktivasi brand untuk program atau peluncuran.']],
    deliv: [['Peta funnel dan pesan per tahap', ''], ['Landing page dan form kampanye', ''], ['Alur content-to-lead', ''], ['Pelacakan dan laporan kampanye', ''], ['Produksi konten', 'Jika disepakati']],
    cases: [['Peluncuran program', 'Rangkaian konten menuju pendaftaran.'], ['Lead magnet', 'Materi unduhan yang terhubung ke follow-up.'], ['Brand activation', 'Kampanye untuk satu momen atau acara.'], ['Nurturing', 'Rangkaian pesan untuk lead yang belum siap.']],
    exclLead: 'Yang tidak kami janjikan:',
    excl: ['KPI tanpa memperhitungkan media budget', 'Jumlah views tertentu', 'Angka penjualan tertentu'],
    exclShort: 'KPI bergantung pada media budget; tidak menjanjikan views atau penjualan.',
  },
};

export const svcBySlug = (slug?: string) => SVC_ORDER.map((k) => SVC[k]).find((s) => s.slug === slug);
export const svcHref = (k: SvcKey) => `/services/${SVC[k].slug}`;

export const CATS: { k: CatKey; t: string; d: string }[] = [
  { k: 'websites', t: 'Websites & Systems', d: 'Website, landing page, booking, sistem produk' },
  { k: 'automation', t: 'AI Automation', d: 'Workflow, routing, notifikasi, CRM' },
  { k: 'dashboards', t: 'Dashboard & Internal', d: 'Dashboard, admin panel, internal apps' },
  { k: 'ai', t: 'AI Integration', d: 'Asisten kontekstual dengan kontrol' },
  { k: 'growth', t: 'Growth & Content', d: 'Funnel, content-to-lead' },
  { k: 'advisory', t: 'Strategic Advisory', d: 'Diagnosis, opportunity mapping, roadmap' },
  { k: 'training', t: 'Corporate Training', d: 'Pelatihan custom untuk organisasi' },
  { k: 'infra', t: 'Digital Infrastructure', d: 'Domain, hosting, SSL, maintenance' },
  { k: 'unsure', t: 'Belum yakin', d: 'Bantu saya menentukan' },
];
export const catLabel = (k: string) => CATS.find((c) => c.k === k)?.t || '';

export const JENIS: [string, string][] = [['baru', 'Proyek baru'], ['perbaiki', 'Perbaiki yang ada'], ['support', 'Support'], ['partner', 'Partner inquiry']];
export const ORGS: [string, string][] = [['opc', 'OPC'], ['usaha', 'Usaha'], ['perusahaan', 'Perusahaan'], ['institusi', 'Institusi'], ['agency', 'Agency'], ['lain', 'Lainnya']];
export const STATUSES: [string, string][] = [['ide', 'Ide'], ['berjalan', 'Proses berjalan'], ['prototype', 'Prototype'], ['live', 'Live, perlu perubahan']];
export const HORIZON = ['Belum ditentukan', 'Kurang dari 1 bulan', '1–3 bulan', '3–6 bulan', 'Lebih dari 6 bulan'];
export const BUDGET = ['Belum tahu — ingin diskusi', 'Sudah ada alokasi, dijelaskan saat diskusi', 'Perlu estimasi untuk pengajuan internal'];
export const WA = ['+62', '+60', '+65', '+61', '+1', '+44'];

export const HERO: { i: string; o: string; s: SvcKey }[] = [
  { i: 'Lead & transaksi tercecer', o: 'Website, form & booking', s: 'websites' },
  { i: 'Pekerjaan repetitif, follow-up terlewat', o: 'Alur otomasi & routing', s: 'automation' },
  { i: 'Data tersebar, keputusan lambat', o: 'Dashboard & admin panel', s: 'dashboards' },
  { i: 'AI dibutuhkan di proses spesifik', o: 'Asisten AI dengan persetujuan manusia', s: 'ai' },
  { i: 'Konten tidak menghasilkan lead', o: 'Funnel content-to-lead', s: 'growth' },
];

export interface FlowStep { t: string; act: string; out: string; file: string; gate?: boolean; doc: string[] }
export const FLOW: FlowStep[] = [
  { t: 'Initial brief', act: 'Anda mengirim kebutuhan lewat Start a Mission. Kami membaca, memastikan kategorinya, dan menentukan apakah perlu discovery.', out: 'Nomor referensi dan keputusan lanjut atau tidak.', file: 'brief-awal.md', doc: ['# Brief awal', 'referensi: SVC-2026-XXXX', 'kategori: Websites & Systems', 'jenis: Proyek baru', 'hasil: "form booking untuk 3 cabang"', 'status: Ide'] },
  { t: 'Discovery', act: 'Sesi tanya-jawab tentang konteks bisnis, proses yang berjalan, data, dan batasan.', out: 'Ringkasan kebutuhan yang Anda konfirmasi.', file: 'ringkasan-kebutuhan.md', doc: ['# Ringkasan kebutuhan', 'pengguna: admin cabang, pelanggan', 'proses sekarang: booking via chat', 'batasan: data pelanggan tetap internal', '[ ] dikonfirmasi klien'] },
  { t: 'Scope & Proposal', act: 'Kami menyusun ruang lingkup, opsi solusi, estimasi biaya, jadwal, dan ketentuan kerja.', out: 'Proposal dan SOW tertulis.', file: 'proposal-sow.pdf', doc: ['# Proposal & SOW', '1. Ruang lingkup', '2. Di luar lingkup', '3. Estimasi biaya', '4. Milestone & jadwal', '5. Kriteria penerimaan'] },
  { t: 'Scope lock / DP', act: 'Proposal disepakati, kontrak ditandatangani, dan pembayaran awal dilakukan sesuai ketentuan.', out: 'Gate: pembangunan baru dimulai di tahap ini.', file: 'kesepakatan-lingkup.pdf', gate: true, doc: ['# Kesepakatan lingkup', 'SOW: versi final', 'kontrak: ditandatangani', 'pembayaran awal: sesuai ketentuan', '→ gate terbuka: build dimulai'] },
  { t: 'Build', act: 'Pembangunan per milestone dengan pembaruan berkala di lingkungan uji.', out: 'Hasil per milestone yang bisa Anda tinjau.', file: 'catatan-milestone.md', doc: ['# Milestone 2 dari 3', 'selesai: halaman utama, form', 'berjalan: integrasi notifikasi', 'lingkungan uji: tersedia', 'perubahan di luar lingkup: dicatat'] },
  { t: 'Review / UAT', act: 'Anda menguji hasil terhadap kriteria penerimaan di SOW. Revisi dalam lingkup dicatat dan dikerjakan.', out: 'Daftar UAT yang disetujui.', file: 'daftar-uat.xlsx', doc: ['# Daftar UAT', '[x] form booking terkirim', '[x] notifikasi ke admin', '[ ] tampilan mobile 360px', 'revisi dalam lingkup: dicatat'] },
  { t: 'Launch / Handover', act: 'Rilis, serah terima akses, dan dokumentasi. Dukungan lanjutan mengikuti paket atau kontrak.', out: 'Dokumen serah terima.', file: 'serah-terima.pdf', doc: ['# Serah terima', 'akses: dialihkan ke akun klien', 'dokumentasi teknis: terlampir', 'panduan admin: terlampir', 'dukungan: sesuai kontrak'] },
];

export const PRICE = 'Setiap proyek memiliki kebutuhan dan ruang lingkup yang berbeda. Setelah kami memahami kebutuhan Anda, kami menyiapkan penjelasan solusi, estimasi biaya, dan ketentuan kerja dalam proposal.';

export type QA = { q: string; a: string; g?: string };
export const COMM: QA[] = [
  { q: 'Ruang lingkup dan perubahan ditulis', a: 'Lingkup kerja ditulis di SOW. Perubahan di tengah jalan dicatat tertulis bersama dampaknya pada biaya dan jadwal, lalu dikerjakan setelah Anda setujui.' },
  { q: 'Harga custom, setelah scoping', a: PRICE },
  { q: 'Milestone dan acceptance ada di proposal', a: 'Tahapan pembayaran, milestone, dan kriteria penerimaan (acceptance) dicantumkan di proposal yang Anda setujui.' },
  { q: 'Dukungan setelah launch', a: 'Dukungan setelah launch mengikuti paket atau kontrak yang disepakati — tidak otomatis termasuk dalam proyek.' },
];

/** FAQ detail layanan; jawaban "tidak termasuk biaya" diisi dari exclShort tiap layanan. */
export const dFaq = (s: Service): QA[] => [
  { q: 'Informasi awal apa yang perlu disiapkan?', a: 'Tujuan bisnis, siapa penggunanya, proses yang berjalan sekarang, dan contoh referensi bila ada. Belum lengkap tidak masalah — discovery membantu melengkapinya.' },
  { q: 'Bagaimana proposal dan estimasi dibuat?', a: PRICE },
  { q: 'Apa yang tidak termasuk biaya?', a: s.exclShort },
  { q: 'Bagaimana review, revisi, dan serah terima?', a: 'Anda menguji hasil terhadap kriteria penerimaan di SOW (UAT). Revisi dalam lingkup dikerjakan sesuai jumlah yang disepakati; setelah lolos, kami menyerahkan akses dan dokumentasi.' },
];

export const FAQ: QA[] = [
  { g: 'Quotation', q: 'Apakah ada daftar harga atau paket?', a: 'Tidak. ' + PRICE },
  { g: 'Quotation', q: 'Apakah mengirim brief berarti setuju membayar?', a: 'Tidak. Brief adalah awal percakapan. Komitmen biaya baru berlaku setelah proposal disepakati dan kontrak ditandatangani.' },
  { g: 'Revisi', q: 'Berapa kali revisi yang termasuk?', a: 'Jumlah dan cakupan revisi ditulis di SOW. Perubahan di luar lingkup dicatat tertulis bersama dampaknya pada biaya dan jadwal.' },
  { g: 'Revisi', q: 'Bagaimana jika kebutuhan berubah di tengah proyek?', a: 'Kami mencatat permintaan perubahan, menjelaskan dampaknya, dan menunggu persetujuan Anda sebelum mengerjakannya.' },
  { g: 'Timeline', q: 'Berapa lama sebuah proyek?', a: 'Bergantung pada ruang lingkup, kesiapan materi, dan kecepatan review. Jadwal ditulis per milestone di proposal — kami tidak menjanjikan satu durasi untuk semua proyek.' },
  { g: 'Timeline', q: 'Kapan pengerjaan dimulai?', a: 'Setelah ruang lingkup dikunci dan pembayaran awal diterima. Inquiry tidak otomatis memulai development.' },
  { g: 'Hosting', q: 'Apakah hosting dan domain termasuk?', a: 'Tidak otomatis. Hosting, domain, dan SSL dapat diatur lewat Digital Infrastructure bila disebut di SOW; biaya pihak ketiga dijelaskan terpisah.' },
  { g: 'Hosting', q: 'Siapa pemilik akun hosting?', a: 'Kepemilikan akun dan akses ditulis di SOW. Kami menyarankan akun atas nama organisasi Anda.' },
  { g: 'AI API', q: 'Siapa yang menanggung biaya token atau API AI?', a: 'Biaya pemakaian API, lisensi, dan batas penggunaan ditentukan per SOW. Biaya ini bergantung pada volume dan penyedia yang dipilih.' },
  { g: 'AI API', q: 'Apakah hasil AI selalu benar?', a: 'Tidak. Model AI bisa keliru (hallucination). Karena itu kami merancang batasan, log, dan tahap persetujuan manusia untuk keputusan penting.' },
  { g: 'Maintenance', q: 'Apakah ada dukungan setelah launch?', a: 'Dukungan setelah launch mengikuti paket atau kontrak yang disepakati. Tanpa kontrak dukungan, perbaikan dibahas sebagai permintaan terpisah.' },
  { g: 'Maintenance', q: 'Bisakah melanjutkan ke fase berikutnya?', a: 'Bisa. Fase lanjutan dimulai dari brief baru agar ruang lingkup dan biayanya jelas.' },
];
export const FAQ_G = ['Semua', 'Quotation', 'Revisi', 'Timeline', 'Hosting', 'AI API', 'Maintenance'];

const KW: [CatKey, RegExp][] = [
  ['automation', /otomas|otomatis|follow.?up|workflow|crm|notifikasi|repetitif|berulang|routing/],
  ['dashboards', /dashboard|laporan|report|admin panel|internal|data/],
  ['ai', /\bai\b|asisten|chatbot|gpt|llm/],
  ['growth', /konten|funnel|marketing|iklan|kampanye|brand|lead/],
  ['websites', /website|situs|\bweb\b|landing|booking|halaman|toko|portal|aplikasi/],
  ['advisory', /strategi|roadmap|diagnos|arah/],
  ['training', /pelatihan|training|workshop|kelas/],
  ['infra', /domain|hosting|ssl|server/],
];
/** Tebak kategori dari teks bebas (closing prompt) — hanya pra-isi, pengguna tetap memilih. */
export function matchCat(t: string): CatKey | '' {
  const s = (t || '').toLowerCase();
  for (const [k, re] of KW) if (re.test(s)) return k;
  return s.includes('belum yakin') ? 'unsure' : '';
}

export const PROMPT_CHIPS = ['Website dengan form booking', 'Otomasi follow-up pelanggan', 'Dashboard laporan mingguan', 'Belum yakin, bantu saya menentukan'];

export const NAV: { to: string; label: string }[] = [
  { to: '/advisory', label: 'Advisory' },
  ...(CASE_STUDIES.length ? [{ to: '/work', label: 'Work' }] : []),
  { to: '/process', label: 'Process' },
  { to: '/partners', label: 'Partners' },
];

export const TITLES: Record<string, string> = {
  '/': 'VIBOXS Services — Solusi digital berbasis proposal',
  '/start': 'Start a Mission — VIBOXS Services',
  '/process': 'Proses kerja — VIBOXS Services',
  '/partners': 'Partners — VIBOXS Services',
  '/advisory': 'Strategic Advisory — VIBOXS Services',
  '/capabilities': 'Capabilities — VIBOXS Services',
  '/faq': 'FAQ — VIBOXS Services',
  '/work': 'Work — VIBOXS Services',
  '/privacy': 'Kebijakan privasi — VIBOXS Services',
  '/terms': 'Ketentuan layanan — VIBOXS Services',
};

/** Konteks yang dibawa ke /start lewat query: ?kategori=websites&jenis=partner&org=opc&from=… */
export type StartPrefill = { kategori?: CatKey; jenis?: string; org?: string; hasil?: string; from?: string };
export const startHref = (p: StartPrefill = {}) => {
  const q = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => v && q.set(k, v));
  const s = q.toString();
  return `/start${s ? `?${s}` : ''}`;
};
