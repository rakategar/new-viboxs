# Design Brief — edu.viboxs.com (EDU)
**Untuk:** Claude Design · **Wajib dilampirkan bersama:** `01_SHARED_DESIGN_SYSTEM.md`
**Sumber:** D05 EDU Blueprint, D11 Build Pack, D01, D02, D08, D14
**Status copy:** semua PROPOSED. **Belum ada produk/jadwal/harga yang approved.**

> **Learn with clarity. Register with confidence.**

---

## 0. Tugas untuk Claude Design

1. **Homepage** E01–E09 — desktop + mobile, dalam **dua kondisi**: (a) katalog kosong (kondisi saat ini), (b) contoh terisi dengan data berlabel `[contoh]`.
2. **/programs** katalog: search, filter, hasil, empty result, loading, error.
3. **/programs/{slug}** detail dengan 14 blok — 1 versi webinar gratis, 1 versi produk berbayar.
4. **/events** & **/events/{slug}** — dengan badge semua status sesi.
5. **/library/{slug}** produk digital (e-book).
6. **Alur pendaftaran/checkout** — layar per state (lihat §8).
7. **/corporate-training** (referral ke Services) dan **/help**.
8. (Opsional, kondisional) **My Learning** & lesson viewer.

EDU boleh lebih terang/instruksional daripada Corporate — gunakan `--v-light` untuk area baca panjang — tapi tetap satu palet VIBOXS.

---

## 1. Mandat

EDU adalah **pemilik** katalog program belajar publik, event, webinar, workshop, produk digital, registrasi, pembayaran, dan akses materi.

| Destinasi | Memiliki | Tidak boleh menggandakan |
|---|---|---|
| EDU | Listing kelas publik, jadwal, registrasi, entitlement | Proposal jasa Services, membership Universe, profil korporat |
| Services | Training custom perusahaan (SOW) | Checkout kelas publik |
| Universe | Benefit member | Keranjang beli program EDU kedua |
| Corporate | Profil & router | Marketplace kursus |

> **"EDU" ≠ "Grand Academy".** Grand Academy (kolaborasi dengan Pak Jo) masih diskusi — **tidak boleh** muncul sebagai program/sub-brand di desain.

### Pengunjung
| Persona | Dicari | Jalur |
|---|---|---|
| Individu / founder OPC | Materi praktis, harga & akses jelas | Home → katalog → detail → daftar → akses |
| Trainer / coach | Program, narasumber, kolaborasi nyata | Events → detail → inquiry |
| Profesional / karyawan | Skill spesifik, durasi, info sertifikat jika ada | Cari topik → detail → daftar |
| PIC perusahaan | Pelatihan in-house | /corporate-training → Services |
| Member Universe | Program dengan benefit member | Benefit Universe → detail EDU → verifikasi |

Pertanyaan yang harus terjawab: Apa yang bisa saya pelajari? Apa yang tersedia **sekarang**, kapan, berapa biaya, siapa pengajar? Apa yang saya terima setelah bayar? Bagaimana daftar/bayar/batal/minta bantuan?

**Tidak ada login untuk sekadar membaca program.**

---

## 2. Format belajar
| Format | Fulfillment | Boleh tampil jika |
|---|---|---|
| Digital Guides / E-books | File digital, kuitansi | File final, hak distribusi, harga, checkout valid |
| Live Webinar | Registrasi, jadwal, link sesi | Topik, fasilitator, tanggal, platform, kebijakan ada |
| Workshops & Cohorts | Tiket/kursi, lokasi/joining, agenda | Kapasitas & penyelenggara pasti |
| E-course / On-demand | Library/lesson access | LMS & materi siap — **sekarang: sembunyikan dari navigasi** |

Semua harga referensi internal (e-book, webinar, Grand Academy) = **PRICE HOLD**. Di desain selalu gunakan `[Harga]` atau `Rp —`, jangan menulis angka harga apa pun.

---

## 3. Sitemap & navigasi

| Route | Status awal |
|---|---|
| `/` | Core |
| `/programs`, `/programs/{slug}` | Core bila listing ada |
| `/events`, `/events/{slug}` | Core / kondisional |
| `/library`, `/library/{slug}` | Kondisional |
| `/checkout/{order}` | Kondisional (setelah payment siap) |
| `/learn/{id}`, `/my-learning`, `/account` | Fase berikutnya |
| `/corporate-training` | Core / referral |
| `/help`, `/faq`, `/contact` | Core |
| `/policies/*` | Wajib sebelum checkout berbayar |

