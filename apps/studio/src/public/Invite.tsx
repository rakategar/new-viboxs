import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { rpc, sb, authOrigin, type Role } from '../lib/sb';
import { useAuth, rememberInvite } from '../lib/auth';
import { ROLE, fmtDate } from '../lib/labels';
import { I } from '../ui/kit';
import { AuthFrame } from './Auth';

type Peek = { state: 'pending' | 'accepted' | 'revoked' | 'expired' | 'invalid'; roles?: Role[]; email_hint?: string; expires_at?: string };

/** /invite/:token — konfirmasi identitas, terima ketentuan, aktifkan peran (sekali pakai). */
export default function Invite() {
  const { token = '' } = useParams();
  const nav = useNavigate();
  const { session, ready, refresh, signOut } = useAuth();
  const [peek, setPeek] = useState<Peek | null>(null);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [verify, setVerify] = useState(false);

  useEffect(() => { rpc<Peek>('st_invite_peek', { p_token: token }).then(setPeek).catch(() => setPeek({ state: 'invalid' })); }, [token]);

  async function accept() {
    if (!terms) { setErr('Setujui ketentuan peran terlebih dahulu.'); return; }
    setBusy(true); setErr('');
    try {
      await rpc<Role[]>('st_accept_invite', { p_token: token });
      await refresh();
      nav('/workspace', { replace: true });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  async function auth(e: FormEvent) {
    e.preventDefault();
    setErr('');
    if (!terms) { setErr('Setujui ketentuan peran terlebih dahulu.'); return; }
    if (pw.length < 8) { setErr('Password minimal 8 karakter.'); return; }
    setBusy(true);
    rememberInvite(token);
    const res = mode === 'signup'
      ? await sb.auth.signUp({ email: email.trim(), password: pw, options: { emailRedirectTo: `${authOrigin()}/invite/${token}` } })
      : await sb.auth.signInWithPassword({ email: email.trim(), password: pw });
    setBusy(false);
    if (res.error) { setErr(/invalid login/i.test(res.error.message) ? 'Email atau password tidak cocok.' : res.error.message); return; }
    if (!res.data.session) setVerify(true);
  }

  if (!peek || !ready) return <AuthFrame title="Memeriksa undangan…"><div className="st-skel"><span /><span /></div></AuthFrame>;
  if (peek.state !== 'pending') {
    const msg = { accepted: 'Undangan ini sudah digunakan.', revoked: 'Undangan ini sudah dicabut atau diganti dengan undangan baru.', expired: 'Undangan ini sudah kedaluwarsa.', invalid: 'Tautan undangan tidak valid.' }[peek.state];
    return (
      <AuthFrame title="Undangan tidak dapat dipakai" sub={msg}>
        <p className="st-muted">Minta undangan baru ke Commander VIBOXS. Undangan bersifat sekali pakai dan memiliki masa berlaku.</p>
        <Link to="/login" className="st-btn st-btn--ghost st-btn--block">Ke halaman masuk</Link>
      </AuthFrame>
    );
  }

  const roles = peek.roles ?? [];
  return (
    <AuthFrame title="Anda diundang ke VIBOXS Studio" sub={<>Undangan untuk <b>{peek.email_hint}</b> · berlaku sampai {fmtDate(peek.expires_at ?? null)}</>}>
      <ul className="au__roles">
        {roles.map((r, i) => (
          <li key={r} style={{ ['--i' as string]: i }}><span className="au__role-ico"><I.key size={16} /></span><span><b>{ROLE[r].label}</b><small>{ROLE[r].desc}</small></span></li>
        ))}
      </ul>
      <label className="st-check">
        <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
        <span className="st-check__box" aria-hidden="true"><I.check size={12} /></span>
        <span><b>Saya memahami ketentuan peran ini</b><span className="st-hint">
          {roles.includes('ranger') && 'Ranger bekerja per misi dengan perjanjian tersendiri, menjaga kerahasiaan brief, dan tidak memakai VIBOXS Connect. '}
          {roles.some((r) => r === 'opc_founder' || r === 'business_partner' || r === 'collaborator') && 'Kolaborasi B2B independen adalah perjanjian antar para pihak; VIBOXS bukan pihak kontrak secara otomatis. '}
          {roles.includes('trainer') && 'Program EDU selalu melalui review Commander sebelum tayang. '}
          Ketentuan final menunggu review hukum.</span></span>
      </label>
      {err && <div className="st-alert st-alert--err" role="alert">{err}</div>}

      {session ? (
        <div className="au__form">
          <p className="st-muted">Masuk sebagai <b>{session.user.email}</b>. Email harus sama dengan email yang diundang.</p>
          <button type="button" className="st-btn st-btn--primary st-btn--block" disabled={busy} onClick={accept}>{busy ? <><span className="st-spin" />Mengaktifkan…</> : 'Terima undangan & aktifkan peran'}</button>
          <button type="button" className="st-linkbtn" onClick={() => signOut()}>Bukan akun ini? Keluar</button>
        </div>
      ) : verify ? (
        <div className="st-alert st-alert--info">Cek email untuk verifikasi akun. Tautan verifikasi akan membawa Anda kembali ke undangan ini.</div>
      ) : (
        <form className="au__form" onSubmit={auth} noValidate>
          <div className="au__seg" role="tablist" aria-label="Akun">
            <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'is-on' : ''} onClick={() => setMode('signup')}>Buat akun</button>
            <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'is-on' : ''} onClick={() => setMode('login')}>Sudah punya akun</button>
          </div>
          <div className="st-field"><label htmlFor="iv-e">Email yang diundang</label><input id="iv-e" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="st-field"><label htmlFor="iv-p">Password</label><input id="iv-p" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={pw} onChange={(e) => setPw(e.target.value)} /></div>
          <button type="submit" className="st-btn st-btn--primary st-btn--block" disabled={busy}>{busy ? <><span className="st-spin" />Memproses…</> : mode === 'signup' ? 'Buat akun & lanjut' : 'Masuk & lanjut'}</button>
        </form>
      )}
    </AuthFrame>
  );
}
