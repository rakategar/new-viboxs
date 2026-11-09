# VIBOXS — monorepo

> Satu VIBOXS. Empat alamat. Satu pengalaman.

Satu repo, beberapa app yang di-deploy terpisah, satu paket bersama (ADR-01 di `06_CODE_FOUNDATION_MONOREPO.md`).

```
apps/
  corporate/   → viboxs.com           (VIBOXS Corporate.dc.html)
  services/    → services.viboxs.com  (VIBOXS Services.dc.html)
packages/
  shared/      → @viboxs/shared: token & CSS dasar, motion (GSAP), efek (split/magnetic/spotlight/tilt),
                 ikon, cursor, marquee, konfigurasi ekosistem (origin + status LAUNCH)
```

Stack: Vite + React 18 + TypeScript + React Router + GSAP ScrollTrigger, npm workspaces.
Versi dependensi dikunci persis (GSAP 3.13+ membuat tween reveal macet di tengah, jadi tetap di `3.12.5`).

```bash
npm install                 # sekali, di root
npm run dev:corporate       # http://localhost:5173
npm run dev:services        # http://localhost:5174
npm run build               # build semua app → apps/*/dist
```

## Deploy ke Vercel (dua project dari repo yang sama)

| Project Vercel | Root Directory | Domain |
|---|---|---|
| viboxs-corporate | `apps/corporate` | viboxs.com |
| viboxs-services | `apps/services` | services.viboxs.com |

Framework terdeteksi **Vite**; Vercel menginstal dari root (npm workspaces) secara otomatis.
Setiap app punya `vercel.json` sendiri untuk SPA rewrite.
Jika project corporate sudah terlanjur dibuat dengan root `/`, ubah **Settings → Build & Deployment → Root Directory** ke `apps/corporate`.

## Konfigurasi yang perlu diubah saat sesuatu siap

- **Status subdomain** — `packages/shared/src/ecosystem.ts` → `LAUNCH`. Saat ini semua `'pending'`
  ("Sedang disiapkan", tautan ke halaman status di viboxs.com). Setelah services.viboxs.com live,
  ubah `services: 'live'` — Corporate dan Services ikut berubah bersamaan.
- **Origin per host** — env opsional `VITE_CORPORATE_ORIGIN`, `VITE_SERVICES_ORIGIN`, `VITE_EDU_ORIGIN`, `VITE_UNIVERSE_ORIGIN` (berguna untuk preview).
- **Corporate** — `apps/corporate/src/lib/content.ts`: `CONTACT_FORM_ENDPOINT` (null = form kontak nonaktif), `CASE_STUDIES`.
- **Services** — `apps/services/src/lib/content.ts`:
  - `INTAKE_ENDPOINT` ← env `VITE_INTAKE_ENDPOINT`. Kosong = formulir Start a Mission **nonaktif** di produksi
    (sesuai brief: menunggu kebijakan privasi & penerima lead). Endpoint menerima `POST` JSON dan harus
    membalas `{ "ref": "SVC-…" }`; pesan "Permintaan diterima" hanya tampil setelah balasan itu.
  - Di `npm run dev` tanpa endpoint, form aktif dengan **kontrol simulasi** (berhasil / server error / offline)
    dan nomor referensi berlabel `SIMULASI-…` — tidak pernah ikut build produksi.
  - `CASE_STUDIES` kosong → /work tidak muncul di menu, section bukti menampilkan state kosong yang jujur.

## Motion (ringkas)

**Corporate** — hero tangan AI ↔ manusia dari ±5.000 partikel, reveal per kata, parallax foto, garis alur ter-scrub, marquee reaktif-scroll.

**Services**
- Hero: jaringan node canvas (menyala di sekitar kursor, denyut data antar-node) + diagram
  *tantangan → intervensi → output* yang berputar otomatis, jalur aktif teraliri denyut data.
- Kartu layanan dengan mockup hidup (pemilih jadwal, langkah workflow, grafik data contoh, draf AI menunggu
  persetujuan, alur content-to-lead), spotlight kursor, hover maju 8px.
- Cara kerja: tab 7 tahap dengan rail progres + dokumen contoh yang "diketik"; Process: timeline terisi mengikuti scroll.
- Accordion beranimasi, filter FAQ dengan indikator geser, diagram kolaborasi partner, form 2 langkah dengan progres.
- Semua dekorasi mati saat `prefers-reduced-motion`; canvas berhenti saat tidak terlihat; mockup hanya berdetak saat terlihat.

Semua copy berstatus PROPOSED — lihat brief `00`–`10` di root repo.
