import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useAction, useLoad } from '../../lib/hooks';
import { PRODUCT_STATUS, ago } from '../../lib/labels';
import { sb, must, type Org, type Product } from '../../lib/sb';
import { Btn, Dialog, Empty, I, Loaded, PageHead, Select, StatusBadge, Text, useToast } from '../../ui/kit';

/** OPC-01..09: draft produk showcase. Konektor Universe belum aktif → "Antre", tidak pernah "Tayang" palsu. */
export default function Products() {
  const { me } = useAuth();
  const toast = useToast();
  const s = useLoad(async () => {
    const orgs = await must(sb.from('st_orgs').select('id, name').eq('owner_id', me!.profile.id)) as Pick<Org, 'id' | 'name'>[];
    const prods = orgs.length ? await must(sb.from('st_products').select('*').in('org_id', orgs.map((o) => o.id)).order('updated_at', { ascending: false })) as Product[] : [];
    return { orgs, prods };
  });
  const [edit, setEdit] = useState<Product | 'new' | null>(null);
  const setStatus = async (p: Product, status: string) => {
    const { error } = await sb.from('st_products').update({ status }).eq('id', p.id);
    if (error) toast(error.message, 'err'); else { toast(status === 'queued' ? 'Masuk antrean Universe. Akan diproses saat konektor aktif.' : 'Status produk diperbarui.'); s.reload(); }
  };
  return (
    <div className="st-page-in">
      <PageHead eyebrow="Showcase" title="Produk & showcase" desc="Produk milik Anda — bukan otomatis milik PT EPH. Publikasi ke Universe otomatis setelah validasi dasar, saat konektor siap.">
        {s.data?.orgs.length ? <Btn kind="primary" onClick={() => setEdit('new')}><I.plus size={16} />Produk baru</Btn> : null}
      </PageHead>
      <div className="st-alert st-alert--warn"><I.clock size={16} /><span>Konektor Universe <b>belum aktif</b>. Produk yang Anda ajukan berstatus “Antre” — tidak ditampilkan publik dan tidak ada klaim “sudah tayang”.</span></div>
      <Loaded state={s} empty={(d) => (!d.orgs.length ? <Empty title="Buat profil usaha dulu" icon={I.user}><Link to="/business/profile" className="st-btn st-btn--primary st-btn--sm">Buat profil</Link></Empty> : !d.prods.length ? <Empty title="Belum ada produk" icon={I.box}>Tambahkan aplikasi, alat digital, atau layanan yang Anda miliki.</Empty> : null)}>
        {(d) => (
          <div className="st-cards">
            {d.prods.map((p, i) => (
              <article key={p.id} className="st-lead" style={{ ['--i' as string]: i }}>
                <span className="row-between"><span className="st-mono">{p.category || 'Produk'} · {p.platform}</span><StatusBadge map={PRODUCT_STATUS} value={p.status} /></span>
                <b>{p.name}</b>
                <span className="st-small st-muted st-clamp">{p.tagline}</span>
                {p.url && <a className="st-url" href={p.url} target="_blank" rel="noopener noreferrer nofollow"><I.ext size={14} />{p.url}</a>}
                <span className="row-between"><span className="st-small st-muted">{ago(p.updated_at)}</span>
                  <span className="st-row">
                    {p.status !== 'flagged' && <Btn size="sm" kind="quiet" onClick={() => setEdit(p)}>Edit</Btn>}
                    {p.status === 'draft' && <Btn size="sm" onClick={() => setStatus(p, 'queued')}>Ajukan ke Universe</Btn>}
                    {p.status === 'queued' && <Btn size="sm" kind="quiet" onClick={() => setStatus(p, 'draft')}>Tarik dari antrean</Btn>}
                  </span>
                </span>
              </article>
            ))}
          </div>
        )}
      </Loaded>
      {edit && s.data && <Edit p={edit === 'new' ? null : edit} orgs={s.data.orgs} onClose={() => setEdit(null)} onDone={() => { setEdit(null); s.reload(); }} />}
    </div>
  );
}

function Edit({ p, orgs, onClose, onDone }: { p: Product | null; orgs: Pick<Org, 'id' | 'name'>[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ org_id: p?.org_id ?? orgs[0].id, name: p?.name ?? '', tagline: p?.tagline ?? '', category: p?.category ?? '', platform: p?.platform ?? 'web', url: p?.url ?? '' });
  const { busy, run } = useAction();
  const save = () => run('s', async () => {
    if (f.name.trim().length < 2) throw new Error('Isi nama produk.');
    if (f.url && !/^https:\/\/[^\s/]+\.[^\s]+/.test(f.url)) throw new Error('Tautan harus https:// dan valid.');
    const row = { ...f, name: f.name.trim(), url: f.url || null };
    if (p) await must(sb.from('st_products').update(row).eq('id', p.id));
    else await must(sb.from('st_products').insert({ ...row, status: 'draft' }));
  }, () => { toast('Produk disimpan sebagai draft.'); onDone(); }, (e) => toast(e, 'err'));
  return (
    <Dialog open onClose={onClose} title={p ? 'Edit produk' : 'Produk baru'}>
      <div className="st-form">
        {orgs.length > 1 && <Select label="Organisasi" value={f.org_id} onChange={(v) => setF({ ...f, org_id: v })} options={orgs.map((o) => [o.id, o.name])} />}
        <Text label="Nama produk" value={f.name} onChange={(v) => setF({ ...f, name: v })} required />
        <Text label="Kategori fungsi" value={f.category} onChange={(v) => setF({ ...f, category: v })} placeholder="mis. kasir, CRM, template" />
        <Text label="Tagline" value={f.tagline} onChange={(v) => setF({ ...f, tagline: v })} wide />
        <Select label="Platform" value={f.platform} onChange={(v) => setF({ ...f, platform: v })} options={[['web', 'Web'], ['android', 'Android / Play Store'], ['ios', 'iOS / App Store'], ['desktop', 'Desktop'], ['service', 'Layanan']]} />
        <Text label="Tautan resmi" value={f.url} onChange={(v) => setF({ ...f, url: v })} placeholder="https://" wide hint="Domain diperiksa saat moderasi. Klik ≠ pembelian." />
        <div className="st-form__act"><Btn kind="primary" onClick={save} busy={busy === 's'}>Simpan</Btn></div>
      </div>
    </Dialog>
  );
}
