# Claude Code Brief — Universe (universe.viboxs.com)
**Prasyarat:** file 06 + `CLAUDE.md` · Shared shell D09–D11 · Desain: `docs/design/universe/`
**Sumber:** D06, D12 (25 prompt), D02, D07, D08, D11 (kontrak benefit EDU) · **Scope:** `apps/universe` saja.

---

## 1. Ringkasan build

**North star:** founder OPC memahami Universe dan menerima hasil yang **jujur dan bisa ditindaklanjuti** setelah bergabung.

Universe = orientasi OPC, join, status member, benefit, aktivitas, partner discovery, kolaborasi.
**Tidak** menggandakan: checkout EDU, quotation Services, equity otomatis.

Target **25 Desember 2026**: akses Universe nyata yang bisa dicoba (minimal satu perjalanan nyata dari link publik sampai konfirmasi, dengan operator yang bisa dihubungi). Bukan semua roadmap.

## 2. Route & aktivasi

| Route | Tugas | Aktivasi |
|---|---|---|
| `/` | Landing U01–U10 | P0 |
| `/about` | OPC, tujuan Universe, member vs partner | P0 |
| `/join` | Interest atau application/activation approved | P0 |
| `/benefits` | Benefit matrix approved saja | P0 kondisional |
| `/activities`, `/activities/[slug]` | Aktivitas approved saja | Kondisional |
| `/collaborate` | Aplikasi partner terpisah | P0/P1 gated |
| `/partners`, `/partners/[slug]` | Direktori OPC opt-in | P1 gated |
| `/membership` | Paket, harga, terms approved | P1 gated |
| `/member` | Area member nyata | P1 gated |
| `/help`, `/faq`, `/contact` | Support & recovery | P0 |
| `/policies/*` | Privasi, terms, conduct, billing | P0 |

## 3. Tiga hasil join

| Mode (`JOIN_MODE`, dari server config — **bukan** query string) | Arti | Pesan sukses |
|---|---|---|
| `interest` | Kontak + consent tujuan spesifik; tanpa akun/entitlement | "Minat Anda tercatat. Kami akan mengirim kabar bila tersedia." |
| `application` | Request + review manual; PENDING ≠ ACTIVE | "Permohonan Anda diterima untuk ditinjau; belum menjadi anggota aktif." |
| `member_active` | Entitlement dari aturan approved; jika berbayar, transaksi terverifikasi server | "Keanggotaan aktif hingga [tanggal]…" |

> **INTERNAL PRICE HOLD:** Rp79.000/bulan, Rp699.000/tahun, bonus 30/90 hari — **jangan publish atau tagih** sampai harga, benefit, merchant, consent recurring, cancel/refund, finance & legal lengkap.

## 4. Entitas & state

| Entitas | Sumber kebenaran | Kontrak keamanan |
|---|---|---|
| Contact / ConsentRecord | Core/CRM | Notice version & marketing purpose terpisah |
| UniverseLead / Application | Universe growth | State, source, consent, reviewer |
| MembershipPlan / Member | Universe + finance | Terms versioned, state terverifikasi, start/end, paid_through |
| BenefitRule / Entitlement | Owner benefit | Eligibility, cap, expiry, status, bukti sumber |
| Activity / RSVP | Owner event | Jadwal approved, kapasitas; owner EDU jika kelas |
| OPCProfile / Introduction | Partner manager | Consent publikasi, consent perkenalan dua pihak, field privat tersembunyi |
| CollaborationCase / Referral | Restricted business | Tahap review, akses terotorisasi, legal terpisah |
| PaymentEvent / AuditEvent | Gateway verified + core | Idempotency, event ID, rekonsiliasi, log immutable |

**Member lifecycle:** `VISITOR → LEAD → PENDING → ACTIVE → EXPIRED | CANCELED | SUSPENDED` (+ `PENDING_PAYMENT`, `FAILED`, `REFUNDED` bila billing aktif). Transisi server-defined.

