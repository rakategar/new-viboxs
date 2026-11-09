# Design Brief — services.viboxs.com (Services)
**Untuk:** Claude Design · **Wajib dilampirkan bersama:** `01_SHARED_DESIGN_SYSTEM.md`
**Sumber:** D04 Services Blueprint, D10 Build Pack, D01, D02, D08, D14
**Status copy:** semua PROPOSED.

---

## 0. Tugas untuk Claude Design

1. **Homepage** S01–S08 — desktop 1440 + mobile 390.
2. **Template detail layanan** `/services/{slug}` — tampilkan 1 contoh penuh (Websites & Systems) + kartu ringkas 4 layanan lain.
3. **/start** (Start a Mission) — form 2 langkah dengan **semua state**: idle, invalid + error summary, submitting, sukses + nomor referensi, server error, offline, form dinonaktifkan.
4. **/process**, **/partners**, **/advisory**, **/capabilities**, **/faq** — desktop + mobile.
5. **/work** kosong (kondisi sekarang) dan template untuk nanti.

---

## 1. Mandat

Jalur profesional yang menjelaskan kemampuan VIBOXS secara konkret, memudahkan pengunjung memilih bantuan, menerima brief dengan aman, dan mengubahnya menjadi konsultasi/permintaan proposal — **tanpa mengambil alih positioning OPC-first** ekosistem.

**Positioning:** bukan "jasa bikin website murah dan cepat". Narasi: **diagnosis kebutuhan → desain lingkup → pembangunan solusi → review & handover.** Teknologi adalah instrumen, bukan janji hasil.

**Harga:** proyek custom **berbasis proposal**. Tidak ada angka "mulai dari", kalkulator harga, atau daftar paket publik.

### Pengunjung
| Persona | Pertanyaan | Jalur |
|---|---|---|
| OPC founder / solopreneur | Bagaimana membangun sistem tanpa tim besar? | Kategori → Start a Mission; opsional Universe |
| Pemilik bisnis / operator | Di mana proses manual menghambat? | Automation / Dashboard → brief |
| Korporat / procurement | Ada SOW, keamanan, UAT, dokumentasi? | Process / Request Proposal |
| Trainer / konsultan / agency | Bisa jadi builder white-label? | Partners — inquiry rahasia |
| Klien existing | Minta perubahan/fase berikutnya | Kontak langsung |
| Belum tahu kategori | Saya belum tahu butuh apa | Pilihan "Belum yakin, bantu saya menentukan" |

---

## 2. Penawaran

### Tiga tingkat nilai
| Tingkat | Isi | CTA |
|---|---|---|
| 01 Diagnose | Strategic Advisory: diagnosis bisnis, opportunity mapping, roadmap, arah produk/AI | Diskusikan tantangan |
| 02 Build | Website, aplikasi, dashboard, automation, integrasi AI, growth systems, infrastruktur | Kirim brief / minta proposal |
| 03 Ongoing | Iterasi, maintenance, growth support; kerja sama strategis selektif | Bahas kelanjutan |

### Lima layanan inti
| Layanan | Route | Masalah yang ditangani | Contoh output |
|---|---|---|---|
| Websites & Systems | `/services/websites` | Identitas online, lead, transaksi, alur produk digital terfragmentasi | Website, landing page, booking, form, sistem produk |
| AI Automation | `/services/automation` | Pekerjaan repetitif, follow-up tidak konsisten | Workflow, routing, notifikasi, CRM, administrasi |
| Dashboard & Internal Systems | `/services/dashboards` | Data tersebar, keputusan lambat | Dashboard, form terhubung, admin panel, internal apps |
| AI Integration | `/services/ai-integration` | Butuh AI di workflow spesifik dengan kontrol | Asisten kontekstual, integrasi data, human approval |
| Growth & Content | `/services/growth-content` | Konten tidak terhubung ke akuisisi | Funnel, brand activation, content-to-lead |

Kapabilitas pendukung (di /capabilities): **Strategic Advisory · Academy & Corporate Training** (custom organisasi; kelas publik tetap di EDU) **· Digital Infrastructure** (domain, hosting, SSL, maintenance).

---

## 3. Sitemap & navigasi

| Route | Fungsi |
|---|---|
| `/` | Homepage |
| `/services/{slug}` | 5 detail layanan |
| `/advisory` | Advisory — harga ditahan |
| `/capabilities` | Training & infrastructure; kelas publik → link EDU |
| `/process` | Scoping, SOW, review, UAT, handover |
| `/work`, `/work/{slug}` | Kondisional |
| `/partners` | Jalur B2B/white-label |
| `/start` | Brief/inquiry |
| `/faq`, `/privacy`, `/terms` | Bantuan & legal |

