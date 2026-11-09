# Claude Code Brief — EDU (edu.viboxs.com)
**Prasyarat:** file 06 + `CLAUDE.md` · Shared shell D09/D10 · Desain: `docs/design/edu/`
**Sumber:** D05, D11 (21 prompt), D06 (kontrak benefit), D02, D07, D08 · **Scope:** `apps/edu` saja.

---

## 1. Ringkasan build

User-facing yang sederhana & premium, backend yang **benar-benar aman** untuk enrollment dan pembelian, deployment portabel.

EDU = pemilik katalog publik, sesi, harga, order, entitlement. Services = training custom. Universe = eligibility member. Corporate = orientasi.

> **Release control:** produk, harga, penyelenggara, jadwal, payment provider, privacy policy, token, dan benefit live **wajib approval**. Jangan proses pembayaran nyata tanpa sign-off.

## 2. Route & release

| Route | Release | Perilaku aman |
|---|---|---|
| `/` | R1 | E01–E09; empty state jujur bila katalog belum approved |
| `/programs`, `/programs/[slug]` | R1 | Hanya approved; draft/unknown → 404 asli |
| `/events`, `/events/[slug]` | R1 / R2 | Jadwal jujur; registrasi bila operasional |
| `/library`, `/library/[slug]` | R1 / R2 | File terlindungi dari R2 |
| `/checkout/[order]` | R2 | Status pending/paid dari server; tidak ada sukses via query |
| `/my-learning`, `/learn/[id]`, `/account` | R3 opsional | Hanya bila identity, entitlement, konten, recovery siap |
| `/corporate-training` | R1 | Referral ke Services /start |
| `/help`, `/faq`, `/contact`, `/policies/*` | R0/R1 | Policy nyata wajib sebelum R2 |

**Release gate:** R0 foundation · R1 public discovery · R2 commerce · R3 learning access · R4 Universe benefit · R5 optimization.

## 3. Entitas & invarian

| Entitas | Field penting | Invarian keras |
|---|---|---|
| Program / DigitalProduct | id, slug, format, audience, outcomes, prereq, agenda, inclusion, accessLength, visibility, organizer, instructorConsentRef, priceRuleId, policyRef, evidenceRef, version, publishedAt | DRAFT/hidden tidak pernah publik |
| ProgramSession | startAt ISO+zone, endAt, status, capacity, held, confirmed, location | Tidak ada upcoming basi, tidak oversell |
| PriceRule | id, currency (IDR), base, promo, validity, approvedBy | Snapshot harga server-only saat order dibuat |
| Order / OrderItem | opaque ID, items, amount, policyVersion, state | Client tidak mengontrol amount atau set PAID |
| PaymentEvent | provider event ID, signature valid, dedupe | Event terverifikasi berefek PAID **sekali** |
| Enrollment / Entitlement | product/session, person ref, status, expiry | Satu hak per pembelian eligible |
| DeliveryAttempt / AccessToken | expiry, scoped token, status email/retry | File privat tidak pernah world-readable |
| UniverseBenefitRedemption | rule version, validation ref, state | Boolean/query param ≠ entitlement |
| Consent / Audit | purpose, timestamp, actor | Tanpa PII di telemetri |

### Status editorial
`DRAFT → REVIEW → APPROVED → PUBLISHED → ARCHIVED`. Item berbayar tidak bisa dipublish tanpa price, schedule, license, claims, merchant, delivery yang valid.

### Status sesi
`DRAFT · ANNOUNCED · OPEN · FULL · CLOSED · RESCHEDULED · CANCELLED · COMPLETED`.