| Transisi | Trigger & validasi | Efek |
|---|---|---|
| VISITOR → LEAD | Opt-in valid + consent | CRM entry; bukan membership |
| LEAD → PENDING | Apply/invite | Ticket review; tanpa jaminan diterima |
| PENDING → ACTIVE | Approval manual atau payment/entitlement terverifikasi | Grant entitlement start/end + audit |
| ACTIVE → EXPIRED | End date lewat tanpa renewal | Batasi benefit; riwayat disimpan |
| ACTIVE → CANCELED | Pembatalan sesuai terms | Akses mungkin sampai paid-through |
| ACTIVE → SUSPENDED | Pelanggaran setelah review | Blokir akses tertentu + mekanisme keberatan |
| PAYMENT → REFUNDED | Refund terverifikasi | Rekonsiliasi entitlement; cegah double refund/redemption |

**Referral lifecycle:** `RECEIVED → TRIAGED → OFFERED → ACCEPTED | DECLINED → INTRODUCED → CLOSED`.
**Collaboration workflow:** `SOURCED → SCREENING → OPPORTUNITY_MAPPING → PILOT_SCOPING → PERFORMANCE_REVIEW → AGREEMENT → CLOSED`.

Wajib: ID stabil, UTC internal, WIB di jadwal publik, akses per role, audit tanpa PII mentah di analytics.

## 5. Lintas domain & keamanan
- **Universe → EDU:** checkout & belajar milik EDU. Eligibility diverifikasi backend tepercaya; tidak ada diskon dari URL parameter.
- **Universe → Services:** link ke Start a Mission; hanya origin/intent non-sensitif; referral personal butuh consent scoped.
- **EDU/Services → Universe:** opt-in independen, bukan aktivasi diam-diam.
- **Cookie:** host-only default, Secure + HttpOnly + SameSite. Shared brand ≠ universal session. MFA admin bila akun aktif.
- **Payment:** signature, dedupe, rekonsiliasi. Return browser tidak memberi status.
- **Partner data:** record izin, penarikan, cache purge, tanpa kontak bocor. **Direktori ≠ portofolio investasi.**

## 6. Analytics
`universe_page_view` · `universe_benefit_view` · `universe_join_start` · `universe_join_interest_saved` (server + consent) · `universe_member_activated` (bonus trial ≠ MRR) · `universe_benefit_redeemed` (unik) · `universe_partner_intro_accepted` (≠ deal) · `universe_to_edu` / `universe_to_services` · `universe_member_cancel` · `support_request_created`. Klik tidak dihitung sebagai revenue.

---

## 7. Tahap build (P00–P24)

| Release | Prompt | Output / blocker |
|---|---|---|
| R0 foundations | P00–P03 | Verifikasi repo, konten & env terkelola |
| R1 public journey | P04–P10 | Homepage jujur + interest join yang benar-benar tersimpan |
| R2 access controls | P11–P16 | Application, login, membership, payment, rights, member area — **perlu approval per fitur**, boleh DISABLED/SANDBOX |
| R3 ecosystem paths | P17–P21 | Bridge EDU, handoff Services, perkenalan OPC, kolaborasi |
| R4 trust + launch | P22–P24 | Support, moderasi, SEO, motion, QA, staging, rollback |

> **Untuk target 25 Desember**, jalur minimum: P00–P10 + P22 (support) + P23–P24. P11–P21 dibangun hanya bila founder memutuskan modenya.

### P00 — Audit repo & baseline tanpa perubahan
```text
1. Periksa git, branch, package manager, apps/packages, route, auth, payment, CMS, CRM, test, CI. Tanpa secret.
2. Baca D01/D02/D06/D07/D08 + Build Pack D09–D11; bedakan kontrak rencana vs kode nyata.
3. Inventaris origin 4 domain, DNS/hosting diketahui, ownership data, integrasi; label VERIFIED/UNVERIFIED.
4. docs/universe/baseline.md, route gap map, source/decision ledger, ADR reuse vs app baru, matriks rilis P0/P1/P2.
5. Matriks U-T01..U-T20 status NOT RUN.
6. Tanpa perubahan produksi, login akun live, baca data pelanggan, migrasi hosting.
QA: U-T01, U-T20
```

