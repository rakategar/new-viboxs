// Notifikasi HTTP Midtrans → status order EDU.
// 1) verifikasi signature_key = SHA512(order_id + status_code + gross_amount + Signature Secret Key)  (CHE-007)
//    Sejak 28 Okt 2026 Midtrans memakai Signature Secret Key (Settings → Access Keys → Payment), terpisah dari Server Key.
//    Secret MIDTRANS_SIGNATURE_KEY; boleh dipisah koma saat rotasi (key lama + baru). Tanpa itu → jatuh ke Server Key (akun lama).
// 2) ambil ulang status dari API Midtrans (server-ke-server) — payload webhook tidak dipercaya sendirian
// 3) edu_apply_payment: transisi idempoten (webhook ganda = satu PAID, satu entitlement) (CHE-009)
// 4) PAID pertama kali → email akses dengan tautan bertanda tangan & berbatas waktu (bila SMTP tersedia)
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import nodemailer from 'npm:nodemailer@6.9.16';

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const ok = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function linkSig(orderNo: string, exp: number) {
  const secret = Deno.env.get('EDU_LINK_SECRET') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(`${orderNo}.${exp}`))).slice(0, 40);
}

async function mailAccess(to: string, name: string, title: string, link: string): Promise<string> {
  const host = Deno.env.get('SMTP_HOST'), user = Deno.env.get('SMTP_USER'), pass = Deno.env.get('SMTP_PASS');
  if (!host || !user || !pass) return 'no_smtp';
  const port = Number(Deno.env.get('SMTP_PORT') ?? 465);
  const t = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  await t.sendMail({
    from: `VIBOXS EDU <${user}>`, to, subject: `Pembayaran terverifikasi — ${title}`,
    text: `Halo ${name},\n\nPembayaran untuk "${title}" sudah terverifikasi.\nBuka detail akses (tautan pribadi, berlaku 30 hari):\n${link}\n\nJangan teruskan email ini.\n\nVIBOXS EDU · PT EPH`,
    html: `<div style="font-family:sans-serif;font-size:15px;line-height:1.5;max-width:520px"><p>Halo ${esc(name)},</p><p>Pembayaran untuk “${esc(title)}” <b>sudah terverifikasi</b>.</p><p><a href="${esc(link)}" style="display:inline-block;background:#FF4A26;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Buka detail akses</a></p><p style="color:#666;font-size:13px">Tautan pribadi, berlaku 30 hari. Jangan diteruskan.</p><p style="color:#666;font-size:13px">VIBOXS EDU · PT EPH</p></div>`,
  });
  return 'sent_smtp';
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return ok({ error: 'method' }, 405);
  const serverKey = (Deno.env.get('MIDTRANS_SERVER_KEY') ?? '').trim();
  if (!serverKey) return ok({ error: 'not configured' }, 503);
  const production = Deno.env.get('MIDTRANS_IS_PRODUCTION') === 'true';
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  const sigKeys = (Deno.env.get('MIDTRANS_SIGNATURE_KEY') ?? serverKey).split(',').map((k) => k.trim()).filter(Boolean);

  const raw = await req.text();
  let n: Record<string, string>;
  try { n = JSON.parse(raw); } catch { return ok({ error: 'json' }, 400); }
  const orderId = String(n.order_id ?? ''), statusCode = String(n.status_code ?? ''), gross = String(n.gross_amount ?? '');
  let valid = false;
  for (const k of sigKeys) {
    const expected = hex(await crypto.subtle.digest('SHA-512', new TextEncoder().encode(orderId + statusCode + gross + k)));
    if (safeEqual(expected, String(n.signature_key ?? ''))) valid = true;
  }
  if (!orderId || !valid) {
    await sb.from('edu_payment_events').insert({ order_no: orderId.slice(0, 60) || null, source: 'webhook', transaction_status: String(n.transaction_status ?? '').slice(0, 40),
      signature_valid: false, verified: false, transition: 'rejected_signature', payload: { status_code: statusCode, gross_amount: gross, sig_key_source: Deno.env.get('MIDTRANS_SIGNATURE_KEY') ? 'signature_key' : 'server_key' } });
    return ok({ error: 'invalid signature' }, 403);
  }
  if (!/^EDU\d{6}-[A-F0-9]{8}$/.test(orderId)) return ok({ ignored: true }); // notifikasi uji dari dashboard / produk lain

  // Sumber kebenaran: status langsung dari API Midtrans
  const api = production ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
  let s: Record<string, string>;
  try {
    const r = await fetch(`${api}/v2/${encodeURIComponent(orderId)}/status`, { headers: { Accept: 'application/json', Authorization: `Basic ${btoa(`${serverKey}:`)}` }, signal: AbortSignal.timeout(12000) });
    s = await r.json();
    if (!r.ok || !s.transaction_status) throw new Error(`status ${r.status}`);
  } catch (e) {
    console.error('status check', e);
    return ok({ error: 'status check failed' }, 502); // Midtrans akan mengirim ulang
  }

  const { data, error } = await sb.rpc('edu_apply_payment', {
    p_order_no: orderId, p_txn_status: s.transaction_status, p_fraud: s.fraud_status ?? null, p_gross: Number(s.gross_amount),
    p_txn_id: s.transaction_id ?? null, p_payment_type: s.payment_type ?? null, p_source: 'webhook', p_signature_valid: true,
    p_payload: { status_code: s.status_code, transaction_time: s.transaction_time, settlement_time: s.settlement_time, refund_amount: s.refund_amount, env: production ? 'production' : 'sandbox',
      refund_key: Array.isArray((s as unknown as { refunds?: { refund_key: string }[] }).refunds) ? (s as unknown as { refunds: { refund_key: string }[] }).refunds.map((x) => x.refund_key).join(',') : undefined },
  });
  if (error) { console.error('apply', error); return ok({ error: 'apply failed' }, 500); }

  if (data?.transition === 'paid') {
    const { data: o } = await sb.from('edu_orders').select('order_no, email, buyer_name, order_source, return_to, product').eq('order_no', orderId).single();
    if (o) {
      const exp = Math.floor(Date.now() / 1000) + 30 * 86400;
      const link = o.order_source === 'STUDIO_MEMBER' ? `${o.return_to ?? 'https://studio.viboxs.com'}/learn/orders/${o.order_no}`
        : `${o.return_to ?? 'https://edu.viboxs.com'}/order/${o.order_no}#s=${exp}.${await linkSig(o.order_no, exp)}`;
      const st = await mailAccess(o.email, o.buyer_name, String(o.product?.title ?? 'Program EDU'), link).catch((e) => `failed: ${String(e).slice(0, 120)}`);
      await sb.from('edu_orders').update({ access_email_status: st }).eq('order_no', o.order_no);
    }
  }
  return ok({ ok: true, transition: data?.transition });
});
