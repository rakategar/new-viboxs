import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ORIGIN } from '@viboxs/shared/ecosystem';
import { useAction, useLoad } from '../../lib/hooks';
import { LEAD_STATUS, ago, fmtDate } from '../../lib/labels';
import { sb, must, type Lead } from '../../lib/sb';
import { Area, Btn, Dialog, Empty, I, KV, Loaded, PageHead, Select, StatusBadge, Tabs, Text, useToast } from '../../ui/kit';

/** CMD-02: Services lead inbox. Lead tidak pernah otomatis menjadi mission (T-019). */
export default function Leads() {
  const toast = useToast();
  const [tab, setTab] = useState<'open' | 'closed'>('open');
  const [sel, setSel] = useState<Lead | null>(null);
  const [adding, setAdding] = useState(false);
  const s = useLoad(() => must(sb.from('st_leads').select('*').order('created_at', { ascending: false }).limit(300)) as Promise<Lead[]>);
  const OPEN = ['new', 'contacted', 'negotiating', 'won'];
  const list = useMemo(() => (s.data ?? []).filter((l) => (tab === 'open' ? OPEN.includes(l.status) : !OPEN.includes(l.status))), [s.data, tab]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="st-page-in">
      <PageHead eyebrow="CMD-02 · Services Lead Inbox" title="Lead Services" desc={<>Masuk otomatis dari form “Start a Mission” di <a href={`${ORIGIN.services}/start`} target="_blank" rel="noopener noreferrer">service.viboxs.com</a>. Record utama tetap di Services; di sini catatan prospek dan konversi manual.</>}>
        <Btn onClick={() => setAdding(true)}><I.plus size={16} />Lead manual</Btn>
      </PageHead>
      <Tabs label="Status lead" value={tab} onChange={setTab} tabs={[['open', 'Aktif', (s.data ?? []).filter((l) => l.status === 'new').length], ['closed', 'Selesai / jadi mission']]} />
      <Loaded state={s} empty={() => (list.length ? null : <Empty title="Belum ada lead" icon={I.lead}>Lead baru muncul di sini — dan sebagai notifikasi realtime — begitu klien mengirim form di Services.</Empty>)}>
        {() => (
          <div className="st-cards">
            {list.map((l, i) => (
              <button key={l.id} type="button" className="st-lead" style={{ ['--i' as string]: i }} onClick={() => setSel(l)}>
                <span className="row-between"><span className="st-mono">{l.ref}</span><StatusBadge map={LEAD_STATUS} value={l.status} /></span>
                <b>{l.name || 'Tanpa nama'}{l.company ? ` · ${l.company}` : ''}</b>
                <span className="st-muted st-small st-clamp">{l.summary || (l.payload?.hasil as string) || '—'}</span>
                <span className="st-small st-muted">{l.source === 'services' ? `Services · ${l.source_ref}` : 'Input manual'} · {ago(l.created_at)}</span>
              </button>
            ))}
          </div>
        )}
      </Loaded>
      {sel && <LeadDialog lead={sel} onClose={() => setSel(null)} onDone={() => { s.reload(); }} />}
      <AddLead open={adding} onClose={() => setAdding(false)} onDone={() => { setAdding(false); toast('Lead manual dicatat dengan provenance.'); s.reload(); }} />
    </div>
  );
}

function LeadDialog({ lead, onClose, onDone }: { lead: Lead; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const nav = useNavigate();
  const [status, setStatus] = useState(lead.status);
  const [notes, setNotes] = useState(lead.notes ?? '');
  const { busy, run } = useAction();
  const save = () => run('save', async () => { await must(sb.from('st_leads').update({ status, notes }).eq('id', lead.id)); }, () => { toast('Lead diperbarui.'); onDone(); onClose(); }, (m) => toast(m, 'err'));
  const toMission = () => run('mission', async () => {
    const m = await must(sb.from('st_missions').insert({ title: lead.summary?.slice(0, 80) || `Proyek ${lead.company || lead.name || lead.ref}`, brief: '' }).select('id').single()) as { id: string };
    await must(sb.from('st_mission_private').insert({ mission_id: m.id, lead_id: lead.id, internal_notes: `Dari lead ${lead.ref}` }));
    await must(sb.from('st_leads').update({ status: 'converted' }).eq('id', lead.id));
    return m.id;
  }, (id) => { toast('Draft mission dibuat. Tulis brief yang sudah disanitasi — jangan sertakan kontak atau harga klien.'); nav(`/command/missions/${id}`); }, (m) => toast(m, 'err'));
  const payload = Object.entries(lead.payload ?? {}).filter(([k, v]) => !k.startsWith('_') && k !== 'privacy' && v !== '' && v != null);
  return (
    <Dialog open onClose={onClose} title={`Lead ${lead.ref}`} wide>
      <div className="st-stack">
        <div className="st-alert st-alert--warn"><I.lock size={16} /><span>Data kontak klien hanya untuk Commander. Jangan disalin ke brief Ranger.</span></div>
        <KV rows={[['Nama', lead.name], ['Kontak', lead.contact], ['Organisasi', lead.company], ['Sumber', lead.source === 'services' ? `service.viboxs.com · ${lead.source_ref}` : 'Input manual'], ['Masuk', fmtDate(lead.created_at)]]} />
        {payload.length > 0 && <details className="st-details"><summary>Isi form asli</summary><KV rows={payload.map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)])} /></details>}
        <div className="st-form">
          <Select label="Status prospek" value={status} onChange={setStatus} options={Object.entries(LEAD_STATUS).map(([k, [l]]) => [k, l])} />
          <Area label="Notulen prospek (privat)" value={notes} onChange={setNotes} rows={4} />
        </div>
        <div className="st-dlg__foot">
          <Btn onClick={save} busy={busy === 'save'}>Simpan catatan</Btn>
          {lead.status !== 'converted' && <Btn kind="primary" onClick={toMission} busy={busy === 'mission'}><I.target size={16} />Buat mission dari lead</Btn>}
        </div>
        <p className="st-hint">Konversi hanya dilakukan setelah proposal/SOW dengan klien disepakati (PRD §05.3).</p>
      </div>
    </Dialog>
  );
}

function AddLead({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ name: '', contact: '', company: '', summary: '', origin: '' });
  const { busy, run } = useAction();
  const save = () => run('save', async () => {
    if (f.name.trim().length < 2 || f.summary.trim().length < 5) throw new Error('Isi nama dan ringkasan kebutuhan.');
    await must(sb.from('st_leads').insert({ source: 'manual', name: f.name, contact: f.contact, company: f.company, summary: f.summary, payload: { asal: f.origin } }));
  }, () => { setF({ name: '', contact: '', company: '', summary: '', origin: '' }); onDone(); }, (m) => toast(m, 'err'));
  return (
    <Dialog open={open} onClose={onClose} title="Lead manual">
      <div className="st-form">
        <Text label="Nama" value={f.name} onChange={(v) => setF({ ...f, name: v })} required />
        <Text label="Kontak" value={f.contact} onChange={(v) => setF({ ...f, contact: v })} />
        <Text label="Organisasi" value={f.company} onChange={(v) => setF({ ...f, company: v })} />
        <Text label="Asal (provenance)" value={f.origin} onChange={(v) => setF({ ...f, origin: v })} placeholder="mis. WhatsApp, event, referral" />
        <Area label="Ringkasan kebutuhan" value={f.summary} onChange={(v) => setF({ ...f, summary: v })} rows={3} required />
        <div className="st-form__act"><Btn kind="primary" onClick={save} busy={busy === 'save'}>Simpan lead</Btn></div>
      </div>
    </Dialog>
  );
}
