import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ORIGIN } from '@viboxs/shared/ecosystem';
import { useAuth } from '../lib/auth';
import { ROLE, BUSINESS_ROLES } from '../lib/labels';
import { sb, type Notification, type Role } from '../lib/sb';
import { I, ToastHost, useToast, Badge } from '../ui/kit';

type NavItem = { to: string; label: string; icon: (p: { size?: number }) => JSX.Element; end?: boolean; count?: 'notif' };

const NAV: Record<Role, NavItem[]> = {
  commander: [
    { to: '/workspace', label: 'Control Center', icon: I.grid, end: true },
    { to: '/command/applications', label: 'Aplikasi', icon: I.inbox },
    { to: '/command/people', label: 'Orang & undangan', icon: I.key },
    { to: '/command/leads', label: 'Lead Services', icon: I.lead },
    { to: '/command/missions', label: 'Missions', icon: I.target },
    { to: '/command/edu-review', label: 'Review EDU', icon: I.book },
    { to: '/command/payouts', label: 'Payable & payout', icon: I.wallet },
    { to: '/command/business', label: 'OPC & Connect', icon: I.link },
    { to: '/command/config', label: 'Feature flags', icon: I.sliders },
    { to: '/command/audit', label: 'Audit', icon: I.shield },
  ],
  operator: [{ to: '/workspace', label: 'Ringkasan', icon: I.grid, end: true }],
  ranger: [
    { to: '/workspace', label: 'Ringkasan', icon: I.grid, end: true },
    { to: '/missions/offers', label: 'Penawaran misi', icon: I.target },
    { to: '/missions/my', label: 'Misi saya', icon: I.box },
    { to: '/missions/earnings', label: 'Pendapatan', icon: I.wallet },
    { to: '/soon', label: 'Professional AI Tools', icon: I.spark },
  ],
  trainer: [
    { to: '/workspace', label: 'Ringkasan', icon: I.grid, end: true },
    { to: '/creator/programs', label: 'Program saya', icon: I.book },
    { to: '/creator/earnings', label: 'Laporan & payout', icon: I.wallet },
    { to: '/business/profile', label: 'Profil independen', icon: I.user },
    { to: '/connect/discover', label: 'VIBOXS Connect', icon: I.compass },
    { to: '/connect/requests', label: 'Kolaborasi', icon: I.chat },
  ],
  learner: [
    { to: '/workspace', label: 'My Learning', icon: I.grid, end: true },
    { to: '/learn/assessment', label: 'Asesmen awal', icon: I.compass },
    { to: '/learn/recommendations', label: 'Rekomendasi', icon: I.star },
    { to: '/learn/early-points', label: 'Early Points', icon: I.spark },
    { to: '/learn/apply', label: 'Jalur profesional', icon: I.arrow },
  ],
  opc_founder: [], business_partner: [], collaborator: [],
};
const BIZ_NAV: NavItem[] = [
  { to: '/workspace', label: 'Ringkasan', icon: I.grid, end: true },
  { to: '/business/profile', label: 'Profil usaha', icon: I.user },
  { to: '/business/products', label: 'Produk & showcase', icon: I.box },
  { to: '/connect/discover', label: 'Discover', icon: I.compass },
  { to: '/connect/requests', label: 'Permintaan & workspace', icon: I.chat },
  { to: '/soon', label: 'Investor Network', icon: I.spark },
];
for (const r of BUSINESS_ROLES) NAV[r] = BIZ_NAV;

export default function Shell({ children }: { children: ReactNode }) {
  const nav = useNavigate();
  return <ToastHost onOpen={(l) => nav(l)}><ShellIn>{children}</ShellIn></ToastHost>;
}

