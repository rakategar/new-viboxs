import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from '@viboxs/shared/icons';
import { Magnetic, Split } from '@viboxs/shared/fx';
import { gsap, reducedMotion, useMotion } from '@viboxs/shared/motion';
import { FLOW } from '../lib/content';

export default function Process() {
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref);

  // Garis timeline vertikal terisi mengikuti scroll; node tahap menyala saat dilewati (tanpa mengunci scroll).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.tl__fill', { scaleY: 0 }, {
        scaleY: 1, ease: 'none',
        scrollTrigger: { trigger: '.tl', start: 'top 70%', end: 'bottom 60%', scrub: 0.5 },
      });
      el.querySelectorAll<HTMLElement>('.tl__item').forEach((it) => {
        gsap.from(it, { autoAlpha: 0, y: 30, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: it, start: 'top 85%', once: true } });
        gsap.to(it, { scrollTrigger: { trigger: it, start: 'top 62%', toggleClass: 'is-lit' } });
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref}>
      <section className="page-hero">
        <div className="page-hero__glow" aria-hidden="true" />
        <div className="container rel split-2 align-end">
          <div className="stack-20">
            <span className="mono-label">PROCESS · SCOPING → HANDOVER</span>
            <Split as="h1" className="h1-sm" text="Proses kerja, dari brief sampai serah terima." />
          </div>
          <p className="lead muted" data-anim="up">Tujuh tahap dengan aktivitas dan output yang jelas. Setiap tahap punya gate — pekerjaan baru berlanjut setelah gate terpenuhi.</p>
        </div>
      </section>

      <section className="pb-section">
        <div className="container">
          <div className="tl__head mono-label" aria-hidden="true"><span>Tahap</span><span>Nama</span><span>Aktivitas</span><span>Output / gate</span></div>
          <ol className="tl">
            <span className="tl__line" aria-hidden="true"><span className="tl__fill" /></span>
            {FLOW.map((t, i) => (
              <li key={t.t} className={`tl__item ${t.gate ? 'is-gate' : ''}`}>
                <span className="tl__node"><span>{i + 1}</span></span>
                <b className="tl__name">{t.t}</b>
                <span className="tl__act body muted">{t.act}</span>
                <span className="tl__out body">
                  {t.out}
                  {t.gate && <span className="gate-badge">Gate development</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section light">
        <div className="container stack-40">
          <div className="sec-head__copy">
            <span className="eyebrow ink-muted" data-anim="up">Guardrails</span>
            <Split className="h2" text="Batas yang kami pegang di setiap proyek." />
          </div>
          <div className="guards" data-anim="stagger">
            {[
              ['Inquiry bukan perintah kerja', 'Development tidak otomatis dimulai dari inquiry. Pekerjaan berjalan setelah lingkup dikunci.'],
              ['Semua ketentuan tertulis di SOW', 'SLA, jumlah revisi, garansi, lisensi, dan hak kekayaan intelektual ditulis di SOW.'],
              ['Boleh berkata tidak', 'Kebutuhan yang tidak feasible bisa kami tolak, dengan alasan yang jelas.'],
            ].map(([t, d], i) => (
              <div key={t} className="guard">
                <span className="guard__n mono">0{i + 1}</span>
                <b className="h4">{t}</b>
                <span className="body ink-muted">{d}</span>
              </div>
            ))}
          </div>
          <div className="roles" data-anim="up">
            <span className="eyebrow ink-muted">Siapa yang terlibat</span>
            <span><strong>Project lead</strong> <span className="ink-muted">(Commander) — titik kontak Anda</span></span>
            <span><strong>Tim builder</strong> <span className="ink-muted">(Rangers) — desain &amp; pengembangan</span></span>
            <span><strong>Anda</strong> <span className="ink-muted">— pemilik keputusan &amp; penguji UAT</span></span>
          </div>
        </div>
      </section>

      <section className="section--xl">
        <div className="container">
          <div className="cta-band cta-band--big" data-anim="up">
            <Split className="h2" text="Tahap pertama dimulai dari brief Anda." />
            <Magnetic><Link to="/start" className="btn btn--primary">Konsultasikan Kebutuhan <ArrowRight /></Link></Magnetic>
          </div>
        </div>
      </section>
    </div>
  );
}
