# VIBOXS New Era — Shared Design System Brief
**Untuk:** Claude Design (dipakai ulang oleh Claude Code sebagai sumber token)
**Sumber:** D01 Unified Foundation, D02 Brand/UI/UX & Motion Design System, D14 Master Blueprint
**Status:** semua nilai token = **PROPOSED**, belum disahkan founder.

---

## 0. Tugas untuk Claude Design

Buat **satu design system** yang dipakai oleh empat website VIBOXS. Hasil yang diminta:

1. Token board: warna (dark + light surface), tipografi, spacing, radius, border, shadow, motion.
2. Komponen inti dengan semua state: Button, Link, Card (5 varian), Badge, Input/Select/Textarea/Checkbox/Radio-card, Accordion, Tabs, Dialog, Toast, Stepper, Empty State, Error State, Skeleton.
3. **Brand shell bersama**: Global Header (dengan Ecosystem Switcher), Mobile Drawer, Footer. Satu set, empat varian "destination active" (Corporate, Services, EDU, Universe).
4. Satu halaman contoh "kitchen sink" desktop 1440px dan mobile 390px yang memperlihatkan semua komponen di atas.

Setelah ini di-approve, website lain dibangun **dari komponen ini**, bukan menggambar ulang.

---

## 1. North star & prinsip (LOCKED dari founder)

> Setiap pengunjung harus merasakan **satu VIBOXS**, tahu sedang di mana, lalu bergerak ke layanan yang relevan tanpa kehilangan konteks ekosistem.

- **Satu master brand: VIBOXS.** Universe, Services, EDU bukan empat perusahaan. Tidak ada logo baru per subdomain; cukup sub-label ("VIBOXS · EDU").
- **OPC-first** (One Person Company) di hierarki narasi; Services tetap terlihat untuk B2B.
- **Premium, sederhana, kontemporer, technology-forward, animated** — tapi **keterbacaan dan kejelasan CTA lebih penting daripada efek**.
- **Simple in public, deep underneath.** Pengunjung harus paham "VIBOXS itu apa" dalam 3–5 detik pertama.
- **Consistent, not identical.** Shell sama, layout menyesuaikan tugas tiap situs.

### Ekspresi per destinasi

| Destinasi | Peran | Karakter UX | Aksen dominan (usulan) |
|---|---|---|---|
| viboxs.com | Brand, kepercayaan, orientasi | Editorial, hero kuat, overview ringkas | Magenta + violet seimbang |
| services.viboxs.com | Jasa, bukti, brief | Profesional, berbasis bukti, fokus konversi | Lebih operasional: violet, permukaan lebih terang |
| edu.viboxs.com | Kelas, event, belajar | Instruksional, jadwal & format jelas | Lebih terang (light surface untuk baca panjang) |
| universe.viboxs.com | OPC, komunitas | Eksploratif, aktif, belonging — paling ekspresif | Magenta + gold jarang |

---

## 2. Warna (PROPOSED)

Turunan DNA historis magenta/violet/deep-space/gold. **Bukan** hex resmi logo.

| Token | Hex | Pakai untuk |
|---|---|---|
| `--v-bg` | `#090B14` | Hero gelap, section sinematik |
| `--v-surface` | `#171C2F` | Panel/card di atas dark |
| `--v-white` / `--v-text` | `#F6F7FF` | Headline & body di dark |
| `--v-muted` | `#C1C5D7` | Teks pendukung di dark |
| `--v-magenta` / `--v-accent` | `#F449AD` | CTA & focus aktif **di dark** |
| `--v-violet` / `--v-accent-2` | `#A487FF` | Highlight sekunder, visual sistem |
| `--v-gold` | `#F2C679` | Sinyal premium/featured — **jarang** |
| `--v-light` | `#F5F6FA` | Panel EDU / bacaan panjang |
| `--v-ink` | `#171B2A` | Teks di light |

### Aturan kontras (wajib)
- Teks normal ≥ 4.5:1, teks besar ≥ 3:1. Uji di background asli tiap komponen.
- **Magenta `#F449AD` di atas putih ≈ 3.25:1 → tidak boleh untuk body kecil.** Di light surface pakai ink atau magenta yang digelapkan (buat token `--v-magenta-deep` dan cek ≥ 4.5:1).
- **Tombol magenta pakai teks ink gelap, bukan putih.**
- Gold hanya untuk tier/featured; jangan jadi warna navigasi dan jangan menyiratkan status berbayar tanpa dasar.
- Status tidak boleh dibedakan **hanya** dengan warna — selalu ada teks/ikon.

