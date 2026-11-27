import type { Role } from './sb';

export type Tone = 'ok' | 'info' | 'warn' | 'danger' | 'muted' | 'accent' | 'violet' | 'gold';

export const ROLE: Record<Role, { label: string; short: string; desc: string }> = {
  commander: { label: 'Commander', short: 'CMD', desc: 'Control Center — akses, misi, approval, payout' },
  operator: { label: 'Delegated Operator', short: 'OPS', desc: 'Tugas terbatas yang diizinkan Commander' },
  ranger: { label: 'Ranger', short: 'RGR', desc: 'Missions — tawar proyek, serahkan deliverable' },
  trainer: { label: 'EDU Contributor', short: 'EDU', desc: 'Creator — draft program untuk EDU' },
  learner: { label: 'EDU Learner', short: 'LRN', desc: 'My Learning — asesmen, rekomendasi, poin' },
  opc_founder: { label: 'OPC Founder', short: 'OPC', desc: 'Profil usaha, produk, VIBOXS Connect' },
  business_partner: { label: 'Business Partner', short: 'PTR', desc: 'Kerja sama B2B, VIBOXS Connect' },
  collaborator: { label: 'Business Collaborator', short: 'COL', desc: 'Peluang & kolaborasi B2B' },
  company_partner: { label: 'Company Partner', short: 'CMP', desc: 'Company Workspace — hiring opt-in & Services' },
};

export const BUSINESS_ROLES: Role[] = ['opc_founder', 'business_partner', 'collaborator'];

export const APP_TYPE: Record<string, string> = {
  ranger: 'Ranger', trainer: 'EDU Contributor', opc_founder: 'OPC Founder', business_partner: 'Business Partner', collaborator: 'Business Collaborator',
};
export const APP_STATUS: Record<string, [string, Tone]> = {
  submitted: ['Masuk', 'info'], in_review: ['Ditinjau', 'violet'], need_info: ['Butuh info', 'warn'], approved: ['Disetujui', 'ok'],
  declined: ['Ditolak', 'muted'], invited: ['Diundang', 'accent'], active: ['Aktif', 'ok'],
};
export const SOURCE: Record<string, string> = { studio: 'Studio', edu: 'edu.viboxs.com', services: 'service.viboxs.com', corporate: 'viboxs.com', universe: 'Universe', manual: 'Input manual' };

export const INVITE_STATUS: Record<string, [string, Tone]> = { pending: ['Menunggu', 'warn'], accepted: ['Diterima', 'ok'], revoked: ['Dicabut', 'muted'], expired: ['Kedaluwarsa', 'muted'] };
export const OUTBOX_STATUS: Record<string, [string, Tone]> = {
  queued: ['Antre kirim', 'info'], sending: ['Mengirim', 'info'], sent: ['Email terkirim', 'ok'], retry_pending: ['Gagal, dicoba lagi', 'warn'],
  failed: ['Email gagal', 'danger'], cancelled: ['Diganti', 'muted'], skipped_provider_off: ['Kanal belum aktif', 'muted'],
};
export const GRANT_STATUS: Record<string, [string, Tone]> = { active: ['Aktif', 'ok'], suspended: ['Ditangguhkan', 'warn'], revoked: ['Dicabut', 'muted'] };

export const LEAD_STATUS: Record<string, [string, Tone]> = {
  new: ['Baru', 'info'], contacted: ['Dihubungi', 'violet'], negotiating: ['Negosiasi', 'warn'], won: ['Deal', 'ok'], lost: ['Tidak lanjut', 'muted'], converted: ['Jadi mission', 'accent'],
};

export const CATEGORY: Record<string, string> = {
  web: 'Website', system: 'Sistem / backend', ai: 'AI & otomasi', design: 'Desain grafis', video: 'Editing video', content: 'Konten', ads: 'Iklan / campaign', other: 'Lainnya',
};