### P01 — Workspace, config bertipe, CI
```text
1. Gunakan struktur repo & ADR; scaffold apps/universe (bukan 4 codebase baru).
2. Strict typing, lint, typecheck, unit/integration/e2e, build, dependency audit, CI PR.
3. Origin tiap domain; flag JOIN_MODE, MEMBER_MODE, PAYMENT_MODE, DIRECTORY_MODE, ACTIVITY_MODE, BENEFIT_MODE, MAIL_MODE fail-closed.
4. Pisah env; preview noindex, tanpa merchant live.
5. Secret server-only; .env.example nama + penjelasan.
6. Cold build dari README; config rusak → error terkendali; rollback.
QA: U-T01, U-T19
```

### P02 — Shell VIBOXS & direct entry
```text
1. Reuse Header, EcosystemSwitcher, Footer, Button, Input, focus ring — tanpa fork.
2. Menu lokal: Why Universe, Benefits, Activities, Collaborate, FAQ + CTA membaca JOIN_MODE.
3. Logo → corporate; Universe active; EDU/Services dari origin config.
4. Skip link, keyboard, Escape, focus return, drawer, aria, target sentuh, fallback non-JS.
5. Host eksternal belum ada → status jelas; tanpa tab baru paksa.
6. Route P0: /, /about, /join, /help, /faq, /contact, /policies/* (approved atau dinonaktifkan jujur).
QA: U-T01, U-T02, U-T18
```

### P03 — Content model, evidence gate, feature flags
```text
1. Record: page, benefit, activity, OPC profile, partner story, FAQ, policy dengan state DRAFT/REVIEW/APPROVED/PUBLISHED/REVOKED.
2. Tiap klaim/aset publik: owner, source_ref, approved_version, izin publikasi, approved_at, expires_at.
3. Adapter konten sesuai D07; tanpa hardcode testimoni, jumlah anggota, status partner, saham, harga usulan.
4. Gate per JOIN_MODE dari operator, bukan query.
5. Seed sintetis private/noindex; record revoked tidak muncul di API, sitemap, frontend, cache.
6. Decision ledger LOCKED/SOURCE/PROPOSED/OPEN/APPROVED.
QA: U-T04, U-T05, U-T17
```

### P04 — Homepage U01–U04
```text
1. U01 shared nav; U02 hero OPC dengan copy kandidat D06 & CTA berdasarkan mode.
2. Definisi OPC: menjalankan bisnis satu orang dibantu sistem/AI/jejaring; bukan bentuk badan hukum.
3. U03 Why OPC & U04 empat pilar.
4. Benefit belum aktif dilabeli/disembunyikan; tanpa angka komunitas/partner/traction/revenue.
5. Visual jaringan = ilustrasi; teks & CTA terlihat tanpa animasi/JS.
6. Uji 320/768/1440, tab, H1, kontras, focus.
QA: U-T02, U-T03, U-T18
```

### P05 — Homepage U05–U10
```text
1. U05 discover → choose → consent → confirm → participate sesuai mode.
2. U06 aktivitas approved; kosong → empty editorial tanpa tanggal palsu.
3. U07 proof hanya berizin D08; nol → narasi kurasi.
4. U08 link EDU & Services resmi.
5. U09 widget join → implementasi aktif; jangan palsukan konfirmasi sebelum P10.
6. U10 FAQ, support, legal; state loading/error/retry; uji copy 3 mode.
QA: U-T03, U-T05, U-T06
```

