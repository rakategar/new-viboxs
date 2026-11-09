import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import HandsCanvas from '../components/HandsCanvas';
import RouteFinder from '../components/RouteFinder';
import Marquee from '../components/Marquee';
import DestLink from '../components/DestLink';
import { Magnetic, Split, useSpotlight } from '../components/fx';
import { ArrowDown, ArrowRight, Check, IconFlow } from '../components/Icons';
import { DEST, type DestKey, STEPS, isPending } from '../lib/content';
import { EASE, ScrollTrigger, gsap, reducedMotion, useMotion } from '../lib/motion';

function Badge({ k }: { k: DestKey }) {
  return isPending(k)
    ? <span className="badge badge--pending">◷ Sedang disiapkan</span>
    : <span className="badge badge--ok"><i />Tersedia</span>;
}

function EcoCard({ k, visual, light }: { k: DestKey; visual: React.ReactNode; light?: boolean }) {
  const d = DEST[k];
  const ref = useSpotlight<HTMLAnchorElement>();
  const pend = isPending(k);
  return (
    <DestLink k={k} ref={ref} className={`eco-card ${pend ? 'is-pending' : ''}`}>
      <div className={`eco-card__vis ${light ? 'is-light' : ''}`}>{visual}</div>
      <div className="eco-card__body">
        <div className="row-between"><code className="mono xs muted">{d.domain}</code><Badge k={k} /></div>
        <h3 className="h3">{d.name}</h3>
        <p className="body muted">{d.desc}</p>
        <span className="eco-card__cta">{pend ? 'Lihat status' : d.cta}<ArrowRight size={16} /></span>
      </div>
      <span className="eco-card__glow" aria-hidden="true" />
    </DestLink>
  );
}

