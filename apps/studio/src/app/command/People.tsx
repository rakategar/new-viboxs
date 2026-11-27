import { useMemo, useState } from 'react';
import { useAction, useLoad } from '../../lib/hooks';
import { ROLE, INVITE_STATUS, GRANT_STATUS, OUTBOX_STATUS, RANGER_STATUS, ago, fmtDate } from '../../lib/labels';
import { sb, must, rpc, sendOutbox, type Grant, type Invite, type OutboxRow, type Profile, type RangerStatus, type Role } from '../../lib/sb';
import { Area, Badge, Btn, Check, Chips, Dialog, Empty, I, Loaded, PageHead, Select, StatusBadge, Tabs, Text, useToast } from '../../ui/kit';

const PRO: Role[] = ['ranger', 'trainer', 'opc_founder', 'business_partner', 'collaborator'];

/** CMD-01: undangan sekali pakai + peran per orang (tambah / tangguhkan / cabut). */
export default function People() {
  const toast = useToast();
  const [tab, setTab] = useState<'people' | 'invites' | 'rangers'>('people');
  const [creating, setCreating] = useState(false);
  const people = useLoad(async () => {
    const [p, g] = await Promise.all([
      must(sb.from('st_profiles').select('id, display_name, email, headline, skills, created_at, is_demo').order('created_at', { ascending: false })) as Promise<Profile[]>,
      must(sb.from('st_role_grants').select('*').order('created_at')) as Promise<Grant[]>,
    ]);
    return p.map((x) => ({ ...x, grants: g.filter((y) => y.person_id === x.id) }));
  });
  const invites = useLoad(async () => {
    const inv = await must(sb.from('st_invites').select('id, email, roles, status, expires_at, created_at, accepted_at, application_id, resend_requested_at').order('created_at', { ascending: false }).limit(200)) as Invite[];
    const ob = inv.length ? await must(sb.from('st_outbox').select('*').eq('topic', 'invite.activation').in('aggregate_id', inv.map((i) => i.id))) as OutboxRow[] : [];
    return inv.map((i) => ({ ...i, ob: ob.find((o) => o.aggregate_id === i.id) ?? null }));
  });
  const { busy, run } = useAction();
  const reissue = (id: string) => run(id, async () => { await rpc('st_invite_reissue', { p_invite: id }); return sendOutbox(); },
    (r) => { toast(r?.failed ? 'Undangan baru dibuat; email dicoba lagi otomatis.' : 'Undangan baru dikirim. Tautan lama tidak berlaku.'); invites.reload(); }, (m) => toast(m, 'err'));
  const pendingInv = (invites.data ?? []).filter((i) => i.status === 'pending' && new Date(i.expires_at) > new Date()).length;
  const rangers = useLoad(() => must(sb.from('st_ranger_status').select('*').order('updated_at', { ascending: false })) as Promise<RangerStatus[]>);

  return (
    <div className="st-page-in">
      <PageHead eyebrow="CMD-01 · Akses" title="Orang & undangan" desc="Satu identitas bisa punya beberapa peran. Mencabut peran langsung memutus akses server pada permintaan berikutnya.">
        <Btn kind="primary" onClick={() => setCreating(true)}><I.key size={16} />Buat undangan</Btn>
      </PageHead>
      <Tabs label="Bagian" value={tab} onChange={setTab} tabs={[['people', 'Orang', people.data?.length], ['invites', 'Undangan', pendingInv], ['rangers', 'Status Ranger', (rangers.data ?? []).filter((r) => r.status === 'DEACTIVATION_REQUESTED').length]]} />
      {tab === 'rangers' ? (
        <Loaded state={rangers} empty={(d) => (d.length ? null : <Empty title="Belum ada Ranger" icon={I.target} />)}>
          {(d) => <ul className="st-list">{d.map((r) => <RangerRow key={r.person_id} r={r} name={people.data?.find((p) => p.id === r.person_id)} onDone={() => { rangers.reload(); people.reload(); }} />)}</ul>}
        </Loaded>
      ) : tab === 'people' ? (
        <Loaded state={people} empty={(d) => (d.length ? null : <Empty title="Belum ada akun" icon={I.users} />)}>
          {(d) => <div className="st-people">{d.map((p, i) => <PersonCard key={p.id} p={p} i={i} onChange={people.reload} />)}</div>}
        </Loaded>
      ) : (
        <Loaded state={invites} empty={(d) => (d.length ? null : <Empty title="Belum ada undangan" icon={I.key}>Undangan dibuat dari aplikasi yang disetujui atau langsung dari tombol di atas.</Empty>)}>
          {(d) => (
            <div className="st-table">
              <div className="st-tr st-tr--h"><span>Email</span><span>Peran</span><span>Status</span><span>Email aktivasi</span><span /></div>
              {d.map((x, i) => {
                const expired = x.status === 'pending' && new Date(x.expires_at) < new Date();
                return (
                  <div key={x.id} className="st-tr" style={{ ['--i' as string]: i }}>
                    <span><b>{x.email}</b><small>dibuat {ago(x.created_at)} · berlaku s.d. {fmtDate(x.expires_at)}</small>{x.resend_requested_at && x.status !== 'accepted' && <Badge tone="warn">Minta kirim ulang</Badge>}</span>
                    <span>{x.roles.map((r) => ROLE[r].label).join(', ')}</span>
                    <span><StatusBadge map={INVITE_STATUS} value={expired ? 'expired' : x.status} /></span>
                    <span>{x.ob ? <StatusBadge map={OUTBOX_STATUS} value={x.ob.status} /> : <span className="st-muted st-small">Tautan manual (v3)</span>}</span>
                    <span className="st-row">
                      {x.status !== 'accepted' && <Btn size="sm" onClick={() => reissue(x.id)} busy={busy === x.id}>Kirim ulang</Btn>}
                      {x.status === 'pending' && !expired && <Btn size="sm" kind="quiet" onClick={async () => { const { error } = await sb.from('st_invites').update({ status: 'revoked' }).eq('id', x.id); if (error) toast(error.message, 'err'); else { toast('Undangan dicabut.'); invites.reload(); } }}>Cabut</Btn>}
                    </span>
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
        <span><b>{p.display_name || '—'}</b> {p.is_demo && <Badge tone="warn">DEMO</Badge>}<small>{p.email}</small></span>
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

/** RAN-014/015: clearance Commander sebelum Ranger bisa tampil sebagai kandidat. Misi/payable terbuka memblokir di server. */
function RangerRow({ r, name, onDone }: { r: RangerStatus; name?: Profile; onDone: () => void }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [open, setOpen] = useState(false);
  const { busy, run } = useAction();
  const decide = (ok: boolean) => run(ok ? 'y' : 'n', () => rpc('st_ranger_decide_deactivation', { p_person: r.person_id, p_approve: ok, p_note: note }), () => { toast(ok ? 'Ranger dinonaktifkan; opt-in talent tetap keputusan orangnya.' : 'Tetap aktif.'); setOpen(false); onDone(); }, (e) => toast(e, 'err'));
  return (
    <li>
      <span><b>{name?.display_name || name?.email || r.person_id.slice(0, 8)}</b><small>{r.origin === 'legacy_import' ? 'Legacy import' : 'Jalur EDU Learner'}{r.request_reason ? ` · alasan: ${r.request_reason}` : ''}{r.clearance_note ? ` · clearance: ${r.clearance_note}` : ''}</small></span>
      <StatusBadge map={RANGER_STATUS} value={r.status} />
      {r.status === 'DEACTIVATION_REQUESTED' && <Btn size="sm" kind="primary" onClick={() => setOpen(true)}>Putuskan</Btn>}
      {open && (
        <Dialog open onClose={() => setOpen(false)} title="Clearance nonaktif Ranger">
          <div className="st-stack">
            <p className="st-small st-muted">Periksa serah-terima misi, payable, akses aset, dan NDA. Server menolak bila masih ada misi/payable terbuka.</p>
            <Area label="Catatan clearance" value={note} onChange={setNote} rows={3} />
            <div className="st-dlg__foot"><Btn onClick={() => decide(false)} busy={busy === 'n'}>Tetap aktif</Btn><Btn kind="primary" onClick={() => decide(true)} busy={busy === 'y'}>Setujui nonaktif</Btn></div>
          </div>
        </Dialog>
      )}
    </li>
  );
}

function CreateInvite({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<string[]>(['ranger']);
  const [hours, setHours] = useState('24');
  const [legacy, setLegacy] = useState(false);
  const [sent, setSent] = useState<null | 'ok' | 'queued'>(null);
  const { busy, run } = useAction();
  const opts = useMemo(() => PRO.map((r) => [r, ROLE[r].label] as [string, string]), []);
  const go = () => run('go', async () => {
    await rpc('st_create_invite', { p_email: email.trim(), p_roles: roles, p_application: null, p_hours: Number(hours), p_legacy: legacy });
    return sendOutbox();
  }, (r) => { setSent(r && !r.failed ? 'ok' : 'queued'); onDone(); }, (m) => toast(m, 'err'));
  const close = () => { setSent(null); setEmail(''); onClose(); };
  return (
    <Dialog open={open} onClose={close} title="Undangan akses profesional">
      {sent ? (
        <div className="st-invite-out">
          <span className="st-eyebrow">{email}</span>
          <p>{sent === 'ok' ? 'Email undangan terkirim.' : 'Undangan dibuat. Email sedang diantre dan dicoba ulang otomatis — pantau statusnya di tab Undangan.'}</p>
          <p className="st-hint">Email berisi username (email) dan tombol untuk membuat password sendiri. Tautan sekali pakai; undangan lama untuk email yang sama otomatis dicabut. Tautan tidak ditampilkan di Studio.</p>
          <Btn kind="primary" onClick={close}>Selesai</Btn>
        </div>
      ) : (
        <div className="st-form">
          <Text label="Email penerima" type="email" value={email} onChange={setEmail} required wide />
          <Chips label="Peran yang diberikan" options={opts} value={roles} onChange={setRoles} hint="Peran diaktifkan hanya setelah undangan diterima oleh email yang sama." />
          <Select label="Masa berlaku" value={hours} onChange={setHours} options={[['24', '24 jam (standar)'], ['72', '3 hari'], ['168', '7 hari']]} />
          {roles.includes('ranger') && <div className="st-field st-field--wide"><Check label={<>Ranger <b>existing</b> (legacy import) — terverifikasi dari catatan misi lama</>} checked={legacy} onChange={setLegacy}
            hint={legacy ? <Badge tone="warn">Tidak ada klaim alumni EDU untuk akun legacy</Badge> : 'Tanpa centang: penerima wajib sudah EDU Learner (jalur rekrutmen baru).'} /></div>}
          <div className="st-form__act"><Btn kind="primary" onClick={go} busy={busy === 'go'} disabled={!email || !roles.length}><I.key size={16} />Kirim undangan</Btn></div>
        </div>
      )}
    </Dialog>
  );
}