Buat juga token semantik: `success`, `warning`, `danger`, `info`, masing-masing versi dark & light, lolos kontras.

---

## 3. Tipografi (PROPOSED)

Rekomendasi: **Inter Display** (headline) + **Inter** (body/UI). Bisa diganti jika ada font brand resmi. Fallback system sans; teks tidak boleh tak terlihat saat font loading.

| Style | Desktop | Mobile | Leading / batas |
|---|---|---|---|
| Display XL | 64–84 px | 40–52 px | 1.02–1.08, maks 3 baris |
| H1 hero | 52–64 px | 34–42 px | 1.08–1.12, maks 3 baris |
| H2 section | 32–40 px | 27–32 px | 1.14–1.2 |
| H3 card | 21–25 px | 19–22 px | 1.25–1.3 |
| Body L | 18 px | 17 px | 1.55–1.65 |
| Body | 16 px | 16 px | 1.5–1.65 |
| Small UI | 13–14 px | 13–14 px | 1.35–1.5 — bukan paragraf |
| Micro/metadata | 12 px | 12 px | 1.4 |

- Satu H1 per halaman. Ukuran pakai `clamp()`.
- Lebar baca 60–75 karakter (maks ±680–740px).
- Bobot: 400 body, 500 medium, 600 semibold, 700 bold; maks 2 bobot per komponen.
- Sentence case untuk instruksi/CTA. ALL CAPS hanya untuk eyebrow/metadata kecil.
- Copy Bahasa Indonesia lebih panjang dari Inggris — beri ruang di tombol & kartu.

---

## 4. Layout, grid, spacing

| Viewport | Grid | Container & gutter |
|---|---|---|
| ≥ 1440 | 12 kolom | max-width 1280, margin 64–80, gap 24 |
| 1024–1439 | 12 kolom | max-width 1120, margin 32–56, gap 20–24 |
| 768–1023 | 8 kolom | margin 28–32, gap 20 |
| ≤ 767 | 4 kolom | margin 20–24, gap 16 |
| ≤ 359 | 4 kolom | margin 16, tanpa horizontal scroll |

- **Spacing scale:** 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. Tidak ada angka acak.
- Section cerita: 96–128px vertikal (desktop), 64–80px (mobile). Section transaksional lebih rapat.
- Grid kartu: 3 kolom desktop / 2 tablet / 1 mobile.
- Hero tidak wajib 100vh; konten utama terlihat tanpa menunggu animasi.
- Sticky header maks ±72px desktop / 64px mobile, mengecil halus saat scroll, tidak hilang total.
- Viewport yang harus dicek: 320, 360, 390, 430, 768, 1024, 1280, 1440, 1920; landscape mobile; zoom 200%.

### Bentuk
- Radius: 8px kecil, 12px card default, 18–24px featured surface, pill hanya chip/tombol tertentu.
- Border 1px netral. Shadow minimal di dark — kedalaman dari beda surface & cahaya terkendali.
- Ikon: outline konsisten 1.75–2px, **satu** library saja.

---

## 5. Brand shell bersama

### 5.1 Global Header
| Elemen | Corporate | Subdomain |
|---|---|---|
| Brand lockup | Wordmark VIBOXS → viboxs.com | Wordmark sama → viboxs.com + label lini ("EDU") |
| Menu lokal | Beranda · Ekosistem · Karya* · Tentang · Kontak | Menu fungsi khusus lini (lihat brief masing-masing) |
| Ecosystem switcher | Popover 4 item | Popover 4 item, item aktif ditandai |
| CTA utama | "Kenali Universe" / pilih kebutuhan | Sesuai tugas: Konsultasi / Pilih Program / Gabung |

\* "Karya" disembunyikan jika belum ada studi kasus yang approved.

**Ecosystem switcher** — 4 item berlabel deskriptif:
- VIBOXS — *overview perusahaan*
- Universe — *komunitas OPC*
- EDU — *pembelajaran*
- Services — *solusi bisnis*

Aturan:
- Active state = warna **+** penanda non-warna (garis bawah / bobot / teks "Anda di sini").
- Subdomain VIBOXS dibuka di tab yang sama. Tidak ada preloader/portal animasi lintas domain.
- Keyboard & screen reader bisa akses semua item; Escape menutup; fokus kembali ke tombol pemicu.
- Destinasi yang belum live tampil dengan label "Sedang disiapkan", bukan link mati.

