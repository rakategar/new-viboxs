import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Check, Chevron, Close, Grid, Menu, ArrowRight } from '@viboxs/shared/icons';
import { SITES, SITE_ORDER, isPending } from '@viboxs/shared/ecosystem';
import { NAV, SVC, SVC_ORDER, svcHref } from '../lib/content';
import EcoLink from './EcoLink';

type MenuKey = 'sol' | 'eco' | null;

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState<MenuKey>(null);
  const [drawer, setDrawer] = useState(false);
  const solBtn = useRef<HTMLButtonElement>(null);
  const ecoBtn = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const drawerBtnRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const loc = useLocation();
  const onDetail = loc.pathname.startsWith('/services/');

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (barRef.current) barRef.current.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMenu(null); closeDrawer(false); }, [loc.pathname, loc.search]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (menu) { const b = menu === 'sol' ? solBtn : ecoBtn; setMenu(null); b.current?.focus(); }
      if (drawer) closeDrawer();
    };
    const onDown = (e: MouseEvent) => {
      if (!menu) return;
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !solBtn.current?.contains(t) && !ecoBtn.current?.contains(t)) setMenu(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  });

  function toggle(k: Exclude<MenuKey, null>) {
    setMenu((m) => {
      const n = m === k ? null : k;
      if (n) setTimeout(() => menuRef.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus(), 0);
      return n;
    });
  }
  function onMenuKey(e: KeyboardEvent) {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role=menuitem]') || [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
    if (e.key === 'Tab') setMenu(null);
  }
  function openDrawer() {
    document.body.style.overflow = 'hidden';
    setDrawer(true);
    setTimeout(() => drawerRef.current?.querySelector<HTMLElement>('button')?.focus(), 0);
  }
  function closeDrawer(focus = true) {
    document.body.style.overflow = '';
    setDrawer(false);
    if (focus) drawerBtnRef.current?.focus();
  }
  function trap(e: KeyboardEvent) {
    if (e.key !== 'Tab' || !drawerRef.current) return;
    const f = [...drawerRef.current.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea')];
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  const ecoList = (cls: string, mi: boolean) =>
    SITE_ORDER.map((k) => {
      const s = SITES[k];
      const txt = <span className={cls === 'switcher__item' ? 'switcher__txt' : ''}><b>{s.name}</b><span>{s.role}{cls === 'switcher__item' ? ` · ${s.domain}` : ''}</span></span>;
      if (k === 'services') {
        return (
          <Link key={k} to="/" role={mi ? 'menuitem' : undefined} aria-current="page" className={`${cls} is-active`}>
            {txt}<span className="here"><Check size={14} />Anda di sini</span>
          </Link>
        );
      }
      return (
        <EcoLink key={k} k={k} role={mi ? 'menuitem' : undefined} className={cls}>
          {txt}{isPending(k) && <span className="tag-pending">Sedang disiapkan</span>}
        </EcoLink>
      );
    });

  return (
    <>
      <a className="skip" href="#main">Lewati ke konten</a>
      <header className={`hdr ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="hdr__in container">
          <div className="hdr__brandset">
            <EcoLink k="corporate" className="hdr__brand" aria-label="VIBOXS — ke viboxs.com">
              <img src="/assets/viboxs-wordmark-white.png" alt="VIBOXS" width={108} height={18} />
            </EcoLink>
            <span className="hdr__sep" aria-hidden="true" />
            <Link to="/" className="hdr__site">Services</Link>
          </div>
          <nav className="hdr__nav" aria-label="Menu Services">
            <div className="rel">
              <button
                ref={solBtn}
                className={`hdr__link hdr__link--btn ${onDetail ? 'is-active' : ''}`}
                onClick={() => toggle('sol')}
                aria-haspopup="menu"
                aria-expanded={menu === 'sol'}
              >
                Solutions <Chevron size={14} className={`chev ${menu === 'sol' ? 'is-open' : ''}`} />
              </button>
              {menu === 'sol' && (
                <MegaMenu menuRef={menuRef} onKey={onMenuKey} current={loc.pathname} />
              )}
            </div>
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `hdr__link ${isActive ? 'is-active' : ''}`}>{n.label}</NavLink>
            ))}
          </nav>
          <div className="hdr__actions">
            <button ref={ecoBtn} className="pill-btn" onClick={() => toggle('eco')} aria-haspopup="menu" aria-expanded={menu === 'eco'}>
              <Grid size={16} /> Ekosistem <Chevron size={14} className={`chev ${menu === 'eco' ? 'is-open' : ''}`} />
            </button>
            <Link to="/start" className="btn btn--light btn--sm hdr__cta" aria-label="Start a Mission — kirim kebutuhan">
              <span className="hdr__cta-dot" aria-hidden="true" />Start a Mission
            </Link>
            {menu === 'eco' && (
              <div ref={menuRef} role="menu" aria-label="Ekosistem VIBOXS" className="switcher" onKeyDown={onMenuKey}>
                <div className="switcher__label">Ekosistem VIBOXS</div>
                {ecoList('switcher__item', true)}
              </div>
            )}
          </div>
          <div className="hdr__mobile">
            <Link to="/start" className="btn btn--light btn--sm">Kirim brief</Link>
            <button ref={drawerBtnRef} className="icon-btn" onClick={openDrawer} aria-label="Buka menu" aria-expanded={drawer}>
              <Menu size={20} />
            </button>
          </div>
        </div>
        <div className="hdr__progress" aria-hidden="true"><div ref={barRef} /></div>
      </header>

      <div className={`drawer-scrim ${drawer ? 'is-open' : ''}`} onClick={() => closeDrawer()} aria-hidden="true" />
      <div ref={drawerRef} role="dialog" aria-modal="true" aria-label="Menu" className={`drawer ${drawer ? 'is-open' : ''}`} onKeyDown={trap} hidden={!drawer}>
        <div className="drawer__top">
          <span className="row-10"><img src="/assets/viboxs-wordmark-white.png" alt="VIBOXS" height={16} /><span className="xs-13 strong muted">· Services</span></span>
          <button className="icon-btn" onClick={() => closeDrawer()} aria-label="Tutup menu"><Close size={20} /></button>
        </div>
        <nav className="drawer__nav" aria-label="Menu Services">
          {[{ to: '/#solutions', label: 'Solutions' }, ...NAV, { to: '/capabilities', label: 'Capabilities' }, { to: '/faq', label: 'FAQ' }].map((n, i) => (
            <NavLink key={n.to} to={n.to} style={{ ['--i' as string]: i }} className={({ isActive }) => (isActive && n.to !== '/#solutions' ? 'is-active' : '')}>
              {n.label}<span />
            </NavLink>
          ))}
        </nav>
        <div className="drawer__eco">
          <div className="eyebrow">Jelajahi ekosistem</div>
          {ecoList('drawer__item', false)}
        </div>
        <div className="drawer__cta"><Link to="/start" className="btn btn--primary btn--block">Start a Mission — kirim kebutuhan</Link></div>
      </div>
    </>
  );
}

function MegaMenu({ menuRef, onKey, current }: { menuRef: RefObject<HTMLDivElement>; onKey: (e: KeyboardEvent) => void; current: string }) {
  return (
    <div ref={menuRef} role="menu" aria-label="Solutions" className="mega" onKeyDown={onKey}>
      <div className="switcher__label">Lima layanan inti</div>
      <div className="mega__grid">
        {SVC_ORDER.map((k) => {
          const s = SVC[k];
          const cur = current === svcHref(k);
          return (
            <Link key={k} to={svcHref(k)} role="menuitem" aria-current={cur ? 'page' : undefined} className={`mega__item ${cur ? 'is-active' : ''}`}>
              <span className="mega__n">{s.n}</span>
              <span className="stack-2"><b>{s.name}</b><span>{s.problem}</span></span>
              <ArrowRight size={14} className="mega__arr" />
            </Link>
          );
        })}
      </div>
      <div className="mega__foot">
        <span className="xs muted">Kapabilitas lain:</span>
        <Link role="menuitem" to="/advisory">Strategic Advisory</Link>
        <Link role="menuitem" to="/capabilities">Training &amp; Infrastructure</Link>
      </div>
    </div>
  );
}
