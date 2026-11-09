import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowDown, Check } from '@viboxs/shared/icons';
import { Magnetic, Split, useSpotlight, useTilt } from '@viboxs/shared/fx';
import Marquee from '@viboxs/shared/marquee';
import { gsap, reducedMotion, useMotion } from '@viboxs/shared/motion';
import SignalField from '../components/SignalField';
import HeroDiagram from '../components/HeroDiagram';
import Mockup from '../components/Mockups';
import Accordion from '../components/Accordion';
import EcoLink from '../components/EcoLink';
import { IcBuilding, IcDoc, IcStore, IcUser, catIcon } from '../components/icons';
import { CASE_STUDIES, COMM, FLOW, PROMPT_CHIPS, SVC, SVC_ORDER, matchCat, startHref, svcHref } from '../lib/content';

const MQ = ['Diagnosis', 'Desain lingkup', 'Pembangunan', 'Review & handover', 'Websites', 'Automation', 'Dashboard', 'AI Integration', 'Growth'];

export default function Home() {
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref);

  // Hero: konten naik saat load, lalu memudar/parallax saat scroll
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from('.s-hero__chip, .s-hero__aside > *', { y: 24, autoAlpha: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out', delay: 0.15 });
      gsap.to('.s-hero__copy', {
        yPercent: -18, autoAlpha: 0.2, ease: 'none',
        scrollTrigger: { trigger: '.s-hero', start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.to('.s-hero .signal', {
        yPercent: 20, ease: 'none',
        scrollTrigger: { trigger: '.s-hero', start: 'top top', end: 'bottom top', scrub: true },
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref}>
      <Hero />
      <WhoWeHelp />
      <Solutions />
      <Marquee words={MQ} />
      <WorkingModel />
      <Proof />
      <Commercial />
      <Closing />
    </div>
  );
}

/* ---------------- S02 Hero ---------------- */
function Hero() {
  return (
    <section className="s-hero" aria-labelledby="hero-h">
      <div className="s-hero__bg" aria-hidden="true">
        <div className="s-hero__aurora" />
        <SignalField />
        <div className="s-hero__fade" />
      </div>
      <div className="container rel stack-48">
        <div className="s-hero__top">
          <div className="s-hero__copy stack-24">
            <span className="s-hero__chip"><span className="s-hero__tag">SERVICES</span>SOLUSI BISNIS · BERBASIS PROPOSAL</span>
            <Split as="h1" id="hero-h" className="h1 s-hero__h" text="Bangun sistem yang menjawab kebutuhan bisnis Anda." />
          </div>
          <div className="s-hero__aside stack-24">
            <p className="lead muted">VIBOXS membantu memetakan tantangan, menentukan ruang lingkup, dan membangun website, sistem, otomasi, serta integrasi AI sesuai kebutuhan.</p>
            <div className="row-12">
              <Magnetic><Link to="/start" className="btn btn--primary">Konsultasikan Kebutuhan <ArrowRight /></Link></Magnetic>
              <Magnetic><Link to="/#solutions" className="btn btn--ghost">Jelajahi Layanan <ArrowDown /></Link></Magnetic>
            </div>
            <span className="xs-13 muted">Proyek custom berbasis proposal. Tidak ada paket atau angka “mulai dari”.</span>
          </div>
        </div>
        <div data-anim="up"><HeroDiagram /></div>
      </div>
    </section>
  );
}

/* ---------------- S03 Who we help ---------------- */
const WHO = [
  { k: 'opc', Ic: IcUser, tag: 'INTENT · OPC', t: 'Founder OPC', d: 'Anda menjalankan bisnis sendiri dan butuh sistem yang bekerja tanpa tim besar.', note: true, cta: 'Mulai sebagai founder' },
  { k: 'usaha', Ic: IcStore, tag: 'INTENT · USAHA', t: 'Bisnis yang berkembang', d: 'Proses manual mulai menghambat: follow-up terlewat, laporan disusun ulang setiap minggu, data tersebar di banyak file.', cta: 'Mulai sebagai pemilik bisnis' },
  { k: 'perusahaan', Ic: IcBuilding, tag: 'INTENT · KORPORAT', t: 'Institusi / perusahaan', d: 'Anda membutuhkan SOW, standar keamanan, UAT, dan dokumentasi yang bisa ditinjau procurement.', cta: 'Mulai sebagai organisasi' },
];

function IntentCard({ w, i }: { w: (typeof WHO)[number]; i: number }) {
  const spot = useSpotlight<HTMLAnchorElement>();
  return (
    <Link ref={spot} to={startHref({ org: w.k, from: w.t })} className="intent-card">
      <span className="intent-card__glow" aria-hidden="true" />
      <span className="row-between">
        <span className="icon-tile"><w.Ic size={20} /></span>
        <span className="mono-label">{w.tag}</span>
      </span>
      <span className="stack-10">
        <h3 className="h3">{w.t}</h3>
        <p className="body muted">{w.d}</p>
        {w.note && <p className="xs-13 muted intent-card__note"><strong>OPC</strong> — One Person Company: model bisnis yang dijalankan satu founder dengan dukungan sistem, AI, dan jejaring. Bukan bentuk badan hukum.</p>}
      </span>
      <span className="intent-card__cta">{w.cta}<ArrowRight /></span>
      <span className="intent-card__n mono" aria-hidden="true">0{i + 1}</span>
    </Link>
  );
}

function WhoWeHelp() {
  return (
    <section className="section section--line">
      <div className="container stack-40">
        <div className="sec-head">
          <div className="sec-head__copy">
            <span className="eyebrow" data-anim="up">Untuk siapa</span>
            <Split className="h2" text="Untuk siapa kami bekerja" />
            <p className="body-17 muted" data-anim="up">Pilih yang paling mendekati situasi Anda. Pilihan ini kami bawa ke formulir brief.</p>
          </div>
        </div>
        <div className="intent-grid" data-anim="stagger">
          {WHO.map((w, i) => <IntentCard key={w.k} w={w} i={i} />)}
        </div>
        <p className="small muted" data-anim="up">Founder OPC yang mencari jejaring dan komunitas: <EcoLink k="universe">Kenali Universe ↗</EcoLink></p>
      </div>
    </section>
  );
}

/* ---------------- S04 Core solutions ---------------- */
function SvcCard({ k }: { k: (typeof SVC_ORDER)[number] }) {
  const s = SVC[k];
  const spot = useSpotlight<HTMLElement>();
  const Ic = catIcon[k];
  return (
    <article ref={spot} className={`svc-card svc-card--${k}`}>
      <span className="svc-card__glow" aria-hidden="true" />
      <Mockup k={k} />
      <div className="svc-card__body">
        <div className="row-between">
          <span className="row-10"><span className="svc-card__ic"><Ic size={18} /></span><span className="mono xs muted">{s.n}</span></span>
          <code className="xxs muted">/services/{s.slug}</code>
        </div>
        <h3 className="h3">{s.name}</h3>
        <dl className="svc-card__dl">
          <div><dt>Untuk</dt><dd>{s.who}</dd></div>
          <div><dt>Tantangan</dt><dd>{s.problem}</dd></div>
        </dl>
        <ul className="chips" aria-label="Contoh output">{s.chips.map((c) => <li key={c}>{c}</li>)}</ul>
        <div className="row-12 svc-card__ctas">
          <Link to={startHref({ kategori: k, from: s.name })} className="btn btn--light btn--sm">Mulai dengan layanan ini</Link>
          <Link to={svcHref(k)} className="link-arrow">Lihat detail <ArrowRight /></Link>
        </div>
      </div>
    </article>
  );
}

function Solutions() {
  return (
    <section id="solutions" className="section section--line">
      <div className="container stack-48">
        <div className="sec-head">
          <div className="sec-head__copy">
            <span className="eyebrow" data-anim="up">Solutions</span>
            <Split className="h2" text="Lima layanan inti, satu cara kerja." />
            <p className="body-17 muted" data-anim="up">Setiap layanan dimulai dari diagnosis dan diakhiri dengan serah terima. Teknologi adalah instrumen, bukan janji hasil.</p>
          </div>
        </div>

        <div className="tiers" data-anim="stagger">
          <div className="tier">
            <span className="mono-label">01 · DIAGNOSE</span>
            <b className="h4">Strategic Advisory</b>
            <span className="small muted lh">Diagnosis bisnis, opportunity mapping, roadmap, serta arah produk dan AI.</span>
            <Link to="/advisory" className="link-arrow">Diskusikan tantangan <ArrowRight /></Link>
          </div>
          <div className="tier tier--main">
            <span className="tier__border" aria-hidden="true" />
            <span className="mono-label accent">02 · BUILD</span>
            <b className="h4">Lima layanan inti</b>
            <span className="small muted lh">Website, aplikasi, dashboard, automation, integrasi AI, growth systems, dan infrastruktur.</span>
            <span className="small strong row-8">Kirim brief atau minta proposal di bawah <ArrowDown /></span>
          </div>
          <div className="tier">
            <span className="mono-label">03 · ONGOING</span>
            <b className="h4">Iterasi &amp; dukungan</b>
            <span className="small muted lh">Iterasi, maintenance, dan growth support; kerja sama strategis secara selektif.</span>
            <Link to={startHref({ jenis: 'support', from: 'Iterasi & dukungan' })} className="link-arrow">Bahas kelanjutan <ArrowRight /></Link>
          </div>
        </div>

        <div className="svc-grid" data-anim="stagger">
          {SVC_ORDER.map((k) => <SvcCard key={k} k={k} />)}
        </div>

        <div className="support-row" data-anim="up">
          <span className="eyebrow">Kapabilitas pendukung</span>
          <Link to="/advisory">Strategic Advisory</Link>
          <Link to="/capabilities">Academy &amp; Corporate Training</Link>
          <Link to="/capabilities">Digital Infrastructure</Link>
        </div>
      </div>
    </section>
  );
}

/* ---------------- S05 Working model ---------------- */
function WorkingModel() {
  const [cur, setCur] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const f = FLOW[cur];
  const onKey = (e: KeyboardEvent) => {
    let n = cur;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (cur + 1) % FLOW.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (cur - 1 + FLOW.length) % FLOW.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = FLOW.length - 1;
    else return;
    e.preventDefault(); setCur(n); tabs.current[n]?.focus();
  };
  return (
    <section className="section--xl light wm" aria-labelledby="wm-h">
      <div className="container stack-40">
        <div className="sec-head">
          <div className="sec-head__copy">
            <span className="eyebrow ink-muted" data-anim="up">Cara kerja</span>
            <Split id="wm-h" className="h2" text="Dari brief sampai serah terima, dalam tujuh tahap." />
            <p className="body-17 ink-muted" data-anim="up">Development tidak otomatis dimulai dari inquiry. Setiap tahap punya output yang bisa Anda periksa.</p>
          </div>
          <Link to="/process" className="btn btn--ink-ghost btn--sm" data-anim="up">Lihat proses lengkap <ArrowRight /></Link>
        </div>

        <div className="wm__wide" data-anim="up">
          <div className="wm__rail" aria-hidden="true"><span style={{ transform: `scaleX(${cur / (FLOW.length - 1)})` }} /></div>
          <div role="tablist" aria-label="Tahap kerja" className="wm__tabs" onKeyDown={onKey}>
            {FLOW.map((t, i) => (
              <button
                key={t.t}
                ref={(el) => { tabs.current[i] = el; }}
                role="tab"
                id={`wm-tab-${i}`}
                aria-selected={i === cur}
                aria-controls="wm-panel"
                tabIndex={i === cur ? 0 : -1}
                onClick={() => setCur(i)}
                className={`wm__tab ${i === cur ? 'is-on' : ''} ${i < cur ? 'is-past' : ''} ${t.gate ? 'is-gate' : ''}`}
              >
                <span className="wm__n">{i < cur ? <Check size={14} /> : i + 1}</span>
                <span className="wm__t">{t.t}</span>
                {t.gate && <span className="wm__gate">Gate</span>}
              </button>
            ))}
          </div>
          <div role="tabpanel" id="wm-panel" aria-labelledby={`wm-tab-${cur}`} className="wm__panel" key={cur}>
            <div className="stack-20 wm__copy">
              <span className="mono-label ink-muted">TAHAP {cur + 1} DARI 7</span>
              <h3 className="h3-lg">{f.t}</h3>
              <div className="stack-6"><span className="eyebrow ink-muted">Aktivitas</span><p className="body-16">{f.act}</p></div>
              <div className={`wm__out ${f.gate ? 'is-gate' : ''}`}><span className="eyebrow ink-muted">Output / gate</span><p className="body-16 strong">{f.out}</p></div>
            </div>
            <div className="stack-8">
              <div className="doc">
                <div className="doc__bar"><i /><i /><i /><span className="mono">{f.file}</span></div>
                <div className="doc__body mono">
                  {f.doc.map((l, i) => (
                    <span key={i} style={{ ['--i' as string]: i }} className={l.startsWith('#') ? 'doc__h' : l.startsWith('→') ? 'doc__go' : ''}>
                      <em>{String(i + 1).padStart(2, '0')}</em>{l}
                    </span>
                  ))}
                  <span className="doc__caret" style={{ ['--i' as string]: f.doc.length }} />
                </div>
              </div>
              <span className="xs ink-muted">Contoh struktur dokumen — bukan dokumen klien.</span>
            </div>
          </div>
        </div>

        <ol className="wm__narrow">
          {FLOW.map((t, i) => (
            <li key={t.t} className={t.gate ? 'is-gate' : ''}>
              <span className="wm__n">{i + 1}</span>
              <span className="stack-4"><b>{t.t}</b><span className="small ink-muted">{t.out}</span></span>
            </li>
          ))}
        </ol>
        <p className="small ink-muted">Setiap engagement menyesuaikan kontrak.</p>
      </div>
    </section>
  );
}

/* ---------------- S06 Selected proof ---------------- */
function Proof() {
  return (
    <section className="section">
      <div className="container stack-40">
        <div className="sec-head">
          <div className="sec-head__copy">
            <span className="eyebrow" data-anim="up">Bukti kerja</span>
            <Split className="h2" text="Yang bisa Anda periksa sebelum memutuskan." />
          </div>
        </div>
        {CASE_STUDIES.length === 0 ? (
          <div className="proof">
            <div className="proof__empty" data-anim="up">
              <span className="icon-tile icon-tile--round"><IcDoc size={22} /></span>
              <b className="h4">Belum ada studi kasus yang kami publikasikan.</b>
              <p className="body muted">Kasus hanya tampil setelah disetujui klien. Sementara itu, lihat cara kami menyusun kebutuhan dan menyiapkan serah terima pekerjaan.</p>
              <Link to="/process" className="link-arrow">Lihat proses kerja <ArrowRight /></Link>
            </div>
            <div className="proof__pack">
              <span className="mono-label">ISI PAKET SERAH TERIMA · CONTOH STRUKTUR</span>
              <ul className="pack" data-anim="stagger">
                {[['Ringkasan kebutuhan', 'Hasil discovery'], ['Proposal & SOW', 'Lingkup, biaya, jadwal'], ['Daftar UAT', 'Kriteria penerimaan'], ['Dokumentasi teknis', 'Struktur & akses'], ['Dokumen serah terima', 'Akses & dukungan']].map(([t, d], i) => (
                  <li key={t}>
                    <span className="pack__ic"><IcDoc size={16} /></span>
                    <span className="stack-2"><b>{t}</b><span className="xs-13 muted">{d}</span></span>
                    <span className="pack__n mono">{String(i + 1).padStart(2, '0')}</span>
                  </li>
                ))}
              </ul>
              <span className="xs muted">Isi akhir menyesuaikan SOW tiap proyek.</span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ---------------- S07 Commercial clarity ---------------- */
function Commercial() {
  return (
    <section className="section--xl light">
      <div className="container split-2 align-start">
        <div className="stack-24">
          <span className="eyebrow ink-muted" data-anim="up">Kejelasan komersial</span>
          <Split className="h2" text="Tanpa paket harga. Semua tertulis di proposal." />
          <p className="body-17 ink-muted" data-anim="up">Setiap proyek memiliki kebutuhan dan ruang lingkup yang berbeda. Setelah kami memahami kebutuhan Anda, kami menyiapkan penjelasan solusi, estimasi biaya, dan ketentuan kerja dalam proposal.</p>
          <figure className="photo photo--light" data-anim="clip">
            <img data-parallax="30" src="/assets/photo-diskusi.jpeg" alt="Tim berdiskusi di depan papan berisi grafik" loading="lazy" />
            <figcaption>Foto stok · ilustrasi</figcaption>
          </figure>
        </div>
        <div className="stack-20" data-anim="up">
          <Accordion tone="light" items={COMM.map((c) => ({ q: c.q, a: c.a }))} />
          <div className="trust">
            <span className="trust__ic"><Check size={16} /></span>
            <span className="stack-4"><strong>Catatan kepercayaan</strong><span className="small ink-muted">Ruang lingkup, biaya, jadwal, dan dukungan ditentukan dalam proposal yang disepakati.</span></span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- S08 Closing ---------------- */
function Closing() {
  const [v, setV] = useState('');
  const nav = useNavigate();
  const spot = useSpotlight<HTMLDivElement>();
  const tilt = useTilt<HTMLFormElement>(2);
  const go = (e?: FormEvent) => {
    e?.preventDefault();
    const t = v.trim();
    const k = matchCat(t);
    nav(startHref({ hasil: t || undefined, kategori: k || undefined, from: t ? 'Pertanyaan di beranda' : undefined }));
  };
  return (
    <section className="section--xl">
      <div className="container">
        <div ref={spot} className="closing">
          <svg className="closing__rings" viewBox="0 0 1100 1100" aria-hidden="true">
            <g className="spin-slow"><circle cx="550" cy="550" r="300" fill="none" stroke="rgba(246,247,255,.08)" strokeDasharray="2 10" /></g>
            <g className="spin-rev"><circle cx="550" cy="550" r="420" fill="none" stroke="rgba(246,247,255,.06)" /><circle cx="970" cy="550" r="5" fill="#FF4A26" /></g>
            <g className="spin-slow"><circle cx="550" cy="550" r="530" fill="none" stroke="rgba(246,247,255,.05)" strokeDasharray="1 14" /><circle cx="550" cy="20" r="4" fill="#8FA6FF" /></g>
          </svg>
          <div className="closing__glow" />
          <div className="closing__spot" />
          <div className="rel stack-12 center-head">
            <label htmlFor="closing-q" className="closing__h h2">Apa yang sedang Anda coba bangun atau perbaiki?</label>
            <p className="body-16 muted maxw-560">Tulis singkat. Kami bawa ke formulir Start a Mission — Anda bisa melengkapinya di sana.</p>
          </div>
          <form ref={tilt} className="prompt" onSubmit={go}>
            <div className="prompt__box">
              <textarea
                id="closing-q"
                rows={2}
                value={v}
                onChange={(e) => setV(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } }}
                placeholder="Contoh: kami ingin booking cabang tidak lagi lewat chat satu per satu"
              />
              <div className="row-between">
                <span className="xs muted">Tanpa komitmen biaya · Enter untuk lanjut</span>
                <button type="submit" className="prompt__go" aria-label="Lanjut ke Start a Mission"><ArrowRight size={18} /></button>
              </div>
            </div>
            <div role="group" aria-label="Contoh kebutuhan" className="prompt__chips">
              {PROMPT_CHIPS.map((c) => (
                <button type="button" key={c} onClick={() => { setV(c); document.getElementById('closing-q')?.focus(); }}>{c}</button>
              ))}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
