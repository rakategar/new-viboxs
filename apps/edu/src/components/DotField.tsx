import { useEffect, useRef } from 'react';
import { finePointer, reducedMotion } from '@viboxs/shared/motion';

/**
 * Latar hero EDU: kertas bertitik (dot-grid notebook). Gelombang pelan menyapu halaman,
 * titik di sekitar kursor menyala dan sedikit terdorong — seperti tinta yang baru menyentuh kertas.
 * Dekoratif; berhenti saat off-screen / tab tersembunyi; statis di reduced motion.
 */
export default function DotField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const rm = reducedMotion();
    let W = 0, H = 0, raf = 0, visible = true;
    const GAP = 26;
    const m = { x: -999, y: -999, tx: -999, ty: -999 };

    const resize = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (rm) draw(0);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      m.x += (m.tx - m.x) * 0.12; m.y += (m.ty - m.y) * 0.12;
      const cols = Math.ceil(W / GAP) + 1, rows = Math.ceil(H / GAP) + 1;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          let x = i * GAP + (j % 2 ? GAP / 2 : 0), y = j * GAP;
          // gelombang ambient diagonal
          const wave = rm ? 0 : Math.sin(x * 0.012 + y * 0.008 - t * 0.0011) * 0.5 + 0.5;
          const dx = x - m.x, dy = y - m.y, d = Math.hypot(dx, dy);
          const near = Math.max(0, 1 - d / 170);
          if (near > 0) { x += (dx / (d || 1)) * near * 9; y += (dy / (d || 1)) * near * 9; }
          const a = 0.05 + wave * 0.07 + near * 0.55;
          const r = 0.9 + wave * 0.4 + near * 1.6;
          ctx.fillStyle = near > 0.15
            ? `rgba(${255 - near * 112 | 0},${74 + near * 92 | 0},${38 + near * 217 | 0},${a})`
            : `rgba(246,247,255,${a})`;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
      }
    };
    const loop = (t: number) => { raf = requestAnimationFrame(loop); if (visible) draw(t); };

    resize();
    const ro = new ResizeObserver(resize); ro.observe(cv);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }); io.observe(cv);
    const mv = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); m.tx = e.clientX - r.left; m.ty = e.clientY - r.top; };
    if (!rm && finePointer()) window.addEventListener('pointermove', mv, { passive: true });
    if (!rm) raf = requestAnimationFrame(loop);
    const onVis = () => { cancelAnimationFrame(raf); if (!document.hidden && !rm) raf = requestAnimationFrame(loop); };
    document.addEventListener('visibilitychange', onVis);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); window.removeEventListener('pointermove', mv); document.removeEventListener('visibilitychange', onVis); };
  }, []);
  return <canvas ref={ref} className="dotfield" aria-hidden="true" />;
}
