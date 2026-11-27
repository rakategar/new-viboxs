import { useState } from 'react';
import { useAction, useLoad } from '../../lib/hooks';
import { COMPANY_PURPOSE, COMPANY_SOURCE, COMPANY_STATUS, OUTBOX_STATUS, SHOWCASE_STATUS, fmtDate, rupiah } from '../../lib/labels';
import { sb, must, rpc, sendOutbox, type Company, type OutboxRow, type Showcase } from '../../lib/sb';
import { Area, Badge, Btn, Dialog, Empty, I, KV, Loaded, PageHead, Select, StatusBadge, Tabs, Text, useToast } from '../../ui/kit';

const QUEUE = ['SUBMITTED', 'IN_COMMANDER_QUEUE', 'REVIEW', 'NEED_INFO'];

/** Company Applications (v4 §03.3): satu antrean untuk EDU /for-companies & Studio /company. NIB saja tidak cukup. */
export function Companies() {
  const toast = useToast();
  const [tab, setTab] = useState<'queue' | 'invited' | 'all'>('queue');
  const [sel, setSel] = useState<Company | null>(null);
  const s = useLoad(async () => must(sb.from('st_companies').select('*').order('created_at', { ascending: false })) as Promise<Company[]>);
  const all = s.data ?? [];
  const list = all.filter((c) => tab === 'all' || (tab === 'queue' ? QUEUE.includes(c.status) : c.status === 'COMPANY_INVITE_SENT'));
  return (
    <div className="st-page-in">
      <PageHead eyebrow="Company Applications" title="Perusahaan" desc="Pengajuan dari edu.viboxs.com/for-companies dan Studio masuk ke sini. Verifikasi gratis; role Company aktif setelah PIC menerima undangan aman." />
      <Tabs label="Status" value={tab} onChange={setTab} tabs={[['queue', 'Perlu keputusan', all.filter((c) => QUEUE.includes(c.status)).length], ['invited', 'Menunggu aktivasi', all.filter((c) => c.status === 'COMPANY_INVITE_SENT').length], ['all', 'Semua']]} />
      <Loaded state={s} empty={() => (list.length ? null : <Empty title="Tidak ada perusahaan di sini" icon={I.users}>Perusahaan mendaftar dari edu.viboxs.com/for-companies.</Empty>)}>
        {() => (
          <div className="st-cards">
            {list.map((c, i) => (
              <button type="button" key={c.id} className="st-lead" style={{ ['--i' as string]: i }} onClick={() => setSel(c)}>
                <span className="row-between"><span className="st-mono">{c.ref}</span><StatusBadge map={COMPANY_STATUS} value={c.status} /></span>
                <b>{c.legal_name}</b>
                <span className="st-small st-muted">{c.pic_name} · {c.pic_role} · {c.business_email}</span>
                <span className="st-row">{c.needs_completion && <Badge tone="warn">Lengkapi data</Badge>}<small className="st-muted">{COMPANY_SOURCE[c.source] ?? c.source} · {fmtDate(c.created_at)}</small></span>
              </button>
            ))}
          </div>
        )}
      </Loaded>
      {sel && <CompanyDialog c={sel} onClose={() => setSel(null)} onDone={(m) => { toast(m); setSel(null); s.reload(); }} />}
    </div>
  );
}