**Menu lokal:** Programs · Events · Digital Library · For Teams · Help + search "Cari program & topik".
**CTA:** "Jelajahi Program" atau "Lihat Jadwal".
**Breadcrumb:** EDU → Programs → Program detail.

---

## 4. Homepage — 9 blok

| ID | Blok | CTA |
|---|---|---|
| E01 | Shared header, EDU aktif, search | All ecosystem / Programs |
| E02 | Hero | Jelajahi Program · Lihat Jadwal |
| E03 | Learning paths | Lihat jalur belajar |
| E04 | Featured learning (3–6 kartu approved) | Lihat detail program |
| E05 | Format chooser | Pilih format |
| E06 | Upcoming schedule (confirmed only) | Lihat semua event |
| E07 | How enrollment works | Cara pendaftaran |
| E08 | Proof & ecosystem bridge | Jelajahi Universe / Training tim |
| E09 | Help, FAQ, final CTA, footer | Bantuan / Browse programs |

### E02 Hero
- **H1:** *Belajar keterampilan yang bisa langsung dipraktikkan.* (alternatif: *Belajar keterampilan yang benar-benar bisa dipakai.*)
- **Sub:** *Jelajahi panduan digital, webinar, dan program praktis dari ekosistem VIBOXS. Lihat format, jadwal, dan ketentuannya sebelum mendaftar.*
- **Visual:** tipografi editorial + diagram progresi **Discover → Learn → Apply**. Tidak ada foto kelas palsu atau robot.

### E03 Learning paths (filter, bukan sertifikasi)
- **Start with AI** — fondasi kerja & AI yang relevan
- **Build Your Business** — skill bisnis, operasional, distribusi untuk founder/OPC
- **Work & Career** — komunikasi, produktivitas, kapabilitas profesional (tanpa janji naik gaji)

### E04 Featured cards
Kartu program: jenis, judul, untuk siapa, format, **badge status**, jadwal (jika live), harga atau "Gratis", CTA spesifik. Tanpa rating bintang. **Jika kosong:** editorial pengantar + CTA notifikasi opt-in, bukan kartu semu.

### E05 Format chooser (tabs)
| Format | Wajib terlihat | Fallback |
|---|---|---|
| E-book | Format file, ringkasan isi, cara akses | "Belum tersedia", tanpa tombol beli |
| Webinar | Hari, tanggal, jam **WIB**, durasi, online/offline, harga | Notifikasi opt-in |
| Workshop | Modus, kapasitas, lokasi/joining, output | — |
| On-demand | Materi siap, durasi akses, perangkat | Disembunyikan bila LMS belum siap |

### E06 Upcoming sessions
Satu sumber dengan /events. Format: hari + tanggal + jam WIB + lokasi/link. Event lewat tidak tampil sebagai upcoming. **Kosong:** *"Jadwal berikutnya belum diumumkan."*

### E07 How enrollment works
1. Pilih program dengan status yang benar · 2. Periksa materi, durasi, harga, ketentuan · 3. Isi identitas seperlunya (consent marketing terpisah) · 4. Bayar atau konfirmasi registrasi gratis · 5. Terima bukti, akses/tiket, petunjuk bantuan.

### E08 Bridges
Universe sebagai komunitas OPC; Services untuk workshop in-house. Microcopy: *"Anggota Universe? Periksa manfaat yang berlaku untuk program ini."* (tanpa janji gratis/diskon). *"Ingin program khusus tim atau instansi? Diskusikan kebutuhanmu."* → Services.

### E09 Final CTA + footer
"Lihat Program yang Tersedia" + "Butuh pelatihan untuk tim?". Footer memuat legal, kebijakan pembelian, privasi, bantuan.

---

## 5. Katalog /programs
- Search (judul, ringkasan, tag) — label, reset, loading, no-result, error.
- Filter: format · topik · Gratis/Berbayar · upcoming/past. "Reset semua" selalu terlihat.
- Sort: upcoming dulu (event), relevansi/terbaru (katalog). **Tidak ada "popular"** tanpa data.
- Empty: *"Belum ada program dengan filter ini."* + clear filters.
- Hasil diumumkan ke screen reader.

---

## 6. Detail program — 14 blok
Blok yang tidak relevan **disembunyikan**, bukan diisi placeholder.

