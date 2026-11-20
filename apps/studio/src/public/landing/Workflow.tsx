import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { I } from '../../ui/kit';
import { reduced, useInView } from './motion';

/**
 * Kanvas alur bergaya node-graph (SVG murni, ikut skala viewBox).
 * Ilustrasi alur kerja Studio — bukan data nyata. Node bisa digeser; tombol + menambah langkah berikutnya.
 */
export type Node = { id: string; kind: 'box' | 'agent' | 'sub'; x: number; y: number; icon: keyof typeof I; t: string; s?: string };
export type Flow = { w: number; h: number; nodes: Node[]; edges: [string, string, 'sub'?][]; queue?: Node[] };

const SIZE = { box: [64, 64], agent: [250, 64], sub: [52, 52] } as const;
const geo = (n: Node, p: { x: number; y: number }) => {
  const [w, h] = SIZE[n.kind];
  return { x: p.x, y: p.y, w, h, cx: p.x + w / 2, cy: p.y + h / 2 };
};

export default function Workflow({ flow, theme = 'light', focus, minW = 720, label }: { flow: Flow; theme?: 'light' | 'dark'; focus?: string[]; minW?: number; label: string }) {
  const [wrap, seen] = useInView<HTMLDivElement>(0.25);
  return (
    <div ref={wrap} className={`wf-wrap wf-wrap--${theme}`} role="img" aria-label={label}>
      {seen ? <Canvas flow={flow} theme={theme} focus={focus} minW={minW} /> : <div style={{ aspectRatio: `${flow.w} / ${flow.h}`, minWidth: minW }} />}
    </div>
  );
}