/** Urutan utama state machine mission (PRD §06.4). */
export const MISSION_FLOW = ['draft', 'offered', 'bidding', 'negotiation', 'assigned_pending_agreement', 'in_progress', 'submitted', 'accepted', 'payable_pending_approval', 'payable_approved', 'paid'] as const;
export const MISSION_STATUS: Record<string, [string, Tone]> = {
  draft: ['Draft', 'muted'], offered: ['Ditawarkan', 'info'], bidding: ['Ada tawaran', 'violet'], negotiation: ['Negosiasi', 'warn'],
  assigned_pending_agreement: ['Menunggu perjanjian', 'warn'], in_progress: ['Dikerjakan', 'accent'], on_hold: ['Ditahan', 'muted'],
  submitted: ['Deliverable masuk', 'violet'], review: ['Direview', 'violet'], revision_requested: ['Revisi diminta', 'warn'], accepted: ['Diterima', 'ok'],
  payable_pending_approval: ['Payable menunggu approval', 'gold'], payable_approved: ['Payable disetujui', 'gold'], paid: ['Lunas', 'ok'], closed: ['Ditutup', 'muted'],
  withdrawn: ['Ditarik', 'muted'], cancelled: ['Dibatalkan', 'danger'], disputed: ['Sengketa', 'danger'],
};
export const MISSION_STEP_LABEL: Record<string, string> = {
  draft: 'Draft', offered: 'Offer', bidding: 'Bid', negotiation: 'Nego', assigned_pending_agreement: 'Kontrak', in_progress: 'Kerja',
  submitted: 'Submit', accepted: 'QC', payable_pending_approval: 'Payable', payable_approved: 'Approved', paid: 'Paid',
};
export const FEE_TYPE: Record<string, string> = { fixed: 'Fee tetap', milestone: 'Per milestone', negotiable: 'Bisa dinegosiasi' };
export const SCHEDULE: Record<string, string> = { on_acceptance: 'Setelah deliverable diterima', milestone: 'Per milestone', monthly_accumulated: 'Akumulasi bulanan', custom_terms: 'Sesuai ketentuan khusus' };
export const BID_KIND: Record<string, string> = { bid: 'Tawaran', counter: 'Counteroffer Commander', accept_counter: 'Ranger menerima counter', decline: 'Tidak dilanjutkan', withdraw: 'Ditarik Ranger' };
export const DELIV_STATUS: Record<string, [string, Tone]> = { submitted: ['Menunggu review', 'violet'], revision_requested: ['Revisi diminta', 'warn'], accepted: ['Diterima', 'ok'], rejected: ['Ditolak', 'danger'] };
export const PAY_STATUS: Record<string, [string, Tone]> = {
  pending_approval: ['Menunggu approval', 'warn'], approved: ['Disetujui · belum transfer', 'gold'], rejected: ['Ditolak', 'danger'], partially_paid: ['Dibayar sebagian', 'violet'], paid: ['Lunas', 'ok'],
};

export const PROG_TYPE: Record<string, string> = { webinar: 'Live Webinar', workshop: 'Workshop', ebook: 'E-book', ecourse: 'E-course' };
export const PROG_PATH: Record<string, string> = { ai: 'Start with AI', biz: 'Build Your Business', career: 'Work & Career' };
export const PRICING: Record<string, string> = { free: 'Gratis', paid: 'Berbayar', invitation: 'Undangan', sponsored: 'Disponsori' };
export const PROG_STATUS: Record<string, [string, Tone]> = {
  draft: ['Draft', 'muted'], submitted: ['Menunggu review', 'violet'], needs_revision: ['Perlu revisi', 'warn'], approved: ['Disetujui', 'ok'],
  publish_queued: ['Di EDU · belum tayang', 'gold'], publish_failed: ['Gagal kirim ke EDU', 'danger'], published: ['Tayang di EDU', 'ok'],
  cancelled: ['Dibatalkan', 'danger'], completed: ['Selesai', 'muted'], archived: ['Arsip', 'muted'],
};

