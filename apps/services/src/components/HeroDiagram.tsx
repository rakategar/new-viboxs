import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from '@viboxs/shared/icons';
import { reducedMotion } from '@viboxs/shared/motion';
import { HERO, SVC, svcHref } from '../lib/content';

const ROW = 84;
const H = ROW * 5;
const MID = H / 2;
const inPath = (i: number) => `M0 ${ROW / 2 + ROW * i} C36 ${ROW / 2 + ROW * i} 36 ${MID} 72 ${MID}`;
const outPath = (i: number) => `M0 ${MID} C36 ${MID} 36 ${ROW / 2 + ROW * i} 72 ${ROW / 2 + ROW * i}`;

/**
 * Diagram konseptual INPUT → INTERVENSI → OUTPUT (bukan rekam jejak).
 * Desktop: memutar otomatis antar-tantangan sampai pengguna berinteraksi; denyut data mengalir di jalur aktif.
 * Mobile / reduced motion: daftar statis.
 */
export default function HeroDiagram() {
  const [cur, setCur] = useState(0);
  const [auto, setAuto] = useState(true);
  const [wide, setWide] = useState(() => typeof window === 'undefined' || window.matchMedia('(min-width: 980px)').matches);
  const root = useRef<HTMLDivElement>(null);
  const svc = SVC[HERO[cur].s];

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 980px)');
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // auto-cycle (berhenti permanen setelah interaksi pertama; mati di reduced motion)
  useEffect(() => {
    if (!auto || reducedMotion() || !wide) return;
    const t = window.setInterval(() => setCur((c) => (c + 1) % HERO.length), 3200);
    return () => window.clearInterval(t);
  }, [auto, wide]);

  // reveal sekali saat masuk viewport (transisi CSS; langsung tampil di reduced motion)
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (reducedMotion()) { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [wide]);

  const pick = (i: number) => { setAuto(false); setCur(i); };

  return (
    <div ref={root} className={`hd ${shown ? 'is-in' : ''}`}>
      <div className="hd__bar mono-label">
        <span><i className="live-dot" />INPUT → INTERVENSI → OUTPUT · ILUSTRASI KONSEPTUAL</span>
        <span>BUKAN REKAM JEJAK</span>
      </div>
      {wide ? (
        <div className="hd__stage">
          <div className="hd__grid-bg" aria-hidden="true" />
          <div className="hd__cols mono-label" aria-hidden="true">
            <span>TANTANGAN</span><span /><span className="center">INTERVENSI VIBOXS</span><span /><span className="right">CONTOH OUTPUT</span>
          </div>
          <div className="hd__row" style={{ height: H }}>
            <div role="group" aria-label="Pilih tantangan" className="hd__list">
              {HERO.map((r, i) => (
                <div key={i} className="hd__cell" style={{ ['--dl' as string]: `${i * 70}ms`, ['--fx' as string]: '-24px' }}>
                  <button
                    type="button"
                    className={`hd__in ${i === cur ? 'is-on' : ''}`}
                    aria-pressed={i === cur}
                    onMouseEnter={() => pick(i)}
                    onFocus={() => pick(i)}
                    onClick={() => pick(i)}
                  >
                    <span className="mono xxs muted">0{i + 1}</span>
                    <span>{r.i}</span>
                    {i === cur && auto && <span className="hd__timer" aria-hidden="true" key={`t${cur}`} />}
                  </button>
                </div>
              ))}
            </div>
            <Wires paths={HERO.map((_, i) => inPath(i))} cur={cur} dir="in" />
            <div className="hd__mid" style={{ ['--dl' as string]: '1000ms', ['--fx' as string]: '0px' }}>
              <div className="hd__core">
                <div className="hd__scan" aria-hidden="true" />
                <div className="row-between">
                  <img src="/assets/viboxs-wordmark-white.png" alt="" height={12} />
                  <span className="mono-label">METODE</span>
                </div>
                <ol className="hd__method">
                  {['Diagnosis kebutuhan', 'Desain lingkup', 'Pembangunan solusi', 'Review & handover'].map((m, i) => (
                    <li key={m} style={{ ['--d' as string]: `${i * 0.45}s` }}><span>{i + 1}</span>{m}</li>
                  ))}
                </ol>
                <div className="hd__route" aria-live="polite">
                  <span className="xs muted">Ditangani lewat layanan</span>
                  <Link to={svcHref(svc.key)} className="hd__svc" key={svc.key}>
                    {svc.name}<ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
            <Wires paths={HERO.map((_, i) => outPath(i))} cur={cur} dir="out" />
            <div role="list" aria-label="Contoh output" className="hd__list">
              {HERO.map((r, i) => (
                <div role="listitem" key={i} className="hd__cell" style={{ ['--dl' as string]: `${1300 + i * 70}ms`, ['--fx' as string]: '24px' }}>
                  <div className={`hd__out ${i === cur ? 'is-on' : ''}`}>
                    <span>{r.o}</span>
                    {i === cur && <span className="hd__ok"><Check size={14} /></span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="xs-13 muted hd__hint">Arahkan kursor atau fokus ke salah satu tantangan untuk melihat jalurnya.</p>
        </div>
      ) : (
        <div className="hd__mobile">
          {HERO.map((r, i) => (
            <Link to={svcHref(r.s)} key={i} className="hd__mrow">
              <span className="muted">{r.i}</span>
              <span className="hd__marr" aria-hidden="true"><ArrowRight size={14} /></span>
              <span className="strong">{r.o}</span>
            </Link>
          ))}
          <span className="xs-13 muted">Melalui: diagnosis → desain lingkup → pembangunan → review &amp; handover.</span>
        </div>
      )}
    </div>
  );
}

function Wires({ paths, cur, dir }: { paths: string[]; cur: number; dir: 'in' | 'out' }) {
  return (
    <svg width="72" height={H} viewBox={`0 0 72 ${H}`} fill="none" aria-hidden="true" className="hd__wires">
      {paths.map((d, i) => (
        <path key={`b${i}`} d={d} pathLength={100} className="hd__base" strokeDasharray="100" style={{ ['--dl' as string]: `${(dir === 'in' ? 500 : 1100) + i * 50}ms` }} />
      ))}
      {paths.map((d, i) => (
        <path key={`h${i}`} d={d} pathLength={100} className={`hd__hot ${i === cur ? 'is-on' : ''}`} style={{ transitionDelay: i === cur && dir === 'out' ? '160ms' : '0ms' }} />
      ))}
      {!reducedMotion() && (
        <g key={`p${cur}`}>
          {[0, 0.45, 0.9].map((b) => (
            <circle key={b} r="2.6" className="hd__pulse">
              <animateMotion dur="1.35s" begin={`${-(b + (dir === 'out' ? 0.3 : 0))}s`} repeatCount="indefinite" path={paths[cur]} />
            </circle>
          ))}
        </g>
      )}
    </svg>
  );
}