**Menu lokal:** Solutions · Advisory · Work (kondisional) · Process · Partners · **[Start a Mission]** (CTA selalu terlihat di desktop).
**Breadcrumb** di detail: Services → Kategori.

---

## 4. Homepage — 8 section

### S01 — Shared header
Brand bar + switcher (Services aktif) + menu lokal + CTA "Start a Mission".

### S02 — Hero (business-first)
- **H1 — pilih satu:**
  - A: *Bangun sistem yang menjawab kebutuhan bisnis Anda.*
  - B: *Dari kebutuhan bisnis menuju solusi digital yang tepat.*
- **Subheadline:** *VIBOXS membantu memetakan tantangan, menentukan ruang lingkup, dan membangun website, sistem, otomasi, serta integrasi AI sesuai kebutuhan.*
- **CTA primer:** "Konsultasikan Kebutuhan" → /start · **Sekunder:** "Jelajahi Layanan" → #solutions
- **Visual:** diagram sistem input → intervensi → output; **tidak** mengarang rekam jejak.

### S03 — Who we help
Tiga kartu intent: **Founder OPC · Bisnis yang berkembang · Institusi/perusahaan**. 1–2 kalimat masalah per segmen. Klik → /start dengan intent terpilih.

### S04 — Core solutions (#solutions)
5 kartu: kategori, untuk siapa, tantangan, contoh output, CTA detail + CTA "Mulai dengan layanan ini". Sequential reveal sekali; hover kartu maju 6–10px.

### S05 — Working model
Alur: **Initial brief → Discovery → Scope & Proposal → Scope lock/DP → Build → Review/UAT → Launch/Handover.** Catatan: *"Setiap engagement menyesuaikan kontrak."* Timeline animasi tanpa mengunci scroll; reduced motion = daftar langkah statis.

### S06 — Selected proof
Maks 3 kasus approved. **Saat ini kosong → tampilkan:** *"Lihat cara kami menyusun kebutuhan dan menyiapkan serah terima pekerjaan."* + link /process. Tidak ada logo wall/testimoni.

### S07 — Commercial clarity
Accordion: scope & perubahan tertulis; harga custom setelah scoping; milestone & acceptance di proposal; dukungan setelah launch berdasarkan paket/kontrak.
Trust note: *"Ruang lingkup, biaya, jadwal, dan dukungan ditentukan dalam proposal yang disepakati."*

### S08 — Closing CTA + footer
Prompt: *"Apa yang sedang Anda coba bangun atau perbaiki?"* → Start a Mission. Footer bersama.

---

## 5. Template detail layanan

Contoh isi untuk **Websites & Systems**:

| Blok | Isi |
|---|---|
| Hero promise | Website komersial, landing page, form, booking, alur produk digital dan aplikasi bisnis sesuai scope |
| For whom | Founder / pemilik bisnis / korporat dengan masalah tersebut |
| Possible deliverables | Interface responsif; form/booking; integrasi analitik; admin/CRM jika disepakati; dokumentasi teknis |
| Use-case cards | Website corporate, promosi, program edukasi, portal bisnis |
| Process snippet | Discovery → kebutuhan → SOW/quotation → build → UAT → handover (link /process) |
| Exclusions / risks | Tidak termasuk hosting berbayar, copywriting, foto, domain, maintenance, transfer IP **kecuali disebut di SOW** |
| FAQ | Info awal yang perlu disiapkan? · Bagaimana proposal & estimasi dibuat? · Apa yang tidak termasuk biaya? · Bagaimana review, revisi, serah terima? |
| CTA primer | "Diskusikan Websites & Systems" → /start dengan layanan terpilih |
| Motion | Diagram input → intervensi → output; still di reduced motion |

Exclusions per layanan lain:
- **AI Automation:** tidak menjanjikan tanpa error, 24/7, atau pesan massal tanpa aturan consent.
- **Dashboard:** data sensitif tidak dipublikasi; integrasi lama perlu audit; tidak menjamin akurasi data input.
- **AI Integration:** biaya token/API, lisensi, keamanan, risiko hallucination, human review ditentukan per SOW.
- **Growth & Content:** KPI bergantung media budget; tidak menjanjikan views atau penjualan.

---

## 6. /start — Start a Mission (form utama konversi)

Progressive disclosure 2 langkah, single column di mobile, progress text "Langkah 1 dari 2".

**Judul:** *"Ceritakan kebutuhan Anda. Kami akan membantu mengarahkan langkah berikutnya."*