function StepsTabs() {
  const [tab, setTab] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const pillRef = useRef<HTMLSpanElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const b = refs.current[tab], pill = pillRef.current, list = listRef.current;
    if (!b || !pill || !list) return;
    const place = () => {
      const lr = list.getBoundingClientRect(), br = b.getBoundingClientRect();
      pill.style.width = br.width + 'px'; pill.style.height = br.height + 'px';
      pill.style.transform = `translate(${br.left - lr.left}px, ${br.top - lr.top}px)`;
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [tab]);

  const onKey = (e: KeyboardEvent) => {
    const n = STEPS.length; let i = tab;
    if (e.key === 'ArrowRight') i = (i + 1) % n; else if (e.key === 'ArrowLeft') i = (i - 1 + n) % n;
    else if (e.key === 'Home') i = 0; else if (e.key === 'End') i = n - 1; else return;
    e.preventDefault(); setTab(i); refs.current[i]?.focus();
  };
  const step = STEPS[tab];
  return (
    <>
      <div ref={listRef} role="tablist" aria-label="Tahap kerja" className="tabs" onKeyDown={onKey} data-anim="up">
        <span ref={pillRef} className="tabs__pill" aria-hidden="true" />
        {STEPS.map((t, i) => (
          <button key={t.label} role="tab" id={`tab-${i}`} ref={(el) => { refs.current[i] = el; }} aria-selected={tab === i}
            aria-controls="step-panel" tabIndex={tab === i ? 0 : -1} className={`tab ${tab === i ? 'is-sel' : ''}`} onClick={() => setTab(i)}>
            <span className="tab__n mono">0{i + 1}</span>{t.label}
          </button>
        ))}
      </div>
      <div id="step-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="steps-panel" data-anim="up">
        <div className="steps-panel__copy" key={'c' + tab}>
          <code className="mono xs">TAHAP {tab + 1} DARI 4</code>
          <h3 className="h3-lg">{step.title}</h3>
          <p>{step.body}</p>
          <div className="steps-panel__dots" aria-hidden="true">{STEPS.map((_, i) => <i key={i} className={i <= tab ? 'on' : ''} />)}</div>
        </div>
        <div className="win">
          <div className="win__bar"><i className="dot-accent" /><i /><i /><span className="mono xs muted">{step.file}</span></div>
          <div className="win__body" key={'b' + tab}>
            {tab === 0 && (
              <div className="kv">
                {[['konteks', '[Sektor: kategori industri] · [ukuran tim]'], ['masalah', '[Masalah operasional yang dirasakan]'], ['proses_saat_ini', '[Cara kerja sekarang & alat yang dipakai]'], ['batasan', '[Waktu · anggaran · akses data]'], ['ukuran_berhasil', '[Disepakati bersama di awal]']].map(([a, b], i) => (
                  <div key={a} className="kv__row" style={{ ['--i' as string]: i }}><code className="mono xs muted">{a}</code><span>{b}</span></div>
                ))}
              </div>
            )}
            {tab === 1 && (
              <div className="stack-16">
                <div className="flow3">
                  <span style={{ ['--i' as string]: 0 }}><code className="mono xxs muted">input</code>[Data masuk]</span>
                  <i aria-hidden="true">→</i>
                  <span className="is-acc" style={{ ['--i' as string]: 1 }}><code className="mono xxs muted">proses</code>[Alur baru]</span>
                  <i aria-hidden="true">→</i>
                  <span style={{ ['--i' as string]: 2 }}><code className="mono xxs muted">output</code>[Hasil dipakai]</span>
                </div>
                <div className="stack-8 small">
                  <div className="opt is-sel" style={{ ['--i' as string]: 3 }}><span><b>Opsi A · [pendekatan ringan]</b><span className="muted xs-13">Cakupan terbatas, lebih cepat diuji</span></span><span className="opt__tag">✓ Dipilih bersama</span></div>
                  <div className="opt" style={{ ['--i' as string]: 4 }}><span><b>Opsi B · [pendekatan menyeluruh]</b><span className="muted xs-13">Cakupan luas, butuh data lebih banyak</span></span></div>
                </div>
              </div>
            )}
            {tab === 2 && (
              <div className="checklist mono">
                <div style={{ ['--i' as string]: 0 }}><span className="ok">✓ prototipe alur utama</span><span className="muted">selesai</span></div>
                <div style={{ ['--i' as string]: 1 }}><span className="ok">✓ uji dengan data contoh</span><span className="muted">selesai</span></div>
                <div style={{ ['--i' as string]: 2 }}><span>◌ uji bersama pengguna internal</span><span className="warn">berjalan</span></div>
                <div style={{ ['--i' as string]: 3 }}><span className="muted">○ dokumentasi &amp; serah terima</span><span className="muted">berikutnya</span></div>
                <div className="checklist__bar" style={{ ['--i' as string]: 4 }}><span className="muted xs">2 dari 4 butir selesai</span><span className="bar"><span /></span></div>
              </div>
            )}
            {tab === 3 && (
              <ol className="timeline">
                {[['Pendampingan pemakaian awal', 'Tim Anda memakai solusi bersama kami'], ['Kumpulkan masukan pengguna', 'Catatan kendala dari pemakaian nyata'], ['Perbaikan berkala', 'Prioritas disepakati bersama'], ['Evaluasi bersama', 'Lanjut, ubah, atau cukup — Anda yang memutuskan']].map(([a, b], i) => (
                  <li key={a} style={{ ['--i' as string]: i }} className={i === 0 ? 'is-now' : i === 1 ? 'is-next' : ''}><span className="tl__dot" /><span className="stack-2"><b>{a}</b><span className="muted xs-13">{b}</span></span></li>
                ))}
              </ol>
            )}
          </div>
          <div className="win__foot xs muted">[contoh struktur] · ilustrasi proses, bukan SLA</div>
        </div>
      </div>
    </>
  );
}

