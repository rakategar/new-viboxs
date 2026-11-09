# Claude Code Brief — Foundation & Monorepo (semua website)
**Untuk:** Claude Code · **Baca pertama kali sebelum file 07–10**
**Sumber:** D07 Technical Architecture, D01, D08, D13, D14, pola D09–D12
**Status:** arsitektur = RECOMMENDED/PROPOSED, dikunci lewat ADR setelah audit repo (P00).

---

## 0. Cara memakai file ini di Claude Code

1. Taruh di repo:
   ```
   docs/reference/   ← D01–D14 asli (PDF) + 4 Codex Prompt Pack .md
   docs/handoff/     ← file 00–10 dari paket ini
   docs/design/      ← export / link hasil Claude Design
   ```
2. Salin **§10 CLAUDE.md** ke root repo sebagai `CLAUDE.md`.
3. Jalankan tahap per app sesuai file 07–10. **Satu tahap per prompt.** Jangan pernah meminta "bangun semua".
4. Setelah tiap tahap: review diff → jalankan test → catat QA → commit → baru tahap berikutnya.

---

## 1. Peta sistem

```
                    viboxs.com  (Corporate: identitas + router)
                         │
     ┌───────────────────┼────────────────────┐
     ▼                   ▼                    ▼
services.viboxs.com   edu.viboxs.com     universe.viboxs.com
lead & proposal       katalog, order,    OPC, join, member,
                      entitlement        benefit, kolaborasi
     └──────── shared UI shell · tokens · contracts ────────┘
```

| Host | Pemilik kanonis | CTA utama | TIDAK boleh |
|---|---|---|---|
| viboxs.com | Profil, /work terverifikasi, routing, kontak umum | Jelajahi destinasi / kontak | Checkout, portal member, intake Services kedua |
| services.viboxs.com | 5 layanan, lead, scoping/proposal | Start a Mission | Checkout harga proyek custom, katalog kelas publik |
| edu.viboxs.com | Program, sesi, order, entitlement belajar | Lihat / daftar / beli | Proposal training custom (→ Services), status membership |
| universe.viboxs.com | Join state, benefit, aktivitas, direktori | Daftar minat / apply / akses | Checkout EDU, quotation Services, janji equity |

**Subdomain adalah tujuan aplikasi, bukan entitas hukum.** Setiap host bisa diakses langsung tanpa melewati Corporate.

---

## 2. Organisasi kode (RECOMMENDED — ADR-01)

Opsi B dari D07: **monorepo, 4 app terpisah deploy, paket bersama.**

```
viboxs-digital/
├── apps/
│   ├── corporate/        # viboxs.com
│   ├── services/         # services.viboxs.com
│   ├── edu/              # edu.viboxs.com
│   └── universe/         # universe.viboxs.com
├── packages/
│   ├── design-tokens/    # dari 01_SHARED_DESIGN_SYSTEM (PROPOSED)
│   ├── ui/               # Header, Footer, EcosystemSwitcher, MobileDrawer, Button, Card, Form...
│   ├── contracts/        # typed API, event envelope, origin config, enums status
│   ├── content-models/   # schema konten + publication gate (D08)
│   ├── observability/    # analytics allowlist + logger redaksi PII
│   └── config/           # tsconfig, eslint, prettier, test, env schema
├── services/             # OPSIONAL bila dibenarkan (worker/queue)
├── integrations/         # adapter server-side: payment, CRM, mail, storage
├── infrastructure/       # dokumentasi DNS, CI/CD, runbook (tanpa ubah produksi)
├── docs/
│   ├── reference/  handoff/  design/
│   ├── decisions/        # ADR-*.md
│   ├── qa/               # evidence ledger per app
│   └── verification/
└── tests/                # e2e lintas host
```

**Stack baseline (CONDITIONAL — ADR-02):** Next.js App Router + TypeScript strict, pnpm workspace (atau package manager existing), CSS variables + CSS Modules (atau satu sistem utility yang disetujui — jangan campur dua), Zod untuk schema, Vitest + Playwright + axe untuk test. Jika repo existing berbeda, **jangan rewrite** hanya demi mengikuti rekomendasi — buat ADR.

**Data (ADR-04):** evaluasi PostgreSQL terkelola + object storage privat. Content (ADR-05): file konten bertipe di repo untuk fase awal; CMS boleh menyusul lewat adapter.

**Hosting (ADR-03):** Vercel (kondisi saat ini, dilaporkan user) boleh tetap. VPS hanya setelah TCO & kapasitas operasional terbukti. **Registrar DomaiNesia tidak perlu dipindah.** Kode harus portabel: business logic terpisah dari API khusus platform, ada health endpoint, start/build command standar.

