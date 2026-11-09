# Design Brief — viboxs.com (Corporate)
**Untuk:** Claude Design · **Wajib dilampirkan bersama:** `01_SHARED_DESIGN_SYSTEM.md`
**Sumber:** D03 Corporate Blueprint, D01, D02, D08, D14
**Status copy:** semua PROPOSED — founder memilih.

---

## 0. Tugas untuk Claude Design

Rancang website korporat VIBOXS dengan komponen dari design system bersama. Minta:
1. **Homepage** (H01–H09) — desktop 1440 + mobile 390.
2. **/ecosystem**, **/about**, **/contact** — desktop + mobile.
3. **/work** dalam dua kondisi: (a) **kosong/disembunyikan** (kondisi saat ini), (b) contoh template jika kelak ada 1 kasus approved — dengan data berlabel `[contoh struktur]`.
4. **/404** dan halaman error.
5. State form kontak: idle, invalid, submitting, sukses (dengan nomor referensi), gagal, form dinonaktifkan.
6. Varian kartu destinasi: tersedia vs "sedang disiapkan".

---

## 1. Mandat

**Job-to-be-done:** memberi pemahaman, membangun kredibilitas, dan menyalurkan minat ke unit yang tepat.

- Menjawab **"VIBOXS itu apa?"** tanpa pengunjung perlu memahami mitologi internal.
- Memperlihatkan hubungan VIBOXS → Universe, EDU, Services **tanpa menduplikasi** halaman mereka.
- Relevan bagi OPC, tetap dipercaya oleh organisasi/korporat.
- viboxs.com adalah **payung cerita & credibility hub**, bukan katalog, checkout, atau portal member.

**Identitas:** VIBOXS — AI Venture Studio di bawah PT Ekosistem Pelosok Hub.

### Pengunjung & jalur
| Pengunjung | Pertanyaan | Jawaban pertama | Tujuan |
|---|---|---|---|
| Calon OPC dari konten | Apa itu OPC & kenapa VIBOXS relevan? | Model bisnis satu founder + akses ekosistem | Universe — "Kenali Universe" |
| Pemilik usaha / leader | Bisa bantu proyek saya? | Gambaran kemampuan + jalur profesional | Services — "Konsultasikan kebutuhan" |
| Peserta / partner pelatihan | Program apa yang relevan? | EDU pusat program; jadwal nyata | EDU — "Jelajahi program" |
| Partner / media / umum | Siapa VIBOXS, entitasnya, buktinya? | About, karya terkurasi, identitas, kontak | About / Kontak |

---

## 2. Sitemap

| Route | Fungsi |
|---|---|
| `/` | Homepage: orientasi, visual ekosistem, bukti ringkas, CTA |
| `/ecosystem` | Peta 3 destinasi, perbedaan, handoff |
| `/work` | Karya terkurasi — **disembunyikan dari menu & sitemap sampai ada kasus approved** |
| `/work/{slug}` | Detail kasus (kondisional) |
| `/about` | Siapa kami, cara kerja, identitas hukum |
| `/contact` | Pemilih tujuan + pertanyaan umum |
| `/privacy`, `/terms` | Legal (konten menunggu review hukum) |
| `/404` | Pemulihan navigasi |

**Menu header:** Beranda · Ekosistem · Karya (kondisional) · Tentang · Kontak + Ecosystem switcher + CTA "Kenali Universe".

---

## 3. Homepage — 9 blok

Ritme: **Orientasi → Peta pilihan → Bukti → Peneguhan identitas → CTA.** Satu visual hero yang relevan > banyak efek abstrak.

### H01 — Global header
Wordmark VIBOXS (placeholder), menu, switcher, satu CTA. Sticky tanpa layout jump, mengecil halus.

### H02 — Hero: apa itu VIBOXS?
- **Eyebrow:** `VIBOXS / AI VENTURE STUDIO`
- **H1 — 3 opsi, founder pilih satu:**
  - **A (rekomendasi):** *Membangun bisnis di era AI, tak harus sendirian.*
  - B: *Dari satu orang, menuju bisnis yang terus bertumbuh.*
  - C: *Satu ekosistem untuk membangun bisnis di era AI.*
