import { useEffect, useRef, useState } from 'react';
import { reducedMotion } from '../lib/motion';

/**
 * Hero visual: dua tangan (AI ↔ manusia) tersusun dari partikel.
 * - Intro: partikel memancar dari titik sentuh lalu menyusun bentuk tangan (≈1.6s, non-blocking)
 * - Kursor: partikel menyingkir di sekitar pointer; tangan sedikit mengikuti kursor
 * - Scroll: kedua tangan merenggang & partikel memudar (parallax)
 * - Titik sentuh: glow berdenyut, busur listrik, gelombang kejut, percikan
 * Reduced motion → digambar statis sekali. Loop berhenti saat hero tidak terlihat.
 */

type HandsData = { w: number; h: number; tip: [number, number]; p: number[] };

const ROBOT_TIP: [number, number] = [372, 213];
const HUMAN_TIP: [number, number] = [388, 199];

interface Layout { s: number; tx: number; ty: number; w: number; h: number; narrow: boolean }

export default function HandsCanvas({ className }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d', { alpha: true })!;
    const rm = reducedMotion();
    let disposed = false;
    let raf = 0;
    let running = false;
    let visible = true;

    let data: HandsData | null = null;
    let N = 0;
    // Struktur data partikel
    let ox: Float32Array, oy: Float32Array, hx: Float32Array, hy: Float32Array;
    let x: Float32Array, y: Float32Array, vx: Float32Array, vy: Float32Array;
    let al: Float32Array, side: Uint8Array, ph: Float32Array, dl: Float32Array, sx: Float32Array, sy: Float32Array, hi: Uint8Array;

    let W = 0, H = 0, dpr = 1;
    let L: Layout = { s: 1, tx: 0, ty: 0, w: 0, h: 0, narrow: false };
    const mouse = { x: -9999, y: -9999, nx: 0, ny: 0, sx: 0, sy: 0 };
    let scrollP = 0;
    const t0 = performance.now();

    // Sprite glow kecil
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 32;
    {
      const g = sprite.getContext('2d')!;
      const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.35, 'rgba(255,255,255,.35)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 32, 32);
    }

    // Percikan dari titik sentuh
    const SP = 70;
    const spx = new Float32Array(SP), spy = new Float32Array(SP), svx = new Float32Array(SP), svy = new Float32Array(SP), slife = new Float32Array(SP), smax = new Float32Array(SP);
    let spIdx = 0;
    let arcs: { pts: [number, number][]; life: number }[] = [];
    let lastArc = 0;

    function computeLayout() {
      const r = wrap.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      const narrow = W < 760;
      const s = narrow ? (W * 1.6) / 736 : Math.min(Math.max((W * 1.02) / 736, 0.9), 2.6);
      const ty = H * (narrow ? 0.76 : 0.7);
      L = { s, tx: W / 2, ty, w: W, h: H, narrow };
      if (data) {
        for (let i = 0; i < N; i++) {
          hx[i] = L.tx + (ox[i] - data.tip[0]) * s;
          hy[i] = L.ty + (oy[i] - data.tip[1]) * s;
        }
      }
      setLayout({ ...L });
      onScroll();
    }

    function init(d: HandsData) {
      data = d;
      const total = d.p.length / 4;
      const narrow = wrap.getBoundingClientRect().width < 760;
      const step = narrow ? 2 : 1; // separuh partikel di layar kecil
      N = Math.ceil(total / step);
      ox = new Float32Array(N); oy = new Float32Array(N); hx = new Float32Array(N); hy = new Float32Array(N);
      x = new Float32Array(N); y = new Float32Array(N); vx = new Float32Array(N); vy = new Float32Array(N);
      al = new Float32Array(N); side = new Uint8Array(N); ph = new Float32Array(N); dl = new Float32Array(N);
      sx = new Float32Array(N); sy = new Float32Array(N); hi = new Uint8Array(N);
      let maxD = 1;
      for (let i = 0, j = 0; j < total; i++, j += step) {
        ox[i] = d.p[j * 4]; oy[i] = d.p[j * 4 + 1]; al[i] = d.p[j * 4 + 2]; side[i] = d.p[j * 4 + 3];
        const dd = Math.hypot(ox[i] - d.tip[0], oy[i] - d.tip[1]);
        if (dd > maxD) maxD = dd;
      }
      computeLayout();
      for (let i = 0; i < N; i++) {
        const dd = Math.hypot(ox[i] - d.tip[0], oy[i] - d.tip[1]) / maxD;
        dl[i] = 0.1 + dd * 0.95 + Math.random() * 0.3;
        ph[i] = Math.random() * Math.PI * 2;
        const a = Math.random() * Math.PI * 2;
        const m = 0.4 + Math.random() * 0.6;
        sx[i] = Math.cos(a) * m; sy[i] = Math.sin(a) * m;
        hi[i] = Math.random() < 0.07 ? 1 : 0;
        // mulai dari titik sentuh
        x[i] = L.tx + (Math.random() - 0.5) * 30 * L.s;
        y[i] = L.ty + (Math.random() - 0.5) * 30 * L.s;
      }
      if (rm) {
        for (let i = 0; i < N; i++) { x[i] = hx[i]; y[i] = hy[i]; }
        draw(10, true);
      } else {
        start();
      }
    }

    function spawnSpark(cx: number, cy: number) {
      const i = spIdx++ % SP;
      const a = Math.random() * Math.PI * 2;
      const v = (0.6 + Math.random() * 2.2) * Math.max(0.8, L.s * 0.7);
      spx[i] = cx; spy[i] = cy; svx[i] = Math.cos(a) * v; svy[i] = Math.sin(a) * v;
      smax[i] = slife[i] = 0.6 + Math.random() * 0.9;
    }

    function makeArc(ax: number, ay: number, bx: number, by: number) {
      const pts: [number, number][] = [];
      const segs = 7;
      const len = Math.hypot(bx - ax, by - ay);
      const nxp = -(by - ay) / (len || 1), nyp = (bx - ax) / (len || 1);
      for (let k = 0; k <= segs; k++) {
        const f = k / segs;
        const j = k === 0 || k === segs ? 0 : (Math.random() - 0.5) * len * 0.55;
        pts.push([ax + (bx - ax) * f + nxp * j, ay + (by - ay) * f + nyp * j]);
      }
      return pts;
    }

    let prevT = 0;
    function draw(t: number, staticFrame = false) {
      const dt = Math.min(0.05, t - prevT || 0.016);
      prevT = t;
      const s = L.s;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      // offset tangan: kursor + scroll
      mouse.sx += (mouse.nx - mouse.sx) * 0.05;
      mouse.sy += (mouse.ny - mouse.sy) * 0.05;
      const sp = staticFrame ? 0 : scrollP;
      const spread = sp * W * 0.16;
      const offs = [
        { x: -spread + mouse.sx * -14, y: mouse.sy * -8 },
        { x: spread + mouse.sx * 10, y: mouse.sy * 6 },
      ];
      const fade = 1 - Math.min(1, sp * 1.1);
      const scat = Math.pow(sp, 1.4) * 160 * s;
      const R = 120;
      const R2 = R * R;

      // jarak kursor ke titik sentuh → intensitas percikan
      const tipX = L.tx + (offs[0].x + offs[1].x) / 2;
      const tipY = L.ty + (offs[0].y + offs[1].y) / 2;
      const near = Math.max(0, 1 - Math.hypot(mouse.x - tipX, mouse.y - tipY) / 260);

      const colors = ['143,166,255', '255,128,92'];
      for (let pass = 0; pass < 2; pass++) {
        ctx.fillStyle = `rgb(${colors[pass]})`;
        for (let i = 0; i < N; i++) {
          if (side[i] !== pass) continue;
          const e = staticFrame ? 1 : Math.min(1, Math.max(0, (t - dl[i]) / 1.25));
          const ee = 1 - Math.pow(1 - e, 3);
          const o = offs[pass];
          let tx = hx[i] + o.x + sx[i] * scat + Math.sin(t * 0.9 + ph[i]) * 0.9 * s;
          let ty = hy[i] + o.y + sy[i] * scat + Math.cos(t * 0.75 + ph[i] * 1.3) * 0.9 * s;
          if (!staticFrame && ee < 1) {
            // dari titik sentuh menuju rumah
            tx = L.tx + (tx - L.tx) * ee;
            ty = L.ty + (ty - L.ty) * ee;
          }
          if (staticFrame) { x[i] = tx; y[i] = ty; }
          else {
            const dx = x[i] - mouse.x, dy = y[i] - mouse.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < R2 && d2 > 0.01) {
              const d = Math.sqrt(d2);
              const f = (1 - d / R) * (1 - d / R) * 4.2;
              vx[i] += (dx / d) * f; vy[i] += (dy / d) * f;
            }
            vx[i] = (vx[i] + (tx - x[i]) * 0.075) * 0.8;
            vy[i] = (vy[i] + (ty - y[i]) * 0.075) * 0.8;
            x[i] += vx[i]; y[i] += vy[i];
          }
          const a = al[i] * (staticFrame ? 1 : e) * fade;
          if (a <= 0.01) continue;
          const sz = (0.8 + al[i] * 1.0) * Math.max(1, s * 0.62);
          ctx.globalAlpha = a * 0.95;
          if (hi[i]) { ctx.fillStyle = 'rgb(246,247,255)'; ctx.fillRect(x[i], y[i], sz, sz); ctx.fillStyle = `rgb(${colors[pass]})`; }
          else ctx.fillRect(x[i], y[i], sz, sz);
        }
      }
      // halo halus di partikel tepi
      for (let i = 0; i < N; i += 3) {
        if (al[i] < 0.8) continue;
        const e = staticFrame ? 1 : Math.min(1, Math.max(0, (t - dl[i]) / 1.25));
        ctx.globalAlpha = 0.07 * e * fade;
        const g = 9 * Math.max(1, s * 0.6);
        ctx.drawImage(sprite, x[i] - g / 2, y[i] - g / 2, g, g);
      }

      // ===== Titik sentuh (spark) =====
      const intro = staticFrame ? 1 : Math.min(1, Math.max(0, (t - 0.2) / 1.2));
      if (intro > 0 && fade > 0) {
        const pulse = staticFrame ? 0.5 : 0.5 + 0.5 * Math.sin(t * 2.4);
        const r = (28 + pulse * 10 + near * 22) * Math.max(0.8, s * 0.75);
        const grd = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, r * 2.2);
        grd.addColorStop(0, `rgba(255,255,255,${0.95 * intro * fade})`);
        grd.addColorStop(0.12, `rgba(255,214,190,${0.75 * intro * fade})`);
        grd.addColorStop(0.35, `rgba(255,74,38,${0.32 * intro * fade})`);
        grd.addColorStop(0.7, `rgba(143,166,255,${0.10 * intro * fade})`);
        grd.addColorStop(1, 'rgba(143,166,255,0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(tipX, tipY, r * 2.2, 0, Math.PI * 2); ctx.fill();

        if (!staticFrame) {
          // gelombang kejut tiap ±3.2s
          const cyc = ((t - 1.2) % 3.2) / 3.2;
          if (t > 1.2) {
            const rr = cyc * 150 * Math.max(0.8, s * 0.7);
            ctx.globalAlpha = (1 - cyc) * 0.45 * fade;
            ctx.strokeStyle = 'rgb(255,150,120)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(tipX, tipY, rr, 0, Math.PI * 2); ctx.stroke();
            const rr2 = Math.max(0, cyc - 0.12) * 150 * Math.max(0.8, s * 0.7);
            ctx.globalAlpha = (1 - cyc) * 0.25 * fade;
            ctx.strokeStyle = 'rgb(143,166,255)';
            ctx.beginPath(); ctx.arc(tipX, tipY, rr2, 0, Math.PI * 2); ctx.stroke();
          }
          // busur listrik di antara ujung jari
          if (t - lastArc > 0.09 + Math.random() * 0.12) {
            lastArc = t;
            const ax = L.tx + (ROBOT_TIP[0] - 380) * s + offs[0].x, ay = L.ty + (ROBOT_TIP[1] - 206) * s + offs[0].y;
            const bx = L.tx + (HUMAN_TIP[0] - 380) * s + offs[1].x, by = L.ty + (HUMAN_TIP[1] - 206) * s + offs[1].y;
            arcs.push({ pts: makeArc(ax, ay, bx, by), life: 1 });
            if (Math.random() < 0.5 + near) arcs.push({ pts: makeArc(ax, ay, bx, by), life: 0.7 });
            const n = 1 + Math.floor(Math.random() * (2 + near * 4));
            for (let k = 0; k < n; k++) spawnSpark(tipX, tipY);
          }
          arcs = arcs.filter((a) => (a.life -= dt * 7) > 0);
          ctx.lineWidth = 1.2;
          for (const a of arcs) {
            ctx.globalAlpha = a.life * 0.9 * fade;
            ctx.strokeStyle = 'rgb(255,236,225)';
            ctx.beginPath();
            a.pts.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
            ctx.stroke();
          }
          // percikan
          ctx.fillStyle = 'rgb(255,220,200)';
          for (let i = 0; i < SP; i++) {
            if (slife[i] <= 0) continue;
            slife[i] -= dt;
            svx[i] *= 0.97; svy[i] *= 0.97;
            spx[i] += svx[i]; spy[i] += svy[i];
            ctx.globalAlpha = Math.max(0, slife[i] / smax[i]) * fade;
            ctx.fillRect(spx[i], spy[i], 1.6, 1.6);
          }
        }
        // inti
        ctx.globalAlpha = intro * fade;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(tipX, tipY, 2.2 + pulse * 1.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    function frame() {
      if (!running) return;
      draw((performance.now() - t0) / 1000);
      raf = requestAnimationFrame(frame);
    }
    function start() {
      if (running || rm || !data || !visible || document.hidden) return;
      running = true;
      prevT = (performance.now() - t0) / 1000;
      raf = requestAnimationFrame(frame);
    }
    function stop() { running = false; cancelAnimationFrame(raf); }

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      mouse.nx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ny = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onLeave = () => { mouse.x = mouse.y = -9999; mouse.nx = mouse.ny = 0; };
    const onScroll = () => { scrollP = H > 0 ? Math.min(1, Math.max(0, window.scrollY / (H * 0.9))) : 0; };
    const onVis = () => (document.hidden ? stop() : start());
    let rT = 0;
    const onResize = () => {
      window.clearTimeout(rT);
      rT = window.setTimeout(() => { computeLayout(); if (rm) draw(10, true); }, 120);
    };

    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? start() : stop(); }, { threshold: 0 });
    io.observe(wrap);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVis);
    onScroll();

    import('../data/hands.json').then((m) => { if (!disposed) init(m.default as unknown as HandsData); });

    return () => {
      disposed = true; stop(); io.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // label HUD diposisikan dari koordinat gambar sumber
  const at = (ix: number, iy: number) =>
    layout ? { left: layout.tx + (ix - 380) * layout.s, top: layout.ty + (iy - 206) * layout.s } : { display: 'none' };

  return (
    <div ref={wrapRef} className={`hands ${className || ''}`} aria-hidden="true">
      <canvas ref={canvasRef} />
      <div className="hud-layer">
      {layout && !layout.narrow && (
        <>
          <span className="hud hud--l" style={at(150, 262)}><i />AI · SISTEM</span>
          <span className="hud hud--r" style={at(640, 258)}><i />MANUSIA · FOUNDER</span>
          <span className="hud hud--c" style={at(380, 262)}>titik temu<b>VIBOXS</b></span>
        </>
      )}
      </div>
    </div>
  );
}
