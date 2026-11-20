import { useMemo, useState } from 'react';
import { useAction, useLoad } from '../../lib/hooks';
import { APP_STATUS, APP_TYPE, SOURCE, ago, fmtDate } from '../../lib/labels';
import { sb, must, rpc, type Application } from '../../lib/sb';
import { Area, Btn, Copy, Dialog, Empty, I, KV, Loaded, PageHead, Select, StatusBadge, Tabs, Text, useToast } from '../../ui/kit';
import { inviteUrl } from './People';

const TYPES = ['all', 'ranger', 'trainer', 'opc_founder', 'business_partner', 'collaborator'] as const;
type T = (typeof TYPES)[number];
const OPEN = ['submitted', 'in_review', 'need_info', 'approved'];

/** CMD-01 / REC-03: inbox aplikasi lintas situs. Keputusan & catatan privat tercatat di audit. */
export default function Applications() {
  const toast = useToast();
  const [type, setType] = useState<T>('all');
  const [view, setView] = useState<'open' | 'closed'>('open');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Application | null>(null);
  const [adding, setAdding] = useState(false);
  const s = useLoad(() => must(sb.from('st_applications').select('*').order('created_at', { ascending: false }).limit(300)) as Promise<Application[]>);
  const list = useMemo(() => (s.data ?? []).filter((a) =>
    (type === 'all' || a.type === type) && (view === 'open' ? OPEN.includes(a.status) : !OPEN.includes(a.status))
    && (!q || `${a.name} ${a.email} ${a.ref}`.toLowerCase().includes(q.toLowerCase()))), [s.data, type, view, q]);
  const n = (t: T) => (s.data ?? []).filter((a) => (t === 'all' || a.type === t) && OPEN.includes(a.status)).length;

  return (
    <div className="st-page-in">
      <PageHead eyebrow="CMD-01 · Application & Access Center" title="Aplikasi" desc="Pendaftar dari Studio (Learner), edu.viboxs.com, dan input manual. Tidak ada aplikasi yang otomatis menjadi akun profesional.">
        <Btn onClick={() => setAdding(true)}><I.plus size={16} />Input manual</Btn>
      </PageHead>
      <Tabs label="Jenis aplikasi" value={type} onChange={setType} tabs={TYPES.map((t) => [t, t === 'all' ? 'Semua' : APP_TYPE[t], n(t)])} />
      <div className="st-toolbar">
        <div className="st-seg" role="group" aria-label="Status">
          <button type="button" className={view === 'open' ? 'is-on' : ''} aria-pressed={view === 'open'} onClick={() => setView('open')}>Perlu keputusan</button>
          <button type="button" className={view === 'closed' ? 'is-on' : ''} aria-pressed={view === 'closed'} onClick={() => setView('closed')}>Selesai</button>
        </div>
        <label className="st-search"><I.search size={16} /><input placeholder="Cari nama, email, ref…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari aplikasi" /></label>
      </div>
      <Loaded state={s} empty={() => (list.length ? null : <Empty title={view === 'open' ? 'Tidak ada aplikasi menunggu keputusan' : 'Belum ada aplikasi selesai'} icon={I.inbox}>Pendaftar kontributor dari edu.viboxs.com masuk otomatis ke sini.</Empty>)}>
        {() => (
          <div className="st-table" role="table" aria-label="Daftar aplikasi">
            <div className="st-tr st-tr--h" role="row"><span role="columnheader">Pemohon</span><span role="columnheader">Jalur</span><span role="columnheader">Sumber</span><span role="columnheader">Status</span><span role="columnheader">Masuk</span></div>
            {list.map((a, i) => (
              <button key={a.id} type="button" role="row" className="st-tr" style={{ ['--i' as string]: i }} onClick={() => setSel(a)}>
                <span role="cell"><b>{a.name || '—'}</b><small>{a.email} · {a.ref}</small></span>
                <span role="cell">{APP_TYPE[a.type]}</span>
                <span role="cell" className="st-muted">{SOURCE[a.source] ?? a.source}</span>
                <span role="cell"><StatusBadge map={APP_STATUS} value={a.status} /></span>
                <span role="cell" className="st-muted">{ago(a.created_at)}</span>
              </button>
            ))}
          </div>
        )}
      </Loaded>
      {sel && <Review app={sel} onClose={() => setSel(null)} onDone={(m) => { toast(m); s.reload(); }} />}
      <ManualAdd open={adding} onClose={() => setAdding(false)} onDone={() => { setAdding(false); toast('Aplikasi manual dicatat.'); s.reload(); }} />
    </div>
  );
}

