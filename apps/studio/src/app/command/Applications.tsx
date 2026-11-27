import { useMemo, useState, type ReactNode } from 'react';
import { useAction, useLoad } from '../../lib/hooks';
import { APP_STATUS, APP_TYPE, INVITE_STATUS, OUTBOX_STATUS, SOURCE, ago, fmtDate } from '../../lib/labels';
import { sb, must, rpc, sendOutbox, type Application, type Invite, type OutboxRow } from '../../lib/sb';
import { Area, Badge, Btn, Dialog, Empty, I, KV, Loaded, PageHead, Select, StatusBadge, Tabs, Text, useToast } from '../../ui/kit';

const TYPES = ['all', 'ranger', 'trainer', 'opc_founder', 'business_partner', 'collaborator'] as const;
type T = (typeof TYPES)[number];
const OPEN = ['submitted', 'in_review', 'need_info'];
/** Disetujui tapi akun belum aktif (undangan belum diterima) — termasuk backfill v3 yang disetujui tanpa undangan. */
const ACTIVATION = ['approved', 'invited'];
type View = 'open' | 'activation' | 'closed';
const inView = (v: View, st: string) => (v === 'open' ? OPEN.includes(st) : v === 'activation' ? ACTIVATION.includes(st) : !OPEN.includes(st) && !ACTIVATION.includes(st));

