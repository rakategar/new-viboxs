import { Suspense, lazy, useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { applySeo } from '@viboxs/shared/seo';
import { STUDIO_ORIGIN } from '@viboxs/shared/ecosystem';
import { useAuth } from './lib/auth';
import { ROLE, BUSINESS_ROLES } from './lib/labels';
import type { Role } from './lib/sb';
import { Btn, Empty, I } from './ui/kit';
import Landing from './public/Landing';
import { Login, Register, Reset } from './public/Auth';
import Invite from './public/Invite';
import Shell from './app/Shell';
import Workspace from './app/Workspace';
import { Notifications, Settings, Soon, NoRole } from './app/Common';

const Applications = lazy(() => import('./app/command/Applications'));
const People = lazy(() => import('./app/command/People'));
const Leads = lazy(() => import('./app/command/Leads'));
const Missions = lazy(() => import('./app/command/Missions'));
const MissionDetail = lazy(() => import('./app/command/MissionDetail'));
const EduReview = lazy(() => import('./app/command/EduReview'));
const Payouts = lazy(() => import('./app/command/Payouts'));
const Business = lazy(() => import('./app/command/Business'));
const Config = lazy(() => import('./app/command/Config'));
const AuditLog = lazy(() => import('./app/command/Audit'));
const RangerList = lazy(() => import('./app/ranger/RangerList'));
const RangerMission = lazy(() => import('./app/ranger/RangerMission'));
const Earnings = lazy(() => import('./app/ranger/Earnings'));
const Programs = lazy(() => import('./app/creator/Programs'));
const Assessment = lazy(() => import('./app/learn/Assessment'));
const Recommendations = lazy(() => import('./app/learn/Recommendations'));
const EarlyPoints = lazy(() => import('./app/learn/EarlyPoints'));
const Apply = lazy(() => import('./app/learn/Apply'));
const OrgProfile = lazy(() => import('./app/business/OrgProfile'));
const Products = lazy(() => import('./app/business/Products'));
const Discover = lazy(() => import('./app/business/Discover'));
const Requests = lazy(() => import('./app/business/Requests'));
const WorkspaceRoom = lazy(() => import('./app/business/WorkspaceRoom'));

const PUBLIC = ['/', '/login', '/daftar', '/reset'];

/** Halaman hanya untuk peran tertentu. Server tetap menolak kueri bila konteks tidak cocok (FORBIDDEN). */
function Need({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { me, switchRole } = useAuth();
  const role = me?.active_role;
  if (role && roles.includes(role)) return <>{children}</>;
  const can = me?.roles.filter((r) => roles.includes(r)) ?? [];
  return (
    <div className="st-page-in">
      <Empty title="Halaman ini tidak tersedia untuk peran yang sedang aktif" icon={I.lock}>
        <p>Dibutuhkan peran: {roles.map((r) => ROLE[r].label).join(' / ')}.{' '}
          {roles.includes('ranger') || !BUSINESS_ROLES.some((b) => roles.includes(b)) ? '' : 'Peran Ranger tidak membuka VIBOXS Connect.'}</p>
        {can.length > 0 && <Btn kind="primary" onClick={() => switchRole(can[0])}>Ganti ke {ROLE[can[0]].label}</Btn>}
      </Empty>
    </div>
  );
}

const CMD: Role[] = ['commander'];
const BIZ: Role[] = [...BUSINESS_ROLES, 'trainer'];

export default function App() {
  const { pathname } = useLocation();
  const { ready, session, me, error } = useAuth();

  useEffect(() => {
    applySeo({ origin: STUDIO_ORIGIN, path: pathname === '/' ? '/' : pathname.split('/').slice(0, 2).join('/'), title: pathname === '/' ? 'VIBOXS Studio — Ruang kerja privat ekosistem VIBOXS' : 'VIBOXS Studio', noindex: true });
  }, [pathname]);

  if (pathname === '/') return <Landing />;
  if (pathname.startsWith('/invite/')) return <Routes><Route path="/invite/:token" element={<Invite />} /></Routes>;
  if (PUBLIC.includes(pathname)) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/daftar" element={<Register />} />
        <Route path="/reset" element={<Reset />} />
      </Routes>
    );
  }
  if (!ready) return <div className="st-boot"><span className="st-boot__orb" />Menyiapkan Studio…</div>;
  if (!session) return <Navigate to={`/login?next=${encodeURIComponent(pathname)}`} replace />;
  if (!me) return <div className="st-boot st-boot--err"><b>Studio belum bisa dimuat.</b><span>{error || 'Coba muat ulang halaman.'}</span><button type="button" className="st-btn st-btn--ghost" onClick={() => location.reload()}>Muat ulang</button></div>;
  if (!me.roles.length) return <Shell><NoRole /></Shell>;

  return (
    <Shell>
      <Suspense fallback={<div className="st-page-in"><div className="st-skel" role="status" aria-label="Memuat…"><span /><span /><span /></div></div>}>
        <Routes>
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings/profile" element={<Settings />} />
          <Route path="/soon" element={<Soon />} />

          <Route path="/command/applications" element={<Need roles={CMD}><Applications /></Need>} />
          <Route path="/command/people" element={<Need roles={CMD}><People /></Need>} />
          <Route path="/command/leads" element={<Need roles={CMD}><Leads /></Need>} />
          <Route path="/command/missions" element={<Need roles={CMD}><Missions /></Need>} />
          <Route path="/command/missions/:id" element={<Need roles={CMD}><MissionDetail /></Need>} />
          <Route path="/command/edu-review" element={<Need roles={CMD}><EduReview /></Need>} />
          <Route path="/command/payouts" element={<Need roles={CMD}><Payouts /></Need>} />
          <Route path="/command/business" element={<Need roles={CMD}><Business /></Need>} />
          <Route path="/command/config" element={<Need roles={CMD}><Config /></Need>} />
          <Route path="/command/audit" element={<Need roles={CMD}><AuditLog /></Need>} />

          <Route path="/missions/offers" element={<Need roles={['ranger']}><RangerList mode="offers" /></Need>} />
          <Route path="/missions/my" element={<Need roles={['ranger']}><RangerList mode="my" /></Need>} />
          <Route path="/missions/earnings" element={<Need roles={['ranger']}><Earnings /></Need>} />
          <Route path="/missions/:id" element={<Need roles={['ranger']}><RangerMission /></Need>} />

          <Route path="/creator/programs" element={<Need roles={['trainer']}><Programs /></Need>} />
          <Route path="/creator/earnings" element={<Need roles={['trainer']}><Earnings creator /></Need>} />

          <Route path="/learn/assessment" element={<Need roles={['learner']}><Assessment /></Need>} />
          <Route path="/learn/recommendations" element={<Need roles={['learner']}><Recommendations /></Need>} />
          <Route path="/learn/early-points" element={<Need roles={['learner']}><EarlyPoints /></Need>} />
          <Route path="/learn/apply" element={<Need roles={['learner']}><Apply /></Need>} />

          <Route path="/business/profile" element={<Need roles={BIZ}><OrgProfile /></Need>} />
          <Route path="/business/products" element={<Need roles={BUSINESS_ROLES}><Products /></Need>} />
          <Route path="/connect/discover" element={<Need roles={BIZ}><Discover /></Need>} />
          <Route path="/connect/requests" element={<Need roles={BIZ}><Requests /></Need>} />
          <Route path="/connect/workspaces/:id" element={<Need roles={BIZ}><WorkspaceRoom /></Need>} />

          <Route path="*" element={<div className="st-page-in"><Empty title="Halaman tidak ditemukan" icon={I.compass}><a href="/workspace">Kembali ke ringkasan</a></Empty></div>} />
        </Routes>
      </Suspense>
    </Shell>
  );
}
