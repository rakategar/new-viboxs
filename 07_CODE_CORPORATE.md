# Claude Code Brief — Corporate (viboxs.com)
**Prasyarat:** `06_CODE_FOUNDATION_MONOREPO.md` + `CLAUDE.md` di root · Desain: `docs/design/corporate/`
**Sumber:** D03, D09 (14 prompt), D02, D07, D08 · **Scope:** `apps/corporate` + paket bersama yang diperlukan saja.

---

## 1. Ringkasan build

Website identitas & routing. Bukan mesin transaksi atau membership.

| Dibangun | Tidak dibangun |
|---|---|
| App Corporate responsif, design system bersama, halaman publik, routing, kontak umum, legal/error, analytics aman, test & preview | Checkout EDU, membership Universe, intake Services, SSO, listing investor/saham |

Fase rilis: **C0** shell → **C1** proof berizin → **C2** motion polish → **C3** content expansion → **C4** cutover (hanya bila diputuskan).

## 2. Route

| Route | Isi minimum | Mode |
|---|---|---|
| `/` | H01–H09 | P0 shell |
| `/ecosystem` | E01–E05, tidak menjual program/benefit | P0 |
| `/about` | A01–A06, field legal terverifikasi | P0 (gated legal) |
| `/contact` | Route chooser + general inquiry | P0 bila backend siap |
| `/work` | Kasus lolos D08, atau route disembunyikan | C1 kondisional |
| `/work/[slug]` | Detail kasus berizin | C1 kondisional |
| `/privacy`, `/terms` | Kebijakan approved | P0 bila mengumpulkan data |
| not-found / error | 404 asli, tanpa stack trace | P0 |

## 3. Content schema (PROPOSED)

```ts
interface CorporatePage extends PublishableRecord {
  route: string; title: string; description: string; bodyBlocks: Block[];
}
interface DestinationCard {
  key: 'universe' | 'edu' | 'services';
  label: string; benefitShort: string; url: string;
  launchStatus: 'live' | 'preview' | 'disabled';
  fallbackUrl?: string; lastVerifiedAt?: string;
}
interface CaseStudy extends PublishableRecord {
  slug: string; clientVisibility: 'anonymous' | 'named_with_consent';
  approvedSummary: string; proofRefs: string[]; permissions: string[];
  assetRefs: string[]; industry: string; challenge: string; scope: string;
  deliverables: string[]; outcome?: { metric: string; baseline: string; period: string; method: string };
  ctaDestination: 'services';
}
interface CompanyIdentity { legalName: string; businessBrand: string; descriptor: string;
  publicContact?: string; approvedLegalFields: string[]; revision: string; }
interface MediaAsset { assetId: string; src: string; altText: string; rightsStatus: string;
  owner: string; licenseRef?: string; approvedUntil?: string; }
```

**Fixture awal:**
- H1 kandidat A: *"Membangun bisnis di era AI, tak harus sendirian."* (PROPOSED)
- Descriptor: *"VIBOXS adalah AI Venture Studio di bawah PT Ekosistem Pelosok Hub."* (cek redaksi legal)
- `caseStudies = []` (kosong) → /work tersembunyi
- Logo: wordmark teks berlabel non-authoritative
- Privacy/terms status `UNAPPROVED`

## 4. Kontrak komponen kunci
| Komponen | State kritis |
|---|---|
| Header / Switcher | closed/open, focus return, Escape, outside click, active host, responsif, fallback tanpa JS |
| DestinationCard | label, satu CTA, link normal, parity hover/focus, available/unavailable |
| HeroRelationalVisual | teks diagram semantik, fallback statis, entrance ≤ 900ms non-blocking, reduced motion |
| EvidenceCard | publish gate, aset tersanitasi, tanpa statistik karangan |
| ContactForm | idle / invalid / pending / failed / persisted / retry; anti-spam; cegah duplikat |
| Footer | semua link hidup atau state unavailable jelas |
| ErrorBoundary | pesan aman, retry/kontak alternatif, tanpa stack trace |