/** CMD-01 / REC-03: inbox aplikasi lintas situs. Keputusan & catatan privat tercatat di audit. */
export default function Applications() {
  const toast = useToast();
  const [type, setType] = useState<T>('all');
  const [view, setView] = useState<View>('open');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Application | null>(null);
  const [adding, setAdding] = useState(false);
  const s = useLoad(() => must(sb.from('st_applications').select('*').order('created_at', { ascending: false }).limit(300)) as Promise<Application[]>);
  const list = useMemo(() => (s.data ?? []).filter((a) =>
    (type === 'all' || a.type === type) && inView(view, a.status)
    && (!q || `${a.name} ${a.email} ${a.ref}`.toLowerCase().includes(q.toLowerCase()))), [s.data, type, view, q]);
  const n = (t: T) => (s.data ?? []).filter((a) => (t === 'all' || a.type === t) && OPEN.includes(a.status)).length;
  const nAct = (s.data ?? []).filter((a) => (type === 'all' || a.type === type) && ACTIVATION.includes(a.status)).length;

  return (
    <div className="st-page-in">
      <PageHead eyebrow="CMD-01 · Application & Access Center" title="Aplikasi" desc="Pendaftar dari Studio (Learner), edu.viboxs.com, dan input manual. Tidak ada aplikasi yang otomatis menjadi akun profesional.">
        <Btn onClick={() => setAdding(true)}><I.plus size={16} />Input manual</Btn>
      </PageHead>
      <Tabs label="Jenis aplikasi" value={type} onChange={setType} tabs={TYPES.map((t) => [t, t === 'all' ? 'Semua' : APP_TYPE[t], n(t)])} />
      <div className="st-toolbar">
        <div className="st-seg" role="group" aria-label="Status">
          <button type="button" className={view === 'open' ? 'is-on' : ''} aria-pressed={view === 'open'} onClick={() => setView('open')}>Perlu keputusan</button>
          <button type="button" className={view === 'activation' ? 'is-on' : ''} aria-pressed={view === 'activation'} onClick={() => setView('activation')}>Disetujui, belum aktif{nAct ? ` (${nAct})` : ''}</button>
          <button type="button" className={view === 'closed' ? 'is-on' : ''} aria-pressed={view === 'closed'} onClick={() => setView('closed')}>Selesai</button>
        </div>
        <label className="st-search"><I.search size={16} /><input placeholder="Cari nama, email, ref…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari aplikasi" /></label>
      </div>
      <Loaded state={s} empty={() => (list.length ? null : <Empty title={view === 'open' ? 'Tidak ada aplikasi menunggu keputusan' : view === 'activation' ? 'Semua yang disetujui sudah aktif' : 'Belum ada aplikasi selesai'} icon={I.inbox}>{view === 'activation' ? 'Aplikasi yang disetujui muncul di sini sampai pemohon mengaktifkan akunnya.' : 'Pendaftar kontributor dari edu.viboxs.com masuk otomatis ke sini.'}</Empty>)}>
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
  const { busy, run } = useAction();
  const act = useLoad(async () => {
    const inv = (await must(sb.from('st_invites').select('id, email, roles, status, expires_at, created_at, accepted_at, application_id, resend_requested_at').eq('application_id', app.id).order('created_at', { ascending: false }).limit(1)) as Invite[])[0] ?? null;
    const ob = inv ? (await must(sb.from('st_outbox').select('*').eq('topic', 'invite.activation').eq('aggregate_id', inv.id).limit(1)) as OutboxRow[])[0] ?? null : null;
    return { inv, ob };
  });
  const decide = (status: string, msg: string) => run(status, async () => {
    if ((status === 'declined' || status === 'need_info') && note.trim().length < 5) throw new Error('Tulis catatan/alasan (min. 5 karakter).');
    await must(sb.from('st_applications').update({ status, reviewer_note: note.trim() || null, decided_at: new Date().toISOString() }).eq('id', app.id));
  }, () => { onDone(msg); onClose(); }, (m) => toast(m, 'err'));
  /** V4-AT-001: setujui + undangan 24 jam + email aktivasi dalam satu langkah. Token tidak pernah sampai ke browser. */
  const approve = (resend: boolean) => run('approve', async () => {
    if (!app.email) throw new Error('Aplikasi ini tidak memiliki email.');
    await rpc('st_application_approve', { p_id: app.id, p_note: note.trim() || null });
    return sendOutbox();
  }, (r) => {
    const m = r?.failed ? 'Disetujui, tetapi email belum terkirim — sistem mencoba lagi otomatis.' : resend ? 'Undangan baru dikirim; tautan lama tidak berlaku lagi.' : 'Disetujui. Email aktivasi dikirim ke pemohon.';
    onDone(m);
    if (resend) act.reload(); else onClose();
  }, (m) => toast(m, 'err'));
  const retry = (id: string) => run('retry', async () => { await rpc('st_outbox_retry', { p_id: id }); return sendOutbox(); },
    () => { toast('Email dikirim ulang.'); act.reload(); }, (m) => toast(m, 'err'));

  const payload = Object.entries(app.payload ?? {}).filter(([k, v]) => !k.startsWith('_') && k !== 'privacy' && v !== '' && v != null);
  const inv = act.data?.inv ?? null;
  const ob = act.data?.ob ?? null;
  const invExpired = inv?.status === 'pending' && new Date(inv.expires_at) < new Date();
  return (
    <Dialog open onClose={onClose} title={`${APP_TYPE[app.type]} · ${app.ref}`} wide>
      <div className="st-stack">
        <KV rows={[['Nama', app.name], ['Email (username)', app.email], ['Sumber', `${SOURCE[app.source] ?? app.source}${app.source_ref ? ` · ${app.source_ref}` : ''}`], ['Masuk', fmtDate(app.created_at)], ['Status', <StatusBadge key="s" map={APP_STATUS} value={app.status} />]]} />
        {payload.length > 0 && (
          <details className="st-details" open={!ACTIVATION.includes(app.status)}>
            <summary>Isi aplikasi</summary>
            <KV rows={payload.map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)])} />
          </details>
        )}
        {ACTIVATION.includes(app.status) && (
          <section className="st-invite-out" aria-label="Status aktivasi">
            <span className="st-eyebrow">Aktivasi akun</span>
            {!inv ? <p className="st-small">Disetujui sebelum aktivasi otomatis tersedia — belum ada email aktivasi. Tekan <b>Kirim aktivasi</b>.</p> : (
              <KV rows={[
                ['Undangan', <StatusBadge key="i" map={INVITE_STATUS} value={invExpired ? 'expired' : inv.status} />],
                ['Berlaku s.d.', fmtDate(inv.expires_at)],
                ['Email', ob ? <span key="o"><StatusBadge map={OUTBOX_STATUS} value={ob.status} />{ob.sent_at ? <small> · {ago(ob.sent_at)}</small> : null}{ob.last_error && ob.status !== 'sent' ? <small className="st-muted"> · {ob.last_error}</small> : null}</span> : '—'],
                ...(inv.resend_requested_at ? [['Permintaan', <Badge key="r" tone="warn">Pemohon minta kirim ulang · {ago(inv.resend_requested_at)}</Badge>] as [string, ReactNode]] : []),
              ]} />
            )}
            <p className="st-hint">Email berisi username (email) dan tombol “Buat Password &amp; Aktifkan Akun”. Tautan sekali pakai, berlaku 24 jam. Password tidak pernah dikirim.</p>
            <div className="st-row">
              {ob && ['failed', 'retry_pending'].includes(ob.status) && inv?.status === 'pending' && !invExpired && <Btn size="sm" onClick={() => retry(ob.id)} busy={busy === 'retry'}>Coba kirim lagi</Btn>}
              <Btn size="sm" kind="primary" onClick={() => approve(!!inv)} busy={busy === 'approve'}><I.key size={14} />{inv ? 'Kirim ulang aktivasi' : 'Kirim aktivasi'}</Btn>
            </div>
          </section>
        )}
        <Area label="Catatan reviewer (privat)" value={note} onChange={setNote} rows={3} hint="Tidak terlihat oleh pemohon. Wajib untuk tolak / minta info." />
        <div className="st-dlg__foot">
          {app.status === 'submitted' && <Btn onClick={() => decide('in_review', 'Ditandai sedang ditinjau.')} busy={busy === 'in_review'}>Tandai ditinjau</Btn>}
          {OPEN.includes(app.status) && <Btn onClick={() => decide('need_info', 'Status: butuh info tambahan.')} busy={busy === 'need_info'}>Minta info</Btn>}
          {[...OPEN, ...ACTIVATION].includes(app.status) && <Btn kind="danger" onClick={() => decide('declined', 'Aplikasi ditolak.')} busy={busy === 'declined'}>Tolak</Btn>}
          {OPEN.includes(app.status) && <Btn kind="primary" onClick={() => approve(false)} busy={busy === 'approve'}><I.check size={16} />Setujui &amp; kirim aktivasi</Btn>}
        </div>
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
