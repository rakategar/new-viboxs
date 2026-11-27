// Worker outbox Studio (v4 WP01/WP02): kirim email antrean st_outbox lewat SMTP Mailspace.
// POST /functions/v1/st-notify  {}  — dipanggil Studio setelah aksi Commander dan oleh pg_cron tiap 5 menit.
// Aman dipanggil siapa pun: hanya memproses baris yang sudah diantre server; retry/backoff diatur st_outbox_done.
// Token undangan hanya ada di memori fungsi ini; tidak pernah ditulis ke log atau dikembalikan di respons.
// Link selalu dibangun dari STUDIO_ORIGIN konstan, bukan dari header request (anti host-header, V4-AT-009).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import nodemailer from 'npm:nodemailer@6.9.16';

const STUDIO_ORIGIN = 'https://studio.viboxs.com';
const ORIGINS = [STUDIO_ORIGIN, 'https://edu.viboxs.com'];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const cors = (o: string | null) => ({
  'Access-Control-Allow-Origin': o && (ORIGINS.includes(o) || LOCAL.test(o)) ? o : ORIGINS[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
  'Vary': 'Origin',
});
const json = (b: unknown, s: number, o: string | null) => new Response(JSON.stringify(b), { status: s, headers: { ...cors(o), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

type Row = { id: string; topic: string; template: string; recipient: string; payload: Record<string, unknown>; secret: string | null };
type Mail = { subject: string; paras: string[]; cta?: { label: string; url: string }; foot?: string[] };

const ROLE_LABEL: Record<string, string> = {
  trainer: 'EDU Contributor', ranger: 'Ranger', opc_founder: 'OPC Founder', business_partner: 'Business Partner',
  collaborator: 'Collaborator', operator: 'Operator', company_partner: 'Company Partner',
};
const wib = (iso: unknown) => new Date(String(iso)).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long', timeStyle: 'short' }) + ' WIB';

/** Copy mengikuti PRD v4 §15. Tidak ada password/OTP di email mana pun. */
function render(r: Row): Mail | null {
  const p = r.payload ?? {};
  const name = typeof p.name === 'string' && p.name ? p.name : '';
  const hello = name ? `Halo ${esc(name)},` : 'Halo,';
  if (r.topic === 'invite.activation') {
    if (!r.secret) return null;
    const url = `${STUDIO_ORIGIN}/invite/${r.secret}`;
    const hours = Number(p.hours ?? 24);
    const life = `Tautan pribadi ini berlaku ${hours} jam (sampai ${wib(p.expires_at)}) dan hanya bisa digunakan sekali. Jangan bagikan tautan kepada siapa pun. Jika kedaluwarsa, buka tautan ini lalu pilih "Minta kirim ulang undangan".`;
    const has = p.has_account === true;
    const roles = Array.isArray(p.roles) ? (p.roles as string[]).map((x) => ROLE_LABEL[x] ?? x).join(', ') : '';
    if (r.template === 'contributor_approved') {
      return {
        subject: 'Pendaftaran Kontributor VIBOXS disetujui',
        paras: [hello, 'Pengajuan Anda telah disetujui.', `Username akun Anda adalah <b>${esc(String(p.email ?? r.recipient))}</b>.`,
          has ? 'Email ini sudah terdaftar di VIBOXS Studio. Masuk dengan akun Anda, lalu terima undangan untuk menambahkan peran EDU Contributor — tidak ada akun baru.'
              : 'Silakan aktifkan akses melalui tombol <b>Buat Password &amp; Aktifkan Akun</b>.', life],
        cta: { label: has ? 'Masuk & Aktifkan Peran' : 'Buat Password & Aktifkan Akun', url },
      };
    }
    return {
      subject: r.template === 'company_invite' ? 'Aktivasi Company Workspace VIBOXS' : 'Undangan akses VIBOXS Studio',
      paras: [hello, `Anda diundang ke VIBOXS Studio sebagai <b>${esc(roles)}</b>.`, `Username akun Anda adalah <b>${esc(String(p.email ?? r.recipient))}</b>.`,
        has ? 'Email ini sudah terdaftar. Masuk dengan akun Anda, lalu terima undangan.' : 'Aktifkan akses melalui tombol di bawah untuk membuat password Anda sendiri.', life],
      cta: { label: has ? 'Masuk & Terima Undangan' : 'Buat Password & Aktifkan Akun', url },
    };
  }
  if (r.topic === 'company.application') {
    const ref = esc(String(p.ref ?? ''));
    return {
      subject: 'Pengajuan Company Partner VIBOXS diterima',
      paras: [hello, `Pengajuan perusahaan Anda dengan nomor referensi <b>${ref}</b> sudah kami terima.`, 'Tim VIBOXS akan meninjau data yang dikirim. Status terbaru akan dikirim ke email ini.',
        'Anda belum memperoleh akses Talent Discovery sampai verifikasi selesai.'],
    };
  }
  if (r.topic === 'company.status') {
    const ref = esc(String(p.ref ?? ''));
    const st = String(p.status ?? '');
    const note = typeof p.note === 'string' && p.note ? `Catatan reviewer: ${esc(p.note)}` : '';
    const line: Record<string, string> = {
      REVIEW: 'Pengajuan Anda sedang ditinjau tim VIBOXS.',
      NEED_INFO: 'Kami membutuhkan informasi tambahan sebelum verifikasi dapat dilanjutkan. Balas email ini dengan data yang diminta.',
      REJECTED: 'Mohon maaf, pengajuan perusahaan Anda belum dapat kami setujui.',
      VERIFIED: 'Perusahaan Anda terverifikasi. Undangan aktivasi Company Workspace dikirim terpisah ke email PIC.',
      SUSPENDED: 'Akses Company Workspace perusahaan Anda ditangguhkan.',
    };
    if (!line[st]) return null;
    return { subject: `Status pengajuan Company Partner ${ref}`, paras: [hello, line[st], note].filter(Boolean) };
  }
  // v4 §08.3: email "Program tayang" hanya setelah EDU ACK (diantre trigger st_program_mail).
  if (r.topic === 'program.published') {
    const slug = typeof p.slug === 'string' && /^[a-z0-9-]+$/.test(p.slug) ? p.slug : '';
    const digital = p.type === 'ebook' || p.type === 'kit';
    return {
      subject: 'Program Anda sudah tayang di VIBOXS EDU',
      paras: [hello, `Program <b>${esc(String(p.title ?? ''))}</b> sudah disetujui dan kini tayang di katalog VIBOXS EDU.`,
        'Perubahan yang memengaruhi harga, jadwal, atau isi program perlu diajukan ulang untuk review.'],
      cta: slug ? { label: 'Lihat di EDU', url: `https://edu.viboxs.com/${digital ? 'digital-library' : 'programs'}/${slug}` } : { label: 'Buka Studio', url: `${STUDIO_ORIGIN}/creator/programs` },
    };
  }
  // v4 §15 "Pembayaran berhasil" — tanpa lampiran atau tautan bukti bank internal (V4-BP-008/009).
  if (r.topic === 'payout.paid') {
    const amt = Number(p.amount ?? 0).toLocaleString('id-ID');
    const day = new Date(String(p.paid_at)).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long' });
    const link = typeof p.link === 'string' && p.link.startsWith('/') ? p.link : '/workspace';
    return {
      subject: p.partial === true ? 'Pembayaran sebagian berhasil' : 'Pembayaran berhasil',
      paras: [hello, `<b>${p.partial === true ? 'Pembayaran sebagian berhasil.' : 'Pembayaran berhasil.'}</b> Pembayaran untuk ${esc(String(p.category ?? 'honor VIBOXS'))} telah diproses dan dikonfirmasi pada ${esc(day)}.`,
        `Rincian: ${esc(String(p.label ?? ''))} · Rp${esc(amt)} · referensi ${esc(String(p.reference_masked ?? '••••'))}.`,
        'Rincian nominal dan histori tersedia di Studio. Bukti bank bersifat internal dan tidak dilampirkan.'],
      cta: { label: 'Lihat di Studio', url: `${STUDIO_ORIGIN}${link}` },
    };
  }
  return null;
}

function html(m: Mail) {
  const p = m.paras.map((x) => `<p style="margin:0 0 14px;line-height:1.6">${x}</p>`).join('');
  const b = m.cta ? `<p style="margin:22px 0"><a href="${esc(m.cta.url)}" style="background:#FF4A26;color:#111;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block">${esc(m.cta.label)}</a></p>
<p style="margin:0 0 14px;font-size:12px;color:#666">Jika tombol tidak berfungsi, salin tautan ini ke browser: <br><span style="word-break:break-all">${esc(m.cta.url)}</span></p>` : '';
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111;max-width:560px;margin:0 auto;padding:24px">
<p style="font-weight:700;letter-spacing:.08em;margin:0 0 20px">VIBOXS</p>${p}${b}
<p style="margin:24px 0 0;font-size:12px;color:#666">Email ini dikirim otomatis oleh VIBOXS Studio. VIBOXS tidak pernah meminta password Anda melalui email atau WhatsApp.<br>PT Ekosistem Pelosok Hub · admin@viboxs.com</p></div>`;
}
const text = (m: Mail) => [...m.paras.map((x) => x.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&')), m.cta ? `${m.cta.label}: ${m.cta.url}` : ''].filter(Boolean).join('\n\n');

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (req.method !== 'POST') return json({ error: 'method' }, 405, origin);

  const host = Deno.env.get('SMTP_HOST'), user = Deno.env.get('SMTP_USER'), pass = Deno.env.get('SMTP_PASS');
  if (!host || !user || !pass) return json({ error: 'SMTP belum dikonfigurasi.' }, 503, origin);
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc('st_outbox_claim', { p_limit: 10 });
  if (error) { console.error('claim', error.message); return json({ error: 'outbox' }, 500, origin); }
  const rows = (data ?? []) as Row[];
  if (!rows.length) return json({ processed: 0 }, 200, origin);

  const port = Number(Deno.env.get('SMTP_PORT') ?? 465);
  const t = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  let sent = 0, failed = 0;
  for (const r of rows) {
    let ok = false, err = '';
    try {
      const m = render(r);
      if (!m) err = r.topic === 'invite.activation' ? 'TOKEN_EXPIRED: undangan kedaluwarsa atau sudah diganti — kirim ulang dari Commander' : `template tidak dikenal: ${r.template}`;
      else { await t.sendMail({ from: `VIBOXS <${user}>`, to: r.recipient, replyTo: 'admin@viboxs.com', subject: m.subject, text: text(m), html: html(m) }); ok = true; }
    } catch (e) { err = String((e as Error)?.message ?? e).slice(0, 200); }
    await sb.rpc('st_outbox_done', { p_id: r.id, p_ok: ok, p_error: ok ? null : err });
    if (ok) sent++; else { failed++; console.error('outbox', r.id, r.template, err.startsWith('TOKEN_EXPIRED') ? 'TOKEN_EXPIRED' : err); }
  }
  return json({ processed: rows.length, sent, failed }, 200, origin);
});
