import { useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import DestLink from '../components/DestLink';
import { Split } from '../components/fx';
import { IconBriefcase, IconClock } from '../components/Icons';
import { DEST, ORDER, type DestKey } from '../lib/content';
import { useMotion } from '../lib/motion';

function Orbit({ label }: { label: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 900 900" fill="none" className="orbit-bg">
      <circle cx="450" cy="450" r="140" stroke="rgba(246,247,255,.08)" />
      <g className="spin-rev" style={{ transformOrigin: '450px 450px' }}><circle cx="450" cy="450" r="250" stroke="rgba(246,247,255,.08)" strokeDasharray="2 7" /></g>
      <circle cx="450" cy="450" r="360" stroke="rgba(246,247,255,.06)" />
      <g className="spin-slow" style={{ transformOrigin: '450px 450px' }}><circle cx="450" cy="450" r="360" stroke="rgba(246,247,255,.14)" strokeWidth="6" strokeDasharray="1 36.7" /></g>
      <g className="float">
        <circle cx="641" cy="289" r="22" stroke="var(--v-accent)" strokeWidth="1.5" strokeDasharray="4 5" className="spin" style={{ transformOrigin: '641px 289px' }} />
        <text x="672" y="276" className="mono" fill="var(--v-muted)" fontSize="13">{label}</text>
      </g>
    </svg>
  );
}

export function NotFound() {
  const root = useRef<HTMLDivElement>(null);
  useMotion(root);
  return (
    <section ref={root} className="full-center">
      <Orbit label="/halaman-ini" />
      <div className="full-center__in">
        <code className="mono small accent upper ls-08" data-anim="up">404 · Tidak ditemukan</code>
        <Split as="h1" className="h1-sm" text="Jalur ini tidak ada di peta." />
        <p className="body-17 muted" data-anim="up">Tautan mungkin sudah berubah atau salah ketik. Pilih tujuan dari peta ekosistem.</p>
        <div className="row-12 center" data-anim="up">
          <Link to="/" className="btn btn--primary">Kembali ke beranda</Link>
          <Link to="/ecosystem" className="btn btn--ghost btn--onbg">Buka peta ekosistem</Link>
        </div>
        <div className="dest-links" data-anim="up">
          {ORDER.map((k) => <DestLink key={k} k={k}>{DEST[k].name} <code className="mono xs muted">{DEST[k].domain}</code></DestLink>)}
        </div>
      </div>
    </section>
  );
}

export function Pending() {
  const { key } = useParams();
  const root = useRef<HTMLDivElement>(null);
  useMotion(root, [key]);
  const d = DEST[(key as DestKey)] || null;
  if (!d) return <NotFound />;
  return (
    <section ref={root} className="full-center">
      <Orbit label={d.domain} />
      <div className="full-center__in">
        <span className="icon-tile icon-tile--round" data-anim="up"><IconClock size={24} /></span>
        <code className="mono small muted" data-anim="up">{d.domain}</code>
        <Split as="h1" className="h1-sm" text="Halaman ini sedang disiapkan." />
        <p className="body-17 muted" data-anim="up">{d.name} belum dibuka untuk publik. Sementara itu, jelajahi jalur lain di ekosistem VIBOXS.</p>
        <div className="row-12 center" data-anim="up">
          <Link to="/ecosystem" className="btn btn--light">Kembali ke peta ekosistem</Link>
          <Link to="/" className="btn btn--ghost">Ke beranda</Link>
        </div>
      </div>
    </section>
  );
}

export function Work() {
  const root = useRef<HTMLDivElement>(null);
  useMotion(root);
  return (
    <section ref={root} className="page-hero page-hero--pb">
      <div className="container stack-40">
        <div className="stack-20 maxw-720">
          <code className="mono xs muted" data-anim="up">viboxs.com/work</code>
          <Split as="h1" className="h1" text="Karya terkurasi" />
          <p className="lead muted" data-anim="up">Hanya kasus yang sudah disetujui untuk dipublikasikan. Hasil ditulis hanya jika ada data awal dan tanggal yang bisa diperiksa.</p>
        </div>
        <div className="empty" data-anim="up">
          <span className="icon-tile icon-tile--lg"><IconBriefcase size={24} /></span>
          <h2 className="h3">Belum ada studi kasus yang dipublikasikan</h2>
          <p className="body muted maxw-480">Kami hanya menampilkan karya yang sudah disetujui klien. Sementara itu, lihat bagaimana kami bekerja.</p>
          <Link to="/about" className="btn btn--ghost">Lihat pendekatan kerja</Link>
        </div>
      </div>
    </section>
  );
}

export function Legal({ kind }: { kind: 'privacy' | 'terms' }) {
  const root = useRef<HTMLDivElement>(null);
  useMotion(root, [kind]);
  const title = kind === 'privacy' ? 'Kebijakan privasi' : 'Ketentuan layanan';
  return (
    <section ref={root} className="page-hero page-hero--pb">
      <div className="container stack-32 maxw-720-c">
        <code className="mono xs muted" data-anim="up">viboxs.com/{kind}</code>
        <Split as="h1" className="h1" text={title} />
        <div className="form-card form-card--dashed stack-12" data-anim="up">
          <span className="badge badge--warn self-start">! Menunggu review hukum</span>
          <p className="body muted">Dokumen ini sedang ditinjau dan belum diterbitkan. Kami tidak mengumpulkan data pribadi melalui situs ini sampai kebijakan resmi tersedia.</p>
          <Link to="/contact" className="link-arrow">Ke halaman Kontak →</Link>
        </div>
      </div>
    </section>
  );
}
