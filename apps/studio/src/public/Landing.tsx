import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AgentSwarm from '@viboxs/shared/swarm';
import Cursor from '@viboxs/shared/cursor';
import { Split, useSpotlight } from '@viboxs/shared/fx';
import { reducedMotion, useMotion } from '@viboxs/shared/motion';
import { ORIGIN, SITES, SITE_ORDER, siteUrl, isPending, CONTACT } from '@viboxs/shared/ecosystem';
import { ArrowRight, Chevron, Close, Grid, Menu } from '@viboxs/shared/icons';
import { useAuth } from '../lib/auth';
import EcoOrbit from './EcoOrbit';

const FLOW = [
  { k: 'Lead', s: 'service.viboxs.com', d: 'Permintaan klien tersimpan di Services, lalu muncul di inbox Commander.' },
  { k: 'Mission', s: 'Commander', d: 'Commander menyusun brief yang sudah disanitasi — tanpa kontak & harga klien.' },
  { k: 'Offer & bid', s: 'Ranger terpilih', d: 'Hanya Ranger yang ditargetkan melihat penawaran. Tawaran tiap Ranger privat.' },
  { k: 'Kontrak', s: 'Per misi', d: 'Fee disepakati, perjanjian diterima sebelum pekerjaan dimulai.' },
  { k: 'Deliverable', s: 'Versi', d: 'Setiap kiriman jadi versi baru. Revisi tertaut ke versi dan lingkupnya.' },
  { k: 'Payable', s: 'Approval', d: 'Diterima ≠ dibayar. Honor disetujui, lalu transfer dicatat dengan bukti.' },
];

const ROLES = [
  { n: '01', t: 'Commander', d: 'Control Center: aplikasi, undangan, lead, misi, review EDU, payout, audit.', a: ['Undang & cabut akses', 'Lihat harga klien vs fee', 'Approve program & payout'], tag: 'Founder' },
  { n: '02', t: 'Ranger', d: 'Workspace proyek: penawaran yang ditujukan untuk Anda, kontrak, deliverable, honor pribadi.', a: ['Bid & negosiasi', 'Submit & revisi berversi', 'Honor milik sendiri saja'], tag: 'Undangan' },
  { n: '03', t: 'EDU Contributor', d: 'Susun webinar, workshop, atau e-book — kirim untuk review sebelum tayang di EDU.', a: ['Draft program', 'Review Commander', 'Status tayang dari EDU'], tag: 'Undangan' },
  { n: '04', t: 'EDU Learner', d: 'Asesmen awal, rekomendasi dari katalog EDU yang benar-benar tayang, Early Points.', a: ['Daftar sendiri, gratis', 'Rekomendasi beralasan', 'Poin belum bisa ditukar'], tag: 'Self-register' },
  { n: '05', t: 'OPC Founder', d: 'Profil usaha, produk showcase, dan VIBOXS Connect untuk menemukan mitra bisnis.', a: ['Profil opt-in', 'Produk ke antrean Universe', 'Permintaan kolaborasi'], tag: 'Undangan' },
  { n: '06', t: 'Business Partner', d: 'Kolaborasi B2B antar bisnis terverifikasi — tanpa ACC rutin Commander.', a: ['Workspace dua pihak', 'Kontrak antar pihak', 'Approval hanya bila VIBOXS terlibat'], tag: 'Undangan' },
];

const TRUTH = ['draft ≠ tayang', 'diajukan ≠ disetujui', 'klik ≠ pembelian', 'tawaran ≠ fee', 'diterima ≠ dibayar', 'minat ≠ membership', 'poin ≠ rupiah'];

const SOON = [
  ['Professional AI Tools', 'PRD Builder, Design System Builder, AI Quality Inspector.'],
  ['Dede AI Advisor', 'Panduan metodologi founder dengan knowledge base terkurasi.'],
  ['Affiliate EDU', 'Tautan referral lintas peran — belum ada komisi aktif.'],
  ['Penukaran poin', 'Early Points tercatat, aturan tukar menunggu persetujuan.'],
  ['Investor Network', 'Visi eksplorasi — bukan janji pendanaan atau akses investor.'],
];

