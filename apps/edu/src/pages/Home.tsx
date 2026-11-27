import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, IconClock } from '@viboxs/shared/icons';
import { Magnetic, useSpotlight, useTilt } from '@viboxs/shared/fx';
import Marquee from '@viboxs/shared/marquee';
import { gsap, reducedMotion, useMotion } from '@viboxs/shared/motion';
import { STUDIO_ORIGIN } from '@viboxs/shared/ecosystem';
import DotField from '../components/DotField';
import HeroJourney from '../components/HeroJourney';
import ProgramCard from '../components/ProgramCard';
import NotifyForm from '../components/NotifyForm';
import Status from '../components/Status';
import Accordion from '../components/Accordion';
import Showcase from '../components/Showcase';
import {
  CATALOG_FILLED, FAQ, FEATURED, FORMATS, HOME, PATHS, PROGRAMS, STEPS, TYPE, byDate, bySlug, ctaFor, hrefOf, priceOf, timeOf, whenOf, isDigital,
} from '../lib/data';

export default function Home() {
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref);

  // hero: salinan & panggung bergeser beda kecepatan saat scroll (kedalaman)
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const ctx = gsap.context(() => {
      const st = { trigger: '.e-hero', start: 'top top', end: 'bottom top', scrub: true };
      gsap.to('.e-hero__copy', { yPercent: -12, ease: 'none', scrollTrigger: st });
      gsap.to('.e-hero .jr', { yPercent: 8, ease: 'none', scrollTrigger: st });
      gsap.to('.e-hero .dotfield', { yPercent: 18, opacity: 0.3, ease: 'none', scrollTrigger: st });
    }, el);
    return () => ctx.revert();
  }, []);

  const on = HOME.sections;
  const a = HOME.announcement;
  return (
    <div ref={ref}>
      {a.on && a.text && (
        <div className="announce" role="note">
          <div className="container announce__in">
            <span className="announce__dot" aria-hidden="true" /><span>{a.text}</span>
            {a.link && (/^https?:/.test(a.link)
              ? <a href={a.link} className="announce__link" target="_blank" rel="noopener noreferrer">{a.linkLabel || 'Lihat'} <ArrowRight size={14} /></a>
              : <Link to={a.link} className="announce__link">{a.linkLabel || 'Lihat'} <ArrowRight size={14} /></Link>)}
          </div>
        </div>
      )}
      <Hero />
      {on.marquee && HOME.marquee.length > 0 && <Marquee words={HOME.marquee} />}
      {on.enroll && <Enroll />}
      {on.learner && <Learner />}
      {on.collab && <Collab />}
      {on.opportunity && <Opportunity />}
      {(on.featured || on.schedule || on.paths || on.formats) && (
        <div className="light">
          {on.featured && <Featured />}
          {on.schedule && <Schedule />}
          {on.formats && <Formats />}
        </div>
      )}
      {on.paths && <Paths />}
      {/* Showcase Ranger/OPC (PRD §11): hanya profil PUBLIC_APPROVED dari server; nol profil → tidak dirender. */}
      <Showcase />
      {on.bridges && <Bridges />}
      {on.closing && <Closing />}
    </div>
  );
}

/* ---------------- E02 Hero ---------------- */
function Hero() {
  const h = HOME.hero;
  return (
    <section className="e-hero" aria-labelledby="hero-h">
      <div className="e-hero__bg" aria-hidden="true">
        <div className="e-hero__aurora" />
        <DotField />
        <div className="e-hero__fade" />
      </div>
      <div className="container rel e-hero__grid">
        <div className="e-hero__copy stack-24">
          <span className="e-chip" data-build="Badge · EDU"><span className="e-chip__tag">EDU</span>{h.chip}</span>
          <h1 id="hero-h" className="h1 e-hero__h">{h.title}{h.accent && <> <span className="accent">{h.accent}</span></>}</h1>
          <p className="lead muted maxw-520">{h.lead}</p>
          <div className="row-12" data-build="Tombol · CTA">
            <Magnetic><a href={`${STUDIO_ORIGIN}/daftar`} className="btn btn--primary btn--lg">{h.cta1} <ArrowRight /></a></Magnetic>
            <Magnetic><Link to="/programs" className="btn btn--ghost btn--lg">{h.cta2}</Link></Magnetic>
          </div>
          {h.note && <span className="xs-13 muted">{h.note}</span>}
        </div>
        <HeroJourney />
      </div>
    </section>
  );
}