- **Subcopy:** *VIBOXS mengembangkan ekosistem bagi individu dan bisnis untuk belajar, berkolaborasi, dan membangun solusi digital di era AI.*
- **CTA primer:** "Jelajahi ekosistem" → scroll ke #ecosystem · **Sekunder:** "Kenali VIBOXS" → /about
- **Visual:** diagram relasi abstrak (VIBOXS di tengah, tiga jalur). Satu sequence ≤ 900ms; konten terbaca tanpa JS. **Tidak** ada angka anggota.

### H03 — Ecosystem router: tiga pintu (#ecosystem)
- Tagline: *Tiga jalur. Satu ekosistem. Pilih yang relevan untuk langkah Anda.*
- **Universe** — *Untuk Anda yang membangun bisnis sebagai One Person Company dan ingin bertumbuh bersama jejaring.* → "Kenali Universe"
- **EDU** — *Untuk Anda yang ingin belajar, berlatih, dan meningkatkan kemampuan di era AI.* → "Lihat program EDU"
- **Services** — *Untuk organisasi dan founder yang membutuhkan solusi digital, sistem, atau pendampingan profesional.* → "Lihat solusi profesional"
- Hover/focus: jalur disorot di diagram. Mobile: kartu ditumpuk statis.
- Kartu punya state "Sedang disiapkan" bila subdomain belum live.

### H04 — Cara kerja ekosistem
Diagram editorial **Belajar · Terhubung · Membangun**. Kerangka narasi, bukan kewajiban tiga langkah. Link "Lihat struktur ekosistem" → /ecosystem. Garis koneksi progresif saat terlihat; fallback teks statis.

### H05 — Evidence / trust strip
Maks 2–3 bukti: kategori pengerjaan, proses kerja. **Saat ini belum ada bukti approved → ganti dengan "Cara kami bekerja"** (pahami kebutuhan → rancang → bangun & uji → dukung), tanpa angka. Tidak ada counter "100+".

### H06 — Selected work
Hingga 3 kartu kasus approved. **Saat ini: section tidak dirender.** Desain template-nya untuk nanti.

### H07 — About / governance
*"VIBOXS adalah unit AI Venture Studio di bawah PT Ekosistem Pelosok Hub."* + pendekatan kerja (tanpa jaminan hasil). CTA "Tentang VIBOXS". Typography-first (foto hanya jika berizin).

### H08 — Closing path
Prompt: *Sedang membangun bisnis, mencari pembelajaran, atau membutuhkan solusi digital?* — tiga tombol: Jelajahi Universe · Lihat EDU · Diskusikan kebutuhan.

### H09 — Shared footer
Sesuai design system.

---

## 4. /ecosystem — peta, bukan portal kedua

Tujuan: pengunjung memahami hubungan tiga destinasi dan memilih dalam < 30 detik.

| Blok | Isi |
|---|---|
| E01 Intro | H1 *"Temukan jalur yang relevan."* + penjelasan VIBOXS menghubungkan pembelajaran, jejaring OPC, dan solusi profesional dalam satu identitas. 3 link langsung |
| E02 Map | Diagram 3 jalur: OPC/Universe · Learning/EDU · Build/Services. Panah menunjuk kepemilikan aktivitas, bukan angka |
| E03 Pilih berdasarkan kebutuhan | "Ingin membangun bersama ekosistem?" → Universe · "Ingin belajar?" → EDU · "Butuh solusi?" → Services |
| E04 Contoh hubungan | Contoh *kemungkinan* (anggota Universe ikut sesi EDU, founder memakai Services). Microcopy: *"Manfaat dan ketersediaan mengikuti program masing-masing."* |
| E05 Reassurance | *"Semua berada di bawah identitas VIBOXS."* → About / Kontak |

---

## 5. /about

