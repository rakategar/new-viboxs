import { useState } from 'react';
import { useAction, useLoad } from '../../lib/hooks';
import { COMPANY_STATUS, SHOWCASE_STATUS, fmtDate, rupiah } from '../../lib/labels';
import { sb, must, rpc, type Company, type Showcase } from '../../lib/sb';
import { Area, Badge, Btn, Dialog, Empty, I, KV, Loaded, PageHead, StatusBadge, Tabs, Text, useToast } from '../../ui/kit';

/** Hiring Company Verification (PRD §03.4): NIB saja tidak cukup — Commander memvalidasi PIC, domain, kewenangan. */
export function Companies() {
  const toast = useToast();
  const [tab, setTab] = useState<'queue' | 'all'>('queue');
  const [sel, setSel] = useState<Company | null>(null);
  const s = useLoad(async () => must(sb.from('st_companies').select('*').order('created_at', { ascending: false })) as Promise<Company[]>);
  const list = (s.data ?? []).filter((c) => tab === 'all' || ['APPLIED', 'REVIEW', 'NEED_INFO'].includes(c.status));
  return (
    <div className="st-page-in">
      <PageHead eyebrow="Hiring Company Verification" title="Perusahaan" desc="Perusahaan hanya mencari learner yang opt-in dan bukan Ranger aktif. Verifikasi gratis; tolak bila PIC/kewenangan tidak meyakinkan." />
      <Tabs label="Status" value={tab} onChange={setTab} tabs={[['queue', 'Perlu keputusan', (s.data ?? []).filter((c) => ['APPLIED', 'REVIEW', 'NEED_INFO'].includes(c.status)).length], ['all', 'Semua']]} />
      <Loaded state={s} empty={() => (list.length ? null : <Empty title="Tidak ada perusahaan di sini" icon={I.users}>Perusahaan mendaftar dari edu.viboxs.com/for-companies → Studio.</Empty>)}>
        {() => (
          <div className="st-cards">
            {list.map((c, i) => (
              <button type="button" key={c.id} className="st-lead" style={{ ['--i' as string]: i }} onClick={() => setSel(c)}>
                <span className="row-between"><span className="st-mono">{c.ref}</span><StatusBadge map={COMPANY_STATUS} value={c.status} /></span>
                <b>{c.legal_name}</b>
                <span className="st-small st-muted">{c.pic_name} · {c.pic_role} · {c.business_email}</span>
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
  const { busy, run } = useAction();
  const decide = (st: string) => run(st, () => rpc('st_company_decide', { p_id: c.id, p_status: st, p_note: note }), () => onDone(`Status perusahaan: ${COMPANY_STATUS[st][0]}.`), (e) => toast(e, 'err'));
  const domainMatch = c.business_domain && c.business_email.endsWith('@' + c.business_domain.replace(/^https?:\/\//, '').replace(/^www\./, ''));
  return (
    <Dialog open onClose={onClose} title={c.legal_name} wide>
      <div className="st-stack">
        <KV rows={[['Ref', c.ref], ['NIB', c.nib ?? '—'], ['Domain', c.business_domain ?? '—'], ['Email bisnis', <span key="e">{c.business_email} {domainMatch ? <Badge tone="ok">domain cocok</Badge> : <Badge tone="warn">cek domain</Badge>}</span>],
          ['PIC', `${c.pic_name} · ${c.pic_role}`], ['Website', c.website ?? '—'], ['Diajukan', fmtDate(c.created_at)], ['Status', <StatusBadge key="s" map={COMPANY_STATUS} value={c.status} />]]} />
        <div><span className="st-eyebrow">Kebutuhan rekrutmen</span><p>{c.hiring_needs}</p></div>
        <Area label="Catatan keputusan" value={note} onChange={setNote} rows={2} hint="Wajib (min. 10 karakter) kecuali menandai “ditinjau”. Tercatat di audit." />
        <div className="st-dlg__foot">
          {['APPLIED', 'NEED_INFO'].includes(c.status) && <Btn onClick={() => decide('REVIEW')} busy={busy === 'REVIEW'}>Tandai ditinjau</Btn>}
          {c.status !== 'VERIFIED' && <Btn onClick={() => decide('NEED_INFO')} busy={busy === 'NEED_INFO'}>Minta info</Btn>}
          {c.status !== 'REJECTED' && c.status !== 'VERIFIED' && <Btn kind="danger" onClick={() => decide('REJECTED')} busy={busy === 'REJECTED'}>Tolak</Btn>}
          {c.status === 'VERIFIED' && <Btn kind="danger" onClick={() => decide('SUSPENDED')} busy={busy === 'SUSPENDED'}>Tangguhkan</Btn>}
          {!['VERIFIED'].includes(c.status) && <Btn kind="primary" onClick={() => decide('VERIFIED')} busy={busy === 'VERIFIED'}><I.check size={16} />Verifikasi</Btn>}
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