/* ---------------- E03 Learning paths ---------------- */
const PATH_C = ['var(--v-accent-2)', 'var(--v-accent)', 'var(--v-gold)'];

function PathCard({ p, i }: { p: (typeof PATHS)[number]; i: number }) {
  const tilt = useTilt<HTMLAnchorElement>(3);
  return (
    <Link ref={tilt} to={`/programs?path=${p.id}`} className="path-card" style={{ ['--pc' as string]: PATH_C[i % 3] }} data-build={`Kartu · ${p.name}`}>
      <span className="path-card__n" aria-hidden="true">{p.n}</span>
      <span className="mono xs" style={{ color: PATH_C[i % 3] }}>{p.n} /</span>
      <span className="stack-10"><span className="h3">{p.name}</span><span className="body muted">{p.desc}</span></span>
      <span className="row-8">{p.topics.map((t) => <span key={t} className="tag">{t}</span>)}</span>
      <span className="path-card__foot">Lihat jalur belajar<span className="path-card__arr"><ArrowRight /></span></span>
    </Link>
  );
}

function Paths() {
  return (
    <section className="section section--line">
      <div className="container stack-40">
        <div className="sec-head">
          <div className="sec-head__copy">
            <span className="eyebrow">{HOME.paths.eyebrow}</span>
            <h2 className="h2">{HOME.paths.title}</h2>
          </div>
          <p className="body muted maxw-420">{HOME.paths.desc}</p>
        </div>
        <div className="path-grid">{PATHS.map((p, i) => <PathCard key={p.id} p={p} i={i} />)}</div>
      </div>
    </section>
  );
}

