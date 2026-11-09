# VIBOXS Corporate — viboxs.com

Implementasi `VIBOXS Corporate.dc.html` + token `VIBOXS Design System.dc.html` (Claude Design),
mengikuti brief `01_SHARED_DESIGN_SYSTEM.md` dan `02_DESIGN_CORPORATE.md`.

Stack: Vite + React + TypeScript + React Router + GSAP (ScrollTrigger).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # output: dist/
```

Deploy Vercel: import repo → framework **Vite** (otomatis). `vercel.json` sudah berisi SPA rewrite.

## Konfigurasi konten — `src/lib/content.ts`
- `LAUNCH` — status tiap subdomain. Saat ini `universe/edu/services.viboxs.com` masih 404, jadi `'pending'`
  (kartu menampilkan "Sedang disiapkan" dan tautan menuju halaman status). Ubah ke `'live'` saat subdomain siap.
- `CONTACT_FORM_ENDPOINT` — `null` = form kontak umum nonaktif (sesuai brief). Isi URL endpoint yang
  mengembalikan `{ "ref": "..." }`; pesan sukses hanya tampil setelah server mengonfirmasi.
- `CASE_STUDIES` — kosong → menu "Karya" disembunyikan.

## Motion
- Hero: `src/components/HandsCanvas.tsx` — tangan AI ↔ manusia dari ±5.000 partikel (`src/data/hands.json`),
  memancar dari titik sentuh, menghindari kursor, merenggang saat scroll, percikan/busur listrik di ujung jari.
- Reveal per kata, stagger, clip-reveal foto + parallax, garis alur ter-scrub, panel terang "naik",
  marquee bereaksi pada kecepatan scroll, kartu spotlight/tilt, tombol magnetik, cursor ring opsional.
- Semua mati saat `prefers-reduced-motion` (konten tetap tampil); loop canvas berhenti saat hero tak terlihat.
