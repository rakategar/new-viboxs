import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { finePointer, reducedMotion } from './motion';

/**
 * Kawanan agen yang "membangun" halaman ini saat di-scroll.
 *
 * - Blok [data-build="Label"]: agen menggambar kotak seleksi, elemen ter-reveal mengikuti cursor.
 * - Teks (h1, h2, .eyebrow, .lead, .body-17 di <main>, di luar blok): agen MENGETIK huruf demi huruf,
 *   cursor menempel di huruf yang sedang muncul.
 * - Saat siaga, agen mengorbit pelan di sekeliling cursor pengguna.
 *
 * Pengaman: target yang menunggu > FALLBACK_MS tampil sendiri; reduced motion → tidak ada yang
 * disembunyikan (kelas `agents-on` tidak dipasang, lihat main.tsx).
 */

const FALLBACK_MS = 3200;
const TEXT_SEL = 'h1, h2, .eyebrow, .lead, .body-17';

const AGENTS = [
  { name: 'Layout', color: '#FF4A26' },
  { name: 'Copy', color: '#8FA6FF' },
  { name: 'Data', color: '#F2C679' },
];

type Task = {
  el: HTMLElement; kind: 'box' | 'type'; label: string;
  seen: number; visible: boolean; taken: boolean; done: boolean;
  chars?: HTMLSpanElement[];
};
type Phase = 'idle' | 'fly' | 'draw' | 'type' | 'hold';
type Agent = {
  x: number; y: number; phase: Phase; t0: number; dur: number; fx: number; fy: number; typed: number;
  task: Task | null;
  cur: HTMLDivElement; box: HTMLDivElement; tag: HTMLSpanElement;
};

const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function textLabel(el: HTMLElement) {
  if (el.tagName === 'H1') return 'Teks · H1';
  if (el.tagName === 'H2') return 'Teks · H2';
  if (el.classList.contains('eyebrow')) return 'Teks · label';
  return 'Teks · paragraf';
}

/** Bungkus tiap karakter teks dalam <span class="tch"> (struktur kata dari <Split> tetap utuh). */
function wrapChars(el: HTMLElement) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  const spans: HTMLSpanElement[] = [];
  for (const n of nodes) {
    const v = n.nodeValue || '';
    if (!v) continue;
    const frag = document.createDocumentFragment();
    for (const ch of v) {
      const s = document.createElement('span');
      s.className = 'tch';
      s.textContent = ch;
      frag.appendChild(s);
      if (ch.trim()) spans.push(s);
    }
    n.parentNode?.replaceChild(frag, n);
  }
  return spans;
}
function unwrapChars(el: HTMLElement) {
  el.querySelectorAll('.tch').forEach((s) => s.replaceWith(document.createTextNode(s.textContent || '')));
  el.normalize();
}

