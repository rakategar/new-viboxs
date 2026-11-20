import { useEffect, useRef, useState } from 'react';
import { reducedMotion } from '@viboxs/shared/motion';

/**
 * Peta ekosistem hidup: empat situs publik mengalirkan "paket" ke inti Studio.
 * Ilustrasi alur kerja (berlabel), BUKAN data atau jumlah nyata.
 */
const NODES = [
  { k: 'corp', name: 'viboxs.com', role: 'Aplikasi Ranger', x: 80, y: 92, color: 'var(--v-accent-2)' },
  { k: 'svc', name: 'Services', role: 'Lead klien', x: 440, y: 92, color: 'var(--v-accent)' },
  { k: 'edu', name: 'EDU', role: 'Program & Learner', x: 80, y: 388, color: 'var(--v-gold)' },
  { k: 'uni', name: 'Universe', role: 'Listing OPC', x: 440, y: 388, color: '#6EE7B7', pending: true },
] as const;
const C = { x: 260, y: 240 };
const path = (n: (typeof NODES)[number]) => {
  const mx = (n.x + C.x) / 2, my = (n.y + C.y) / 2;
  const bend = n.x < C.x ? -40 : 40;
  return `M${n.x},${n.y} Q${mx + bend * (n.y < C.y ? 1 : -1)},${my} ${C.x},${C.y}`;
};

const EVENTS = [
  ['svc', 'services.lead.imported', 'Lead masuk inbox Commander'],
  ['corp', 'application.submitted', 'Aplikasi Ranger menunggu review'],
  ['edu', 'edu.program.submitted', 'Draft webinar diajukan kontributor'],
  ['svc', 'mission.offered', 'Misi ditawarkan ke Ranger terpilih'],
  ['edu', 'learner.assessment.completed', 'Learner menyelesaikan asesmen'],
  ['uni', 'showcase.product.queued', 'Produk OPC antre · konektor belum aktif'],
  ['svc', 'deliverable.submitted', 'Deliverable v2 masuk review'],
  ['edu', 'edu.program.published_ack', 'EDU menayangkan program'],
] as const;

export default function EcoOrbit() {
  const [motion, setMotion] = useState(false);
  const [log, setLog] = useState<number[]>([0, 1, 2]);
  const [pulse, setPulse] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion()) return;
    setMotion(true);
    let vis = true, i = 3;
    const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; });
    if (box.current) io.observe(box.current);
    const t = window.setInterval(() => {
      if (!vis || document.hidden) return;
      const n = i++ % EVENTS.length;
      setLog((l) => [n, ...l].slice(0, 3));
      setPulse(EVENTS[n][0]);
      window.setTimeout(() => setPulse(null), 900);
    }, 2400);
    return () => { window.clearInterval(t); io.disconnect(); };
  }, []);

  return (
    <div className="eo" ref={box}>
      <svg viewBox="0 0 520 480" className="eo__svg" role="img" aria-label="Diagram: viboxs.com, Services, EDU, dan Universe terhubung ke inti VIBOXS Studio">
        <defs>
          <radialGradient id="eo-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--v-accent)" stopOpacity=".55" />
            <stop offset="60%" stopColor="var(--v-accent)" stopOpacity=".08" />
            <stop offset="100%" stopColor="var(--v-accent)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className="eo__rings" aria-hidden="true">
          <circle cx={C.x} cy={C.y} r="150" />
          <circle cx={C.x} cy={C.y} r="205" className="eo__ring--dash" />
          <circle cx={C.x} cy={C.y} r="96" className="eo__ring--dash eo__ring--rev" />
        </g>
        {NODES.map((n) => (
          <g key={n.k} className={`eo__link ${pulse === n.k ? 'is-pulse' : ''}`} style={{ ['--c' as string]: n.color }}>
            <path id={`eo-p-${n.k}`} d={path(n)} />
            <path d={path(n)} className="eo__flow" />
            {motion && [0, 1].map((j) => (
              <circle key={j} r={j ? 2.5 : 4} className="eo__pkt">
                <animateMotion dur={`${3.2 + j * 1.1 + (n.k === 'uni' ? 2 : 0)}s`} begin={`${j * 1.4 + NODES.indexOf(n) * 0.5}s`} repeatCount="indefinite" rotate="auto">
                  <mpath href={`#eo-p-${n.k}`} />
                </animateMotion>
              </circle>
            ))}
          </g>
        ))}
        <circle cx={C.x} cy={C.y} r="90" fill="url(#eo-core)" className="eo__glow" />
        <g className="eo__core">
          <circle cx={C.x} cy={C.y} r="52" />
          <text x={C.x} y={C.y - 4} textAnchor="middle" className="eo__core-t">STUDIO</text>
          <text x={C.x} y={C.y + 14} textAnchor="middle" className="eo__core-s">backstage</text>
        </g>
        {NODES.map((n) => (
          <g key={n.k} className={`eo__node ${pulse === n.k ? 'is-pulse' : ''} ${'pending' in n ? 'is-pending' : ''}`} transform={`translate(${n.x},${n.y})`} style={{ ['--c' as string]: n.color }}>
            <circle r="30" className="eo__halo" />
            <circle r="7" className="eo__dot" />
            <text y={-40} textAnchor="middle" className="eo__name">{n.name}</text>
            <text y={48} textAnchor="middle" className="eo__role">{'pending' in n ? 'Sedang disiapkan' : n.role}</text>
          </g>
        ))}
      </svg>
      <div className="eo__log" aria-live="off">
        <span className="eo__log-h"><i aria-hidden="true" />Contoh event · ilustrasi alur, bukan data nyata</span>
        <ul>
          {log.map((n, i) => (
            <li key={`${n}-${i}-${log[0]}`} className={i === 0 ? 'is-new' : ''}>
              <code>{EVENTS[n][1]}</code><span>{EVENTS[n][2]}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