| Modul | Isi |
|---|---|
| A01 Hero | VIBOXS, AI Venture Studio; peran dalam konteks bisnis & teknologi |
| A02 Approach | Pahami kebutuhan → rancang solusi → bangun/uji → dukung (ilustrasi proses, bukan SLA) |
| A03 Ekosistem | Ringkas Universe/EDU/Services + link |
| A04 Governance | Identitas hukum PT Ekosistem Pelosok Hub, kontak resmi — **slot placeholder** sampai legal verifikasi (jangan isi NIB/alamat karangan) |
| A05 People & culture | **Kondisional** — tampil hanya jika foto/izin ada. Default: tidak dirender |
| A06 Final CTA | Pilih Universe / Services / EDU / Kontak |

Copy starter: *"Kami membangun pendekatan bisnis dan teknologi yang berangkat dari kebutuhan nyata. VIBOXS mengembangkan ekosistem yang mempertemukan pembelajaran, komunitas One Person Company, serta solusi profesional untuk individu dan organisasi."*

---

## 6. /work dan /work/{slug} (template untuk nanti)

- Index: judul faktual, kartu kasus (label proyek/anonim, tantangan, kontribusi VIBOXS, bukti output, status).
- Filter hanya jika kasus > 6.
- Detail: Headline masalah → Background → What we did → Output → Outcome (hanya jika ada baseline & tanggal) → Trust statement izin → CTA ke Services.
- Placeholder di desain harus berbentuk `[Sektor: kategori industri]`, `[Masalah operasional]`, bukan contoh yang terlihat nyata.

---

## 7. /contact

| Tahap | Desain |
|---|---|
| C01 Pilih maksud | 4 pilihan: Universe · EDU · Services · Pertanyaan umum. Tiap opsi menjelaskan tujuannya |
| C02 Handoff | Pilihan spesifik → langsung ke halaman unit terkait (tidak isi form di sini) |
| C03 Form umum | Nama, email/WhatsApp (pilih satu), ringkasan pesan, notice privasi. **Tanpa** KTP/NPWP |
| C04 Validasi | Error inline + summary |
| C05 Sukses | *"Pesan diterima. Jika perlu, tim akan menghubungi melalui kontak yang Anda berikan."* + nomor referensi |
| Gagal | *"Pesan belum terkirim. Periksa koneksi atau coba kembali."* |
| Form nonaktif | Kondisi saat ini sampai privacy & penerima siap: tampilkan kanal alternatif terverifikasi (slot) |

Helper: *"Ceritakan kebutuhan secara singkat. Kami akan mengarahkannya ke jalur yang sesuai."* Jangan menjanjikan waktu respons.

---

## 8. Motion corporate (M01–M07)

| Scene | Perilaku | Fallback |
|---|---|---|
| M01 hero intro | H1 & CTA langsung siap; garis koneksi tiga tujuan muncul sekali ≤ 900ms | Statis |
| M02 route preview | Focus/hover kartu → konektor & label terkait diperjelas, CTA tidak bergeser | 140–180ms |
| M03 ecosystem explanation | Tiga fungsi terhubung progresif saat masuk viewport | 360–480ms sekali |
| M04 case preview | Border & surface menonjol, bukan scaling agresif | — |
| M05 page transition | Navigasi HTTP biasa ke subdomain, tanpa loading portal | — |
| M06 cursor accent | Opsional, lingkaran mengikuti pointer di scene | Mati di touch/reduced |
| M07 footer | Tanpa animasi | — |

---

## 9. Aset

| ID | Aset | Status |
|---|---|---|
| AS-01 | Logo resmi + varian gelap/terang | Belum ada → wordmark teks |
| AS-02 | Hero still: diagram konsep 3 lini | Buat di desain, jelas konseptual |
| AS-04 | Ikon Universe/EDU/Services, satu gaya garis | Buat di desain, jangan ikon AI klise |
| AS-05 | Screenshot karya (redacted) | Belum ada |
| AS-06 | Foto founder/tim | Belum berizin |
| AS-07 | OG image + favicon | Buat berbasis wordmark |

---

## 10. Larangan khusus corporate
- Homepage tidak memuat katalog Services penuh, kelas EDU, atau benefit Universe.
- Tidak ada logo dummy, testimoni, "trusted by", counter, atau angka anggota.
- Universe dan Corporate tidak boleh memuat pengantar & CTA keanggotaan yang sama panjang.
- Tidak membuka tab baru untuk Universe/EDU/Services.
