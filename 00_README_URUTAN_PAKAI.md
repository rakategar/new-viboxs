# VIBOXS New Era — Paket Handoff Claude Design & Claude Code

**Disusun dari:** 19 dokumen di folder Drive "DOC BUILD WEB VIBOXS" (D01–D14 + 4 Codex Prompt Pack), versi 4–5 November 2026.
**Tanggal paket:** 6 November 2026.
**Pemilik strategi:** Dede Darmawan — VIBOXS / PT Ekosistem Pelosok Hub.

> Satu VIBOXS. Empat alamat. Satu pengalaman.
> `viboxs.com` (hub korporat) + 3 tujuan: `services.viboxs.com`, `edu.viboxs.com`, `universe.viboxs.com`.

---

## Isi paket

| File | Untuk | Isi |
|---|---|---|
| `00_README_URUTAN_PAKAI.md` | Anda | Peta file, urutan kerja, keputusan yang masih terbuka |
| `01_SHARED_DESIGN_SYSTEM.md` | **Claude Design** (lalu Claude Code) | Token warna/tipografi/spacing/motion, komponen bersama, header-footer-switcher, aturan anti-AI-slop, aksesibilitas |
| `02_DESIGN_CORPORATE.md` | Claude Design | Brief halaman `viboxs.com` (H01–H09, /ecosystem, /about, /work, /contact, legal) |
| `03_DESIGN_SERVICES.md` | Claude Design | Brief `services.viboxs.com` (S01–S08, 5 layanan, /start dua langkah, /partners) |
| `04_DESIGN_EDU.md` | Claude Design | Brief `edu.viboxs.com` (E01–E09, katalog, detail 14 blok, event, library, checkout states) |
| `05_DESIGN_UNIVERSE.md` | Claude Design | Brief `universe.viboxs.com` (U01–U10, 3 mode join, benefit, aktivitas, member area) |
| `06_CODE_FOUNDATION_MONOREPO.md` | **Claude Code** | Arsitektur monorepo, paket bersama, env, data model lintas domain, aturan keamanan, CI, protokol kerja agen |
| `07_CODE_CORPORATE.md` | Claude Code | Spesifikasi build Corporate + 14 tahap (P00–P13) + TC-01–16 |
| `08_CODE_SERVICES.md` | Claude Code | Spesifikasi build Services + 17 tahap (P00–P16) + TC-S01–S18 |
| `09_CODE_EDU.md` | Claude Code | Spesifikasi build EDU + 21 tahap (P00–P20) + TC-E01–E18 |
| `10_CODE_UNIVERSE.md` | Claude Code | Spesifikasi build Universe + 25 tahap (P00–P24) + U-T01–T20 |

---

## Urutan kerja yang disarankan

### Tahap A — Claude Design
1. Buka satu project Claude Design, tempel **`01_SHARED_DESIGN_SYSTEM.md`** dulu. Minta Claude Design membuat design system (token + komponen inti + header/footer/switcher) dan **review/approve itu sebelum lanjut**. Ini gerbang G2 di D01.
2. Lanjut per website, satu sesi per file: `02` → `03` → `04` → `05`. Lampirkan juga file `01` di tiap sesi supaya konsisten.
3. Untuk tiap website, minta minimal: homepage desktop + mobile (390px), 2–3 halaman kunci, dan semua state penting (kosong, error, loading, sukses).
4. Export hasil desain (atau link/URL Claude Design) untuk dibawa ke Claude Code.

### Tahap B — Claude Code
1. Taruh semua dokumen asli D01–D14 + 4 Codex Prompt Pack `.md` di repo pada `docs/reference/`, dan file `06`–`10` dari paket ini di `docs/handoff/`.
2. Mulai dengan **`06_CODE_FOUNDATION_MONOREPO.md`** → jalankan P00 (audit repo, tanpa mengubah apa pun).
3. Bangun berurutan sesuai D14 W2–W5: **Corporate → Services → EDU → Universe**. Urutan rilis boleh diubah founder (misal Universe dipercepat untuk 25 Desember), tapi **jangan pernah membangun 4 app sekaligus dalam satu prompt**.
4. Satu tahap = satu prompt = satu commit. Setelah tiap tahap: review diff → test → catat QA → baru lanjut.