### 5.2 Mobile Drawer
- Hamburger hit area ≥ 44px.
- Isi: menu lokal di atas, section **"Jelajahi ekosistem"** berisi 4 destinasi, lalu CTA.
- Focus trap saat terbuka, Escape/close jelas, scroll lock hanya saat terbuka.

### 5.3 Footer
- Wordmark + baris identitas legal: *"VIBOXS adalah unit AI Venture Studio di bawah PT Ekosistem Pelosok Hub."* (redaksi menunggu verifikasi legal)
- Link ke keempat destinasi, privacy, terms, kontak, (kebijakan lokal tiap lini).
- Copyright tahun dinamis.
- Tidak ada link kosong, ikon sosial tanpa label, atau nomor kontak yang belum diverifikasi → gunakan slot placeholder berlabel jelas di desain.
- Mobile: tetap bisa diakses dengan satu expand section atau daftar statis.

---

## 6. Komponen & state wajib

| Komponen | Varian / state minimum | Aturan |
|---|---|---|
| Button | primary, secondary, text; default/hover/focus/pressed/disabled/loading | Min-height 44px. Label kerja spesifik ("Kirim kebutuhan", bukan "Submit"). Loading tidak menggeser ukuran tombol; label "Memproses…" |
| Link | text, inline, nav, deep-link (lintas domain) | Ada underline/indikator, bukan cuma warna |
| Card | editorial, service, program, benefit, evidence | Seluruh kartu clickable hanya jika menuju satu tujuan |
| Badge | status, category, editorial | Status selalu berteks: **Tersedia · Pilot · Segera hadir · Daftar minat · Penuh · Ditutup** |
| Accordion | closed/open/focus | Toggle pakai button semantik |
| Tabs | horizontal/stacked, selected/focus | Navigasi panah keyboard |
| Dialog | open/closed/loading/error | Focus trap, Esc, restore fokus |
| Toast | success/info/error | **Bukan** satu-satunya konfirmasi untuk aksi penting |
| Carousel | manual, pause, next/prev | Tidak autoplay untuk info inti |
| Stepper | step n of m, current/completed/error | Status dari server, bukan timer palsu |
| Form field | label selalu tampil, hint, error inline + error summary | Input ≥ 44px. Placeholder hanya contoh. Error tertaut ke field & terbaca screen reader |
| Radio-card | pilihan kategori besar (dipakai Services /start, Universe /join) | Terlihat jelas terpilih tanpa bergantung warna |
| Consent checkbox | wajib (privacy) vs opsional (marketing) | **Marketing tidak pernah tercentang default**, dipisah visual dari persetujuan privasi |
| Empty state | katalog kosong, aktivitas kosong, karya kosong | Kalimat jujur + 1 aksi alternatif yang nyata |
| Error / offline state | gagal kirim, server error, link kadaluwarsa | Tidak bilang "berhasil"; input tidak hilang; ada coba lagi |
| Success state | tersimpan + nomor referensi | Hanya tampil setelah server konfirmasi |
| Unavailable destination | subdomain belum live | "Halaman ini sedang disiapkan. Kembali ke peta ekosistem." |

Hover tidak boleh jadi satu-satunya cara menemukan informasi. Disabled menunjukkan alasan bila relevan ("Pendaftaran belum dibuka").

---

## 7. Motion (PROPOSED)

> Motion menjelaskan struktur, relasi, transisi konteks, dan feedback. **Bukan** dekorasi di setiap elemen.

| Token | Nilai | Pakai untuk |
|---|---|---|
| `motion.instant` | 0–80 ms | Tap/pressed |
| `motion.fast` | 140–180 ms | Hover, warna, ikon |
| `motion.base` | 220–280 ms | Modal, tabs, accordion |
| `motion.slow` | 360–480 ms | Section masuk, panel besar |
| `motion.hero` | 650–900 ms (maks) | Satu sequence hero, non-blocking |
| `easing.standard` | `cubic-bezier(.2,.8,.2,1)` | Entrance |
| `easing.exit` | `cubic-bezier(.4,0,1,1)` | Exit singkat |
| `stagger` | 40–80 ms/item | Maks 4 item berurutan |

