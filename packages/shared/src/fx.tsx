import { createElement, useEffect, useRef, type ElementType, type ReactNode, type RefObject } from 'react';
import { finePointer, gsap, reducedMotion } from './motion';

/** Judul yang dipecah per kata — teks tetap utuh untuk pembaca layar. */
export function Split({ as = 'h2', text, className, id }: { as?: ElementType; text: string; className?: string; id?: string }) {
  const words = text.split(' ');
  return createElement(
    as,
    { className, id, 'data-split': '', 'aria-label': text },
    words.flatMap((w, i) => [
      <span className="w" aria-hidden="true" key={i}><span>{w}</span></span>,
      i < words.length - 1 ? ' ' : null,
    ]),
  );
}

/** Tombol/elemen "magnetik": sedikit tertarik ke kursor (desktop saja). */
export function useMagnetic<T extends HTMLElement>(strength = 0.28): RefObject<T> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion() || !finePointer()) return;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const leave = () => { xTo(0); yTo(0); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
  }, [strength]);
  return ref;
}

export function Magnetic({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useMagnetic<HTMLSpanElement>(0.3);
  return <span ref={ref} className={`magnetic ${className || ''}`}>{children}</span>;
}

/** Spotlight: set --mx/--my pada elemen untuk gradient yang mengikuti kursor. */
export function useSpotlight<T extends HTMLElement>(): RefObject<T> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !finePointer()) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    el.addEventListener('pointermove', move);
    return () => el.removeEventListener('pointermove', move);
  }, []);
  return ref;
}

/** Tilt 3D halus (maks ±deg). */
export function useTilt<T extends HTMLElement>(max = 4): RefObject<T> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion() || !finePointer()) return;
    gsap.set(el, { transformPerspective: 1200 });
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.8, ease: 'power3.out' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.8, ease: 'power3.out' });
    const move = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('textarea,input')) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      ry(px * max * 2);
      rx(-py * max * 2);
    };
    const leave = () => { rx(0); ry(0); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
  }, [max]);
  return ref;
}
