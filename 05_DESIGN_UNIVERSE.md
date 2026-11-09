# Design Brief — universe.viboxs.com (Universe)
**Untuk:** Claude Design · **Wajib dilampirkan bersama:** `01_SHARED_DESIGN_SYSTEM.md`
**Sumber:** D06 Universe Blueprint, D12 Build Pack, D01, D02, D08, D14
**Status copy:** semua PROPOSED. **Mode join, harga, benefit, aktivitas, partner — belum ada yang approved.**

> **One Person Company. Connection with intention. One VIBOXS ecosystem.**
> Target 25 Desember 2026: showcase New Era dengan **akses Universe yang nyata dan bisa dicoba** — bukan janji semua fitur selesai.

---

## 0. Tugas untuk Claude Design

1. **Homepage** U01–U10 — desktop + mobile. Universe boleh **paling ekspresif** dari keempat situs, tetap premium & sederhana.
2. Desain homepage hero + modul join dalam **tiga varian mode**: INTEREST (daftar minat), APPLICATION (permohonan), ACTIVE (member aktif).
3. **/join** — form + semua state per mode (idle, invalid, submitting, sukses per mode, sudah terdaftar, error).
4. **/about**, **/benefits**, **/activities** (kosong + terisi `[contoh]`), **/activities/{slug}**.
5. **/collaborate** — form terpisah dari /join.
6. **/partners** — kondisi kosong (saat ini) + template kartu OPC.
7. (Kondisional) **/member** dashboard: status, benefit, aktivitas, support, profil — termasuk empty, expired, suspended, pending.
8. **/membership** — template paket **tanpa harga nyata** (`Rp —`, label "Harga belum diumumkan").

---

## 1. Positioning

Universe mengubah prioritas persepsi VIBOXS dari *penjual jasa* menjadi *pembangun lingkungan bisnis OPC*.

**Public promise (PROPOSED):** *"Universe adalah lingkungan bagi para founder One Person Company untuk menemukan koneksi, pengetahuan, dan peluang kolaborasi yang relevan."*

**Definisi OPC** (tampilkan saat pertama muncul): model menjalankan bisnis oleh satu founder dengan bantuan sistem, AI, dan jejaring — **bukan** bentuk badan hukum tertentu.

### Dua makna "Universe" — jangan dicampur
| Lapisan | Boleh dipakai | Batas |
|---|---|---|
| Brand mythology (2025) | Commander, Rangers, Missions, Station sebagai bahasa storytelling | Jangan beri kesan ada 7 Ranger full-time atau fasilitas futuristik nyata |
| Visual historis | Deep-space, magenta/violet, sinematik | Tanpa robot generik, metaverse palsu, peta 3D kota/distrik |
| Universe New Era | Komunitas OPC, aktivitas, manfaat, koneksi | Tiap fitur aktif butuh operator & support nyata |
| Selected Venture | Kerja sama yang lolos evaluasi legal terpisah | **Bukan** benefit membership; tidak ada "saham otomatis" |

### Relasi — harus terlihat berbeda di UI
| Status | Artinya | Jangan |
|---|---|---|
| Visitor / interest | Opt-in info | Menganggap email = member aktif |
| Applicant | Permohonan ditinjau | Menampilkan sebagai member |
| Member | Akses benefit sesuai paket & masa berlaku | Auto-renew/benefit yang belum disetujui |
| OPC collaborator | Pihak independen | Menyebut anak usaha/portofolio |
| Selected venture partner | Lewat diagnosis, pilot, legal | Menyatakan equity sebelum sah |

---

## 2. Pengunjung
| Audiens | JTBD | Jalur |
|---|---|---|
| Calon OPC / solo founder | Kenapa relevan, manfaat, cara mulai | Direct link → value → manfaat tersedia → join sesuai mode |
| OPC yang sudah berjalan | Koneksi, program, kolaborasi, market | Activities / partner → kriteria → apply |
| Calon kolaborator | Tata kelola, jenis kerja sama, batas | /collaborate → kualifikasi → tindak lanjut manusia |
| Member aktif | Akses manfaat, aktivitas, bantuan | /member → verifikasi → aksi |

**Dijawab dalam 10–20 detik:** Apa itu Universe & hubungannya dengan VIBOXS? Apa itu OPC? Manfaat apa yang **sudah** tersedia? Bergabung itu gratis, berbayar, undangan, atau daftar minat? Ke mana kalau butuh kelas/aplikasi/kerja sama?

---