## 5. Analytics allowlist
| Event | Field aman | Jangan dilacak |
|---|---|---|
| `corporate.view` | route, release_id, consent_state | PII, full query string |
| `corporate.destination_click` | destination enum, origin route, placement | email, token |
| `corporate.case_view` | case_id publik, route | detail privat |
| `corporate.contact_submit` | success/fail, error_code | isi pesan, telepon, email |
| `corporate.nav_open` | device_class, nav_id | fingerprint |

## 6. SEO
Title draft: `/` "VIBOXS — Ekosistem Bisnis & AI Venture Studio" · `/ecosystem` "Ekosistem VIBOXS — Universe, EDU & Services" · `/about` "Tentang VIBOXS — AI Venture Studio" · `/contact` "Kontak VIBOXS — Pilih Jalur Kebutuhan". Canonical www vs apex **OPEN** — jangan deklarasikan dua root. Sitemap hanya URL published. Preview noindex. Jangan buat redirect sebelum inventaris URL lama (D13). Organization structured data hanya dari identitas terverifikasi.

---

## 7. Tahap build (P00–P13)

> Jalankan satu per sesi dengan template pembuka di file 06 §11.

### P00 — Audit repo & ADR baseline
```text
TUJUAN: catat kondisi repo nyata, tanpa mengubah aplikasi existing.
LANGKAH:
1. Periksa file, lockfile, layout app, CI, referensi DNS/hosting, env example. JANGAN cetak secret.
2. Baca docs/reference D01 D02 D03 D07 D08; petakan ke perubahan kode. Jika dokumen hilang, catat blocker di docs/decisions.
3. Deteksi framework aktual; bandingkan dengan rekomendasi Next.js+TS monorepo 4 app. Jangan ganti stack hanya untuk menyesuaikan.
4. Tulis docs/decisions/ADR-0001-corporate-baseline.md: pilihan, alternatif ditolak, alasan, risiko, portabilitas.
5. Tulis docs/qa/corporate-inventory.md: route, aset, link belum jelas, perintah test yang tersedia.
6. Tidak mengubah DNS, secret, konten live, atau deploy.
ACCEPTANCE: tidak ada file user rusak; inventaris berisi kondisi NYATA.
```

### P01 — Workspace & quality automation
```text
TUJUAN: workspace Corporate + paket bersama minimal, portabel, teruji.
LANGKAH:
1. Ikuti ADR-0001. Jika repo kosong & disetujui: scaffold apps/corporate dan packages/{ui,design-tokens,contracts,content-models,observability,config}.
2. Next.js App Router: strict TS, halaman semantik, CSS variables, font fallback, error boundary.
3. Script lint, format, typecheck, unit, e2e, build, preview; pertahankan package manager/lockfile.
4. .env.example dengan origin publik & toggle; JANGAN buat .env dengan kredensial palsu.
5. Semantik local/preview/staging/production, preview noindex, build/commit id.
6. CI: install, lint, typecheck, test, build, smoke route preview.
7. App lain cukup direktori kosong jika workspace membutuhkan.
ACCEPTANCE: fresh install reproducible; lint/typecheck/build lulus; env invalid gagal aman; tidak ada secret.
```

### P02 — Design tokens & accessible shell
```text
TUJUAN: header, footer, ecosystem switcher, UI primitives bersama.
LANGKAH:
1. Implement token dari 01_SHARED_DESIGN_SYSTEM (dan export Claude Design) sebagai CSS variables replaceable; tandai PROPOSED di docs.
2. Komponen: Button, Link, Card, Badge, FocusRing, Header, Footer, EcosystemSwitcher, MobileDrawer, SkipLink.
3. Header: Beranda/Ekosistem/Karya/Tentang/Kontak; switcher ke Universe/EDU/Services dari origin config.
4. "Karya" disembunyikan bila CASE_STUDIES_ENABLED=false atau tidak ada kasus approved.
5. Drawer: Escape & tombol close, focus trap, restore fokus.
6. Kontras, target ≥ 44px, reduced motion, tanpa info hover-only.
7. Logo = wordmark teks berlabel non-authoritative.
ACCEPTANCE: header & drawer bisa dipakai keyboard; aria-expanded benar; 320px tanpa overflow; tidak ada URL kosong.
```