function CompanyDialog({ c, onClose, onDone }: { c: Company; onClose: () => void; onDone: (m: string) => void }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [fix, setFix] = useState({ company_whatsapp: c.company_whatsapp ?? '', industry: c.industry ?? '', address: c.address ?? '', purpose: (c.purpose ?? 'hiring') as string, nib: c.nib ?? '' });
  const { busy, run } = useAction();
  const files = useLoad(async () => {
    const paths = [c.logo_path, c.nib_doc_path].filter(Boolean) as string[];
    if (!paths.length) return {} as Record<string, string>;
    const { data } = await sb.storage.from('st-company').createSignedUrls(paths, 60);
    return Object.fromEntries((data ?? []).filter((x) => x.signedUrl).map((x) => [x.path, x.signedUrl])) as Record<string, string>;
  });
  const notes = useLoad(async () => must(sb.from('st_outbox').select('*').eq('subject_id', c.id).order('created_at', { ascending: false })) as Promise<OutboxRow[]>);
  const decide = (st: string) => run(st, async () => { await rpc('st_company_decide', { p_id: c.id, p_status: st, p_note: note }); return sendOutbox(); },
    (r) => onDone(`Status perusahaan: ${COMPANY_STATUS[st === 'VERIFIED' ? 'COMPANY_INVITE_SENT' : st][0]}.${st !== 'REVIEW' ? (r?.failed ? ' Email dicoba ulang otomatis.' : ' Email status dikirim.') : ''}`), (e) => toast(e, 'err'));
  const complete = () => run('fix', () => rpc('st_company_complete', { p_id: c.id, p: fix }), () => onDone('Data perusahaan dilengkapi — siap ditinjau.'), (e) => toast(e, 'err'));
  const reinvite = () => run('re', async () => { await rpc('st_company_reinvite', { p_id: c.id }); return sendOutbox(); }, () => onDone('Undangan Company baru dikirim; tautan lama tidak berlaku.'), (e) => toast(e, 'err'));
  const domainMatch = c.website && c.business_email.endsWith('@' + c.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]);
  const logoUrl = c.logo_path ? files.data?.[c.logo_path] : undefined;
  const docUrl = c.nib_doc_path ? files.data?.[c.nib_doc_path] : undefined;
  const open = QUEUE.includes(c.status);
  return (
    <Dialog open onClose={onClose} title={c.legal_name} wide>
      <div className="st-stack">
        <div className="st-row">
          {logoUrl ? <img src={logoUrl} alt={`Logo ${c.legal_name}`} style={{ maxHeight: 64, maxWidth: 180, objectFit: 'contain', background: '#fff', borderRadius: 8, padding: 6 }} /> : <Badge tone="muted">{c.logo_path ? 'Memuat logo…' : 'Tanpa logo'}</Badge>}
          {c.logo_path && <Badge tone={c.logo_rights ? 'ok' : 'warn'}>{c.logo_rights ? 'Izin logo dinyatakan' : 'Izin logo belum ada'}</Badge>}
        </div>
        <KV rows={[['Ref', c.ref], ['Sumber', `${COMPANY_SOURCE[c.source] ?? c.source}${c.source_ref ? ` · ${c.source_ref}` : ''}`], ['Diajukan', fmtDate(c.created_at)], ['Status', <StatusBadge key="s" map={COMPANY_STATUS} value={c.status} />],
          ['NIB', <span key="n">{c.nib ?? '—'} {docUrl ? <a href={docUrl} target="_blank" rel="noopener noreferrer">Lihat dokumen (60 detik)</a> : c.nib_doc_path ? null : <Badge tone="warn">tanpa dokumen</Badge>}</span>],
          ['Industri', c.industry ?? '—'], ['Alamat', c.address ?? '—'], ['Website', c.website ?? '—'],
          ['Email perusahaan', <span key="e">{c.business_email} {c.website ? (domainMatch ? <Badge tone="ok">domain cocok</Badge> : <Badge tone="warn">cek domain</Badge>) : null}</span>],
          ['WhatsApp', <span key="w">{c.company_whatsapp ?? '—'} <small className="st-muted">{c.comm_consent_wa ? 'consent WA ✓' : 'tanpa consent WA'}</small></span>],
          ['PIC', `${c.pic_name} · ${c.pic_role}${c.pic_email ? ` · ${c.pic_email}` : ''}`], ['Tujuan', c.purpose ? COMPANY_PURPOSE[c.purpose] : '—']]} />
        <div><span className="st-eyebrow">Kebutuhan kandidat / layanan</span><p>{c.hiring_needs}</p></div>
        {c.review_note && <p className="st-small st-muted">Catatan terakhir: {c.review_note}</p>}
        <details className="st-details">
          <summary>Notifikasi ({notes.data?.length ?? 0})</summary>
          <ul className="st-list">{(notes.data ?? []).map((o) => (
            <li key={o.id}><span><b>{o.channel === 'email' ? 'Email' : 'WhatsApp'}</b><small>{o.topic} · {o.recipient}{o.last_error && o.status !== 'sent' ? ` · ${o.last_error}` : ''}</small></span><StatusBadge map={OUTBOX_STATUS} value={o.status} /></li>
          ))}</ul>
        </details>
        {c.needs_completion && open && (
          <section className="st-invite-out" aria-label="Lengkapi data">
            <span className="st-eyebrow">Lengkapi data dari balasan perusahaan</span>
            <div className="st-form">
              <Text label="WhatsApp perusahaan" value={fix.company_whatsapp} onChange={(v) => setFix({ ...fix, company_whatsapp: v })} placeholder="0812xxxxxxx" />
              <Text label="Industri" value={fix.industry} onChange={(v) => setFix({ ...fix, industry: v })} />
              <Text label="NIB" value={fix.nib} onChange={(v) => setFix({ ...fix, nib: v })} />
              <Select label="Tujuan" value={fix.purpose} onChange={(v) => setFix({ ...fix, purpose: v })} options={Object.entries(COMPANY_PURPOSE) as [string, string][]} />
              <Area label="Alamat usaha" value={fix.address} onChange={(v) => setFix({ ...fix, address: v })} rows={2} />
              <div className="st-form__act"><Btn onClick={complete} busy={busy === 'fix'}>Simpan data</Btn></div>
            </div>
          </section>
        )}
        <Area label="Catatan keputusan" value={note} onChange={setNote} rows={2} hint="Wajib (min. 10 karakter) kecuali “ditinjau”. Catatan ikut terkirim di email status ke perusahaan." />
        <div className="st-dlg__foot">
          {['SUBMITTED', 'IN_COMMANDER_QUEUE', 'NEED_INFO'].includes(c.status) && <Btn onClick={() => decide('REVIEW')} busy={busy === 'REVIEW'}>Tandai ditinjau</Btn>}
          {open && <Btn onClick={() => decide('NEED_INFO')} busy={busy === 'NEED_INFO'}>Minta info</Btn>}
          {(open || c.status === 'COMPANY_INVITE_SENT') && <Btn kind="danger" onClick={() => decide('REJECTED')} busy={busy === 'REJECTED'}>Tolak</Btn>}
          {['ACTIVE', 'VERIFIED'].includes(c.status) && <Btn kind="danger" onClick={() => decide('SUSPENDED')} busy={busy === 'SUSPENDED'}>Tangguhkan</Btn>}
          {c.status === 'COMPANY_INVITE_SENT' && <Btn onClick={reinvite} busy={busy === 're'}><I.key size={14} />Kirim ulang undangan</Btn>}
          {open && <Btn kind="primary" onClick={() => decide('VERIFIED')} busy={busy === 'VERIFIED'} disabled={c.needs_completion}><I.check size={16} />Verifikasi &amp; kirim undangan</Btn>}
        </div>
      </div>
    </Dialog>
  );
}

