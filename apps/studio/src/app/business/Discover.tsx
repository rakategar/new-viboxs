import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useAction, useLoad } from '../../lib/hooks';
import { INTENT, ORG_KIND } from '../../lib/labels';
import { sb, must, type Org } from '../../lib/sb';
import { Area, Badge, Btn, Check, Dialog, Empty, I, Loaded, PageHead, Select, useToast } from '../../ui/kit';

/** CON-01/02: discovery berbasis aturan, hanya profil opt-in. Kontak pribadi tidak pernah dibuka. */
export default function Discover() {
  const { me } = useAuth();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('all');
  const [target, setTarget] = useState<Org | null>(null);
  const s = useLoad(async () => {
    const all = await must(sb.from('st_orgs').select('*').in('visibility', ['network', 'discoverable']).order('updated_at', { ascending: false })) as Org[];
    const mine = await must(sb.from('st_orgs').select('*').eq('owner_id', me!.profile.id)) as Org[];
    return { list: all.filter((o) => o.owner_id !== me!.profile.id), mine };
  });
  const list = useMemo(() => (s.data?.list ?? []).filter((o) => (kind === 'all' || o.kind === kind)
    && (!q || `${o.name} ${o.sector} ${o.description} ${o.offers.join(' ')} ${o.needs.join(' ')}`.toLowerCase().includes(q.toLowerCase()))), [s.data, q, kind]);
  const myNeeds = new Set((s.data?.mine[0]?.needs ?? []).map((x) => x.toLowerCase()));
  return (
    <div className="st-page-in">
      <PageHead eyebrow="VIBOXS Connect" title="Discover" desc="Bisnis terverifikasi yang memilih terlihat di jaringan. Matching adalah discovery — bukan kewajiban berkontrak." />
      <div className="st-toolbar">
        <label className="st-search"><I.search size={16} /><input placeholder="Cari bidang, layanan, kebutuhan…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari bisnis" /></label>
        <Select label="Jenis" value={kind} onChange={setKind} options={[['all', 'Semua'], ...Object.entries(ORG_KIND)]} />
      </div>
      <Loaded state={s} empty={(d) => (!d.mine.length ? <Empty title="Buat profil usaha untuk memakai Connect" icon={I.user}><Link to="/business/profile" className="st-btn st-btn--primary st-btn--sm">Buat profil</Link></Empty> : !list.length ? <Empty title="Belum ada bisnis yang cocok" icon={I.compass}>Jaringan masih kecil, atau filter terlalu sempit. Tidak ada profil fiktif yang ditampilkan.</Empty> : null)}>
        {() => (
          <div className="st-orgs">
            {list.map((o, i) => {
              const fit = o.offers.filter((x) => myNeeds.has(x.toLowerCase()));
              return (
                <article key={o.id} className="st-org" style={{ ['--i' as string]: i }}>
                  <header><span className="st-avatar st-avatar--lg" aria-hidden="true">{o.name.slice(0, 2).toUpperCase()}</span><span><b>{o.name}</b><small>{ORG_KIND[o.kind]}{o.sector ? ` · ${o.sector}` : ''}{o.location ? ` · ${o.location}` : ''}</small></span></header>
                  <div className="st-row">{o.verified_identity && <Badge tone="ok">✓ Identity</Badge>}{o.verified_ownership && <Badge tone="ok">✓ Owner</Badge>}{o.partner_contracted && <Badge tone="gold">Partner</Badge>}</div>
                  <p className="st-small st-muted st-clamp">{o.description || 'Belum ada deskripsi.'}</p>
                  {o.offers.length > 0 && <div className="st-taglist"><small>Menawarkan</small>{o.offers.map((x) => <span key={x} className={`st-tag ${fit.includes(x) ? 'is-fit' : ''}`}>{x}</span>)}</div>}
                  {o.needs.length > 0 && <div className="st-taglist"><small>Mencari</small>{o.needs.map((x) => <span key={x} className="st-tag">{x}</span>)}</div>}
                  <div className="row-between">{fit.length > 0 ? <span className="st-small st-pos">{fit.length} cocok dengan kebutuhan Anda</span> : <span />}<Btn size="sm" kind="primary" onClick={() => setTarget(o)}>Ajukan kolaborasi</Btn></div>
                </article>
              );
            })}
          </div>
        )}
      </Loaded>
      {target && s.data?.mine[0] && <RequestDialog to={target} from={s.data.mine} onClose={() => setTarget(null)} />}
    </div>
  );
}

function RequestDialog({ to, from, onClose }: { to: Org; from: Org[]; onClose: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ from_org: from[0].id, intent: 'OTHER_B2B', message: '', viboxs_involved: false });
  const { busy, run } = useAction();
  const go = () => run('s', async () => {
    if (f.message.trim().length < 10) throw new Error('Jelaskan maksud kolaborasi (min. 10 karakter).');
    await must(sb.from('st_requests').insert({ ...f, to_org: to.id, message: f.message.trim() }));
  }, () => { toast('Permintaan terkirim. Kontak tidak dibuka sampai kedua pihak setuju.'); onClose(); }, (e) => toast(e, 'err'));
  return (
    <Dialog open onClose={onClose} title={`Kolaborasi dengan ${to.name}`}>
      <div className="st-form">
        {from.length > 1 && <Select label="Atas nama" value={f.from_org} onChange={(v) => setF({ ...f, from_org: v })} options={from.map((o) => [o.id, o.name])} />}
        <Select label="Jenis kebutuhan" value={f.intent} onChange={(v) => setF({ ...f, intent: v })} options={Object.entries(INTENT)} wide />
        <Area label="Pesan" value={f.message} onChange={(v) => setF({ ...f, message: v })} rows={4} hint="Jangan sertakan nomor pribadi. Percakapan berlanjut di workspace setelah diterima." />
        <div className="st-field st-field--wide"><Check label="Kolaborasi ini melibatkan VIBOXS" hint="Brand/aset VIBOXS, Rangers, harga khusus, equity, atau VIBOXS sebagai pihak kontrak → butuh approval Commander." checked={f.viboxs_involved} onChange={(v) => setF({ ...f, viboxs_involved: v })} /></div>
        <div className="st-form__act"><Btn kind="primary" onClick={go} busy={busy === 's'}>Kirim permintaan</Btn></div>
      </div>
    </Dialog>
  );
}
