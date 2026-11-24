-- Batch 1 revisi EDU (PRD v3.0 §02.1, QA EDU-001/P00-003), 24 Nov 2026.
-- 9 program di edu_programs adalah seed contoh ("Impor katalog bawaan" 19 Nov), bukan produk nyata.
-- Audit P00: tidak ada order/registrasi nyata yang menautkannya (submissions: 1 contact, 1 collab).
-- Disembunyikan (TIDAK dihapus) agar bisa diaudit/dipulihkan.
update public.edu_programs
set published = false, updated_at = now()
where slug in (
  'dasar-ai-kerja-harian', 'sop-bisnis-satu-orang', 'panduan-prompt-operasional',
  'komunikasi-tertulis-kerja', 'distribusi-konten-opc', 'otomasi-spreadsheet-ai',
  'laporan-keuangan-sederhana', 'etika-ai-kantor', 'riset-pasar-opc'
);

-- Copy beranda/langkah/pengaturan lama di CMS masih memakai teks pra-PRD v3.0 (identik dengan bawaan lama).
-- Diganti nama (bukan dihapus) agar situs memakai copy PRD §15 baru; admin dapat menyimpan ulang dari /admin.
update public.edu_content set key = key || '_legacy_20261119' where key in ('home', 'steps', 'settings');

-- Rollback:
--   update public.edu_programs set published = true where slug in (...9 slug di atas...);
--   update public.edu_content set key = replace(key, '_legacy_20261119', '') where key like '%_legacy_20261119';