> **Catatan nama alat:** dokumen sumber menulis "Codex". Semua prompt di paket ini sudah ditulis ulang untuk **Claude Code**, isinya sama.

---

## Aturan yang mengikat semua file (dari D01, D08, D14)

- **Tidak ada klaim palsu.** Dilarang mengarang logo, klien, testimoni, jumlah member, angka omzet, partner, sertifikasi, investor, harga, atau jadwal. Kalau datanya belum ada → state kosong yang jujur, bukan placeholder yang tampak asli.
- **Satu pemilik per hal.** Program & checkout = EDU. Lead & proposal jasa = Services. Membership & benefit = Universe. Corporate hanya memperkenalkan dan mengarahkan.
- **Status fitur harus jujur.** Bedakan *tersedia / pilot / segera hadir / daftar minat* di seluruh UI.
- **Sukses hanya setelah server menyimpan.** Form, order, join tidak boleh menampilkan "berhasil" sebelum data benar-benar tersimpan.
- **Pembayaran hanya sah dari webhook server**, bukan URL sukses browser.
- **Semua token visual masih PROPOSED** sampai founder approve di prototype.
- **Preview dulu.** Tidak ada perubahan DNS DomaiNesia, produksi Vercel, atau migrasi VPS tanpa sign-off tertulis.

---

## Konflik antar-dokumen yang saya temukan (perlu keputusan Anda)

| # | Konflik | Rekomendasi di paket ini |
|---|---|---|
| K1 | Slug layanan Services. D04 & D14: `/services/websites`, `/automation`, `/dashboards`, `/ai-integration`, `/growth-content`. D10: `websites-systems`, `ai-automation`, `dashboard-internal-systems`, `ai-integration`, `growth-content`. | Pakai versi **D04/D14** (D14 adalah pemutus konflik). Ditandai OPEN di `08_CODE_SERVICES.md`. |
| K2 | Sapaan "kamu" vs "Anda". D03 menyarankan "Anda" untuk Corporate; D04 "Anda" untuk Services; copy EDU di D05 memakai "kamu". | Corporate & Services: **Anda**. EDU & Universe: **kamu** boleh, menunggu approval. Mudah diganti karena semua copy disimpan di file konten. |
| K3 | Menu utama Corporate. D02 menyebut "Universe · Services · EDU · About"; D03 menyebut "Beranda / Ekosistem / Karya / Tentang / Kontak" + switcher. | Pakai **D03** untuk menu lokal + switcher ekosistem terpisah (sesuai D02 bab 07). |
| K4 | Route mitra Universe. D08 menyebut `/members`, `/opportunities`; D06/D12 memakai `/partners`, `/collaborate`. | Pakai **D06/D12**. |
| K5 | D10 menulis "Universe-first corporate positioning", padahal D01/D14 mengunci **OPC-first**. | Dianggap salah ketik; paket memakai **OPC-first**. |

## Keputusan terbuka paling berpengaruh ke desain & build

1. **Logo master VIBOXS (SVG)** belum ada di paket sumber → desain memakai wordmark teks "VIBOXS" berlabel placeholder.
2. **Warna & font final** → semua token D02 masih usulan.
3. **Hero copy final** Corporate, Services, EDU, Universe → pilihan A/B/C ada di brief, founder pilih.
4. **Mode join Universe untuk 25 Desember**: daftar minat, aplikasi, atau member aktif.
5. **Harga membership** (Rp79.000/bulan, Rp699.000/tahun) → **HOLD**, tidak boleh tampil publik.
6. **Produk EDU yang benar-benar dijual** + payment gateway → belum ada; checkout dirancang tapi dimatikan.
7. **Studi kasus yang boleh tayang** → nol yang approved; modul /work disembunyikan.
8. **Kanal kontak resmi + privacy policy** → belum ada; form dirancang tapi tidak aktif di produksi.
9. **Stack & repo** → Next.js + TypeScript monorepo adalah rekomendasi, dikunci setelah audit P00.
10. **Canonical www vs apex** untuk viboxs.com.