export default function AgentSwarm() {
  const { pathname } = useLocation();
  const curRefs = useRef<(HTMLDivElement | null)[]>([]);
  const boxRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tagRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const mouse = useRef({ x: -1, y: -1 });

  // posisi cursor pengguna (untuk orbit siaga)
  useEffect(() => {
    if (!finePointer()) return;
    const mv = (e: PointerEvent) => { mouse.current.x = e.clientX; mouse.current.y = e.clientY; };
    window.addEventListener('pointermove', mv, { passive: true });
    return () => window.removeEventListener('pointermove', mv);
  }, []);

  useEffect(() => {
    if (reducedMotion() || !document.documentElement.classList.contains('agents-on')) return;
    const vw = () => window.innerWidth, vh = () => window.innerHeight;
    const agents: Agent[] = AGENTS.map((_, i) => ({
      x: vw() + 60, y: vh() * (0.3 + i * 0.18), phase: 'idle', t0: 0, dur: 0, fx: 0, fy: 0, typed: 0,
      task: null, cur: curRefs.current[i]!, box: boxRefs.current[i]!, tag: tagRefs.current[i]!,
    }));
    let tasks: Task[] = [];
    let raf = 0;

    const finish = (t: Task, fast: boolean) => {
      if (t.done) return;
      t.done = true;
      if (t.chars) { unwrapChars(t.el); t.chars = undefined; }
      t.el.style.clipPath = '';
      t.el.classList.add('is-built');
      if (fast) t.el.classList.add('is-fast');
    };

    const scan = () => {
      const main = document.getElementById('main');
      const boxes = [...document.querySelectorAll<HTMLElement>('[data-build]')]
        .filter((el) => !el.classList.contains('is-built'))
        .map<Task>((el) => ({ el, kind: 'box', label: el.dataset.build || 'Elemen', seen: 0, visible: false, taken: false, done: false }));
      const texts = main ? [...main.querySelectorAll<HTMLElement>(TEXT_SEL)]
        .filter((el) => !el.closest('[data-build]') && !el.classList.contains('is-built'))
        .map<Task>((el) => ({ el, kind: 'type', label: textLabel(el), seen: 0, visible: false, taken: false, done: false })) : [];
      tasks = [...boxes, ...texts];
    };

    const startFly = (a: Agent, t: Task, now: number) => {
      t.taken = true;
      a.task = t;
      a.phase = 'fly';
      a.fx = a.x; a.fy = a.y; a.t0 = now;
      const r = t.el.getBoundingClientRect();
      const d = Math.hypot(r.left - a.x, Math.max(8, r.top) - a.y);
      a.dur = Math.min(600, Math.max(240, d / 2));
      a.tag.textContent = t.label;
      a.box.className = `swarm__box ${t.kind === 'type' ? 'is-text' : ''}`;
    };

    const placeBox = (a: Agent, r: DOMRect, w = r.width, h = r.height) => {
      const pad = a.task?.kind === 'type' ? 6 : 0;
      a.box.style.transform = `translate3d(${r.left - pad}px, ${r.top - pad * 0.6}px, 0)`;
      a.box.style.width = `${w + pad * 2}px`;
      a.box.style.height = `${h + pad * 1.2}px`;
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const H = vh(), W = vw();

      for (const t of tasks) {
        if (t.done) continue;
        const r = t.el.getBoundingClientRect();
        t.visible = r.bottom > 40 && r.top < H - 40 && r.width > 0;
        if (t.visible && !t.seen) t.seen = now;
        if (!t.taken && t.visible && now - t.seen > FALLBACK_MS) finish(t, true);
      }

      const score = (t: Task) => { const r = t.el.getBoundingClientRect(); return Math.abs(Math.max(r.top, 0) - H * 0.25) + (r.bottom < H * 0.2 ? 5000 : 0); };

      for (let i = 0; i < agents.length; i++) {
        const a = agents[i];
        if (a.phase === 'idle') {
          const next = tasks.filter((t) => t.visible && !t.taken && !t.done).sort((p, q) => score(p) - score(q))[0];
          if (next) startFly(a, next, now);
        }
        const t = a.task;

        if (a.phase === 'fly' && t) {
          const r = t.el.getBoundingClientRect();
          const tx = r.left + 4, ty = Math.min(Math.max(r.top + 6, 12), H - 60);
          const p = Math.min(1, (now - a.t0) / a.dur), e = easeIO(p);
          a.x = a.fx + (tx - a.fx) * e;
          a.y = a.fy + (ty - a.fy) * e;
          if (r.bottom < -200 || r.top > H + 200) { finish(t, true); a.phase = 'idle'; a.task = null; }
          else if (p >= 1) {
            a.t0 = now;
            a.box.classList.add('is-on');
            if (t.kind === 'type') {
              t.chars = wrapChars(t.el);
              t.el.classList.add('is-typing');
              a.typed = 0;
              a.phase = 'type';
              a.dur = Math.min(1400, Math.max(380, t.chars.length * 16));
            } else {
              a.phase = 'draw';
              a.dur = Math.min(900, 500 + (r.width + r.height) / 6);
            }
          }
        } else if (a.phase === 'type' && t && t.chars) {
          placeBox(a, t.el.getBoundingClientRect());
          const n = t.chars.length;
          const upto = Math.min(n, Math.floor(((now - a.t0) / a.dur) * n) + 1);
          for (let k = a.typed; k < upto; k++) t.chars[k].classList.add('on');
          a.typed = upto;
          const c = t.chars[Math.max(0, upto - 1)];
          if (c) {
            const cr = c.getBoundingClientRect();
            a.x += (cr.right + 2 - a.x) * 0.55;
            a.y += (Math.min(Math.max(cr.top + cr.height * 0.6, 12), H - 60) - a.y) * 0.55;
          }
          if (upto >= n) {
            finish(t, false);
            t.el.classList.remove('is-typing');
            a.phase = 'hold'; a.t0 = now;
            a.box.classList.add('is-done');
          }
        } else if (a.phase === 'draw' && t) {
          const r = t.el.getBoundingClientRect();
          const p = Math.min(1, (now - a.t0) / a.dur), e = easeOut(p);
          const w = r.width * e, h = r.height * e;
          t.el.style.clipPath = `inset(0 ${(100 - e * 100).toFixed(2)}% ${(100 - e * 100).toFixed(2)}% 0 round 4px)`;
          a.x = r.left + w;
          a.y = Math.min(Math.max(r.top + h, 12), H - 60);
          placeBox(a, r, w, h);
          if (p >= 1) {
            finish(t, false);
            a.phase = 'hold'; a.t0 = now;
            a.box.classList.add('is-done');
            a.cur.classList.remove('is-click'); void a.cur.offsetWidth; a.cur.classList.add('is-click');
          }
        } else if (a.phase === 'hold' && t) {
          placeBox(a, t.el.getBoundingClientRect());
          if (now - a.t0 > 260) { a.box.classList.add('is-fade'); a.phase = 'idle'; a.task = null; }
        }

        if (a.phase === 'idle') {
          // siaga: mengorbit pelan di sekeliling cursor pengguna (atau titik tenang bila tanpa mouse)
          const m = mouse.current;
          const cx = m.x >= 0 ? m.x : W * 0.82, cy = m.x >= 0 ? m.y : H * 0.5;
          const ang = now / 2600 + (i * Math.PI * 2) / AGENTS.length;
          const rad = 58 + Math.sin(now / 900 + i) * 8;
          a.x += (cx + Math.cos(ang) * rad - a.x) * 0.07;
          a.y += (cy + Math.sin(ang) * rad * 0.82 - a.y) * 0.07;
        }
        a.cur.style.transform = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`;
        a.cur.classList.toggle('is-idle', a.phase === 'idle');
      }
    };

    const t0 = window.setTimeout(() => { scan(); raf = requestAnimationFrame(loop); }, 80);
    const onVis = () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(loop); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearTimeout(t0);
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      // jangan tinggalkan elemen setengah terbangun
      tasks.forEach((t) => { if (!t.done) finish(t, true); t.el.classList.remove('is-typing'); });
      agents.forEach((a) => { a.box.className = 'swarm__box'; });
    };
  }, [pathname]);

  if (typeof window !== 'undefined' && reducedMotion()) return null;

  return (
    <div className="swarm" aria-hidden="true">
      {AGENTS.map((a, i) => (
        <div key={a.name} style={{ ['--ac' as string]: a.color }}>
          <div ref={(el) => { boxRefs.current[i] = el; }} className="swarm__box"><span ref={(el) => { tagRefs.current[i] = el; }} className="swarm__tag" /></div>
          <div ref={(el) => { curRefs.current[i] = el; }} className="swarm__cur">
            <span className="swarm__ring" />
            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M4 3l7.5 18 2.4-7.6L21.5 11z" fill="var(--ac)" stroke="#090B14" strokeWidth="1.5" strokeLinejoin="round" /></svg>
            <span className="swarm__name">Agent · {a.name}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
