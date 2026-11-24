import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useLoad } from '../lib/hooks';
import { ROLE, ENTITY, ago, rupiah, PROG_STATUS, BUSINESS_ROLES } from '../lib/labels';
import { sb, must, type Audit, type Notification, type Payable, type ProgramDraft, type Points, type LearnerProfile } from '../lib/sb';
import { Badge, Card, ComingSoon, Empty, I, Loaded, PageHead, Stat, StatusBadge } from '../ui/kit';

const count = async (q: PromiseLike<{ count: number | null; error: unknown }>) => { const r = await q; if (r.error) throw r.error; return r.count ?? 0; };
const head = { count: 'exact' as const, head: true };

const greet = () => { const h = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jakarta' })); return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 19 ? 'Selamat sore' : 'Selamat malam'; };

export default function Workspace() {
  const { me } = useAuth();
  const role = me!.active_role!;
  const name = me!.profile.display_name?.split(' ')[0] || '';
  return (
    <div className="st-page-in">
      <PageHead eyebrow={ROLE[role].label} title={`${greet()}${name ? `, ${name}` : ''}.`} desc={ROLE[role].desc} />
      {role === 'commander' ? <CommanderHome /> : role === 'ranger' ? <RangerHome /> : role === 'trainer' ? <TrainerHome /> : role === 'learner' ? <LearnerHome /> : role === 'company_partner' ? <Navigate to="/company" replace /> : BUSINESS_ROLES.includes(role) ? <BusinessHome /> : <Empty title="Belum ada modul untuk peran ini" />}
    </div>
  );
}

/* ---------------- Commander ---------------- */
function CommanderHome() {
  const nav = useNavigate();
  const s = useLoad(async () => {
    const [apps, invites, leads, bids, deliv, edu, payPending, payApproved, connect] = await Promise.all([
      count(sb.from('st_applications').select('id', head).in('status', ['submitted', 'in_review', 'need_info'])),
      count(sb.from('st_invites').select('id', head).eq('status', 'pending').gt('expires_at', new Date().toISOString())),
      count(sb.from('st_leads').select('id', head).eq('status', 'new')),
      count(sb.from('st_missions').select('id', head).in('status', ['bidding', 'negotiation'])),
      count(sb.from('st_deliverables').select('id', head).eq('status', 'submitted')),
      count(sb.from('st_program_drafts').select('id', head).eq('status', 'submitted')),
      count(sb.from('st_payables').select('id', head).eq('status', 'pending_approval')),
      count(sb.from('st_payables').select('id', head).in('status', ['approved', 'partially_paid'])),
      count(sb.from('st_workspaces').select('id', head).eq('approval', 'awaiting_commander')),
    ]);
    return { apps, invites, leads, bids, deliv, edu, payPending, payApproved, connect };
  });
  const audit = useLoad(() => must(sb.from('st_audit').select('*').order('created_at', { ascending: false }).limit(10)) as Promise<Audit[]>);
  const d = s.data;
  return (
    <>
      {s.error && <div className="st-alert st-alert--err">{s.error}</div>}
      <section className="st-stats" aria-label="Antrean keputusan">
        <Stat label="Aplikasi menunggu" value={d?.apps ?? null} hint="Perlu keputusan" tone="info" onClick={() => nav('/command/applications')} live />
        <Stat label="Undangan pending" value={d?.invites ?? null} hint="Belum diterima" onClick={() => nav('/command/people')} />
        <Stat label="Lead Services baru" value={d?.leads ?? null} hint="Belum ditindaklanjuti" tone="accent" onClick={() => nav('/command/leads')} live />
        <Stat label="Tawaran & negosiasi" value={d?.bids ?? null} hint="Misi menunggu keputusan" tone="violet" onClick={() => nav('/command/missions')} />
        <Stat label="Deliverable menunggu QC" value={d?.deliv ?? null} hint="Perlu review" tone="violet" onClick={() => nav('/command/missions')} />
        <Stat label="Program EDU direview" value={d?.edu ?? null} hint="Draft kontributor" tone="gold" onClick={() => nav('/command/edu-review')} />
        <Stat label="Payable perlu approval" value={d?.payPending ?? null} hint="Belum disetujui" tone="warn" onClick={() => nav('/command/payouts')} />
        <Stat label="Disetujui, belum transfer" value={d?.payApproved ?? null} hint="Catat bukti transfer" tone="gold" onClick={() => nav('/command/payouts')} />
        <Stat label="Kolaborasi libatkan VIBOXS" value={d?.connect ?? null} hint="Perlu approval" onClick={() => nav('/command/business')} />
      </section>
      <div className="st-grid2">
        <Card title="Aktivitas terbaru" desc="Dari audit log — siapa, sebagai peran apa, mengubah apa." actions={<Link to="/command/audit" className="st-btn st-btn--quiet st-btn--sm">Semua</Link>}>
          <Loaded state={audit} empty={(a) => (a.length ? null : <Empty title="Belum ada aktivitas" icon={I.shield}>Aktivitas muncul saat ada perubahan status, undangan, atau keputusan.</Empty>)}>
            {(a) => <ul className="st-feed">{a.map((x, i) => (
              <li key={x.id} style={{ ['--i' as string]: i }}><i className={`st-feed__dot st-feed__dot--${x.action}`} aria-hidden="true" />
                <span><b>{ENTITY[x.entity] ?? x.entity}</b> {x.action === 'insert' ? 'dibuat' : x.action === 'switch_role' ? 'ganti konteks' : 'diubah'}{x.detail?.to ? <> → <code>{x.detail.to}</code></> : null}{x.acting_as && <small> · sebagai {ROLE[x.acting_as as keyof typeof ROLE]?.label ?? x.acting_as}</small>}</span>
                <time>{ago(x.created_at)}</time></li>
            ))}</ul>}
          </Loaded>
        </Card>
        <Card title="Kesehatan integrasi" desc="Status sambungan Studio dengan situs publik.">
          <ul className="st-integ">
            <li><span className="st-integ__dot is-ok" /><span><b>Services → Studio</b><small>Lead “Start a Mission” masuk otomatis ke inbox (idempoten per nomor referensi).</small></span><Badge tone="ok">Aktif</Badge></li>
            <li><span className="st-integ__dot is-ok" /><span><b>EDU → Studio</b><small>Pendaftar kolaborator EDU masuk sebagai aplikasi Trainer.</small></span><Badge tone="ok">Aktif</Badge></li>
            <li><span className="st-integ__dot is-ok" /><span><b>Studio → EDU</b><small>Program disetujui dikirim sebagai draft; status tayang mengikuti CMS EDU.</small></span><Badge tone="ok">Aktif</Badge></li>
            <li><span className="st-integ__dot is-warn" /><span><b>EDU order & enrollment</b><small>Checkout EDU belum memakai payment gateway terverifikasi — tidak ada data order.</small></span><Badge tone="warn">Belum aktif</Badge></li>
            <li><span className="st-integ__dot" /><span><b>Studio → Universe</b><small>Universe sedang disiapkan. Produk showcase tetap di antrean.</small></span><Badge tone="muted">Sedang disiapkan</Badge></li>
            <li><span className="st-integ__dot is-warn" /><span><b>Notifikasi email</b><small>Kanal awal in-app + realtime. Undangan dikirim manual dari email Anda.</small></span><Badge tone="warn">In-app saja</Badge></li>
          </ul>
        </Card>
      </div>
    </>
  );
}

/* ---------------- Ranger ---------------- */
function RangerHome() {
  const { me } = useAuth();
  const nav = useNavigate();
  const s = useLoad(async () => {
    const uid = me!.profile.id;
    const [targets, asg, pay] = await Promise.all([
      must(sb.from('st_mission_targets').select('mission_id, st_missions(status)').eq('ranger_id', uid)) as unknown as Promise<{ mission_id: string; st_missions: { status: string } | null }[]>,
      must(sb.from('st_assignments').select('mission_id, agreement_state').eq('ranger_id', uid)) as Promise<{ mission_id: string; agreement_state: string }[]>,
      must(sb.from('st_payables').select('*').eq('beneficiary_id', uid)) as Promise<Payable[]>,
    ]);
    const mine = new Set(asg.map((a) => a.mission_id));
    const open = targets.filter((t) => !mine.has(t.mission_id) && ['offered', 'bidding', 'negotiation'].includes(t.st_missions?.status ?? '')).length;
    const pending = pay.filter((p) => p.status !== 'paid' && p.status !== 'rejected').reduce((a, p) => a + Number(p.amount), 0);
    return { open, active: asg.length, toSign: asg.filter((a) => a.agreement_state === 'pending').length, pending };
  });
  return (
    <>
      <section className="st-stats">
        <Stat label="Penawaran terbuka" value={s.data?.open ?? null} hint="Bisa diajukan tawaran" tone="accent" onClick={() => nav('/missions/offers')} live />
        <Stat label="Misi saya" value={s.data?.active ?? null} hint="Ditugaskan ke Anda" tone="violet" onClick={() => nav('/missions/my')} />
        <Stat label="Perjanjian menunggu" value={s.data?.toSign ?? null} hint="Terima sebelum mulai" tone="warn" onClick={() => nav('/missions/my')} />
      </section>
      <Card title="Honor berjalan" desc="Hanya honor milik Anda. Disetujui ≠ sudah ditransfer.">
        <p className="st-big">{s.data ? rupiah(s.data.pending) : '—'}</p>
        <p className="st-muted st-small">Total payable yang belum lunas. Rincian di <Link to="/missions/earnings">Pendapatan</Link>.</p>
      </Card>
      <div className="st-grid2">
        <ComingSoon title="Professional AI Tools">PRD Builder, Design System Builder, dan AI Quality Inspector — belum aktif, tidak ada biaya token.</ComingSoon>
        <ComingSoon title="Affiliate EDU" icon={I.link}>Tautan referral untuk semua peran direncanakan; belum ada komisi.</ComingSoon>
      </div>
      <RecentNotifs />
    </>
  );
}

/* ---------------- Trainer ---------------- */
function TrainerHome() {
  const nav = useNavigate();
  const s = useLoad(() => must(sb.from('st_program_drafts').select('*').order('updated_at', { ascending: false })) as Promise<ProgramDraft[]>);
  const by = (st: string[]) => s.data?.filter((p) => st.includes(p.status)).length ?? null;
  return (
    <>
      <section className="st-stats">
        <Stat label="Draft" value={by(['draft', 'needs_revision'])} hint="Belum diajukan" onClick={() => nav('/creator/programs')} />
        <Stat label="Menunggu review" value={by(['submitted'])} hint="Di meja Commander" tone="violet" onClick={() => nav('/creator/programs')} />
        <Stat label="Disetujui / di EDU" value={by(['approved', 'publish_queued'])} hint="Menunggu tayang" tone="gold" onClick={() => nav('/creator/programs')} />
        <Stat label="Tayang di EDU" value={by(['published'])} hint="Ditayangkan EDU" tone="ok" onClick={() => nav('/creator/programs')} live />
      </section>
      <Card title="Program terbaru" actions={<Link to="/creator/programs" className="st-btn st-btn--primary st-btn--sm"><I.plus size={14} />Program baru</Link>}>
        <Loaded state={s} empty={(d) => (d.length ? null : <Empty title="Belum ada program" icon={I.book}>Mulai dari draft: judul, format, sasaran, dan hasil belajar.</Empty>)}>
          {(d) => <ul className="st-list">{d.slice(0, 5).map((p) => <li key={p.id}><span><b>{p.title}</b><small>{p.type} · diperbarui {ago(p.updated_at)}</small></span><StatusBadge map={PROG_STATUS} value={p.status} /></li>)}</ul>}
        </Loaded>
      </Card>
      <Card title="Laporan peserta & pendapatan" desc="Enrollment, kehadiran, dan penjualan terverifikasi berasal dari EDU.">
        <div className="st-alert st-alert--info">Integrasi order EDU belum aktif — belum ada penjualan terverifikasi untuk dilaporkan. Tidak ada angka yang ditampilkan sampai sumbernya tersedia.</div>
      </Card>
    </>
  );
}

/* ---------------- Learner ---------------- */
function LearnerHome() {
  const { me } = useAuth();
  const s = useLoad(async () => {
    const [lp, pts] = await Promise.all([
      must(sb.from('st_learner_profiles').select('*').eq('person_id', me!.profile.id).maybeSingle()) as Promise<LearnerProfile | null>,
      must(sb.from('st_points').select('*')) as Promise<Points[]>,
    ]);
    return { lp, pts: pts.reduce((a, p) => a + p.points, 0) };
  });
  return (
    <>
      <div className="st-grid3">
        <Card title="Asesmen awal" className="st-card--cta">
          {s.data?.lp ? <p>Tujuan Anda: <b>{s.data.lp.goal}</b>. Diperbarui {ago(s.data.lp.updated_at)}.</p> : <p className="st-muted">Belum diisi. 2–3 menit, berbasis aturan yang bisa dijelaskan.</p>}
          <Link to={s.data?.lp ? '/learn/recommendations' : '/learn/assessment'} className="st-btn st-btn--primary st-btn--sm">{s.data?.lp ? 'Lihat rekomendasi' : 'Mulai asesmen'}<I.arrow size={14} /></Link>
        </Card>
        <Card title="Early Points">
          <p className="st-big">{s.data ? s.data.pts : '—'}<small> poin</small></p>
          <p className="st-muted st-small">{s.data?.pts ? 'Tercatat, belum dapat ditukar.' : 'Kampanye belum aktif untuk akun Anda.'}</p>
          <Link to="/learn/early-points" className="st-linkbtn">Riwayat poin</Link>
        </Card>
        <Card title="Jalur profesional">
          <p className="st-muted st-small">Ingin jadi Ranger, Trainer, atau OPC Founder? Ajukan aplikasi — akses baru hanya setelah seleksi Commander.</p>
          <Link to="/learn/apply" className="st-btn st-btn--ghost st-btn--sm">Ajukan aplikasi</Link>
        </Card>
      </div>
      <Card title="My Learning" desc="Program dengan akses terverifikasi server EDU — dibeli di Studio maupun sebagai tamu dengan email yang sama.">
        <div className="st-row">
          <Link to="/learn/my" className="st-btn st-btn--primary st-btn--sm"><I.book size={14} />Buka My Learning</Link>
          <Link to="/learn/catalog" className="st-btn st-btn--ghost st-btn--sm"><I.search size={14} />Cari program</Link>
          <Link to="/learn/stars" className="st-btn st-btn--ghost st-btn--sm"><I.star size={14} />Star Ranking</Link>
        </div>
      </Card>
      <div className="st-grid2">
        <ComingSoon title="Affiliate card" icon={I.link}>Bagikan program EDU dengan tautan referral — belum ada komisi.</ComingSoon>
        <ComingSoon title="Dede AI Advisor">Panduan belajar dari metodologi founder — belum aktif.</ComingSoon>
      </div>
    </>
  );
}

/* ---------------- Bisnis ---------------- */
function BusinessHome() {
  const nav = useNavigate();
  const s = useLoad(async () => {
    const orgs = await must(sb.from('st_orgs').select('id, name, visibility, verified_identity, verified_ownership, partner_contracted').eq('owner_id', (await sb.auth.getUser()).data.user!.id)) as { id: string; name: string; visibility: string; verified_identity: boolean; verified_ownership: boolean; partner_contracted: boolean }[];
    const ids = orgs.map((o) => o.id);
    const [prod, incoming, ws] = ids.length ? await Promise.all([
      count(sb.from('st_products').select('id', head).in('org_id', ids)),
      count(sb.from('st_requests').select('id', head).in('to_org', ids).eq('status', 'requested')),
      count(sb.from('st_workspaces').select('id', head)),
    ]) : [0, 0, 0];
    return { org: orgs[0] ?? null, prod, incoming, ws };
  });
  return (
    <>
      {s.data && !s.data.org && (
        <div className="st-alert st-alert--info st-alert--row"><span>Lengkapi profil usaha agar bisa memakai VIBOXS Connect dan menambahkan produk.</span><Link to="/business/profile" className="st-btn st-btn--primary st-btn--sm">Buat profil</Link></div>
      )}
      <section className="st-stats">
        <Stat label="Permintaan masuk" value={s.data?.incoming ?? null} hint="Menunggu jawaban Anda" tone="accent" onClick={() => nav('/connect/requests')} live />
        <Stat label="Workspace kolaborasi" value={s.data?.ws ?? null} hint="Aktif dengan mitra" tone="violet" onClick={() => nav('/connect/requests')} />
        <Stat label="Produk" value={s.data?.prod ?? null} hint="Draft & antrean showcase" onClick={() => nav('/business/products')} />
      </section>
      {s.data?.org && (
        <Card title={s.data.org.name} desc="Status verifikasi ditetapkan Commander — tiap badge berarti klaim yang berbeda.">
          <div className="st-row">
            <Badge tone={s.data.org.verified_identity ? 'ok' : 'muted'}>{s.data.org.verified_identity ? '✓ Identity verified' : 'Identitas belum diverifikasi'}</Badge>
            <Badge tone={s.data.org.verified_ownership ? 'ok' : 'muted'}>{s.data.org.verified_ownership ? '✓ Owner verified' : 'Kepemilikan belum diverifikasi'}</Badge>
            <Badge tone={s.data.org.partner_contracted ? 'gold' : 'muted'}>{s.data.org.partner_contracted ? '✓ Partner contracted' : 'Belum partner kontrak'}</Badge>
          </div>
        </Card>
      )}
      <div className="st-grid2">
        <ComingSoon title="Investor Network">Visi eksplorasi jalur evaluasi di masa depan — bukan janji pendanaan, pitching, atau equity.</ComingSoon>
        <ComingSoon title="AI matching Connect" icon={I.compass}>Rekomendasi mitra berbasis profil. Saat ini Connect memakai filter berbasis aturan.</ComingSoon>
      </div>
    </>
  );
}

function RecentNotifs() {
  const s = useLoad(() => must(sb.from('st_notifications').select('*').order('created_at', { ascending: false }).limit(5)) as Promise<Notification[]>);
  return (
    <Card title="Notifikasi terbaru" actions={<Link to="/notifications" className="st-btn st-btn--quiet st-btn--sm">Semua</Link>}>
      <Loaded state={s} empty={(d) => (d.length ? null : <Empty title="Belum ada notifikasi" icon={I.bell} />)}>
        {(d) => <ul className="st-list">{d.map((n) => <li key={n.id}><span><b>{n.title}</b><small>{n.body}</small></span><time className="st-muted st-small">{ago(n.created_at)}</time></li>)}</ul>}
      </Loaded>
    </Card>
  );
}
