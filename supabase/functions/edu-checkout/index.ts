// Checkout EDU — satu backend untuk guest (edu.viboxs.com) dan member (studio.viboxs.com).
// POST /functions/v1/edu-checkout  { slug, name, email, phone?, idempotency_key, member?: boolean, qa?: boolean, _hp? }
// Harga & status program dibaca dari DB lewat edu_create_order (bukan dari klien). Program berbayar → Snap Midtrans (hosted).
// Status bayar TIDAK pernah ditentukan di sini: hanya midtrans-webhook / edu-order (cek status server-ke-server).
// Secret: MIDTRANS_SERVER_KEY, MIDTRANS_IS_PRODUCTION ("true"/"false"); opsional SMTP_* & EDU_LINK_SECRET untuk email akses.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import nodemailer from 'npm:nodemailer@6.9.16';

const EDU = 'https://edu.viboxs.com', STUDIO = 'https://studio.viboxs.com';
const ORIGINS = [EDU, STUDIO];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const SB_URL = Deno.env.get('SUPABASE_URL')!;

const cors = (o: string | null) => ({
  'Access-Control-Allow-Origin': o && (ORIGINS.includes(o) || LOCAL.test(o)) ? o : EDU,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
  'Vary': 'Origin',
});
const json = (b: unknown, s: number, o: string | null) => new Response(JSON.stringify(b), { status: s, headers: { ...cors(o), 'Content-Type': 'application/json' } });
const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** Pesan aman untuk pengguna dari kode error RPC. */
const ERR: Record<string, [number, string]> = {
  PROGRAM_NOT_FOUND: [404, 'Program tidak ditemukan atau belum terbit.'],
  PROGRAM_CLOSED: [409, 'Pendaftaran program ini sudah ditutup.'],
  PRICE_NOT_SET: [409, 'Harga program belum diumumkan.'],
  PAYMENTS_DISABLED: [409, 'Pembayaran online sedang disiapkan.'],
  SOLD_OUT: [409, 'Kuota program sudah penuh.'],
  RATE_LIMITED: [429, 'Terlalu banyak percobaan. Coba lagi sekitar satu jam lagi.'],
  IDEMPOTENCY_CONFLICT: [409, 'Permintaan bentrok dengan order lain. Muat ulang halaman lalu coba lagi.'],
  EMAIL_INVALID: [422, 'Email tidak valid.'],
  NAME_REQUIRED: [422, 'Nama wajib diisi.'],
  IDEMPOTENCY_REQUIRED: [422, 'Permintaan tidak lengkap. Muat ulang halaman.'],
};

export async function linkSig(orderNo: string, exp: number) {
  const secret = Deno.env.get('EDU_LINK_SECRET') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(`${orderNo}.${exp}`))).slice(0, 40);
}

