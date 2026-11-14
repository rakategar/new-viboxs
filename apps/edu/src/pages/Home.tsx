import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, IconClock } from '@viboxs/shared/icons';
import { Magnetic, useSpotlight, useTilt } from '@viboxs/shared/fx';
import Marquee from '@viboxs/shared/marquee';
import { gsap, reducedMotion, useMotion } from '@viboxs/shared/motion';
import EcoLink from '../components/EcoLink';
import DotField from '../components/DotField';
import HeroJourney from '../components/HeroJourney';
import ProgramCard from '../components/ProgramCard';
import NotifyForm from '../components/NotifyForm';
import Status from '../components/Status';
import Accordion from '../components/Accordion';
import {
  CATALOG_FILLED, FAQ, FEATURED, FORMATS, PATHS, PROGRAMS, STEPS, TYPE, byDate, bySlug, ctaFor, hrefOf, priceOf, timeOf, whenOf,
} from '../lib/data';

const MQ = ['Prompting dasar', 'SOP & operasional', 'Distribusi konten', 'Komunikasi tertulis', 'Riset pasar', 'AI untuk dokumen', 'Produktivitas', 'Spreadsheet'];

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

  return (
    <div ref={ref}>
      <Hero />
      <Marquee words={MQ} />
      <Paths />
      <div className="light">
        <Featured />
        <Formats />
        <Schedule />
      </div>
      <Enroll />
      <Bridges />
      <Closing />
    </div>
  );
}

