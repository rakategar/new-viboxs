import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { finePointer, gsap, reducedMotion } from '@viboxs/shared/motion';

/**
 * Pengganti kartu hero: "buku perjalanan" tiga babak (foto asli, bukan ilustrasi kelas palsu).
 * Halaman depan berganti seperti dibalik; rail ala story menandai Discover → Learn → Apply.
 * Hover / fokus menahan putaran; klik tahap untuk lompat. Reduced motion → statis, tetap bisa diklik.
 */
const BABAK = [
  { step: 'Discover', id: 'Temukan', n: '01', k: 'Cangkul', img: '/assets/babak-kampung.jpg', pos: '50% 18%', line: 'Mulai dari realita, bukan kondisi ideal.' },
  { step: 'Learn', id: 'Pelajari', n: '02', k: 'Cold calling', img: '/assets/babak-calling.jpg', pos: '62% 40%', line: 'Namanya juga proses, pasti dihina.' },
  { step: 'Apply', id: 'Terapkan', n: '03', k: 'Panggung', img: '/assets/babak-stage.jpg', pos: '52% 30%', line: 'Value-nya tetap sama, cuma tampilannya yang beda.' },
];
const DWELL = 4200;

export default function HeroJourney() {
  const [active, setActive] = useState(0);
  const [turning, setTurning] = useState(-1);
  const [hold, setHold] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const rm = useRef(false);

  // putar otomatis (berhenti saat ditahan / tab tersembunyi / reduced motion)
  useEffect(() => {
    rm.current = reducedMotion();
    if (rm.current || hold) return;
    const t = window.setTimeout(() => go((active + 1) % BABAK.length), DWELL);
    return () => window.clearTimeout(t);
  }, [active, hold]);

  function go(i: number) {
    if (i === active) return;
    if (!rm.current) { setTurning(active); window.setTimeout(() => setTurning(-1), 900); }
    setActive(i);
  }

  // kedalaman: panggung miring mengikuti kursor, buku bergerak lebih jauh (paralaks)
  useEffect(() => {
    const el = stage.current;
    if (!el || reducedMotion() || !finePointer()) return;
    gsap.set(el, { transformPerspective: 1400 });
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.9, ease: 'power3.out' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.9, ease: 'power3.out' });
    const book = el.querySelector<HTMLElement>('.jr__book');
    const bx = book && gsap.quickTo(book, 'x', { duration: 1, ease: 'power3.out' });
    const by = book && gsap.quickTo(book, 'y', { duration: 1, ease: 'power3.out' });
    const move = (e: PointerEvent) => {
      const px = e.clientX / window.innerWidth - 0.5, py = e.clientY / window.innerHeight - 0.5;
      ry(px * 9); rx(-py * 7);
      bx?.(px * -26); by?.(py * -18);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);

  const b = BABAK[active];
  return (
    <div className="jr" data-build="Ilustrasi · Perjalanan belajar"
      onPointerEnter={() => setHold(true)} onPointerLeave={() => setHold(false)}
      onFocus={() => setHold(true)} onBlur={() => setHold(false)}>
      <div className="jr__rail" role="group" aria-label="Tahap belajar">
        {BABAK.map((x, i) => (
          <button key={x.step} type="button" className={`jr__seg ${i === active ? 'is-on' : ''} ${i < active ? 'is-done' : ''} ${hold ? 'is-held' : ''}`}
            aria-pressed={i === active} onClick={() => go(i)} style={{ '--dwell': `${DWELL}ms` } as CSSProperties}>
            <span className="jr__bar"><i key={`${active}-${i}`} /></span>
            <span className="jr__lbl"><b>{x.step}</b><span>{x.id}</span></span>
          </button>
        ))}
      </div>

      <div ref={stage} className="jr__stage">
        <svg className="jr__route" viewBox="0 0 400 420" aria-hidden="true" preserveAspectRatio="none">
          <path className="jr__path" d="M18 402 C 70 330, 30 250, 120 214 S 300 190, 300 110 S 360 30, 392 14" />
          <path className="jr__path jr__path--on" pathLength={1} style={{ strokeDashoffset: 1 - (active + 1) / 3 } as CSSProperties} d="M18 402 C 70 330, 30 250, 120 214 S 300 190, 300 110 S 360 30, 392 14" />
        </svg>

        {BABAK.map((x, i) => {
          const pos = (i - active + BABAK.length) % BABAK.length;
          return (
            <figure key={x.n} className={`jr__page ${turning === i ? 'is-turning' : ''}`} data-pos={pos} aria-hidden={pos !== 0}>
              <img src={x.img} alt="" style={{ objectPosition: x.pos }} loading={i === 0 ? 'eager' : 'lazy'} draggable={false} />
              <figcaption>
                <span className="jr__babak">BABAK {x.n} · {x.k.toUpperCase()}</span>
                <span className="jr__line">{x.line}</span>
              </figcaption>
              <span className="jr__corner" aria-hidden="true" />
            </figure>
          );
        })}

        <figure className="jr__book" aria-hidden="true">
          <img src="/assets/ebook-cover.jpg" alt="" draggable={false} />
          <span className="jr__shine" />
        </figure>

        <span className="jr__chip jr__chip--who" aria-hidden="true"><span className="jr__live" />Kisah nyata · Dede Darmawan</span>
        <span className="jr__chip jr__chip--type" aria-hidden="true">Mulai dari yang kamu punya<span className="jr__caret" /></span>
      </div>

      <p className="jr__sr" aria-live="polite">{`Tahap ${b.n}, ${b.step} — ${b.k}: ${b.line}`}</p>
      <span className="jr__credit">Foto: Dede Darmawan · AI Business Builder</span>
    </div>
  );
}
