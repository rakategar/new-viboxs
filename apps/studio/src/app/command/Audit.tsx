import { useMemo, useState } from 'react';
import { useLoad } from '../../lib/hooks';
import { ENTITY, ROLE, fmtDate } from '../../lib/labels';
import { sb, must, type Audit as Row, type Role } from '../../lib/sb';
import { Empty, I, Loaded, PageHead, Select } from '../../ui/kit';

/** CMD-12: audit append-only (actor, konteks peran, entitas, transisi status). Tanpa isi PII. */
export default function Audit() {
  const [entity, setEntity] = useState('all');
  const s = useLoad(async () => {
    const [a, p] = await Promise.all([
      must(sb.from('st_audit').select('*').order('created_at', { ascending: false }).limit(400)) as Promise<Row[]>,
      must(sb.from('st_profiles').select('id, display_name, email')) as Promise<{ id: string; display_name: string; email: string }[]>,
    ]);
    return { a, who: new Map(p.map((x) => [x.id, x.display_name || x.email])) };
  });
  const list = useMemo(() => (s.data?.a ?? []).filter((x) => entity === 'all' || x.entity === entity), [s.data, entity]);
  return (
    <div className="st-page-in">
      <PageHead eyebrow="CMD-12 · Audit & Integration Health" title="Audit log" desc="Ditulis oleh trigger database — tidak bisa diubah atau dihapus dari aplikasi. Peristiwa tanpa aktor berasal dari sistem/integrasi." />
      <div className="st-toolbar"><Select label="Entitas" value={entity} onChange={setEntity} options={[['all', 'Semua'], ...Object.entries(ENTITY)]} /></div>
      <Loaded state={s} empty={() => (list.length ? null : <Empty title="Belum ada peristiwa" icon={I.shield} />)}>
        {(d) => (
          <div className="st-table st-table--audit">
            <div className="st-tr st-tr--h"><span>Waktu</span><span>Aktor · konteks</span><span>Aksi</span><span>Transisi</span></div>
            {list.map((x, i) => (
              <div key={x.id} className="st-tr" style={{ ['--i' as string]: Math.min(i, 20) }}>
                <span className="st-muted st-small">{fmtDate(x.created_at)}</span>
                <span><b>{x.actor_id ? d.who.get(x.actor_id) ?? x.actor_id.slice(0, 8) : 'Sistem / integrasi'}</b><small>{x.acting_as ? ROLE[x.acting_as as Role]?.label ?? x.acting_as : '—'}</small></span>
                <span>{ENTITY[x.entity] ?? x.entity} · <code>{x.action}</code></span>
                <span className="st-mono st-small">{x.detail?.from ? `${x.detail.from} → ` : ''}{x.detail?.to ?? ''}</span>
              </div>
            ))}
          </div>
        )}
      </Loaded>
    </div>
  );
}
