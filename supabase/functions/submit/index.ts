// Endpoint form untuk ketiga situs VIBOXS.
// POST /functions/v1/submit?kind=<contact|mission|collab|help|notify|register>&site=<corporate|services|edu>
// 1) validasi + honeypot + rate limit  2) simpan ke public.submissions  3) kirim email ke admin@viboxs.com
// Email: SMTP (secret SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS) bila diset; jika tidak → FormSubmit (tanpa API key,
// perlu aktivasi sekali lewat email konfirmasi yang dikirim FormSubmit ke admin@viboxs.com).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import nodemailer from 'npm:nodemailer@6.9.16';

const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') ?? 'admin@viboxs.com';
const ORIGINS = ['https://www.viboxs.com', 'https://viboxs.com', 'https://service.viboxs.com', 'https://edu.viboxs.com'];
const SITE_ORIGIN: Record<string, string> = { corporate: 'https://www.viboxs.com', services: 'https://service.viboxs.com', edu: 'https://edu.viboxs.com' };
const KINDS = ['contact', 'mission', 'collab', 'help', 'notify', 'register'] as const;
type Kind = (typeof KINDS)[number];
const PREFIX: Record<Kind, string> = { contact: 'VBX', mission: 'SVC', collab: 'KOL', help: 'BAN', notify: 'NTF', register: 'REG' };
const TITLE: Record<Kind, string> = {
  contact: 'Pesan kontak', mission: 'Start a Mission', collab: 'Pendaftaran kolaborator EDU',
  help: 'Permintaan bantuan EDU', notify: 'Pendaftar pemberitahuan EDU', register: 'Pendaftaran program EDU',
};
const LABEL: Record<string, string> = {
  nama: 'Nama', name: 'Nama', email: 'Email', kontak: 'Kontak', via: 'Hubungi lewat', pesan: 'Pesan', intent: 'Maksud',
  kategori: 'Kategori', jenis: 'Jenis', org: 'Organisasi', orgName: 'Nama organisasi', hasil: 'Hasil yang diharapkan',
  status: 'Status saat ini', wa: 'WhatsApp', waCode: 'Kode negara', horizon: 'Horizon waktu', budget: 'Anggaran',
  marketing: 'Mau info pemasaran', from: 'Dipilih dari', source: 'Sumber', role: 'Peran', produk: 'Jenis produk',
  judul: 'Judul', deskripsi: 'Deskripsi', instansi: 'Instansi / perusahaan', kota: 'Kota', instagram: 'Instagram',
  linkedin: 'LinkedIn', website: 'Website / portofolio', sosmed_lain: 'Media sosial lain', pengalaman: 'Pengalaman',
  topik: 'Topik', order: 'Nomor order', program: 'Program', jabatan: 'Jabatan', kategori_produk: 'Kategori produk',
};

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && (ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) ? origin : ORIGINS[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
  'Vary': 'Origin',
});
const json = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(origin), 'Content-Type': 'application/json' } });

const str = (v: unknown, max = 4000) => (typeof v === 'string' ? v.trim().slice(0, max) : typeof v === 'boolean' ? (v ? 'Ya' : 'Tidak') : typeof v === 'number' ? String(v) : '');
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const rand = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');