### State order
| State | Aksi | Gagal |
|---|---|---|
| DRAFT_ORDER | Item, harga, kuota dicek; order ID dibuat | Seat tidak di-reserve tanpa expiry |
| DETAILS_ENTERED | Nama/email minimal; consent wajib vs marketing | Validasi & simpan tanpa bocor |
| PAYMENT_PENDING | Instruksi gateway; total & expiry jelas | Refresh tidak membuat order ganda |
| PAYMENT_CONFIRMED | Server verifikasi webhook, amount, currency, product | Callback browser berbeda → pakai server truth |
| FULFILLED | Seat/entitlement terbit, email terkirim, log | Retry idempotent bila email gagal |
| FAILED / EXPIRED | Status, seat dikembalikan | Retry tanpa double charge |
| REFUND / REVOKED | Rekonsiliasi akses & bukti refund | Audit trail tidak dihapus |

**Jalur berbayar yang sah:** Approved product → Order draft → Price snapshot + inventory hold → Payment pending → **Signed webhook verification** → PAID reconciliation → **exactly-one fulfillment** → receipt/akses. Redirect browser hanya informasional.

**Jalur gratis:** Sesi OPEN approved → registrasi minimal + consent → commit seat atomik → `FREE_CONFIRMED` + joining details. **Tidak pernah** membuat status PAID.

## 4. Larangan seed
- Grand Academy **bukan** event confirmed.
- Harga mini/full e-book (Rp79.000/Rp199.000) & Grand Academy (Rp99–100rb) = PRICE HOLD.
- Sertifikat tidak otomatis aktif.
- Bonus member 30/90 hari tidak diimplementasikan sebagai hak live.

## 5. Analytics allowlist
`edu_program_impression` · `edu_program_view` · `edu_search(result_count)` · `edu_filter_select` · `edu_register_start` · `edu_checkout_start` · `edu_payment_confirmed` (server truth) · `edu_fulfillment_done` · `edu_access_problem` · `edu_cross_domain_click` · `edu_session_attended` · `edu_refund_complete`. Tanpa email, raw search PII, nama, token pembayaran, path file privat.

---

## 6. Tahap build (P00–P20)

| Grup | Prompt | Gate |
|---|---|---|
| Foundation & content | P00–P03 | R0 |
| Public discovery | P04–P09 | R1 |
| Commerce + access | P10–P14 | R2, R3 kondisional |
| Benefit & operations | P15–P18 | R4 |
| Final UX & QA | P19–P20 | R5 |

### P00 — Audit repo & ADR EDU
```text
1. Audit git, branch, package manager, lockfile, apps/packages, env example, test, referensi host EDU, CMS, auth, payment, mailing. Tanpa secret.
2. Bandingkan dengan D01/D02/D05/D06/D07/D08 & shared D09–D10; mana yang nyata vs rencana.
3. docs/qa/edu-baseline.md: route, dependency, URL lama, owner data, status provider, konten approved, selisih dokumen vs kode.
4. ADR-edu-001.md: reuse vs scaffold, stack, checkout hosted vs internal, persistence, DB, mail, rollback (PROPOSED).
5. Matriks TC-E01..E18 → backlog; prioritas paid flow, privacy, akses, link lintas host.
6. Tanpa DNS cutover, email nyata, transaksi, baca data pelanggan, migrasi DB produksi.
QA: TC-E01, TC-E02
```

### P01 — Workspace, env bertipe, CI
```text
1. Ikuti ADR; scaffold apps/edu bila perlu, reuse packages.
2. Strict TS/schema, lint, format, unit, integration, e2e, typecheck, build, dependency audit, CI PR.
3. Env: EDU/CORPORATE/SERVICES/UNIVERSE_PUBLIC_ORIGIN, DATABASE_URL, CONTENT_MODE, PAYMENT_MODE, EMAIL_MODE, BENEFIT_MODE, FILE_DELIVERY_MODE, ANALYTICS_ENABLED.
4. Key provider, webhook secret, signing token, DB connection: server-only.
5. Pisah local/preview/staging/production; preview noindex, sandbox provider, dummy data.
6. Config fail-closed bila payment provider belum ada.
QA: TC-E01, TC-E18
```