function ShellIn({ children }: { children: ReactNode }) {
  const { me, switchRole, signOut } = useAuth();
  const toast = useToast();
  const loc = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [live, setLive] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const roleRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setOpen(false); setRoleOpen(false); }, [loc.pathname]);

  const role = me!.active_role;
  const items = role ? NAV[role] : [];

  const countUnread = useCallback(async () => {
    const { count } = await sb.from('st_notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
    setUnread(count ?? 0);
  }, []);

  // Notifikasi realtime: masuk → toast + badge. RLS realtime memastikan hanya milik sendiri.
  useEffect(() => {
    countUnread();
    const ch = sb.channel('st-notif')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'st_notifications' }, (p) => {
        const n = p.new as Notification;
        setUnread((u) => u + 1);
        toast(n.body ?? '', 'info', { title: n.title, link: n.link ?? undefined });
      })
      .subscribe((s) => setLive(s === 'SUBSCRIBED'));
    const t = window.setInterval(countUnread, 90000);
    return () => { sb.removeChannel(ch); window.clearInterval(t); };
  }, [countUnread, toast]);
  useEffect(() => { if (loc.pathname === '/notifications') window.setTimeout(countUnread, 800); }, [loc.pathname, countUnread]);

  useEffect(() => {
    if (!roleOpen) return;
    const off = (e: MouseEvent) => { if (!roleRef.current?.contains(e.target as Node)) setRoleOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setRoleOpen(false); };
    document.addEventListener('mousedown', off); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc); };
  }, [roleOpen]);

  async function pick(r: Role) {
    if (r === role) { setRoleOpen(false); return; }
    setSwitching(true);
    try { await switchRole(r); toast(`Sekarang bertindak sebagai ${ROLE[r].label}. Izin server ikut berganti.`, 'ok'); nav('/workspace'); }
    catch (e) { toast((e as Error).message, 'err'); }
    finally { setSwitching(false); setRoleOpen(false); }
  }

  const initials = (me!.profile.display_name || me!.profile.email || '?').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');

  return (
    <div className={`st ${open ? 'is-open' : ''} ${switching ? 'is-switching' : ''}`} data-role={role ?? 'none'}>
      <a href="#st-main" className="st-skip">Lewati ke konten</a>
      <aside className="st-side" aria-label="Navigasi Studio">
        <a href="/" className="st-brand" aria-label="VIBOXS Studio — beranda"><img src="/assets/viboxs-wordmark-white.png" alt="VIBOXS" height={16} /><span>STUDIO</span></a>

        <div className="st-ctx" ref={roleRef}>
          <span className="st-ctx__label">Bertindak sebagai</span>
          <button type="button" className="st-ctx__btn" aria-haspopup="listbox" aria-expanded={roleOpen} onClick={() => me!.roles.length > 1 && setRoleOpen((o) => !o)} disabled={me!.roles.length < 2}>
            <span className="st-ctx__dot" aria-hidden="true" />
            <span className="st-ctx__txt"><b>{role ? ROLE[role].label : 'Tanpa peran'}</b><small>{role ? ROLE[role].desc : '—'}</small></span>
            {me!.roles.length > 1 && <I.swap size={16} />}
          </button>
          {roleOpen && (
            <ul className="st-ctx__menu" role="listbox" aria-label="Pilih konteks peran">
              {me!.roles.map((r) => (
                <li key={r}><button type="button" role="option" aria-selected={r === role} className={r === role ? 'is-on' : ''} onClick={() => pick(r)}>
                  <b>{ROLE[r].label}</b><small>{ROLE[r].desc}</small>{r === role && <span className="st-here">Aktif</span>}
                </button></li>
              ))}
            </ul>
          )}
        </div>

        <nav className="st-nav">
          {items.map((n, i) => (
            <NavLink key={n.to + n.label} to={n.to} end={n.end} style={{ ['--i' as string]: i }} className={({ isActive }) => `st-nav__a ${isActive ? 'is-on' : ''}`}>
              <n.icon /><span>{n.label}</span>{n.to === '/soon' && <small className="st-soonchip">Soon</small>}
            </NavLink>
          ))}
        </nav>

        <div className="st-side__foot">
          <NavLink to="/notifications" className={({ isActive }) => `st-nav__a ${isActive ? 'is-on' : ''}`}>
            <I.bell /><span>Notifikasi</span>{unread > 0 && <em className="st-count">{unread > 99 ? '99+' : unread}</em>}
          </NavLink>
          <NavLink to="/settings/profile" className={({ isActive }) => `st-nav__a ${isActive ? 'is-on' : ''}`}><I.user /><span>Profil & privasi</span></NavLink>
          <button type="button" className="st-nav__a" onClick={() => signOut().then(() => nav('/login'))}><I.out /><span>Keluar</span></button>
          <div className="st-who">
            <span className="st-avatar" aria-hidden="true">{initials}</span>
            <span className="st-who__txt"><b>{me!.profile.display_name || 'Tanpa nama'}</b><small>{me!.profile.email}</small></span>
          </div>
        </div>
      </aside>
      <button type="button" className="st-scrim" aria-label="Tutup menu" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)} />

      <div className="st-main">
        <div className="st-top">
          <button type="button" className="st-icon st-top__menu" onClick={() => setOpen(true)} aria-label="Buka menu"><I.menu /></button>
          <div className="st-top__brand"><img src="/assets/viboxs-wordmark-white.png" alt="VIBOXS" height={13} /><span>STUDIO</span></div>
          <div className="st-top__right">
            <span className={`st-rt ${live ? 'is-live' : ''}`} title={live ? 'Notifikasi realtime tersambung' : 'Menyambungkan realtime…'}>
              <i aria-hidden="true" />{live ? 'Realtime' : 'Menyambung…'}
            </span>
            {role && <Badge tone="violet">{ROLE[role].short}</Badge>}
            <NavLink to="/notifications" className="st-icon st-bell" aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ''}`}>
              <I.bell />{unread > 0 && <em key={unread} className="st-bell__n">{unread > 9 ? '9+' : unread}</em>}
            </NavLink>
          </div>
        </div>
        <main id="st-main" className="st-page" key={loc.pathname + (role ?? '')}>{children}</main>
        <footer className="st-foot">
          <span>VIBOXS adalah unit AI Venture Studio di bawah PT Ekosistem Pelosok Hub.</span>
          <span><a href={ORIGIN.corporate}>viboxs.com</a> · <a href={ORIGIN.edu}>EDU</a> · <a href={ORIGIN.services}>Services</a> · © {new Date().getFullYear()}</span>
        </footer>
      </div>
    </div>
  );
}
