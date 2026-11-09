import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { DEST, ORDER, NAV, isPending } from '../lib/content';
import { Check, Chevron, Close, Grid, Menu } from './Icons';
import DestLink from './DestLink';

const ecoItems = [
  { key: 'viboxs', name: 'VIBOXS', desc: 'Overview perusahaan', domain: 'viboxs.com', active: true, pending: false },
  ...ORDER.map((k) => ({ key: k, name: DEST[k].name, desc: DEST[k].role, domain: DEST[k].domain, active: false, pending: isPending(k) })),
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const drawerBtnRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const loc = useLocation();

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

  useEffect(() => { setOpen(false); closeDrawer(false); }, [loc.pathname]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (open) { setOpen(false); btnRef.current?.focus(); }
      if (drawer) closeDrawer();
    };
    const onDown = (e: MouseEvent) => {
      if (!open) return;
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  });

  function toggle() {
    setOpen((o) => {
      const n = !o;
      if (n) setTimeout(() => menuRef.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus(), 0);
      return n;
    });
  }
  function onMenuKey(e: KeyboardEvent) {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role=menuitem]') || [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
    if (e.key === 'Tab') setOpen(false);
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

  return (
    <>
      <a className="skip" href="#main">Lewati ke konten</a>
      <header className={`hdr ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="hdr__in container">
          <Link to="/" className="hdr__brand" aria-label="VIBOXS — beranda viboxs.com">
            <img src="/assets/viboxs-wordmark-white.png" alt="VIBOXS" width={108} height={18} />
          </Link>
          <nav className="hdr__nav" aria-label="Menu utama">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end className={({ isActive }) => `hdr__link ${isActive ? 'is-active' : ''}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="hdr__actions">
            <button ref={btnRef} className="pill-btn" onClick={toggle} aria-haspopup="menu" aria-expanded={open}>
              <Grid size={16} /> Ekosistem <Chevron size={14} className={`chev ${open ? 'is-open' : ''}`} />
            </button>
            <DestLink k="universe" className="btn btn--light btn--sm">Kenali Universe</DestLink>
            {open && (
              <div ref={menuRef} role="menu" aria-label="Ekosistem VIBOXS" className="switcher" onKeyDown={onMenuKey}>
                <div className="switcher__label">Ekosistem VIBOXS</div>
                {ecoItems.map((e) =>
                  e.key === 'viboxs' ? (
                    <Link key={e.key} to="/" role="menuitem" aria-current="page" className="switcher__item is-active">
                      <span className="switcher__txt"><b>{e.name}</b><span>{e.desc} · {e.domain}</span></span>
                      <span className="here"><Check size={14} />Anda di sini</span>
                    </Link>
                  ) : (
                    <DestLink key={e.key} k={e.key as 'universe'} role="menuitem" className="switcher__item">
                      <span className="switcher__txt"><b>{e.name}</b><span>{e.desc} · {e.domain}</span></span>
                      {e.pending && <span className="tag-pending">Sedang disiapkan</span>}
                    </DestLink>
                  ),
                )}
              </div>
            )}
          </div>
          <button ref={drawerBtnRef} className="icon-btn hdr__burger" onClick={openDrawer} aria-label="Buka menu" aria-expanded={drawer}>
            <Menu size={20} />
          </button>
        </div>
        <div className="hdr__progress" aria-hidden="true"><div ref={barRef} /></div>
      </header>

      <div className={`drawer-scrim ${drawer ? 'is-open' : ''}`} onClick={() => closeDrawer()} aria-hidden="true" />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`drawer ${drawer ? 'is-open' : ''}`}
        onKeyDown={trap}
        hidden={!drawer}
      >
        <div className="drawer__top">
          <img src="/assets/viboxs-wordmark-white.png" alt="VIBOXS" height={16} />
          <button className="icon-btn" onClick={() => closeDrawer()} aria-label="Tutup menu"><Close size={20} /></button>
        </div>
        <nav className="drawer__nav" aria-label="Menu utama">
          {NAV.map((n, i) => (
            <NavLink key={n.to} to={n.to} end style={{ ['--i' as string]: i }} className={({ isActive }) => (isActive ? 'is-active' : '')}>
              {n.label}<span />
            </NavLink>
          ))}
        </nav>
        <div className="drawer__eco">
          <div className="eyebrow">Jelajahi ekosistem</div>
          {ecoItems.map((e) =>
            e.key === 'viboxs' ? (
              <Link key={e.key} to="/" className="drawer__item is-active">
                <span><b>{e.name}</b><span>{e.desc}</span></span>
                <span className="here">✓ Anda di sini</span>
              </Link>
            ) : (
              <DestLink key={e.key} k={e.key as 'universe'} className="drawer__item">
                <span><b>{e.name}</b><span>{e.desc}</span></span>
                {e.pending && <span className="muted small">Sedang disiapkan</span>}
              </DestLink>
            ),
          )}
        </div>
        <div className="drawer__cta"><DestLink k="universe" className="btn btn--primary btn--block">Kenali Universe</DestLink></div>
      </div>
    </>
  );
}