### P02 — Shell EDU, switcher, route legal
```text
1. Reuse Header, Footer, EcosystemSwitcher, MobileNav, Button dari shared — tanpa fork.
2. Nav lokal: Programs, Events, Digital Library, For Teams, Help; link Corporate/Services/Universe via origin config + availability.
3. Skip link, focus management, Escape, aria-expanded, return focus, responsif.
4. /help, /faq, /contact + preview policies; produksi tidak mengumpulkan data/pembayaran tanpa privasi/terms/refund approved.
5. Host belum hidup → status jujur.
6. Indikator EDU aktif dalam satu sistem; tidak ada logo EDU palsu.
QA: TC-E01, TC-E02, TC-E15
```

### P03 — Model katalog kanonis & editorial workflow
```text
1. Entitas: Program, ProgramSession, DigitalProduct, PriceRule, PolicyVersion, Instructor, Asset, EditorialApproval, PublicationEvent.
2. Field minimum program (§3).
3. State editorial + hard validation sebelum item berbayar dipublish.
4. Adapter katalog read-only (CMS/DB/fixtures) dengan validasi; fixtures hanya preview & berlabel.
5. Slug stabil; 404 untuk unknown/unpublished; noindex & keluar sitemap untuk draft; audit publish/withdraw.
6. Jangan seed Grand Academy, harga historis, sertifikat.
QA: TC-E03, TC-E05
```

### P04 — Homepage E01–E04
```text
1. E01 header, E02 hero (copy PROPOSED), CTA Jelajahi Program & Lihat Jadwal.
2. E03 learning paths Start with AI / Build Your Business / Work & Career sebagai filter, bukan jalur bersertifikat.
3. E04 3–6 kartu PUBLISHED nyata: title, format, audience, harga atau Gratis, tanggal bila live, CTA status-aware.
4. Tidak ada produk approved → empty state layak; tanpa kartu fiktif, countdown, statistik.
5. Hero & CTA terlihat tanpa JS.
6. Screenshot 320/768/1440, tab order, no overflow.
QA: TC-E01, TC-E04, TC-E15
```

### P05 — Homepage E05–E09
```text
1. E05 format chooser; CTA beli/daftar hanya untuk format dengan produk valid.
2. E06 upcoming dari sumber yang sama dengan /events; WIB, status otomatis, tanpa hardcode.
3. E07 alur free vs paid.
4. E08 trust modules dari D08 approved; bridge Universe & Services.
5. E09 final CTA & footer.
6. Empty/loading/partial outage + teks setara untuk visual.
QA: TC-E01, TC-E02, TC-E06
```

### P06 — Discovery: search, filter, sort
```text
1. /programs: full-text aman (judul/ringkasan/tag), filter format/topik/free-paid/upcoming, sort relevansi/tanggal.
2. Query params via allowlist; URL shareable; back/forward menjaga filter & paginasi.
3. Hanya PUBLISHED; event lampau/penuh tidak OPEN.
4. Loading, gagal jaringan, no result, reset, jumlah hasil diumumkan.
5. Canonical list utama; jangan indeks kombinasi filter.
6. Test query valid/malformed, keyboard, paginasi, async failure, katalog kosong.
QA: TC-E03, TC-E04, TC-E16
```

### P07 — Template detail 14 blok
```text
1. /programs/[slug] dengan 14 blok D05 (lihat 04_DESIGN_EDU §6).
2. Blok tak relevan disembunyikan; tanpa lorem ipsum/sertifikat.
3. CTA state announced/open/full/closed/cancelled/completed; beda free vs paid.
4. Harga dari PriceRule approved (id/version); total & terms.
5. Deep link dari Universe/Corporate aman; atribusi tanpa identitas.
6. Test draft, approved, past, tanpa price, tanpa policy, tanpa license → paid CTA fail-closed.
QA: TC-E05, TC-E06, TC-E14
```

