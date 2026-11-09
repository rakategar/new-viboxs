import { useEffect, useRef, useState } from 'react';
import { reducedMotion } from '@viboxs/shared/motion';
import type { SvcKey } from '../lib/content';

/** Hook: berdetak hanya saat elemen terlihat (hemat CPU), mati di reduced motion. */
function useTick(ms: number, n: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    let t = 0;
    const io = new IntersectionObserver(([e]) => {
      window.clearInterval(t);
      if (e.isIntersecting) t = window.setInterval(() => setI((x) => (x + 1) % n), ms);
    });
    io.observe(el);
    return () => { io.disconnect(); window.clearInterval(t); };
  }, [ms, n]);
  return [ref, i] as const;
}

/* Websites — browser kecil dengan pemilih jadwal yang berganti */
function MockWeb() {
  const [ref, i] = useTick(1400, 3);
  return (
    <div ref={ref} className="mk mk--web">
      <div className="mk__chrome"><i /><i /><i /><span>contoh-bisnis.id/booking</span></div>
      <div className="mk__webbody">
        <div className="mk__side"><span /><span /><span /><span /><span /></div>
        <div className="stack-10">
          <span className="xs strong">Pilih jadwal</span>
          <div className="mk__slots">
            {['09.00', '10.30', '13.00'].map((s, k) => <span key={s} className={k === i ? 'is-on' : ''}>{s}</span>)}
          </div>
          <span className="mk__line w80" />
          <span className={`mk__cta ${i === 2 ? 'is-on' : ''}`}>Konfirmasi</span>
        </div>
      </div>
    </div>
  );
}

/* Automation — langkah workflow yang maju satu per satu */
function MockFlow() {
  const steps = ['Form brief masuk', 'Cek kelengkapan data', 'Catat ke CRM & tugaskan', 'Notifikasi ke tim penjualan'];
  const [ref, i] = useTick(1100, steps.length + 2);
  return (
    <div ref={ref} className="mk mk--flow">
      {steps.map((s, k) => {
        const st = k < i ? 'done' : k === i ? 'run' : 'wait';
        return (
          <div key={s} className={`mk__step is-${st}`}>
            <span className="mk__dot">{st === 'done' ? '✓' : st === 'run' ? '●' : '○'}</span>
            <span>{s}</span>
            <span className="mk__st">{st === 'done' ? 'Selesai' : st === 'run' ? 'Berjalan' : 'Menunggu'}</span>
          </div>
        );
      })}
    </div>
  );
}

/* Dashboard — bar dan kolom data contoh yang bergeser */
function MockDash() {
  const sets = [[38, 62, 48, 80, 56, 72, 90], [52, 44, 70, 58, 86, 64, 76], [30, 70, 56, 66, 50, 92, 68]];
  const [ref, i] = useTick(1800, sets.length);
  return (
    <div ref={ref} className="mk mk--dash">
      <div className="mk__kpis">
        {['Masuk', 'Diproses', 'Selesai'].map((k, n) => (
          <div key={k}><span className="xxs muted">{k}</span><span className="mk__kbar" style={{ width: `${[72, 48, 60][(n + i) % 3]}%` }} /></div>
        ))}
      </div>
      <div className="mk__bars">
        {sets[i].map((h, k) => <span key={k} style={{ height: `${h}%`, transitionDelay: `${k * 40}ms` }} />)}
      </div>
    </div>
  );
}

/* AI Integration — draf AI menunggu persetujuan manusia */
function MockAi() {
  const [ref, i] = useTick(1500, 4);
  return (
    <div ref={ref} className="mk mk--ai">
      <span className="mk__prompt">Ringkas keluhan pelanggan minggu ini</span>
      <div className="mk__draft">
        <span className="row-between xxs"><span className="strong">Draf ringkasan · 3 tema</span><span className={`mk__wait ${i === 3 ? 'is-ok' : ''}`}>{i === 3 ? '✓ Disetujui' : '◷ Menunggu persetujuan'}</span></span>
        <span className={`mk__line ${i >= 1 ? 'w90' : 'w0'}`} />
        <span className={`mk__line ${i >= 2 ? 'w70' : 'w0'}`} />
        <span className="mk__acts"><span className={i === 3 ? 'is-on' : ''}>Setujui</span><span>Revisi</span></span>
      </div>
    </div>
  );
}

/* Growth — konten → landing → form → follow-up, denyut mengalir */
function MockGrowth() {
  const [ref, i] = useTick(900, 4);
  return (
    <div ref={ref} className="mk mk--growth">
      {['Konten', 'Landing page', 'Form', 'Follow-up'].map((s, k) => (
        <span key={s} className={`mk__node ${k <= i ? 'is-on' : ''}`}>{s}</span>
      ))}
    </div>
  );
}

const MAP: Record<SvcKey, { label: string; C: () => JSX.Element }> = {
  websites: { label: 'CONTOH TAMPILAN', C: MockWeb },
  automation: { label: 'CONTOH ALUR · workflow/brief-masuk', C: MockFlow },
  dashboards: { label: 'CONTOH TAMPILAN · DATA CONTOH', C: MockDash },
  ai: { label: 'CONTOH TAMPILAN · HUMAN APPROVAL', C: MockAi },
  growth: { label: 'CONTOH ALUR · CONTENT-TO-LEAD', C: MockGrowth },
};

export default function Mockup({ k }: { k: SvcKey }) {
  const { label, C } = MAP[k];
  return (
    <div className="mk-wrap" aria-hidden="true">
      <span className="mono-label">{label}</span>
      <C />
    </div>
  );
}