export default function Landing() {
  const ref = useRef<HTMLDivElement>(null);
  const { session } = useAuth();
  useLayoutEffect(() => {
    if (!reducedMotion()) document.documentElement.classList.add('agents-on');
    return () => document.documentElement.classList.remove('agents-on');
  }, []);
  useMotion(ref, []);

  return (
    <div ref={ref} className="ld">
      <LandingHeader signedIn={!!session} />
      <main id="main">
        <section className="ld-hero">
          <div className="ld-hero__glow" aria-hidden="true" />
          <div className="container ld-hero__grid">
            <div className="ld-hero__copy">
              <span className="eyebrow ld-eyebrow"><i aria-hidden="true" />VIBOXS · Studio — ruang kerja privat</span>
              <h1 className="h1">Backstage dari empat pintu VIBOXS.</h1>
              <p className="lead muted maxw-560">Tempat Commander, Rangers, kontributor EDU, Learner, dan mitra bisnis bekerja — dalam satu identitas, dengan izin yang terpisah per peran dan dijaga di server.</p>
              <div className="row-12 ld-hero__cta" data-build="CTA">
                <Link to={session ? '/workspace' : '/login'} className="btn btn--primary">{session ? 'Buka workspace' : 'Masuk Studio'}<ArrowRight /></Link>
                <Link to="/daftar" className="btn btn--ghost">Daftar sebagai EDU Learner</Link>
              </div>
              <p className="xs muted ld-hero__note" data-build="Catatan akses">Akses profesional hanya melalui undangan Commander — tidak ada pendaftaran Ranger/Trainer/OPC di sini.</p>
            </div>
            <div className="ld-hero__viz" data-build="Peta ekosistem"><EcoOrbit /></div>
          </div>
        </section>

        <section className="section section--line" id="alur">
          <div className="container stack-40">
            <div className="split-2 align-end">
              <div className="stack-16">
                <span className="eyebrow">Alur kerja · lead → honor</span>
                <h2 className="h2">Setiap proyek lewat tangan Commander. Tidak ada yang otomatis diam-diam.</h2>
              </div>
              <p className="body-17 muted maxw-560">Lead dari Services tidak pernah otomatis menjadi misi. Commander mengonversi, menargetkan Ranger, menunjuk pemenang, dan menyetujui pembayaran — setiap langkah tercatat di audit.</p>
            </div>
            <FlowRail />
          </div>
        </section>

        <section className="section section--line" id="peran">
          <div className="container stack-40">
            <div className="stack-16 maxw-720">
              <span className="eyebrow">Satu orang, banyak peran, hak terpisah</span>
              <h2 className="h2">Ganti konteks, izin ikut berganti — di server, bukan cuma di menu.</h2>
            </div>
            <div className="ld-roles" data-anim="stagger">{ROLES.map((r) => <RoleCard key={r.n} {...r} />)}</div>
          </div>
        </section>

        <section className="section section--line" id="firewall">
          <div className="container stack-40">
            <div className="split-2 align-end">
              <div className="stack-16">
                <span className="eyebrow">Business firewall</span>
                <h2 className="h2">Missions dan Connect tidak pernah berbagi payload.</h2>
              </div>
              <p className="body-17 muted maxw-560">Harga klien dan margin disimpan di tabel terpisah yang hanya bisa dibaca Commander. Peran Ranger tidak lolos ke VIBOXS Connect — bahkan lewat URL langsung atau API.</p>
            </div>
            <Firewall />
          </div>
        </section>

        <section className="ld-truth" aria-label="Status yang jujur">
          <div className="ld-truth__track">
            {[0, 1].map((k) => <div key={k} className="ld-truth__row" aria-hidden={k === 1}>{TRUTH.map((t) => <span key={t}>{t}<i /></span>)}</div>)}
          </div>
        </section>

        <section className="section" id="segera">
          <div className="container stack-32">
            <div className="row-between">
              <div className="stack-12"><span className="eyebrow">Coming Soon</span><h2 className="h2-sm">Direncanakan, belum aktif.</h2></div>
              <p className="small muted maxw-460">Ditampilkan sebagai informasi. Tidak ada transaksi, token, komisi, atau janji yang berjalan di balik kartu ini.</p>
            </div>
            <div className="ld-soon" data-anim="stagger">
              {SOON.map(([t, d]) => <div key={t} className="ld-soon__c"><span className="ld-soon__tag">Soon</span><b>{t}</b><p>{d}</p></div>)}
            </div>
          </div>
        </section>

        <section className="section section--line">
          <div className="container ld-cta" data-build="Ajakan">
            <div className="stack-16">
              <Split as="h2" className="h2" text="Sudah diundang? Masuk dengan email undangan Anda." />
              <p className="body-17 muted maxw-560">Ingin bergabung sebagai profesional? Mulai dari situs publik yang sesuai — lamaran Anda masuk ke inbox Commander.</p>
            </div>
            <div className="ld-cta__paths">
              <Link to="/login" className="ld-path ld-path--main"><b>Masuk Studio</b><span>Commander · Ranger · Contributor · Partner</span><ArrowRight /></Link>
              <a href={`${ORIGIN.edu}/kolaborator`} className="ld-path"><b>Jadi kontributor EDU</b><span>Lamar di edu.viboxs.com</span><ArrowRight /></a>
              <a href={`${ORIGIN.services}/start`} className="ld-path"><b>Butuh solusi bisnis</b><span>Start a Mission di Services</span><ArrowRight /></a>
              <a href={`${ORIGIN.corporate}/contact`} className="ld-path"><b>Ranger / partner</b><span>Hubungi lewat viboxs.com</span><ArrowRight /></a>
            </div>
          </div>
        </section>
      </main>
      <footer className="ld-foot">
        <div className="container ld-foot__in">
          <div className="stack-12">
            <span className="st-brand"><img src="/assets/viboxs-wordmark-white.png" alt="VIBOXS" height={16} /><span>STUDIO</span></span>
            <p className="small muted maxw-460">VIBOXS adalah unit AI Venture Studio di bawah PT Ekosistem Pelosok Hub. Studio adalah aplikasi operasional privat — bukan etalase publik.</p>
          </div>
          <nav className="ld-foot__nav" aria-label="Ekosistem">
            {SITE_ORDER.map((k) => <a key={k} href={siteUrl(k)}>{SITES[k].name}<small>{isPending(k) ? 'Sedang disiapkan' : SITES[k].role}</small></a>)}
          </nav>
          <div className="small muted">Kontak: <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> · © {new Date().getFullYear()}</div>
        </div>
      </footer>
      <Cursor />
      <AgentSwarm />
      <div className="grain" aria-hidden="true" />
    </div>
  );
}