### P06 — /about, FAQ, help
```text
1. /about: VIBOXS induk, Universe untuk OPC, apa yang tersedia di fase ini, operator valid.
2. Beda visitor, lead, applicant, member, OPC collaborator, selected venture partner.
3. FAQ per mode: biaya, status join, manfaat, consent, data, referral, pembayaran & cancel bila aktif.
4. /help & /contact dengan kanal terverifikasi; tanpa endpoint → tanpa tombol submit palsu.
5. Empty/error, metadata canonical, heading tidak duplikat Corporate.
6. Policy dari sumber approved saja.
QA: U-T01, U-T03, U-T09
```

### P07 — Benefits & versi policy
```text
1. /benefits dari registry BenefitRule: owner_domain, eligibility, capacity, validity, usage, terms_version, published_status.
2. Kelompok per pilar; filter hanya bila cukup banyak.
3. Status tersedia / perlu verifikasi / kuota habis / tidak tersedia; tanpa angka diskon belum sah.
4. Eligibility privat server-side.
5. Benefit EDU/Services → URL owner kanonis; tanpa checkout di Universe.
6. Benefit versioned tidak mengganti hak yang sudah diberikan tanpa aturan tercatat.
QA: U-T04, U-T12, U-T13
```

### P08 — Activities & RSVP
```text
1. /activities & /activities/[slug]: host, tanggal WIB, format, kapasitas, harga bila approved, terms batal.
2. Hanya PUBLISHED + approval owner; kosong → state U-T05.
3. Acara EDU → registrasi EDU kanonis.
4. Acara Universe → RSVP validasi server, kapasitas atomik, konfirmasi, cancel policy, dedupe.
5. Event belum disetujui tanpa tombol Daftar/Beli.
6. Test jadwal lewat, kuota penuh, edit host, timezone, deep link.
QA: U-T05, U-T07
```

### P09 — Join UX: tiga journey
```text
1. /join dengan tiga mode eksklusif dari server config.
2. Form minimum: nama, email; WhatsApp, tahap bisnis, minat opsional; field partner di /collaborate.
3. Marketing consent terpisah, default unchecked; versi privacy notice & tujuan.
4. Label, inline error, hint, loading/disabled, live region, autofill.
5. Pesan sukses per mode (§3); ACTIVE butuh bukti entitlement server.
6. Sebelum P10/P11/P13 → disable/fallback jujur.
QA: U-T06, U-T09, U-T10
```

### P10 — Interest lead persisten & consent
```text
1. POST /api/v1/join/interest: schema, normalisasi email, anti-spam, rate limit, CSRF bila cookie.
2. Simpan contact, UniverseLead, ConsentRecord transaksional/idempotent; unique key tidak memblokir update consent sah.
3. Reference ID acak tanpa PII / tanpa membocorkan keberadaan member; tidak ada entitlement dari interest.
4. CRM adapter + queue + fallback; lead primer tetap; retry tanpa duplikat.
5. Email hanya sandbox sebelum provider disahkan; gagal → ticket tetap tersedia.
6. Test submit konkuren, field invalid, timeout, 500, baca tak sah, opt-in false.
QA: U-T06, U-T07, U-T08, U-T09
```

### P11 — Application & approval manual
```text
1. JOIN_MODE=application: status RECEIVED/REVIEW/PENDING_APPROVAL/APPROVED/REJECTED/CANCELED.
2. Antrean admin RBAC, reviewer, catatan internal, alasan, template respons tanpa janji.
3. PENDING/APPROVED tidak otomatis ACTIVE.
4. Invite token single-use, expiry singkat, terikat penerima, tanpa PII di URL.
5. Notifikasi sesuai policy, sandbox, fallback manual.
6. Test review bersamaan, token reuse/expired, user salah, audit, anti enumerasi.
QA: U-T08, U-T10, U-T11
```