---

## 3. Environment & config

```bash
# .env.example — NAMA saja, tanpa nilai rahasia
CORPORATE_PUBLIC_ORIGIN=https://www.viboxs.com      # canonical www vs apex OPEN (ADR-10)
SERVICES_PUBLIC_ORIGIN=https://services.viboxs.com
EDU_PUBLIC_ORIGIN=https://edu.viboxs.com
UNIVERSE_PUBLIC_ORIGIN=https://universe.viboxs.com
APP_ENV=local|preview|staging|production
DATABASE_URL=                     # server-only

# Feature flags — default OFF, fail-closed
CONTACT_FORM_ENABLED=false        # corporate
CASE_STUDIES_ENABLED=false        # corporate + services
INTAKE_ENABLED=false              # services
PROOF_ENABLED=false               # services
CRM_ADAPTER_MODE=stub|sandbox|live
CONTENT_MODE=fixtures|repo|cms
PAYMENT_MODE=off|sandbox|live     # edu, universe
EMAIL_MODE=off|sandbox|live
BENEFIT_MODE=off|sandbox|live
FILE_DELIVERY_MODE=off|signed
JOIN_MODE=interest|application|member_active   # universe — dari server config, bukan query
MEMBER_MODE=off|on
DIRECTORY_MODE=off|on
ACTIVITY_MODE=off|on
ANALYTICS_ENABLED=false
```

Aturan:
- Env tervalidasi saat boot (Zod); nilai salah → gagal dengan pesan jelas.
- **Variabel yang dibundel ke browser bersifat publik.** Service key, payment signing secret, DB credential **hanya server**.
- Preview/staging: `noindex`, sandbox provider, data sintetis berlabel.
- **Build preflight:** deploy production gagal jika fitur pengumpul data ON tapi privacy notice belum `APPROVED`.

### Origin config (packages/contracts)
```ts
type DestinationKey = 'corporate' | 'services' | 'edu' | 'universe';
type DestinationStatus = 'live' | 'preview' | 'disabled';
interface Destination {
  key: DestinationKey;
  label: string;            // "Universe"
  descriptor: string;       // "Komunitas OPC"
  origin: string;           // dari env, tervalidasi
  status: DestinationStatus;
  lastVerifiedAt?: string;
}
```
Semua link lintas host dibaca dari sini. Status `disabled` → UI "Sedang disiapkan", bukan link mati. Tidak ada URL hardcode.

---

## 4. Status & publication gate (D08)

```ts
type PublicationState = 'draft' | 'review' | 'approved' | 'published' | 'revoked' | 'expired';
type DecisionLabel = 'LOCKED' | 'SOURCE' | 'PROPOSED' | 'OPEN' | 'APPROVED';
type AvailabilityBadge = 'available' | 'pilot' | 'coming_soon' | 'interest_only' | 'full' | 'closed';

interface PublishableRecord {
  id: string;
  status: PublicationState;
  sourceRefs: string[];        // misal ['D08:C-27', 'D04:§11']
  approvalVersion?: string;
  approvedBy?: string;
  approvedAt?: string;
  reviewDueAt?: string;
  expiresAt?: string;
}
```

**Render gate:** frontend hanya merender record `approved`/`published` yang belum expired. `draft`, `revoked`, `restricted` **gagal tertutup** — tidak muncul di halaman, API publik, sitemap, OG, atau cache, walau ID-nya valid. Build gagal jika record `published` tanpa `sourceRefs` + approval.

### Klaim yang diblokir (D08) — jangan pernah di-seed sebagai konten publik
C-06 "#1 OPC" · C-07 investor/didanai · C-08 nama bank/klien · C-11 Juragan "produksi tanpa kendala" · C-12 GPS/IoT produk aktif · C-14 Grand Academy diluncurkan · C-15/16/17 harga (HOLD) · C-18 equity untuk member · C-20 testimoni · C-21 statistik member/revenue · C-22 target cash-in · C-24 endorsement pemerintah · C-25 sertifikasi · C-31 "100% aman" · C-34 "komunitas besar".

---

## 5. Data model logis lintas domain (D07 §7, PROPOSED)

