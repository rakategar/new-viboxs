import { useEffect, useRef } from 'react';
import { finePointer, gsap, reducedMotion } from '../lib/motion';

/**
 * Aksen kursor opsional (M06): cincin kecil yang mengikuti pointer,
 * tidak mengganti kursor native, mati di touch / form / reduced motion.
 */
export default function Cursor() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion() || !finePointer()) return;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' });
    const move = (e: PointerEvent) => {
      xTo(e.clientX); yTo(e.clientY);
      const t = e.target as HTMLElement;
      const inForm = !!t.closest('input,textarea,select,label');
      const hot = !!t.closest('a,button,[role=tab]');
      el.classList.toggle('is-hidden', inForm);
      el.classList.toggle('is-hot', hot && !inForm);
      el.classList.add('is-on');
    };
    const leave = () => el.classList.remove('is-on');
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    return () => { window.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave); };
  }, []);
  return <div ref={ref} className="cursor" aria-hidden="true" />;
}