function Review({ app, onClose, onDone }: { app: Application; onClose: () => void; onDone: (m: string) => void }) {
  const toast = useToast();
  const [note, setNote] = useState(app.reviewer_note ?? '');
  const [days, setDays] = useState('7');
  const [link, setLink] = useState('');
  const { busy, run } = useAction();
  const decide = (status: string, msg: string) => run(status, async () => {
    if ((status === 'declined' || status === 'need_info') && note.trim().length < 5) throw new Error('Tulis catatan/alasan (min. 5 karakter).');
    await must(sb.from('st_applications').update({ status, reviewer_note: note.trim() || null, decided_at: new Date().toISOString() }).eq('id', app.id));
  }, () => { onDone(msg); onClose(); }, (m) => toast(m, 'err'));
  const invite = () => run('invite', async () => {
    if (!app.email) throw new Error('Aplikasi ini tidak memiliki email.');
    const r = await rpc<{ token: string }>('st_create_invite', { p_email: app.email, p_roles: [app.type], p_application: app.id, p_days: Number(days) });
    setLink(inviteUrl(r.token));
  }, () => onDone('Undangan dibuat. Salin tautan dan kirim ke pemohon.'), (m) => toast(m, 'err'));

  const payload = Object.entries(app.payload ?? {}).filter(([k, v]) => !k.startsWith('_') && k !== 'privacy' && v !== '' && v != null);
  return (
    <Dialog open onClose={onClose} title={`${APP_TYPE[app.type]} · ${app.ref}`} wide>
      <div className="st-stack">
        <KV rows={[['Nama', app.name], ['Email', app.email], ['Sumber', `${SOURCE[app.source] ?? app.source}${app.source_ref ? ` · ${app.source_ref}` : ''}`], ['Masuk', fmtDate(app.created_at)], ['Status', <StatusBadge key="s" map={APP_STATUS} value={app.status} />]]} />
        {payload.length > 0 && (
          <details className="st-details" open>
            <summary>Isi aplikasi</summary>
            <KV rows={payload.map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)])} />
          </details>
        )}
        <Area label="Catatan reviewer (privat)" value={note} onChange={setNote} rows={3} hint="Tidak terlihat oleh pemohon. Wajib untuk tolak / minta info." />
        {link ? (
          <div className="st-invite-out">
            <span className="st-eyebrow">Tautan undangan sekali pakai</span>
            <code>{link}</code>
            <div className="st-row"><Copy text={link} label="Salin tautan" /><a className="st-btn st-btn--ghost st-btn--sm" href={`mailto:${app.email}?subject=${encodeURIComponent('Undangan VIBOXS Studio')}&body=${encodeURIComponent(`Halo ${app.name ?? ''},\n\nAplikasi Anda disetujui. Aktifkan akses VIBOXS Studio melalui tautan berikut (sekali pakai, berlaku ${days} hari):\n${link}\n\nMasuk dengan email ini: ${app.email}\n\nSalam,\nCommander VIBOXS`)}`}><I.ext size={14} />Buka email</a></div>
            <p className="st-hint">Token hanya ditampilkan sekarang. Database menyimpan hash-nya saja.</p>
          </div>
        ) : (
          <div className="st-dlg__foot">
            {app.status === 'submitted' && <Btn onClick={() => decide('in_review', 'Ditandai sedang ditinjau.')} busy={busy === 'in_review'}>Tandai ditinjau</Btn>}
            {OPEN.includes(app.status) && <Btn onClick={() => decide('need_info', 'Status: butuh info tambahan.')} busy={busy === 'need_info'}>Minta info</Btn>}
            {OPEN.includes(app.status) && <Btn kind="danger" onClick={() => decide('declined', 'Aplikasi ditolak.')} busy={busy === 'declined'}>Tolak</Btn>}
            {['submitted', 'in_review', 'need_info'].includes(app.status) && <Btn onClick={() => decide('approved', 'Aplikasi disetujui. Lanjutkan dengan undangan.')} busy={busy === 'approved'}><I.check size={16} />Setujui</Btn>}
            {['approved', 'in_review', 'invited'].includes(app.status) && (
              <span className="st-inline">
                <Select label="Masa berlaku" value={days} onChange={setDays} options={[['3', '3 hari'], ['7', '7 hari'], ['14', '14 hari'], ['30', '30 hari']]} />
                <Btn kind="primary" onClick={invite} busy={busy === 'invite'}><I.key size={16} />{app.status === 'invited' ? 'Kirim ulang undangan' : 'Buat undangan'}</Btn>
              </span>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}

function ManualAdd({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [type, setType] = useState<Application['type']>('ranger');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [origin, setOrigin] = useState('');
  const [skills, setSkills] = useState('');
  const { busy, run } = useAction();
  const save = () => run('save', async () => {
    if (name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error('Isi nama dan email yang valid.');
    await must(sb.from('st_applications').insert({ type, source: 'manual', name: name.trim(), email: email.trim().toLowerCase(), payload: { asal: origin, keahlian: skills } }));
  }, () => { setName(''); setEmail(''); setOrigin(''); setSkills(''); onDone(); }, (m) => toast(m, 'err'));
  return (
    <Dialog open={open} onClose={onClose} title="Catat aplikasi manual">
      <div className="st-form">
        <p className="st-hint st-field--wide">Untuk pelamar dari jalur resmi yang belum punya form (mis. viboxs.com). Asal dicatat sebagai provenance.</p>
        <Select label="Jalur" value={type} onChange={setType} options={TYPES.filter((t) => t !== 'all').map((t) => [t, APP_TYPE[t]]) as [Application['type'], string][]} />
        <Text label="Nama" value={name} onChange={setName} required />
        <Text label="Email" type="email" value={email} onChange={setEmail} required />
        <Text label="Asal / referensi" value={origin} onChange={setOrigin} placeholder="mis. DM Instagram 18 Nov" />
        <Text label="Keahlian / catatan" value={skills} onChange={setSkills} wide />
        <div className="st-form__act"><Btn kind="primary" onClick={save} busy={busy === 'save'}>Simpan</Btn></div>
      </div>
    </Dialog>
  );
}
