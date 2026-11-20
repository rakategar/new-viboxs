import { useEffect, useMemo, useRef } from 'react';
import { reduced, useInView } from './motion';

/* ---------------- ikon pixel-art: kotak menyala acak sampai membentuk ikon ---------------- */
const PATTERNS: Record<string, string[]> = {
  lock: ['..XXXXX..', '.XX...XX.', '.X.....X.', '.X.....X.', 'XXXXXXXXX', 'XXXX.XXXX', 'XXXX.XXXX', 'XXXXXXXXX', 'XXXXXXXXX'],
  eye: ['...XXXXX...', '.XX.....XX.', 'X...XXX...X', 'X..XXXXX..X', 'X...XXX...X', '.XX.....XX.', '...XXXXX...'],
  code: ['......X....', '..X...X.X..', '.X...X...X.', 'X....X....X', '.X...X...X.', '..X.X...X..', '....X......'],
  person: ['...XXX...', '..XXXXX..', '..XXXXX..', '...XXX...', '.........', '.XXXXXXX.', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX'],
  crown: ['X....X....X', 'XX..XXX..XX', 'XXXXXXXXXXX', 'XXXXXXXXXXX', 'XXXXXXXXXXX', '...........', 'XXXXXXXXXXX'],
  target: ['..XXXXX..', '.X.....X.', 'X..XXX..X', 'X.X...X.X', 'X.X.X.X.X', 'X.X...X.X', 'X..XXX..X', '.X.....X.', '..XXXXX..'],
  book: ['XXXX...XXXX', 'X..XX.XX..X', 'X...X.X...X', 'X...X.X...X', 'X...X.X...X', 'X..XX.XX..X', 'XXXX.X.XXXX', '....XXX....'],
  grid: ['XXXX.XXXX', 'X..X.X..X', 'X..X.X..X', 'XXXX.XXXX', '.........', 'XXXX.XXXX', 'X..X.X..X', 'X..X.X..X', 'XXXX.XXXX'],
};

export function PixelIcon({ name, cell = 12, accent }: { name: string; cell?: number; accent?: boolean }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.4);
  const rows = PATTERNS[name] ?? PATTERNS.grid;
  const cols = rows[0].length;
  // urutan nyala acak tapi stabil per ikon
  const delays = useMemo(() => rows.join('').split('').map((_, i) => ((i * 7919) % 97) / 97), [rows]);
  return (
    <div ref={ref} className={`px ${seen ? 'is-in' : ''} ${accent ? 'px--accent' : ''}`} aria-hidden="true"
      style={{ gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gridAutoRows: `${cell}px` }}>
      {rows.join('').split('').map((c, i) => (
        <i key={i} className={c === 'X' ? 'on' : ''} style={c === 'X' ? { ['--d' as string]: `${delays[i] * 0.9}s` } : undefined} />
      ))}
    </div>
  );
}

/* ---------------- footer: jejak piksel mengikuti kursor (canvas 2D, decay ~600ms) ---------------- */
export function PixelTrail() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext('2d')!;
    const G = 24; const DECAY = 600;
    let cols = 0; let rows = 0; let heat = new Float32Array(0);
    let raf = 0; let last = performance.now(); let visible = false; let prev: { x: number; y: number } | null = null;
    const still = reduced();

    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = cv.getBoundingClientRect();
      cv.width = r.width * dpr; cv.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(r.width / G); rows = Math.ceil(r.height / G);
      heat = new Float32Array(cols * rows);
      draw();
    };
    const draw = () => {
      const r = cv.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const h = heat[y * cols + x];
        const cx = x * G + G / 2; const cy = y * G + G / 2;
        if (h > 0.02) {
          const s = 3 + 7 * h;
          ctx.fillStyle = h > 0.6 ? `rgba(255,255,255,${h})` : `rgba(255,196,181,${h * 1.2})`;
          ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
        } else {
          ctx.fillStyle = '#3a3a3a';
          ctx.beginPath(); ctx.arc(cx, cy, 1.6, 0, Math.PI * 2); ctx.fill();
        }
      }
    };
    const loop = (t: number) => {
      const dt = t - last; last = t;
      let any = false;
      for (let i = 0; i < heat.length; i++) if (heat[i] > 0) { heat[i] = Math.max(0, heat[i] - dt / DECAY); any = true; }
      draw();
      raf = any ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } };
    const light = (px: number, py: number, v = 1) => {
      const x = Math.floor(px / G); const y = Math.floor(py / G);
      if (x >= 0 && y >= 0 && x < cols && y < rows) heat[y * cols + x] = Math.max(heat[y * cols + x], v);
    };
    const onMove = (e: PointerEvent) => {
      if (still) return;
      const r = cv.getBoundingClientRect();
      const p = { x: e.clientX - r.left, y: e.clientY - r.top };
      // isi sel di antara dua event agar gerakan cepat tidak putus-putus
      if (prev) { const n = Math.ceil(Math.hypot(p.x - prev.x, p.y - prev.y) / (G / 2)); for (let k = 1; k <= n; k++) light(prev.x + ((p.x - prev.x) * k) / n, prev.y + ((p.y - prev.y) * k) / n); }
      light(p.x, p.y); prev = p; kick();
    };
    const onLeave = () => { prev = null; };
    // kilau acak pelan supaya area tetap "hidup" saat tidak disentuh
    const idle = window.setInterval(() => { if (visible && !still && cols) { light(Math.random() * cols * G, Math.random() * rows * G, 0.55); kick(); } }, 420);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(cv);
    const ro = new ResizeObserver(size);
    ro.observe(cv);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerleave', onLeave);
    return () => { cancelAnimationFrame(raf); window.clearInterval(idle); io.disconnect(); ro.disconnect(); cv.removeEventListener('pointermove', onMove); cv.removeEventListener('pointerleave', onLeave); };
  }, []);
  return <canvas ref={ref} className="px-trail" aria-hidden="true" />;
}
