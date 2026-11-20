import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ORIGIN } from '@viboxs/shared/ecosystem';
import { rpc, sb, errMsg, PRIVACY_VERSION } from '../lib/sb';
import { useAuth, takeInvite } from '../lib/auth';
import { I, ThemeToggle } from '../ui/kit';

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
/** Pesan login generik — tidak membedakan "email tidak terdaftar" vs "password salah" (anti-enumeration). */
const authMsg = (m: string) =>
  /invalid login credentials/i.test(m) ? 'Email atau password tidak cocok.'
    : /email not confirmed/i.test(m) ? 'Email belum diverifikasi. Buka tautan verifikasi di inbox Anda.'
      : /rate limit|too many/i.test(m) ? 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'
        : /already registered|already been registered/i.test(m) ? 'Jika email ini belum terdaftar, akun dibuat. Jika sudah, silakan masuk.'
          : errMsg(m);

export function AuthFrame({ title, sub, children, aside }: { title: string; sub?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <main className="au">
      <div className="au__dots dots-light" aria-hidden="true" />
      <ThemeToggle className="st-icon au__theme" />
      <div className="au__wrap">
        <div className="au__card">
          <Link to="/" className="st-brand" aria-label="VIBOXS Studio"><img src="/assets/viboxs-wordmark-white.png" alt="VIBOXS" height={16} /><span>STUDIO</span></Link>
          <div className="au__title"><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
          {children}
        </div>
        {aside && <aside className="au__aside">{aside}</aside>}
      </div>
    </main>
  );
}

function Pass({ id, value, onChange, auto }: { id: string; value: string; onChange: (v: string) => void; auto: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="st-pass">
      <input id={id} type={show ? 'text' : 'password'} autoComplete={auto} value={value} onChange={(e) => onChange(e.target.value)} />
      <button type="button" className="st-icon" onClick={() => setShow((s) => !s)} aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}>{show ? <I.eyeOff /> : <I.eye />}</button>
    </div>
  );
}