### P03 — Route tree, SEO skeleton, static fallback
```text
LANGKAH:
1. Route /, /ecosystem, /about, /contact, /privacy, /terms, not-found, error; /work kondisional.
2. Layout bersama + metadata; copy pending-approval ditandai di source (bukan di UI produksi).
3. Sentralisasi route config, canonical origin (belum diputuskan → config preview aman), destinasi, visibilitas nav.
4. Tidak ada kebijakan legal karangan. Preview: placeholder internal jelas. Deploy publik DIBLOKIR jika form aktif & policy belum approved.
5. Semua route bermakna tanpa animasi/JS.
6. Builder sitemap/robots: kecualikan preview, /work tersembunyi, route internal. 404 HTTP asli.
7. Tidak mengubah URL lama atau redirect.
ACCEPTANCE: smoke route lulus; 404 asli; preview noindex.
QA: TC-15
```

### P04 — Homepage H01–H04
```text
LANGKAH:
1. H01 header (P02), H02 hero, H03 tiga kartu destinasi, H04 "cara kerja ekosistem".
2. H1 dari file konten bertipe (PROPOSED); tanpa klaim #1, pendanaan, jumlah member.
3. CTA hero "Jelajahi ekosistem" → #ecosystem; sekunder "Kenali VIBOXS" → /about.
4. Kartu: Universe=OPC/komunitas, EDU=belajar, Services=solusi; link ke host pemilik; tidak ada checkout/registrasi di Corporate.
5. Destinasi status disabled → "Sedang disiapkan" / alternatif, bukan CTA palsu.
6. Grafik relasi ringan; teks & link di DOM dulu; motion ≤ 900ms; fallback statis.
7. H1, manfaat, CTA tidak butuh scroll-reveal.
ACCEPTANCE: H1/CTA terbaca tanpa JS; 3 route teruji; keyboard.
QA: TC-01, TC-02, TC-03, TC-04, TC-13
```

### P05 — Homepage H05–H09
```text
LANGKAH:
1. H05 evidence: proses faktual saja (fallback "Cara kami bekerja").
2. H06 selected work: 0 kartu bila tidak ada kasus APPROVED — section tidak dirender.
3. H07 about summary dari identitas terverifikasi + link /about.
4. H08 tiga rute penutup sesuai status destinasi.
5. H09 footer: brand/legal line, 4 destinasi, kontak & legal terverifikasi, tahun dinamis.
6. Adapter analytics destination_click, field non-sensitif, consent gate, default OFF.
ACCEPTANCE: /work kosong tersembunyi; tidak ada hasil karangan; CTA tepat; tidak ada PII ke analytics.
QA: TC-09, TC-14
```

### P06 — /ecosystem
```text
LANGKAH:
1. E01 intro, E02 map, E03 selector berbasis kebutuhan, E04 contoh hubungan kondisional, E05 reassurance.
2. Ringkas: harga/benefit milik Universe, jadwal milik EDU, katalog/intake milik Services.
3. Diagram SVG aksesibel, label semantik, reduced motion, teks selalu terlihat.
4. href dari origin config; fallback about/contact.
5. OPC = model operasi, bukan status hukum PT Perorangan.
6. Hindari copy duplikat lintas subdomain.
ACCEPTANCE: first-click jelas; semua link jalan; mobile satu kolom.
QA: TC-02, TC-03, TC-04
```

