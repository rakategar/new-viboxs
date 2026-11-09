import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { reducedMotion } from '@viboxs/shared/motion';

/**
 * Kawanan agen yang "membangun" halaman ini saat di-scroll.
 *
 * Setiap elemen bertanda [data-build="Label"] mulai tersembunyi (clip-path). Saat masuk viewport,
 * agen bebas terbang ke sudut kirinya, menggambar kotak seleksi sambil elemen ter-reveal mengikuti
 * cursor, menempelkan label, lalu pindah ke elemen berikutnya. Tiga agen bekerja paralel.
 *
 * Pengaman: elemen yang menunggu > FALLBACK_MS langsung tampil (konten tak pernah tertahan);
 * reduced motion / dimatikan pengguna → tidak ada yang disembunyikan (lihat main.tsx).
 */

export const AGENTS_KEY = 'vbx-agents';
const FALLBACK_MS = 3200;

const AGENTS = [
  { name: 'Layout', color: '#FF4A26' },
  { name: 'Copy', color: '#8FA6FF' },
  { name: 'Data', color: '#F2C679' },
];

type Task = { el: HTMLElement; label: string; seen: number; visible: boolean; taken: boolean; done: boolean };
type Phase = 'idle' | 'fly' | 'draw' | 'hold';
type Agent = {
  x: number; y: number; phase: Phase; t0: number; dur: number; fx: number; fy: number;
  task: Task | null; idleSince: number;
  cur: HTMLDivElement; box: HTMLDivElement; tag: HTMLSpanElement;
};

const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function agentsEnabled() {
  return document.documentElement.classList.contains('agents-on');
}

