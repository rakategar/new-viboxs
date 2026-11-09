import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLayoutEffect, type RefObject } from 'react';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

export const EASE = 'power3.out'; // ≈ cubic-bezier(.2,.8,.2,1)

export const reducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const finePointer = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/**
 * Motion manifest (deklaratif, lewat data-attribute):
 *  data-anim="up"        → fade + naik 28px saat masuk viewport (sekali)
 *  data-anim="stagger"   → anak-anaknya muncul berurutan (maks ±80ms/item)
 *  data-anim="clip"      → reveal clip-path dari bawah
 *  data-split            → judul dipecah per kata, kata naik dari mask
 *  data-parallax="n"     → translateY ter-scrub terhadap scroll (n = kekuatan, px per 100% viewport)
 *  data-draw             → stroke SVG path tergambar ter-scrub
 * Semua mati saat prefers-reduced-motion: konten tetap tampil apa adanya.
 */
export function initMotion(scope: HTMLElement) {
  if (reducedMotion()) return () => {};
  const ctx = gsap.context(() => {
    scope.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
      const words = el.querySelectorAll<HTMLElement>('.w > span');
      if (!words.length) return;
      gsap.from(words, {
        yPercent: 110, rotate: 4, duration: 0.9, ease: 'power4.out', stagger: 0.045,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });

    scope.querySelectorAll<HTMLElement>('[data-anim="up"]').forEach((el) => {
      gsap.from(el, {
        y: 28, autoAlpha: 0, duration: 0.8, ease: EASE, delay: Number(el.dataset.delay || 0),
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      });
    });

    scope.querySelectorAll<HTMLElement>('[data-anim="stagger"]').forEach((el) => {
      gsap.from(el.children, {
        y: 40, autoAlpha: 0, duration: 0.85, ease: EASE, stagger: 0.08,
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      });
    });

    scope.querySelectorAll<HTMLElement>('[data-anim="clip"]').forEach((el) => {
      gsap.fromTo(el, { clipPath: 'inset(18% 6% 18% 6% round 24px)' }, {
        clipPath: 'inset(0% 0% 0% 0% round 16px)', duration: 1.1, ease: 'power3.inOut',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });

    scope.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
      const n = Number(el.dataset.parallax || 60);
      gsap.fromTo(el, { y: -n }, {
        y: n, ease: 'none',
        scrollTrigger: { trigger: el.parentElement || el, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    scope.querySelectorAll<SVGPathElement>('[data-draw]').forEach((p) => {
      const len = p.getTotalLength ? p.getTotalLength() : 300;
      gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, {
        strokeDashoffset: 0, ease: 'none',
        scrollTrigger: { trigger: p.closest('section') || p, start: 'top 75%', end: 'center 50%', scrub: 0.6 },
      });
    });
  }, scope);
  // Pastikan posisi trigger benar setelah gambar/font termuat
  const t = window.setTimeout(() => ScrollTrigger.refresh(), 400);
  return () => { window.clearTimeout(t); ctx.revert(); };
}

export function useMotion(ref: RefObject<HTMLElement>, deps: unknown[] = []) {
  useLayoutEffect(() => {
    if (!ref.current) return;
    return initMotion(ref.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