/* ---------------- E04 Featured ---------------- */
function Featured() {
  return (
    <section className="section" id="e04">
      <div className="container stack-40">
        <div className="sec-head">
          <div className="sec-head__copy">
            <span className="eyebrow">{HOME.featured.eyebrow}</span>
            <h2 className="h2">{HOME.featured.title}</h2>
          </div>
          {CATALOG_FILLED && FEATURED.length > 0 && <Link to="/programs" className="btn btn--ink-ghost btn--sm">Semua program <ArrowRight size={14} /></Link>}
        </div>
        {CATALOG_FILLED && FEATURED.length > 0 ? (
          <div className="card-grid card-grid--lg">
            {FEATURED.map((s) => bySlug(s)).filter((p) => !!p).map((p) => <ProgramCard key={p!.slug} p={p!} build />)}
          </div>
        ) : (
          <div className="empty-feature" data-build="Blok · Katalog kosong">
            <div className="stack-16">
              <span className="mono-label ink-muted">PROGRAM SEDANG DISIAPKAN</span>
              <p className="h3-lg">Program berikutnya sedang disiapkan. Kamu tetap bisa bergabung sebagai EDU Learner untuk memulai pemetaan tujuan belajarmu.</p>
              <p className="body ink-muted">Kami tidak menampilkan program sebelum materi, kontributor, jadwal, dan ketentuannya pasti.</p>
              <a href={`${STUDIO_ORIGIN}/daftar`} className="btn btn--ink btn--sm self-start">Gabung EDU Learner ↗</a>
            </div>
            <div className="empty-feature__form stack-12">
              <span className="strong">Beri tahu saya saat program dibuka</span>
              <NotifyForm />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- E05 Format chooser ---------------- */
function Formats() {
  const [tab, setTab] = useState(0);
  const [fade, setFade] = useState(false);
  const f = FORMATS[tab];
  const card = CATALOG_FILLED ? PROGRAMS.find((p) => p.type === f.id && !p.past) : undefined;
  const float = useTilt<HTMLAnchorElement>(5);

  function pick(i: number) {
    if (i === tab) return;
    if (reducedMotion()) { setTab(i); return; }
    setFade(true);
    window.setTimeout(() => { setTab(i); setFade(false); }, 160);
  }
  function onKey(e: KeyboardEvent) {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (tab + d + FORMATS.length) % FORMATS.length;
    pick(n);
    document.getElementById(`tab-${FORMATS[n].id}`)?.focus();
  }

  return (
    <section className="pb-section">
      <div className="container stack-32">
        <div className="sec-head__copy">
          <span className="eyebrow">{HOME.formats.eyebrow}</span>
          <h2 className="h2">{HOME.formats.title}</h2>
        </div>
        <div className="fmt" data-build="Panel · Format belajar">
          <div role="tablist" aria-label="Format belajar" className="fmt__tabs" onKeyDown={onKey} style={{ ['--ti' as string]: tab }}>
            {FORMATS.map((x, i) => (
              <button key={x.id} id={`tab-${x.id}`} type="button" role="tab" aria-selected={i === tab} aria-controls="fmt-panel" tabIndex={i === tab ? 0 : -1} onClick={() => pick(i)} className="fmt__tab">
                <b>{x.name}</b><span>{x.kicker}</span>
              </button>
            ))}
            <span className="fmt__ink" aria-hidden="true" />
          </div>
          <div id="fmt-panel" role="tabpanel" aria-labelledby={`tab-${f.id}`} className={`fmt__panel ${fade ? 'is-fading' : ''}`}>
            <div className="stack-16">
              <span className="h3-lg">{f.name}</span>
              <p className="body-16 ink-muted">{f.desc}</p>
              {!card && <div className="dashed-note">Belum ada {f.name.toLowerCase()} yang terbit. Tombol beli hanya muncul setelah materi, jadwal, dan harganya disetujui.</div>}
            </div>
            <div className="fmt__stage">
              {card ? (
                <Link ref={float} to={hrefOf(card)} className="fmt__card">
                  <span className="row-between"><span className="pcard__type">{TYPE[card.type]}</span><Status code={card.status} size="sm" still /></span>
                  <span className="strong lg-18">{card.title}</span>
                  <span className="small ink-muted">{whenOf(card)} · {timeOf(card)}</span>
                  <span className="row-between fmt__card-foot"><b>{priceOf(card)}</b><span className="pcard__cta">{ctaFor(card)}<ArrowRight size={14} /></span></span>
                </Link>
              ) : (
                <div className="stack-8 center ink-muted"><IconClock size={28} /><span className="strong ink">Belum tersedia</span><span className="small">Tanpa tombol beli sampai detailnya pasti.</span></div>
              )}
            </div>
          </div>
        </div>
        {HOME.formats.note && <span className="xs-13 ink-muted">{HOME.formats.note}</span>}
      </div>
    </section>
  );
}

/* ---------------- E06 Upcoming ---------------- */
function Schedule() {
  const sched = PROGRAMS.filter((p) => !isDigital(p.type) && !p.past && ['OPEN', 'FULL', 'RESCHEDULED', 'ANNOUNCED'].includes(p.status)).sort(byDate).slice(0, 5);
  return (
    <section className="pb-section-xl">
      <div className="container split-2 align-start">
        <div className="stack-16 sched__head">
          <span className="eyebrow">{HOME.schedule.eyebrow}</span>
          <h2 className="h2">{HOME.schedule.title}</h2>
          <p className="body ink-muted">{HOME.schedule.desc}</p>
          <Link to="/events" className="btn btn--ink btn--sm self-start">Lihat semua event <ArrowRight size={14} /></Link>
        </div>
        {CATALOG_FILLED && sched.length > 0 ? (
          <ol className="tl">
            <span className="tl__line" aria-hidden="true" data-draw-line />
            {sched.map((p) => (
              <li key={p.slug} className="tl__item" data-build={`Jadwal · ${p.dShort} ${p.mShort}`}>
                <span className="tl__date"><b>{p.dShort}</b><span>{p.mShort}</span></span>
                <Link to={hrefOf(p, 'events')} className="tl__card">
                  <span className="row-between"><span className="strong">{p.title}</span><Status code={p.status} size="sm" /></span>
                  <span className="small ink-muted">{[whenOf(p), p.time].filter(Boolean).join(' · ')}</span>
                  {p.status === 'RESCHEDULED' && <span className="pcard__resched">Jadwal baru · sebelumnya <s>{p.prevDate}</s></span>}
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <div className="empty-box">
            <span className="h4">Jadwal berikutnya belum diumumkan.</span>
            <span className="body ink-muted">Event hanya tampil setelah topik, kontributor, tanggal, dan platformnya pasti.</span>
            <a href="#e04" className="link-arrow ink">Aktifkan pemberitahuan <ArrowRight size={14} /></a>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- E07 Enrollment ---------------- */
function Step({ t, d, i }: { t: string; d: string; i: number }) {
  const spot = useSpotlight<HTMLLIElement>();
  return (
    <li ref={spot} className="step" data-build={`Langkah · 0${i + 1}`}>
      <span className="step__glow" aria-hidden="true" />
      <span className="step__head"><span className={`step__n ${i === STEPS.length - 1 ? 'is-last' : ''}`}>0{i + 1}</span><span className="step__rule" aria-hidden="true" /></span>
      <span className="step__t">{t}</span>
      <span className="small muted lh">{d}</span>
    </li>
  );
}

function Enroll() {
  return (
    <section className="section">
      <div className="container stack-40">
        <div className="sec-head">
          <div className="sec-head__copy">
            <span className="eyebrow">{HOME.enroll.eyebrow}</span>
            <h2 className="h2">{HOME.enroll.title}</h2>
          </div>
          <p className="body muted maxw-420">{HOME.enroll.desc}</p>
        </div>
        <ol className="steps">{STEPS.map(([t, d], i) => <Step key={t} t={t} d={d} i={i} />)}</ol>
      </div>
    </section>
  );
}

/* ---------------- E07b Kolaborator ---------------- */
function Collab() {
  const c = HOME.collab;
  return (
    <section className="pb-section">
      <div className="container">
        <div className="collab-cta" data-build="Panel · Kolaborator">
          <div className="stack-12">
            <span className="mono xs ls-08 c-acc2">{c.eyebrow.toUpperCase()}</span>
            <span className="h3">{c.title}</span>
            <span className="body muted maxw-620">{c.desc}</span>
          </div>
          <div className="collab-cta__roles" aria-hidden="true"><span className="tag">Trainer</span><span className="tag">Educator</span><span className="tag">Training center</span></div>
          <Magnetic><Link to="/kolaborator" className="btn btn--primary">{c.cta} <ArrowRight size={16} /></Link></Magnetic>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Learner (PRD §15.1/15.2) ---------------- */
function Learner() {
  const c = HOME.learner;
  const BEN = ['Peta belajar personal', 'Riwayat pembelajaran', 'Assessment dan feedback', 'Bintang progres & token reward sesuai ketentuan', 'Akses pengajuan peluang profesional'];
  return (
    <section className="pb-section">
      <div className="container split-2 align-center">
        <div className="stack-16">
          <span className="eyebrow">{c.eyebrow}</span>
          <h2 className="h2">{c.title}</h2>
          <p className="body-17 muted maxw-520">{c.desc}</p>
          <div className="row-12 flex-wrap">
            <Magnetic><a href={`${STUDIO_ORIGIN}/daftar`} className="btn btn--primary">{c.cta} <ArrowRight size={16} /></a></Magnetic>
            <Link to="/edu-learner" className="btn btn--ghost">Pelajari manfaatnya</Link>
          </div>
          <span className="xs-13 muted">Gratis untuk membuat akun. Pendaftaran tidak menjamin diterima bekerja atau menjadi Ranger.</span>
        </div>
        <ul className="benefit-list" data-build="Daftar · Manfaat Learner">
          {BEN.map((b, i) => <li key={b}><span className="mono xs c-acc2">0{i + 1}</span><span className="strong">{b}</span></li>)}
        </ul>
      </div>
    </section>
  );
}

/* ---------------- Jalur kesempatan (tanpa janji) ---------------- */
function Opportunity() {
  const c = HOME.opportunity;
  const LANES: [string, string][] = [
    ['Seleksi Rangers', 'Jalur internal VIBOXS melalui rekam belajar, assessment, wawancara, dan uji proyek.'],
    ['Perusahaan partner', 'Pembelajar yang memilih tersedia dapat ditemukan perusahaan terverifikasi.'],
    ['Membangun bisnis', 'Langkah membangun usaha melalui ekosistem VIBOXS sesuai kesiapan program.'],
  ];
  return (
    <section className="pb-section">
      <div className="container stack-32">
        <div className="sec-head">
          <div className="sec-head__copy"><span className="eyebrow">{c.eyebrow}</span><h2 className="h2">{c.title}</h2></div>
          <p className="body muted maxw-420">{c.desc}</p>
        </div>
        <div className="lane-grid">
          {LANES.map(([t, d]) => <div key={t} className="lane" data-build={`Kartu · ${t}`}><span className="h4">{t}</span><span className="small muted">{d}</span></div>)}
        </div>
        <span className="xs-13 muted">Semua kesempatan bersifat selektif dan tidak dijamin.</span>
      </div>
    </section>
  );
}

/* ---------------- Untuk Perusahaan & Program Tim ---------------- */
function Bridges() {
  const c = HOME.companies;
  return (
    <section className="pb-section">
      <div className="container bridge-grid">
        <div className="bridge bridge--u" data-build="Kartu · Perusahaan">
          <span className="mono xs ls-08 c-acc2">{c.eyebrow.toUpperCase()}</span>
          <span className="h3">{c.title}</span>
          <span className="body muted">{c.desc}</span>
          <Link to="/for-companies" className="btn btn--ghost btn--sm self-start">{c.cta} <ArrowRight size={14} /></Link>
        </div>
        <div className="bridge bridge--s" data-build="Kartu · Program Tim">
          <span className="mono xs ls-08 acc-soft">PROGRAM TIM · SERVICES</span>
          <span className="h3">Ingin program khusus tim atau instansi? Diskusikan kebutuhanmu.</span>
          <span className="body muted">Pelatihan custom untuk organisasi ditangani VIBOXS Services lewat proposal tersendiri.</span>
          <Link to="/for-teams" className="btn btn--ghost btn--sm self-start">Program untuk tim <ArrowRight size={14} /></Link>
        </div>
      </div>
    </section>
  );
}

/* ---------------- E09 Closing ---------------- */
function Closing() {
  return (
    <section className="section section--line">
      <div className="container split-2">
        <div className="stack-20">
          <h2 className="h2 h2--xl">{HOME.closing.title}</h2>
          <p className="body-17 muted maxw-460">{HOME.closing.desc}</p>
          <div className="row-12" data-build="Tombol · CTA akhir">
            <Magnetic><a href={`${STUDIO_ORIGIN}/daftar`} className="btn btn--primary btn--lg">{HOME.closing.cta1}</a></Magnetic>
            <Link to="/programs" className="btn btn--ghost btn--lg">{HOME.closing.cta2}</Link>
          </div>
        </div>
        <div className="stack-8">
          <span className="eyebrow">Pertanyaan umum</span>
          <Accordion items={FAQ.slice(0, 4).map((f) => ({ q: f.q, a: f.a }))} defaultOpen={null} />
          <Link to="/help" className="link-arrow mt-8">Bantuan &amp; semua FAQ <ArrowRight size={14} /></Link>
        </div>
      </div>
    </section>
  );
}