async function sha(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

/** Ratakan payload → baris [label, nilai] untuk email. */
function rows(p: Record<string, unknown>): [string, string][] {
  const out: [string, string][] = [];
  for (const [k, v] of Object.entries(p)) {
    if (k === 'privacy' || k.startsWith('_')) continue;
    if (v && typeof v === 'object' && !Array.isArray(v)) { out.push(...rows(v as Record<string, unknown>)); continue; }
    const val = Array.isArray(v) ? v.map((x) => str(x)).filter(Boolean).join(', ') : str(v);
    if (val) out.push([LABEL[k] ?? k, val]);
  }
  return out;
}

async function sendMail(subject: string, r: [string, string][], replyTo: string, site: string): Promise<string> {
  const host = Deno.env.get('SMTP_HOST'), user = Deno.env.get('SMTP_USER'), pass = Deno.env.get('SMTP_PASS');
  const text = r.map(([k, v]) => `${k}: ${v}`).join('\n');
  if (host && user && pass) {
    const port = Number(Deno.env.get('SMTP_PORT') ?? 465);
    const t = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
    const html = `<h2 style="font-family:sans-serif">${esc(subject)}</h2><table cellpadding="8" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">${
      r.map(([k, v]) => `<tr><td style="border:1px solid #ddd;background:#f6f6f6;vertical-align:top"><b>${esc(k)}</b></td><td style="border:1px solid #ddd;white-space:pre-wrap">${esc(v)}</td></tr>`).join('')}</table>`;
    await t.sendMail({ from: `VIBOXS Web <${user}>`, to: ADMIN_EMAIL, replyTo: replyTo || undefined, subject, text, html });
    return 'sent_smtp';
  }
  // FormSubmit: pertama kali butuh aktivasi (klik link di email "Action Required" yang masuk ke admin@viboxs.com).
  const body: Record<string, string> = { _subject: subject, _template: 'table', _captcha: 'false' };
  if (replyTo) body._replyto = replyTo;
  for (const [k, v] of r) body[k in body ? `${k} ` : k] = v;
  const res = await fetch(`https://formsubmit.co/ajax/${ADMIN_EMAIL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Origin: SITE_ORIGIN[site] ?? ORIGINS[0], Referer: `${SITE_ORIGIN[site] ?? ORIGINS[0]}/` },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({} as Record<string, unknown>));
  if (String(j.success) === 'true') return 'sent_formsubmit';
  const msg = String(j.message ?? res.status);
  return /activat/i.test(msg) ? 'needs_activation' : `failed: ${msg.slice(0, 160)}`;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (req.method !== 'POST') return json({ error: 'method' }, 405, origin);

  const url = new URL(req.url);
  const kind = url.searchParams.get('kind') as Kind;
  const site = url.searchParams.get('site') ?? '';
  if (!KINDS.includes(kind) || !(site in SITE_ORIGIN)) return json({ error: 'kind/site tidak dikenal' }, 400, origin);

  const raw = await req.text();
  if (raw.length > 20000) return json({ error: 'terlalu besar' }, 413, origin);
  let p: Record<string, unknown>;
  try { p = JSON.parse(raw); } catch { return json({ error: 'json' }, 400, origin); }
  if (!p || typeof p !== 'object' || Array.isArray(p)) return json({ error: 'json' }, 400, origin);

  // honeypot: bot mengisi field tersembunyi → pura-pura sukses, tidak disimpan
  if (str(p.website_hp) || str(p._hp)) return json({ ref: `${PREFIX[kind]}-${rand(6)}` }, 200, origin);
  delete p.website_hp; delete p._hp;

  const name = str(p.nama ?? p.name, 120);
  const kontak = str(p.kontak, 200);
  const email = str(p.email, 200) || (emailOk(kontak) ? kontak : '');
  const phone = str(p.wa, 40) ? `${str(p.waCode, 6)} ${str(p.wa, 40)}`.trim() : (!emailOk(kontak) ? kontak : '');
  if (email && !emailOk(email)) return json({ error: 'email tidak valid' }, 422, origin);
  if (kind === 'notify' ? !email : !name || (!email && !phone)) return json({ error: 'nama & kontak wajib' }, 422, origin);
  if (kind === 'collab' && (!str(p.judul) || !str(p.deskripsi) || !str(p.role))) return json({ error: 'peran, judul & deskripsi wajib' }, 422, origin);

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const ipHash = await sha(`${ip}|viboxs`);
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await sb.from('submissions').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', since);
  if ((count ?? 0) >= 8) return json({ error: 'Terlalu banyak kiriman. Coba lagi beberapa menit lagi.' }, 429, origin);

  const ref = `${PREFIX[kind]}-${rand(6)}`;
  const subjectBits: Record<Kind, string> = {
    contact: str(p.intent, 60), mission: str(p.kategori, 60), collab: `${str(p.role, 30)} · ${str(p.judul, 80)}`,
    help: str(p.topik, 60), notify: email, register: str(p.program, 80),
  };
  const subject = `[${ref}] ${TITLE[kind]}${subjectBits[kind] ? ` — ${subjectBits[kind]}` : ''}${name ? ` — ${name}` : ''}`;
  const { data: row, error } = await sb.from('submissions')
    .insert({ ref, kind, site, name: name || null, email: email || null, phone: phone || null, subject, payload: p, ip_hash: ipHash })
    .select('id').single();
  if (error) { console.error(error); return json({ error: 'gagal menyimpan' }, 500, origin); }

  const r: [string, string][] = [['Referensi', ref], ['Situs', SITE_ORIGIN[site]], ...rows(p), ['Diterima', new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB']];
  const task = sendMail(subject, r, email, site)
    .catch((e) => `failed: ${String(e).slice(0, 160)}`)
    .then((s) => sb.from('submissions').update({ email_status: s }).eq('id', row.id));
  // @ts-ignore EdgeRuntime tersedia di Supabase
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(task); else await task;

  return json({ ref }, 200, origin);
});