### P08 — Digital library & e-book
```text
1. /library & /library/[slug]: cover, format, ringkasan, versi, daftar isi, license, validity, preview berizin, support.
2. File berbayar tidak di public asset/static/OG/search/CDN publik.
3. Storage adapter + private object key; preview publik hanya sampel rights-cleared.
4. Harga via price rule; aset punya provenance, rights, checksum di D08.
5. State link expired, file korup, format tidak didukung, akses kedaluwarsa, hubungi bantuan.
6. Test file tak approved, reachability publik, license, fallback artwork.
QA: TC-E05, TC-E12, TC-E13
```

### P09 — Live events: sesi, seat, perubahan jadwal
```text
1. /events & /events/[slug] dengan status sesi (§3), terpisah dari entitas produk.
2. Timestamp ISO + timezone; UI Asia/Jakarta (WIB), durasi, format, venue/link, consent fasilitator.
3. Seat terbatas: hold/decrement atomik + TTL; jangan percaya angka seat dari client; uji konkurensi.
4. Tanggal lewat tidak upcoming/dapat dibeli; reschedule/cancel memicu state peserta & notifikasi.
5. Link meeting hanya untuk registran sah; tidak publish partner/tanggal belum confirmed.
6. Test batas timezone, dua request seat terakhir bersamaan, past, rescheduled, cancelled, null schedule.
QA: TC-E06, TC-E11, TC-E18
```

### P10 — Registrasi gratis & konfirmasi
```text
1. Guest registration untuk sesi gratis OPEN: nama/email minimal; terms & marketing terpisah.
2. Validasi server, anti-spam, rate limit, dedupe event+kontak; referensi opaque.
3. Seat atomik + idempotency key + recovery hold kedaluwarsa.
4. Konfirmasi + email antrean berisi instruksi nyata hanya saat sesi confirmed; fallback support.
5. Tidak membuat PAID; attendance terpisah dari registrasi.
6. Test re-registrasi, retry, typo email, export consent, notifikasi operator, audit.
QA: TC-E07, TC-E06, TC-E17
```

### P11 — Order berbayar, snapshot harga, hold inventori
```text
1. Endpoint create-order server-only: cek status published, price rule aktif, pajak/biaya, promo, terms, inventori.
2. Snapshot price/currency/items/policyVersion/fulfillment; order ID opaque + idempotency key; tanpa amount dari client.
3. Tabel minimum: order, order_item, payment_attempt, inventory_hold, consent_log, audit_log; migrasi reversible.
4. Transisi DRAFT_ORDER/DETAILS_ENTERED/PAYMENT_PENDING/EXPIRED/FAILED; hold kedaluwarsa deterministik.
5. Provider/merchant/policy/harga OPEN → preview fixture saja; tanpa tombol bayar nyata / checkout palsu.
6. Test param harga diedit, harga basi, promo expired, seat terakhir bersamaan, double click, refresh.
QA: TC-E05, TC-E09, TC-E10
```

### P12 — Payment adapter, webhook, rekonsiliasi
```text
1. Interface payment provider-agnostic + mode sandbox; vendor nyata hanya setelah approval.
2. Webhook: verifikasi raw payload signature/timestamp, keunikan event ID, order ref, currency, amount persis; tolak forged/replay/mismatch.
3. Simpan metadata event + state order atomik dengan event ledger unik; bounded retry + dead-letter.
4. Return page membaca status order dari server; tidak upgrade ke PAID dari query/localStorage/email.
5. Rekonsiliasi transaksi pending; chargeback, partial refund, refund, timeout sesuai policy.
6. Test bayar normal, webhook 3x, out-of-order, provider down, signature salah, amount/currency salah, order hilang.
QA: TC-E08, TC-E09, TC-E10, TC-E18
```

### P13 — Fulfillment: receipt, tiket, entitlement, file privat
```text
1. PAID terverifikasi (atau FREE confirmed) → satu fulfillment per item; unique constraint.
2. Outbox email transaksional, retry bounded, status tersanitasi, resend manual oleh operator.
3. File digital: signed download token singkat, lookup akses di server, expiry/revocation.
4. Email gagal tidak menghilangkan pembelian: order PAID, entitlement tetap; recovery support, tanpa double charge.
5. Lookup status order via verifikasi email/akun, tidak via ID tebakan.
6. Refund/revoke sync sesuai policy, audit dipertahankan.
QA: TC-E08, TC-E10, TC-E12, TC-E18
```