## 3. Empat pilar nilai
| Pilar | Output yang mungkin nyata | Boleh tampil jika |
|---|---|---|
| **CONNECT** | Perkenalan OPC terkurasi, networking event | Ada format, penyelenggara, kuota, persetujuan |
| **LEARN** | Navigasi ke kelas EDU, sesi, panduan | Katalog EDU aktif; aturan benefit disahkan |
| **BUILD** | Diagnosis kebutuhan, rujukan ke Services | Owner lead & alur konsultasi jelas |
| **COLLABORATE** | Ajukan kolaborasi, pilot terukur | Kriteria seleksi & tata kelola ada, tanpa jaminan |

Urutan di halaman: bukti/manfaat pertama yang bisa diakses → apa arti "bergabung" saat ini → cara dapat bantuan & siapa pengelola → baru roadmap (label eksplisit, tanpa countdown).

---

## 4. Sitemap & navigasi
| Route | Rilis |
|---|---|
| `/` | P0 |
| `/about` | P0 |
| `/benefits` | P0 bila benefit nyata |
| `/activities`, `/activities/{slug}` | Kondisional |
| `/join` | P0 — hasil harus nyata |
| `/collaborate` | P0/P1 |
| `/partners`, `/partners/{slug}` | P1, perlu izin |
| `/membership` | Kondisional (harga disahkan) |
| `/member` | P1 / opsional |
| `/help`, `/faq`, `/contact` | P0 |
| `/policies/*` | P0 sebelum berbayar |

**Menu lokal:** Why Universe · Benefits · Activities · Collaborate · FAQ + CTA kontekstual.
Jika login: CTA berubah jadi **"Buka Area Saya"**.
Link silang: "Pelajari Program di EDU" · "Diskusikan Solusi di Services".

---

## 5. Homepage — 10 blok

| ID | Blok | CTA |
|---|---|---|
| U01 | Shared navigation (Universe aktif) | All ecosystem |
| U02 | Hero — definisi OPC + value prop + status join jujur | Sesuai mode · Jelajahi Manfaat |
| U03 | Why OPC — satu founder butuh akses, sistem, koneksi | Pahami Pendekatan |
| U04 | Empat pilar CONNECT/LEARN/BUILD/COLLABORATE | Jelajahi Manfaat |
| U05 | How participation works: discover → choose → consent → confirm → participate | Lihat Cara Bergabung |
| U06 | Current activities (approved) atau empty editorial | Lihat Aktivitas |
| U07 | Community/partner proof (berizin) atau narasi kurasi | Kenali Kolaborator |
| U08 | Ecosystem link — EDU & Services singkat | Buka EDU / Services |
| U09 | Join / interest module — satu aksi, form ringkas | Sesuai mode |
| U10 | FAQ, support, legal footer | FAQ / Hubungi Kami |

### U02 Hero — urutan first viewport
Label "VIBOXS Universe" → headline → deskripsi satu kalimat → CTA primer (outcome jelas) → CTA sekunder → visual jaringan abstrak → satu kalimat status: *"Akses yang tersedia mengikuti fase peluncuran dan ketentuan program."*

| Elemen | Copy |
|---|---|
| Eyebrow | VIBOXS UNIVERSE / FOR ONE PERSON COMPANIES |
| H1 — opsi A | *Bangun sendiri. Bertumbuh bersama.* |
| H1 — opsi B | *Satu founder. Lebih banyak kemungkinan.* |
| Deskripsi | *Ruang untuk founder bisnis satu orang menemukan pengetahuan, koneksi dan peluang kolaborasi yang relevan dalam ekosistem VIBOXS.* |
| CTA — mode INTEREST | **Daftar Minat Universe** |
| CTA — mode ACTIVE | **Gabung Universe** (hanya bila registrasi/aktivasi berfungsi) |
| CTA sekunder | Jelajahi Manfaat |

### U06 empty
*"Aktivitas berikutnya sedang disiapkan. Tinggalkan minat jika ingin mendapat informasi yang relevan."*

### U07 tanpa bukti
*"Kami sedang mengembangkan jejaring kolaborasi OPC. Profil mitra akan ditampilkan setelah diverifikasi dan disetujui."*

### Visual hero
Constellation/network node bergerak halus saat terlihat — **ilustrasi relasi**, bukan data anggota. Fallback SVG statis; dekoratif `aria-hidden`. Parallax cursor opsional di desktop. Tanpa scroll hijack, distrik 3D fiktif, audio, atau loading screen.

---

## 6. /join — tiga hasil yang berbeda

| Mode | Kondisi | Pesan sukses yang sah |
|---|---|---|
| INTEREST | Belum ada akun/benefit operasional | *"Minat Anda tercatat. Kami akan mengirim kabar bila tersedia."* |
| APPLICATION | Perlu seleksi manual | *"Permohonan Anda diterima untuk ditinjau; belum menjadi anggota aktif."* |
| ACTIVE | Hak diotorisasi & bisa dibuktikan | *"Keanggotaan aktif hingga [tanggal], manfaat dapat diakses melalui [tujuan]."* |

