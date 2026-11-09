import { useRef } from 'react';
import { Link } from 'react-router-dom';
import DestLink from '../components/DestLink';
import { Magnetic, Split, useSpotlight } from '../components/fx';
import { ArrowRight, destIcon } from '../components/Icons';
import { DEST, ORDER, type DestKey, isPending } from '../lib/content';
import { useMotion } from '../lib/motion';

function MapCard({ k }: { k: DestKey }) {
  const d = DEST[k];
  const Ico = destIcon[k];
  const ref = useSpotlight<HTMLDivElement>();
  const pend = isPending(k);
  return (
    <div ref={ref} className={`map-card ${pend ? 'is-pending' : ''}`}>
      <span className="eco-card__glow" aria-hidden="true" />
      <div className="row-between"><span className="icon-tile icon-tile--sm"><Ico size={20} /></span><code className="mono xxs muted upper">{d.tag}</code></div>
      <div className="stack-4"><h2 className="h3">{d.name}</h2><code className="mono xs muted">{d.domain}</code></div>
      <div className="stack-8">
        <span className="eyebrow">Pemilik aktivitas</span>
        <ul className="owns">{d.owns.map((o) => <li key={o}><span aria-hidden="true">→</span>{o}</li>)}</ul>
      </div>
      {pend && <span className="badge badge--pending self-start">◷ Sedang disiapkan</span>}
      <DestLink k={k} className="link-arrow">{pend ? 'Lihat status' : d.cta} <ArrowRight size={16} /></DestLink>
    </div>
  );
}

export default function Ecosystem() {
  const root = useRef<HTMLDivElement>(null);
  useMotion(root);
  return (
    <div ref={root}>
      <section className="page-hero">
        <div className="page-hero__glow" aria-hidden="true" data-parallax="60" />
        <div className="container stack-24 rel">
          <code className="mono xs muted" data-anim="up">viboxs.com/ecosystem</code>
          <Split as="h1" className="h1 maxw-14ch" text="Temukan jalur yang relevan." />
          <p className="lead muted maxw-640" data-anim="up">VIBOXS menghubungkan pembelajaran, jejaring One Person Company, dan solusi profesional dalam satu identitas. Pilih jalur, lalu lanjut langsung ke situsnya.</p>
          <div className="row-8" data-anim="stagger">
            {ORDER.map((k) => (
              <DestLink key={k} k={k} className={`dest-pill ${isPending(k) ? 'is-pending' : ''}`}>{DEST[k].name}<code className="mono xs muted">{DEST[k].domain}</code>→</DestLink>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-section">
        <div className="container">
          <div className="map-board" data-anim="up">
            <div className="gridbg gridbg--top" aria-hidden="true" />
            <span className="mono-label self-start pb-24 rel">PETA KEPEMILIKAN AKTIVITAS</span>
            <div className="map-board__core rel">
              <span className="map__halo" aria-hidden="true" />
              <img src="/assets/viboxs-wordmark-white.png" alt="VIBOXS" height={16} />
              <span className="small muted">Satu identitas · AI Venture Studio</span>
            </div>
            <svg className="map-board__lines" viewBox="0 0 1000 60" preserveAspectRatio="none" aria-hidden="true">
              <path data-draw d="M500 0 V30 H166.7 V60" stroke="var(--v-line-strong)" fill="none" vectorEffect="non-scaling-stroke" />
              <path data-draw d="M500 0 V60" stroke="var(--v-line-strong)" fill="none" vectorEffect="non-scaling-stroke" />
              <path data-draw d="M500 0 V30 H833.3 V60" stroke="var(--v-line-strong)" fill="none" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="map-board__grid rel" data-anim="stagger">
              {ORDER.map((k) => <MapCard key={k} k={k} />)}
            </div>
            <p className="xs-13 muted center rel mt-24">Garis menunjukkan kepemilikan aktivitas — bukan jumlah, ukuran, atau peringkat.</p>
          </div>
        </div>
      </section>

      <section className="section section--line">
        <div className="container stack-32">
          <div className="stack-12"><span className="eyebrow" data-anim="up">Pilih berdasarkan kebutuhan</span><Split className="h2" text="Mulai dari pertanyaan Anda." /></div>
          <div className="q-list" data-anim="stagger">
            {ORDER.map((k) => (
              <DestLink key={k} k={k} className="q-row">
                <span className="q-row__q">{DEST[k].q}</span>
                <span className="q-row__dest">
                  <span className="q-row__name"><b>{DEST[k].name}</b><code className="mono xs muted">{isPending(k) ? 'Sedang disiapkan' : DEST[k].role}</code></span>
                  <span className="round-arrow"><ArrowRight size={18} /></span>
                </span>
              </DestLink>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--line">
        <div className="container stack-32">
          <div className="stack-12 maxw-640"><span className="eyebrow" data-anim="up">Contoh hubungan</span><Split className="h2" text="Jalur bisa saling bersambung." /><p className="body-16 muted" data-anim="up">Beberapa contoh kemungkinan — bukan paket atau alur wajib.</p></div>
          <div className="rel-grid" data-anim="stagger">
            {[
              { chain: [['Anggota Universe', ''], ['Sesi EDU', 'light']], d: 'Founder OPC memperdalam kemampuan lewat program EDU yang relevan dengan bisnisnya.' },
              { chain: [['Founder OPC', ''], ['Services', 'acc2']], d: 'Saat butuh sistem yang lebih besar, founder bisa didampingi tim Services untuk merancang dan membangunnya.' },
              { chain: [['Tim organisasi', ''], ['EDU', 'light'], ['Services', 'acc2']], d: 'Tim belajar lebih dulu di EDU, lalu membangun solusinya bersama Services.' },
            ].map((r, i) => (
              <div key={i} className="rel-card">
                <div className="chain">
                  {r.chain.map(([t, c], j) => (
                    <span key={t} className="chain__seg">
                      {j > 0 && <svg width="28" height="12" viewBox="0 0 28 12" fill="none" stroke="currentColor" aria-hidden="true" className="chain__arrow"><path d="M1 6h25M21 1l5 5-5 5" /></svg>}
                      <span className={`chain__pill ${c}`}>{t}</span>
                    </span>
                  ))}
                </div>
                <p className="body muted">{r.d}</p>
              </div>
            ))}
          </div>
          <p className="xs-13 muted">Manfaat dan ketersediaan mengikuti program masing-masing.</p>
        </div>
      </section>

      <section className="pb-section-xl">
        <div className="container">
          <div className="reassure" data-anim="up">
            <div className="stack-8 maxw-560"><h2 className="h2-sm">Semua berada di bawah identitas VIBOXS.</h2><p className="body-16 ink-muted">Satu master brand, satu entitas, tiga jalur yang dikelola masing-masing.</p></div>
            <div className="row-10">
              <Magnetic><Link to="/about" className="btn btn--ink">Tentang VIBOXS</Link></Magnetic>
              <Magnetic><Link to="/contact" className="btn btn--ink-ghost">Kontak</Link></Magnetic>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