### P12 — Identity & role (opsional)
```text
1. Gate pada keputusan U-08 & ADR auth; belum approved → ADR + stub disabled.
2. Bila approved: identity yang bisa diaudit, verifikasi email, recovery aman, throttling login, MFA admin.
3. RBAC guest/member/community-operator/partner-manager/admin server-side.
4. Session host-only Secure/HttpOnly/SameSite; tanpa cookie .viboxs.com.
5. Expiry, logout, revoke all, redirect aman ke halaman tujuan (tanpa open redirect).
6. Test enumerasi, eskalasi hak, CSRF, brute-force, token expired, audit.
QA: U-T10, U-T11, U-T18
```

### P13 — Membership model & lifecycle
```text
1. Gate paket & harga pada U-02/U-03/U-05; Rp79.000/Rp699.000 hanya referensi.
2. MembershipPlan version, Member status, start/end, paid_through, cancel terms, owner, audit.
3. State machine §4 dengan guard server.
4. Pending ≠ Active; expired/revoked tidak dapat hak walau cache frontend lama.
5. Aktivasi dari approval manual atau paid order terverifikasi; bukan query/return URL.
6. Test UTC→WIB, batas expiry, suspension, canceled paid-through, retry-safe.
QA: U-T08, U-T10, U-T12, U-T13
```

### P14 — Paid membership (kondisional)
```text
1. PAYMENT_MODE=off → tanpa checkout/auto-renew; jalur interest/waitlist approved.
2. Bila approved: order dengan snapshot harga, terms, periode, consent recurring eksplisit; adapter server-only.
3. Return URL = pending; ACTIVE setelah signature & rekonsiliasi server.
4. Webhook: dedupe event ID, idempotency, bounded retry, audit+outbox, dead-letter.
5. Cancel, refund, chargeback, rekonsiliasi entitlement, akses sampai paid-through.
6. Test replay, signature diubah, callback telat, refund ganda, out-of-order; tanpa transaksi live.
QA: U-T10, U-T12, U-T13, U-T14
```

### P15 — Benefit engine & redemption
```text
1. BenefitRule: owner, eligibility, syarat aktivasi, terms version, expiry, quota, cap, metode redeem, approval.
2. Entitlement diverifikasi: ACTIVE/validity/suspension, jumlah pakai, scope.
3. /api/v1/benefits/eligibility & redemption server-side dengan authZ + token pendek bila ADR setuju.
4. Update atomik + unique redemption key; refund membatalkan hak sesuai kebijakan.
5. Tampilkan benefit yang bisa diklaim + alasan penolakan aman.
6. Test redeem bersamaan, kuota habis, expiry timezone, plan dicabut, user salah, sudah diredeem.
QA: U-T04, U-T12, U-T13, U-T15
```

### P16 — Member dashboard (kondisional)
```text
1. Gate /member pada MEMBER_MODE=on & P12–P15 diterima.
2. Panel My Status, Available Benefits, Upcoming Activities, Support, Profile & Privacy dari backend terotorisasi.
3. Masa aktif, tanggal renewal/cancel, benefit terpakai/sisa akurat.
4. State loading, no benefits, expired, suspended, payment pending, error, retry tanpa redirect loop.
5. Tanpa profiling AI tersembunyi.
6. Test URL langsung tak berhak, session basi, refresh, mobile, zoom 200%.
QA: U-T10, U-T12, U-T13, U-T18
```

### P17 — Bridge benefit Universe → EDU
```text
1. Baca kontrak D11 & envelope D07; adapter API versioned untuk eligibility.
2. Verifikasi identitas service-to-service, owner benefit, entitlement, eligibility produk, expiry, cap, anti replay.
3. Referensi opaque singkat, redemption idempotent; tanpa email/telepon di URL/analytics.
4. EDU down / API gagal → opsi standar + bantuan; tidak menerapkan diskon lokal.
5. Order EDU tetap kanonis; refund webhook → rekonsiliasi benefit.
6. Contract test lintas app, negative fail-closed, timeout/retry, audit.
QA: U-T04, U-T13, U-T15
```