export default function Home() {
  const root = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const svcRef = useRef<HTMLDivElement>(null);
  const [svcIn, setSvcIn] = useState(false);
  const closingRef = useSpotlight<HTMLDivElement>();

  useMotion(root);

  // Hero intro (≤ 900ms, non-blocking) + parallax hero saat scroll
  useLayoutEffect(() => {
    if (reducedMotion() || !heroRef.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: EASE } });
      tl.from('.hero .chip-eyebrow', { y: 14, autoAlpha: 0, duration: 0.5 })
        .from('.hero h1 .w > span', { yPercent: 110, rotate: 3, duration: 0.85, ease: 'power4.out', stagger: 0.04 }, 0.08)
        .from('.hero .hero__sub', { y: 18, autoAlpha: 0, duration: 0.6 }, 0.35)
        .from('.hero .hero__ctas > *', { y: 16, autoAlpha: 0, duration: 0.55, stagger: 0.07 }, 0.45)
        .from('.hero .hero__cue', { autoAlpha: 0, duration: 0.6 }, 0.9);

      gsap.to('.hero__content', {
        yPercent: -18, autoAlpha: 0.15, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.to('.hero .hud-layer', {
        autoAlpha: 0, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: '45% top', scrub: true },
      });
      gsap.to('.hero__aurora', {
        yPercent: 30, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
      });

      // Stage naik sedikit menutupi hero
      gsap.from('.stage-wrap', {
        y: 80, scale: 0.96, autoAlpha: 0, ease: 'none',
        scrollTrigger: { trigger: '.stage-wrap', start: 'top bottom', end: 'top 55%', scrub: 0.6 },
      });

      // H04: garis alur ter-scrub + node menyala
      const flow = document.querySelector('.flowline');
      if (flow) {
        ScrollTrigger.create({
          trigger: '.flow-sec', start: 'top 70%', end: 'center 45%', scrub: 0.5,
          onUpdate: (st) => {
            const p = st.progress;
            (flow.querySelector('.flowline__fill') as HTMLElement).style.transform = `scaleX(${p})`;
            flow.querySelectorAll('.flowline__node').forEach((n, i) => n.classList.toggle('is-on', p >= i * 0.5 - 0.001));
          },
        });
      }

      // H07: panel terang "naik" dan melebar
      gsap.fromTo('.rise', { scale: 0.93, borderRadius: 40 }, {
        scale: 1, borderRadius: 0, ease: 'none',
        scrollTrigger: { trigger: '.rise', start: 'top bottom', end: 'top 30%', scrub: true },
      });
      gsap.utils.toArray<HTMLElement>('.org-line').forEach((l) => {
        gsap.from(l, { scaleY: 0, transformOrigin: 'top', duration: 0.6, ease: EASE, scrollTrigger: { trigger: l, start: 'top 85%', once: true } });
      });
    }, heroRef.current.parentElement!);
    return () => ctx.revert();
  }, []);

  // Terminal Services mengetik saat terlihat
  useEffect(() => {
    if (reducedMotion()) { setSvcIn(true); return; }
    const el = svcRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { setSvcIn(true); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const scrollToEco = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById('ecosystem');
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64, behavior: reducedMotion() ? 'auto' : 'smooth' });
  };

  return (
    <div ref={root}>
      {/* H02 — Hero */}
      <section ref={heroRef} className="hero" aria-labelledby="hero-title">
        <div className="hero__aurora" aria-hidden="true"><i className="a1" /><i className="a2" /><i className="a3" /></div>
        <div className="hero__grid" aria-hidden="true" />
        <HandsCanvas className="hero__hands" />
        <div className="hero__content container">
          <span className="chip-eyebrow"><span className="chip-eyebrow__dots"><i /><i /><i /></span>VIBOXS / AI VENTURE STUDIO</span>
          <Split as="h1" id="hero-title" className="h1" text="Membangun bisnis di era AI, tak harus sendirian." />
          <p className="hero__sub lead muted">VIBOXS mengembangkan ekosistem bagi individu dan bisnis untuk belajar, berkolaborasi, dan membangun solusi digital di era AI.</p>
          <div className="hero__ctas">
            <Magnetic><a href="#ecosystem" onClick={scrollToEco} className="btn btn--primary">Jelajahi ekosistem<ArrowDown size={16} /></a></Magnetic>
            <Magnetic><Link to="/about" className="btn btn--ghost">Kenali VIBOXS</Link></Magnetic>
          </div>
        </div>
        <div className="hero__cue" aria-hidden="true"><span>Gulir</span><i /></div>
        <span className="hero__caption mono xxs" aria-hidden="true">ILUSTRASI KONSEPTUAL · AI &amp; MANUSIA</span>
      </section>

      {/* Pemandu jalur + peta ekosistem */}
      <section className="stage-sec" aria-label="Pemandu jalur dan peta ekosistem">
        <div className="container stage-wrap">
          <RouteFinder />
        </div>
      </section>

      <Marquee />

      {/* H03 — Tiga pintu */}
      <section id="ecosystem" className="section">
        <div className="container stack-40">
          <div className="sec-head">
            <div className="sec-head__copy">
              <span className="eyebrow" data-anim="up">Ekosistem</span>
              <Split className="h2" text="Tiga jalur. Satu ekosistem." />
              <p className="lead-sm muted" data-anim="up">Pilih yang relevan untuk langkah Anda.</p>
            </div>
            <Link to="/ecosystem" className="link-arrow" data-anim="up">Lihat peta lengkap<ArrowRight size={16} /></Link>
          </div>
          <div className="eco-grid" data-anim="stagger">
            <EcoCard k="universe" visual={
              <>
                <span className="mono-label vis-label">OPC · ONE PERSON COMPANY</span>
                <svg viewBox="0 0 320 200" fill="none" aria-hidden="true" className="opc-svg">
                  <g className="spin-slow" style={{ transformOrigin: '160px 100px' }}><circle cx="160" cy="100" r="70" stroke="rgba(246,247,255,.2)" strokeDasharray="2 5" /></g>
                  <circle r="3" fill="var(--v-accent-2)"><animateMotion dur="9s" repeatCount="indefinite" path="M160 30 A70 70 0 1 1 159.9 30" /></circle>
                  <circle r="2.5" fill="var(--v-accent)"><animateMotion dur="13s" begin="-4s" repeatCount="indefinite" path="M160 30 A70 70 0 1 1 159.9 30" /></circle>
                  <path d="M160 72 L160 42 M184 114 L200 123 M136 114 L120 123" stroke="rgba(246,247,255,.34)" className="opc-links" />
                  <circle cx="160" cy="100" r="28" fill="var(--v-bg)" stroke="var(--v-accent)" strokeWidth="1.5" className="opc-core" />
                  <circle cx="160" cy="93" r="6" stroke="var(--v-text)" strokeWidth="1.75" />
                  <path d="M149 113c2-6 6.5-9 11-9s9 3 11 9" stroke="var(--v-text)" strokeWidth="1.75" strokeLinecap="round" />
                  <g className="opc-pill"><rect x="130" y="18" width="60" height="24" rx="12" fill="var(--v-surface-2)" stroke="rgba(246,247,255,.26)" /><text x="160" y="34" className="svg-txt">Sistem</text></g>
                  <g className="opc-pill"><rect x="198" y="123" width="44" height="24" rx="12" fill="var(--v-surface-2)" stroke="rgba(246,247,255,.26)" /><text x="220" y="139" className="svg-txt">AI</text></g>
                  <g className="opc-pill"><rect x="64" y="123" width="68" height="24" rx="12" fill="var(--v-surface-2)" stroke="rgba(246,247,255,.26)" /><text x="98" y="139" className="svg-txt">Jejaring</text></g>
                </svg>
                <span className="vis-cap">Satu founder, didukung sistem, AI, dan jejaring</span>
              </>
            } />
            <EcoCard k="edu" light visual={
              <div className="edu-steps">
                <span className="mono-label ink-muted">CONTOH STRUKTUR PROGRAM</span>
                <div className="edu-step"><span className="edu-step__n">1</span><span className="edu-step__t"><b>Dasar kerja dengan AI</b><span>Konsep + latihan</span></span><span className="edu-ok">✓ Selesai</span></div>
                <div className="edu-step is-now"><span className="edu-step__n">2</span><span className="edu-step__t"><b>Menyusun alur kerja</b><span>Studi kasus terpandu</span></span><span className="edu-now">● Berjalan</span><span className="edu-prog" aria-hidden="true" /></div>
                <div className="edu-step is-next"><span className="edu-step__n">3</span><span className="edu-step__t"><b>Praktik pada satu proses</b><span>Proyek mandiri</span></span><span className="edu-next">○ Berikutnya</span></div>
              </div>
            } />
            <EcoCard k="services" visual={
              <div ref={svcRef} className={`term ${svcIn ? 'is-in' : ''}`}>
                <div className="term__win">
                  <div className="win__bar"><i className="dot-accent" /><i /><i /><span className="mono xxs muted">brief/ringkasan-kebutuhan</span></div>
                  <div className="term__body mono">
                    <div className="c-acc2" style={{ ['--i' as string]: 0 }}>❯ kebutuhan: rapikan laporan mingguan</div>
                    <div className="ok" style={{ ['--i' as string]: 1 }}>✓ pahami kebutuhan</div>
                    <div className="ok" style={{ ['--i' as string]: 2 }}>✓ rancang alur</div>
                    <div className="row-between" style={{ ['--i' as string]: 3 }}><span>◌ bangun &amp; uji</span><span className="warn">[berjalan]</span></div>
                    <div className="muted" style={{ ['--i' as string]: 4 }}>○ dukung<span className="caret" /></div>
                  </div>
                </div>
                <span className="mono xxs muted term__tag">[contoh struktur]</span>
              </div>
            } />
          </div>
        </div>
      </section>

      {/* H04 — Cara kerja ekosistem */}
      <section className="section section--line flow-sec">
        <div className="container stack-40">
          <div className="sec-head">
            <div className="sec-head__copy">
              <span className="eyebrow" data-anim="up">Cara kerja ekosistem</span>
              <Split className="h2" text="Belajar. Terhubung. Membangun." />
              <p className="lead-sm muted" data-anim="up">Kerangka sederhana untuk membaca ekosistem — bukan urutan wajib. Masuk dari pintu mana pun yang paling relevan.</p>
            </div>
            <Link to="/ecosystem" className="link-arrow" data-anim="up">Lihat struktur ekosistem<ArrowRight size={16} /></Link>
          </div>
          <div className="stack-16">
            <div className="flowline" aria-hidden="true">
              <div className="flowline__base" />
              <div className="flowline__fill" />
              <span className="flowline__node" style={{ left: '0%' }}><i /></span>
              <span className="flowline__node" style={{ left: '50%' }}><i /></span>
              <span className="flowline__node" style={{ left: '100%' }}><i /></span>
            </div>
            <div className="photo-grid">
              {[
                { img: 'photo-belajar.jpeg', alt: 'Seseorang mengikuti sesi daring di depan monitor', t: 'Belajar', where: 'di EDU', d: 'Program dan sesi untuk meningkatkan kemampuan bekerja dengan AI.' },
                { img: 'photo-terhubung.jpeg', alt: 'Beberapa profesional berjabat tangan di ruang rapat', t: 'Terhubung', where: 'di Universe', d: 'Jejaring One Person Company untuk saling berbagi dan bertumbuh.' },
                { img: 'photo-membangun.jpeg', alt: 'Dua orang meninjau kode di layar komputer', t: 'Membangun', where: 'bersama Services', d: 'Pendampingan profesional untuk merancang dan membangun solusi digital.' },
              ].map((p, i) => (
                <article key={p.t} className="photo-card">
                  <div className="photo-card__frame" data-anim="clip">
                    <img data-parallax="22" src={`/assets/${p.img}`} alt={p.alt} loading="lazy" />
                    <div className="photo-card__shade" />
                    <span className="photo-card__stock">Foto stok · ilustrasi</span>
                    <span className="photo-card__n mono">0{i + 1}</span>
                    <span className="photo-card__t">{p.t}</span>
                  </div>
                  <div className="stack-6 pad-x-4" data-anim="up"><code className="mono xs muted">{p.where}</code><p className="body muted">{p.d}</p></div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* H05 — Cara kami bekerja */}
      <section className="section section--line">
        <div className="container stack-32">
          <div className="center-head">
            <span className="icon-tile" data-anim="up"><IconFlow size={22} /></span>
            <Split className="h2" text="Cara kami bekerja" />
            <p className="lead-sm muted maxw-620" data-anim="up">Belum ada studi kasus yang kami publikasikan, jadi kami tunjukkan prosesnya. Ilustrasi alur kerja — bukan SLA atau jaminan hasil.</p>
          </div>
          <StepsTabs />
        </div>
      </section>

      {/* H07 — Identitas */}
      <section className="rise-wrap">
        <div className="rise light">
          <div className="container identity">
            <div className="stack-24">
              <span className="eyebrow ink-muted" data-anim="up">Identitas &amp; tata kelola</span>
              <Split className="h2 h2--tight" text="VIBOXS adalah unit AI Venture Studio di bawah PT Ekosistem Pelosok Hub." />
              <ul className="checks" data-anim="stagger">
                <li><Check size={20} />Berangkat dari kebutuhan nyata, bukan dari tren teknologi.</li>
                <li><Check size={20} />Status program dan ketersediaan disampaikan apa adanya.</li>
                <li><Check size={20} />Satu identitas, tiga jalur yang saling terhubung.</li>
              </ul>
              <div className="row-16" data-anim="up">
                <Magnetic><Link to="/about" className="btn btn--ink">Tentang VIBOXS<ArrowRight size={16} /></Link></Magnetic>
                <span className="xs-13 ink-muted">Redaksi identitas legal menunggu verifikasi.</span>
              </div>
            </div>
            <div className="org" role="img" aria-label="Struktur: PT Ekosistem Pelosok Hub menaungi VIBOXS, AI Venture Studio, yang memiliki tiga jalur: Universe, EDU, dan Services." data-anim="up">
              <div className="org__box"><code className="mono xxs ink-muted">ENTITAS HUKUM</code><b>PT Ekosistem Pelosok Hub</b></div>
              <span className="org-line org__v" />
              <div className="org__ink"><img src="/assets/viboxs-wordmark-white.png" alt="VIBOXS" height={14} /><span>AI Venture Studio</span></div>
              <div className="org__fork" aria-hidden="true">
                <span className="org-line" style={{ left: '50%', top: 0, height: 14 }} />
                <span className="org__h" />
                <span className="org-line" style={{ left: '16.67%', top: 14, height: 14 }} />
                <span className="org-line" style={{ left: '50%', top: 14, height: 14 }} />
                <span className="org-line" style={{ left: '83.33%', top: 14, height: 14 }} />
              </div>
              <div className="org__kids">
                <div><b>Universe</b><span>Komunitas OPC</span></div>
                <div><b>EDU</b><span>Pembelajaran</span></div>
                <div><b>Services</b><span>Solusi bisnis</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* H08 — Closing */}
      <section className="section section--xl">
        <div className="container">
          <div ref={closingRef} className="closing">
            <svg aria-hidden="true" viewBox="0 0 1000 1000" fill="none" className="closing__rings">
              <circle cx="500" cy="500" r="180" stroke="rgba(246,247,255,.07)" />
              <g className="spin-rev" style={{ transformOrigin: '500px 500px' }}><circle cx="500" cy="500" r="300" stroke="rgba(246,247,255,.06)" strokeDasharray="2 7" /></g>
              <circle cx="500" cy="500" r="420" stroke="rgba(246,247,255,.05)" />
              <g className="spin-slow" style={{ transformOrigin: '500px 500px' }}><circle cx="500" cy="500" r="420" stroke="rgba(246,247,255,.12)" strokeWidth="6" strokeDasharray="1 43" /></g>
              <circle r="4" fill="var(--v-accent)"><animateMotion dur="16s" repeatCount="indefinite" path="M500 200 A300 300 0 1 1 499.9 200" /></circle>
              <circle r="3" fill="var(--v-accent-2)"><animateMotion dur="24s" begin="-8s" repeatCount="indefinite" path="M500 80 A420 420 0 1 1 499.9 80" /></circle>
            </svg>
            <div className="closing__glow" aria-hidden="true" />
            <div className="closing__spot" aria-hidden="true" />
            <Split className="h2 closing__h" text="Sedang membangun bisnis, mencari pembelajaran, atau membutuhkan solusi digital?" />
            <div className="row-12 center" data-anim="up">
              <Magnetic><DestLink k="universe" className="btn btn--primary">Jelajahi Universe</DestLink></Magnetic>
              <Magnetic><DestLink k="edu" className="btn btn--light">Lihat EDU</DestLink></Magnetic>
              <Magnetic><DestLink k="services" className="btn btn--ghost btn--onbg">Diskusikan kebutuhan</DestLink></Magnetic>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