### Langkah 1 — Tentukan kebutuhan
| Field | UI | Wajib |
|---|---|---|
| Kategori | Radio-card: Websites · Automation · Dashboard · AI Integration · Growth · Advisory · Training · Infrastructure · **Belum yakin** | Ya |
| Jenis kebutuhan | Proyek baru · Perbaiki yang ada · Support · Partner inquiry | Ya |
| Jenis organisasi | OPC · Usaha · Perusahaan · Institusi · Agency · Lainnya | Opsional |
| Hasil yang diharapkan | Textarea dengan petunjuk, 20–2000 karakter | Ya |
| Status saat ini | Ide · Proses berjalan · Prototype · Live perlu perubahan | Opsional |

### Langkah 2 — Kontak
| Field | Wajib |
|---|---|
| Nama | Ya |
| Email | Ya |
| WhatsApp (kode negara) | Opsional |
| Nama organisasi (OPC tidak wajib punya PT) | Opsional |
| Batas waktu (pilihan horizon / belum ditentukan) | Opsional |
| Anggaran ("belum tahu / diskusi") | Opsional |
| Persetujuan privasi | Ya |
| Marketing opt-in — **tidak tercentang default**, terpisah visual | Opsional |

### State
| State | Pesan |
|---|---|
| Idle | *"Ceritakan kebutuhan Anda, tanpa komitmen biaya."* |
| Invalid | Error per field + summary di atas; input tidak hilang |
| Submitting | *"Sedang mengirim; jangan tutup halaman."* tombol disabled |
| Success | *"Permintaan diterima. Proses tindak lanjut sesuai kanal."* + nomor referensi. **Tidak** menjanjikan "dihubungi dalam X jam" |
| Server error | *"Belum berhasil dikirim. Coba lagi."* |
| Offline | *"Koneksi terputus; permintaan belum terkirim."* + kanal alternatif |
| Form nonaktif | Kondisi sampai privacy & penerima lead siap |

---

## 7. /partners — white-label rahasia

| Bagian | Isi |
|---|---|
| Hero | *"Technology delivery di belakang hubungan bisnis yang sudah Anda bangun."* |
| Untuk siapa | Trainer, consultant, agency, strategic business partner, channel partner |
| Manfaat | Konsultasi solusi, kemampuan build, delivery rahasia, dokumentasi & QC |
| Batas | NDA bila relevan, client ownership, SOW per engagement |
| Visual | Diagram kolaborasi anonim |
| CTA | "Diskusikan Kolaborasi" → /start (intent partner) |

Larangan: nama/logo partner atau klien akhir, rate/margin partner, "dapatkan saham", "bagi hasil dijamin".

---

## 8. /process, /advisory, /capabilities, /faq
- **/process:** 7 tahap dengan aktivitas dan output/gate per tahap (lihat S05). Guardrails: development tidak otomatis mulai dari inquiry; SLA/revisi/garansi/lisensi/IP ditulis di SOW; kebutuhan yang tidak feasible bisa ditolak dengan alasan.
- **/advisory:** diagnosis/discovery/roadmap; **tanpa harga & tanpa booking berbayar** sampai disetujui.
- **/capabilities:** Academy & Corporate Training (custom) + Digital Infrastructure. Kelas publik → "Lihat program di EDU".
- **/faq:** quotation, revisi, timeline, hosting, AI API, maintenance — dengan kualifikasi & dependensi.

Microcopy harga: *"Setiap proyek memiliki kebutuhan dan ruang lingkup yang berbeda. Setelah kami memahami kebutuhan Anda, kami menyiapkan penjelasan solusi, estimasi biaya, dan ketentuan kerja dalam proposal."*

---

## 9. Gaya bahasa
- Pakai **"kami"** dan **"Anda"**, formal-profesional.
- Istilah hasil kerja yang bisa dilihat: website, form, alur otomasi, dashboard, dokumentasi.
- Commander/Rangers boleh di About/Process sebagai pendukung, bukan pengganti nama profesi. "Start a Mission" boleh sebagai sentuhan brand dengan label fungsi tetap jelas.
- Dilarang: "hemat biaya X%", "dijamin closing", "full AI autopilot", "semua project cepat", "AI unlimited".

## 10. Motion
| Komponen | Desktop | Mobile / fallback |
|---|---|---|
| Hero | Copy + diagram proses service-to-output | Headline/CTA dulu; dekorasi dipotong |
| Service cards | Grid berimbang, hover maju | Satu kolom, CTA per kartu |
| Process flow | Line/path animation sekali | Step list statis |
| Cursor | Opsional pointer-fine | Mati di touch/form |
| Intake | Progressive disclosure 2 step | Single column, tanpa swipe |
