import { useRef, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from '@viboxs/shared/icons';
import { useMotion } from '@viboxs/shared/motion';
import Status, { toneOf } from '../components/Status';
import { CATALOG_FILLED, PROGRAMS, STATUS, STATUS_EFFECT, STATUS_ORDER, TYPE, byDate, ctaFor, hrefOf, priceOf, whenOf } from '../lib/data';

export default function Events() {
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref);
  const sessions = PROGRAMS.filter((p) => p.type !== 'ebook');
  const up = sessions.filter((p) => !p.past).sort(byDate);
  const past = sessions.filter((p) => p.past);

  return (
    <div ref={ref}>
      <section className="page-top">
        <div className="container stack-20">
          <nav aria-label="Breadcrumb" className="crumbs"><Link to="/">EDU</Link><span>/</span><span aria-current="page">Events</span></nav>
          <h1 className="h1-sm">Jadwal event</h1>
          <p className="body-17 muted maxw-620">Webinar dan workshop yang diumumkan. Semua jam dalam WIB, ditulis lengkap — hari, tanggal, jam, dan lokasi atau link.</p>
        </div>
      </section>
      <div className="light pad-page">
        <div className="container stack-48">
          <section aria-labelledby="leg-h" className="legend" data-build="Panel · Arti status">
            <h2 id="leg-h" className="strong body">Arti status sesi</h2>
            <ul>
              {STATUS_ORDER.map((k) => (
                <li key={k} style={{ '--tone': toneOf(k) } as CSSProperties}>
                  <span className="row-8"><Status code={k} size="sm" /><span className="mono xxs ink-muted ls-08">{k}</span></span>
                  <span className="xs-13 ink-muted lh">{STATUS_EFFECT[k] || STATUS[k].label}</span>
                </li>
              ))}
            </ul>
          </section>
          {CATALOG_FILLED ? (
            <>
              <section className="stack-20">
                <h2 className="h2-block">Mendatang</h2>
                <ol className="tl tl--lg">
                  <span className="tl__line" aria-hidden="true" data-draw-line />
                  {up.map((p) => {
                    const strike = p.status === 'CANCELLED';
                    return (
                      <li key={p.slug} className="tl__item" data-build={`Sesi · ${p.dShort} ${p.mShort}`}>
                        <span className="tl__date"><b className={strike ? 'strike' : ''}>{p.dShort}</b><span>{p.mShort}</span></span>
                        <Link to={hrefOf(p, 'events')} className={`tl__card tl__card--row ${['CLOSED', 'CANCELLED'].includes(p.status) ? 'is-dim' : ''}`}>
                          <span className="stack-6 min0">
                            <span className="row-8"><span className="pcard__type">{TYPE[p.type]} · [contoh]</span><Status code={p.status} size="sm" /></span>
                            <span className={`strong lg-18 ${strike ? 'strike' : ''}`}>{p.title}</span>
                            <span className="small ink-muted">{whenOf(p)} · {p.time} · {p.loc}</span>
                            {p.status === 'RESCHEDULED' && <span className="resched-pill">↻ Jadwal berubah · sebelumnya <s>{p.prevDate}</s></span>}
                          </span>
                          <span className="tl__end"><b>{priceOf(p)}</b><span className="pcard__cta">{ctaFor(p)}<ArrowRight size={14} /></span></span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </section>
              <section className="stack-16">
                <h2 className="h2-block">Arsip</h2>
                {past.map((p) => (
                  <Link key={p.slug} to={hrefOf(p, 'events')} className="archive" data-build="Arsip · Sesi">
                    <span className="stack-4"><span className="strong">{p.title}</span><span className="small ink-muted">{whenOf(p)} · {p.time}</span></span>
                    <Status code={p.status} size="sm" />
                  </Link>
                ))}
              </section>
            </>
          ) : (
            <div className="empty-box"><span className="h4">Jadwal berikutnya belum diumumkan.</span><span className="body ink-muted">Event tampil setelah topik, fasilitator, tanggal, dan platformnya pasti.</span></div>
          )}
        </div>
      </div>
    </div>
  );
}
