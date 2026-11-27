import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ORIGIN } from '@viboxs/shared/ecosystem';
import { useAuth } from '../../lib/auth';
import { useAction, useLoad } from '../../lib/hooks';
import { AVAIL, COMPANY_PURPOSE, COMPANY_STATUS, CONTRACT, HIRE_STAGE, HIRE_STATUS, LEAD_STATUS, WORKPREF, fmtDate, fromLocalInput, toLocalInput } from '../../lib/labels';
import { sb, must, rpc, sendOutbox, type Company, type HiringRow, type Vacancy } from '../../lib/sb';
import { PendingInvites } from '../Invites';
import { Area, Badge, Btn, Card, Check, Dialog, Empty, I, KV, Loaded, PageHead, Select, StatusBadge, TagInput, Text, useToast } from '../../ui/kit';
import Thread from '../Thread';

const TERMS = 'company-terms-draft-2026-11';
const BLANK = { legal_name: '', nib: '', industry: '', address: '', business_email: '', company_whatsapp: '', website: '', pic_name: '', pic_role: '', pic_email: '',
  purpose: 'hiring', hiring_needs: '', authority_statement: false, data_consent: false, comm_consent_wa: false };
const EDITABLE = ['SUBMITTED', 'NEED_INFO'];

/** Company Workspace — pengajuan & status (v4: … → VERIFIED → COMPANY_INVITE_SENT → ACTIVE). Bisa dibuka akun tanpa peran. */
export function CompanyHome() {
  const { me, refresh } = useAuth();
  const toast = useToast();
  const s = useLoad(async () => must(sb.from('st_companies').select('*').eq('owner_id', me!.profile.id).neq('status', 'REJECTED').maybeSingle()) as Promise<Company | null>);
  const [f, setF] = useState<typeof BLANK | null>(null);
  const { busy, run } = useAction();
  const c = s.data;
  const form = f ?? (c ? { ...BLANK, legal_name: c.legal_name, nib: c.nib ?? '', industry: c.industry ?? '', address: c.address ?? '', business_email: c.business_email, company_whatsapp: c.company_whatsapp ?? '',
    website: c.website ?? '', pic_name: c.pic_name, pic_role: c.pic_role, pic_email: c.pic_email ?? '', purpose: c.purpose ?? 'hiring', hiring_needs: c.hiring_needs, authority_statement: true, data_consent: true, comm_consent_wa: c.comm_consent_wa }
    : { ...BLANK, business_email: me!.profile.email ?? '' });
  const set = <K extends keyof typeof BLANK>(k: K, v: (typeof BLANK)[K]) => setF({ ...form, [k]: v });
  const submit = () => run('s', async () => { const ref = await rpc<string>('st_company_apply', { p: { ...form, terms_version: TERMS } }); await sendOutbox(); return ref; },
    (ref) => { toast(`Pengajuan ${ref} masuk antrean Commander. Konfirmasi dikirim ke email perusahaan.`); setF(null); s.reload(); refresh(); }, (e) => toast(e, 'err'));
  const editable = !c || EDITABLE.includes(c.status);
  const live = !!c && ['VERIFIED', 'ACTIVE'].includes(c.status);
  return (
    <div className="st-page-in">
      <PageHead eyebrow="Company Workspace" title={c?.legal_name ?? 'Daftarkan perusahaan'} desc="Satu perusahaan, satu workspace untuk hiring dan Services. Verifikasi gratis; Talent Discovery aktif setelah Commander memverifikasi dan PIC menerima undangan aktivasi." />
      <PendingInvites />
      <Loaded state={s}>
        {() => (
          <>
            {c && <Card title={<span className="st-row">Status verifikasi <StatusBadge map={COMPANY_STATUS} value={c.status} /></span>}>
              {c.review_note && <div className={`st-alert ${c.status === 'NEED_INFO' ? 'st-alert--warn' : 'st-alert--info'}`}>Catatan Commander: {c.review_note}</div>}
              {c.status === 'COMPANY_INVITE_SENT' && <p className="st-small">Perusahaan terverifikasi. Terima undangan aktivasi di atas (atau dari email) untuk membuka Company Workspace.</p>}
              {['SUBMITTED', 'IN_COMMANDER_QUEUE', 'REVIEW'].includes(c.status) && <p className="st-small st-muted">Pengajuan {c.ref} sedang diproses. Pembaruan status dikirim ke {c.business_email}. Anda belum memperoleh akses Talent Discovery sampai verifikasi selesai.</p>}
              {live && (
                <div className="st-grid3">
                  <Link to="/company/talent" className="st-btn st-btn--primary"><I.search size={16} />Cari kandidat</Link>
                  <Link to="/company/pipeline" className="st-btn st-btn--ghost"><I.users size={16} />Pipeline hiring</Link>
                  <Link to="/company/services" className="st-btn st-btn--ghost"><I.lead size={16} />Ajukan proyek Services</Link>
                </div>
              )}
              {live && me!.active_role !== 'company_partner' && <p className="st-small st-muted">Ganti konteks ke Company Partner dari menu peran untuk membuka fitur hiring.</p>}
            </Card>}
            {editable && (
              <Card title={c ? 'Lengkapi pengajuan' : 'Data perusahaan'} desc="Lengkapi identitas perusahaan, email, dan nomor WhatsApp resmi. Logo dapat dikirim lewat form edu.viboxs.com/for-companies atau diminta Commander saat verifikasi. Pembaruan status dikirim lewat email.">
                <div className="st-form">
                  <Text label="Nama legal perusahaan" value={form.legal_name} onChange={(v) => set('legal_name', v)} wide />
                  <Text label="NIB / identitas usaha" value={form.nib} onChange={(v) => set('nib', v)} hint="NIB saja tidak cukup — Commander memeriksa PIC & kewenangan." />
                  <Text label="Industri" value={form.industry} onChange={(v) => set('industry', v)} />
                  <Text label="Email perusahaan" type="email" value={form.business_email} onChange={(v) => set('business_email', v)} />
                  <Text label="WhatsApp perusahaan" type="tel" value={form.company_whatsapp} onChange={(v) => set('company_whatsapp', v)} placeholder="0812xxxxxxx" />
                  <Text label="Website" value={form.website} onChange={(v) => set('website', v)} placeholder="https://" />
                  <Select label="Tujuan penggunaan" value={form.purpose} onChange={(v) => set('purpose', v)} options={Object.entries(COMPANY_PURPOSE) as [string, string][]} />
                  <Area label="Alamat usaha" value={form.address} onChange={(v) => set('address', v)} rows={2} wide />
                  <Text label="Nama PIC HR" value={form.pic_name} onChange={(v) => set('pic_name', v)} />
                  <Text label="Jabatan PIC" value={form.pic_role} onChange={(v) => set('pic_role', v)} />
                  <Text label="Email PIC (jika berbeda)" type="email" value={form.pic_email} onChange={(v) => set('pic_email', v)} />
                  <Area label="Kebutuhan kandidat / layanan" value={form.hiring_needs} onChange={(v) => set('hiring_needs', v)} rows={3} hint="Posisi, jumlah, lokasi/remote, perkiraan waktu — minimal 30 karakter." wide />
                  <div className="st-field st-field--wide"><Check label="Saya berwenang mewakili perusahaan ini dan informasi di atas akurat." checked={form.authority_statement} onChange={(v) => set('authority_statement', v)} /></div>
                  <div className="st-field st-field--wide"><Check label="Data kandidat hanya dipakai untuk perekrutan yang sah, tidak diekspor atau diperjualbelikan (ketentuan draf, menunggu review hukum)." checked={form.data_consent} onChange={(v) => set('data_consent', v)} /></div>
                  <div className="st-field st-field--wide"><Check label="Bersedia menerima pembaruan lewat WhatsApp resmi setelah layanan WhatsApp VIBOXS terhubung (saat ini email saja)." checked={form.comm_consent_wa} onChange={(v) => set('comm_consent_wa', v)} /></div>
                  <div className="st-form__act"><Btn kind="primary" busy={busy === 's'} onClick={submit}>{c ? 'Kirim ulang' : 'Ajukan verifikasi'}</Btn></div>
                </div>
              </Card>
            )}
            <p className="st-small st-muted">VIBOXS tidak menjamin perekrutan dan bukan pihak dalam kontrak kerja. Ranger aktif tidak tersedia untuk direkrut perusahaan. <a href={`${ORIGIN.edu}/for-companies`} target="_blank" rel="noopener noreferrer">Ketentuan untuk perusahaan</a></p>
          </>
        )}
      </Loaded>
    </div>
  );
}