1. Breadcrumb, badge tipe, status, judul, ringkasan
2. Outcome pembelajaran spesifik (tanpa klaim berlebihan)
3. Untuk siapa / prasyarat / level
4. Format, lokasi, timezone, tanggal, durasi, bahasa
5. Fasilitator (hanya yang setuju dipublikasikan)
6. Agenda / modul / daftar isi
7. Aset yang diterima: file, replay, link, worksheet
8. Harga final + pajak/biaya
9. Akses & masa berlaku
10. Ketentuan refund/reschedule/transfer & lisensi
11. CTA status-aware
12. FAQ & dukungan
13. Related learning (produk nyata)
14. Footer & cross-destination

> **No hidden contract:** sebelum bayar, pembeli tahu apa yang dibeli, apa yang diterima, total biaya, cara akses, masa berlaku, jalur bantuan.

**Sidebar/sticky summary** (desktop) berisi harga, tanggal, status, CTA. Mobile: bar CTA bawah yang tidak menutupi konten.

---

## 7. Event & library

### Badge status sesi (desain semua varian)
| Status | Efek |
|---|---|
| ANNOUNCED | Informasional; CTA notifikasi |
| OPEN | Registrasi aktif |
| FULL | Tombol nonaktif; *"Pendaftaran penuh. Dapatkan pemberitahuan sesi berikutnya."* |
| CLOSED | Tidak menerima peserta |
| RESCHEDULED | Tanggal baru + tanda perubahan |
| CANCELLED | Penjelasan + bantuan |
| COMPLETED | Arsip; replay hanya jika termasuk hak |

Event detail: jadwal WIB, durasi, format, kapasitas, presenter, yang termasuk, kebijakan perubahan.

### /library/{slug} (e-book)
Cover, judul, versi, penulis, format file, bahasa, deskripsi, siapa cocok, daftar isi, preview 2–4 halaman (jika diizinkan), lisensi, cara delivery, dukungan (link hilang, salah email, file korup), harga, refund.

---

## 8. Alur registrasi/checkout — layar per state

| State | Layar | Copy |
|---|---|---|
| Ringkasan order | Item, harga, total, ketentuan | — |
| Isi data | Nama, email, kontak minimal; consent wajib vs marketing terpisah | — |
| Pending payment | Instruksi + batas waktu | *"Pembayaran sedang diverifikasi. Jangan membayar ulang sebelum status diperbarui."* |
| Paid confirmed | Order ID + akses | *"Pembayaran terkonfirmasi. Petunjuk akses dikirim ke email yang kamu gunakan."* |
| Free confirmed | Tiket/registrasi — **tanpa kata "pembayaran"** | — |
| Failed / expired | Coba lagi tanpa double charge | *"Kami belum dapat memproses permintaanmu. Coba lagi atau hubungi bantuan."* |
| Keluar ke payment provider | Jelaskan perpindahan + jalan kembali | — |

**Stepper** mengikuti status server, bukan timer animasi palsu. Success: ringkas (180–350ms), tanpa confetti berlebihan.

---

## 9. /corporate-training
Penjelasan singkat beda **kelas publik EDU** vs **training custom organisasi**. CTA "Diskusikan pelatihan untuk tim" → services.viboxs.com/start (intent training). Bukan salinan halaman Services.

## 10. My Learning (kondisional, desain untuk nanti)
Daftar produk & sesi dengan hak valid, receipt, status, support. Lesson viewer: modul, progres, resume, mobile layout. Empty/expired/no-access state. Tidak ada progres otomatis atau sertifikat tanpa izin.

---

## 11. Motion EDU
| Scene | Perilaku | Reduced / mobile |
|---|---|---|
| Hero flow | Tiga node Discover → Learn → Apply muncul singkat | Diagram statis |
| Catalog cards | Hover lift 2–4px + focus ring, 150–220ms | Tanpa hover-only content |
| Format chooser | Tab transition 160–240ms | Instan |
| Timeline event | Connector menandai sesi confirmed, 350–500ms | Statis, tanggal lengkap |
| Enrollment steps | Stepper dari status server | Label teks |
| E-book preview | Page flip opsional | Thumbnail biasa |

**Tanggal dan jadwal tidak boleh bergerak.**

## 12. Copy yang dilarang
"Sertifikat nasional" · "diakui industri" · "pasti naik karier" · "mentor terbaik" · "100% hasil" · jumlah alumni/peserta · countdown seat palsu · harga coret tanpa dasar · "akses seumur hidup".
