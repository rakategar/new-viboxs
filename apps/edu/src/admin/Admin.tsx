import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { applySeo } from '@viboxs/shared/seo';
import { ORIGIN } from '@viboxs/shared/ecosystem';
import { sb, usernameToEmail } from './sb';
import { I, ToastHost } from './ui';
import Overview from './Overview';
import HomeEditor from './HomeEditor';
import Programs from './Programs';
import ContentEditor from './ContentEditor';
import Inbox from './Inbox';
import Settings from './Settings';
import './admin.css';

const isAdmin = (s: Session | null) => s?.user.app_metadata?.role === 'admin';

export default function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    applySeo({ origin: ORIGIN.edu, path: '/admin', title: 'Dashboard CMS — VIBOXS EDU', description: 'Dashboard pengelolaan konten VIBOXS EDU.', noindex: true });
    document.documentElement.classList.remove('agents-on');
    sb.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!ready) return <div className="adm-boot">Memuat dashboard…</div>;
  return <ToastHost>{isAdmin(session) ? <Shell email={session!.user.email ?? ''} /> : <Login />}</ToastHost>;
}

/* ---------------- login ---------------- */
function Login() {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!u.trim() || !p) { setErr('Isi username dan password.'); return; }
    setBusy(true); setErr('');
    const { data, error } = await sb.auth.signInWithPassword({ email: usernameToEmail(u), password: p });
    if (error) { setErr(error.message === 'Invalid login credentials' ? 'Username atau password salah.' : error.message); setBusy(false); return; }
    if (!isAdmin(data.session)) { await sb.auth.signOut(); setErr('Akun ini tidak punya akses admin.'); }
    setBusy(false);
  }

  return (
    <main className="adm-login">
      <form className="adm-login__card" onSubmit={submit} noValidate>
        <div className="adm-brand"><img src="/assets/viboxs-wordmark-white.png" alt="VIBOXS" height={18} /><span>EDU · CMS</span></div>
        <div>
          <h1>Masuk dashboard</h1>
          <p className="adm-muted">Kelola konten edu.viboxs.com, katalog program, dan pengajuan kolaborator.</p>
        </div>
        {err && <div role="alert" className="adm-alert adm-alert--err">{err}</div>}
        <div className="adm-field">
          <label htmlFor="adm-u">Username</label>
          <input id="adm-u" autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} autoFocus />
        </div>
        <div className="adm-field">
          <label htmlFor="adm-p">Password</label>
          <div className="adm-pass">
            <input id="adm-p" type={show ? 'text' : 'password'} autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} />
            <button type="button" className="adm-icon" onClick={() => setShow((s) => !s)} aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}>{show ? <I.eyeOff /> : <I.eye />}</button>
          </div>
        </div>
        <button type="submit" className="adm-btn adm-btn--primary adm-btn--block" disabled={busy}>{busy ? 'Memeriksa…' : 'Masuk'}</button>
        <a href="/" className="adm-muted adm-small">← Kembali ke edu.viboxs.com</a>
      </form>
    </main>
  );
}

/* ---------------- layout ---------------- */
const NAV = [
  { to: '/admin', label: 'Ringkasan', icon: I.grid, end: true },
  { to: '/admin/beranda', label: 'Halaman utama', icon: I.home },
  { to: '/admin/program', label: 'Program & e-book', icon: I.book },
  { to: '/admin/konten', label: 'Jalur belajar & FAQ', icon: I.list },
  { to: '/admin/kolaborator', label: 'Kolaborator', icon: I.users, badge: 'collab' as const },
  { to: '/admin/pesan', label: 'Pesan masuk', icon: I.inbox, badge: 'other' as const },
  { to: '/admin/pengaturan', label: 'Pengaturan', icon: I.cog },
];

export type Counts = { collab: number; other: number };

function Shell({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Counts>({ collab: 0, other: 0 });
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);

  const refreshCounts = useCallback(async () => {
    const [a, b] = await Promise.all([
      sb.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'new').eq('kind', 'collab'),
      sb.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'new').neq('kind', 'collab'),
    ]);
    setCounts({ collab: a.count ?? 0, other: b.count ?? 0 });
  }, []);
  useEffect(() => { refreshCounts(); const t = window.setInterval(refreshCounts, 60000); return () => window.clearInterval(t); }, [refreshCounts, loc.pathname]);

  return (
    <div className={`adm ${open ? 'is-open' : ''}`}>
      <aside className="adm-side" aria-label="Navigasi dashboard">
        <div className="adm-brand"><img src="/assets/viboxs-wordmark-white.png" alt="VIBOXS" height={16} /><span>EDU · CMS</span></div>
        <nav className="adm-nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `adm-nav__a ${isActive ? 'is-on' : ''}`}>
              <n.icon /><span>{n.label}</span>
              {n.badge && counts[n.badge] > 0 && <em className="adm-badge">{counts[n.badge]}</em>}
            </NavLink>
          ))}
        </nav>
        <div className="adm-side__foot">
          <a href="/" target="_blank" rel="noopener noreferrer" className="adm-nav__a"><I.ext /><span>Lihat situs</span></a>
          <button type="button" className="adm-nav__a" onClick={() => sb.auth.signOut()}><I.out /><span>Keluar</span></button>
          <span className="adm-small adm-muted adm-who">{email}</span>
        </div>
      </aside>
      <button type="button" className="adm-scrim" aria-label="Tutup menu" onClick={() => setOpen(false)} />
      <div className="adm-main">
        <div className="adm-mbar">
          <button type="button" className="adm-icon" onClick={() => setOpen(true)} aria-label="Buka menu"><I.menu /></button>
          <div className="adm-brand"><img src="/assets/viboxs-wordmark-white.png" alt="VIBOXS" height={14} /><span>EDU · CMS</span></div>
        </div>
        <Routes>
          <Route path="/admin" element={<Overview />} />
          <Route path="/admin/beranda" element={<HomeEditor />} />
          <Route path="/admin/program" element={<Programs />} />
          <Route path="/admin/konten" element={<ContentEditor />} />
          <Route path="/admin/kolaborator" element={<Inbox mode="collab" onChange={refreshCounts} />} />
          <Route path="/admin/pesan" element={<Inbox mode="other" onChange={refreshCounts} />} />
          <Route path="/admin/pengaturan" element={<Settings />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
    </div>
  );
}
