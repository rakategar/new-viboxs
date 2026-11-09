import { useEffect, useRef, useState } from 'react';
import { gsap, reducedMotion } from '@viboxs/shared/motion';
import { IcChart, IcFlow, IcSpark, IcWeb } from './icons';

/**
 * Hero Services — "agent" yang membangun halaman di depan mata.
 * Cursor melayang memilih komponen dari palet, menggambar blok, mengisi form, menghubungkan alur,
 * dan merender dashboard, lalu menandai "siap direview". Murni ilustrasi proses (berlabel SIMULASI).
 * Loop berhenti saat tidak terlihat; reduced motion → hasil akhir statis tanpa cursor.
 */
const LOG = [
  'Membaca brief: booking untuk 3 cabang',
  'Menyusun navigasi & hero',
  'Membangun form booking',
  'Menghubungkan form → CRM → notifikasi',
  'Merender dashboard laporan',
  'Siap direview (UAT)',
];

const PALETTE = [
  { k: 'web', Ic: IcWeb, t: 'Layout' },
  { k: 'form', Ic: IcWeb, t: 'Form' },
  { k: 'flow', Ic: IcFlow, t: 'Alur' },
  { k: 'chart', Ic: IcChart, t: 'Data' },
];

export default function AgentBuild() {
  const root = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(LOG.length - 1);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el || reducedMotion()) return;
    setLive(true);
    const q = gsap.utils.selector(el);
    const cur = q('.ab__cursor')[0];
    const ripple = q('.ab__ripple')[0];
    const hidden = 'inset(0% 100% 100% 0%)';
    const shown = 'inset(0% 0% 0% 0%)';
    const pick = (i: number) => () => q('.ab__tool').forEach((t, n) => t.classList.toggle('is-on', n === i));
    const click = (tl: gsap.core.Timeline) => tl.fromTo(ripple, { scale: 0, autoAlpha: 0.9 }, { scale: 2.6, autoAlpha: 0, duration: 0.5, ease: 'power2.out' });
    const move = (tl: gsap.core.Timeline, x: number, y: number, d = 0.65, pos?: string) =>
      tl.to(cur, { left: `${x}%`, top: `${y}%`, duration: d, ease: 'power3.inOut' }, pos);
    const draw = (tl: gsap.core.Timeline, sel: string, x2: number, y2: number, d = 0.75) => {
      tl.to(q(sel), { clipPath: shown, duration: d, ease: 'power2.inOut' }, 'draw' + sel);
      move(tl, x2, y2, d, 'draw' + sel);
    };

    const tl = gsap.timeline({ repeat: -1, paused: true, defaults: { ease: 'power3.out' } });
    // reset
    tl.set(q('.ab__blk'), { clipPath: hidden, autoAlpha: 1 })
      .set(q('.ab__fill'), { scaleX: 0 })
      .set(q('.ab__bar'), { scaleY: 0 })
      .set(q('.ab__node'), { scale: 0, autoAlpha: 0 })
      .set(q('.ab__wire'), { strokeDashoffset: 100 })
      .call(() => q('.ab__send')[0]?.classList.remove('is-ok'))
      .set(q('.ab__toast, .ab__review'), { autoAlpha: 0, y: 8 })
      .set(cur, { left: '58%', top: '46%', autoAlpha: 1 })
      .call(() => setStep(0))
      .call(pick(-1))
      .to(q('.ab__think'), { autoAlpha: 1, duration: 0.2 })
      .to({}, { duration: 0.9 })
      .to(q('.ab__think'), { autoAlpha: 0, duration: 0.2 });

    // 1 — navbar + hero
    tl.call(() => setStep(1));
    move(tl, 7, 14); tl.call(pick(0)); click(tl);
    move(tl, 17, 5);
    draw(tl, '.ab__nav', 98, 13);
    tl.to(q('.ab__nav .ab__fill'), { scaleX: 1, duration: 0.35, stagger: 0.08 });
    move(tl, 17, 18, 0.5);
    draw(tl, '.ab__hero', 64, 52);
    tl.to(q('.ab__hero .ab__fill'), { scaleX: 1, duration: 0.5, stagger: 0.18, ease: 'steps(14)' });
    move(tl, 24, 44, 0.45); click(tl);

    // 2 — form
    tl.call(() => setStep(2));
    move(tl, 7, 30); tl.call(pick(1)); click(tl);
    move(tl, 68, 18);
    draw(tl, '.ab__form', 98, 62);
    q('.ab__form .ab__fill').forEach((f, i) => {
      move(tl, 76, 28 + i * 9, 0.35);
      tl.to(f, { scaleX: 1, duration: 0.4, ease: 'steps(10)' });
    });
    move(tl, 83, 55, 0.4); click(tl);
    tl.call(() => q('.ab__send')[0]?.classList.add('is-ok'), undefined, '<')
      .to(q('.ab__toast'), { autoAlpha: 1, y: 0, duration: 0.3 }, '<');

    // 3 — automation flow
    tl.call(() => setStep(3));
    move(tl, 7, 46); tl.call(pick(2)); click(tl);
    move(tl, 68, 67);
    draw(tl, '.ab__flow', 98, 96, 0.6);
    tl.to(q('.ab__node'), { scale: 1, autoAlpha: 1, duration: 0.3, stagger: 0.18, ease: 'back.out(2)' })
      .to(q('.ab__wire'), { strokeDashoffset: 0, duration: 0.7, ease: 'none' }, '<0.1');

    // 4 — dashboard
    tl.call(() => setStep(4));
    move(tl, 7, 62); tl.call(pick(3)); click(tl);
    move(tl, 17, 57);
    draw(tl, '.ab__chart', 64, 96);
    tl.to(q('.ab__bar'), { scaleY: 1, duration: 0.5, stagger: 0.06 });

    // 5 — review
    tl.call(() => setStep(5)).call(pick(-1));
    tl.to(q('.ab__review'), { autoAlpha: 1, y: 0, duration: 0.35 });
    move(tl, 50, 47, 0.6); click(tl);
    tl.to({}, { duration: 2 })
      .to(q('.ab__blk, .ab__review, .ab__toast'), { autoAlpha: 0, duration: 0.5 })
      .to(cur, { autoAlpha: 0, duration: 0.3 }, '<');

    tl.seek(0.001); // render state awal (blok tersembunyi) sebelum mulai
    let vis = false;
    const sync = () => (vis && !document.hidden ? tl.play() : tl.pause());
    const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; sync(); }, { threshold: 0.15 });
    io.observe(el);
    document.addEventListener('visibilitychange', sync);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', sync); tl.kill(); };
  }, []);

  return (
    <div ref={root} className={`ab ${live ? 'is-live' : ''}`} aria-label="Ilustrasi: agen VIBOXS menyusun website, form, alur otomasi, dan dashboard dari sebuah brief." role="img">
      <div className="ab__chrome">
        <span className="ab__dots"><i /><i /><i /></span>
        <span className="ab__url mono">contoh-bisnis.id</span>
        <span className="ab__status"><i />{step < LOG.length - 1 ? 'Agent · membangun' : 'Siap direview'}</span>
      </div>
      <div className="ab__stage">
        <div className="ab__palette">
          {PALETTE.map(({ k, Ic, t }) => (
            <span key={k} className="ab__tool"><Ic size={15} /><em>{t}</em></span>
          ))}
        </div>

        <div className="ab__blk ab__nav" style={{ left: '16%', top: '4%', width: '82%', height: '9%' }}>
          <span className="ab__logo" />
          <span className="ab__fill" style={{ width: '9%' }} /><span className="ab__fill" style={{ width: '9%' }} /><span className="ab__fill" style={{ width: '9%' }} />
          <span className="ab__pill" />
        </div>

        <div className="ab__blk ab__hero" style={{ left: '16%', top: '17%', width: '48%', height: '35%' }}>
          <span className="ab__fill ab__h" style={{ width: '88%' }} />
          <span className="ab__fill ab__h" style={{ width: '62%' }} />
          <span className="ab__fill ab__p" style={{ width: '74%' }} />
          <span className="ab__btn">Booking sekarang</span>
        </div>

        <div className="ab__blk ab__form" style={{ left: '67%', top: '17%', width: '31%', height: '45%' }}>
          <span className="ab__lbl">Booking</span>
          {[0, 1, 2].map((i) => <span key={i} className="ab__field"><span className="ab__fill" /></span>)}
          <span className="ab__send">Kirim</span>
        </div>

        <div className="ab__blk ab__chart" style={{ left: '16%', top: '57%', width: '48%', height: '39%' }}>
          <span className="ab__lbl">Laporan mingguan · data contoh</span>
          <div className="ab__bars">
            {[42, 64, 50, 78, 58, 88, 70].map((h, i) => <span key={i} className="ab__bar" style={{ height: `${h}%` }} />)}
          </div>
        </div>

        <div className="ab__blk ab__flow" style={{ left: '67%', top: '67%', width: '31%', height: '29%' }}>
          <svg className="ab__wires" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
            <path className="ab__wire" d="M14 20 H86" pathLength={100} />
          </svg>
          <span className="ab__node">Form</span><span className="ab__node">CRM</span><span className="ab__node">Notif</span>
        </div>

        <span className="ab__toast">Lead masuk → CRM ✓</span>
        <span className="ab__review">UAT · siap direview</span>

        <div className="ab__cursor" aria-hidden="true">
          <span className="ab__ripple" />
          <svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 3l7.5 18 2.4-7.6L21.5 11z" fill="#FF4A26" stroke="#090B14" strokeWidth="1.4" strokeLinejoin="round" /></svg>
          <span className="ab__tag"><IcSpark size={12} />VIBOXS Agent<span className="ab__think"><i /><i /><i /></span></span>
        </div>
      </div>
      <div className="ab__log mono" aria-hidden="true">
        {LOG.map((l, i) => (
          <span key={l} className={i < step ? 'is-done' : i === step ? 'is-cur' : ''}>
            <em>{i < step || (i === step && step === LOG.length - 1) ? '✓' : i === step ? '›' : '·'}</em>{l}
          </span>
        ))}
      </div>
      <span className="ab__note mono-label">SIMULASI · ILUSTRASI PROSES BUILD · BUKAN PROYEK KLIEN</span>
    </div>
  );
}
