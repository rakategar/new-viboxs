// Status & akses order EDU — hanya untuk pemilik: token akses guest, tautan email bertanda tangan, atau JWT pembeli (Studio).
// POST /functions/v1/edu-order  { order_no, token?, sig?, refresh? }
// refresh=true → cek status langsung ke Midtrans (server-ke-server) untuk order PAYMENT_PENDING (CHE-010), bukan dari URL redirect (CHE-008).
// Akses webinar/e-book hanya keluar bila entitlement aktif; file e-book lewat signed URL 10 menit (CHE-012/013).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const ORIGINS = ['https://edu.viboxs.com', 'https://studio.viboxs.com'];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const cors = (o: string | null) => ({
  'Access-Control-Allow-Origin': o && (ORIGINS.includes(o) || LOCAL.test(o)) ? o : ORIGINS[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
  'Vary': 'Origin',
});
const json = (b: unknown, s: number, o: string | null) => new Response(JSON.stringify(b), { status: s, headers: { ...cors(o), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');

async function linkSig(orderNo: string, exp: number) {
  const secret = Deno.env.get('EDU_LINK_SECRET') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(`${orderNo}.${exp}`))).slice(0, 40);
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (req.method !== 'POST') return json({ error: 'method' }, 405, origin);
  let p: Record<string, unknown>;
  try { p = await req.json(); } catch { return json({ error: 'json' }, 400, origin); }
  const orderNo = typeof p.order_no === 'string' ? p.order_no.trim().toUpperCase() : '';
  if (!/^EDU\d{6}-[A-F0-9]{8}$/.test(orderNo)) return json({ error: 'Order tidak ditemukan.' }, 404, origin);

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  let uid: string | null = null;
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (jwt && jwt.split('.').length === 3) {
    const { data } = await sb.auth.getUser(jwt);
    uid = data.user?.id ?? null;
  }
  let trusted = false;
  const sig = typeof p.sig === 'string' ? p.sig : '';
  const m = sig.match(/^(\d{10})\.([a-f0-9]{40})$/);
  if (m && Number(m[1]) > Date.now() / 1000 && (await linkSig(orderNo, Number(m[1]))) === m[2]) trusted = true;
  const token = typeof p.token === 'string' && /^[a-f0-9]{48}$/.test(p.token) ? p.token : null;

  const view = async () => (await sb.rpc('edu_order_view', { p_order_no: orderNo, p_token: token, p_uid: uid, p_trusted: trusted })).data as Record<string, unknown> | null;
  let v = await view();
  if (!v) return json({ error: 'Order tidak ditemukan atau tautan tidak berlaku.' }, 404, origin);

  if (p.refresh === true && v.status === 'PAYMENT_PENDING') {
    const serverKey = (Deno.env.get('MIDTRANS_SERVER_KEY') ?? '').trim();
    const api = Deno.env.get('MIDTRANS_IS_PRODUCTION') === 'true' ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
    try {
      const r = await fetch(`${api}/v2/${encodeURIComponent(orderNo)}/status`, { headers: { Accept: 'application/json', Authorization: `Basic ${btoa(`${serverKey}:`)}` }, signal: AbortSignal.timeout(10000) });
      const s = await r.json();
      if (r.ok && s.transaction_status) {
        await sb.rpc('edu_apply_payment', { p_order_no: orderNo, p_txn_status: s.transaction_status, p_fraud: s.fraud_status ?? null, p_gross: Number(s.gross_amount),
          p_txn_id: s.transaction_id ?? null, p_payment_type: s.payment_type ?? null, p_source: 'status_check', p_signature_valid: null, p_payload: { status_code: s.status_code } });
        v = await view();
      }
      // 404 dari Midtrans = pembeli belum memilih metode bayar; status tetap menunggu.
    } catch (e) { console.error('status check', e); }
  }

  const access = v!.access as Record<string, unknown> | null;
  if (access?.ebook_path) {
    const { data } = await sb.storage.from('edu-private').createSignedUrl(String(access.ebook_path), 600, { download: true });
    access.ebook_url = data?.signedUrl ?? null;
    delete access.ebook_path;
  }
  delete v!.program_id;
  return json(v, 200, origin);
});
