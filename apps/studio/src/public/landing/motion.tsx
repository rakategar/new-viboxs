import { createElement, useEffect, useRef, useState, type RefObject } from 'react';

/** Gerak landing Studio: reveal sekali saat terlihat, hormati prefers-reduced-motion. */
export const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useInView<T extends Element>(amount = 0.3, once = true): [RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setSeen(true); if (once) io.disconnect(); } else if (!once) setSeen(false);
    }, { threshold: amount });
    io.observe(el);
    return () => io.disconnect();
  }, [amount, once]);
  return [ref, seen];
}

/** Semua elemen [data-rv] di dalam root mendapat .is-in saat masuk viewport (paragraf fade-up, kartu stagger). */
export function useReveal(root: RefObject<HTMLElement>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>('[data-rv]'));
    if (reduced() || !('IntersectionObserver' in window)) { items.forEach((x) => x.classList.add('is-in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
    items.forEach((x) => io.observe(x));
    return () => io.disconnect();
  }, [root]);
}

/** Judul yang muncul per kata (y + blur). Teks utuh tetap terbaca screen reader. */
export function RevealText({ as = 'h2', text, className = '' }: { as?: 'h1' | 'h2' | 'h3'; text: string; className?: string }) {
  const lines = text.split('\n');
  let n = 0;
  return createElement(as, { className: `rv-words ${className}`, 'data-rv': '' },
    <span className="sr-only">{text.replace(/\n/g, ' ')}</span>,
    <span aria-hidden="true">
      {lines.map((l, li) => (
        <span key={li} className="rv-line">
          {l.split(' ').map((w, wi) => <span key={wi} className="rv-w" style={{ ['--i' as string]: n++ }}>{w}{' '}</span>)}
        </span>
      ))}
    </span>,
  );
}
