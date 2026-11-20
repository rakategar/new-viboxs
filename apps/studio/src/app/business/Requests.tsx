import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useAction, useLoad } from '../../lib/hooks';
import { INTENT, REQ_STATUS, WS_APPROVAL, WS_STATUS, ago } from '../../lib/labels';
import { sb, must, rpc, type ConnectRequest, type Org, type Workspace } from '../../lib/sb';
import { Badge, Btn, Empty, I, Loaded, PageHead, StatusBadge, Tabs, useToast } from '../../ui/kit';

/** CON-03/04: terima / tolak / minta info. Mutual consent → workspace unik. */
export default function Requests() {
  const { me } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<'in' | 'out' | 'ws'>('in');
  const s = useLoad(async () => {
    const mine = await must(sb.from('st_orgs').select('id, name').eq('owner_id', me!.profile.id)) as Pick<Org, 'id' | 'name'>[];
    const ids = mine.map((o) => o.id);
    if (!ids.length) return { mine, reqs: [], orgs: new Map<string, string>(), ws: [] };
    const reqs = await must(sb.from('st_requests').select('*').or(`from_org.in.(${ids.join(',')}),to_org.in.(${ids.join(',')})`).order('created_at', { ascending: false })) as ConnectRequest[];
    const other = [...new Set(reqs.flatMap((r) => [r.from_org, r.to_org]))];
    const orgs = other.length ? await must(sb.from('st_orgs').select('id, name').in('id', other)) as Pick<Org, 'id' | 'name'>[] : [];
    const ws = await must(sb.from('st_workspaces').select('*').order('updated_at', { ascending: false })) as Workspace[];
    return { mine, reqs, orgs: new Map(orgs.map((o) => [o.id, o.name])), ws };
  });
  const { busy, run } = useAction();
  const decide = (r: ConnectRequest, d: string) => run(r.id + d, () => rpc('st_decide_request', { p_id: r.id, p_decision: d }), () => { toast(d === 'accepted' ? 'Diterima — workspace kolaborasi dibuat.' : 'Jawaban terkirim.'); s.reload(); }, (e) => toast(e, 'err'));
  const mineIds = new Set(s.data?.mine.map((o) => o.id));
  const incoming = (s.data?.reqs ?? []).filter((r) => mineIds.has(r.to_org));
  const outgoing = (s.data?.reqs ?? []).filter((r) => mineIds.has(r.from_org));
  const name = (id: string) => s.data?.orgs.get(id) ?? 'Organisasi';
  return (
    <div className="st-page-in">
      <PageHead eyebrow="VIBOXS Connect" title="Permintaan & workspace" desc="Kolaborasi independen tidak perlu ACC Commander. VIBOXS bukan pihak kontrak kecuali disepakati & disetujui." />
      <Tabs label="Bagian" value={tab} onChange={setTab} tabs={[['in', 'Masuk', incoming.filter((r) => r.status === 'requested').length], ['out', 'Terkirim'], ['ws', 'Workspace', s.data?.ws.length]]} />
      <Loaded state={s} empty={(d) => (!d.mine.length ? <Empty title="Buat profil usaha dulu" icon={I.user}><Link to="/business/profile" className="st-btn st-btn--primary st-btn--sm">Buat profil</Link></Empty> : null)}>
        {(d) => tab === 'ws' ? (
          !d.ws.length ? <Empty title="Belum ada workspace" icon={I.chat}>Workspace dibuat otomatis saat permintaan diterima kedua pihak.</Empty> : (
            <div className="st-cards">{d.ws.map((w, i) => (
              <Link key={w.id} to={`/connect/workspaces/${w.id}`} className="st-lead" style={{ ['--i' as string]: i }}>
                <span className="row-between"><StatusBadge map={WS_STATUS} value={w.status} />{w.approval && <StatusBadge map={WS_APPROVAL} value={w.approval} />}</span>
                <b>{w.title}</b><span className="st-small st-muted">diperbarui {ago(w.updated_at)}</span>
              </Link>
            ))}</div>
          )
        ) : (
          (tab === 'in' ? incoming : outgoing).length === 0 ? <Empty title={tab === 'in' ? 'Belum ada permintaan masuk' : 'Belum ada permintaan terkirim'} icon={I.chat}>{tab === 'out' && <Link to="/connect/discover">Temukan mitra di Discover</Link>}</Empty> : (
            <ul className="st-reqs">
              {(tab === 'in' ? incoming : outgoing).map((r, i) => (
                <li key={r.id} style={{ ['--i' as string]: i }}>
                  <div className="row-between"><b>{tab === 'in' ? name(r.from_org) : `→ ${name(r.to_org)}`}</b><StatusBadge map={REQ_STATUS} value={r.status} /></div>
                  <span className="st-small"><Badge tone="violet">{INTENT[r.intent]}</Badge>{r.viboxs_involved && <Badge tone="warn">Melibatkan VIBOXS</Badge>}</span>
                  <p className="st-small">{r.message}</p>
                  <div className="row-between"><time className="st-small st-muted">{ago(r.created_at)}</time>
                    {tab === 'in' && ['requested', 'needs_info'].includes(r.status) && (
                      <span className="st-row">
                        <Btn size="sm" kind="quiet" onClick={() => decide(r, 'declined')} busy={busy === r.id + 'declined'}>Tolak</Btn>
                        {r.status === 'requested' && <Btn size="sm" onClick={() => decide(r, 'needs_info')} busy={busy === r.id + 'needs_info'}>Minta info</Btn>}
                        <Btn size="sm" kind="primary" onClick={() => decide(r, 'accepted')} busy={busy === r.id + 'accepted'}><I.check size={14} />Terima</Btn>
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )
        )}
      </Loaded>
    </div>
  );
}
