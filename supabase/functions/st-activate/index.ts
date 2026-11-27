// Aktivasi akun dari tautan undangan (v4 WP01, QA V4-AT-001..008).
// POST /functions/v1/st-activate  { token, password }
// Pemegang tautan sekali pakai membuat password sendiri. Akun dibuat dengan email yang diundang (username = email),
// langsung terverifikasi karena kepemilikan email sudah dibuktikan oleh tautan. Peran TIDAK diberikan di sini:
// browser lalu masuk dan memanggil st_accept_invite (aturan peran, sekali pakai, dan audit tetap di satu tempat).
// Password tidak pernah ditulis ke log, database aplikasi, atau email.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const ORIGINS = ['https://studio.viboxs.com'];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const cors = (o: string | null) => ({
  'Access-Control-Allow-Origin': o && (ORIGINS.includes(o) || LOCAL.test(o)) ? o : ORIGINS[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
  'Vary': 'Origin',
});
const json = (b: unknown, s: number, o: string | null) => new Response(JSON.stringify(b), { status: s, headers: { ...cors(o), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/** Aturan minimum (OWASP ASVS): ≥10 karakter, ≤72 (batas bcrypt), huruf + angka, bukan turunan email. */
function weak(pw: string, email: string): string | null {
  if (pw.length < 10) return 'Password minimal 10 karakter.';
  if (pw.length > 72) return 'Password maksimal 72 karakter.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Gunakan kombinasi huruf dan angka.';
  if (/^(.)\1+$/.test(pw)) return 'Password terlalu mudah ditebak.';
  const local = email.split('@')[0].toLowerCase();
  if (local.length >= 4 && pw.toLowerCase().includes(local)) return 'Password tidak boleh memuat nama email Anda.';
  if (/^(password|qwerty|12345|viboxs|admin)/i.test(pw)) return 'Password terlalu umum.';
  return null;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (req.method !== 'POST') return json({ error: 'method' }, 405, origin);
  let p: Record<string, unknown>;
  try { p = await req.json(); } catch { return json({ error: 'json' }, 400, origin); }
  const token = typeof p.token === 'string' ? p.token.trim() : '';
  const password = typeof p.password === 'string' ? p.password : '';
  if (!/^[a-f0-9]{48}$/.test(token)) return json({ state: 'invalid', error: 'Tautan undangan tidak valid.' }, 404, origin);

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: inv, error } = await sb.rpc('st_invite_for_activation', { p_token: token });
  if (error) { console.error('activation lookup', error.message); return json({ error: 'Server sibuk. Coba lagi.' }, 500, origin); }
  const i = inv as { state: string; email?: string; name?: string | null; has_account?: boolean };
  if (i.state !== 'pending' || !i.email) return json({ state: i.state, error: 'Undangan tidak dapat dipakai.' }, 410, origin);
  if (i.has_account) return json({ state: 'has_account', email: i.email }, 409, origin);
  const w = weak(password, i.email);
  if (w) return json({ error: w }, 422, origin);

  const { error: ce } = await sb.auth.admin.createUser({
    email: i.email, password, email_confirm: true,
    user_metadata: i.name ? { display_name: i.name } : {},
  });
  if (ce) {
    if (/already|registered|exists/i.test(ce.message)) return json({ state: 'has_account', email: i.email }, 409, origin);
    if (/password/i.test(ce.message)) return json({ error: 'Password ditolak oleh kebijakan keamanan. Pilih password lain yang lebih kuat.' }, 422, origin);
    console.error('activation create', ce.message);
    return json({ error: 'Akun belum bisa dibuat. Coba lagi beberapa saat.' }, 500, origin);
  }
  return json({ state: 'created', email: i.email }, 200, origin);
});