| Entitas | Pemilik | Field minimum |
|---|---|---|
| `contact` | Core/consent | id, email_verified, phone_optional, created_at |
| `consent_record` | Core/privacy | contact_id, purpose, notice_version, choice, timestamp, source |
| `lead_request` | Services | id, contact_id, source_host, intent, owner_line, status |
| `services_brief` | Services | request_id, needs, qualification, owner_assignee |
| `program` / `session` | EDU | id, format, published_status, schedule, fulfillment_type |
| `product_offer` / `price` | EDU atau Universe | id, product_id, currency, amount, active_from/to |
| `order` | EDU atau Universe | id, contact_id, line, amount_snapshot, state, created_at |
| `payment_event` | Finance/integration | provider_event_id, order_id, signature_check, processed_at |
| `entitlement` | Lini pemilik produk | id, contact_id, resource_id, state, start, expiry |
| `membership` | Universe | id, contact_id, plan_id, state, paid_through |
| `benefit_rule` / `redemption` | Universe + EDU | rule_id, eligibility, validation_ref, redemption_state |
| `community_profile` | Universe | id, member_id, visibility, publication_approval |
| `collaboration_request` | Universe | id, requesting_member, consent, status, handler |
| `audit` / `outbox` | Core/ops | event_id, actor, action, entity_ref, timestamp, outcome |

Prinsip:
- ID stabil (UUID), timestamp UTC timezone-aware; UI tampil WIB (Asia/Jakarta).
- Order menyimpan **snapshot** harga/paket/ketentuan saat transaksi.
- Consent per tujuan + versi notice; marketing tidak disimpulkan dari pembelian/membership.
- Satu orang bisa jadi lead Services, pembeli EDU, member Universe — **status tidak saling menimpa**, dan role satu lini tidak otomatis membaca data lini lain.

---

## 6. Kontrak integrasi

### Event envelope (ilustratif)
```json
{
  "event_id": "uuid",
  "event_type": "edu.order.paid.v1",
  "occurred_at": "2026-11-05T00:00:00Z",
  "source": "edu",
  "subject_ref": "opaque-id",
  "correlation_id": "uuid",
  "schema_version": 1,
  "data": { "order_id": "uuid", "status": "PAID" }
}
```
Event yang disarankan: `service_lead_created`, `enrollment_confirmed`, `order_paid_verified`, `entitlement_granted`, `member_application_submitted`, `membership_activated_verified`, `benefit_redeemed`, `cross_domain_referral`. **Belum ada yang deployed.** Tidak ada email/telepon/secret di event analytics.

### Handoff lintas host
| Dari → Ke | Kontrak |
|---|---|
| Corporate → Services | Deep link + source tag non-sensitif; kategori terpilih di /start |
| Corporate → EDU | Link program/index kanonis; tidak menyalin harga |
| Corporate → Universe | Ke landing/join; tidak menjamin membership |
| Universe → EDU | Benefit diverifikasi **server-to-server** dengan token opaque bertanda tangan, bukan `?discount=` |
| Universe → Services | Atribusi referral + intake nyata di Services |
| Services → EDU | Ke program publik approved |
| EDU → Services | Training custom → lead Services (`intent=training`) |

### Reliability
| Area | Aturan |
|---|---|
| API version | `/api/v1/...`; tidak ada breaking change diam-diam |
| Idempotency | Webhook/fulfillment dedupe via provider event ID / order ID — kirim ulang 3× = 1 entitlement |
| Retry | Bounded + exponential backoff; dead-letter untuk error permanen |
| Outbox | Event domain ditulis dalam transaksi yang sama dengan record bisnis |
| Validation | Schema di server; CSRF bila cookie-based; authZ per resource |
| Rate limit | Per endpoint publik + anti-bot form |
| Error contract | Kode stabil: `unauthorized`, `forbidden`, `conflict`, `unavailable`, `RATE_LIMITED`, `TEMPORARY_ERROR`; tanpa stack trace |

### Invarian data (D14 §10)
- Record bisnis primer **tersimpan durable sebelum** UI menampilkan sukses.
- CRM/email bersifat downstream; gagal sync tidak menghapus lead primer.
- "Paid" hanya dari event provider terverifikasi + ledger; **tidak pernah** dari query param / halaman sukses.
- Shared design ≠ shared session.

---

## 7. Identitas & sesi (ADR-06)

- **Tidak ada SSO di peluncuran.** Halaman marketing, lead, registrasi webinar, beli e-book sekali → guest + verifikasi email cukup.
- Akun hanya bila produk butuh akses berulang (My Learning, member area).
- **Jangan** pakai cookie `Domain=.viboxs.com`. Session host-only: `__Host-` prefix, `Secure`, `HttpOnly`, `SameSite` sesuai, `Path=/`.
- MFA untuk admin; otorisasi selalu server-side, bukan flag frontend atau domain email.

