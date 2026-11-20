import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useAction, useLoad } from '../../lib/hooks';
import { ORG_KIND, VISIBILITY } from '../../lib/labels';
import { sb, must, type Org } from '../../lib/sb';
import { Area, Badge, Btn, Card, I, Loaded, PageHead, Select, TagInput, Text, useToast } from '../../ui/kit';

/** OPC profile & company identity (PRD §10.2). Visibilitas opt-in; badge hanya dari Commander. */
export default function OrgProfile() {
  const { me } = useAuth();
  const s = useLoad(() => must(sb.from('st_orgs').select('*').eq('owner_id', me!.profile.id).order('created_at').limit(1)) as Promise<Org[]>);
  return (
    <div className="st-page-in">
      <PageHead eyebrow="Business identity" title={me!.active_role === 'trainer' ? 'Profil trainer independen' : 'Profil usaha'} desc="Dipakai di VIBOXS Connect. Kontak pribadi tidak pernah ditampilkan — mitra menghubungi lewat permintaan in-app." />
      <Loaded state={s}>{(d) => <Form org={d[0] ?? null} onSaved={s.reload} />}</Loaded>
    </div>
  );
}

function Form({ org, onSaved }: { org: Org | null; onSaved: () => void }) {
  const { me } = useAuth();
  const toast = useToast();
  const defKind = me!.active_role === 'trainer' ? 'trainer' : me!.active_role === 'business_partner' ? 'partner' : me!.active_role === 'collaborator' ? 'collaborator' : 'opc';
  const [f, setF] = useState({ name: '', kind: defKind, sector: '', description: '', website: '', location: '', offers: [] as string[], needs: [] as string[], visibility: 'private' as Org['visibility'] });
  useEffect(() => { if (org) setF({ name: org.name, kind: org.kind, sector: org.sector, description: org.description, website: org.website ?? '', location: org.location ?? '', offers: org.offers, needs: org.needs, visibility: org.visibility }); }, [org]);
  const { busy, run } = useAction();
  const save = () => run('s', async () => {
    if (f.name.trim().length < 2) throw new Error('Isi nama usaha / nama profesional.');
    if (f.website && !/^https?:\/\/\S+\.\S+/.test(f.website)) throw new Error('Website harus diawali http(s)://');
    const row = { ...f, name: f.name.trim(), website: f.website || null, location: f.location || null };
    if (org) await must(sb.from('st_orgs').update(row).eq('id', org.id));
    else await must(sb.from('st_orgs').insert(row));
  }, () => { toast('Profil disimpan.'); onSaved(); }, (e) => toast(e, 'err'));
  return (
    <div className="st-split">
      <Card title={org ? org.name : 'Buat profil'}>
        <div className="st-form">
          <Text label="Nama publik" value={f.name} onChange={(v) => setF({ ...f, name: v })} required />
          <Select label="Jenis" value={f.kind} onChange={(v) => setF({ ...f, kind: v })} options={Object.entries(ORG_KIND)} />
          <Text label="Bidang / sektor" value={f.sector} onChange={(v) => setF({ ...f, sector: v })} placeholder="mis. F&B, edtech, kreator" />
          <Text label="Lokasi (opsional)" value={f.location} onChange={(v) => setF({ ...f, location: v })} />
          <Area label="Deskripsi solusi / layanan" value={f.description} onChange={(v) => setF({ ...f, description: v })} rows={4} hint="Tahap usaha bersifat self-reported. Hindari klaim angka yang belum terverifikasi." />
          <Text label="Website resmi / demo" value={f.website} onChange={(v) => setF({ ...f, website: v })} placeholder="https://" wide />
          <TagInput label="Yang kami tawarkan" value={f.offers} onChange={(v) => setF({ ...f, offers: v })} placeholder="mis. desain, distribusi, pelatihan" />
          <TagInput label="Yang kami cari" value={f.needs} onChange={(v) => setF({ ...f, needs: v })} placeholder="mis. mitra marketing, teknologi" />
          <fieldset className="st-field st-field--wide st-vis">
            <legend>Visibilitas di Connect</legend>
            {(Object.entries(VISIBILITY) as [Org['visibility'], [string, string]][]).map(([k, [l, d]]) => (
              <label key={k} className={`st-radio st-radio--card ${f.visibility === k ? 'is-on' : ''}`}>
                <input type="radio" name="vis" value={k} checked={f.visibility === k} onChange={() => setF({ ...f, visibility: k })} />
                <span className="st-radio__dot" aria-hidden="true">{f.visibility === k && <I.check size={12} />}</span>
                <span><b>{l}</b><small>{d}</small></span>
              </label>
            ))}
          </fieldset>
          <div className="st-form__act"><Btn kind="primary" onClick={save} busy={busy === 's'}>{org ? 'Simpan perubahan' : 'Buat profil'}</Btn></div>
        </div>
      </Card>
      <div className="st-stack">
        <Card title="Status verifikasi" desc="Tiap badge adalah klaim berbeda dan ditetapkan Commander. Auto-publish bukan endorsement.">
          <div className="st-stack st-stack--tight">
            <Badge tone={org?.verified_identity ? 'ok' : 'muted'}>{org?.verified_identity ? '✓' : '○'} Identity verified</Badge>
            <Badge tone={org?.verified_ownership ? 'ok' : 'muted'}>{org?.verified_ownership ? '✓' : '○'} Owner verified</Badge>
            <Badge tone={org?.partner_contracted ? 'gold' : 'muted'}>{org?.partner_contracted ? '✓' : '○'} Partner contracted</Badge>
          </div>
        </Card>
        <Card title="Universe">
          <p className="st-small st-muted">Universe (direktori & listing publik OPC) sedang disiapkan. Profil “Dapat ditemukan” menjadi kandidat listing saat konektor aktif — tidak ada status keanggotaan yang diasumsikan dari akun Studio.</p>
        </Card>
      </div>
    </div>
  );
}
