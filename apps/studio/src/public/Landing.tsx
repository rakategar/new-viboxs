import { useEffect, useRef, useState, type PointerEvent as RPointer } from 'react';
import { Link } from 'react-router-dom';
import { CONTACT, ORIGIN, SITES, SITE_ORDER, isPending, siteUrl } from '@viboxs/shared/ecosystem';
import { useAuth } from '../lib/auth';
import { I } from '../ui/kit';
import { FEATURES, INVARIANTS, SCROLL_FLOW_A, SCROLL_FLOW_B, SECURITY, SHOWCASE, SOON, TILES } from './landing/content';
import { RevealText, reduced, useInView, useReveal } from './landing/motion';
import Nav, { Roll } from './landing/Nav';
import { PixelIcon, PixelTrail } from './landing/Pixel';
import RoleLens from './landing/RoleLens';
import Workflow from './landing/Workflow';

/** studio.viboxs.com — landing publik. Bahasa visual sendiri: terang, dot-grid, node-graph. */
export default function Landing() {
  const ref = useRef<HTMLDivElement>(null);
  const { session } = useAuth();
  useReveal(ref);
  return (
    <div ref={ref} className="nx">
      <Nav signedIn={!!session} />
      <main id="main">
        <Hero signedIn={!!session} />
        <EcoStrip />
        <Showcase />
        <Pills />
        <Breathing />
        <Scrolly />
        <Firewall />
        <Security />
        <Soon />
        <Cta signedIn={!!session} />
      </main>
      <Footer />
    </div>
  );
}

const Brk = () => <span className="brk" aria-hidden="true"><i /><i /><i /><i /></span>;
const Tag = ({ children }: { children: string[] }) => <span className="nx-tag">{children.map((c) => <span key={c}>{c}</span>)}</span>;

/* ---------------- hero ---------------- */
function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="nx-hero" id="alur">
      <div className="nx-hero__dots dots-light" aria-hidden="true" />
      <div className="nx-wrap nx-hero__in">
        <Tag>{['Studio', 'Ruang kerja privat']}</Tag>
        <RevealText as="h1" className="nx-h1" text={'Satu ruang kerja.\nIzin terpisah per peran.'} />
        <p className="nx-lead" data-rv>Backstage ekosistem VIBOXS — tempat Commander, Rangers, kontributor EDU, Learner, dan mitra bisnis bekerja dalam satu identitas, dengan hak akses yang dijaga di server.</p>
        <div className="nx-row nx-hero__cta" data-rv>
          <Link to={signedIn ? '/workspace' : '/login'} className="nx-btn nx-btn--pink"><Roll>{signedIn ? 'Buka workspace' : 'Masuk Studio'}</Roll></Link>
          <Link to="/daftar" className="nx-btn nx-btn--gray"><Roll>Daftar sebagai Learner</Roll></Link>
        </div>
      </div>
      <div className="nx-wrap nx-hero__canvas" data-rv>
        <RoleLens />
        <p className="nx-cap">Ilustrasi — misi contoh tanpa data nyata. Pilih peran untuk melihat apa yang disaring server.</p>
      </div>
    </section>
  );
}

