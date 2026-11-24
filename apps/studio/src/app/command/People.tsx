import { useMemo, useState } from 'react';
import { useAction, useLoad } from '../../lib/hooks';
import { ROLE, INVITE_STATUS, GRANT_STATUS, ago, fmtDate } from '../../lib/labels';
import { sb, must, rpc, authOrigin, type Grant, type Invite, type Profile, type Role } from '../../lib/sb';
import { Area, Btn, Chips, Copy, Dialog, Empty, I, Loaded, PageHead, Select, StatusBadge, Tabs, Text, useToast } from '../../ui/kit';

export const inviteUrl = (token: string) => `${authOrigin()}/invite/${token}`;
const PRO: Role[] = ['ranger', 'trainer', 'opc_founder', 'business_partner', 'collaborator'];

/** CMD-01: undangan sekali pakai + peran per orang (tambah / tangguhkan / cabut). */
export default function People() {
  const toast = useToast();
  const [tab, setTab] = useState<'people' | 'invites'>('people');
  const [creating, setCreating] = useState(false);
  const people = useLoad(async () => {
    const [p, g] = await Promise.all([
      must(sb.from('st_profiles').select('id, display_name, email, headline, skills, created_at').order('created_at', { ascending: false })) as Promise<Profile[]>,
      must(sb.from('st_role_grants').select('*').order('created_at')) as Promise<Grant[]>,
    ]);
    return p.map((x) => ({ ...x, grants: g.filter((y) => y.person_id === x.id) }));
  });
  const invites = useLoad(() => must(sb.from('st_invites').select('id, email, roles, status, expires_at, created_at, accepted_at, application_id').order('created_at', { ascending: false }).limit(200)) as Promise<Invite[]>);
  const pendingInv = (invites.data ?? []).filter((i) => i.status === 'pending' && new Date(i.expires_at) > new Date()).length;

  return (
    <div className="st-page-in">
      <PageHead eyebrow="CMD-01 · Akses" title="Orang & undangan" desc="Satu identitas bisa punya beberapa peran. Mencabut peran langsung memutus akses server pada permintaan berikutnya.">
        <Btn kind="primary" onClick={() => setCreating(true)}><I.key size={16} />Buat undangan</Btn>
      </PageHead>
      <Tabs label="Bagian" value={tab} onChange={setTab} tabs={[['people', 'Orang', people.data?.length], ['invites', 'Undangan', pendingInv]]} />
      {tab === 'people' ? (
        <Loaded state={people} empty={(d) => (d.length ? null : <Empty title="Belum ada akun" icon={I.users} />)}>
          {(d) => <div className="st-people">{d.map((p, i) => <PersonCard key={p.id} p={p} i={i} onChange={people.reload} />)}</div>}
        </Loaded>
      ) : (
        <Loaded state={invites} empty={(d) => (d.length ? null : <Empty title="Belum ada undangan" icon={I.key}>Undangan dibuat dari aplikasi yang disetujui atau langsung dari tombol di atas.</Empty>)}>
          {(d) => (
            <div className="st-table">
              <div className="st-tr st-tr--h"><span>Email</span><span>Peran</span><span>Status</span><span>Berlaku s.d.</span><span /></div>
              {d.map((x, i) => {
                const expired = x.status === 'pending' && new Date(x.expires_at) < new Date();
                return (
                  <div key={x.id} className="st-tr" style={{ ['--i' as string]: i }}>
                    <span><b>{x.email}</b><small>dibuat {ago(x.created_at)}</small></span>
                    <span>{x.roles.map((r) => ROLE[r].label).join(', ')}</span>
                    <span><StatusBadge map={INVITE_STATUS} value={expired ? 'expired' : x.status} /></span>
                    <span className="st-muted">{fmtDate(x.expires_at)}</span>
                    <span>{x.status === 'pending' && !expired && <Btn size="sm" kind="quiet" onClick={async () => { const { error } = await sb.from('st_invites').update({ status: 'revoked' }).eq('id', x.id); if (error) toast(error.message, 'err'); else { toast('Undangan dicabut.'); invites.reload(); } }}>Cabut</Btn>}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Loaded>
      )}
      <CreateInvite open={creating} onClose={() => setCreating(false)} onDone={() => invites.reload()} />
    </div>
  );
}

function PersonCard({ p, i, onChange }: { p: Profile & { grants: Grant[] }; i: number; onChange: () => void }) {
  const toast = useToast();
  const [edit, setEdit] = useState(false);
  const [role, setRole] = useState<Role>('ranger');
  const [note, setNote] = useState('');
  const { busy, run } = useAction();
  const set = (r: Role, status: string) => run(r + status, async () => {
    if (status !== 'active' && note.trim().length < 5) throw new Error('Tulis alasan (min. 5 karakter) untuk audit.');
    await rpc('st_set_grant', { p_person: p.id, p_role: r, p_status: status, p_note: note.trim() || null });
  }, () => { toast('Peran diperbarui.'); setNote(''); onChange(); }, (m) => toast(m, 'err'));
  const active = p.grants.filter((g) => g.status !== 'revoked');
  return (
    <article className="st-person" style={{ ['--i' as string]: i }}>
      <header>
        <span className="st-avatar" aria-hidden="true">{(p.display_name || p.email || '?').slice(0, 2).toUpperCase()}</span>
        <span><b>{p.display_name || '—'}</b><small>{p.email}</small></span>
        <Btn size="sm" kind="quiet" onClick={() => setEdit((e) => !e)} aria-expanded={edit}>{edit ? 'Tutup' : 'Kelola'}</Btn>
      </header>
      <div className="st-row">{active.length ? active.map((g) => <span key={g.id} className={`st-rolechip ${g.status === 'suspended' ? 'is-off' : ''}`}>{ROLE[g.role].label}{g.status === 'suspended' && ' · ditangguhkan'}</span>) : <span className="st-muted st-small">Tanpa peran aktif</span>}</div>
      {p.skills?.length > 0 && <p className="st-small st-muted">{p.skills.join(' · ')}</p>}
      {edit && (
        <div className="st-person__edit">
          <Area label="Alasan / catatan audit" value={note} onChange={setNote} rows={2} hint="Wajib untuk tangguhkan/cabut." />
          <ul className="st-list">
            {active.filter((g) => g.role !== 'commander').map((g) => (
              <li key={g.id}><span><b>{ROLE[g.role].label}</b></span><StatusBadge map={GRANT_STATUS} value={g.status} />
                <span className="st-row">
                  {g.status === 'active' ? <Btn size="sm" onClick={() => set(g.role, 'suspended')} busy={busy === g.role + 'suspended'}>Tangguhkan</Btn> : <Btn size="sm" onClick={() => set(g.role, 'active')} busy={busy === g.role + 'active'}>Aktifkan</Btn>}
                  <Btn size="sm" kind="danger" onClick={() => set(g.role, 'revoked')} busy={busy === g.role + 'revoked'}>Cabut</Btn>
                </span></li>
            ))}
          </ul>
          <div className="st-inline">
            <Select label="Tambah peran (REC-08)" value={role} onChange={setRole} options={PRO.map((r) => [r, ROLE[r].label])} />
            <Btn onClick={() => set(role, 'active')} busy={busy === role + 'active'}><I.plus size={14} />Beri peran</Btn>
          </div>
        </div>
      )}
    </article>
  );
}

function CreateInvite({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<string[]>(['ranger']);
  const [days, setDays] = useState('7');
  const [link, setLink] = useState('');
  const { busy, run } = useAction();
  const opts = useMemo(() => PRO.map((r) => [r, ROLE[r].label] as [string, string]), []);
  const go = () => run('go', async () => {
    const r = await rpc<{ token: string }>('st_create_invite', { p_email: email.trim(), p_roles: roles, p_application: null, p_days: Number(days) });
    setLink(inviteUrl(r.token));
  }, () => { onDone(); }, (m) => toast(m, 'err'));
  const close = () => { setLink(''); setEmail(''); onClose(); };
  return (
    <Dialog open={open} onClose={close} title="Undangan akses profesional">
      {link ? (
        <div className="st-invite-out">
          <span className="st-eyebrow">Tautan sekali pakai · {email}</span>
          <code>{link}</code>
          <div className="st-row"><Copy text={link} label="Salin tautan" /><a className="st-btn st-btn--ghost st-btn--sm" href={`mailto:${email}?subject=${encodeURIComponent('Undangan VIBOXS Studio')}&body=${encodeURIComponent(`Halo,\n\nAnda diundang ke VIBOXS Studio sebagai ${roles.map((r) => ROLE[r as Role].label).join(', ')}.\nAktifkan melalui tautan sekali pakai ini (berlaku ${days} hari):\n${link}\n\nGunakan email ${email} saat membuat akun/masuk.\n\nCommander VIBOXS`)}`}><I.ext size={14} />Buka email</a></div>
          <p className="st-hint">Undangan lama untuk email yang sama otomatis dicabut. Token tidak bisa dilihat lagi setelah dialog ditutup.</p>
          <Btn kind="primary" onClick={close}>Selesai</Btn>
        </div>
      ) : (
        <div className="st-form">
          <Text label="Email penerima" type="email" value={email} onChange={setEmail} required wide />
          <Chips label="Peran yang diberikan" options={opts} value={roles} onChange={setRoles} hint="Peran diaktifkan hanya setelah undangan diterima oleh email yang sama." />
          <Select label="Masa berlaku" value={days} onChange={setDays} options={[['3', '3 hari'], ['7', '7 hari'], ['14', '14 hari'], ['30', '30 hari']]} />
          <div className="st-form__act"><Btn kind="primary" onClick={go} busy={busy === 'go'} disabled={!email || !roles.length}><I.key size={16} />Buat tautan undangan</Btn></div>
        </div>
      )}
    </Dialog>
  );
}
