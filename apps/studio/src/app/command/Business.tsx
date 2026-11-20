import { useState } from 'react';
import { useAction, useLoad } from '../../lib/hooks';
import { ORG_KIND, PRODUCT_STATUS, VISIBILITY, WS_APPROVAL, WS_STATUS, ago } from '../../lib/labels';
import { sb, must, type Org, type Product, type Workspace } from '../../lib/sb';
import { Badge, Btn, Card, Empty, I, Loaded, PageHead, StatusBadge, Tabs, Toggle, useToast } from '../../ui/kit';

/** CMD-09/10: verifikasi badge per klaim, oversight kolaborasi yang melibatkan VIBOXS, moderasi produk. */
export default function Business() {
  const [tab, setTab] = useState<'orgs' | 'approval' | 'products'>('orgs');
  const orgs = useLoad(() => must(sb.from('st_orgs').select('*').order('updated_at', { ascending: false })) as Promise<Org[]>);
  const ws = useLoad(() => must(sb.from('st_workspaces').select('*').order('updated_at', { ascending: false })) as Promise<Workspace[]>);
  const prods = useLoad(() => must(sb.from('st_products').select('*').order('updated_at', { ascending: false })) as Promise<Product[]>);
  return (
    <div className="st-page-in">
      <PageHead eyebrow="CMD-09 · CMD-10" title="OPC & Connect" desc="Kolaborasi B2B independen tidak butuh ACC Commander. Anda hanya memutuskan badge verifikasi, keterlibatan VIBOXS, dan moderasi." />
      <Tabs label="Bagian" value={tab} onChange={setTab} tabs={[['orgs', 'Organisasi & badge', orgs.data?.length], ['approval', 'Libatkan VIBOXS', ws.data?.filter((w) => w.approval === 'awaiting_commander').length], ['products', 'Produk showcase', prods.data?.filter((p) => p.status === 'queued').length]]} />
      {tab === 'orgs' && <Loaded state={orgs} empty={(d) => (d.length ? null : <Empty title="Belum ada profil bisnis" icon={I.users}>Profil dibuat oleh OPC Founder / Partner setelah undangan diterima.</Empty>)}>{(d) => <div className="st-people">{d.map((o, i) => <OrgCard key={o.id} o={o} i={i} onDone={orgs.reload} />)}</div>}</Loaded>}
      {tab === 'approval' && <Loaded state={ws} empty={(d) => (d.length ? null : <Empty title="Tidak ada kolaborasi yang melibatkan VIBOXS" icon={I.link}>Workspace privat antar bisnis tidak terlihat di sini kecuali para pihak meminta keterlibatan VIBOXS.</Empty>)}>{(d) => <div className="st-people">{d.map((w) => <WsCard key={w.id} w={w} onDone={ws.reload} />)}</div>}</Loaded>}
      {tab === 'products' && <Loaded state={prods} empty={(d) => (d.length ? null : <Empty title="Belum ada produk" icon={I.box} />)}>{(d) => <ProductMod list={d} onDone={prods.reload} />}</Loaded>}
    </div>
  );
}

function OrgCard({ o, i, onDone }: { o: Org; i: number; onDone: () => void }) {
  const toast = useToast();
  const set = async (k: 'verified_identity' | 'verified_ownership' | 'partner_contracted', v: boolean) => {
    const { error } = await sb.from('st_orgs').update({ [k]: v }).eq('id', o.id);
    if (error) toast(error.message, 'err'); else { toast('Badge diperbarui & tercatat di audit.'); onDone(); }
  };
  return (
    <article className="st-person" style={{ ['--i' as string]: i }}>
      <header><span className="st-avatar" aria-hidden="true">{o.name.slice(0, 2).toUpperCase()}</span><span><b>{o.name}</b><small>{ORG_KIND[o.kind]} · {o.sector || 'sektor belum diisi'} · {VISIBILITY[o.visibility][0]}</small></span></header>
      {o.description && <p className="st-small st-muted st-clamp">{o.description}</p>}
      {o.website && <a className="st-url" href={o.website} target="_blank" rel="noopener noreferrer nofollow"><I.ext size={14} />{o.website}</a>}
      <div className="st-stack st-stack--tight">
        <Toggle label="Identity verified" hint="Identitas penanggung jawab diperiksa." checked={o.verified_identity} onChange={(v) => set('verified_identity', v)} />
        <Toggle label="Owner verified" hint="Kepemilikan usaha/produk dibuktikan." checked={o.verified_ownership} onChange={(v) => set('verified_ownership', v)} />
        <Toggle label="Partner contracted" hint="Ada perjanjian kemitraan dengan VIBOXS." checked={o.partner_contracted} onChange={(v) => set('partner_contracted', v)} />
      </div>
    </article>
  );
}

function WsCard({ w, onDone }: { w: Workspace; onDone: () => void }) {
  const toast = useToast();
  const { busy, run } = useAction();
  const decide = (approval: string) => run(approval, async () => { await must(sb.from('st_workspaces').update({ approval }).eq('id', w.id)); }, () => { toast('Keputusan dicatat.'); onDone(); }, (e) => toast(e, 'err'));
  return (
    <article className="st-person">
      <header><span className="st-avatar" aria-hidden="true"><I.link size={16} /></span><span><b>{w.title}</b><small>diperbarui {ago(w.updated_at)}</small></span></header>
      <div className="st-row"><StatusBadge map={WS_STATUS} value={w.status} />{w.approval && <StatusBadge map={WS_APPROVAL} value={w.approval} />}</div>
      <p className="st-hint">Para pihak meminta VIBOXS terlibat (brand, Rangers, harga khusus, aset, atau menjadi pihak kontrak). Isi percakapan tetap privat.</p>
      {w.approval === 'awaiting_commander' && <div className="st-row"><Btn size="sm" kind="danger" onClick={() => decide('denied_viboxs_scope')} busy={busy === 'denied_viboxs_scope'}>Tolak lingkup VIBOXS</Btn><Btn size="sm" kind="primary" onClick={() => decide('approved_viboxs_scope')} busy={busy === 'approved_viboxs_scope'}>Setujui lingkup VIBOXS</Btn></div>}
    </article>
  );
}

function ProductMod({ list, onDone }: { list: Product[]; onDone: () => void }) {
  const toast = useToast();
  const set = async (p: Product, status: string) => {
    const { error } = await sb.from('st_products').update({ status }).eq('id', p.id);
    if (error) toast(error.message, 'err'); else { toast('Status produk diperbarui.'); onDone(); }
  };
  return (
    <Card title="Antrean showcase" desc="Konektor Universe belum aktif — tidak ada produk yang ditandai tayang. Gunakan moderasi untuk tautan/klaim bermasalah.">
      <ul className="st-list">
        {list.map((p) => (
          <li key={p.id}>
            <span><b>{p.name}</b><small>{p.tagline || p.category}{p.url ? ` · ${p.url}` : ''}</small></span>
            <StatusBadge map={PRODUCT_STATUS} value={p.status} />
            {p.status === 'flagged' ? <Btn size="sm" onClick={() => set(p, 'draft')}>Lepas tanda</Btn> : <Btn size="sm" kind="danger" onClick={() => set(p, 'flagged')}>Tandai</Btn>}
          </li>
        ))}
      </ul>
      <Badge tone="muted">Universe · Sedang disiapkan</Badge>
    </Card>
  );
}