function LandingHeader({ signedIn }: { signedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [eco, setEco] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => {
    if (!eco) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setEco(false); btn.current?.focus(); } };
    const off = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.hdr__actions')) setEco(false); };
    document.addEventListener('keydown', esc); document.addEventListener('mousedown', off);
    return () => { document.removeEventListener('keydown', esc); document.removeEventListener('mousedown', off); };
  }, [eco]);
  const links: [string, string][] = [['#alur', 'Alur kerja'], ['#peran', 'Peran'], ['#firewall', 'Firewall'], ['#segera', 'Segera hadir']];
  return (
    <header className={`hdr ${scrolled ? 'is-scrolled' : ''}`}>
      <a href="#main" className="skip">Lewati ke konten</a>
      <div className="container hdr__in">
        <a href={ORIGIN.corporate} className="hdr__brand st-brand" aria-label="VIBOXS — beranda"><img src="/assets/viboxs-wordmark-white.png" alt="VIBOXS" /><span>STUDIO</span></a>
        <nav className="hdr__nav" aria-label="Halaman">{links.map(([h, l]) => <a key={h} href={h} className="hdr__link">{l}</a>)}</nav>
        <div className="hdr__actions">
          <button ref={btn} type="button" className="pill-btn" aria-expanded={eco} aria-haspopup="true" onClick={() => setEco((o) => !o)}><Grid />Ekosistem<Chevron className={`chev ${eco ? 'is-open' : ''}`} /></button>
          {eco && (
            <div className="switcher" role="menu">
              <span className="switcher__label">Jelajahi ekosistem</span>
              {SITE_ORDER.map((k) => (
                <a key={k} role="menuitem" href={siteUrl(k)} className="switcher__item">
                  <span className="switcher__txt"><b>{SITES[k].name}</b><span>{SITES[k].role}</span></span>
                  {isPending(k) && <span className="tag-pending">Sedang disiapkan</span>}
                </a>
              ))}
              <span className="switcher__item is-active"><span className="switcher__txt"><b>Studio</b><span>Ruang kerja privat</span></span><span className="here">● Anda di sini</span></span>
            </div>
          )}
          <Link to={signedIn ? '/workspace' : '/login'} className="btn btn--primary btn--sm">{signedIn ? 'Workspace' : 'Masuk'}</Link>
        </div>
        <button type="button" className="icon-btn hdr__burger" aria-label="Buka menu" aria-expanded={drawer} onClick={() => setDrawer(true)}><Menu /></button>
      </div>
      <div className={`drawer-scrim ${drawer ? 'is-open' : ''}`} onClick={() => setDrawer(false)} aria-hidden="true" />
      <div className={`drawer ${drawer ? 'is-open' : ''}`} hidden={!drawer} role="dialog" aria-modal="true" aria-label="Menu">
        <div className="drawer__top"><img src="/assets/viboxs-wordmark-white.png" alt="VIBOXS" /><button type="button" className="icon-btn" aria-label="Tutup menu" onClick={() => setDrawer(false)}><Close /></button></div>
        <nav className="drawer__nav">{links.map(([h, l], i) => <a key={h} href={h} style={{ ['--i' as string]: i }} onClick={() => setDrawer(false)}>{l}<span /></a>)}</nav>
        <div className="drawer__eco">
          <span className="eyebrow">Jelajahi ekosistem</span>
          {SITE_ORDER.map((k) => <a key={k} href={siteUrl(k)} className="drawer__item"><span><b>{SITES[k].name}</b><span>{isPending(k) ? 'Sedang disiapkan' : SITES[k].role}</span></span><ArrowRight /></a>)}
        </div>
        <div className="drawer__cta stack-8">
          <Link to={signedIn ? '/workspace' : '/login'} className="btn btn--primary btn--block">{signedIn ? 'Buka workspace' : 'Masuk Studio'}</Link>
          <Link to="/daftar" className="btn btn--ghost btn--block">Daftar EDU Learner</Link>
        </div>
      </div>
    </header>
  );
}