function EcoStrip() {
  return (
    <section className="nx-eco" aria-label="Terhubung dengan ekosistem VIBOXS">
      <p className="nx-cap">Terhubung dengan ekosistem VIBOXS</p>
      <ul className="nx-eco__row" data-rv>
        {SITE_ORDER.map((k) => (
          <li key={k}><a href={siteUrl(k)}><b>{SITES[k].domain}</b><small>{isPending(k) ? 'Sedang disiapkan' : SITES[k].role}</small></a></li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------- use-case showcase (kartu gelap, tab auto-rotate) ---------------- */
function Showcase() {
  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);
  const [box, seen] = useInView<HTMLDivElement>(0.3, false);
  useEffect(() => {
    if (hold || !seen || reduced()) return;
    const t = window.setTimeout(() => setI((x) => (x + 1) % SHOWCASE.length), 6500);
    return () => window.clearTimeout(t);
  }, [i, hold, seen]);
  useEffect(() => {
    const on = (e: Event) => { const k = (e as CustomEvent<string>).detail; const n = SHOWCASE.findIndex((s) => s.k === (k === 'partner' ? 'opc' : k)); if (n >= 0) setI(n); };
    window.addEventListener('nx-role', on);
    return () => window.removeEventListener('nx-role', on);
  }, []);
  const s = SHOWCASE[i];
  return (
    <section className="nx-sec" id="peran">
      <div className="nx-wrap">
        <div ref={box} className="nx-show dots-dark" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)} onFocus={() => setHold(true)} onBlur={() => setHold(false)}>
          <div className="nx-show__tabs" role="tablist" aria-label="Peran">
            {SHOWCASE.map((x, n) => (
              <button key={x.k} type="button" role="tab" aria-selected={n === i} className={`nx-tab ${n === i ? 'is-on' : ''} ${hold ? 'is-hold' : ''}`} onClick={() => setI(n)}>
                {n === i && <Brk />}{x.tab}{n === i && seen && !reduced() && <span className="nx-tab__bar" key={i} />}
              </button>
            ))}
          </div>
          <div className="nx-show__body">
            <div className="nx-show__copy" key={s.k}>
              <div className="nx-show__pix"><PixelIcon name={s.pix} cell={10} accent /></div>
              <h3>{s.h}</h3>
              <p>{s.d}</p>
              <Link to={s.cta[0]} className="nx-ulink">{s.cta[1]}<I.arrow size={16} /></Link>
            </div>
            <div className="nx-show__flow" key={`f-${s.k}`}>
              <Workflow flow={s.flow} theme="dark" label={`Ilustrasi alur kerja ${s.tab}`} minW={640} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pills() {
  const P: [keyof typeof I, string, string][] = [
    ['users', '6 peran', 'dalam satu identitas'],
    ['key', 'Akses profesional', 'hanya lewat undangan'],
    ['book', 'Program EDU', 'tidak pernah tayang otomatis'],
  ];
  return (
    <section className="nx-pills nx-wrap" aria-label="Aturan inti">
      {P.map(([ic, b, s], n) => {
        const Ico = I[ic];
        return <div key={b} className="nx-pill-card" data-rv style={{ ['--i' as string]: n }}><span className="nx-pill-card__ico"><Ico size={20} /></span><span><b>{b}</b> {s}</span><i className="cross cross--tl" /><i className="cross cross--br" /></div>;
      })}
    </section>
  );
}

/* ---------------- section ikon "bernapas" ---------------- */
const SLOTS: [number, number][] = [[6, 12], [18, 4], [30, 14], [70, 10], [82, 3], [93, 16], [4, 38], [14, 56], [3, 78], [16, 90], [30, 84], [90, 42], [80, 60], [95, 74], [84, 90], [70, 86], [44, 4], [56, 94], [24, 30], [76, 32], [26, 70], [74, 72]];
function Breathing() {
  const [box, seen] = useInView<HTMLDivElement>(0.2, false);
  const [map, setMap] = useState<(number | null)[]>(() => TILES.map((_, i) => (i < 11 ? i * 2 : null)));
  useEffect(() => {
    if (!seen || reduced()) return;
    const t = window.setInterval(() => setMap((m) => {
      const next = [...m];
      const on = next.map((v, i) => (v != null ? i : -1)).filter((i) => i >= 0);
      const off = next.map((v, i) => (v == null ? i : -1)).filter((i) => i >= 0);
      if (on.length) next[on[Math.floor(Math.random() * on.length)]] = null;
      const used = new Set(next.filter((v) => v != null));
      const free = SLOTS.map((_, i) => i).filter((i) => !used.has(i));
      if (off.length && free.length) next[off[Math.floor(Math.random() * off.length)]] = free[Math.floor(Math.random() * free.length)];
      return next;
    }), 900);
    return () => window.clearInterval(t);
  }, [seen]);
  const par = (e: RPointer<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--px', `${(e.clientX - r.left) / r.width - 0.5}`);
    e.currentTarget.style.setProperty('--py', `${(e.clientY - r.top) / r.height - 0.5}`);
  };
  const last = useRef<(number | null)[]>(map);
  map.forEach((v, i) => { if (v != null) last.current[i] = v; });
  return (
    <section className="nx-breath" ref={box} onPointerMove={par}>
      <div className="nx-breath__tiles" aria-hidden="true">
        {TILES.map((t, i) => {
          const slot = map[i] ?? last.current[i] ?? 0; const Ico = I[t.icon];
          return <span key={t.label} className={`nx-tile ${map[i] != null ? 'is-on' : ''}`} style={{ left: `${SLOTS[slot][0]}%`, top: `${SLOTS[slot][1]}%`, ['--z' as string]: (i % 3) + 1 }} title={t.label}><Ico size={24} /></span>;
        })}
      </div>
      <div className="nx-breath__copy">
        <RevealText className="nx-h2" text={'Satu backstage untuk\nempat pintu VIBOXS.'} />
        <p className="nx-sub" data-rv>Permintaan “Start a Mission” dari Services dan lamaran kolaborator dari EDU otomatis masuk ke inbox Commander. Setiap data tetap di jalurnya sendiri.</p>
        <div className="nx-row nx-center" data-rv>
          <a href={`${ORIGIN.services}/start`} className="nx-btn nx-btn--gray"><Roll>Start a Mission</Roll></a>
          <a href={`${ORIGIN.edu}/kolaborator`} className="nx-btn nx-btn--gray"><Roll>Jadi kontributor EDU</Roll></a>
        </div>
      </div>
    </section>
  );
}

/* ---------------- scrollytelling fitur ---------------- */
function Scrolly() {
  const sec = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 961px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 961px)');
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  useEffect(() => {
    if (!wide) return;
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = sec.current; if (!el) return;
        const r = el.getBoundingClientRect();
        const p = Math.min(0.999, Math.max(0, -r.top / (r.height - window.innerHeight)));
        setStep(Math.floor(p * FEATURES.length));
      });
    };
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => { window.removeEventListener('scroll', on); cancelAnimationFrame(raf); };
  }, [wide]);

  const head = (
    <div className="nx-scr__head">
      <RevealText className="nx-h2" text={'Lihat, pahami, dan\npercayai setiap langkah.'} />
      <p className="nx-sub" data-rv>Studio tidak menjalankan keputusan penting secara diam-diam. Setiap langkah punya pemilik, versi, dan jejak.</p>
    </div>
  );
  if (!wide) {
    return (
      <section className="nx-sec nx-scr is-stack">
        <div className="nx-wrap">
          {head}
          {FEATURES.map((f, n) => (
            <div key={f.t} className="nx-scr__item" data-rv>
              <div className="nx-scr__vis dots-dark"><Visual n={n} /></div>
              <h3>{f.t}</h3><p>{f.d}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }
  return (
    <section ref={sec} className="nx-scr" style={{ height: `${FEATURES.length * 85 + 40}vh` }}>
      <div className="nx-scr__sticky">
        <div className="nx-wrap nx-scr__grid">
          <div>
            {head}
            <ol className="nx-feats">
              {FEATURES.map((f, n) => (
                <li key={f.t} className={n === step ? 'is-on' : ''}>
                  <b><span className="nx-feats__n">0{n + 1}</span>{f.t}</b>
                  <div className="nx-feats__d"><p>{f.d}</p></div>
                </li>
              ))}
            </ol>
          </div>
          <div className="nx-scr__vis dots-dark">
            {FEATURES.map((f, n) => <div key={f.t} className={`nx-scr__frame ${n === step ? 'is-on' : ''}`} aria-hidden={n !== step}><Visual n={n} /></div>)}
          </div>
        </div>
      </div>
    </section>
  );
}

function Visual({ n }: { n: number }) {
  if (n === 0) return <Workflow flow={SCROLL_FLOW_A} theme="dark" focus={['l', 'c', 'b', 'p', 'r']} label="Ilustrasi: brief tersanitasi sebelum sampai ke Ranger" minW={520} />;
  if (n === 1) return <Workflow flow={SCROLL_FLOW_B} theme="dark" focus={['d', 'q', 'v', 'n']} label="Ilustrasi: persetujuan manusia sebelum payable" minW={520} />;
  if (n === 2) {
    return (
      <div className="nx-mock" role="img" aria-label="Ilustrasi riwayat versi deliverable">
        <div className="nx-mock__tabs"><span className="is-on">Versi</span><span>Timeline</span><em>Aksi ▾</em></div>
        <ul>
          <li><b>v3</b><span>Revisi diminta · lingkup: halaman checkout</span><small>Menunggu</small></li>
          <li className="is-pub"><b>v2</b><span>Diterima Commander · QC lulus</span><small><i />Diterima</small></li>
          <li><b>v1</b><span>Kiriman pertama</span><small>Revisi</small></li>
        </ul>
        <p className="nx-mock__cap">Ilustrasi — bukan data nyata</p>
      </div>
    );
  }
  return (
    <div className="nx-note-wrap" role="img" aria-label="Ilustrasi jejak audit">
      <div className="nx-note">
        <span className="nx-label">Catatan</span>
        <p>Setiap pergantian peran dan keputusan tercatat dengan <b>siapa</b>, <b>sebagai apa</b>, dan <b>kapan</b>.</p>
      </div>
      <ul className="nx-log">
        <li><code>switch_role</code><span>Commander → Ranger</span></li>
        <li><code>update</code><span>payable · disetujui</span></li>
        <li><code>insert</code><span>deliverable · v2</span></li>
      </ul>
      <p className="nx-mock__cap">Ilustrasi — bukan data nyata</p>
    </div>
  );
}

/* ---------------- business firewall ---------------- */
function Firewall() {
  return (
    <section className="nx-sec" id="keamanan">
      <div className="nx-wrap nx-fw">
        <div className="nx-fw__vis dots-dark" data-rv>
          <div className="nx-fw__col"><span className="nx-label">VIBOXS Missions</span><ul><li>Brief tersanitasi</li><li>Fee milik sendiri</li><li>Thread privat</li></ul></div>
          <div className="nx-fw__wall" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ ['--i' as string]: i }} />)}<span className="nx-fw__pkt" /><span className="nx-fw__x">403</span></div>
          <div className="nx-fw__col"><span className="nx-label">VIBOXS Connect</span><ul><li>Profil bisnis</li><li>Permintaan</li><li>Workspace</li></ul></div>
        </div>
        <div className="nx-fw__copy dots-light">
          <RevealText className="nx-h2" text={'Bergerak cepat,\ntanpa membocorkan apa pun.'} />
          <div className="nx-fw__card" data-rv>
            <p>Missions dan Connect tidak pernah berbagi payload. Firewall bisnis dijaga di database, bukan sekadar disembunyikan di menu.</p>
            <ul>
              <li><b>Harga klien & margin</b> hanya terbaca oleh Commander.</li>
              <li><b>Peran Ranger</b> tidak lolos ke Connect — lewat URL langsung sekalipun.</li>
              <li><b>Honor Ranger lain</b> tidak pernah terlihat oleh sesama Ranger.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Security() {
  return (
    <section className="nx-sec nx-secu">
      <div className="nx-wrap">
        <div className="nx-secu__head">
          <RevealText className="nx-h2" text="Keamanan dibangun di server, bukan di menu." />
          <p className="nx-sub" data-rv>Setiap izin, keputusan, dan perpindahan peran diperiksa ulang di backend pada setiap permintaan.</p>
          <div className="nx-row nx-center" data-rv>
            <Link to="/login" className="nx-btn nx-btn--pink"><Roll>Masuk Studio</Roll></Link>
            <a href={`mailto:${CONTACT.email}?subject=${encodeURIComponent('Pertanyaan VIBOXS Studio')}`} className="nx-btn nx-btn--gray"><Roll>Hubungi admin</Roll></a>
          </div>
        </div>
        <div className="nx-secu__grid">
          {SECURITY.map((s, n) => (
            <article key={s.t} className="nx-secu__card" data-rv style={{ ['--i' as string]: n }}>
              <div className="nx-secu__pix dots-dark"><PixelIcon name={s.pix} cell={9} /></div>
              <b>{s.t}</b><p>{s.d}</p>
            </article>
          ))}
        </div>
        <ul className="nx-inv" aria-label="Status yang selalu jujur" data-rv>
          {INVARIANTS.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>
    </section>
  );
}

/* ---------------- coming soon (carousel geser + jalan pelan) ---------------- */
function Soon() {
  const track = useRef<HTMLDivElement>(null);
  const st = useRef({ hold: false, drag: false, x: 0, left: 0 });
  useEffect(() => {
    const el = track.current!;
    if (reduced()) return;
    let raf = 0; let vis = false;
    const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; });
    io.observe(el);
    const tick = () => {
      if (vis && !st.current.hold && !st.current.drag) {
        el.scrollLeft += 0.4;
        if (el.scrollLeft >= el.scrollWidth / 2) el.scrollLeft -= el.scrollWidth / 2;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, []);
  const down = (e: RPointer<HTMLDivElement>) => { if (e.pointerType !== 'mouse') return; st.current = { ...st.current, drag: true, x: e.clientX, left: e.currentTarget.scrollLeft }; e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e: RPointer<HTMLDivElement>) => { if (st.current.drag) e.currentTarget.scrollLeft = st.current.left - (e.clientX - st.current.x); };
  const up = () => { st.current.drag = false; };
  return (
    <section className="nx-sec nx-soon" id="segera">
      <div className="nx-wrap nx-soon__head">
        <div><Tag>{['Coming soon', 'Belum aktif']}</Tag><RevealText className="nx-h2" text="Direncanakan, belum berjalan." /></div>
        <p className="nx-sub" data-rv>Ditampilkan sebagai informasi. Tidak ada transaksi, token, komisi, atau janji yang berjalan di balik kartu ini.</p>
      </div>
      <div ref={track} className="nx-soon__track" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onMouseEnter={() => { st.current.hold = true; }} onMouseLeave={() => { st.current.hold = false; up(); }} tabIndex={0} aria-label="Fitur yang akan datang (geser)">
        {[0, 1].map((k) => SOON.map((s, n) => (
          <article key={`${k}${s.t}`} className={`nx-soon__card nx-soon__card--${n % 3}`} aria-hidden={k === 1}>
            <span className="nx-label">Segera</span><b>{s.t}</b><p>{s.d}</p>
          </article>
        )))}
      </div>
    </section>
  );
}

function Cta({ signedIn }: { signedIn: boolean }) {
  const paths: [string, string, string, boolean][] = [
    [signedIn ? '/workspace' : '/login', 'Masuk Studio', 'Commander · Ranger · Contributor · Partner', true],
    [`${ORIGIN.edu}/kolaborator`, 'Jadi kontributor EDU', 'Lamar di edu.viboxs.com', false],
    [`${ORIGIN.services}/start`, 'Butuh solusi bisnis', 'Start a Mission di Services', false],
    [`${ORIGIN.corporate}/contact`, 'Ranger / partner', 'Hubungi lewat viboxs.com', false],
  ];
  return (
    <section className="nx-sec">
      <div className="nx-wrap nx-cta">
        <div className="nx-cta__l dots-light">
          <RevealText className="nx-h2" text={'Sudah diundang?\nMasuk dengan email undangan Anda.'} />
          <div className="nx-row nx-center" data-rv>
            <Link to={signedIn ? '/workspace' : '/login'} className="nx-btn nx-btn--pink"><Roll>{signedIn ? 'Buka workspace' : 'Mulai masuk'}</Roll></Link>
          </div>
        </div>
        <div className="nx-cta__r dots-dark" data-rv>
          <span className="nx-label">Pilih jalur Anda</span>
          {paths.map(([h, b, s, internal]) => internal
            ? <Link key={b} to={h} className="nx-path"><span><b>{b}</b><small>{s}</small></span><I.arrow size={18} /></Link>
            : <a key={b} href={h} className="nx-path"><span><b>{b}</b><small>{s}</small></span><I.arrow size={18} /></a>)}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="nx-foot">
      <div className="nx-foot__top">
        <div className="nx-foot__brand">
          <img src="/assets/viboxs-wordmark-white.png" alt="VIBOXS" />
          <span className="nx-brand__tag">STUDIO</span>
          <p>VIBOXS adalah unit AI Venture Studio di bawah PT Ekosistem Pelosok Hub. Studio adalah aplikasi operasional privat — bukan etalase publik.</p>
        </div>
        <nav className="nx-foot__cols" aria-label="Footer">
          <div><span className="nx-label">Ekosistem</span>{SITE_ORDER.map((k) => <a key={k} href={siteUrl(k)}>{SITES[k].name}{isPending(k) && <em>Segera</em>}</a>)}</div>
          <div><span className="nx-label">Studio</span><Link to="/login">Masuk</Link><Link to="/daftar">Daftar Learner</Link><Link to="/reset">Lupa password</Link></div>
          <div><span className="nx-label">Kontak</span><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a><a href={CONTACT.instagramUrl} target="_blank" rel="noopener noreferrer">@{CONTACT.instagram}</a><a href={`${ORIGIN.edu}/kolaborator`}>Kolaborator EDU</a></div>
        </nav>
      </div>
      <PixelTrail />
      <div className="nx-foot__bot">
        <span>Privat · tidak diindeks mesin pencari</span>
        <span>Akses profesional hanya lewat undangan</span>
        <span>© {new Date().getFullYear()} PT Ekosistem Pelosok Hub</span>
      </div>
    </footer>
  );
}