### P18 — Handoff Universe → Services
```text
1. Pilar BUILD, help, CTA kontekstual → Services Start a Mission kanonis.
2. Hanya source=universe / intent non-sensitif; data pribadi butuh consent scoped + referral token backend.
3. Tidak ada quotation/harga/kontrak Services di Universe.
4. Cegah open redirect & referral palsu.
5. Services belum live → jalur resmi terverifikasi atau unavailable jujur.
6. Test tanpa consent, referral ganda, intent dicabut, tujuan rusak, back.
QA: U-T02, U-T16
```

### P19 — Direktori OPC & pencabutan izin
```text
1. Gate /partners pada izin D08 & DIRECTORY_MODE; tanpa profil berizin → empty state.
2. OPCProfile publik: approved_name, public_logo, category, use case, relationship_label, consent_scope/version, expires/revoked_at.
3. Tanpa kontak pribadi, kepemilikan saham, revenue, status invested/portfolio.
4. Workflow moderasi, penarikan consent, cache purge, revalidasi sitemap, 404/410.
5. Kanal koreksi/penarikan bagi pemilik profil; audit; catatan privat terpisah.
6. Test profil dicabut via URL/search/cache/CDN/OG, slug malformed.
QA: U-T05, U-T17
```

### P20 — Perkenalan dua pihak & matching manual
```text
1. Request perkenalan: kebutuhan minimum, tujuan data, target partner, consent pengirim.
2. Triage operator; partner menerima ringkasan tersanitasi, berhak terima/tolak.
3. Kontak dibuka setelah consent; tanpa broadcast massal.
4. Referral lifecycle §4 dengan audit.
5. Fee/komisi hanya bila perjanjian terverifikasi; bukan janji penghasilan.
6. Test tanpa consent, partner menolak, penerima salah, PII bocor, retry, withdrawal, duplikat.
QA: U-T16, U-T17
```

### P21 — /collaborate: screening & governance
```text
1. /collaborate dengan kriteria, disclaimer evaluasi, form terpisah dari /join.
2. Intake identitas usaha/produk/kebutuhan, kesiapan, situs/prototype opsional; tanpa data finansial berlebih.
3. Workflow internal §4.
4. Pilot/LOI, IP, privasi, ekonomi, saham = dokumen legal terpisah dengan RBAC.
5. Konfirmasi hanya "diterima untuk ditinjau"; tanpa janji modal/saham/revenue/deal.
6. Test isolasi hak, catatan rahasia, intake idempotent, handoff owner, approval manusia sebelum tahap legal.
QA: U-T09, U-T16
```

### P22 — Trust ops: moderasi, support, privasi, insiden
```text
1. Code of conduct approved, form laporan, triage spam/scam/pelecehan/doxing/penyalahgunaan.
2. Ticket ID, antrean operator, severity, keputusan, banding, audit.
3. Support: join gagal, sengketa billing, benefit ditolak, privasi akun, event batal, suspensi.
4. Hak akses, export/hapus data sesuai privacy & retensi yang disetujui legal.
5. Admin hanya melihat kasus sesuai role; pengiriman eksternal lewat gate sandbox/production.
6. Simulasi abuse burst, eskalasi tanpa respons, salah rute laporan, kebocoran data, incident response.
QA: U-T07, U-T11, U-T17
```

### P23 — SEO, analytics, motion premium, a11y, performa
```text
1. Metadata/canonical/OG/sitemap dari route published; /join, /member, alur privat noindex.
2. Event §6; klik ≠ revenue.
3. Analytics consent-aware tanpa PII; definisikan denominator funnel, rentang tanggal, atribusi.
4. Token D02 PROPOSED; dark-space/magenta/violet seperlunya; tanpa logo fiktif.
5. Animasi jaringan hero ilustratif + fallback SVG, reduced motion, keyboard, touch, tanpa scroll hijack.
6. Uji 320–1920, zoom 200%, WCAG 2.2 AA; CWV sebagai target.
QA: U-T03, U-T18, U-T19
```