/** Public trust gate (PRD §11): tayang hanya PUBLIC_APPROVED; nominal dihitung dari payable lunas + consent. */
export function ShowcaseReview() {
  const toast = useToast();
  const [sel, setSel] = useState<Showcase | null>(null);
  const s = useLoad(async () => must(sb.from('st_showcase').select('*').order('updated_at', { ascending: false })) as Promise<Showcase[]>);
  return (
    <div className="st-page-in">
      <PageHead eyebrow="Public Trust Gate" title="Showcase Ranger & OPC" desc="Maksimal 5 per jenis tampil di EDU. Tanpa profil yang disetujui, section disembunyikan — tidak ada kartu contoh." />
      <Loaded state={s} empty={(d) => (d.length ? null : <Empty title="Belum ada pengajuan" icon={I.star}>Ranger dan OPC Founder mengajukan profilnya sendiri (dengan consent) dari menu Showcase.</Empty>)}>
        {(d) => <ul className="st-list">{d.map((x) => <li key={x.id}><span><b>{x.display_name} · {x.kind === 'ranger' ? 'Ranger' : 'OPC'}</b><small>{x.specialization}{x.review_due ? ` · review ulang ${fmtDate(x.review_due, false)}` : ''}</small></span><StatusBadge map={SHOWCASE_STATUS} value={x.status} /><Btn size="sm" onClick={() => setSel(x)}>Periksa</Btn></li>)}</ul>}
      </Loaded>
      {sel && <ShowcaseDialog x={sel} onClose={() => setSel(null)} onDone={(m) => { toast(m); setSel(null); s.reload(); }} />}
    </div>
  );
}

