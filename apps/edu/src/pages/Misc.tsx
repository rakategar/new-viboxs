import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from '@viboxs/shared/icons';
import { useMotion } from '@viboxs/shared/motion';
import EcoLink from '../components/EcoLink';
import Accordion from '../components/Accordion';
import { FAQ, FAQ_G, SUPPORT } from '../lib/data';

/* ---------------- /corporate-training ---------------- */
export function Teams() {
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref);
  return (
    <div ref={ref}>
      <section className="section page-top--glow">
        <div className="container stack-40">
          <div className="stack-20 maxw-760">
            <span className="eyebrow">For Teams</span>
            <h1 className="h1-sm">Belajar sendiri, atau pelatihan untuk seluruh tim?</h1>
            <p className="lead muted">EDU menyediakan kelas publik yang bisa diikuti siapa saja. Untuk pelatihan yang disusun khusus bagi satu organisasi, VIBOXS Services yang menanganinya.</p>
          </div>
          <div className="bridge-grid">
            <div className="bridge bridge--light" data-build="Kartu · Kelas publik">
              <span className="mono-label ink-muted">KELAS PUBLIK · EDU</span>
              <span className="h3">Daftar sebagai individu</span>
              <ul className="bullets"><li>Jadwal, materi, dan harga sudah ditentukan</li><li>Daftar dan bayar langsung di EDU</li><li>Peserta dari berbagai latar belakang</li></ul>
              <Link to="/programs" className="btn btn--ink self-start">Jelajahi Program</Link>
            </div>
            <div className="bridge bridge--s" data-build="Kartu · Training custom">
              <span className="mono xs ls-08 acc-soft">TRAINING CUSTOM · SERVICES</span>
              <span className="h3">Disusun untuk organisasimu</span>
              <ul className="bullets muted"><li>Materi dan studi kasus disesuaikan dengan proses tim</li><li>Jadwal dan format disepakati bersama</li><li>Berbasis proposal dan ruang lingkup kerja (SOW)</li></ul>
              <EcoLink k="services" path="/start?org=perusahaan&from=EDU%20training" className="btn btn--primary self-start">Diskusikan pelatihan untuk tim ↗</EcoLink>
              <span className="xs-13 muted">Membuka services.viboxs.com/start dengan topik training.</span>
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
          <nav aria-label="Breadcrumb" className="crumbs"><Link to="/">EDU</Link><span>/</span><span aria-current="page">Help</span></nav>
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
          <section className="help-cta" data-build="Panel · Kontak">
            <span className="stack-6"><span className="h4">Masih butuh bantuan?</span><span className="body o80">Sertakan nomor order atau registrasi bila ada.</span></span>
            <span className="slot slot--onink">[Email bantuan resmi — menunggu verifikasi]</span>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ---------------- /policies/:kind ---------------- */
const POL: Record<string, string> = { purchase: 'Kebijakan pembelian', refund: 'Refund & reschedule', privacy: 'Kebijakan privasi', terms: 'Ketentuan layanan' };
export function Policy() {
  const { kind = '' } = useParams();
  const t = POL[kind];
  if (!t) return <NotFound />;
  return (
    <section className="section page-top--glow">
      <div className="container stack-20 maxw-760">
        <nav aria-label="Breadcrumb" className="crumbs"><Link to="/">EDU</Link><span>/</span><span>Kebijakan</span><span>/</span><span aria-current="page">{t}</span></nav>
        <h1 className="h1-sm">{t}</h1>
        <p className="lead muted">Dokumen ini sedang ditinjau tim hukum. Pembayaran berbayar tidak dibuka sebelum kebijakan final dipublikasikan di halaman ini.</p>
        <div className="slot slot--lg">[Isi {t.toLowerCase()} — menunggu review hukum]</div>
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
