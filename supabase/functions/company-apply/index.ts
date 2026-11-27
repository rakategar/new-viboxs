// Pengajuan Company Partner tanpa akun dari edu.viboxs.com/for-companies (v4 WP02, QA V4-CA-001..012).
// POST /functions/v1/company-apply  { ...kolom, idem_key, logo: {type, b64}, nib_doc: {type, b64}, _hp }
// Server: honeypot, batas ukuran, validasi magic bytes (PNG/JPEG/WebP; SVG ditolak — ADR-3), hapus EXIF/metadata,
// simpan ke bucket privat st-company/companies/{id}/…, lalu st_company_submit (validasi kolom, idempoten, outbox email).
// Akun & role TIDAK dibuat di sini — undangan aman dikirim setelah Commander memverifikasi.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const ORIGINS = ['https://edu.viboxs.com', 'https://studio.viboxs.com'];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const LOGO_MAX = 2 * 1024 * 1024, DOC_MAX = 5 * 1024 * 1024;
const cors = (o: string | null) => ({
  'Access-Control-Allow-Origin': o && (ORIGINS.includes(o) || LOCAL.test(o)) ? o : ORIGINS[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
  'Vary': 'Origin',
});
const json = (b: unknown, s: number, o: string | null) => new Response(JSON.stringify(b), { status: s, headers: { ...cors(o), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const str = (v: unknown, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

type Kind = 'png' | 'jpeg' | 'webp' | 'pdf';
const MIME: Record<Kind, string> = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp', pdf: 'application/pdf' };
const EXT: Record<Kind, string> = { png: 'png', jpeg: 'jpg', webp: 'webp', pdf: 'pdf' };

function sniff(b: Uint8Array): Kind | 'svg' | null {
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'png';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return 'webp';
  if (b.length > 5 && String.fromCharCode(...b.slice(0, 5)) === '%PDF-') return 'pdf';
  const head = new TextDecoder().decode(b.slice(0, 512)).toLowerCase();
  if (head.includes('<svg') || head.includes('<?xml')) return 'svg';
  return null;
}

/** PNG: buang chunk metadata (eXIf, tEXt, zTXt, iTXt, tIME). Chunk gambar & warna dipertahankan. */
function stripPng(b: Uint8Array): Uint8Array {
  const drop = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);
  const out: Uint8Array[] = [b.slice(0, 8)];
  let i = 8;
  while (i + 12 <= b.length) {
    const len = new DataView(b.buffer, b.byteOffset + i, 4).getUint32(0);
    const type = String.fromCharCode(...b.slice(i + 4, i + 8));
    const end = i + 12 + len;
    if (end > b.length) throw new Error('PNG rusak.');
    if (!drop.has(type)) out.push(b.slice(i, end));
    i = end;
    if (type === 'IEND') break;
  }
  return concat(out);
}

/** JPEG: buang segmen APP1 (EXIF/XMP, termasuk GPS), APP13 (IPTC) dan komentar sebelum data gambar. */
function stripJpeg(b: Uint8Array): Uint8Array {
  const out: Uint8Array[] = [b.slice(0, 2)];
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) throw new Error('JPEG rusak.');
    const m = b[i + 1];
    if (m === 0xda) { out.push(b.slice(i)); return concat(out); } // SOS: sisa file = data gambar
    const len = (b[i + 2] << 8) | b[i + 3];
    const end = i + 2 + len;
    if (len < 2 || end > b.length) throw new Error('JPEG rusak.');
    if (!(m === 0xe1 || m === 0xed || m === 0xfe)) out.push(b.slice(i, end));
    i = end;
  }
  throw new Error('JPEG rusak.');
}

/** WebP: buang chunk EXIF & XMP dan matikan flag-nya di VP8X; ukuran RIFF dihitung ulang. */
function stripWebp(b: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [];
  let i = 12;
  while (i + 8 <= b.length) {
    const type = String.fromCharCode(...b.slice(i, i + 4));
    const len = new DataView(b.buffer, b.byteOffset + i + 4, 4).getUint32(0, true);
    const end = i + 8 + len + (len % 2);
    if (i + 8 + len > b.length) throw new Error('WebP rusak.');
    if (type !== 'EXIF' && type !== 'XMP ') {
      const c = b.slice(i, Math.min(end, b.length));
      if (type === 'VP8X' && c.length > 8) c[8] &= ~0x0c;
      parts.push(c);
    }
    i = end;
  }
  const body = concat(parts);
  const head = new Uint8Array(12);
  head.set(b.slice(0, 4), 0);
  new DataView(head.buffer).setUint32(4, body.length + 4, true);
  head.set(b.slice(8, 12), 8);
  return concat([head, body]);
}

function concat(a: Uint8Array[]) {
  const out = new Uint8Array(a.reduce((n, x) => n + x.length, 0));
  let o = 0;
  for (const x of a) { out.set(x, o); o += x.length; }
  return out;
}

function decode(f: unknown, max: number, allowPdf: boolean): { kind: Kind; bytes: Uint8Array } | string {
  const b64 = f && typeof f === 'object' ? (f as Record<string, unknown>).b64 : null;
  if (typeof b64 !== 'string' || !b64) return 'File belum dipilih.';
  if (b64.length > Math.ceil(max / 3) * 4 + 8) return `Ukuran file maksimal ${Math.round(max / 1024 / 1024)} MB.`;
  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(atob(b64.replace(/^data:[^,]*,/, '')), (c) => c.charCodeAt(0)); } catch { return 'File tidak terbaca.'; }
  if (bytes.length > max) return `Ukuran file maksimal ${Math.round(max / 1024 / 1024)} MB.`;
  const k = sniff(bytes);
  if (k === 'svg') return 'SVG belum didukung demi keamanan. Unggah PNG, JPG, atau WebP.';
  if (!k || (k === 'pdf' && !allowPdf)) return allowPdf ? 'Format harus PDF, PNG, JPG, atau WebP.' : 'Format logo harus PNG, JPG, atau WebP.';
  try {
    const clean = k === 'png' ? stripPng(bytes) : k === 'jpeg' ? stripJpeg(bytes) : k === 'webp' ? stripWebp(bytes) : bytes;
    return { kind: k, bytes: clean };
  } catch (e) { return (e as Error).message; }
}

async function sha(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d), (x) => x.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (req.method !== 'POST') return json({ error: 'method' }, 405, origin);
  const raw = await req.text();
  if (raw.length > 10_500_000) return json({ error: 'Total file terlalu besar.' }, 413, origin);
  let p: Record<string, unknown>;
  try { p = JSON.parse(raw); } catch { return json({ error: 'json' }, 400, origin); }
  if (!p || typeof p !== 'object' || Array.isArray(p)) return json({ error: 'json' }, 400, origin);
  if (str(p._hp) || str(p.website_hp)) return json({ ref: 'CMP-' + crypto.randomUUID().slice(0, 6).toUpperCase() }, 200, origin);

  const logo = decode(p.logo, LOGO_MAX, false);
  if (typeof logo === 'string') return json({ error: `Logo: ${logo}`, field: 'logo' }, 422, origin);
  const doc = decode(p.nib_doc, DOC_MAX, true);
  if (typeof doc === 'string') return json({ error: `Dokumen NIB: ${doc}`, field: 'nib_doc' }, 422, origin);

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const id = crypto.randomUUID();
  const logoPath = `companies/${id}/logo.${EXT[logo.kind]}`;
  const docPath = `companies/${id}/nib.${EXT[doc.kind]}`;
  const up1 = await sb.storage.from('st-company').upload(logoPath, logo.bytes, { contentType: MIME[logo.kind], upsert: false });
  const up2 = up1.error ? up1 : await sb.storage.from('st-company').upload(docPath, doc.bytes, { contentType: MIME[doc.kind], upsert: false });
  const cleanup = () => sb.storage.from('st-company').remove([logoPath, docPath]);
  if (up1.error || up2.error) { console.error('upload', (up1.error ?? up2.error)?.message); await cleanup(); return json({ error: 'File belum bisa disimpan. Coba lagi.' }, 500, origin); }

  const fields = ['legal_name', 'nib', 'industry', 'address', 'website', 'business_email', 'company_whatsapp', 'pic_name', 'pic_role', 'pic_email', 'purpose', 'hiring_needs', 'idem_key'] as const;
  const body: Record<string, unknown> = Object.fromEntries(fields.map((k) => [k, str(p[k], k === 'hiring_needs' || k === 'address' ? 2000 : 200)]));
  Object.assign(body, {
    id, logo_path: logoPath, nib_doc_path: docPath, logo_rights: p.logo_rights === true, authority_statement: p.authority_statement === true,
    data_consent: p.data_consent === true, comm_consent_wa: p.comm_consent_wa === true, terms_version: 'company-terms-draft-2026-11',
  });
  const { data, error } = await sb.rpc('st_company_submit', { p: body, p_source: 'edu', p_owner: null, p_ip_hash: await sha(`${ip}|viboxs-company`) });
  if (error) { await cleanup(); return json({ error: error.message.replace(/^.*?ERROR:\s*/, '') }, 422, origin); }
  const r = data as { id: string; ref: string; duplicate: boolean };
  if (r.duplicate) await cleanup();

  // Kirim email konfirmasi sekarang; bila gagal, pg_cron mengulang tiap 5 menit.
  const kick = fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/st-notify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => null);
  // @ts-ignore EdgeRuntime tersedia di Supabase
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(kick); else await kick;
  return json({ ref: r.ref, duplicate: r.duplicate }, 200, origin);
});