/* ---------------- E02 Hero ---------------- */
function Hero() {
  return (
    <section className="e-hero" aria-labelledby="hero-h">
      <div className="e-hero__bg" aria-hidden="true">
        <div className="e-hero__aurora" />
        <DotField />
        <div className="e-hero__fade" />
      </div>
      <div className="container rel e-hero__grid">
        <div className="e-hero__copy stack-24">
          <span className="e-chip" data-build="Badge · EDU"><span className="e-chip__tag">EDU</span>BELAJAR PRAKTIS · VIBOXS</span>
          <h1 id="hero-h" className="h1 e-hero__h">Belajar keterampilan yang bisa langsung <span className="accent">dipraktikkan.</span></h1>
          <p className="lead muted maxw-520">Jelajahi panduan digital, webinar, dan program praktis dari ekosistem VIBOXS. Lihat format, jadwal, dan ketentuannya sebelum mendaftar.</p>
          <div className="row-12" data-build="Tombol · CTA">
            <Magnetic><Link to="/programs" className="btn btn--primary btn--lg">Jelajahi Program <ArrowRight /></Link></Magnetic>
            <Magnetic><Link to="/events" className="btn btn--ghost btn--lg"><IconClock size={16} />Lihat Jadwal</Link></Magnetic>
          </div>
          <span className="xs-13 muted">Tanpa login untuk membaca program. Harga dan ketentuan tertulis sebelum kamu mendaftar.</span>
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
    <Link ref={tilt} to={`/programs?path=${p.id}`} className="path-card" style={{ ['--pc' as string]: PATH_C[i] }} data-build={`Kartu · ${p.name}`}>
      <span className="path-card__n" aria-hidden="true">{p.n}</span>
      <span className="mono xs" style={{ color: PATH_C[i] }}>{p.n} /</span>
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
            <span className="eyebrow">Jalur belajar</span>
            <h2 className="h2">Mulai dari tujuanmu.</h2>
          </div>
          <p className="body muted maxw-420">Jalur belajar adalah cara memfilter topik — bukan program sertifikasi.</p>
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
            <span className="eyebrow">Program pilihan</span>
            <h2 className="h2">Yang bisa kamu ikuti sekarang.</h2>
          </div>
          {CATALOG_FILLED && <Link to="/programs" className="btn btn--ink-ghost btn--sm">Semua program <ArrowRight size={14} /></Link>}
        </div>
        {CATALOG_FILLED ? (
          <div className="card-grid card-grid--lg">
            {FEATURED.map((s) => { const p = bySlug(s)!; return <ProgramCard key={s} p={p} showPath build />; })}
          </div>
        ) : (
          <div className="empty-feature" data-build="Blok · Katalog kosong">
            <div className="stack-16">
              <span className="mono-label ink-muted">KATALOG SEDANG DISIAPKAN</span>
              <p className="h3-lg">Program pertama EDU sedang disusun — materi, fasilitator, jadwal, dan ketentuannya akan tampil lengkap di sini sebelum pendaftaran dibuka.</p>
              <p className="body ink-muted">Kami tidak menampilkan program sebelum detailnya pasti. Tinggalkan email bila ingin tahu lebih dulu.</p>
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
  const [tab, setTab] = useState(1);
  const [fade, setFade] = useState(false);
  const f = FORMATS[tab];
  const card = bySlug(f.card)!;
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
          <span className="eyebrow">Pilih format</span>
          <h2 className="h2">Cara belajar yang sesuai ritmemu.</h2>
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
              {CATALOG_FILLED ? (
                <>
                  <dl className="spec">{f.spec.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
                  <span className="mono xs ink-muted">Nilai di atas: [contoh]</span>
                </>
              ) : <div className="dashed-note">{f.fallback}</div>}
            </div>
            <div className="fmt__stage">
              {CATALOG_FILLED ? (
                <Link ref={float} to={hrefOf(card)} className="fmt__card">
                  <span className="row-between"><span className="pcard__type">{TYPE[card.type]} · [contoh]</span><Status code={card.status} size="sm" still /></span>
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
        <span className="xs-13 ink-muted">Kursus on-demand belum tersedia dan akan tampil setelah platform belajarnya siap.</span>
      </div>
    </section>
  );
}

/* ---------------- E06 Upcoming ---------------- */
function Schedule() {
  const sched = PROGRAMS.filter((p) => ['OPEN', 'FULL', 'RESCHEDULED'].includes(p.status)).sort(byDate);
  return (
    <section className="pb-section-xl">
      <div className="container split-2 align-start">
        <div className="stack-16 sched__head">
          <span className="eyebrow">Jadwal terdekat</span>
          <h2 className="h2">Sesi yang sudah terkonfirmasi.</h2>
          <p className="body ink-muted">Semua jam dalam WIB. Sesi yang sudah lewat tidak tampil di sini.</p>
          <Link to="/events" className="btn btn--ink btn--sm self-start">Lihat semua event <ArrowRight size={14} /></Link>
        </div>
        {CATALOG_FILLED ? (
          <ol className="tl">
            <span className="tl__line" aria-hidden="true" data-draw-line />
            {sched.map((p) => (
              <li key={p.slug} className="tl__item" data-build={`Jadwal · ${p.dShort} ${p.mShort}`}>
                <span className="tl__date"><b>{p.dShort}</b><span>{p.mShort}</span></span>
                <Link to={hrefOf(p, 'events')} className="tl__card">
                  <span className="row-between"><span className="strong">{p.title}</span><Status code={p.status} size="sm" /></span>
                  <span className="small ink-muted">{whenOf(p)} · {p.time}</span>
                  {p.status === 'RESCHEDULED' && <span className="pcard__resched">Jadwal baru · sebelumnya <s>{p.prevDate}</s></span>}
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <div className="empty-box">
            <span className="h4">Jadwal berikutnya belum diumumkan.</span>
            <span className="body ink-muted">Event hanya tampil setelah topik, fasilitator, tanggal, dan platformnya pasti.</span>
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
      <span className="step__head"><span className={`step__n ${i === 4 ? 'is-last' : ''}`}>0{i + 1}</span><span className="step__rule" aria-hidden="true" /></span>
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
            <span className="eyebrow">Cara pendaftaran</span>
            <h2 className="h2">Lima langkah, tanpa kejutan.</h2>
          </div>
          <p className="body muted maxw-420">Sebelum membayar, kamu tahu apa yang dibeli, apa yang diterima, total biaya, cara akses, dan jalur bantuan.</p>
        </div>
        <ol className="steps">{STEPS.map(([t, d], i) => <Step key={t} t={t} d={d} i={i} />)}</ol>
      </div>
    </section>
  );
}

/* ---------------- E08 Bridges ---------------- */
function Bridges() {
  return (
    <section className="pb-section">
      <div className="container bridge-grid">
        <div className="bridge bridge--u" data-build="Kartu · Universe">
          <span className="mono xs ls-08 c-acc2">UNIVERSE · KOMUNITAS OPC</span>
          <span className="h3">Anggota Universe? Periksa manfaat yang berlaku untuk program ini.</span>
          <span className="body muted">Manfaat anggota ditampilkan di halaman masing-masing program, bila berlaku.</span>
          <EcoLink k="universe" className="btn btn--ghost btn--sm self-start">Jelajahi Universe ↗</EcoLink>
        </div>
        <div className="bridge bridge--s" data-build="Kartu · Services">
          <span className="mono xs ls-08 acc-soft">SERVICES · TRAINING TIM</span>
          <span className="h3">Ingin program khusus tim atau instansi? Diskusikan kebutuhanmu.</span>
          <span className="body muted">Training custom untuk organisasi ditangani VIBOXS Services lewat proposal tersendiri.</span>
          <Link to="/corporate-training" className="btn btn--ghost btn--sm self-start">Training untuk tim <ArrowRight size={14} /></Link>
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
          <h2 className="h2 h2--xl">Siap mulai belajar?</h2>
          <p className="body-17 muted maxw-460">Lihat program yang sedang dibuka, atau tanyakan dulu hal yang belum jelas.</p>
          <div className="row-12" data-build="Tombol · CTA akhir">
            <Magnetic><Link to="/programs" className="btn btn--primary btn--lg">Lihat Program yang Tersedia</Link></Magnetic>
            <Link to="/corporate-training" className="btn btn--ghost btn--lg">Butuh pelatihan untuk tim?</Link>
          </div>
        </div>
        <div className="stack-8">
          <span className="eyebrow">Pertanyaan umum</span>
          <Accordion items={FAQ.slice(0, 3).map((f) => ({ q: f.q, a: f.a }))} defaultOpen={null} />
          <Link to="/help" className="link-arrow mt-8">Bantuan &amp; semua FAQ <ArrowRight size={14} /></Link>
        </div>
      </div>
    </section>
  );
}