function Canvas({ flow, theme, focus, minW }: { flow: Flow; theme: 'light' | 'dark'; focus?: string[]; minW: number }) {
  const uid = useId().replace(/:/g, '');
  const svg = useRef<SVGSVGElement>(null);
  const [added, setAdded] = useState(0);
  const [round, setRound] = useState(0);
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({});
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  const still = reduced();

  const queue = flow.queue ?? [];
  const nodes = useMemo(() => [...flow.nodes, ...queue.slice(0, added)], [flow, added, queue]);
  const edges = useMemo(() => {
    const e = [...flow.edges];
    const main = flow.edges.filter((x) => !x[2]);
    let tail = main[main.length - 1]?.[1];
    queue.slice(0, added).forEach((n) => { if (tail) e.push([tail, n.id]); tail = n.id; });
    return e;
  }, [flow, added, queue]);
  const at = (n: Node) => pos[n.id] ?? { x: n.x, y: n.y };
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const order = Object.fromEntries(nodes.map((n, i) => [n.id, i < flow.nodes.length ? i : 0]));
  const dim = (id: string) => (focus ? !focus.includes(id) : false);

  // posisi tombol + : kanan dari ekor rantai utama
  const mainEdges = edges.filter((x) => !x[2]);
  const tailId = mainEdges[mainEdges.length - 1]?.[1];
  const tail = tailId ? geo(byId[tailId], at(byId[tailId])) : null;
  const done = added >= queue.length;

  function toLocal(e: PointerEvent) {
    const m = svg.current!.getScreenCTM()!.inverse();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return { x: p.x, y: p.y };
  }
  const down = (n: Node) => (e: PointerEvent<SVGGElement>) => {
    const p = toLocal(e); const g = at(n);
    drag.current = { id: n.id, dx: p.x - g.x, dy: p.y - g.y, moved: false };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent<SVGGElement>) => {
    const d = drag.current; if (!d) return;
    const p = toLocal(e); const [w, h] = SIZE[byId[d.id].kind];
    d.moved = true;
    setPos((s) => ({ ...s, [d.id]: { x: Math.max(0, Math.min(flow.w - w, p.x - d.dx)), y: Math.max(0, Math.min(flow.h - h - 40, p.y - d.dy)) } }));
  };
  const up = () => { drag.current = null; };
  const add = () => { if (done) { setAdded(0); setPos({}); setRound((r) => r + 1); } else setAdded((a) => a + 1); };
  const key = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); add(); } };

  useEffect(() => { setAdded(0); setPos({}); }, [flow]);

  return (
    <svg ref={svg} key={round} className={`wf wf--${theme}`} viewBox={`0 0 ${flow.w} ${flow.h}`} style={{ minWidth: minW }} aria-hidden="true">
      <g className="wf-edges">
        {edges.map(([a, b, kind], i) => {
          const A = byId[a]; const B = byId[b]; if (!A || !B) return null;
          const ga = geo(A, at(A)); const gb = geo(B, at(B));
          let d: string; let p1: [number, number]; let p2: [number, number];
          if (kind === 'sub') {
            const sx = Math.max(ga.x + 34, Math.min(ga.x + ga.w - 34, gb.cx));
            p1 = [sx, ga.y + ga.h]; p2 = [gb.cx, gb.y];
            d = `M${p1[0]} ${p1[1]} C${p1[0]} ${p1[1] + 70}, ${p2[0]} ${p2[1] - 70}, ${p2[0]} ${p2[1]}`;
          } else {
            p1 = [ga.x + ga.w, ga.cy]; p2 = [gb.x, gb.cy];
            const dx = Math.max(36, (p2[0] - p1[0]) / 2);
            d = `M${p1[0]} ${p1[1]} C${p1[0] + dx} ${p1[1]}, ${p2[0] - dx} ${p2[1]}, ${p2[0]} ${p2[1]}`;
          }
          const delay = Math.max(order[a], order[b]) * 0.14 + 0.1;
          const off = dim(a) && dim(b);
          return (
            <g key={a + b} className={`wf-e ${kind === 'sub' ? 'is-sub' : ''} ${off ? 'is-dim' : ''}`} style={{ ['--d' as string]: `${delay}s` }}>
              <path id={`${uid}-${i}`} d={d} pathLength={1} className="wf-e__line" />
              <circle cx={p1[0]} cy={p1[1]} r={3.5} className="wf-e__port" />
              <circle cx={p2[0]} cy={p2[1]} r={3.5} className="wf-e__port" />
              {!kind && !still && !off && (
                <circle r={4.5} className="wf-e__pulse" visibility="hidden">
                  <set attributeName="visibility" to="visible" begin={`${delay + 0.7}s`} />
                  <animateMotion dur={`${1.9 + (i % 3) * 0.35}s`} begin={`${delay + 0.7}s`} repeatCount="indefinite"><mpath href={`#${uid}-${i}`} /></animateMotion>
                </circle>
              )}
            </g>
          );
        })}
      </g>
      {nodes.map((n, i) => {
        const g = geo(n, at(n)); const Ico = I[n.icon];
        return (
          <g key={n.id} className={`wf-n wf-n--${n.kind} ${dim(n.id) ? 'is-dim' : ''}`} style={{ ['--d' as string]: `${(i < flow.nodes.length ? i : 0) * 0.14}s` }}
            onPointerDown={down(n)} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            <g className="wf-n__in" style={{ transformOrigin: `${g.cx}px ${g.cy}px` }}>
              {n.kind === 'agent' ? (
                <>
                  <rect x={g.x} y={g.y} width={g.w} height={g.h} rx={18} className="wf-n__box" />
                  <rect x={g.x + 10} y={g.y + 10} width={44} height={44} rx={12} className="wf-n__chip" />
                  <g transform={`translate(${g.x + 20} ${g.y + 20})`} className="wf-n__ico"><Ico size={24} /></g>
                  <text x={g.x + 68} y={g.y + 29} className="wf-n__t">{n.t}</text>
                  <text x={g.x + 68} y={g.y + 47} className="wf-n__s">{n.s}</text>
                </>
              ) : (
                <>
                  {n.kind === 'sub'
                    ? <circle cx={g.cx} cy={g.cy} r={g.w / 2} className="wf-n__box" />
                    : <rect x={g.x} y={g.y} width={g.w} height={g.h} rx={14} className="wf-n__box" />}
                  <g transform={`translate(${g.cx - 12} ${g.cy - 12})`} className="wf-n__ico"><Ico size={24} /></g>
                  <text x={g.cx} y={g.y + g.h + 22} textAnchor="middle" className="wf-n__t">{n.t}</text>
                  {n.s && <text x={g.cx} y={g.y + g.h + 39} textAnchor="middle" className="wf-n__s">{n.s}</text>}
                </>
              )}
            </g>
          </g>
        );
      })}
      {queue.length > 0 && tail && (
        <g className="wf-plus" role="button" tabIndex={0} aria-label={done ? 'Ulangi alur' : 'Tambah langkah berikutnya'} onClick={add} onKeyDown={key}
          transform={`translate(${Math.min(flow.w - 30, tail.x + tail.w + 46)} ${tail.cy})`}>
          <line x1={-46 + 4} y1={0} x2={-18} y2={0} className="wf-plus__stub" />
          <rect x={-16} y={-16} width={32} height={32} rx={9} className="wf-plus__btn" />
          <path d={done ? 'M5 -1a6 6 0 1 1-2-5M5-7v4h-4' : 'M0 -7v14M-7 0h14'} className="wf-plus__ico" />
          {!done && (
            <g className="wf-plus__tip">
              <rect x={-52} y={-56} width={104} height={26} rx={13} />
              <text x={0} y={-39} textAnchor="middle">KLIK DI SINI</text>
            </g>
          )}
        </g>
      )}
    </svg>
  );
}