### P07 — /about
```text
LANGKAH:
1. A01 hero, A02 approach, A03 ecosystem, A04 governance, A05 people (kondisional), A06 CTA.
2. Hanya brand, nama legal, deskripsi approved. NIB, alamat, kontak, jumlah staf, investor → OFF sampai approved.
3. Foto & bio founder tersembunyi kecuali hak A-08 terverifikasi.
4. Commander/Rangers bukan klaim kepegawaian.
5. Test: tidak ada 'lorem ipsum', logo palsu, nama tak terjaga di bundle produksi.
ACCEPTANCE: bisa publish dengan copy minimal approved; blok tim/founder absen default.
```

### P08 — /work & case study kondisional
```text
LANGKAH:
1. Schema CaseStudy; seed list approved KOSONG. Guard izin/akurasi/PII/legal D08.
2. Template /work dan /work/[slug] untuk data approved saja.
3. Tanpa kasus approved: tidak ada di nav, kartu, sitemap; slug tersembunyi → 404 asli.
4. Nama, logo, screenshot, testimoni, metrik hanya bila ada izin per aset/pernyataan.
5. Screenshot tersanitasi (tanpa data pelanggan, URL admin, key).
6. Validator build: kasus published tanpa sourceRefs + approval → build gagal.
7. CTA kasus → Services; tidak ada form intake duplikat.
ACCEPTANCE: gate memblokir kasus belum approved; kasus revoked hilang & cache invalid.
QA: TC-09, TC-10
```

### P09 — /contact
```text
LANGKAH:
1. Pilihan intent: Universe, EDU, Services, pertanyaan umum. Intent spesifik → navigasi ke host pemilik.
2. Form umum: nama, satu metode kontak, pesan singkat, notice privasi; tanpa dokumen identitas/pembayaran.
3. Validasi schema server, anti-spam, rate limit, idempotency.
4. Interface persistence (stub melempar NotConfigured); tidak ada sukses sebelum adapter durable nyata.
5. CRM sekunder; gagal CRM tidak menghapus lead.
6. Consent esensial terpisah dari marketing; simpan versi notice + timestamp.
7. Backend/policy/owner/kontak belum ada → submit DISABLED di build publik, tampilkan alternatif terverifikasi.
8. Tidak ada pesan/telepon/email mentah di log/analytics.
ACCEPTANCE: test invalid/timeout/duplikat/sukses; sukses palsu mustahil.
QA: TC-11, TC-12
```

### P10 — Legal, aksesibilitas, error recovery
```text
LANGKAH:
1. Adapter policy untuk /privacy & /terms; seed UNAPPROVED.
2. Deploy publik GAGAL bila mengumpulkan data dengan notice belum approved.
3. 404 asli & error page aman (tanpa stack trace/hostname internal).
4. Media fallback, alt text, skip link, focus, reduced motion, zoom.
5. Kontrol cookie hanya bila ada tracker nyata; consent tidak disimpulkan dari scroll.
6. Metadata locale id-ID.
ACCEPTANCE: legal gating, 404, error aman, keyboard & screen reader smoke lulus.
QA: TC-14, TC-15, TC-16
```

### P11 — Motion, media, performa
```text
LANGKAH:
1. M01–M07 dengan budget D02. Tanpa loop konstan, cursor takeover, konten tersembunyi, video autoplay berat.
2. Optimasi font & gambar; prioritaskan teks hero & kartu rute.
3. Uji JS off, reduced motion, touch, low-end, gambar gagal, jaringan lambat.
4. Tanpa layout shift; transform/opacity.
5. Cek kontras di dark & light (magenta di putih bisa gagal).
6. Ukur LCP/CLS lab; jangan klaim INP p75 sebelum ada RUM.
7. Dokumentasikan efek opsional + kriteria penghapusan.
ACCEPTANCE: tidak ada intro blocking; tidak ada interaksi hover wajib; budget terdokumentasi.
QA: TC-07, TC-16
```

