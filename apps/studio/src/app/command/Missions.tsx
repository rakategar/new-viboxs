import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAction, useLoad } from '../../lib/hooks';
import { CATEGORY, MISSION_STATUS, ago, fmtDate } from '../../lib/labels';
import { sb, must, type Mission } from '../../lib/sb';
import { Btn, Dialog, Empty, I, Loaded, MissionRail, PageHead, Select, StatusBadge, Tabs, Text, useToast } from '../../ui/kit';

const GROUPS: Record<string, string[]> = {
  active: ['draft', 'offered', 'bidding', 'negotiation', 'assigned_pending_agreement', 'in_progress', 'on_hold', 'submitted', 'review', 'revision_requested', 'accepted', 'disputed'],
  money: ['payable_pending_approval', 'payable_approved'],
  done: ['paid', 'closed', 'withdrawn', 'cancelled'],
};

/** CMD-03/04: daftar mission + buat draft manual. */
export default function Missions() {
  const nav = useNavigate();
  const toast = useToast();
  const [g, setG] = useState<'active' | 'money' | 'done'>('active');
  const [creating, setCreating] = useState(false);
  const s = useLoad(async () => {
    const [m, b, d] = await Promise.all([
      must(sb.from('st_missions').select('*').order('updated_at', { ascending: false }).limit(300)) as Promise<Mission[]>,
      must(sb.from('st_bids').select('mission_id').eq('kind', 'bid')) as Promise<{ mission_id: string }[]>,
      must(sb.from('st_deliverables').select('mission_id').eq('status', 'submitted')) as Promise<{ mission_id: string }[]>,
    ]);
    const bids = new Map<string, number>(); b.forEach((x) => bids.set(x.mission_id, (bids.get(x.mission_id) ?? 0) + 1));
    const qc = new Set(d.map((x) => x.mission_id));
    return m.map((x) => ({ ...x, bids: bids.get(x.id) ?? 0, qc: qc.has(x.id) }));
  });
  const list = useMemo(() => (s.data ?? []).filter((m) => GROUPS[g].includes(m.status)), [s.data, g]);
  const n = (k: string) => (s.data ?? []).filter((m) => GROUPS[k].includes(m.status)).length;
  return (
    <div className="st-page-in">
      <PageHead eyebrow="CMD-03 · Mission Builder" title="Missions" desc="Semua proyek — termasuk yang kecil — dibuat, ditawarkan, dan diputuskan Commander. Auto-award nonaktif permanen.">
        <Btn kind="primary" onClick={() => setCreating(true)}><I.plus size={16} />Mission baru</Btn>
      </PageHead>
      <Tabs label="Kelompok" value={g} onChange={setG} tabs={[['active', 'Berjalan', n('active')], ['money', 'Payable', n('money')], ['done', 'Selesai']]} />
      <Loaded state={s} empty={() => (list.length ? null : <Empty title="Belum ada mission di sini" icon={I.target}>Buat mission manual, atau konversi dari <Link to="/command/leads">lead Services</Link>.</Empty>)}>
        {() => (
          <div className="st-missions">
            {list.map((m, i) => (
              <Link key={m.id} to={`/command/missions/${m.id}`} className="st-mission" style={{ ['--i' as string]: i }}>
                <div className="row-between"><span className="st-mono">{m.ref} · {CATEGORY[m.category]}</span><StatusBadge map={MISSION_STATUS} value={m.status} /></div>
                <b className="st-mission__t">{m.title}</b>
                <MissionRail status={m.status} />
                <div className="st-mission__meta">
                  {m.due_at && <span><I.clock size={14} />Tenggat {fmtDate(m.due_at, false)}</span>}
                  {m.bids > 0 && <span className="is-hot"><I.inbox size={14} />{m.bids} tawaran</span>}
                  {m.qc && <span className="is-hot"><I.check size={14} />Deliverable menunggu QC</span>}
                  <span className="st-muted">diperbarui {ago(m.updated_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Loaded>
      <Create open={creating} onClose={() => setCreating(false)} onDone={(id) => { toast('Draft dibuat — belum terlihat oleh Ranger mana pun.'); nav(`/command/missions/${id}`); }} />
    </div>
  );
}

function Create({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (id: string) => void }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState('web');
  const { busy, run } = useAction();
  const go = () => run('go', async () => {
    if (title.trim().length < 4) throw new Error('Judul minimal 4 karakter.');
    const m = await must(sb.from('st_missions').insert({ title: title.trim(), category: cat }).select('id').single()) as { id: string };
    await must(sb.from('st_mission_private').insert({ mission_id: m.id }));
    return m.id;
  }, (id) => onDone(id), (m) => toast(m, 'err'));
  return (
    <Dialog open={open} onClose={onClose} title="Mission baru (draft)">
      <div className="st-form">
        <Text label="Judul internal" value={title} onChange={setTitle} wide required placeholder="mis. Landing page produk F&B" hint="Judul terlihat Ranger yang ditargetkan — hindari nama klien rahasia." />
        <Select label="Kategori" value={cat} onChange={setCat} options={Object.entries(CATEGORY)} />
        <div className="st-form__act"><Btn kind="primary" onClick={go} busy={busy === 'go'}>Buat draft</Btn></div>
      </div>
    </Dialog>
  );
}