async function mailAccess(to: string, name: string, title: string, link: string, paid: boolean): Promise<string> {
  const host = Deno.env.get('SMTP_HOST'), user = Deno.env.get('SMTP_USER'), pass = Deno.env.get('SMTP_PASS');
  if (!host || !user || !pass) return 'no_smtp';
  const port = Number(Deno.env.get('SMTP_PORT') ?? 465);
  const t = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  const head = paid ? 'Pembayaran terverifikasi' : 'Pendaftaran tercatat';
  const text = `Halo ${name},\n\n${head} untuk "${title}".\nBuka detail akses (tautan pribadi, berlaku 30 hari):\n${link}\n\nJangan teruskan email ini — tautan sesi hanya untuk kamu.\n\nVIBOXS EDU · PT EPH`;
  await t.sendMail({
    from: `VIBOXS EDU <${user}>`, to, subject: `${head} — ${title}`, text,
    html: `<div style="font-family:sans-serif;font-size:15px;line-height:1.5;max-width:520px"><p>Halo ${esc(name)},</p><p><b>${head}</b> untuk “${esc(title)}”.</p><p><a href="${esc(link)}" style="display:inline-block;background:#FF4A26;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Buka detail akses</a></p><p style="color:#666;font-size:13px">Tautan pribadi, berlaku 30 hari. Jangan diteruskan — tautan sesi hanya untuk kamu.</p><p style="color:#666;font-size:13px">VIBOXS EDU · PT EPH</p></div>`,
  });
  return 'sent_smtp';
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (req.method !== 'POST') return json({ error: 'method' }, 405, origin);
  let p: Record<string, unknown>;
  try { p = await req.json(); } catch { return json({ error: 'json' }, 400, origin); }
  if (str(p._hp)) return json({ error: 'Permintaan ditolak.' }, 400, origin);

  const sb = createClient(SB_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const local = !!origin && LOCAL.test(origin);
  const production = Deno.env.get('MIDTRANS_IS_PRODUCTION') === 'true';
  const serverKey = (Deno.env.get('MIDTRANS_SERVER_KEY') ?? '').trim();

  // Member: identitas dari JWT Studio, bukan dari body. Email wajib terverifikasi.
  let buyer: string | null = null, email = str(p.email).toLowerCase(), member = false;
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (p.member === true) {
    const { data } = jwt ? await sb.auth.getUser(jwt) : { data: { user: null } };
    if (!data.user) return json({ error: 'Sesi Studio berakhir. Masuk lagi untuk checkout.' }, 401, origin);
    if (!data.user.email_confirmed_at) return json({ error: 'Verifikasi email akun dulu sebelum checkout.' }, 403, origin);
    buyer = data.user.id; email = (data.user.email ?? '').toLowerCase(); member = true;
  }

  // Ringan: batasi per IP (hash) — 15 order / 10 menit
  const ipHash = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'x'}|edu`))).slice(0, 32);
  const { count } = await sb.from('edu_orders').select('id', { count: 'exact', head: true }).eq('attribution->>ip', ipHash).gte('created_at', new Date(Date.now() - 600e3).toISOString());
  if ((count ?? 0) >= 15) return json({ error: ERR.RATE_LIMITED[1] }, 429, origin);

  const { data: flag } = await sb.from('st_flags').select('enabled').eq('key', 'edu_payments_enabled').maybeSingle();
  // Header Origin bisa dipalsukan → "lokal" tidak pernah membuka pembayaran. Mode sandbox hanya untuk fixture QA
  // (data.qa = true, tidak terbit); program publik berbayar hanya bila flag ON *dan* Midtrans mode production.
  const qa = p.qa === true && !production;
  const allowPaid = !!serverKey && (qa || (production && flag?.enabled === true));
  const base = member ? (local ? origin! : STUDIO) : (origin && (origin === EDU || local) ? origin : EDU);
  const slug = str(p.slug, 120);

  const { data: o, error } = await sb.rpc('edu_create_order', {
    p_slug: slug, p_email: email, p_name: str(p.name, 120), p_phone: str(p.phone, 30) || null, p_buyer: buyer,
    p_source: member ? 'STUDIO_MEMBER' : 'EDU_PUBLIC_GUEST', p_idem: str(p.idempotency_key, 80), p_allow_paid: allowPaid,
    p_return_to: base, p_policy: { terms: str(p.terms_version, 60) || 'edu-terms-draft-2026-11', privacy: str(p.privacy_version, 60) || 'edu-privacy-draft-2026-11' },
    p_attr: { ip: ipHash, origin: origin ?? '', marketing: p.marketing === true, ua: str(req.headers.get('user-agent'), 160) }, p_qa: qa,
  });
  if (error) {
    const m = error.message ?? '';
    const owned = m.match(/ALREADY_OWNED:(\S+)/);
    if (owned) return json({ error: 'Kamu sudah memiliki akses ke program ini.', code: 'ALREADY_OWNED', order_no: owned[1] }, 409, origin);
    const code = Object.keys(ERR).find((k) => m.includes(k));
    if (!code) console.error('edu_create_order', m);
    return json({ error: code ? ERR[code][1] : 'Order belum bisa dibuat. Coba lagi.', code }, code ? ERR[code][0] : 500, origin);
  }

  const orderPage = member ? `${base}/learn/orders/${o.order_no}` : `${base}/order/${o.order_no}`;
  if (o.existing) return json({ order_no: o.order_no, status: o.status, redirect_url: o.redirect_url ?? null, existing: true }, 200, origin);

  if (o.status === 'PAYMENT_PENDING') {
    const snapUrl = production ? 'https://app.midtrans.com/snap/v1/transactions' : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
    try {
      const r = await fetch(snapUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Basic ${btoa(`${serverKey}:`)}`,
          'X-Override-Notification': `${SB_URL}/functions/v1/midtrans-webhook`,
        },
        body: JSON.stringify({
          transaction_details: { order_id: o.order_no, gross_amount: Math.round(Number(o.cash)) },
          item_details: [{ id: slug.slice(0, 50), price: Math.round(Number(o.cash)), quantity: 1, name: String(o.item).slice(0, 50) }],
          customer_details: { first_name: str(p.name, 50), email, phone: str(p.phone, 20) || undefined },
          callbacks: { finish: orderPage },
          expiry: { unit: 'minute', duration: 60 },
        }),
        signal: AbortSignal.timeout(15000),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.redirect_url) throw new Error(`snap ${r.status}: ${JSON.stringify(j.error_messages ?? j).slice(0, 200)}`);
      await sb.rpc('edu_set_gateway', { p_order_no: o.order_no, p_env: production ? 'production' : 'sandbox', p_redirect: j.redirect_url, p_error: null });
      await sb.from('edu_payment_events').insert({ order_no: o.order_no, order_id: o.order_id, source: 'checkout', verified: false, transition: 'snap_created', payload: { env: production ? 'production' : 'sandbox' } });
      return json({ order_no: o.order_no, status: o.status, access_token: o.access_token, redirect_url: j.redirect_url }, 200, origin);
    } catch (e) {
      console.error(e);
      await sb.rpc('edu_set_gateway', { p_order_no: o.order_no, p_env: null, p_redirect: null, p_error: String(e) });
      return json({ error: 'Penyedia pembayaran belum merespons. Tidak ada tagihan yang dibuat — coba lagi beberapa saat.', order_no: o.order_no }, 502, origin);
    }
  }

  // Gratis: langsung FULFILLED di server. Email akses bila SMTP tersedia.
  const exp = Math.floor(Date.now() / 1000) + 30 * 86400;
  const link = member ? orderPage : `${orderPage}#s=${exp}.${await linkSig(o.order_no, exp)}`;
  const task = mailAccess(email, str(p.name, 120), String(o.item), link, false).catch((e) => `failed: ${String(e).slice(0, 120)}`)
    .then((s) => sb.from('edu_orders').update({ access_email_status: s }).eq('order_no', o.order_no));
  // @ts-ignore EdgeRuntime tersedia di Supabase
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(task); else await task;
  return json({ order_no: o.order_no, status: o.status, access_token: o.access_token }, 200, origin);
});
