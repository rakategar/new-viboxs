import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { CHIPS, DEST, ORDER, PHRASES, type DestKey, isPending, matchIntent } from '../lib/content';
import { reducedMotion } from '../lib/motion';
import { useTilt } from './fx';
import { ArrowRight, ArrowUp, destIcon } from './Icons';
import DestLink from './DestLink';

const PATHS: Record<DestKey, string> = {
  universe: 'M320 260 Q257 170 147 160',
  edu: 'M320 260 Q430 250 493 160',
  services: 'M320 260 Q274 360 320 460',
};
const NODE_POS: Record<DestKey, { left: string; top: string }> = {
  universe: { left: '22.97%', top: '30.77%' },
  edu: { left: '77.03%', top: '30.77%' },
  services: { left: '50%', top: '88.46%' },
};
const LABELS: Record<DestKey, { x: number; y: number; anchor: 'middle' | 'end'; t: string }> = {
  universe: { x: 236, y: 206, anchor: 'middle', t: 'terhubung' },
  edu: { x: 424, y: 256, anchor: 'middle', t: 'belajar' },
  services: { x: 268, y: 372, anchor: 'end', t: 'membangun' },
};

export default function RouteFinder() {
  const [focus, setFocus] = useState<DestKey | null>(null);
  const [pick, setPick] = useState<DestKey | null>(null);
  const [result, setResult] = useState<DestKey | 'none' | null>(null);
  const [query, setQuery] = useState('');
  const [qFocus, setQFocus] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const qRef = useRef<HTMLTextAreaElement>(null);
  const typeT = useRef(0);
  const stageRef = useTilt<HTMLDivElement>(2.5);
  const mapRef = useRef<HTMLDivElement>(null);

  // Garis peta tergambar saat terlihat (sekali)
  useEffect(() => {
    if (reducedMotion()) { setDrawn(true); return; }
    const el = mapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { setDrawn(true); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Placeholder mengetik (berhenti saat fokus/terisi; 2 putaran)
  useEffect(() => {
    if (reducedMotion()) return;
    let pi = 0, ci = 0, dir = 1, rounds = 0;
    const tick = () => {
      const el = qRef.current;
      if (!el || el === document.activeElement || el.value) return;
      const ph = PHRASES[pi];
      if (dir === 1) {
        ci++; el.setAttribute('placeholder', ph.slice(0, ci) + '▍');
        if (ci >= ph.length) { el.setAttribute('placeholder', ph); dir = -1; typeT.current = window.setTimeout(tick, 1800); return; }
        typeT.current = window.setTimeout(tick, 36);
      } else {
        ci = Math.max(0, ci - 3); el.setAttribute('placeholder', ph.slice(0, ci) + '▍');
        if (ci === 0) {
          pi = (pi + 1) % PHRASES.length; dir = 1;
          if (pi === 0 && ++rounds >= 2) { el.setAttribute('placeholder', 'Contoh: ' + PHRASES[0].toLowerCase()); return; }
        }
        typeT.current = window.setTimeout(tick, 16);
      }
    };
    typeT.current = window.setTimeout(tick, 1400);
    return () => window.clearTimeout(typeT.current);
  }, []);

  const stopTyping = () => {
    window.clearTimeout(typeT.current);
    qRef.current?.setAttribute('placeholder', 'Contoh: ' + PHRASES[0].toLowerCase());
  };

  function route() {
    const q = query.trim();
    if (!q) { qRef.current?.focus(); return; }
    const k = matchIntent(q);
    setResult(k || 'none');
    setPick(k);
  }
  const onSubmit = (e: FormEvent) => { e.preventDefault(); route(); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); route(); } };

  const act = focus || pick;
  const res = result && result !== 'none' ? DEST[result] : null;

  return (
    <div ref={stageRef} className="stage">
      <form className="stage__form" onSubmit={onSubmit}>
        <div className="stack-10">
          <span className="mono-label">PEMANDU JALUR</span>
          <label htmlFor="q" className="stage__q">Apa langkah Anda berikutnya?</label>
          <span className="small muted lh">Ketik singkat atau pilih contoh. Kami arahkan ke jalur yang relevan — ini pencocokan kata kunci, bukan chat AI.</span>
        </div>
        <div className={`qbox ${qFocus ? 'is-focus' : ''}`}>
          <textarea
            id="q" ref={qRef} rows={2} value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { stopTyping(); setQFocus(true); }}
            onBlur={() => setQFocus(false)}
            onKeyDown={onKey}
            placeholder="Contoh: saya ingin memulai bisnis sendiri dengan AI"
          />
          <div className="qbox__row">
            <span className="xs muted">Tekan Enter untuk mencari</span>
            <button type="submit" className="qbox__go" aria-label="Cari jalur"><ArrowUp size={18} /></button>
          </div>
        </div>
        <div role="group" aria-label="Contoh kebutuhan" className="chips">
          {CHIPS.map((c) => {
            const on = result === c.key;
            return (
              <button type="button" key={c.key} className={`chip ${on ? 'is-on' : ''}`} aria-pressed={on}
                onClick={() => { stopTyping(); setQuery(c.label); setPick(c.key); setResult(c.key); }}>
                {c.label}
              </button>
            );
          })}
        </div>
        <div aria-live="polite" className="result-slot">
          {!result && (
            <div className="result result--idle">
              <b>Rekomendasi jalur muncul di sini.</b>
              <span>Arahkan kursor atau fokus ke peta di samping untuk melihat tiap jalur.</span>
            </div>
          )}
          {res && (
            <div className="result result--match" key={res.key}>
              <span className="result__top"><span className="eyebrow">Jalur yang relevan</span><code className="mono xs muted">{res.domain}</code></span>
              <span className="result__name">{res.name} <span>· {res.role}</span></span>
              <span className="small muted lh">{res.desc}</span>
              <div className="row-8">
                <DestLink k={res.key} className="btn btn--primary btn--sm">
                  {isPending(res.key) ? 'Lihat status' : res.cta}<ArrowRight size={16} />
                </DestLink>
                <button type="button" className="btn-text" onClick={() => { setResult(null); setPick(null); setQuery(''); qRef.current?.focus(); }}>Pilih ulang</button>
              </div>
            </div>
          )}
          {result === 'none' && (
            <div className="result result--none">
              <b>Kami belum bisa menebak jalurnya.</b>
              <span className="small muted lh">Pilih salah satu contoh di atas, atau ceritakan kebutuhan Anda lewat halaman Kontak — kami bantu arahkan.</span>
              <Link to="/contact" className="small strong">Ke halaman Kontak →</Link>
            </div>
          )}
        </div>
      </form>

      <div className="stage__map" ref={mapRef}>
        <div className="gridbg" aria-hidden="true" />
        <span className="mono-label stage__maplabel">PETA EKOSISTEM · ILUSTRASI KONSEPTUAL</span>
        <div className="map" role="img" aria-label="Diagram: VIBOXS di tengah, terhubung ke tiga jalur — Universe untuk terhubung, EDU untuk belajar, Services untuk membangun.">
          <svg viewBox="0 0 640 520" fill="none" className="map__svg">
            <g className="spin-slow"><circle cx="320" cy="260" r="250" stroke="rgba(246,247,255,.06)" /></g>
            <circle cx="320" cy="260" r="200" stroke="rgba(246,247,255,.12)" />
            <g className="spin"><circle cx="320" cy="260" r="200" stroke="rgba(246,247,255,.22)" strokeWidth="6" strokeDasharray="1 25.18" /></g>
            <g className="spin-rev"><circle cx="320" cy="260" r="110" stroke="rgba(246,247,255,.16)" strokeDasharray="2 6" /></g>
            {ORDER.map((k, i) => {
              const on = act === k, dim = !!act && !on;
              return (
                <path key={k} d={PATHS[k]} strokeLinecap="round"
                  stroke={on ? 'var(--v-accent)' : dim ? 'rgba(246,247,255,.14)' : 'rgba(246,247,255,.34)'}
                  strokeWidth={on ? 2 : 1.25}
                  style={{ strokeDasharray: 300, strokeDashoffset: drawn ? 0 : 300, transition: `stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1) ${i * 90}ms, stroke 160ms` }} />
              );
            })}
            {ORDER.map((k) => {
              const l = LABELS[k];
              return <text key={k} x={l.x} y={l.y} textAnchor={l.anchor} className="map__lbl" fill={act === k ? 'var(--v-text)' : 'var(--v-muted)'}>{l.t}</text>;
            })}
            {/* denyut yang terus mengalir dari pusat ke tiap jalur */}
            {drawn && !reducedMotion() && ORDER.map((k, i) => (
              <circle key={k + (act === k ? '-on' : '')} r={act === k ? 4.5 : 2.5} fill={act === k ? 'var(--v-accent)' : 'var(--v-accent-2)'} opacity={act && act !== k ? 0.25 : 0.9}>
                <animateMotion dur={act === k ? '1.2s' : '2.8s'} begin={`${i * 0.7}s`} repeatCount="indefinite" path={PATHS[k]} />
              </circle>
            ))}
          </svg>
          <div className="map__core">
            <span className="map__halo" aria-hidden="true" />
            <img src="/assets/viboxs-wordmark-white.png" alt="" height={13} />
            <span className="mono xxs muted">viboxs.com</span>
          </div>
          {ORDER.map((k, i) => {
            const d = DEST[k], on = act === k, dim = !!act && !on, pend = isPending(k);
            const Ico = destIcon[k];
            return (
              <button key={k} type="button" className={`node ${on ? 'is-on' : ''} ${pend ? 'is-pending' : ''}`}
                style={{ ...NODE_POS[k], opacity: !drawn ? 0 : dim ? 0.5 : 1, transitionDelay: drawn ? `${420 + i * 80}ms, 0ms, 0ms` : '0ms' }}
                onMouseEnter={() => setFocus(k)} onMouseLeave={() => setFocus(null)}
                onFocus={() => setFocus(k)} onBlur={() => setFocus(null)}
                onClick={() => { setPick(k); setResult(k); }}
                aria-label={`${d.name} — ${d.role}${pend ? ', sedang disiapkan' : ''}. Tampilkan rekomendasi.`}>
                <span className="node__ico"><Ico size={18} /></span>
                <span className="node__txt"><b>{d.name}</b><span>{pend ? 'Sedang disiapkan' : d.role}</span></span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