### Empat aturan mutlak
1. **Content-first:** headline, deskripsi, CTA tetap tampil walau JS/animasi gagal.
2. **Reduced motion:** animasi non-esensial **mati** (bukan cuma dipercepat) saat `prefers-reduced-motion`.
3. **No scroll-jacking:** scroll, back, trackpad tetap alami.
4. **Budget per device:** animasi berat mati di mobile/low-end; canvas dekoratif tidak loop tanpa batas.

### Storyboard per destinasi
| Destinasi | Narasi motion | Fallback |
|---|---|---|
| Corporate hero | Lockup tenang; garis relasi ke Universe/Services/EDU mengembang ringan saat jalur ditunjuk | Diagram statis 3 jalur selalu terbaca |
| Universe entry | Grid/constellation node menggambarkan interaksi OPC; satu manfaat disorot | **Jangan** tampilkan network fiktif sebagai jumlah anggota |
| Services discovery | Kartu solusi maju 6–10px saat hover; alur strategy→build sebagai timeline | Tanpa efek per kata; touch setara |
| EDU program | Modul & timeline belajar reveal ringan | **Tanggal/jadwal tidak bergerak** |
| Cross-domain nav | Respons menu konsisten | Navigasi biasa jika JS gagal |

### Hover, cursor, feedback
- Hover kartu: ring halus / border glow 140–180ms. Larang kartu melompat besar.
- Hover CTA: perubahan warna/border, panah geser ≤ 4px.
- Pressed: scale 0.98 singkat.
- Focus keyboard: outline ≥ 2px + offset, jelas di dark & light.
- **Custom cursor = opsional**, hanya desktop pointer-fine: ring kecil 6–10px, `pointer-events:none`, **tidak mengganti cursor native**, mati di form/touch/reduced-motion.

### Anti-pattern motion (larang)
Custom cursor yang menutupi pointer · video autoplay dengan audio · parallax berlapis · reveal yang jadi syarat membaca · transisi halaman > 1 detik · intro/loading screen panjang.

---

## 8. Arah visual & aset

**Usulan artikulasi:** *modern cinematic interface* — fondasi dark cosmic yang tenang, satu aksen dominan per scene, konten nyata atau diagram relasi sebagai visual utama. Partikel/glow tidak boleh jadi konten utama. Visual sci-fi tidak wajib di semua halaman.

| Jenis visual | Arah | Aturan |
|---|---|---|
| Foto editorial | Aktivitas builder, training, kolaborasi, workspace | Hanya dokumentasi asli berizin; caption faktual |
| 3D / motion graphic | Orbital / connection system geometris abstrak, low-noise | Diberi perlakuan "ilustrasi konseptual" |
| Rangers (karakter) | Siluet, hanya jika relevan dengan kapabilitas profesional | Tidak mirip IP/superhero populer |
| Diagram kasus | Before/after proses | Angka hanya jika terverifikasi |
| Mockup UI produk | Screenshot/prototype berlabel jelas | Prototype tidak boleh tampak live |
| Ikon | Outline geometris satu gaya | Lisensi benar |

### Prinsip anti-AI-slop (wajib)
- **Tidak ada** robot humanoid, tangan holografik, otak neon, jaringan titik acak, ikon "AI" generik.
- Glassmorphism tidak di setiap kartu; hanya overlay terukur.
- **Tidak ada** foto tim/kelas/acara buatan AI yang tampak seperti dokumentasi nyata.
- Gradient berat tidak di belakang paragraf panjang.
- **Visual truth rule:** hero ilustratif tidak boleh memberi kesan gedung, kantor, fasilitas, investasi, atau anggota jaringan itu benar-benar ada.

### Aset yang belum tersedia → perlakuan di desain
| Aset | Status | Pakai di desain |
|---|---|---|
| Logo master VIBOXS (SVG) | Belum ada | Wordmark teks "VIBOXS" + catatan "placeholder — logo resmi menyusul". **Jangan menggambar ulang logo seolah resmi.** |
| Foto founder/tim | Belum berizin | Blok tipografi saja, atau slot abu berlabel |
| Logo klien/partner | Diblokir | Tidak ditampilkan sama sekali |
| Foto event/kelas | Belum ada | Ilustrasi abstrak berlabel, atau tidak ada |

---

## 9. Bahasa & konten

