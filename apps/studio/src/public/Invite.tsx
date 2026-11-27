import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { callEdge } from '@viboxs/shared/backend';
import { rpc, sb, type Role } from '../lib/sb';
import { useAuth, rememberInvite } from '../lib/auth';
import { ROLE, fmtDate } from '../lib/labels';
import { I } from '../ui/kit';
import { AuthFrame } from './Auth';

type Peek = { state: 'pending' | 'accepted' | 'revoked' | 'expired' | 'invalid'; roles?: Role[]; email?: string; email_hint?: string; expires_at?: string; has_account?: boolean };

/**
 * /invite/:token — aktivasi sekali pakai (v4 WP01). Username = email yang diundang (tidak bisa diubah).
 * Belum punya akun → buat password sendiri (edge st-activate), lalu peran diaktifkan lewat st_accept_invite.
 * Sudah punya akun (mis. Learner) → masuk, peran ditambahkan ke identitas yang sama. Password tidak pernah dikirim lewat email.
 */
export default function Invite() {
  const { token = '' } = useParams();
  const nav = useNavigate();
  const { session, ready, refresh, signOut } = useAuth();
  const [peek, setPeek] = useState<Peek | null>(null);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [hasAccount, setHasAccount] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [asked, setAsked] = useState(false);

  useEffect(() => {
    rpc<Peek>('st_invite_peek', { p_token: token }).then((p) => { setPeek(p); setHasAccount(!!p.has_account); }).catch(() => setPeek({ state: 'invalid' }));
  }, [token]);

  async function accept() {
    await rpc<Role[]>('st_accept_invite', { p_token: token });
    await refresh();
    nav('/workspace', { replace: true });
  }

  async function acceptNow() {
    if (!terms) { setErr('Setujui ketentuan peran terlebih dahulu.'); return; }
    setBusy(true); setErr('');
    try { await accept(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    const email = peek?.email ?? '';
    if (!terms) { setErr('Setujui ketentuan peran terlebih dahulu.'); return; }
    if (!hasAccount) {
      if (pw.length < 10) { setErr('Password minimal 10 karakter.'); return; }
      if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) { setErr('Gunakan kombinasi huruf dan angka.'); return; }
      if (pw !== pw2) { setErr('Konfirmasi password tidak sama.'); return; }
    } else if (!pw) { setErr('Isi password akun Anda.'); return; }
    setBusy(true);
    rememberInvite(token);
    try {
      if (!hasAccount) {
        const r = await callEdge<{ state?: string }>('st-activate', { token, password: pw });
        if (r.status === 409 && r.data.state === 'has_account') { setHasAccount(true); setPw(''); setPw2(''); throw new Error('Email ini sudah punya akun. Masuk dengan password akun tersebut.'); }
        if (r.status === 410) { setPeek({ state: (r.data.state as Peek['state']) ?? 'expired', roles: peek?.roles }); return; }
        if (r.status !== 200) throw new Error(r.data.error ?? 'Akun belum bisa dibuat. Coba lagi.');
      }
      const res = await sb.auth.signInWithPassword({ email, password: pw });
      if (res.error) throw new Error(/invalid login/i.test(res.error.message) ? 'Password tidak cocok untuk email ini. Lupa password? Pakai “Lupa password” di halaman masuk.' : res.error.message);
      await accept();
    } catch (e2) { setErr((e2 as Error).message); } finally { setBusy(false); }
  }

  async function askResend() {
    setBusy(true);
    try { await rpc('st_invite_request_resend', { p_token: token }); } catch { /* selalu diam: tidak membocorkan status token */ }
    setBusy(false); setAsked(true);
  }

  if (!peek || !ready) return <AuthFrame title="Memeriksa undangan…"><div className="st-skel"><span /><span /></div></AuthFrame>;
  if (peek.state !== 'pending') {
    const msg = { accepted: 'Undangan ini sudah digunakan. Masuk dengan email dan password Anda.', revoked: 'Undangan ini sudah dicabut atau diganti dengan undangan yang lebih baru — cek email terbaru Anda.', expired: 'Tautan aktivasi ini sudah kedaluwarsa.', invalid: 'Tautan undangan tidak valid.' }[peek.state];
    return (
      <AuthFrame title="Undangan tidak dapat dipakai" sub={msg}>
        {(peek.state === 'expired' || peek.state === 'revoked') && (asked
          ? <div className="st-alert st-alert--info" role="status">Permintaan diteruskan ke Commander VIBOXS. Undangan baru akan dikirim ke email yang sama setelah ditinjau.</div>
          : <button type="button" className="st-btn st-btn--primary st-btn--block" disabled={busy} onClick={askResend}>{busy ? <><span className="st-spin" />Mengirim…</> : 'Minta kirim ulang undangan'}</button>)}
        <p className="st-muted">Undangan bersifat sekali pakai dan memiliki masa berlaku. VIBOXS tidak pernah mengirim password lewat email.</p>
        <Link to="/login" className="st-btn st-btn--ghost st-btn--block">Ke halaman masuk</Link>
      </AuthFrame>
    );
  }

  const roles = peek.roles ?? [];
  const wrongAccount = session && session.user.email?.toLowerCase() !== peek.email?.toLowerCase();
  return (
    <AuthFrame title={roles.includes('trainer') ? 'Aktifkan akun Kontributor VIBOXS' : 'Anda diundang ke VIBOXS Studio'} sub={<>Tautan pribadi · berlaku sampai {fmtDate(peek.expires_at ?? null)} · sekali pakai</>}>
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

      {session && !wrongAccount ? (
        <div className="au__form">
          <p className="st-muted">Masuk sebagai <b>{session.user.email}</b>.</p>
          <button type="button" className="st-btn st-btn--primary st-btn--block" disabled={busy} onClick={acceptNow}>{busy ? <><span className="st-spin" />Mengaktifkan…</> : 'Terima undangan & aktifkan peran'}</button>
        </div>
      ) : session && wrongAccount ? (
        <div className="au__form">
          <div className="st-alert st-alert--warn" role="alert">Anda sedang masuk sebagai <b>{session.user.email}</b>, sedangkan undangan ini untuk <b>{peek.email}</b>.</div>
          <button type="button" className="st-btn st-btn--primary st-btn--block" onClick={() => signOut()}>Keluar, lalu lanjut dengan {peek.email}</button>
        </div>
      ) : (
        <form className="au__form" onSubmit={submit} noValidate>
          <div className="st-field"><label htmlFor="iv-e">Username (email)</label><input id="iv-e" type="email" value={peek.email ?? ''} readOnly autoComplete="username" /></div>
          <div className="st-field"><label htmlFor="iv-p">{hasAccount ? 'Password akun Anda' : 'Buat password'}</label>
            <input id="iv-p" type="password" autoComplete={hasAccount ? 'current-password' : 'new-password'} value={pw} onChange={(e) => setPw(e.target.value)} aria-describedby={hasAccount ? undefined : 'iv-ph'} />
            {!hasAccount && <small id="iv-ph" className="st-hint">Minimal 10 karakter, kombinasi huruf dan angka. Jangan pakai password dari layanan lain.</small>}</div>
          {!hasAccount && <div className="st-field"><label htmlFor="iv-p2">Ulangi password</label><input id="iv-p2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>}
          {hasAccount && <p className="st-hint">Email ini sudah punya akun VIBOXS Studio. Peran baru ditambahkan ke akun yang sama — tidak ada akun baru.</p>}
          <button type="submit" className="st-btn st-btn--primary st-btn--block" disabled={busy}>{busy ? <><span className="st-spin" />Memproses…</> : hasAccount ? 'Masuk & aktifkan peran' : 'Buat Password & Aktifkan Akun'}</button>
          {hasAccount && <Link to="/login" className="st-linkbtn">Lupa password?</Link>}
        </form>
      )}
    </AuthFrame>
  );
}
