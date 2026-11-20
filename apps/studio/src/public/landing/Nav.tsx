import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ORIGIN, SITES, SITE_ORDER, siteUrl, isPending } from '@viboxs/shared/ecosystem';
import { I } from '../../ui/kit';
import { ROLES } from './content';

/** Teks tombol yang "berguling": teks naik keluar, salinannya masuk dari bawah. */
export const Roll = ({ children }: { children: string }) => (
  <span className="roll"><span data-t={children}>{children}</span></span>
);

/** Chevron titik-titik yang berputar saat menu terbuka. */
const Dots = ({ open }: { open: boolean }) => (
  <svg className={`nx-dots ${open ? 'is-open' : ''}`} width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><circle cx="2" cy="3" r="1.2" /><circle cx="5" cy="6.5" r="1.2" /><circle cx="8" cy="3" r="1.2" /></svg>
);

type Menu = 'peran' | 'eko' | null;
const LINKS: [string, string][] = [['#alur', 'Alur'], ['#keamanan', 'Keamanan'], ['#segera', 'Segera']];

export default function Nav({ signedIn }: { signedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState<Menu>(null);
  const [sheet, setSheet] = useState(false);
  const root = useRef<HTMLElement>(null);
  const hoverT = useRef(0);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 80);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => {
    if (!menu && !sheet) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenu(null); setSheet(false); } };
    const off = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setMenu(null); };
    document.addEventListener('keydown', esc); document.addEventListener('mousedown', off);
    return () => { document.removeEventListener('keydown', esc); document.removeEventListener('mousedown', off); };
  }, [menu, sheet]);
  useEffect(() => { document.body.style.overflow = sheet ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [sheet]);

  const hover = (m: Menu) => () => { window.clearTimeout(hoverT.current); if (window.matchMedia('(hover: hover)').matches) setMenu(m); };
  const leave = () => { hoverT.current = window.setTimeout(() => setMenu(null), 160); };
  const cta = signedIn ? ['/workspace', 'Workspace'] : ['/daftar', 'Daftar gratis'];

  return (
    <>
      <a href="#main" className="skip">Lewati ke konten</a>
      <div className="nx-announce">
        <span>Studio adalah ruang kerja privat — akses profesional hanya lewat undangan Commander.</span>
        <a href={`${ORIGIN.edu}/kolaborator`}>Lamar jadi kontributor EDU →</a>
      </div>
      <header ref={root} className={`nx-nav ${scrolled ? 'is-scrolled' : ''}`} onMouseLeave={leave} onMouseEnter={() => window.clearTimeout(hoverT.current)}>
        <div className="nx-pill">
          <a href={ORIGIN.corporate} className="nx-brand" aria-label="VIBOXS — beranda">
            <img src="/favicon.png" alt="" width={28} height={28} />
            <span className="nx-brand__word"><img src="/assets/viboxs-wordmark-white.png" alt="VIBOXS" /></span>
            <span className="nx-brand__tag">STUDIO</span>
          </a>
          <nav className="nx-menu" aria-label="Halaman">
            <MenuBtn id="peran" menu={menu} setMenu={setMenu} onEnter={hover('peran')}>Peran</MenuBtn>
            {LINKS.map(([h, l]) => <a key={h} href={h} className="nx-menu__a" onMouseEnter={hover(null)}>{l}</a>)}
            <MenuBtn id="eko" menu={menu} setMenu={setMenu} onEnter={hover('eko')}>Ekosistem</MenuBtn>
          </nav>
          <div className="nx-act">
            {!signedIn && <Link to="/login" className="nx-signin">Masuk</Link>}
            <Link to={cta[0]} className="nx-btn nx-btn--pink"><Roll>{cta[1]}</Roll></Link>
            <button type="button" className="nx-burger" aria-label="Buka menu" aria-expanded={sheet} onClick={() => setSheet(true)}><I.menu size={20} /></button>
          </div>
        </div>

        <div className={`nx-mega ${menu ? 'is-open' : ''}`} hidden={!menu} onMouseEnter={() => window.clearTimeout(hoverT.current)}>
          {menu === 'peran' && (
            <div className="nx-mega__grid" role="menu" aria-label="Peran di Studio">
              {ROLES.map((r, i) => {
                const Ico = I[r.icon];
                return (
                  <a key={r.k} role="menuitem" href="#peran" className="nx-mega__card" style={{ ['--i' as string]: i }} onClick={() => { setMenu(null); window.dispatchEvent(new CustomEvent('nx-role', { detail: r.k })); }}>
                    <span className="nx-mega__ico"><Ico size={22} /></span>
                    <b>{r.t}</b><span>{r.d}</span>
                  </a>
                );
              })}
            </div>
          )}
          {menu === 'eko' && (
            <div className="nx-mega__grid nx-mega__grid--eco" role="menu" aria-label="Jelajahi ekosistem">
              {SITE_ORDER.map((k, i) => (
                <a key={k} role="menuitem" href={siteUrl(k)} className="nx-mega__card" style={{ ['--i' as string]: i }}>
                  <span className="nx-mega__ico"><I.ext size={20} /></span>
                  <b>{SITES[k].name}</b><span>{isPending(k) ? 'Sedang disiapkan' : `${SITES[k].role} · ${SITES[k].domain}`}</span>
                </a>
              ))}
              <span className="nx-mega__card is-here" style={{ ['--i' as string]: 4 }}>
                <span className="nx-mega__ico"><I.grid size={20} /></span>
                <b>Studio</b><span>● Anda di sini · ruang kerja privat</span>
              </span>
            </div>
          )}
        </div>
      </header>

      <div className={`nx-sheet ${sheet ? 'is-open' : ''}`} hidden={!sheet} role="dialog" aria-modal="true" aria-label="Menu">
        <div className="nx-sheet__top">
          <span className="nx-brand"><img src="/favicon.png" alt="" width={28} height={28} /><span className="nx-brand__tag">STUDIO</span></span>
          <button type="button" className="nx-burger" aria-label="Tutup menu" onClick={() => setSheet(false)}><I.x size={20} /></button>
        </div>
        <nav className="nx-sheet__nav">
          {[['#peran', 'Peran'], ...LINKS].map(([h, l], i) => <a key={h} href={h} style={{ ['--i' as string]: i }} onClick={() => setSheet(false)}>{l}<I.arrow size={18} /></a>)}
        </nav>
        <div className="nx-sheet__eco">
          <span className="nx-label">Jelajahi ekosistem</span>
          {SITE_ORDER.map((k) => <a key={k} href={siteUrl(k)}><b>{SITES[k].name}</b><span>{isPending(k) ? 'Sedang disiapkan' : SITES[k].domain}</span></a>)}
        </div>
        <div className="nx-sheet__cta">
          <Link to={signedIn ? '/workspace' : '/login'} className="nx-btn nx-btn--pink nx-btn--block">{signedIn ? 'Buka workspace' : 'Masuk Studio'}</Link>
          <Link to="/daftar" className="nx-btn nx-btn--gray nx-btn--block">Daftar sebagai Learner</Link>
        </div>
      </div>
    </>
  );
}

function MenuBtn({ id, menu, setMenu, onEnter, children }: { id: Exclude<Menu, null>; menu: Menu; setMenu: (m: Menu) => void; onEnter: () => void; children: ReactNode }) {
  const open = menu === id;
  return (
    <button type="button" className={`nx-menu__a ${open ? 'is-on' : ''}`} aria-expanded={open} aria-haspopup="true" onMouseEnter={onEnter} onClick={() => setMenu(open ? null : id)}>
      {children}<Dots open={open} />
    </button>
  );
}
