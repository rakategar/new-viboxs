import { useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from '@viboxs/shared/icons';
import { useTilt } from '@viboxs/shared/fx';
import { useMotion } from '@viboxs/shared/motion';
import Status from '../components/Status';
import ProgramCard from '../components/ProgramCard';
import NotifyForm from '../components/NotifyForm';
import { NotFound } from './Misc';
import { useJsonLd, programLd } from '../lib/ld';
import { CATALOG_FILLED, PROGRAMS, SUPPORT, bySlug, canPay, priceOf } from '../lib/data';

/**
 * /digital-library — eksplorasi e-book & kit (PRD §04.3), terpisah dari katalog Programs.
 * Tidak ada kartu demo: tanpa e-book terbit, tampil empty state jujur (QA EDU-011).
 */
export function LibraryIndex() {
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref);
  const books = CATALOG_FILLED ? PROGRAMS.filter((p) => p.type === 'ebook') : [];
  return (
    <div ref={ref}>
      <section className="page-top">
        <div className="container stack-20">
          <nav aria-label="Breadcrumb" className="crumbs"><Link to="/">EDU</Link><span>/</span><span aria-current="page">Digital Library</span></nav>
          <h1 className="h1-sm">Digital Library</h1>
          <p className="body-17 muted maxw-620">E-book dan kit praktis yang bisa dibaca kapan saja. Setiap judul mencantumkan daftar isi, format file, lisensi, dan untuk siapa materinya cocok sebelum kamu membeli.</p>
        </div>
      </section>
      <div className="light pad-page">
        <div className="container stack-32">
          {books.length ? (
            <div className="card-grid card-grid--anim">{books.map((p) => <ProgramCard key={p.slug} p={p} />)}</div>
          ) : (
            <div className="empty-box maxw-720" data-build="Blok · Library kosong">
              <span className="h4">E-book sedang disiapkan.</span>
              <span className="body ink-muted">Belum ada judul yang bisa dibeli saat ini. Judul baru tampil di sini setelah file final, hak distribusi, dan harganya disetujui.</span>
              <NotifyForm label="Email untuk pemberitahuan" consent="Saya setuju menerima email saat e-book EDU terbit." done="Terima kasih. Kami kabari saat e-book pertama terbit." />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Library() {
  const { slug } = useParams();
  const eb = bySlug(slug);
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref, [slug]);
  const cover = useTilt<HTMLDivElement>(7);
  useJsonLd(eb && eb.type === 'ebook' ? programLd(eb) : null);
  if (!eb || eb.type !== 'ebook') return <NotFound />;

  const canBuy = eb.status === 'AVAILABLE' && canPay(eb);
  const meta = ([['Format file', eb.fileFmt], ['Versi', eb.version], ['Bahasa', eb.lang], ['Halaman', eb.pages]] as [string, string | undefined][])
    .filter((x): x is [string, string] => !!x[1] && !/^\[/.test(x[1]));

  return (
    <div ref={ref} className="light pad-page">
      <div className="container stack-64">
        <nav aria-label="Breadcrumb" className="crumbs crumbs--light"><Link to="/">EDU</Link><span>/</span><Link to="/digital-library">Digital Library</Link><span>/</span><span aria-current="page">{eb.title}</span></nav>
        <div className="split-2 align-center">
          <div className="cover-wrap" data-build="Sampul · E-book">
            {eb.cover ? (
              <div ref={cover} className="cover cover--img"><img src={eb.cover} alt={`Sampul ${eb.title}`} /></div>
            ) : (
              <div ref={cover} className="cover">
                <span className="cover__glow" aria-hidden="true" />
                <span className="row-between rel"><img src="/assets/viboxs-wordmark-white.png" alt="" height={11} /><span className="mono xxs ls-08">EDU · LIBRARY</span></span>
                <span className="stack-12 rel"><span className="cover__rule" /><span className="cover__t">{eb.title}</span></span>
                <span className="mono xxs ls-08 rel cover__meta">{[eb.version, eb.fileFmt].filter(Boolean).join(' · ')}</span>
              </div>
            )}
          </div>
          <div className="stack-20">
            <span className="row-8"><span className="tag tag--ink">E-BOOK</span><Status code={eb.status} still /></span>
            <h1 className="h1-sm">{eb.title}</h1>
            <p className="body-17 ink-muted">{eb.summary}</p>
            {meta.length > 0 && <dl className="meta-grid">{meta.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
            {eb.author && !/^\[/.test(eb.author) && <span className="small ink-muted">Penulis: {eb.author}</span>}
            <div className="buyrow" data-build="Panel · Beli">
              <span className="stack-2"><span className="price-xl">{priceOf(eb)}</span><span className="xs-13 ink-muted">Total final tampil sebelum kamu membayar.</span></span>
              {canBuy
                ? <Link to={`/checkout/${eb.slug}`} className="btn btn--primary btn--lg">{eb.free ? 'Dapatkan e-book' : 'Beli e-book'} <ArrowRight /></Link>
                : <button type="button" className="btn btn--off btn--lg" disabled aria-disabled="true">{eb.status === 'AVAILABLE' ? 'Pembayaran online sedang disiapkan' : 'Belum tersedia'}</button>}
            </div>
            {!canBuy && <NotifyForm compact label="Kabari saya saat bisa dibeli" consent="Saya setuju menerima email pemberitahuan." done="Kami kabari lewat email." />}
          </div>
        </div>

        {!!eb.toc?.length && (
          <section aria-labelledby="toc-h" className="stack-16 maxw-760">
            <h2 id="toc-h" className="h2-block">Daftar isi</h2>
            <ol className="toc">{eb.toc.map((t, i) => <li key={t}><span className="mono ink-muted">{String(i + 1).padStart(2, '0')}</span>{t}</li>)}</ol>
          </section>
        )}

        <section className="quad" data-build="Blok · Ketentuan e-book">
          <div className="box"><span className="mono-label ink-muted">COCOK UNTUK</span><span className="body">{[eb.forWho, eb.level].filter(Boolean).join(' · ') || 'Semua pembelajar'}</span></div>
          <div className="box"><span className="mono-label ink-muted">CARA AKSES</span><span className="body">{eb.access || 'Setelah pembayaran terverifikasi server, tautan unduhan aman (berbatas waktu) dikirim ke email pembeli.'}</span></div>
          <div className="box"><span className="mono-label ink-muted">LISENSI</span><span className="body">Untuk penggunaan pribadi satu pembeli. Tidak untuk dibagikan atau dijual ulang.</span></div>
          <div className="box"><span className="mono-label ink-muted">REFUND</span><span className="body">Mengikuti <Link to="/policies/refund" className="strong">kebijakan refund</Link> produk digital yang sedang ditinjau tim hukum.</span></div>
        </section>
        <section className="stack-16">
          <h2 className="h2-block">Butuh bantuan dengan file?</h2>
          <div className="support-row">{SUPPORT.map(([t, d]) => <Link key={t} to="/help" className="support"><span className="strong small">{t}</span><span className="xs-13 ink-muted">{d}</span></Link>)}</div>
        </section>
      </div>
    </div>
  );
}