interface Cand { candidate_id: string; alias: string; headline: string | null; skills: string[]; availability: string | null; work_pref: string | null; portfolio_url: string | null; star_label: string | null; assessments_passed: number | null; invited: string | null }

/** Find Talent (COM-003..007): hasil dari server — hanya opt-in & bukan Ranger aktif; tanpa email/telepon. */
export function Talent() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [skill, setSkill] = useState('');
  const [inv, setInv] = useState<Cand | null>(null);
  const s = useLoad(() => rpc<Cand[]>('st_company_talent_search', { p_q: q, p_skill: skill }), []);
  return (
    <div className="st-page-in">
      <PageHead eyebrow="Company Workspace" title="Cari kandidat" desc="Hanya EDU Learner yang memilih bersedia direkrut. Label bintang adalah keterlibatan belajar, bukan bukti kompetensi." />
      <div className="st-toolbar">
        <Text label="Cari nama / headline" value={q} onChange={setQ} />
        <Text label="Keahlian" value={skill} onChange={setSkill} />
        <Btn kind="primary" onClick={() => s.reload()}><I.search size={16} />Cari</Btn>
      </div>
      <Loaded state={s} empty={(d) => (d.length ? null : <Empty title="Belum ada kandidat yang cocok" icon={I.users}>Kandidat muncul setelah learner memilih opt-in. Kami tidak menampilkan profil tanpa persetujuan pemiliknya.</Empty>)}>
        {(d) => (
          <div className="st-cards">
            {d.map((c, i) => (
              <article key={c.candidate_id} className="st-lead" style={{ ['--i' as string]: i }}>
                <span className="row-between"><b>{c.alias}</b>{c.star_label && <Badge tone="gold">{c.star_label}</Badge>}</span>
                <span className="st-small st-muted">{c.headline ?? '—'}</span>
                <span className="st-small">{c.skills.join(' · ')}</span>
                <span className="st-small st-muted">{AVAIL[c.availability ?? ''] ?? '—'} · {WORKPREF[c.work_pref ?? ''] ?? '—'}{c.assessments_passed != null ? ` · ${c.assessments_passed} asesmen lulus` : ''}</span>
                <span className="st-row">
                  {c.portfolio_url && <a href={c.portfolio_url} target="_blank" rel="noopener noreferrer nofollow" className="st-btn st-btn--ghost st-btn--sm">Portofolio<I.ext size={14} /></a>}
                  {c.invited && ['SENT', 'ACCEPTED'].includes(c.invited) ? <StatusBadge map={HIRE_STATUS} value={c.invited} /> : <Btn size="sm" kind="primary" onClick={() => setInv(c)}>Undang</Btn>}
                </span>
              </article>
            ))}
          </div>
        )}
      </Loaded>
      {inv && <InviteDialog c={inv} onClose={() => setInv(null)} onDone={() => { toast('Undangan terkirim. Kontak terbuka bila kandidat menerima.'); setInv(null); s.reload(); }} />}
    </div>
  );
}