export const VISIBILITY: Record<string, [string, string]> = {
  private: ['Privat', 'Hanya Anda. Tidak muncul di Connect.'],
  network: ['Jaringan', 'Terlihat oleh anggota bisnis terverifikasi di Connect.'],
  discoverable: ['Dapat ditemukan', 'Terlihat di Connect; kandidat listing publik Universe saat konektor siap.'],
};
export const ORG_KIND: Record<string, string> = { opc: 'OPC', partner: 'Business Partner', collaborator: 'Collaborator', trainer: 'Trainer independen' };
export const PRODUCT_STATUS: Record<string, [string, Tone]> = {
  draft: ['Draft', 'muted'], queued: ['Antre · konektor Universe belum aktif', 'gold'], published: ['Tayang di Universe', 'ok'], unpublished: ['Ditarik', 'muted'], flagged: ['Ditandai moderasi', 'danger'],
};
export const INTENT: Record<string, string> = {
  FIND_MARKETING_PARTNER: 'Cari mitra marketing', FIND_TECHNOLOGY_PARTNER: 'Cari mitra teknologi', FIND_EDUCATOR: 'Cari edukator', FIND_DISTRIBUTOR: 'Cari distributor',
  CO_MARKETING: 'Co-marketing', SPONSORSHIP_INQUIRY: 'Sponsorship', BRAND_COLLABORATION: 'Kolaborasi brand', CREATOR_BRAND_FIT: 'Kreator × brand', OTHER_B2B: 'B2B lainnya',
};
export const REQ_STATUS: Record<string, [string, Tone]> = {
  requested: ['Menunggu jawaban', 'info'], accepted: ['Diterima', 'ok'], declined: ['Ditolak', 'muted'], needs_info: ['Butuh info', 'warn'], withdrawn: ['Ditarik', 'muted'], reported: ['Dilaporkan', 'danger'],
};
export const WS_STATUS: Record<string, [string, Tone]> = {
  active: ['Aktif', 'info'], proposal_exchanged: ['Proposal ditukar', 'violet'], agreed: ['Disepakati para pihak', 'ok'], in_progress: ['Berjalan', 'accent'],
  completed: ['Selesai', 'ok'], cancelled: ['Batal', 'muted'], disputed: ['Sengketa', 'danger'],
};
export const WS_APPROVAL: Record<string, [string, Tone]> = {
  awaiting_commander: ['Menunggu Commander', 'warn'], approved_viboxs_scope: ['Lingkup VIBOXS disetujui', 'ok'], denied_viboxs_scope: ['Lingkup VIBOXS ditolak', 'danger'],
};

export const ENTITY: Record<string, string> = {
  st_role_grants: 'Peran', st_applications: 'Aplikasi', st_invites: 'Undangan', st_missions: 'Mission', st_mission_private: 'Data komersial mission',
  st_assignments: 'Assignment', st_deliverables: 'Deliverable', st_payables: 'Payable', st_payments: 'Pembayaran', st_program_drafts: 'Program EDU',
  st_flags: 'Feature flag', st_orgs: 'Organisasi', st_requests: 'Permintaan Connect', st_profiles: 'Profil',
};

const IDR = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
export const rupiah = (n: number | null | undefined) => (n == null ? '—' : IDR.format(Number(n)));

export const fmtDate = (s: string | null | undefined, withTime = true) =>
  s ? new Date(s).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}), timeZone: 'Asia/Jakarta' }) + (withTime ? ' WIB' : '') : '—';

