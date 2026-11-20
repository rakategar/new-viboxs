import { Link, useParams } from 'react-router-dom';
import { useAction, useLoad } from '../../lib/hooks';
import { WS_APPROVAL, WS_STATUS, fmtDate } from '../../lib/labels';
import { sb, must, type Workspace } from '../../lib/sb';
import { Btn, Card, Empty, I, Loaded, PageHead, Select, StatusBadge, useToast } from '../../ui/kit';
import Thread from '../Thread';

/** CON-05..08: workspace dua pihak — ACL per kolaborasi, tidak terlihat jaringan lain atau Missions. */
export default function WorkspaceRoom() {
  const { id = '' } = useParams();
  const toast = useToast();
  const s = useLoad(async () => {
    const { data, error } = await sb.from('st_workspaces').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data as Workspace | null;
  }, [id]);
  const { busy, run } = useAction();
  const update = (patch: Partial<Workspace>) => run('u', async () => { await must(sb.from('st_workspaces').update(patch).eq('id', id)); }, () => { toast('Workspace diperbarui.'); s.reload(); }, (e) => toast(e, 'err'));
  return (
    <div className="st-page-in">
      <Link to="/connect/requests" className="st-back"><I.back size={16} />Permintaan & workspace</Link>
      <Loaded state={s}>
        {(w) => !w ? <Empty title="Workspace tidak tersedia" icon={I.lock}>Hanya para pihak kolaborasi yang dapat membuka workspace ini.</Empty> : (
          <>
            <PageHead eyebrow="Collaboration workspace" title={w.title} desc={<>Dibuat {fmtDate(w.created_at, false)} · <StatusBadge map={WS_STATUS} value={w.status} /> {w.approval && <StatusBadge map={WS_APPROVAL} value={w.approval} />}</>} />
            <div className="st-split">
              <Card title="Diskusi" desc="Privat untuk kedua pihak. Commander tidak membaca percakapan ini."><Thread type="workspace" threadId={w.id} /></Card>
              <div className="st-stack">
                <Card title="Status kolaborasi">
                  <Select label="Tahap" value={w.status} onChange={(v) => update({ status: v })} options={Object.entries(WS_STATUS).map(([k, [l]]) => [k, l])} />
                  <p className="st-hint">“Disepakati” berarti para pihak bersepakat — tidak ada pendapatan atau kewajiban ke VIBOXS dari status ini.</p>
                </Card>
                <Card title="Kontrak antar pihak">
                  <p className="st-small st-muted">Unggah & tanda tangan dilakukan para pihak. Penyimpanan berkas kontrak di Studio (dengan akses bertanda tangan & versi) masuk tahap berikutnya — sementara simpan di penyimpanan Anda dan catat versinya di diskusi.</p>
                </Card>
                <Card title="Keterlibatan VIBOXS">
                  {w.approval ? <StatusBadge map={WS_APPROVAL} value={w.approval} /> : (
                    <>
                      <p className="st-small st-muted">Butuh brand VIBOXS, Rangers, harga khusus, aset, equity, atau VIBOXS sebagai pihak kontrak? Ajukan ke Commander.</p>
                      <Btn size="sm" onClick={() => update({ approval: 'awaiting_commander' })} busy={busy === 'u'}>Minta keterlibatan VIBOXS</Btn>
                    </>
                  )}
                </Card>
              </div>
            </div>
          </>
        )}
      </Loaded>
    </div>
  );
}