function InviteDialog({ c, onClose, onDone }: { c: Cand; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const vac = useLoad(async () => must(sb.from('st_vacancies').select('id, title').eq('status', 'OPEN').order('created_at', { ascending: false })) as Promise<Pick<Vacancy, 'id' | 'title'>[]>);
  const [vid, setVid] = useState('');
  const [title, setTitle] = useState('');
  const [msg, setMsg] = useState('');
  const { busy, run } = useAction();
  const send = () => run('i', () => vid ? rpc('st_hiring_invite_for', { p_candidate: c.candidate_id, p_vacancy: vid, p_message: msg })
    : rpc('st_hiring_invite', { p_candidate: c.candidate_id, p_title: title, p_message: msg }), onDone, (e) => toast(e, 'err'));
  return (
    <Dialog open onClose={onClose} title={`Undang ${c.alias}`}>
      <div className="st-form">
        <Select label="Lowongan" value={vid} onChange={setVid} options={[['', 'Tanpa lowongan — tulis posisi'], ...(vac.data ?? []).map((v) => [v.id, v.title] as [string, string])]} wide />
        {!vid && <Text label="Posisi" value={title} onChange={setTitle} wide />}
        <Area label="Pesan" value={msg} onChange={setMsg} rows={4} hint="Jelaskan peran dan proses seleksi. Kandidat melihat ringkasan lowongan (tanpa kontak HR internal). Maks. 20 undangan per hari." />
        <div className="st-form__act"><Btn kind="primary" busy={busy === 'i'} onClick={send}>Kirim undangan</Btn></div>
      </div>
    </Dialog>
  );
}

const VBLANK = { title: '', skills: [] as string[], location: '', work_mode: 'remote', contract_type: 'fulltime', comp_range: '', show_comp: false, process: '', hr_contact: '' };

/** Lowongan (PRD §09.3): milik perusahaan, tidak dipublikasikan; dipakai sebagai dasar undangan. */
function Vacancies() {
  const toast = useToast();
  const s = useLoad(async () => must(sb.from('st_vacancies').select('*').order('status').order('created_at', { ascending: false })) as Promise<Vacancy[]>);
  const [f, setF] = useState<(typeof VBLANK & { id?: string }) | null>(null);
  const { busy, run } = useAction();
  const save = () => run('v', async () => {
    const { id, title, skills, work_mode, contract_type, show_comp } = f!;
    const rest = { title: title.trim(), skills, work_mode, contract_type, show_comp, comp_range: f!.comp_range.trim() || null, location: f!.location.trim() || null, process: f!.process.trim() || null, hr_contact: f!.hr_contact.trim() || null };
    if (id) await must(sb.from('st_vacancies').update(rest).eq('id', id));
    else {
      const cid = await rpc<string>('st_my_company', { p_grant: 'HIRING_MANAGE' });
      if (!cid) throw new Error('Butuh akses kelola hiring dari Commander.');
      await must(sb.from('st_vacancies').insert({ ...rest, company_id: cid }));
    }
  }, () => { toast('Lowongan disimpan.'); setF(null); s.reload(); }, (e) => toast(e, 'err'));
  const close = (v: Vacancy) => run(v.id, () => must(sb.from('st_vacancies').update({ status: v.status === 'OPEN' ? 'CLOSED' : 'OPEN' }).eq('id', v.id)), () => s.reload(), (e) => toast(e, 'err'));
  return (
    <Card title="Lowongan" desc="Hanya terlihat oleh perusahaan Anda. Kandidat yang diundang melihat ringkasannya; kontak HR internal tidak pernah ditampilkan." actions={<Btn size="sm" onClick={() => setF({ ...VBLANK })}><I.plus size={14} />Lowongan</Btn>}>
      <Loaded state={s} empty={(d) => (d.length ? null : <p className="st-muted st-small">Belum ada lowongan. Undangan tetap bisa dikirim dengan menulis posisi.</p>)}>
        {(d) => <ul className="st-list">{d.map((v) => <li key={v.id}><span><b>{v.title}</b><small>{WORKPREF[v.work_mode]} · {CONTRACT[v.contract_type]}{v.location ? ` · ${v.location}` : ''}{v.skills.length ? ` · ${v.skills.join(', ')}` : ''}</small></span>
          <Badge tone={v.status === 'OPEN' ? 'ok' : 'muted'}>{v.status === 'OPEN' ? 'Dibuka' : 'Ditutup'}</Badge>
          <span className="st-row"><Btn size="sm" kind="quiet" onClick={() => setF({ id: v.id, title: v.title, skills: v.skills, work_mode: v.work_mode, contract_type: v.contract_type, show_comp: v.show_comp, location: v.location ?? '', comp_range: v.comp_range ?? '', process: v.process ?? '', hr_contact: v.hr_contact ?? '' })}>Edit</Btn><Btn size="sm" kind="quiet" busy={busy === v.id} onClick={() => close(v)}>{v.status === 'OPEN' ? 'Tutup' : 'Buka lagi'}</Btn></span></li>)}</ul>}
      </Loaded>
      {f && (
        <Dialog open onClose={() => setF(null)} title={f.id ? 'Edit lowongan' : 'Lowongan baru'} wide>
          <div className="st-form">
            <Text label="Jabatan" value={f.title} onChange={(v) => setF({ ...f, title: v })} wide />
            <TagInput label="Kebutuhan kemampuan" value={f.skills} onChange={(v) => setF({ ...f, skills: v })} />
            <Text label="Lokasi" value={f.location} onChange={(v) => setF({ ...f, location: v })} placeholder="mis. Jakarta / Indonesia" />
            <Select label="Mode kerja" value={f.work_mode} onChange={(v) => setF({ ...f, work_mode: v })} options={[['remote', 'Remote'], ['hybrid', 'Hybrid'], ['onsite', 'Onsite']]} />
            <Select label="Jenis kontrak" value={f.contract_type} onChange={(v) => setF({ ...f, contract_type: v })} options={Object.entries(CONTRACT)} />
            <Text label="Rentang kompensasi (opsional)" value={f.comp_range} onChange={(v) => setF({ ...f, comp_range: v })} placeholder="mis. Rp6–8 juta/bulan" />
            <div className="st-field st-field--wide"><Check label="Tampilkan rentang kompensasi ke kandidat yang diundang" checked={f.show_comp} onChange={(v) => setF({ ...f, show_comp: v })} /></div>
            <Area label="Proses seleksi" value={f.process} onChange={(v) => setF({ ...f, process: v })} rows={2} />
            <Text label="Kontak HR internal" value={f.hr_contact} onChange={(v) => setF({ ...f, hr_contact: v })} hint="Untuk tim Anda saja — tidak ditampilkan ke kandidat." wide />
            <div className="st-form__act"><Btn kind="primary" busy={busy === 'v'} onClick={save}>Simpan</Btn></div>
          </div>
        </Dialog>
      )}
    </Card>
  );
}

/** Hiring Pipeline: kontak & thread hanya untuk undangan yang diterima kandidat (COM-011..013). */
export function Pipeline() {
  const s = useLoad(async () => (await rpc<HiringRow[]>('st_hiring_list')).filter((h) => h.side === 'company'));
  const [sel, setSel] = useState<HiringRow | null>(null);
  return (
    <div className="st-page-in">
      <PageHead eyebrow="Company Workspace" title="Pipeline hiring" />
      <Vacancies />
      <Loaded state={s} empty={(d) => (d.length ? null : <Empty title="Belum ada undangan" icon={I.users}><Link to="/company/talent" className="st-btn st-btn--ghost st-btn--sm">Cari kandidat</Link></Empty>)}>
        {(d) => <ul className="st-list">{d.map((h) => <li key={h.id}><span><b>{h.candidate_alias ?? 'Kandidat'} · {h.vacancy_title}</b><small>Diundang {fmtDate(h.created_at, false)}{h.stage ? ` · ${HIRE_STAGE.find((x) => x[0] === h.stage)?.[1]}` : ''}</small></span><StatusBadge map={HIRE_STATUS} value={h.status} />{h.status === 'ACCEPTED' && <Btn size="sm" kind="primary" onClick={() => setSel(h)}>Kelola</Btn>}</li>)}</ul>}
      </Loaded>
      {sel && <HireRoom h={sel} onClose={() => { setSel(null); s.reload(); }} />}
    </div>
  );
}

function HireRoom({ h, onClose }: { h: HiringRow; onClose: () => void }) {
  const toast = useToast();
  const [stage, setStage] = useState(h.stage ?? 'SHORTLISTED');
  const [at, setAt] = useState<string | null>(h.interview_at);
  const [url, setUrl] = useState(h.interview_url ?? '');
  const [contact, setContact] = useState<{ name: string; email: string } | null>(null);
  const { busy, run } = useAction();
  return (
    <Dialog open onClose={onClose} title={`${h.candidate_alias ?? 'Kandidat'} · ${h.vacancy_title}`} wide>
      <div className="st-stack">
        <div className="st-form">
          <Select label="Tahap" value={stage} onChange={setStage} options={HIRE_STAGE} />
          <Text label="Jadwal interview (WIB)" type="datetime-local" value={toLocalInput(at)} onChange={(v) => setAt(fromLocalInput(v))} />
          <Text label="Tautan interview (https)" value={url} onChange={setUrl} wide />
          <div className="st-form__act">
            <Btn kind="primary" busy={busy === 'u'} onClick={() => run('u', () => rpc('st_hiring_update', { p_invite: h.id, p_stage: stage, p_interview_at: at, p_interview_url: url }), () => toast('Tahap diperbarui; kandidat mendapat notifikasi.'), (e) => toast(e, 'err'))}>Simpan tahap</Btn>
            {!contact && <Btn busy={busy === 'c'} onClick={() => run('c', () => rpc<{ name: string; email: string }>('st_hiring_contact', { p_invite: h.id }), (v) => setContact(v ?? null), (e) => toast(e, 'err'))}>Lihat kontak</Btn>}
          </div>
        </div>
        {contact && <KV rows={[['Nama', contact.name], ['Email', contact.email]]} />}
        <Thread type="hiring" threadId={h.id} />
      </div>
    </Dialog>
  );
}

/** Sales & Client lane (COM-015): brief jadi LEAD untuk Commander — bukan mission otomatis. */
export function Services() {
  const toast = useToast();
  const [f, setF] = useState({ summary: '', budget: '', timeline: '' });
  const { busy, run } = useAction();
  const s = useLoad(() => rpc<{ ref: string; summary: string; status: string; created_at: string }[]>('st_company_leads'));
  return (
    <div className="st-page-in">
      <PageHead eyebrow="Company Workspace" title="Ajukan kebutuhan proyek" desc="Brief masuk ke Commander VIBOXS Services untuk discovery & proposal. Tidak ada penugasan otomatis; harga & lingkup disepakati lewat proposal." />
      <Card>
        <div className="st-form">
          <Area label="Kebutuhan" value={f.summary} onChange={(v) => setF({ ...f, summary: v })} rows={4} hint="Tujuan, ruang lingkup, hasil yang diharapkan." />
          <Text label="Perkiraan anggaran" value={f.budget} onChange={(v) => setF({ ...f, budget: v })} />
          <Text label="Target waktu" value={f.timeline} onChange={(v) => setF({ ...f, timeline: v })} />
          <div className="st-form__act"><Btn kind="primary" busy={busy === 's'} onClick={() => run('s', () => rpc<string>('st_company_lead', { p_summary: f.summary, p_budget: f.budget, p_timeline: f.timeline }), (ref) => { toast(`Brief ${ref} diterima Commander.`); setF({ summary: '', budget: '', timeline: '' }); s.reload(); }, (e) => toast(e, 'err'))}>Kirim brief</Btn></div>
        </div>
      </Card>
      <Card title="Brief terkirim">
        <Loaded state={s} empty={(d) => (d.length ? null : <p className="st-muted st-small">Belum ada.</p>)}>
          {(d) => <ul className="st-list">{d.map((l) => <li key={l.ref}><span><b>{l.ref}</b><small>{l.summary}</small></span><StatusBadge map={LEAD_STATUS} value={l.status} /><span className="st-small st-muted">{fmtDate(l.created_at, false)}</span></li>)}</ul>}
        </Loaded>
      </Card>
    </div>
  );
}
