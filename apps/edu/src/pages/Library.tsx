import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight } from '@viboxs/shared/icons';
import { useTilt } from '@viboxs/shared/fx';
import { reducedMotion, useMotion } from '@viboxs/shared/motion';
import Status, { Sample } from '../components/Status';
import { NotFound } from './Misc';
import { SUPPORT, bySlug } from '../lib/data';

const PREV = ['Daftar isi', 'Bab 2 · Prinsip dasar', 'Bab 3 · Pola email'];

/** /library tanpa slug → katalog berfilter e-book (satu sumber dengan /programs). */
export function LibraryIndex() {
  return <Navigate to="/programs?format=ebook&time=all" replace />;
}

export default function Library() {
  const { slug } = useParams();
  const eb = bySlug(slug);
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref, [slug]);
  const cover = useTilt<HTMLDivElement>(7);
  const [pg, setPg] = useState(0);
  const [turn, setTurn] = useState<'' | 'out' | 'in'>('');

  useEffect(() => { setPg(0); }, [slug]);
  if (!eb || eb.type !== 'ebook') return <NotFound />;

  function flip(i: number) {
    if (i === pg) return;
    if (reducedMotion()) { setPg(i); return; }
    setTurn('out');
    window.setTimeout(() => { setPg(i); setTurn('in'); window.setTimeout(() => setTurn(''), 260); }, 220);
  }

  return (
    <div ref={ref} className="light pad-page">
      <div className="container stack-64">
        <nav aria-label="Breadcrumb" className="crumbs crumbs--light"><Link to="/">EDU</Link><span>/</span><Link to="/library">Digital Library</Link><span>/</span><span aria-current="page">{eb.title}</span></nav>
        <div className="split-2 align-center">
          <div className="cover-wrap" data-build="Sampul · E-book">
            <div ref={cover} className="cover">
              <span className="cover__glow" aria-hidden="true" />
              <span className="row-between rel"><img src="/assets/viboxs-wordmark-white.png" alt="" height={11} /><span className="mono xxs ls-08">EDU · GUIDE</span></span>
              <span className="stack-12 rel"><span className="cover__rule" /><span className="cover__t">{eb.title}</span></span>
              <span className="mono xxs ls-08 rel cover__meta">{eb.version} · {eb.fileFmt} · [COVER CONTOH]</span>
            </div>
          </div>
          <div className="stack-20">
            <span className="row-8"><span className="tag tag--ink">E-BOOK</span><Status code={eb.status} still /><Sample inline /></span>
            <h1 className="h1-sm">{eb.title}</h1>
            <p className="body-17 ink-muted">{eb.summary}</p>
            <dl className="meta-grid">
              <div><dt>Format file</dt><dd>{eb.fileFmt}</dd></div>
              <div><dt>Versi</dt><dd>{eb.version}</dd></div>
              <div><dt>Bahasa</dt><dd>{eb.lang}</dd></div>
              <div><dt>Halaman</dt><dd>{eb.pages}</dd></div>
            </dl>
            <span className="small ink-muted">Penulis: {eb.author}</span>
            <div className="buyrow" data-build="Panel · Beli">
              <span className="stack-2"><span className="price-xl">[Harga]</span><span className="xs-13 ink-muted">Pajak &amp; biaya: [menunggu ketentuan]</span></span>
              <Link to={`/checkout/${eb.slug}`} className="btn btn--primary btn--lg">Beli e-book <ArrowRight /></Link>
            </div>
          </div>
        </div>

        <section aria-labelledby="pv-h" className="stack-20">
          <div className="row-between flex-wrap"><h2 id="pv-h" className="h2-block">Preview 3 halaman</h2><span className="mono xxs ink-muted">ISI PREVIEW [CONTOH] — MENUNGGU FILE FINAL</span></div>
          <div className="preview">
            <div className="stack-16 preview__book">
              <div className="preview__persp">
                <div role="img" aria-label={`Halaman preview ${pg + 1} dari 3`} className={`page-sheet ${turn ? `is-${turn}` : ''}`}>
                  {pg === 0 && (
                    <>
                      <span className="mono-label ink-muted">DAFTAR ISI</span>
                      <ol className="toc">{eb.toc!.map((t, i) => <li key={t}><span className="mono ink-muted">{String(i + 1).padStart(2, '0')}</span>{t}</li>)}</ol>
                    </>
                  )}
                  {pg === 1 && (
                    <>
                      <span className="mono-label ink-muted">BAB 2</span>
                      <span className="h3">Prinsip dasar menulis prompt</span>
                      <p className="small ink-muted lh-17">Prompt yang baik menjawab tiga hal: apa tujuannya, konteks apa yang perlu diketahui, dan dalam format apa hasilnya diharapkan.</p>
                      <span className="ln" /><span className="ln w92" /><span className="ln w84" /><span className="ln w60" />
                    </>
                  )}
                  {pg === 2 && (
                    <>
                      <span className="mono-label ink-muted">BAB 3 · POLA</span>
                      <span className="h3">Membalas email pelanggan</span>
                      <div className="codebox">Tujuan: balas keluhan keterlambatan pengiriman.<br />Konteks: pelanggan setia, pesanan #[nomor].<br />Format: 3 paragraf pendek, nada sopan.</div>
                      <span className="xs-13 ink-muted lh">Catatan periksa: pastikan janji waktu pengiriman sesuai data operasional sebelum dikirim.</span>
                    </>
                  )}
                </div>
              </div>
              <div className="row-8 center">
                <button type="button" className="round-btn" aria-label="Halaman sebelumnya" onClick={() => flip((pg + 2) % 3)}>←</button>
                <span aria-live="polite" className="xs-13 ink-muted pg-lbl">Halaman preview {pg + 1} dari 3</span>
                <button type="button" className="round-btn" aria-label="Halaman berikutnya" onClick={() => flip((pg + 1) % 3)}>→</button>
              </div>
            </div>
            <div className="stack-12">
              {PREV.map((t, i) => (
                <button key={t} type="button" className={`thumb ${pg === i ? 'is-on' : ''}`} aria-pressed={pg === i} onClick={() => flip(i)}>
                  <span className="thumb__n">{i + 1}</span><span className="strong">{t}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="quad" data-build="Blok · Ketentuan e-book">
          <div className="box"><span className="mono-label ink-muted">COCOK UNTUK</span><span className="body">{eb.forWho} · {eb.level}</span></div>
          <div className="box"><span className="mono-label ink-muted">CARA DELIVERY</span><span className="body">Setelah pembayaran terkonfirmasi, link unduhan PDF &amp; EPUB dikirim ke email yang kamu gunakan. Masa berlaku link: [menunggu kebijakan].</span></div>
          <div className="box"><span className="mono-label ink-muted">LISENSI</span><span className="body">Untuk penggunaan pribadi satu pembeli. Tidak untuk dibagikan atau dijual ulang.</span></div>
          <div className="box"><span className="mono-label ink-muted">REFUND</span><span className="body">[Ketentuan refund produk digital — menunggu kebijakan pembelian final]</span></div>
        </section>
        <section className="stack-16">
          <h2 className="h2-block">Butuh bantuan dengan file?</h2>
          <div className="support-row">{SUPPORT.map(([t, d]) => <Link key={t} to="/help" className="support"><span className="strong small">{t}</span><span className="xs-13 ink-muted">{d}</span></Link>)}</div>
        </section>
      </div>
    </div>
  );
}