### Field
| Field | Wajib |
|---|---|
| Nama | Ya |
| Email | Ya |
| WhatsApp | Opsional |
| Tahap bisnis: Exploring / Operating / Growing | Opsional |
| Minat utama (multi): Connect / Learn / Build / Collaborate | Opsional |
| Persetujuan privasi | Ya |
| Updates/marketing — **tidak tercentang default** | Opsional |

State: idle → validating → submitting → success; inline error; *"Anda sudah tercatat"* untuk duplikat (tanpa membocorkan identitas); error + ticket ID bila notifikasi gagal.

> Jangan tampilkan "Join Universe" yang diam-diam hanya mengumpulkan email lalu memberi kesan akun aktif. **Badge "Member" hanya untuk status ACTIVE.**

---

## 7. /benefits
Kelompokkan per pilar. Tiap benefit: owner, eligibility, kuota, masa berlaku, status (**Tersedia · Perlu verifikasi · Kuota habis · Belum tersedia**). Benefit EDU/Services link ke halaman pemiliknya — **tidak ada checkout di Universe**. Tanpa angka diskon yang belum disahkan.

## 8. /activities
Field: host, tanggal/jam WIB, format, kapasitas, harga (jika disetujui), ketentuan batal. Acara yang diselenggarakan EDU → registrasi di EDU. Event belum disetujui **tidak** memakai tombol "Daftar Sekarang".
(Catatan: 25 Nov "Human × AI Business Lab" dan 25 Des "New Era" masih milestone internal, **jangan** didesain sebagai tiket aktif.)

## 9. /collaborate — kurasi, bukan pendaftaran saham
CTA: **"Ajukan Kolaborasi"**. Disclaimer: *"Peluang kolaborasi dievaluasi terpisah; tidak otomatis menjadi hak anggota."*
Intake: identitas usaha, produk, segmen, situs/prototype opsional, kesiapan. Tahap internal (tampilkan sebagai status ke pemohon): Diterima → Opportunity mapping → Scoping pilot → Performance review → Agreement. Konfirmasi hanya *"diterima untuk ditinjau"* — tanpa janji modal, saham, revenue.

## 10. /partners — direktori OPC (bukan portofolio)
Kartu OPC: nama usaha & logo (izin tertulis), kategori 1–2 kalimat, label status (contributor/participant/partner — **bukan** "portfolio/invested/owned"), tombol "Minta perkenalan melalui VIBOXS". Tidak ada nomor pribadi, traction, follower, revenue. **Saat ini: empty state.**

## 11. /membership (template, harga HOLD)
Kartu paket dengan slot: periode, manfaat, ketentuan pembatalan & refund, info auto-renew eksplisit. Harga tampil sebagai *"Harga belum diumumkan"*. Tanpa "hemat x%". **Jangan menulis angka harga apa pun** — harga internal masih HOLD.

## 12. /member dashboard (kondisional)
Panel tenang (bukan tiruan sosial media besar):
- **My status** — paket, mulai/akhir, status, kelola/batal
- **Available benefits** — eligible + CTA ke owner; tanda expiry/used
- **Upcoming activities** — untuk member, RSVP jika aktif
- **Suggested next steps** — EDU/Services berdasarkan minat yang dipilih (bukan profiling AI tersembunyi)
- **Support & requests** — status kasus
- **Profile & privacy** — preferensi, export/hapus data

State: tidak ada benefit · benefit kedaluwarsa · akses gagal · belum ada aktivitas · pending · suspended · payment pending. Warna bukan satu-satunya indikator status.

---

## 13. Motion & visual Universe
| Scene | Perilaku | Fallback |
|---|---|---|
| Hero constellation | Node bereaksi halus pada scroll/pointer; ada state paused | Diagram statis |
| Benefit cards | Reveal ringan saat masuk viewport | Semua teks ada di DOM |
| How it works | Step line animasi singkat | Semua step tampil sekaligus |
| Activity list | Timeline per hari | Tanggal & CTA berbasis teks |
| OPC profiles | Foto/logo berizin + modul fakta | Placeholder editorial jujur |
| Join confirmation | Inline success + progress ringan | Tanpa confetti; error diumumkan |

**Guardrail artistik:** satu value statement terbaca < 10 detik · tidak ada foto event/anggota/kantor palsu atau robot holografik · satu aksen utama per scene · glow tidak menurunkan kontras · ilustrasi ≠ pencapaian.

## 14. Bahasa
Indonesia ringkas, percaya diri tanpa euforia; "founder" & "OPC" diberi konteks.
Dilarang: "komunitas terbesar", "nomor satu", "ekuitas otomatis", "penghasilan dijamin", "limited seats" tanpa kapasitas nyata, "7x", "NASA-grade", angka/KPI dari deck 2025.