### P12 — QA otomatis, a11y, konten, keamanan
```text
LANGKAH:
1. Petakan TC-01–TC-16 ke tes otomatis/manual: PASS/FAIL/BLOCKED + path bukti.
2. Lint, typecheck, unit, link smoke, 404, e2e keyboard, a11y, screenshot mobile, gambar rusak.
3. Lebar 320/360/390/430/768/1024/1280/1440/1920 + zoom 200%.
4. Gate izin: /work tersembunyi, logo/metrik palsu diblokir, fallback destinasi.
5. Form: invalid, duplikat, timeout, rate limit, sukses persistence; tanpa bocor secret/PII.
6. SEO preview noindex, production indexable hanya yang approved.
7. Laporan blocker P0/P1/P2 dengan build id, tester, tanggal, screenshot. JANGAN tulis PASS tanpa eksekusi.
```

### P13 — Handoff & preview release (tanpa cutover)
```text
LANGKAH:
1. Deploy hanya ke preview/staging jika kredensial ada DAN user meminta; selain itu tulis langkah manual.
2. Pastikan preview noindex, tanpa kontak/payment/CRM nyata, data sintetis.
3. Release manifest: commit SHA, versi, route, dependency, status approval konten, QA report, screenshot, isu OPEN.
4. Rollback preview. JANGAN ubah registrar, NS, canonical apex/www, DNS produksi.
5. Daftar approval eksternal untuk go-live: logo, copy/token, 3 URL destinasi, privacy/terms, owner kontak, hak bukti, audit redirect, canonical, QA.
6. Infrastruktur → D13; token → founder.
7. Simpulkan GO PREVIEW / NO-GO PRODUCTION sesuai bukti.
```

---

## 8. QA — TC-01 s.d. TC-16 (default NOT RUN)

| ID | Skenario | Lulus bila | Bukti |
|---|---|---|---|
| TC-01 | First load tanpa animasi | H1, subcopy, CTA, 3 destinasi terbaca | Browser JS/motion off |
| TC-02 | Pilih Universe | Host benar; halaman tujuan menjelaskan Universe | E2E |
| TC-03 | Pilih EDU langsung | Tidak dipaksa lewat Universe/Services | E2E |
| TC-04 | Pilih Services | Tampil Services, bukan kontak generik | E2E |
| TC-05 | Logo / back browser | Kembali normal; fokus tidak hilang | E2E |
| TC-06 | Keyboard-only | Switcher, drawer, kartu, form; Escape menutup | axe + manual |
| TC-07 | Reduced motion | Info & CTA lengkap; canvas mati | Media query |
| TC-08 | 320px | Tanpa horizontal scroll | Screenshot |
| TC-09 | Work kosong | Tanpa kartu dummy | Unit/e2e gate |
| TC-10 | Kasus approved | Sesuai approval; tanpa data klien bocor | Review + test |
| TC-11 | Kontak invalid | Error jelas; tanpa sukses palsu | API negative |
| TC-12 | Kontak sukses | Lead tersimpan sekali; konfirmasi aksesibel | Integrasi test DB |
| TC-13 | Destinasi offline | Tidak dead-end | Simulasi link fault |
| TC-14 | Legal footer | Privacy/terms sah & bisa diakses | Review legal |
| TC-15 | Metadata crawl | Canonical/robots/sitemap benar; 404 asli | Crawler + HTTP |
| TC-16 | Aset/jaringan gagal | Fallback teks/logo; tanpa layout shift berat | Throttle |

## 9. Blocker terbuka
D09-O01 logo master · O02 token/copy · O03 codebase belum diaudit · O04 URL/canonical lama · O05 kesiapan destinasi · O06 kasus approved · O07 kontak resmi & privacy · O08 CMS/CRM/analytics/hosting · O09 tanggal rilis.