function ShowcaseDialog({ x, onClose, onDone }: { x: Showcase; onClose: () => void; onDone: (m: string) => void }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [from, setFrom] = useState(x.income_from ?? '');
  const [to, setTo] = useState(x.income_to ?? '');
  const { busy, run } = useAction();
  return (
    <Dialog open onClose={onClose} title={x.display_name} wide>
      <div className="st-stack">
        <KV rows={[['Jenis', x.kind], ['Spesialisasi', x.specialization], ['Status produk', x.product_status ?? '—'], ['Consent publikasi', x.consent_at ? `${fmtDate(x.consent_at)} · ${x.consent_version}` : 'Belum'],
          ['Consent nominal', x.income_consent ? 'Ya' : 'Tidak'], ['Nominal terverifikasi', x.income_amount != null ? `${rupiah(x.income_amount)} (${x.income_from} – ${x.income_to})` : '—']]} />
        {x.summary && <p>{x.summary}</p>}
        <ul className="st-list">{x.evidence.map((e) => <li key={e.url}><span><b>{e.label || 'Bukti'}</b><small>{e.url}</small></span><a href={e.url} target="_blank" rel="noopener noreferrer" className="st-btn st-btn--ghost st-btn--sm">Buka<I.ext size={14} /></a></li>)}</ul>
        {x.kind === 'ranger' && x.income_consent && (
          <div className="st-form">
            <Text label="Periode dari" type="date" value={from} onChange={setFrom} />
            <Text label="Sampai" type="date" value={to} onChange={setTo} />
            <div className="st-form__act"><Btn busy={busy === 'inc'} onClick={() => run('inc', () => rpc<number>('st_showcase_set_income', { p_id: x.id, p_from: from, p_to: to }), (v) => onDone(`Nominal dihitung dari transfer tercatat: ${rupiah(v ?? 0)}.`), (e) => toast(e, 'err'))}>Hitung dari payable lunas</Btn></div>
          </div>
        )}
        {x.status === 'SUBMITTED' && <>
          <Area label="Hasil verifikasi identitas & bukti" value={note} onChange={setNote} rows={2} />
          <div className="st-dlg__foot">
            <Btn kind="danger" busy={busy === 'n'} onClick={() => run('n', () => rpc('st_showcase_decide', { p_id: x.id, p_approve: false, p_note: note }), () => onDone('Tidak disetujui.'), (e) => toast(e, 'err'))}>Tolak</Btn>
            <Btn kind="primary" busy={busy === 'y'} onClick={() => run('y', () => rpc('st_showcase_decide', { p_id: x.id, p_approve: true, p_note: note }), () => onDone('Profil tayang di EDU (review ulang 180 hari).'), (e) => toast(e, 'err'))}>Setujui publikasi</Btn>
          </div>
        </>}
      </div>
    </Dialog>
  );
}
