import { useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from '@viboxs/shared/icons';
import { useMotion } from '@viboxs/shared/motion';
import EcoLink from '../components/EcoLink';
import Accordion from '../components/Accordion';
import { CONTACT } from '@viboxs/shared/ecosystem';
import { submitForm } from '@viboxs/shared/backend';
import { FAQ, FAQ_G, SUPPORT, emailOk } from '../lib/data';

/* ---------------- /corporate-training ---------------- */
export function Teams() {
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref);
  return (
    <div ref={ref}>
      <section className="section page-top--glow">
        <div className="container stack-40">
          <div className="stack-20 maxw-760">
            <nav aria-label="Breadcrumb" className="crumbs"><Link to="/">EDU</Link><span>/</span><span aria-current="page">Program Tim</span></nav>
            <span className="eyebrow">Program Tim</span>
            <h1 className="h1-sm">Belajar sendiri, atau pelatihan untuk seluruh tim?</h1>
            <p className="lead muted">EDU menyediakan kelas publik yang bisa diikuti siapa saja. Untuk pelatihan yang disusun khusus bagi satu organisasi, VIBOXS Services yang menanganinya.</p>
          </div>
          <div className="bridge-grid">
            <div className="bridge bridge--light" data-build="Kartu · Kelas publik">
              <span className="mono-label ink-muted">KELAS PUBLIK · EDU</span>
              <span className="h3">Daftar sebagai individu</span>
              <ul className="bullets"><li>Jadwal, materi, dan harga ditentukan sebelum pendaftaran</li><li>Daftar langsung di EDU</li><li>Peserta dari berbagai latar belakang</li></ul>
              <Link to="/programs" className="btn btn--ink self-start">Jelajahi Program</Link>
            </div>
            <div className="bridge bridge--s" data-build="Kartu · Training custom">
              <span className="mono xs ls-08 acc-soft">TRAINING CUSTOM · SERVICES</span>
              <span className="h3">Disusun untuk organisasimu</span>
              <ul className="bullets muted"><li>Materi dan studi kasus disesuaikan dengan proses tim</li><li>Jadwal dan format disepakati bersama</li><li>Berbasis proposal dan ruang lingkup kerja (SOW)</li></ul>
              <EcoLink k="services" path="/start?org=perusahaan&from=EDU%20training" className="btn btn--primary self-start">Diskusikan pelatihan untuk tim ↗</EcoLink>
              <span className="xs-13 muted">Membuka service.viboxs.com/start dengan topik training.</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------------- /help ---------------- */
export function Help() {
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref);
  const [g, setG] = useState('Semua');
  const list = FAQ.filter((f) => g === 'Semua' || f.g === g);
  return (
    <div ref={ref}>
      <section className="page-top">
        <div className="container stack-16">
          <nav aria-label="Breadcrumb" className="crumbs"><Link to="/">EDU</Link><span>/</span><span aria-current="page">Bantuan</span></nav>
          <h1 className="h1-sm">Ada yang bisa dibantu?</h1>
          <p className="body-17 muted maxw-620">Pendaftaran, pembayaran, akses materi, dan perubahan jadwal.</p>
        </div>
      </section>
      <div className="light pad-page">
        <div className="container stack-48">
          <section className="stack-16">
            <h2 className="h2-block">Masalah umum</h2>
            <div className="support-grid">{SUPPORT.map(([t, d]) => <div key={t} className="support support--lift" data-build="Kartu · Masalah"><span className="strong">{t}</span><span className="xs-13 ink-muted">{d}</span></div>)}</div>
          </section>
          <section className="stack-16 maxw-880">
            <h2 className="h2-block">FAQ</h2>
            <div role="group" aria-label="Kategori FAQ" className="row-8">
              {FAQ_G.map((x) => <button key={x} type="button" className={`chip ${g === x ? 'is-on' : ''}`} aria-pressed={g === x} onClick={() => setG(x)}>{x}</button>)}
            </div>
            <Accordion key={g} tone="light" defaultOpen={null} items={list.map((f) => ({ key: f.q, q: <span className="stack-2"><span className="mono xxs ls-08 ink-muted">{f.g.toUpperCase()}</span>{f.q}</span>, a: f.a }))} />
          </section>
          <section className="stack-16 maxw-880" id="kirim">
            <h2 className="h2-block">Masih butuh bantuan?</h2>
            <HelpForm />
          </section>
          <section className="help-cta" data-build="Panel · Kontak">
            <span className="stack-6"><span className="h4">Lebih suka kontak langsung?</span><span className="body o80">Email atau DM Instagram kami. Sertakan nomor order atau registrasi bila ada.</span></span>
            <span className="contact-links"><a href={`mailto:${CONTACT.email}`} className="btn btn--light btn--sm">{CONTACT.email}</a><a href={CONTACT.instagramUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">Instagram @{CONTACT.instagram}</a></span>
          </section>
        </div>
      </div>
    </div>
  );
}

function HelpForm() {
  const [f, setF] = useState({ topik: SUPPORT[0][0], nama: '', email: '', order: '', pesan: '', hp: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const [refNo, setRefNo] = useState('');
  const set = (k: keyof typeof f, v: string) => { setF((o) => ({ ...o, [k]: v })); setErr((e) => ({ ...e, [k]: '' })); };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (state === 'sending') return;
    const er: Record<string, string> = {};
    if (!f.nama.trim()) er.nama = 'Isi nama kamu';
    if (!emailOk(f.email)) er.email = 'Isi email yang dipakai saat mendaftar';
    if (f.pesan.trim().length < 10) er.pesan = 'Ceritakan kendalanya (minimal 10 karakter)';
    setErr(er);
    if (Object.values(er).some(Boolean)) { document.getElementById(`h-${Object.keys(er)[0]}`)?.focus(); return; }
    setState('sending');
    try {
      const { hp, ...rest } = f;
      setRefNo(await submitForm('help', 'edu', { ...rest, _hp: hp, source: 'edu.viboxs.com/help' }));
      setState('done');
    } catch (x) { setMsg((x as Error).message); setState('error'); }
  }

  if (state === 'done') return (
    <div role="status" className="help-form">
      <span className="h4">Permintaan bantuan terkirim.</span>
      <span className="body ink-muted">Tim EDU membalas ke <b>{f.email}</b>. Nomor referensi: <code className="mono strong">{refNo}</code></span>
      <button type="button" className="btn btn--ink btn--sm self-start" onClick={() => { setF({ ...f, pesan: '', order: '' }); setState('idle'); }}>Kirim permintaan lain</button>
    </div>
  );
  return (
    <form noValidate onSubmit={submit} className="help-form" data-build="Form · Bantuan">
      {state === 'error' && <div role="alert" className="note note--warn"><strong>! Belum terkirim</strong><span>{msg}</span></div>}
      <div className="form-2">
        <div className="field"><label htmlFor="h-topik">Topik</label>
          <select id="h-topik" value={f.topik} onChange={(e) => set('topik', e.target.value)}>{SUPPORT.map(([t]) => <option key={t}>{t}</option>)}<option>Lainnya</option></select></div>
        <div className="field"><label htmlFor="h-order">Nomor order / registrasi <span className="ink-muted">(opsional)</span></label><input id="h-order" value={f.order} onChange={(e) => set('order', e.target.value)} /></div>
        <div className="field"><label htmlFor="h-nama">Nama</label><input id="h-nama" autoComplete="name" value={f.nama} onChange={(e) => set('nama', e.target.value)} aria-invalid={!!err.nama} />{err.nama && <span className="field__err">! {err.nama}</span>}</div>
        <div className="field"><label htmlFor="h-email">Email</label><input id="h-email" type="email" autoComplete="email" value={f.email} onChange={(e) => set('email', e.target.value)} aria-invalid={!!err.email} />{err.email && <span className="field__err">! {err.email}</span>}</div>
      </div>
      <div className="field"><label htmlFor="h-pesan">Ceritakan kendalanya</label><textarea id="h-pesan" rows={4} value={f.pesan} onChange={(e) => set('pesan', e.target.value)} aria-invalid={!!err.pesan} />{err.pesan && <span className="field__err">! {err.pesan}</span>}</div>
      <div className="hp" aria-hidden="true"><label>Jangan diisi<input tabIndex={-1} autoComplete="off" value={f.hp} onChange={(e) => set('hp', e.target.value)} /></label></div>
      <button type="submit" className="btn btn--ink self-start" disabled={state === 'sending'}>{state === 'sending' ? 'Mengirim…' : 'Kirim ke tim EDU'} <ArrowRight size={14} /></button>
      <span className="xs-13 ink-muted">Langsung masuk ke {CONTACT.email}.</span>
    </form>
  );
}

/* ---------------- /policies/:kind ---------------- */
const POL: Record<string, string> = { purchase: 'Kebijakan pembelian', refund: 'Refund & reschedule', privacy: 'Kebijakan privasi', terms: 'Syarat dan ketentuan', identity: 'Identitas PT EPH' };
export function Policy() {
  const { kind = '' } = useParams();
  const t = POL[kind];
  if (!t) return <NotFound />;
  if (kind === 'identity') return <Identity />;
  return (
    <section className="section page-top--glow">
      <div className="container stack-20 maxw-760">
        <nav aria-label="Breadcrumb" className="crumbs"><Link to="/">EDU</Link><span>/</span><span>Kebijakan</span><span>/</span><span aria-current="page">{t}</span></nav>
        <h1 className="h1-sm">{t}</h1>
        <p className="lead muted">Dokumen ini sedang ditinjau tim hukum. Pembayaran untuk program berbayar tidak dibuka sebelum kebijakan final dipublikasikan di halaman ini.</p>
        <div className="slot slot--lg">[Isi {t.toLowerCase()} — menunggu review hukum]</div>
        {kind === 'privacy' && <Processors />}
        <Link to="/help" className="link-arrow">Pusat bantuan <ArrowRight size={14} /></Link>
      </div>
    </section>
  );
}

/* Fakta implementasi saat ini (PRD §15 privasi: copy harus sesuai implementasi). Bukan pengganti kebijakan final. */
const PROCESSORS: [string, string][] = [
  ['Supabase', 'Database, akun, dan penyimpanan file privat (e-book, bukti transfer).'],
  ['Vercel', 'Hosting situs edu.viboxs.com dan studio.viboxs.com.'],
  ['Midtrans', 'Pemrosesan pembayaran. Kami tidak menyimpan data kartu.'],
  ['DeepSeek', 'AI assist di Studio: draf soal dari materi kontributor, saran nilai esai untuk reviewer (tanpa identitas peserta), dan ringkasan kebutuhan belajar dari jawaban asesmen awal. Hasil AI selalu ditinjau manusia; server penyedia dapat berada di luar Indonesia.'],
  ['Mailspace (DomaiNesia)', 'Pengiriman email transaksi dan akses program.'],
];
function Processors() {
  return (
    <div className="stack-12">
      <h2 className="h3">Pemroses data pihak ketiga yang dipakai saat ini</h2>
      <dl className="kv kv--dark kv--stack">{PROCESSORS.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    </div>
  );
}

/* Identitas penyelenggara — hanya fakta yang sudah pasti; tidak mengarang alamat atau nomor izin. */
function Identity() {
  return (
    <section className="section page-top--glow">
      <div className="container stack-20 maxw-760">
        <nav aria-label="Breadcrumb" className="crumbs"><Link to="/">EDU</Link><span>/</span><span>Kebijakan</span><span>/</span><span aria-current="page">Identitas PT EPH</span></nav>
        <h1 className="h1-sm">Identitas penyelenggara</h1>
        <p className="lead muted">VIBOXS EDU dioperasikan oleh VIBOXS, unit usaha PT Ekosistem Pelosok Hub.</p>
        <dl className="kv kv--dark">
          <div><dt>Badan usaha</dt><dd>PT Ekosistem Pelosok Hub</dd></div>
          <div><dt>Unit usaha</dt><dd>VIBOXS</dd></div>
          <div><dt>Situs</dt><dd>edu.viboxs.com · www.viboxs.com</dd></div>
          <div><dt>Kontak resmi</dt><dd><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></dd></div>
          <div><dt>Alamat &amp; nomor izin usaha</dt><dd>Dipublikasikan setelah verifikasi dokumen legal.</dd></div>
        </dl>
        <Link to="/help" className="link-arrow">Pusat bantuan <ArrowRight size={14} /></Link>
      </div>
    </section>
  );
}

/* ---------------- 404 ---------------- */
export function NotFound() {
  return (
    <section className="section full-center">
      <div className="container stack-20 center-text">
        <span className="mono-label">404 · EDU</span>
        <h1 className="h1-sm">Halaman ini tidak tersedia.</h1>
        <p className="lead muted maxw-560 mx-auto">Program yang belum dipublikasikan tidak bisa dibuka. Cek katalog untuk program yang sedang tersedia.</p>
        <div className="row-12 center"><Link to="/programs" className="btn btn--primary">Lihat katalog <ArrowRight /></Link><Link to="/" className="btn btn--ghost">Beranda EDU</Link></div>
      </div>
    </section>
  );
}