| Lini | Karakter narasi | CTA khas |
|---|---|---|
| Corporate | Jernih, visi besar, kredibel | Jelajahi ekosistem / Lihat karya |
| Universe | Inspiratif, praktis bagi OPC, belonging tanpa klaim berlebihan | Kenali Universe / Ikuti aktivitas |
| EDU | Instruktif, terstruktur, hasil belajar jelas | Lihat program / Daftar sesi |
| Services | Profesional-ke-profesional, problem → solusi | Konsultasikan kebutuhan / Lihat pendekatan |

**Urutan konten universal:** Context (siapa & satu manfaat) → Proof (proses/bukti terverifikasi) → Path (1 CTA utama + 1 sekunder) → Depth (detail di halaman turunan) → Reassurance (identitas legal, ketentuan).

- "OPC" dijelaskan saat pertama muncul: *One Person Company — model bisnis yang dijalankan satu founder dengan dukungan sistem, AI, dan jejaring* (bukan bentuk badan hukum PT Perorangan).
- Commander/Rangers/Mission boleh sebagai sentuhan budaya, **setelah** label fungsi profesional terbaca.

### Copy yang dilarang di desain mana pun
"#1 / pemimpin OPC Indonesia" · "ribuan member aktif" · "100+ klien" · "didanai investor" · "jaminan omzet/closing" · "hemat 70%" · "100% aman" · "AI otomatis penuh" · "sertifikat nasional/diakui industri" · "bergabung dapat saham" · countdown seat palsu · rating bintang tanpa data.

---

## 10. Aksesibilitas & performa (target, bukan hasil ukur)

- WCAG 2.2 AA: kontras, keyboard penuh, fokus terlihat, label form, error terbaca, satu H1, landmark.
- Target sentuh: minimum WCAG 24×24px, desain VIBOXS 44px.
- Tanpa horizontal scroll di 320px; tetap berfungsi di zoom 200%.
- Core Web Vitals target p75: **LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1**.
- Hero media: still fallback, kompresi, tidak ada video wajib. Reserve dimensi gambar.

---

## 11. Handoff token ke kode (contoh, PROPOSED)

```css
/* PROPOSED — do not claim locked */
:root {
  --v-bg: #090B14;
  --v-surface: #171C2F;
  --v-text: #F6F7FF;
  --v-text-muted: #C1C5D7;
  --v-accent: #F449AD;
  --v-accent-2: #A487FF;
  --v-signal-gold: #F2C679;
  --v-light: #F5F6FA;
  --v-ink: #171B2A;
  --v-radius-sm: 8px;
  --v-radius-card: 12px;
  --v-radius-featured: 20px;
  --v-duration-fast: 160ms;
  --v-duration-base: 260ms;
  --v-duration-slow: 420ms;
  --v-ease-enter: cubic-bezier(.2,.8,.2,1);
  --v-ease-exit: cubic-bezier(.4,0,1,1);
}
@media (prefers-reduced-motion: reduce) {
  .decorative-motion { animation: none; transition: none; }
}
```

Nama token harus sama di desain, CSS, motion manifest, dan snapshot test. Setiap animasi masuk **motion manifest**: element ID, tujuan, trigger, durasi, easing, varian mobile, perilaku reduced-motion, biaya resource, fallback, test.

---

## 12. Checklist QA desain (D02 QA-01–QA-14)

- [ ] Semua alamat menampilkan VIBOXS sebagai master brand
- [ ] Link langsung ke EDU masuk EDU tanpa singgah Corporate
- [ ] Program/offer/benefit punya satu pemilik
- [ ] 320–1920px, zoom 200%, CTA tidak hilang
- [ ] Reduced motion tetap memuat semua informasi
- [ ] Header, switcher, form, modal bisa dipakai keyboard
- [ ] Kontras normal ≥ 4.5:1, besar ≥ 3:1
- [ ] Tidak ada partner/testimoni/angka dummy
- [ ] Tidak ada trik cursor/hover-only di mobile
- [ ] Hover, focus, active, error, loading, success lengkap
- [ ] Aset (logo/foto) punya lisensi & sumber, atau jelas placeholder

## 13. Keputusan terbuka (D02 DV-01–DV-10)
DV-01 logo master · DV-02 palet final · DV-03 Inter vs font brand · DV-04 3D vs foto per halaman · DV-05 custom cursor · DV-06 status benefit Universe & katalog EDU · DV-07 hero & tagline corporate · DV-08 Figma/Storybook/stack · DV-09 audit situs live · DV-10 izin logo klien/portofolio.
