import { useEffect, useRef } from 'react';
import { gsap, reducedMotion } from '../lib/motion';

const WORDS = ['Belajar', 'Terhubung', 'Membangun', 'One Person Company', 'AI Venture Studio', 'Universe', 'EDU', 'Services'];

/** Pita teks berjalan; kecepatan & kemiringan bereaksi pada kecepatan scroll. Dekoratif. */
export default function Marquee() {
  const trackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = trackRef.current;
    if (!el || reducedMotion()) return;
    let x = 0, vel = 0, lastY = window.scrollY, raf = 0, skew = 0;
    const half = () => el.scrollWidth / 2;
    const loop = () => {
      const y = window.scrollY;
      const dy = y - lastY; lastY = y;
      vel += (dy * 0.25 - vel) * 0.12;
      x -= 0.6 + Math.abs(vel) * 0.9;
      const h = half();
      if (h > 0 && -x >= h) x += h;
      skew += (Math.max(-8, Math.min(8, vel * 0.6)) - skew) * 0.15;
      gsap.set(el, { x, skewX: -skew });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const row = WORDS.map((w, i) => (
    <span className="mq__item" key={i}>
      {w}
      <span className="mq__dots"><i /><i /><i /></span>
    </span>
  ));
  return (
    <div className="mq" aria-hidden="true">
      <div className="mq__track" ref={trackRef}>{row}{row}</div>
    </div>
  );
}
