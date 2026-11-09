import { useEffect, useRef } from 'react';
import { finePointer, reducedMotion } from '@viboxs/shared/motion';

/**
 * Latar hero: jaringan node yang bergerak pelan, terhubung saat berdekatan,
 * dan "menyala" di sekitar kursor — metafora sistem yang saling terhubung.
 * Dekoratif (aria-hidden). Berhenti saat off-screen / tab tersembunyi; statis di reduced motion.
 */
export default function SignalField({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const rm = reducedMotion();
    const fine = finePointer();
    let W = 0, H = 0, dpr = 1, raf = 0, visible = true;
    type N = { x: number; y: number; vx: number; vy: number; r: number; hue: number; ph: number };
    let nodes: N[] = [];
    const mouse = { x: -9999, y: -9999, on: false };
    const pulses: { a: number; b: number; t: number; sp: number }[] = [];

    const resize = () => {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(90, Math.max(28, (W * H) / 16000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.4 + 0.6, hue: Math.random(), ph: Math.random() * Math.PI * 2,
      }));
      if (rm) draw(0);
    };

    const LINK = 130;
    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      // links
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > LINK * LINK) continue;
          const d = Math.sqrt(d2);
          let al = (1 - d / LINK) * 0.16;
          if (mouse.on) {
            const mx = (a.x + b.x) / 2 - mouse.x, my = (a.y + b.y) / 2 - mouse.y;
            const md = Math.sqrt(mx * mx + my * my);
            if (md < 180) al += (1 - md / 180) * 0.4;
          }
          ctx.strokeStyle = `rgba(143,166,255,${al.toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      // pulses travelling along a link
      for (let k = pulses.length - 1; k >= 0; k--) {
        const p = pulses[k];
        const a = nodes[p.a], b = nodes[p.b];
        if (!a || !b) { pulses.splice(k, 1); continue; }
        p.t += p.sp;
        if (p.t >= 1) { pulses.splice(k, 1); continue; }
        const x = a.x + (b.x - a.x) * p.t, y = a.y + (b.y - a.y) * p.t;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 10);
        g.addColorStop(0, 'rgba(255,74,38,.9)'); g.addColorStop(1, 'rgba(255,74,38,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
      }
      // nodes
      for (const n of nodes) {
        let glow = 0.35 + Math.sin(t * 0.0015 + n.ph) * 0.15;
        if (mouse.on) {
          const dx = n.x - mouse.x, dy = n.y - mouse.y;
          const md = Math.sqrt(dx * dx + dy * dy);
          if (md < 160) glow += (1 - md / 160) * 0.6;
        }
        ctx.fillStyle = n.hue > 0.86 ? `rgba(255,74,38,${Math.min(1, glow + 0.2).toFixed(3)})` : `rgba(246,247,255,${Math.min(0.9, glow).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      }
    };

    const step = (t: number) => {
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (mouse.on) {
          const dx = n.x - mouse.x, dy = n.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 120 * 120 && d2 > 1) { const f = 0.25 / Math.sqrt(d2); n.x += dx * f; n.y += dy * f; }
        }
        if (n.x < -20) n.x = W + 20; if (n.x > W + 20) n.x = -20;
        if (n.y < -20) n.y = H + 20; if (n.y > H + 20) n.y = -20;
      }
      if (pulses.length < 6 && Math.random() < 0.06 && nodes.length > 2) {
        const a = Math.floor(Math.random() * nodes.length);
        let best = -1, bd = LINK * LINK;
        for (let j = 0; j < nodes.length; j++) {
          if (j === a) continue;
          const dx = nodes[a].x - nodes[j].x, dy = nodes[a].y - nodes[j].y, d2 = dx * dx + dy * dy;
          if (d2 < bd && Math.random() < 0.5) { bd = d2; best = j; }
        }
        if (best >= 0) pulses.push({ a, b: best, t: 0, sp: 0.012 + Math.random() * 0.012 });
      }
      draw(t);
    };

    const loop = (t: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      step(t);
      raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf && !rm && visible && !document.hidden) raf = requestAnimationFrame(loop); };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); });
    io.observe(cv);
    const onVis = () => kick();
    document.addEventListener('visibilitychange', onVis);
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      mouse.on = mouse.y > -40 && mouse.y < r.height + 40;
    };
    const onLeave = () => { mouse.on = false; };
    if (fine && !rm) { window.addEventListener('pointermove', onMove, { passive: true }); document.addEventListener('pointerleave', onLeave); }
    kick();
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onMove); document.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return <canvas ref={ref} className={`signal ${className}`} aria-hidden="true" />;
}
