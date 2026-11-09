import { useRef } from 'react';
import { Link } from 'react-router-dom';
import DestLink from '../components/DestLink';
import { Magnetic, Split } from '../components/fx';
import { IconBuild, IconLayout, IconSearch, IconSupport } from '../components/Icons';
import { DEST, ORDER } from '../lib/content';
import { useMotion } from '../lib/motion';

const APPROACH = [
  { Ico: IconSearch, t: 'Pahami kebutuhan', d: 'Konteks, proses berjalan, dan batasan dipetakan bersama.' },
  { Ico: IconLayout, t: 'Rancang solusi', d: 'Alternatif dipetakan beserta cakupan dan risikonya.' },
  { Ico: IconBuild, t: 'Bangun & uji', d: 'Dibangun bertahap, diuji dengan data contoh.' },
  { Ico: IconSupport, t: 'Dukung', d: 'Pendampingan dan perbaikan dari masukan nyata.' },
];

export default function About() {
  const root = useRef<HTMLDivElement>(null);
  useMotion(root);
  return (
    <div ref={root}>
      <section className="page-hero">
        <div className="page-hero__glow page-hero__glow--l" aria-hidden="true" data-parallax="60" />
        <div className="container stack-48 rel">
          <div className="split-2 align-end">
            <div className="stack-20">
              <code className="mono xs muted" data-anim="up">viboxs.com/about</code>
              <Split as="h1" className="h1" text="VIBOXS, AI Venture Studio." />
            </div>
            <p className="lead muted maxw-620" data-anim="up">Kami membangun pendekatan bisnis dan teknologi yang berangkat dari kebutuhan nyata. VIBOXS mengembangkan ekosistem yang mempertemukan pembelajaran, komunitas One Person Company, serta solusi profesional untuk individu dan organisasi.</p>
          </div>
          <dl className="facts" data-anim="stagger">
            <div><dt className="mono xs muted">BENTUK</dt><dd>Unit AI Venture Studio</dd></div>
            <div><dt className="mono xs muted">DI BAWAH</dt><dd>PT Ekosistem Pelosok Hub</dd></div>
            <div><dt className="mono xs muted">FOKUS</dt><dd>Belajar · terhubung · membangun</dd></div>
          </dl>
        </div>
      </section>

      <section className="section section--line">
        <div className="container stack-40">
          <div className="stack-12 maxw-640"><span className="eyebrow" data-anim="up">Pendekatan</span><Split className="h2" text="Dari kebutuhan, ke solusi yang terpakai." /><p className="body-16 muted" data-anim="up">Ilustrasi proses — bukan SLA atau janji waktu.</p></div>
          <div className="approach">
            <svg className="approach__line" viewBox="0 0 1000 2" preserveAspectRatio="none" aria-hidden="true">
              <defs><linearGradient id="ag" x1="0" x2="1"><stop offset="0" stopColor="var(--v-accent-2)" /><stop offset="1" stopColor="var(--v-accent)" /></linearGradient></defs>
              <path data-draw d="M0 1 H1000" stroke="url(#ag)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
            <ol className="approach__list" data-anim="stagger">
              {APPROACH.map(({ Ico, t, d }, i) => (
                <li key={t}>
                  <span className="approach__ico"><Ico size={20} /><em className="mono">0{i + 1}</em></span>
                  <h3 className="h4">{t}</h3>
                  <p className="body muted">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="section section--line">
        <div className="container split-2 align-start">
          <div className="stack-12"><span className="eyebrow" data-anim="up">Ekosistem</span><Split className="h2" text="Tiga jalur di bawah satu nama." /><Link to="/ecosystem" className="link-arrow" data-anim="up">Lihat peta ekosistem →</Link></div>
          <div className="d-list" data-anim="stagger">
            {ORDER.map((k) => (
              <DestLink key={k} k={k} className="d-row"><b>{DEST[k].name}</b><span className="muted">{DEST[k].desc}</span><span aria-hidden="true" className="d-row__arr">→</span></DestLink>
            ))}
          </div>
        </div>
      </section>

      <section className="light section">
        <div className="container split-2 align-start">
          <div className="stack-12"><span className="eyebrow ink-muted" data-anim="up">Tata kelola</span><Split className="h2" text="Identitas hukum" /><p className="body-16 ink-muted maxw-460" data-anim="up">Data legal ditampilkan setelah diverifikasi. Slot bergaris menandai informasi yang belum boleh diisi.</p></div>
          <dl className="legal-dl" data-anim="up">
            <div><dt>Entitas hukum</dt><dd><b>PT Ekosistem Pelosok Hub</b></dd></div>
            <div><dt>Unit</dt><dd><b>VIBOXS — AI Venture Studio</b></dd></div>
            <div><dt>NIB</dt><dd><span className="slot-ink">[Menunggu verifikasi legal]</span></dd></div>
            <div><dt>Alamat terdaftar</dt><dd><span className="slot-ink">[Menunggu verifikasi legal]</span></dd></div>
            <div><dt>Kontak resmi</dt><dd><span className="slot-ink">[Email/kanal resmi — menunggu]</span></dd></div>
          </dl>
        </div>
      </section>

      <section className="section section--xl">
        <div className="container center-head">
          <Split className="h2 maxw-20ch" text="Mulai dari jalur yang paling relevan." />
          <div className="row-10 center" data-anim="up">
            <Magnetic><DestLink k="universe" className="btn btn--primary">Universe</DestLink></Magnetic>
            <Magnetic><DestLink k="edu" className="btn btn--ghost">EDU</DestLink></Magnetic>
            <Magnetic><DestLink k="services" className="btn btn--ghost">Services</DestLink></Magnetic>
            <Magnetic><Link to="/contact" className="btn btn--ghost">Kontak</Link></Magnetic>
          </div>
        </div>
      </section>
    </div>
  );
}