function FlowRail() {
  const ref = useRef<HTMLOListElement>(null);
  const [on, setOn] = useState(-1);
  // langkah menyala bergiliran saat terlihat (ilustrasi alur, bukan status data)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion()) { setOn(FLOW.length - 1); return; }
    let t = 0; let i = -1; let vis = false;
    const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; });
    io.observe(el);
    const tick = () => { if (vis) { i = (i + 1) % (FLOW.length + 2); setOn(Math.min(i, FLOW.length - 1)); } t = window.setTimeout(tick, i >= FLOW.length - 1 ? 1600 : 900); };
    t = window.setTimeout(tick, 400);
    return () => { io.disconnect(); window.clearTimeout(t); };
  }, []);
  return (
    <ol ref={ref} className="ld-flow" data-build="Alur misi" style={{ ['--p' as string]: `${(Math.max(on, 0) / (FLOW.length - 1)) * 100}%` }}>
      <span className="ld-flow__line" aria-hidden="true"><span /></span>
      {FLOW.map((f, i) => (
        <li key={f.k} className={i < on ? 'is-done' : i === on ? 'is-now' : ''}>
          <span className="ld-flow__dot" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
          <b>{f.k}</b><small className="mono">{f.s}</small>
          <p>{f.d}</p>
        </li>
      ))}
    </ol>
  );
}

function RoleCard({ n, t, d, a, tag }: (typeof ROLES)[number]) {
  const ref = useSpotlight<HTMLElement>();
  return (
    <article ref={ref} className="ld-role">
      <div className="row-between"><span className="mono-label">{n}</span><span className={`ld-role__tag ${tag === 'Self-register' ? 'is-open' : ''}`}>{tag}</span></div>
      <h3 className="h4">{t}</h3>
      <p className="small muted lh">{d}</p>
      <ul>{a.map((x) => <li key={x}>{x}</li>)}</ul>
    </article>
  );
}

function Firewall() {
  return (
    <div className="ld-fw" data-build="Firewall">
      <div className="ld-fw__side">
        <span className="ld-fw__h"><b>VIBOXS Missions</b><small>Commander ↔ Ranger</small></span>
        <ul>
          <li className="ok">Brief tersanitasi &amp; aset yang diizinkan</li>
          <li className="ok">Fee Ranger milik sendiri</li>
          <li className="ok">Thread privat per Ranger</li>
          <li className="no">Kontak &amp; harga klien</li>
          <li className="no">Margin &amp; honor Ranger lain</li>
        </ul>
      </div>
      <div className="ld-fw__wall" aria-hidden="true">
        <span className="ld-fw__packet" />
        <span className="ld-fw__x">403</span>
        {Array.from({ length: 9 }, (_, i) => <i key={i} style={{ ['--i' as string]: i }} />)}
      </div>
      <div className="ld-fw__side">
        <span className="ld-fw__h"><b>VIBOXS Connect</b><small>OPC ↔ Partner ↔ Trainer</small></span>
        <ul>
          <li className="ok">Profil bisnis opt-in</li>
          <li className="ok">Permintaan &amp; workspace dua pihak</li>
          <li className="ok">Kontrak antar para pihak</li>
          <li className="no">Akses lewat peran Ranger</li>
          <li className="no">Fee internal &amp; data misi</li>
        </ul>
      </div>
    </div>
  );
}
