import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useLoad } from '../../lib/hooks';
import { CATEGORY, MISSION_STATUS, fmtDate } from '../../lib/labels';
import { sb, must, type Mission } from '../../lib/sb';
import { Badge, Empty, I, Loaded, MissionRail, PageHead, StatusBadge } from '../../ui/kit';

/** Ranger: penawaran (hanya yang ditargetkan) & misi yang ditugaskan. RLS menyaring di server. */
export default function RangerList({ mode }: { mode: 'offers' | 'my' }) {
  const { me } = useAuth();
  const s = useLoad(async () => {
    const uid = me!.profile.id;
    const [m, a, b] = await Promise.all([
      must(sb.from('st_missions').select('*').order('updated_at', { ascending: false })) as Promise<Mission[]>,
      must(sb.from('st_assignments').select('mission_id, agreement_state').eq('ranger_id', uid)) as Promise<{ mission_id: string; agreement_state: string }[]>,
      must(sb.from('st_bids').select('mission_id, kind').eq('ranger_id', uid).order('created_at')) as Promise<{ mission_id: string; kind: string }[]>,
    ]);
    const mine = new Map(a.map((x) => [x.mission_id, x.agreement_state]));
    const last = new Map<string, string>(); b.forEach((x) => last.set(x.mission_id, x.kind));
    return m.filter((x) => (mode === 'my' ? mine.has(x.id) : !mine.has(x.id))).map((x) => ({ ...x, agreement: mine.get(x.id), last: last.get(x.id) }));
  }, [mode]);
  const OPEN = ['offered', 'bidding', 'negotiation'];
  return (
    <div className="st-page-in">
      <PageHead eyebrow="VIBOXS Missions" title={mode === 'offers' ? 'Penawaran misi' : 'Misi saya'}
        desc={mode === 'offers' ? 'Hanya misi yang Commander tujukan kepada Anda. Tawaran Anda tidak terlihat oleh Ranger lain.' : 'Misi yang ditugaskan. Terima perjanjian sebelum mulai bekerja.'} />
      <Loaded state={s} empty={(d) => (d.length ? null : <Empty title={mode === 'offers' ? 'Belum ada penawaran untuk Anda' : 'Belum ada misi yang ditugaskan'} icon={I.target}>{mode === 'offers' ? 'Penawaran baru muncul di sini dan sebagai notifikasi realtime. Lengkapi keahlian di Profil agar Commander mudah menargetkan Anda.' : 'Ajukan tawaran pada penawaran yang terbuka.'}</Empty>)}>
        {(d) => (
          <div className="st-missions">
            {d.map((m, i) => {
              const closed = mode === 'offers' && (!OPEN.includes(m.status) || (m.offer_close_at && new Date(m.offer_close_at) < new Date()));
              return (
                <Link key={m.id} to={`/missions/${m.id}`} className={`st-mission ${closed ? 'is-dim' : ''}`} style={{ ['--i' as string]: i }}>
                  <div className="row-between"><span className="st-mono">{m.ref} · {CATEGORY[m.category]}</span>
                    {mode === 'offers' ? (closed ? <Badge tone="muted">Ditutup</Badge> : m.last === 'bid' ? <Badge tone="violet" dot>Tawaran terkirim</Badge> : m.last === 'counter' ? <Badge tone="warn" dot>Ada counteroffer</Badge> : <Badge tone="accent" dot>Terbuka</Badge>)
                      : m.agreement === 'pending' ? <Badge tone="warn" dot>Perjanjian menunggu</Badge> : <StatusBadge map={MISSION_STATUS} value={m.status} />}
                  </div>
                  <b className="st-mission__t">{m.title}</b>
                  {mode === 'my' && <MissionRail status={m.status} />}
                  <p className="st-small st-muted st-clamp">{m.brief}</p>
                  <div className="st-mission__meta">
                    {m.skill_tags.slice(0, 4).map((t) => <span key={t} className="st-tag">{t}</span>)}
                    {m.due_at && <span><I.clock size={14} />Tenggat {fmtDate(m.due_at, false)}</span>}
                    {mode === 'offers' && m.offer_close_at && <span>Penawaran tutup {fmtDate(m.offer_close_at)}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Loaded>
    </div>
  );
}