### P14 — My Learning & lesson viewer (kondisional)
```text
1. Gate /my-learning, /account, /learn/[id]; tanpa LMS approved → unavailable jujur / 404.
2. Bila aktif: verifikasi identitas, session host-only, entitlement per produk/lesson server-side, delivery bertanda tangan, revoke multi-device.
3. Schema lesson: lessonId, contentVersion, completion rule, access expiry, izin media; tanpa progres otomatis.
4. Assessment, sertifikat, caption, transkrip hanya bila aset approved.
5. Recovery akun, reissue link, notice expired, export/hapus data.
6. Test akses user lain, expired, akun dihapus, deep link, keyboard, bandwidth rendah.
QA: TC-E12, TC-E13, TC-E15
```

### P15 — Benefit Universe: handshake & redemption
```text
1. EDU pemilik produk/harga/order; Universe pemilik aturan eligibility. Referrer URL hanya atribusi non-sensitif.
2. Token benefit opaque bertanda tangan diverifikasi server-to-server, terikat program/identitas/expiry/ruleVersion; abaikan ?discount atau ?member=true.
3. Redemption idempotent; eligibility ditentukan sebelum snapshot order; tampilkan harga normal bila invalid.
4. Cegah stacking promo terlarang, redeem berulang, akses ganda; refund/cancel merekonsiliasi.
5. Bonus 30/90 hari & harga membership tidak live sampai D06 + owner approve.
6. Test token valid/invalid/expired/replay, consent, selisih harga, Universe down, minimisasi data member.
QA: TC-E14, TC-E17, TC-E18
```

### P16 — Handoff training korporat & support
```text
1. /corporate-training: beda kelas publik vs training custom; CTA → Services /start (intent=training).
2. Referral hanya source/intent non-PII; Services pemilik lead & proposal.
3. /help, /faq, /contact: tiket hilang, email gagal, file salah, reschedule/cancel, status refund, koreksi nama.
4. Support intake durable + akses operator per role; tidak bocor order/email via GET/analytics.
5. Escalation path; SLA hanya bila disetujui.
6. Test back-navigation, atribusi korporat, recovery, masking PII, anti-spam, dedupe.
QA: TC-E02, TC-E17, TC-E18
```

### P17 — Kontrol operator, refund, audit
```text
1. Role content editor, EDU operator, finance reviewer, platform admin; otorisasi server (matriks D07).
2. Approval change-set untuk program, hak media, consent instruktur, harga, jadwal, refund policy, perjanjian partner; audit siapa/apa/kapan.
3. Panel/script operator: preview publikasi, reschedule/cancel, request refund, resend entitlement, rekonsiliasi, takedown.
4. Refund server-enforced dengan policy versioned; bukan dari klik frontend.
5. Least privilege, masking PII; override manual wajib alasan, aktor, timestamp.
6. Pentest akses, test change-log, rollback edit sesi dengan booking aktif.
QA: TC-E03, TC-E11, TC-E18
```

### P18 — SEO, analytics, consent, data governance
```text
1. Title/description kanonis; noindex untuk preview, draft, lesson, file privat, permutasi filter.
2. Structured data Event hanya untuk konten nyata dengan tanggal & status benar.
3. Event allowlist §5.
4. Tanpa email, raw search PII, nama, token, path privat di URL/analytics/error trace.
5. Consent esensial vs marketing/analytics terpisah.
6. Test opt-out, logging tanpa PII, sitemap tanpa unpublished, duplikasi event order, atribusi.
QA: TC-E03, TC-E17
```