export function Login() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const { session, ready } = useAuth();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [sent, setSent] = useState(false);
  const next = sp.get('next') || '/workspace';

  useEffect(() => { if (ready && session) { const t = takeInvite(); nav(t ? `/invite/${t}` : next, { replace: true }); } }, [ready, session, nav, next]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    if (!emailOk(email)) { setErr('Masukkan email yang valid.'); return; }
    if (mode === 'forgot') {
      setBusy(true);
      await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/reset` });
      setBusy(false); setSent(true);
      return;
    }
    if (!pw) { setErr('Masukkan password.'); return; }
    setBusy(true);
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: pw });
    setBusy(false);
    if (error) setErr(authMsg(error.message));
  }

  return (
    <AuthFrame title={mode === 'login' ? 'Masuk ke Studio' : 'Atur ulang password'}
      sub={mode === 'login' ? 'Ruang kerja privat ekosistem VIBOXS. Akses profesional hanya melalui undangan Commander.' : 'Kami kirim tautan atur ulang bila email terdaftar.'}
      aside={<LoginAside />}>
      {sent ? (
        <div className="st-alert st-alert--ok" role="status">Jika email terdaftar, tautan atur ulang sudah dikirim. Periksa inbox dan folder spam.</div>
      ) : (
        <form className="au__form" onSubmit={submit} noValidate>
          {err && <div className="st-alert st-alert--err" role="alert">{err}</div>}
          <div className="st-field">
            <label htmlFor="au-e">Email</label>
            <input id="au-e" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {mode === 'login' && (
            <div className="st-field">
              <label htmlFor="au-p">Password</label>
              <Pass id="au-p" value={pw} onChange={setPw} auto="current-password" />
            </div>
          )}
          <button type="submit" className="st-btn st-btn--primary st-btn--block" disabled={busy}>{busy ? <><span className="st-spin" />Memeriksa…</> : mode === 'login' ? 'Masuk' : 'Kirim tautan'}</button>
        </form>
      )}
      <div className="au__links">
        <button type="button" className="st-linkbtn" onClick={() => { setMode(mode === 'login' ? 'forgot' : 'login'); setErr(''); setSent(false); }}>{mode === 'login' ? 'Lupa password?' : '← Kembali ke masuk'}</button>
        <span>Belum punya akun belajar? <Link to="/daftar">Daftar sebagai EDU Learner</Link></span>
      </div>
    </AuthFrame>
  );
}

function LoginAside() {
  return (
    <div className="au__steps">
      <span className="st-eyebrow">Cara mendapatkan akses</span>
      <ol>
        <li><b>Learner</b><span>Daftar sendiri — gratis, hanya akses belajar.</span></li>
        <li><b>Ranger · Trainer · OPC · Partner</b><span>Lamar lewat situs publik, diseleksi Commander, lalu menerima undangan sekali pakai.</span></li>
        <li><b>Undangan</b><span>Buka tautan undangan dari email, masuk dengan email yang sama, peran aktif.</span></li>
      </ol>
    </div>
  );
}

export function Register() {
  const nav = useNavigate();
  const { session, ready, refresh, me } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const [state, setState] = useState<'form' | 'verify' | 'done'>('form');
  const [points, setPoints] = useState(false);
  const signedIn = !!session;

  // Sudah login (mis. kembali dari verifikasi email) → selesaikan pendaftaran Learner di server.
  useEffect(() => {
    if (!ready || !session || state === 'done') return;
    if (me?.roles.includes('learner')) { nav('/workspace', { replace: true }); return; }
    let pending: { name: string; marketing: boolean } | null = null;
    try { pending = JSON.parse(localStorage.getItem('viboxs-studio-learner') || 'null'); } catch { /* abaikan */ }
    if (!pending) return;
    (async () => {
      try {
        const r = await rpc<{ early_points: boolean }>('st_register_learner', { p_name: pending!.name, p_privacy_version: PRIVACY_VERSION, p_marketing: pending!.marketing });
        localStorage.removeItem('viboxs-studio-learner');
        setPoints(r.early_points); setState('done'); await refresh();
      } catch (e) { setErr({ form: (e as Error).message }); }
    })();
  }, [ready, session, me, state, nav, refresh]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (name.trim().length < 2) er.name = 'Isi nama Anda.';
    if (!signedIn && !emailOk(email)) er.email = 'Masukkan email yang valid.';
    if (!signedIn && pw.length < 8) er.pw = 'Minimal 8 karakter.';
    if (!privacy) er.privacy = 'Persetujuan pemrosesan data wajib untuk membuat akun.';
    if (!adult) er.adult = 'Pendaftaran mandiri saat ini hanya untuk usia 18+. Peserta di bawah umur memerlukan persetujuan wali (sedang disiapkan).';
    setErr(er);
    if (Object.keys(er).length) { document.getElementById(`rg-${Object.keys(er)[0]}`)?.focus(); return; }
    setBusy(true);
    if (signedIn) {
      // sudah punya akun (mis. Ranger) → tambahkan peran Learner ke identitas yang sama
      try {
        const r = await rpc<{ early_points: boolean }>('st_register_learner', { p_name: name.trim(), p_privacy_version: PRIVACY_VERSION, p_marketing: marketing });
        setPoints(r.early_points); setState('done'); await refresh();
      } catch (e2) { setErr({ form: (e2 as Error).message }); }
      setBusy(false);
      return;
    }
    try { localStorage.setItem('viboxs-studio-learner', JSON.stringify({ name: name.trim(), marketing })); } catch { /* abaikan */ }
    const { data, error } = await sb.auth.signUp({ email: email.trim(), password: pw, options: { emailRedirectTo: `${location.origin}/daftar`, data: { display_name: name.trim() } } });
    setBusy(false);
    if (error) { setErr({ form: authMsg(error.message) }); return; }
    if (!data.session) setState('verify');
  }

  if (state === 'done') {
    return (
      <AuthFrame title="Akun Learner aktif" sub="Selamat datang di VIBOXS Studio.">
        <div className="au__done">
          <span className="au__check"><I.check size={28} /></span>
          <p>Akun Anda hanya memiliki akses <b>EDU Learner</b>. Jalur profesional (Ranger, Trainer, OPC) tetap melalui aplikasi terpisah dan seleksi Commander.</p>
          {points && <p className="au__pts"><I.spark size={16} /> 100 Early Points tercatat — belum dapat ditukar. Aturan penukaran diumumkan setelah disahkan.</p>}
          <button type="button" className="st-btn st-btn--primary st-btn--block" onClick={() => nav('/learn/assessment')}>Mulai asesmen awal</button>
          <button type="button" className="st-btn st-btn--ghost st-btn--block" onClick={() => nav('/workspace')}>Lihat My Learning</button>
        </div>
      </AuthFrame>
    );
  }
  if (state === 'verify') {
    return (
      <AuthFrame title="Cek email Anda" sub={`Kami mengirim tautan verifikasi ke ${email}.`}>
        <div className="st-alert st-alert--info">Buka tautan verifikasi — Anda akan kembali ke halaman ini dan akun Learner dibuat otomatis. Tidak menerima email? Periksa folder spam.</div>
        <Link to="/login" className="st-btn st-btn--ghost st-btn--block">Ke halaman masuk</Link>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Daftar EDU Learner" sub="Gratis. Untuk asesmen awal, rekomendasi program EDU yang tersedia, dan riwayat belajar Anda."
      aside={<RegisterAside />}>
      <form className="au__form" onSubmit={submit} noValidate>
        {err.form && <div className="st-alert st-alert--err" role="alert">{err.form}</div>}
        {Object.keys(err).filter((k) => k !== 'form').length > 1 && (
          <div className="st-alert st-alert--err" role="alert">Periksa {Object.keys(err).filter((k) => k !== 'form').length} isian yang ditandai.</div>
        )}
        <div className={`st-field ${err.name ? 'has-err' : ''}`}><label htmlFor="rg-name">Nama</label><input id="rg-name" autoComplete="name" value={name} aria-invalid={!!err.name} aria-describedby="rg-name-e" onChange={(e) => setName(e.target.value)} />{err.name && <span id="rg-name-e" className="st-ferr">{err.name}</span>}</div>
        {signedIn ? <p className="st-muted">Menambahkan peran Learner ke akun <b>{session!.user.email}</b>.</p> : <>
        <div className={`st-field ${err.email ? 'has-err' : ''}`}><label htmlFor="rg-email">Email</label><input id="rg-email" type="email" autoComplete="email" value={email} aria-invalid={!!err.email} aria-describedby="rg-email-e" onChange={(e) => setEmail(e.target.value)} />{err.email && <span id="rg-email-e" className="st-ferr">{err.email}</span>}</div>
        <div className={`st-field ${err.pw ? 'has-err' : ''}`}><label htmlFor="rg-pw">Password</label><Pass id="rg-pw" value={pw} onChange={setPw} auto="new-password" /><span className={err.pw ? 'st-ferr' : 'st-hint'}>{err.pw || 'Minimal 8 karakter.'}</span></div>
        </>}
        <fieldset className="au__consent">
          <legend className="sr-only">Persetujuan</legend>
          <label className={`st-check ${err.adult ? 'has-err' : ''}`}><input id="rg-adult" type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} /><span className="st-check__box" aria-hidden="true"><I.check size={12} /></span><span><b>Saya berusia 18 tahun atau lebih</b>{err.adult && <span className="st-ferr">{err.adult}</span>}</span></label>
          <label className={`st-check ${err.privacy ? 'has-err' : ''}`}><input id="rg-privacy" type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} /><span className="st-check__box" aria-hidden="true"><I.check size={12} /></span><span><b>Wajib · Saya setuju data saya diproses untuk akun belajar</b><span className="st-hint">Kebijakan privasi Studio masih draf menunggu review hukum (versi {PRIVACY_VERSION}). Lihat <a href={`${ORIGIN.edu}/policies/privacy`} target="_blank" rel="noopener noreferrer">kebijakan privasi EDU</a>.</span>{err.privacy && <span className="st-ferr">{err.privacy}</span>}</span></label>
          <div className="au__sep" />
          <label className="st-check"><input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} /><span className="st-check__box" aria-hidden="true"><I.check size={12} /></span><span><b>Opsional · Kirimi saya info program EDU</b><span className="st-hint">Tidak dicentang otomatis. Bisa dicabut kapan saja.</span></span></label>
        </fieldset>
        <button type="submit" className="st-btn st-btn--primary st-btn--block" disabled={busy}>{busy ? <><span className="st-spin" />Membuat akun…</> : 'Buat akun Learner'}</button>
      </form>
      {!signedIn && <div className="au__links"><span>Sudah punya akun? <Link to="/login">Masuk</Link></span></div>}
    </AuthFrame>
  );
}

function RegisterAside() {
  return (
    <div className="au__steps">
      <span className="st-eyebrow">Yang Anda dapat</span>
      <ol>
        <li><b>Asesmen awal</b><span>Pertanyaan terstruktur berbasis aturan — bukan tes kepribadian atau penilaian bakat.</span></li>
        <li><b>Rekomendasi</b><span>Hanya program EDU yang benar-benar tayang, dengan alasan yang bisa dibaca.</span></li>
        <li><b>Early Points</b><span>Bila kampanye aktif: poin dicatat, belum bisa ditukar.</span></li>
      </ol>
      <p className="st-hint">Membeli program EDU tidak wajib punya akun — guest checkout tetap tersedia di edu.viboxs.com.</p>
    </div>
  );
}

export function Reset() {
  const nav = useNavigate();
  const { session, ready } = useAuth();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 8) { setErr('Minimal 8 karakter.'); return; }
    setBusy(true);
    const { error } = await sb.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) setErr(authMsg(error.message)); else setOk(true);
  }
  return (
    <AuthFrame title="Password baru" sub="Masukkan password baru untuk akun Studio Anda.">
      {!ready ? <p className="st-muted">Memeriksa tautan…</p> : !session ? (
        <div className="st-alert st-alert--err">Tautan atur ulang tidak valid atau sudah kedaluwarsa. <Link to="/login">Minta tautan baru</Link>.</div>
      ) : ok ? (
        <><div className="st-alert st-alert--ok">Password diperbarui.</div><button type="button" className="st-btn st-btn--primary st-btn--block" onClick={() => nav('/workspace')}>Lanjut ke Studio</button></>
      ) : (
        <form className="au__form" onSubmit={submit} noValidate>
          {err && <div className="st-alert st-alert--err" role="alert">{err}</div>}
          <div className="st-field"><label htmlFor="rs-p">Password baru</label><Pass id="rs-p" value={pw} onChange={setPw} auto="new-password" /></div>
          <button type="submit" className="st-btn st-btn--primary st-btn--block" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan password'}</button>
        </form>
      )}
    </AuthFrame>
  );
}
