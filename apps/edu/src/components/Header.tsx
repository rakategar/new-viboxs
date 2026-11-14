import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Check, Chevron, Close, Grid, IconSearch, Menu } from '@viboxs/shared/icons';
import { SITES, SITE_ORDER, isPending } from '@viboxs/shared/ecosystem';
import EcoLink from './EcoLink';

export const NAV = [
  { to: '/programs', label: 'Programs' },
  { to: '/events', label: 'Events' },
  { to: '/library', label: 'Digital Library' },
  { to: '/corporate-training', label: 'For Teams' },
  { to: '/help', label: 'Help' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [eco, setEco] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState('');
  const ecoBtn = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const drawerBtnRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const loc = useLocation();
  const nav = useNavigate();

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

  useEffect(() => { setEco(false); closeDrawer(false); }, [loc.pathname, loc.search]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (eco) { setEco(false); ecoBtn.current?.focus(); }
      if (drawer) closeDrawer();
    };
    const onDown = (e: MouseEvent) => {
      if (!eco) return;
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !ecoBtn.current?.contains(t)) setEco(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  });

  function toggleEco() {
    setEco((o) => {
      if (!o) setTimeout(() => menuRef.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus(), 0);
      return !o;
    });
  }
  function onMenuKey(e: KeyboardEvent) {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role=menuitem]') || [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
    if (e.key === 'Tab') setEco(false);
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
    const f = [...drawerRef.current.querySelectorAll<HTMLElement>('button,a[href],input')];
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function search(e: FormEvent) {
    e.preventDefault();
    nav(`/programs${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
    setQ('');
  }

  const isActive = (to: string) => loc.pathname === to || loc.pathname.startsWith(`${to}/`) || (to === '/events' && loc.pathname.startsWith('/events'));

  const ecoList = (cls: string, mi: boolean) =>
    SITE_ORDER.map((k) => {
      const s = SITES[k];
      const txt = <span className={cls === 'switcher__item' ? 'switcher__txt' : ''}><b>{s.name}</b><span>{s.role}{cls === 'switcher__item' ? ` · ${s.domain}` : ''}</span></span>;
      if (k === 'edu') {
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
            <Link to="/" className="hdr__site">EDU</Link>
          </div>
          <nav className="hdr__nav" aria-label="Menu EDU">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={() => `hdr__link ${isActive(n.to) ? 'is-active' : ''}`}>{n.label}</NavLink>
            ))}
          </nav>
          <div className="hdr__actions">
            <form role="search" className="hdr__search" onSubmit={search}>
              <label htmlFor="hdr-q" className="sr-only">Cari program &amp; topik</label>
              <IconSearch size={16} />
              <input id="hdr-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari program & topik" />
            </form>
            <button ref={ecoBtn} className="pill-btn" onClick={toggleEco} aria-haspopup="menu" aria-expanded={eco}>
              <Grid size={16} /> Ekosistem <Chevron size={14} className={`chev ${eco ? 'is-open' : ''}`} />
            </button>
            {eco && (
              <div ref={menuRef} role="menu" aria-label="Ekosistem VIBOXS" className="switcher" onKeyDown={onMenuKey}>
                <div className="switcher__label">Ekosistem VIBOXS</div>
                {ecoList('switcher__item', true)}
              </div>
            )}
          </div>
          <div className="hdr__mobile">
            <Link to="/programs" className="btn btn--light btn--sm">Program</Link>
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
          <span className="row-10"><img src="/assets/viboxs-wordmark-white.png" alt="VIBOXS" height={16} /><span className="xs-13 strong muted">· EDU</span></span>
          <button className="icon-btn" onClick={() => closeDrawer()} aria-label="Tutup menu"><Close size={20} /></button>
        </div>
        <form role="search" className="hdr__search hdr__search--drawer" onSubmit={search}>
          <label htmlFor="dr-q" className="sr-only">Cari program &amp; topik</label>
          <IconSearch size={16} />
          <input id="dr-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari program & topik" />
        </form>
        <nav className="drawer__nav" aria-label="Menu EDU">
          {NAV.map((n, i) => (
            <NavLink key={n.to} to={n.to} style={{ ['--i' as string]: i }} className={() => (isActive(n.to) ? 'is-active' : '')}>
              {n.label}<span />
            </NavLink>
          ))}
        </nav>
        <div className="drawer__eco">
          <div className="eyebrow">Jelajahi ekosistem</div>
          {ecoList('drawer__item', false)}
        </div>
        <div className="drawer__cta"><Link to="/programs" className="btn btn--primary btn--block">Jelajahi Program</Link></div>
      </div>
    </>
  );
}