### P24 — QA end-to-end, staged launch, rollback
```text
1. Jalankan U-T01..U-T20 dengan env/tanggal/commit/tester/artefak; NOT RUN ≠ PASS.
2. Contract test lintas domain Corporate/Services/EDU, persistence join, penanganan operator, benefit, takedown izin.
3. Pisahkan P0 public, P0+ satu partisipasi nyata, P1 paid/member/direktori, P2; aktifkan hanya yang lulus gate.
4. Header, secret scan, rate limit, authZ, restore backup dry-run, monitoring/alert, smoke staging, rollback.
5. Deploy/rollback per opsi hosting A Vercel / B hybrid / C VPS sesuai ADR; DNS DomaiNesia tidak berubah tanpa approval.
6. Release notes, go/no-go bertanda tangan, risk register, owner operasional, follow-up 24 jam/7 hari.
QA: U-T01..U-T20
```

---

## 8. QA — U-T01 s.d. U-T20 (default NOT RUN)

| ID | Skenario | Expected | Prompt |
|---|---|---|---|
| T01 | Direct entry / deep link | Tidak dipaksa lewat Corporate | P02, P24 |
| T02 | Brand shell | Logo/switcher/header/footer konsisten | P02, P24 |
| T03 | Hero OPC | Menjelaskan OPC & Universe tanpa ranking | P04, P23 |
| T04 | Benefit ownership | Satu owner, versi, status benar | P03, P07, P15 |
| T05 | Activity kosong | Tanpa event dummy | P05, P08 |
| T06 | Form join aksesibel | Error terbaca screen reader | P09 |
| T07 | Join tersimpan | Sukses setelah server menyimpan | P10 |
| T08 | Tanpa duplikat | Submit ulang tidak menggandakan | P10, P13 |
| T09 | Consent terpisah | Marketing ≠ privacy/terms | P09, P10 |
| T10 | Pending ≠ active | Pending tidak tampil sebagai member | P11, P13 |
| T11 | Non-enumeration | Login gagal tidak bocorkan keberadaan akun | P12 |
| T12 | Active rights | Hak & expiry sesuai entitlement server | P13, P15, P16 |
| T13 | Expired ditolak | Expired/revoked/suspended tidak bisa redeem | P13, P15 |
| T14 | Billing idempotent | Replay webhook tidak menggandakan hak | P14 |
| T15 | Bridge EDU aman | Gagal validasi → fallback aman | P17 |
| T16 | Handoff Services | Consent & owner terjaga | P18 |
| T17 | Hak partner | Profil tanpa izin tidak tampil (termasuk cache) | P19 |
| T18 | A11y responsif | Reduced motion, keyboard, touch, zoom 200% | P02, P23 |
| T19 | Staging checks | CWV & security terdokumentasi | P23, P24 |
| T20 | Launch integrity | DNS, rollback, redirect, monitor, backup, smoke | P24 |

## 9. Stop conditions
- Consent/privacy notice tidak ada → blokir koleksi lead publik.
- Benefit, plan, refund, merchant belum approved → blokir signup berbayar; tampilkan jalur alternatif jujur.
- Hak partner tidak ada → jangan render logo/nama/profil di route, sitemap, cache.
- E2E NOT RUN/FAIL → jangan sebut production-ready.
- Tidak ada pemindahan DNS DomaiNesia/Vercel ke VPS tanpa runbook D13 terpisah.

## 10. Keputusan terbuka
U-01 bentuk akses nyata 25 Des · U-02 mode join · U-03 harga & recurring · U-04 bonus 30/90 hari · U-05 benefit siap & kapasitas owner · U-06 aktivitas, host, jadwal · U-07 izin publikasi OPC · U-08 mode komunitas & kebutuhan akun · U-09 stack/auth/payment/CMS/CRM/hosting · U-10 conduct/privasi/refund/retensi · U-11 token, logo, copy final · U-12 definisi sukses & baseline · U-13 pemisahan member vs kolaborasi · U-14 DNS/Vercel/VPS.