### Matriks role (D07)
| Role | Corporate | Services | EDU | Universe |
|---|---|---|---|---|
| Public visitor | Read | Read + submit | Read + guest buy | Read + apply |
| Content editor | Konten approved | Offer approved | Program approved | Halaman komunitas approved |
| Sales operator | — | Lead yang ditugaskan saja | Handoff training custom saja | Inquiry partner approved |
| EDU operator | Tanpa data pembeli | Tanpa CRM luas | Order, akses, sesi | Cek eligibility saja |
| Universe admin | Tanpa data pembeli | Status referral saja | Validasi benefit saja | Membership & moderasi |
| Platform admin | Teknis sesuai kebutuhan | Role-controlled | Role-controlled | Role-controlled |

---

## 8. Keamanan, privasi, observability

- Validasi input server, parameterized query, encoding output, CSP, CORS allowlist ketat.
- Secret scanning di CI, dependency audit, lockfile terjaga.
- Logger dengan redaksi: **tidak ada** isi brief, email, telepon, token, payload form di log/analytics/error tracker.
- Tidak ada PII di URL/query string.
- Privacy notice sesuai UU 27/2022 — **ditulis & di-review pihak hukum**, bukan dikarang AI. Teks policy dimuat dari registry; default `UNAPPROVED`.
- Analytics: allowlist event, default OFF, consent-aware. Tidak ada cross-host identity tracking otomatis.
- Alert untuk: webhook gagal, retry queue naik, anomali auth, lonjakan 5xx, TLS expiry, backup gagal.
- Backup DB harian + restore drill. Target awal usulan: RPO ≤ 24 jam konten non-kritis, RTO ≤ 8 jam halaman publik; order/payment lebih ketat.

---

## 9. CI quality gates (D07/D13 G01–G08)

| Gate | Wajib lulus |
|---|---|
| G01 Contract | Typecheck, schema, API test, backward compat |
| G02 Security | Secret scan, authZ test, webhook signature, dependency |
| G03 Visual | Token D02, 320px/desktop, focus, kontras, reduced motion, screenshot |
| G04 Journeys | Routing Corporate, lead Services, order EDU, join Universe |
| G05 Recovery | API error, retry queue, webhook ganda, email gagal, expiry |
| G06 SEO | Canonical, robots, sitemap, redirect, 404 asli, metadata |
| G07 Ops | Backup + restore teruji, log, alert, TLS, DNS, rollback |
| G08 Approval | Klaim publik lolos D08, kebijakan komersial disetujui |

Severity: **P0** (akses tak sah, double charge, secret bocor, sukses palsu, klaim palsu, CTA utama rusak) = NO-GO. **P1** = NO-GO untuk host terdampak. **P2** = boleh dengan penerimaan tertulis. **P3** = backlog.
Status tes default **NOT RUN**. Tidak boleh ditulis PASS tanpa eksekusi + bukti (commit SHA, env, tester, screenshot/log). Fitur nonaktif = **N/A + bukti feature flag**.

### Test lintas host prioritas (D07 T01–T10)
T01 masuk langsung tiap host → navigasi saudara → kembali ke Corporate · T02 100 webhook duplikat = 1 PAID, 1 entitlement, 1 receipt · T03 URL return palsu tidak memberi akses · T04 operator EDU tidak bisa lihat profil privat Universe & sebaliknya · T05 benefit dari membership expired ditolak aman · T06 CRM down → lead tetap tersimpan & di-retry · T07 staging noindex · T08 bayar sukses tapi email gagal → akses tetap bisa dipulihkan · T09 simulasi DNS/sertifikat 4 host + apex/www · T10 reduced-motion/touch/keyboard menyelesaikan semua journey inti.

---

## 10. CLAUDE.md (salin ke root repo)