export default function AgentSwarm() {
  const { pathname } = useLocation();
  const curRefs = useRef<(HTMLDivElement | null)[]>([]);
  const boxRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tagRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [on, setOn] = useState(() => typeof document !== 'undefined' && agentsEnabled());
  const [stat, setStat] = useState({ built: 0, total: 0, busy: 0 });

  useEffect(() => {
    if (!on || reducedMotion()) return;
    const vw = () => window.innerWidth, vh = () => window.innerHeight;
    const agents: Agent[] = AGENTS.map((_, i) => ({
      x: vw() + 60, y: vh() * (0.3 + i * 0.18), phase: 'idle', t0: 0, dur: 0, fx: 0, fy: 0,
      task: null, idleSince: performance.now() - 5000,
      cur: curRefs.current[i]!, box: boxRefs.current[i]!, tag: tagRefs.current[i]!,
    }));
    let tasks: Task[] = [];
    let raf = 0;
    let built = 0;

    const report = () => setStat({ built, total: tasks.length, busy: agents.filter((a) => a.phase !== 'idle').length });

    const finish = (t: Task, fast: boolean) => {
      if (t.done) return;
      t.done = true;
      t.el.style.clipPath = '';
      t.el.classList.add('is-built');
      if (fast) t.el.classList.add('is-fast');
      built++;
      report();
    };

    const scan = () => {
      tasks = [...document.querySelectorAll<HTMLElement>('[data-build]')]
        .filter((el) => !el.classList.contains('is-built'))
        .map((el) => ({ el, label: el.dataset.build || 'Elemen', seen: 0, visible: false, taken: false, done: false }));
      built = 0;
      report();
    };

    const startFly = (a: Agent, t: Task, now: number) => {
      t.taken = true;
      a.task = t;
      a.phase = 'fly';
      a.fx = a.x; a.fy = a.y; a.t0 = now;
      const r = t.el.getBoundingClientRect();
      const d = Math.hypot(r.left - a.x, Math.max(8, r.top) - a.y);
      a.dur = Math.min(620, Math.max(260, d / 2));
      a.tag.textContent = t.label;
      a.box.className = 'swarm__box';
      report();
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const H = vh();

      // visibilitas dihitung langsung (IntersectionObserver menganggap elemen ber-clip-path penuh tak terlihat)
      for (const t of tasks) {
        if (t.done) continue;
        const r = t.el.getBoundingClientRect();
        t.visible = r.bottom > 60 && r.top < H - 60 && r.width > 0;
        if (t.visible && !t.seen) t.seen = now;
        // pengaman: yang terlalu lama menunggu langsung tampil
        if (!t.taken && t.visible && now - t.seen > FALLBACK_MS) finish(t, true);
      }

      for (let i = 0; i < agents.length; i++) {
        const a = agents[i];
        if (a.phase === 'idle') {
          // prioritaskan elemen yang paling "di depan mata": bagian atasnya sudah masuk, belum lewat ke atas
          const score = (t: Task) => { const r = t.el.getBoundingClientRect(); return Math.abs(Math.max(r.top, 0) - H * 0.25) + (r.bottom < H * 0.2 ? 5000 : 0); };
          const next = tasks
            .filter((t) => t.visible && !t.taken && !t.done)
            .sort((p, q) => score(p) - score(q))[0];
          if (next) startFly(a, next, now);
        }
        const t = a.task;
        if (a.phase === 'fly' && t) {
          const r = t.el.getBoundingClientRect();
          const tx = r.left + 6, ty = Math.min(Math.max(r.top + 6, 12), H - 60);
          const p = Math.min(1, (now - a.t0) / a.dur), e = easeIO(p);
          a.x = a.fx + (tx - a.fx) * e;
          a.y = a.fy + (ty - a.fy) * e;
          if (r.bottom < -200 || r.top > H + 200) { finish(t, true); a.phase = 'idle'; a.task = null; a.idleSince = now; }
          else if (p >= 1) { a.phase = 'draw'; a.t0 = now; a.dur = Math.min(950, 520 + (r.width + r.height) / 6); a.box.classList.add('is-on'); }
        } else if (a.phase === 'draw' && t) {
          const r = t.el.getBoundingClientRect();
          const p = Math.min(1, (now - a.t0) / a.dur), e = easeOut(p);
          const w = r.width * e, h = r.height * e;
          t.el.style.clipPath = `inset(0 ${(100 - e * 100).toFixed(2)}% ${(100 - e * 100).toFixed(2)}% 0 round 4px)`;
          a.x = r.left + w;
          a.y = Math.min(Math.max(r.top + h, 12), H - 60);
          a.box.style.transform = `translate3d(${r.left}px, ${r.top}px, 0)`;
          a.box.style.width = `${w}px`;
          a.box.style.height = `${h}px`;
          if (p >= 1) {
            finish(t, false);
            a.phase = 'hold'; a.t0 = now;
            a.box.classList.add('is-done');
            a.cur.classList.remove('is-click'); void a.cur.offsetWidth; a.cur.classList.add('is-click');
          }
        } else if (a.phase === 'hold' && t) {
          const r = t.el.getBoundingClientRect();
          a.box.style.transform = `translate3d(${r.left}px, ${r.top}px, 0)`;
          a.box.style.width = `${r.width}px`;
          a.box.style.height = `${r.height}px`;
          if (now - a.t0 > 300) {
            a.box.classList.add('is-fade');
            a.phase = 'idle'; a.task = null; a.idleSince = now;
            report();
          }
        } else if (a.phase === 'idle') {
          // melayang pelan di tempat; setelah lama menganggur, menepi ke kanan layar
          const long = now - a.idleSince > 2600;
          const dockX = vw() - 90 - i * 26, dockY = H * (0.34 + i * 0.16);
          if (long) { a.x += (dockX - a.x) * 0.03; a.y += (dockY - a.y) * 0.03; }
        }
        const bob = a.phase === 'idle' ? Math.sin(now / 520 + i * 2) * 4 : 0;
        a.cur.style.transform = `translate3d(${a.x.toFixed(1)}px, ${(a.y + bob).toFixed(1)}px, 0)`;
        a.cur.classList.toggle('is-idle', a.phase === 'idle');
      }
    };

    const t0 = window.setTimeout(() => { scan(); raf = requestAnimationFrame(loop); }, 80);
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(loop);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearTimeout(t0);
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      // jangan tinggalkan elemen setengah terbangun
      tasks.forEach((t) => { if (!t.done) { t.el.style.clipPath = ''; t.el.classList.add('is-built', 'is-fast'); } });
      agents.forEach((a) => { a.box.className = 'swarm__box'; });
    };
  }, [on, pathname]);

  const turnOff = () => {
    try { localStorage.setItem(AGENTS_KEY, 'off'); } catch { /* storage diblokir */ }
    document.querySelectorAll('[data-build]').forEach((el) => { (el as HTMLElement).style.clipPath = ''; el.classList.add('is-built'); });
    document.documentElement.classList.remove('agents-on');
    setOn(false);
  };
  const turnOn = () => {
    try { localStorage.removeItem(AGENTS_KEY); } catch { /* storage diblokir */ }
    document.documentElement.classList.add('agents-on');
    document.querySelectorAll('[data-build]').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top > window.innerHeight) el.classList.remove('is-built', 'is-fast');
    });
    setOn(true);
  };

  if (typeof window !== 'undefined' && reducedMotion()) return null;

  return (
    <>
      <div className="swarm" aria-hidden="true">
        {AGENTS.map((a, i) => (
          <div key={a.name} style={{ ['--ac' as string]: a.color }}>
            <div ref={(el) => { boxRefs.current[i] = el; }} className="swarm__box"><span ref={(el) => { tagRefs.current[i] = el; }} className="swarm__tag" /></div>
            <div ref={(el) => { curRefs.current[i] = el; }} className={`swarm__cur ${on ? '' : 'is-off'}`}>
              <span className="swarm__ring" />
              <svg width="20" height="20" viewBox="0 0 24 24"><path d="M4 3l7.5 18 2.4-7.6L21.5 11z" fill="var(--ac)" stroke="#090B14" strokeWidth="1.5" strokeLinejoin="round" /></svg>
              <span className="swarm__name">Agent · {a.name}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="swarm-hud" role="status">
        {on ? (
          <>
            <span className="swarm-hud__dots" aria-hidden="true">{AGENTS.map((a) => <i key={a.name} style={{ background: a.color }} />)}</span>
            <span className="swarm-hud__txt">
              <b>{stat.busy > 0 ? `${stat.busy} agen membangun halaman ini` : 'Agen siaga'}</b>
              <span>{stat.built}/{stat.total} elemen · ilustrasi</span>
            </span>
            <button type="button" onClick={turnOff} aria-label="Matikan animasi agen">Matikan</button>
          </>
        ) : (
          <button type="button" className="swarm-hud__on" onClick={turnOn}>Nyalakan animasi agen</button>
        )}
      </div>
    </>
  );
}
