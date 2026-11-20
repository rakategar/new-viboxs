import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAction, useLoad } from '../../lib/hooks';
import { BID_KIND, CATEGORY, DELIV_STATUS, FEE_TYPE, MISSION_STATUS, PAY_STATUS, SCHEDULE, ago, fmtDate, fromLocalInput, rupiah, toLocalInput } from '../../lib/labels';
import { sb, must, rpc, type Assignment, type Bid, type Deliverable, type Mission, type MissionPrivate, type Payable } from '../../lib/sb';
import { Area, Badge, Btn, Card, Check, Dialog, Empty, I, KV, Loaded, MissionRail, PageHead, Select, StatusBadge, TagInput, Text, Toggle, useToast } from '../../ui/kit';
import Thread from '../Thread';

type Ranger = { id: string; display_name: string; email: string | null; skills: string[]; headline: string | null };
const EDITABLE = ['draft', 'offered', 'bidding', 'negotiation'];

export default function MissionDetail() {
  const { id = '' } = useParams();
  const toast = useToast();
  const s = useLoad(async () => {
    const [m, p, targets, bids, asg, del, pay, rgr] = await Promise.all([
      must(sb.from('st_missions').select('*').eq('id', id).single()) as Promise<Mission>,
      must(sb.from('st_mission_private').select('*').eq('mission_id', id).maybeSingle()) as Promise<MissionPrivate | null>,
      must(sb.from('st_mission_targets').select('ranger_id, created_at').eq('mission_id', id)) as Promise<{ ranger_id: string; created_at: string }[]>,
      must(sb.from('st_bids').select('*').eq('mission_id', id).order('created_at')) as Promise<Bid[]>,
      must(sb.from('st_assignments').select('*').eq('mission_id', id)) as Promise<Assignment[]>,
      must(sb.from('st_deliverables').select('*').eq('mission_id', id).order('version', { ascending: false })) as Promise<Deliverable[]>,
      must(sb.from('st_payables').select('*').eq('source_type', 'mission').eq('source_id', id)) as Promise<Payable[]>,
      must(sb.from('st_role_grants').select('person_id, st_profiles!inner(id, display_name, email, skills, headline)').eq('role', 'ranger').eq('status', 'active')) as unknown as Promise<{ person_id: string; st_profiles: Ranger }[]>,
    ]);
    return { m, p, targets, bids, asg, del, pay, rangers: rgr.map((r) => r.st_profiles) };
  }, [id]);

  // perubahan dari Ranger (bid, deliverable, pesan) memicu muat ulang otomatis
  useEffect(() => {
    const ch = sb.channel(`m-${id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'st_notifications' }, (p) => {
      if (String((p.new as { link?: string }).link ?? '').endsWith(id)) s.reload();
    }).subscribe();
    return () => { sb.removeChannel(ch); };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="st-page-in">
      <Link to="/command/missions" className="st-back"><I.back size={16} />Semua missions</Link>
      <Loaded state={s}>
        {(d) => {
          const name = (rid: string) => d.rangers.find((r) => r.id === rid)?.display_name || d.rangers.find((r) => r.id === rid)?.email || 'Ranger';
          return (
            <>
              <PageHead eyebrow={`${d.m.ref} · ${CATEGORY[d.m.category]}`} title={d.m.title} desc={<StatusBadge map={MISSION_STATUS} value={d.m.status} />}>
                <StatusMenu m={d.m} onDone={s.reload} />
              </PageHead>
              <MissionRail status={d.m.status} />
              <div className="st-split">
                <div className="st-stack">
                  <BriefEditor m={d.m} onSaved={s.reload} />
                  <Bids d={d} name={name} onDone={s.reload} />
                  <Deliveries d={d} name={name} onDone={s.reload} />
                  {d.asg.map((a) => (
                    <Card key={a.id} title={<>Thread misi · {name(a.ranger_id)}</>} desc="Privat Commander ↔ Ranger ini. Tidak pernah dibagikan ke klien/partner otomatis.">
                      <Thread type="mission" threadId={id} rangerId={a.ranger_id} />
                    </Card>
                  ))}
                </div>
                <div className="st-stack">
                  <Commercial p={d.p} m={d.m} asg={d.asg} onSaved={s.reload} />
                  <Offer d={d} onDone={s.reload} toast={toast} />
                  {d.asg.length > 0 && (
                    <Card title="Assignment & perjanjian">
                      <ul className="st-list">{d.asg.map((a) => (
                        <li key={a.id}><span><b>{name(a.ranger_id)}</b><small>{rupiah(a.agreed_fee)} · {SCHEDULE[a.payout_schedule]} · v{a.agreement_version}</small></span>
                          <Badge tone={a.agreement_state === 'executed' ? 'ok' : 'warn'} dot={a.agreement_state !== 'executed'}>{a.agreement_state === 'executed' ? `Diterima ${fmtDate(a.accepted_at, false)}` : 'Menunggu Ranger'}</Badge></li>
                      ))}</ul>
                    </Card>
                  )}
                  {d.pay.length > 0 && (
                    <Card title="Payable" actions={<Link to="/command/payouts" className="st-btn st-btn--quiet st-btn--sm">Kelola</Link>}>
                      <ul className="st-list">{d.pay.map((p) => <li key={p.id}><span><b>{name(p.beneficiary_id)}</b><small>{rupiah(p.amount)}</small></span><StatusBadge map={PAY_STATUS} value={p.status} /></li>)}</ul>
                    </Card>
                  )}
                </div>
              </div>
            </>
          );
        }}
      </Loaded>
    </div>
  );
}

function BriefEditor({ m, onSaved }: { m: Mission; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState(m);
  useEffect(() => setF(m), [m]);
  const { busy, run } = useAction();
  const locked = !EDITABLE.includes(m.status);
  const leak = /(\+?62|08)\d{7,}|@[a-z0-9-]+\.[a-z]{2,}|rp\s?\d|\d{1,3}(\.\d{3}){2,}/i.test(`${f.brief} ${f.deliverables} ${f.acceptance}`);
  const save = () => run('save', async () => {
    await must(sb.from('st_missions').update({
      title: f.title, category: f.category, brief: f.brief, deliverables: f.deliverables, acceptance: f.acceptance, skill_tags: f.skill_tags,
      due_at: f.due_at, offer_close_at: f.offer_close_at, fee_type: f.fee_type, negotiation_allowed: f.negotiation_allowed, revisions_included: f.revisions_included,
    }).eq('id', m.id));
  }, () => { toast('Brief disimpan.'); onSaved(); }, (e) => toast(e, 'err'));
  return (
    <Card title="Brief tersanitasi" desc="Inilah yang dilihat Ranger yang ditargetkan. Jangan masukkan kontak, nama rahasia, harga klien, atau margin.">
      {locked && <div className="st-alert st-alert--info">Brief dikunci setelah penunjukan. Perubahan lingkup harus lewat change request & perjanjian versi baru.</div>}
      {leak && !locked && <div className="st-alert st-alert--warn" role="alert"><I.lock size={16} />Terdeteksi pola nomor telepon, email, atau nominal rupiah di brief. Pastikan bukan data klien.</div>}
      <fieldset className="st-form" disabled={locked}>
        <Text label="Judul" value={f.title} onChange={(v) => setF({ ...f, title: v })} wide />
        <Select label="Kategori" value={f.category} onChange={(v) => setF({ ...f, category: v })} options={Object.entries(CATEGORY)} />
        <Select label="Tipe fee" value={f.fee_type} onChange={(v) => setF({ ...f, fee_type: v })} options={Object.entries(FEE_TYPE)} />
        <Area label="Brief" value={f.brief} onChange={(v) => setF({ ...f, brief: v })} rows={5} hint="Kebutuhan produksi, konteks yang aman, batasan." />
        <Area label="Deliverables" value={f.deliverables} onChange={(v) => setF({ ...f, deliverables: v })} rows={3} />
        <Area label="Kriteria penerimaan" value={f.acceptance} onChange={(v) => setF({ ...f, acceptance: v })} rows={3} />
        <TagInput label="Skill tags" value={f.skill_tags} onChange={(v) => setF({ ...f, skill_tags: v })} />
        <Text label="Tenggat kerja (WIB)" type="datetime-local" value={toLocalInput(f.due_at)} onChange={(v) => setF({ ...f, due_at: fromLocalInput(v) })} />
        <Text label="Penawaran ditutup (WIB)" type="datetime-local" value={toLocalInput(f.offer_close_at)} onChange={(v) => setF({ ...f, offer_close_at: fromLocalInput(v) })} />
        <Text label="Revisi termasuk" type="number" min={0} value={f.revisions_included ?? ''} onChange={(v) => setF({ ...f, revisions_included: v === '' ? null : Number(v) })} />
        <Toggle label="Negosiasi diizinkan" checked={f.negotiation_allowed} onChange={(v) => setF({ ...f, negotiation_allowed: v })} />
        {!locked && <div className="st-form__act"><Btn kind="primary" onClick={save} busy={busy === 'save'}>Simpan brief</Btn></div>}
      </fieldset>
    </Card>
  );
}

function Commercial({ p, m, asg, onSaved }: { p: MissionPrivate | null; m: Mission; asg: Assignment[]; onSaved: () => void }) {
  const toast = useToast();
  const [q, setQ] = useState(p?.client_quote?.toString() ?? '');
  const [c, setC] = useState(p?.cost_ceiling?.toString() ?? '');
  const [n, setN] = useState(p?.internal_notes ?? '');
  const { busy, run } = useAction();
  const fees = asg.reduce((a, x) => a + Number(x.agreed_fee), 0);
  const quote = q ? Number(q) : null;
  const save = () => run('s', async () => {
    await must(sb.from('st_mission_private').upsert({ mission_id: m.id, client_quote: q ? Number(q) : null, cost_ceiling: c ? Number(c) : null, internal_notes: n || null }));
  }, () => { toast('Data komersial disimpan (tercatat di audit).'); onSaved(); }, (e) => toast(e, 'err'));
  return (
    <Card title={<><I.lock size={16} /> Data komersial</>} desc="Tabel terpisah — hanya Commander. Tidak pernah ikut payload Ranger atau partner." className="st-card--private">
      <div className="st-form">
        <Text label="Harga ke klien (IDR)" type="number" min={0} value={q} onChange={setQ} />
        <Text label="Plafon biaya internal" type="number" min={0} value={c} onChange={setC} />
        <Area label="Catatan internal" value={n} onChange={setN} rows={2} />
      </div>
      <KV rows={[['Fee Ranger disepakati', rupiah(fees || null)], ['Selisih indikatif', quote != null && fees ? <b key="m" className={quote - fees < 0 ? 'st-neg' : 'st-pos'}>{rupiah(quote - fees)}</b> : '—']]} />
      <p className="st-hint">Indikatif — belum termasuk biaya operasional, pajak, atau penyesuaian.</p>
      <div className="st-form__act"><Btn onClick={save} busy={busy === 's'}>Simpan</Btn></div>
    </Card>
  );
}

function Offer({ d, onDone, toast }: { d: { m: Mission; targets: { ranger_id: string }[]; rangers: Ranger[] }; onDone: () => void; toast: ReturnType<typeof useToast> }) {
  const targeted = new Set(d.targets.map((t) => t.ranger_id));
  const [pick, setPick] = useState<string[]>([]);
  const { busy, run } = useAction();
  const can = ['draft', 'offered', 'bidding', 'negotiation'].includes(d.m.status);
  const score = (r: Ranger) => d.m.skill_tags.filter((t) => r.skills?.some((s) => s.toLowerCase().includes(t.toLowerCase()))).length;
  const sorted = useMemo(() => [...d.rangers].sort((a, b) => score(b) - score(a)), [d.rangers, d.m.skill_tags]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = () => run('o', () => rpc<number>('st_offer_mission', { p_mission: d.m.id, p_rangers: pick }),
    (n) => { toast(`Penawaran dikirim ke ${n} Ranger. Hanya mereka yang bisa melihat mission ini.`); setPick([]); onDone(); }, (e) => toast(e, 'err'));
  return (
    <Card title="Target penawaran" desc="MIS-02: hanya Ranger terpilih yang bisa melihat — bahkan lewat URL langsung.">
      {!d.rangers.length ? <Empty title="Belum ada Ranger aktif" icon={I.users}><Link to="/command/people">Undang Ranger</Link> terlebih dahulu.</Empty> : (
        <>
          <ul className="st-pick">
            {sorted.map((r) => {
              const on = targeted.has(r.id);
              const sc = score(r);
              return (
                <li key={r.id}>
                  {on ? <span className="st-pick__on"><I.check size={14} /></span> : <Check label={<span className="sr-only">Pilih {r.display_name || r.email}</span>} checked={pick.includes(r.id)} onChange={(v) => setPick(v ? [...pick, r.id] : pick.filter((x) => x !== r.id))} />}
                  <span><b>{r.display_name || r.email}</b><small>{r.headline || r.skills?.join(', ') || 'Belum ada keahlian'}</small></span>
                  {on ? <Badge tone="info">Ditawarkan</Badge> : sc > 0 && <Badge tone="violet">{sc} skill cocok</Badge>}
                </li>
              );
            })}
          </ul>
          {can && <div className="st-form__act"><Btn kind="primary" onClick={go} busy={busy === 'o'} disabled={!pick.length}><I.arrow size={16} />{d.m.status === 'draft' ? 'Publish penawaran' : 'Tambah penerima'}</Btn></div>}
        </>
      )}
    </Card>
  );
}

function Bids({ d, name, onDone }: { d: { m: Mission; bids: Bid[]; asg: Assignment[] }; name: (id: string) => string; onDone: () => void }) {
  const [act, setAct] = useState<{ kind: 'counter' | 'appoint' | 'decline'; ranger: string; amount?: number } | null>(null);
  const by = useMemo(() => {
    const m = new Map<string, Bid[]>();
    d.bids.forEach((b) => m.set(b.ranger_id, [...(m.get(b.ranger_id) ?? []), b]));
    return [...m.entries()];
  }, [d.bids]);
  const assigned = new Set(d.asg.map((a) => a.ranger_id));
  const open = ['offered', 'bidding', 'negotiation', 'assigned_pending_agreement'].includes(d.m.status);
  return (
    <Card title="Tawaran & negosiasi" desc="Riwayat immutable. Tawaran satu Ranger tidak terlihat Ranger lain.">
      {!by.length ? <Empty title="Belum ada tawaran" icon={I.inbox}>Tawaran muncul realtime setelah penawaran dipublish.</Empty> : (
        <div className="st-bids">
          {by.map(([rid, list]) => {
            const last = [...list].reverse().find((b) => b.amount != null);
            const withdrawn = list[list.length - 1].kind === 'withdraw' || list[list.length - 1].kind === 'decline';
            return (
              <div key={rid} className="st-bid">
                <header><b>{name(rid)}</b>{assigned.has(rid) ? <Badge tone="ok">Ditunjuk</Badge> : withdrawn ? <Badge tone="muted">Selesai</Badge> : <Badge tone="violet" dot>Aktif</Badge>}</header>
                <ol className="st-timeline">
                  {list.map((b, i) => (
                    <li key={b.id} className={`k-${b.kind}`} style={{ ['--i' as string]: i }}>
                      <span><b>{BID_KIND[b.kind]}</b>{b.amount != null && <> · {rupiah(b.amount)}</>}{b.duration_days && <> · {b.duration_days} hari</>}</span>
                      {b.note && <p>{b.note}</p>}
                      <time>{ago(b.created_at)}</time>
                    </li>
                  ))}
                </ol>
                {open && !assigned.has(rid) && !withdrawn && (
                  <div className="st-row">
                    {d.m.negotiation_allowed && <Btn size="sm" onClick={() => setAct({ kind: 'counter', ranger: rid, amount: last?.amount ?? undefined })}>Counteroffer</Btn>}
                    <Btn size="sm" kind="danger" onClick={() => setAct({ kind: 'decline', ranger: rid })}>Tidak lanjut</Btn>
                    <Btn size="sm" kind="primary" onClick={() => setAct({ kind: 'appoint', ranger: rid, amount: last?.amount ?? undefined })}><I.check size={14} />Tunjuk</Btn>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {act && <BidAction m={d.m} act={act} name={name(act.ranger)} onClose={() => setAct(null)} onDone={() => { setAct(null); onDone(); }} />}
    </Card>
  );
}

function BidAction({ m, act, name, onClose, onDone }: { m: Mission; act: { kind: 'counter' | 'appoint' | 'decline'; ranger: string; amount?: number }; name: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [amount, setAmount] = useState(act.amount?.toString() ?? '');
  const [note, setNote] = useState('');
  const [sched, setSched] = useState('on_acceptance');
  const [terms, setTerms] = useState(`Lingkup: sesuai brief ${m.ref} versi saat ini.\nDeliverable & kriteria penerimaan: sesuai brief.\nRevisi: ${m.revisions_included ?? '[jumlah]'} kali dalam lingkup.\nKerahasiaan: brief, aset, dan informasi proyek tidak dibagikan ke pihak lain.\nHak kekayaan intelektual: beralih setelah pembayaran lunas.\nPembayaran: sesuai jadwal di atas setelah deliverable diterima.`);
  const { busy, run } = useAction();
  const go = () => run('go', async () => {
    if (act.kind === 'appoint') {
      await rpc('st_appoint', { p_mission: m.id, p_ranger: act.ranger, p_fee: Number(amount), p_schedule: sched, p_terms: terms });
    } else {
      if (act.kind === 'counter' && !amount) throw new Error('Isi nominal counteroffer.');
      await must(sb.from('st_bids').insert({ mission_id: m.id, ranger_id: act.ranger, kind: act.kind, amount: act.kind === 'counter' ? Number(amount) : null, note: note || null }));
    }
  }, () => { toast(act.kind === 'appoint' ? `${name} ditunjuk. Menunggu perjanjian diterima.` : 'Tanggapan dikirim ke Ranger.'); onDone(); }, (e) => toast(e, 'err'));
  const title = { counter: `Counteroffer ke ${name}`, appoint: `Tunjuk ${name}`, decline: `Tidak melanjutkan tawaran ${name}` }[act.kind];
  return (
    <Dialog open onClose={onClose} title={title} wide={act.kind === 'appoint'}>
      <div className="st-form">
        {act.kind !== 'decline' && <Text label={act.kind === 'appoint' ? 'Fee yang disepakati (IDR)' : 'Nominal counter (IDR)'} type="number" min={0} value={amount} onChange={setAmount} required hint="Payable dihitung dari fee ini — bukan dari angka tawaran awal." />}
        {act.kind === 'appoint' && <Select label="Jadwal pembayaran" value={sched} onChange={setSched} options={Object.entries(SCHEDULE)} />}
        {act.kind === 'appoint' ? <Area label="Ringkasan perjanjian (v1)" value={terms} onChange={setTerms} rows={8} hint="Template draf — ketentuan hukum final menunggu review. Ranger harus menerima sebelum bisa mengirim deliverable." /> : <Area label="Catatan untuk Ranger" value={note} onChange={setNote} rows={3} />}
        <div className="st-form__act"><Btn kind={act.kind === 'decline' ? 'danger' : 'primary'} onClick={go} busy={busy === 'go'}>{act.kind === 'appoint' ? 'Tunjuk & kirim perjanjian' : act.kind === 'counter' ? 'Kirim counteroffer' : 'Kirim'}</Btn></div>
      </div>
    </Dialog>
  );
}

function Deliveries({ d, name, onDone }: { d: { del: Deliverable[] }; name: (id: string) => string; onDone: () => void }) {
  const toast = useToast();
  const [rev, setRev] = useState<Deliverable | null>(null);
  const [note, setNote] = useState('');
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const { busy, run } = useAction();
  const CHECKS = ['Kelengkapan sesuai deliverables', 'Memenuhi kriteria penerimaan', 'Format file sesuai', 'Smoke check fungsi (bila relevan)'];
  const decide = (dl: Deliverable, decision: 'accept' | 'revision') => run(decision + dl.id, async () => {
    if (decision === 'accept' && CHECKS.some((c) => !checks[c])) throw new Error('Lengkapi checklist QC sebelum menerima. Item yang belum diuji tidak boleh dianggap lulus.');
    await rpc('st_review_deliverable', { p_id: dl.id, p_decision: decision, p_note: [note.trim(), decision === 'accept' ? `QC: ${CHECKS.join('; ')}` : ''].filter(Boolean).join('\n') || null });
  }, () => { toast(decision === 'accept' ? 'Diterima. Payable masuk antrean approval (belum dibayar).' : 'Permintaan revisi dikirim.'); setRev(null); setNote(''); setChecks({}); onDone(); }, (e) => toast(e, 'err'));
  return (
    <Card title="Deliverable & QC" desc="QC manusia dengan checklist. AI Quality Inspector masih Coming Soon.">
      {!d.del.length ? <Empty title="Belum ada deliverable" icon={I.file} /> : (
        <ul className="st-deliv">
          {d.del.map((x) => (
            <li key={x.id}>
              <div className="row-between"><span><b>v{x.version}</b> · {name(x.ranger_id)} · {ago(x.created_at)}</span><StatusBadge map={DELIV_STATUS} value={x.status} /></div>
              <a href={x.url} target="_blank" rel="noopener noreferrer nofollow" className="st-url"><I.ext size={14} />{x.url}</a>
              {x.note && <p className="st-small">{x.note}</p>}
              {x.review_note && <p className="st-small st-muted">Review: {x.review_note}</p>}
              {x.status === 'submitted' && (rev?.id === x.id ? (
                <div className="st-qc">
                  {CHECKS.map((c) => <Check key={c} label={c} checked={!!checks[c]} onChange={(v) => setChecks({ ...checks, [c]: v })} />)}
                  <Area label="Catatan / lingkup revisi" value={note} onChange={setNote} rows={3} />
                  <div className="st-row"><Btn onClick={() => decide(x, 'revision')} busy={busy === 'revision' + x.id}>Minta revisi</Btn><Btn kind="primary" onClick={() => decide(x, 'accept')} busy={busy === 'accept' + x.id}><I.check size={14} />Terima</Btn></div>
                </div>
              ) : <Btn size="sm" kind="primary" onClick={() => setRev(x)}>Review</Btn>)}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function StatusMenu({ m, onDone }: { m: Mission; onDone: () => void }) {
  const toast = useToast();
  const [to, setTo] = useState<string | null>(null);
  const [why, setWhy] = useState('');
  const { busy, run } = useAction();
  const opts: [string, string][] = [];
  if (['offered', 'bidding', 'negotiation', 'draft'].includes(m.status)) opts.push(['withdrawn', 'Tarik penawaran']);
  if (m.status === 'in_progress') opts.push(['on_hold', 'Tahan']);
  if (m.status === 'on_hold') opts.push(['in_progress', 'Lanjutkan']);
  if (['in_progress', 'submitted', 'revision_requested', 'on_hold'].includes(m.status)) opts.push(['disputed', 'Tandai sengketa']);
  if (m.status === 'paid') opts.push(['closed', 'Tutup mission']);
  if (!opts.length) return null;
  const go = () => run('s', async () => {
    if (why.trim().length < 5) throw new Error('Tulis alasan (min. 5 karakter).');
    await must(sb.from('st_missions').update({ status: to, status_reason: why }).eq('id', m.id));
  }, () => { toast('Status mission diperbarui & tercatat di audit.'); setTo(null); setWhy(''); onDone(); }, (e) => toast(e, 'err'));
  return (
    <>
      {opts.map(([k, l]) => <Btn key={k} size="sm" kind={k === 'withdrawn' || k === 'disputed' ? 'danger' : 'ghost'} onClick={() => setTo(k)}>{l}</Btn>)}
      <Dialog open={!!to} onClose={() => setTo(null)} title={`Ubah status → ${to ? MISSION_STATUS[to][0] : ''}`}>
        <div className="st-form">
          <Area label="Alasan" value={why} onChange={setWhy} rows={3} required hint={to === 'withdrawn' ? 'Kewajiban yang sudah ada ditinjau manual (MIS-16).' : undefined} />
          <div className="st-form__act"><Btn kind="primary" onClick={go} busy={busy === 's'}>Simpan</Btn></div>
        </div>
      </Dialog>
    </>
  );
}