```markdown
# VIBOXS Digital — aturan kerja untuk Claude Code

## Konteks
Monorepo untuk 4 alamat VIBOXS (PT Ekosistem Pelosok Hub):
viboxs.com (corporate), services.viboxs.com, edu.viboxs.com, universe.viboxs.com.
Satu brand, OPC-first, empat app terpisah deploy.

## Hirarki sumber kebenaran
1. Instruksi eksplisit terbaru founder
2. docs/reference/D14 (pemutus konflik) → D01 → D02 (visual)
3. D03–D06 (fitur per destinasi) → D07 (teknis) → D08 (konten/bukti)
4. D09–D12 + docs/handoff/07–10 (tahap build) → D13 (QA/rilis)
Konflik → catat di docs/decisions/, jangan pilih sendiri.

## Selalu
- Kerjakan SATU tahap (Pxx) per sesi, hanya di app yang disebut.
- Mulai tiap tahap dengan membaca kondisi repo nyata; jangan berasumsi tahap sebelumnya selesai.
- Semua token visual, copy, harga = PROPOSED sampai ada record APPROVED.
- Konten publik lewat publication gate D08; draft/revoked gagal tertutup.
- Sukses form/order/join hanya setelah server menyimpan durable.
- Paid hanya dari webhook terverifikasi (signature, amount, currency, idempotent).
- Secret hanya di server. Tidak ada PII di URL, log, analytics.
- Link lintas host dari origin config; host disabled → state "Sedang disiapkan".
- Aksesibel: keyboard, focus visible, reduced motion, 320px tanpa overflow, zoom 200%.

## Jangan pernah
- Mengarang logo, klien, testimoni, jumlah member, angka, partner, sertifikasi, investor,
  harga, jadwal, alamat, NIB, nomor kontak, atau teks hukum.
- Menampilkan harga Rp79.000/Rp699.000 (membership) atau harga e-book/Grand Academy sebagai publik.
- Mengubah DNS DomaiNesia, produksi Vercel, MX/TXT, sertifikat, atau migrasi VPS.
- Deploy production, kirim email/WA sungguhan, atau transaksi live tanpa izin eksplisit.
- Mengganti stack existing hanya demi mengikuti rekomendasi dokumen.
- Membangun fitur milik app lain (mis. checkout di Universe, intake Services di Corporate).
- Menulis PASS untuk tes yang tidak dijalankan.

## Laporan wajib setiap akhir tahap
1. File yang diubah
2. Keputusan: LOCKED / SOURCE / PROPOSED / OPEN / APPROVED
3. Perintah yang dijalankan + hasil nyata (pass/fail)
4. Screenshot / link preview bila UI
5. Test ID yang terbukti (mis. TC-S05) + status
6. Risiko P0, cara rollback
7. Prasyarat & blocker untuk tahap berikutnya
Tanya hanya untuk blocker sungguhan; selain itu pakai fallback aman dan tetap preview-only.
```

---

## 11. Template prompt per tahap

Setiap prompt di file 07–10 dijalankan dengan pembuka ini:

```text
Kamu bekerja di repo VIBOXS Digital. Baca CLAUDE.md, docs/handoff/06_CODE_FOUNDATION_MONOREPO.md,
dan docs/handoff/<FILE_APP>.md. Kerjakan HANYA tahap <Pxx> untuk apps/<app>.
Rujukan desain: docs/design/<app>/ (hasil Claude Design).
Periksa dulu hasil tahap sebelumnya di repo; jangan berasumsi sudah selesai.
Ikuti langkah, acceptance, dan QA trace di bawah. Akhiri dengan laporan wajib CLAUDE.md.

<tempel blok tahap Pxx>
```

---

## 12. Urutan gelombang (D14 §18)

| Wave | Pekerjaan | Gate minimum |
|---|---|---|
| W0 Inventory | Repo, DNS records, logo/copy approved, lisensi, integrasi eksternal | P00 tiap app selesai, blocker tercatat |
| W1 Shared base | Token approved + shared nav + route contracts + preview env | G01 & G03 base lulus di preview |
| W2 Corporate | Route Corporate, 3 link destinasi, konten aman | TC-01–16 aktif + review owner |
| W3 Services | Lead pipeline, 5 kategori, /start durable, CRM retry | TC-S01–18; tidak ada lead hilang |
| W4 EDU | Katalog approved; payment hanya setelah policy & gateway siap | TC-E01–18 + rekonsiliasi |
| W5 Universe | Interest/application jujur; paid & member area hanya jika approved | U-T01–20 + benefit/auth |
| W6 Release | D13 QA/Go per host + monitoring + hypercare | 100 tes yang berlaku + 8 gate |

Urutan rilis boleh diubah founder (mis. Universe interest-only dipercepat untuk 25 Des) **tanpa** mengubah kepemilikan kanonis.

### Rilis pertama yang realistis (D14 §25)
| Tipe | Boleh rilis bila | Tetap OFF sampai siap |
|---|---|---|
| Corporate public-only | Route, konten approved, link langsung, legal/kontak, G01–G08 | /work tanpa approval, metrik palsu |
| Services lead generation | 5 kategori, /start durable, keamanan/privasi, queue | Portofolio & harga belum approved |
| EDU catalog-only | Program nyata, empty state benar, handoff registrasi | Checkout berbayar, viewer, download privat |
| Universe interest-only | Proposisi OPC, join-interest persisten, status jujur, support | Membership premium, equity, direktori, benefit penuh |