export const ago = (s: string) => {
  const m = Math.round((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d} hari lalu` : fmtDate(s, false);
};

export const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

/** datetime-local (WIB) ⇄ ISO */
export const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() + 7 * 3600_000);
  return d.toISOString().slice(0, 16);
};
export const fromLocalInput = (v: string) => (v ? new Date(`${v}:00+07:00`).toISOString() : null);

/* ---------- Batch 2–6 ---------- */
export const ORDER_STATUS: Record<string, [string, Tone]> = {
  CREATED: ['Dibuat', 'muted'], PAYMENT_PENDING: ['Menunggu pembayaran', 'warn'], PAID_VERIFIED: ['Terbayar', 'ok'], FULFILLED: ['Akses aktif', 'ok'], COMPLETED: ['Selesai', 'muted'],
  EXPIRED: ['Kedaluwarsa', 'muted'], FAILED: ['Gagal', 'danger'], CANCELLED: ['Dibatalkan', 'muted'], REFUNDED: ['Direfund', 'violet'], PARTIALLY_REFUNDED: ['Refund sebagian', 'violet'], CHARGEBACK: ['Chargeback', 'danger'],
};
export const PAID_STATES = ['PAID_VERIFIED', 'FULFILLED', 'COMPLETED', 'PARTIALLY_REFUNDED'];
export const ASM_STATUS: Record<string, [string, Tone]> = {
  DRAFT: ['Draft', 'muted'], IN_REVIEW: ['Menunggu review', 'violet'], NEEDS_REVISION: ['Perlu revisi', 'warn'], RELEASED: ['Dirilis', 'ok'], ARCHIVED: ['Arsip', 'muted'],
};
export const ATTEMPT_STATUS: Record<string, [string, Tone]> = { SCORED: ['Dinilai otomatis', 'info'], NEEDS_REVIEW: ['Menunggu reviewer', 'warn'], REVIEWED: ['Ditinjau reviewer', 'ok'] };
export const COMPANY_PURPOSE: Record<string, string> = { hiring: 'Hiring talenta', services: 'VIBOXS Services', both: 'Hiring & Services' };
export const COMPANY_SOURCE: Record<string, string> = { edu: 'Form EDU /for-companies', studio: 'Studio /company', backfill: 'Backfill form lama' };
export const COMPANY_STATUS: Record<string, [string, Tone]> = {
  SUBMITTED: ['Perlu dilengkapi', 'warn'], IN_COMMANDER_QUEUE: ['Antrean Commander', 'info'], APPLIED: ['Diajukan', 'info'], REVIEW: ['Ditinjau', 'violet'], NEED_INFO: ['Butuh info', 'warn'],
  REJECTED: ['Ditolak', 'muted'], VERIFIED: ['Terverifikasi', 'ok'], COMPANY_INVITE_SENT: ['Terverifikasi · undangan dikirim', 'accent'], ACTIVE: ['Aktif', 'ok'], SUSPENDED: ['Ditangguhkan', 'danger'],
};
export const HIRE_STATUS: Record<string, [string, Tone]> = {
  SENT: ['Menunggu kandidat', 'info'], ACCEPTED: ['Diterima kandidat', 'ok'], DECLINED: ['Ditolak kandidat', 'muted'], BLOCKED: ['Diblokir kandidat', 'danger'], WITHDRAWN: ['Ditarik', 'muted'], CLOSED: ['Ditutup', 'muted'],
};
export const HIRE_STAGE: [string, string][] = [['SHORTLISTED', 'Shortlist'], ['INTERVIEW', 'Interview'], ['OFFER', 'Penawaran'], ['HIRED', 'Diterima kerja'], ['CLOSED', 'Ditutup']];
export const AVAIL: Record<string, string> = { now: 'Siap sekarang', '1month': 'Dalam 1 bulan', '3months': 'Dalam 3 bulan', not_now: 'Belum mencari' };
export const WORKPREF: Record<string, string> = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'Onsite', any: 'Fleksibel' };
export const CONTRACT: Record<string, string> = { fulltime: 'Penuh waktu', parttime: 'Paruh waktu', contract: 'Kontrak', internship: 'Magang', freelance: 'Lepas' };
export const SHOWCASE_STATUS: Record<string, [string, Tone]> = {
  DRAFT: ['Draft', 'muted'], SUBMITTED: ['Menunggu review', 'violet'], PUBLIC_APPROVED: ['Tayang di EDU', 'ok'], REJECTED: ['Belum disetujui', 'danger'], WITHDRAWN: ['Ditarik', 'muted'],
};
export const RANGER_STATUS: Record<string, [string, Tone]> = { ACTIVE: ['Ranger aktif', 'ok'], DEACTIVATION_REQUESTED: ['Minta nonaktif', 'warn'], INACTIVE: ['Nonaktif (clearance)', 'muted'] };
export const STAR_CODE: Record<string, string> = {
  EBOOK_PURCHASE: 'Pembelian e-book terverifikasi', WEBINAR_ATTENDANCE: 'Kehadiran webinar terverifikasi', WEBINAR_ASSESSMENT_PASS: 'Lulus asesmen webinar',
  EBOOK_ESSAY_PASS: 'Lulus esai e-book', REVERSAL: 'Pembalikan (refund/koreksi)',
};
/** Star Ranking CONFIG v1 (PRD §06.6): indikator aktivitas, bukan sertifikasi. */
export const STAR_LEVELS: [string, number, number][] = [['Star I', 0, 100], ['Star II', 100, 250], ['Star III', 250, 450], ['Star IV', 450, 700], ['Star V', 700, 1000]];
export function starLevel(n: number) {
  const i = Math.max(0, STAR_LEVELS.findIndex(([, a, b]) => n >= a && n < b));
  const [name, a, b] = n >= 700 ? STAR_LEVELS[4] : STAR_LEVELS[i];
  return { name, fill: n >= 700 ? 1 : Math.min(1, Math.max(0, (n - a) / (b - a))), next: n >= 700 ? null : b };
}