### P19 — Motion, aksesibilitas, performa mobile
```text
1. Token D02 hanya bila approved; selain itu variabel replaceable + catat gap.
2. Transisi learning path, hover/focus kartu, diagram hero, timeline event, state checkout; animasi tidak menghalangi harga/ketersediaan.
3. Reduced motion, visual statis, tanpa custom cursor di touch, tanpa hover-only.
4. Heading, label, error diumumkan, kontras, zoom 200%, 320px, keyboard-only.
5. Uji Android low-end & jaringan throttled; ukur LCP/INP/CLS di staging.
6. Optimasi gambar, prioritas hero, reserve dimensi, bundle JS kecil.
QA: TC-E15, TC-E16
```

### P20 — Full acceptance, staged release, rollback
```text
1. Petakan TC-E01..E18 ke tes otomatis/manual; jalankan di preview/staging dengan fixture tersanitasi; catat langkah, expected/actual, bukti, reviewer.
2. Failure injection: webhook ganda, provider down, mail down, link dicabut, learner tak berhak, token Universe invalid, event expired, refund.
3. Keamanan, consent, CSP/secret scan, a11y, SEO, analytics, noindex preview, backup & restore drill.
4. Publish preview/staging saja; tanpa perubahan DNS DomaiNesia / Vercel prod / VPS.
5. Runbook rilis dengan flag R0–R5, sign-off, snapshot migrasi, monitoring, rollback, smoke, rekonsiliasi.
6. docs/qa/edu-release-report.md: status per tes, keputusan APPROVED vs OPEN, bukti, file berubah.
ACCEPTANCE: transaksi berbayar produksi tetap OFF sampai approval legal/payment/ops.
QA: TC-E01..TC-E18
```

---

## 7. QA — TC-E01 s.d. TC-E18 (default NOT RUN)

| ID | Tes | Bukti yang diharapkan | Prompt |
|---|---|---|---|
| E01 | Akses langsung EDU | Shell, EDU aktif, CTA/route nyata | P02, P04 |
| E02 | Handoff lintas domain | Route benar; back navigation | P02, P16 |
| E03 | Program draft/hidden | Tidak di katalog, sitemap, route, API | P03, P06 |
| E04 | Search/filter/empty | Relevan, shareable, reset keyboard | P06 |
| E05 | Detail berbayar | Harga total, format, terms, owner, akses | P07, P08, P11 |
| E06 | Event lewat/penuh | Checkout tertutup; status benar | P09 |
| E07 | Registrasi gratis | Konfirmasi tanpa status paid; 1 seat | P10 |
| E08 | Checkout terverifikasi | Server verified → 1 entitlement & receipt | P12, P13 |
| E09 | Payment pending/expired | Tanpa sukses palsu; retry aman | P11, P12 |
| E10 | Webhook ganda/terlambat | Exactly-once | P12, P13 |
| E11 | Refund/cancel/reschedule | Policy, komunikasi, rekonsiliasi, audit | P09, P17 |
| E12 | Link download invalid/expired | Tidak bocor; recovery | P08, P13 |
| E13 | My Learning tak berhak | Tidak ada akses lintas user | P14 |
| E14 | Benefit Universe valid/invalid | Hanya entitlement terverifikasi mengubah harga | P15 |
| E15 | Reduced motion/keyboard/SR | Fungsi setara | P02, P19 |
| E16 | Mobile low-end/jaringan lambat | Terbaca & pulih | P06, P19 |
| E17 | Consent, analytics, privasi | Tanpa PII di URL/event | P10, P18 |
| E18 | Outage, email gagal, rollback | Pembelian tidak hilang; operator bisa pulihkan | P12, P13, P20 |

## 8. Keputusan terbuka
EDU-01 logo & token · 02 produk digital, file, harga, hak jual · 03 jadwal, fasilitator, seat, rekaman · 04 gateway, merchant of record, refund, invoice/pajak · 05 CMS/DB/mail/storage · 06 My Learning/identity/LMS/SSO · 07 benefit Universe & stacking · 08 hak Grand Academy/partner (RESTRICTED) · 09 Indonesia vs bilingual · 10 sertifikat & issuer · 11 harga training custom tetap di Services (LOCKED) · 12 domain & VPS.
