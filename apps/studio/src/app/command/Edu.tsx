import { useMemo, useState } from 'react';
import { useAction, useLoad } from '../../lib/hooks';
import { ASM_STATUS, ORDER_STATUS, PAID_STATES, fmtDate, rupiah, isDigital } from '../../lib/labels';
import { aiAssist } from '../../lib/edu';
import { sb, must, rpc, type AiEssaySuggestion, type Assessment, type Attempt, type EduOrder, type Entitlement } from '../../lib/sb';
import { Area, Badge, Btn, Dialog, Empty, I, KV, Loaded, PageHead, Stat, StatusBadge, Tabs, Text, useToast } from '../../ui/kit';

interface Prog { id: string; slug: string; published: boolean; contributor_id: string | null; data: { title: string; type: string; startsAt?: string; price?: number; free?: boolean; qa?: boolean } }
interface Priv { program_id: string; meeting_url: string | null; ebook_path: string | null; access_note: string | null }
interface PayEvent { id: number; source: string; transaction_status: string | null; signature_valid: boolean | null; transition: string | null; created_at: string }

/** Order EDU (server truth), refund tercatat, kehadiran berbukti, akses privat, dan rilis bagi hasil kontributor. */
export default function EduOrders() {
  const toast = useToast();
  const [tab, setTab] = useState<'orders' | 'programs'>('orders');
  const [sel, setSel] = useState<EduOrder | null>(null);
  const [prog, setProg] = useState<Prog | null>(null);
  const s = useLoad(async () => {
    const [orders, progs, priv, overdue] = await Promise.all([
      must(sb.from('edu_orders').select('*').order('created_at', { ascending: false }).limit(300)) as Promise<EduOrder[]>,
      must(sb.from('edu_programs').select('id, slug, published, contributor_id, data').order('updated_at', { ascending: false })) as Promise<Prog[]>,
      must(sb.from('edu_program_private').select('*')) as Promise<Priv[]>,
      rpc<{ program_id: string; title: string; due_at: string; contributor: string }[]>('st_overdue_summaries'),
    ]);
    return { orders, progs, priv, overdue };
  });
  const paid = useMemo(() => (s.data?.orders ?? []).filter((o) => PAID_STATES.includes(o.status) && !o.product.qa), [s.data]);
  return (
    <div className="st-page-in">
      <PageHead eyebrow="EDU Commerce" title="Order & program EDU" desc="Status bayar hanya dari webhook Midtrans terverifikasi atau cek status server-ke-server. Refund dieksekusi di Midtrans/bank dulu, lalu dicatat di sini." />
      {s.data?.overdue.length ? <div className="st-alert st-alert--warn">Summary sesi terlambat: {s.data.overdue.map((o) => `${o.title} (${o.contributor ?? 'kontributor'})`).join(', ')}. Asesmen webinar tertahan sampai summary masuk.</div> : null}
      <section className="st-stats st-stats--3">
        <Stat label="Order terbayar" value={s.data ? paid.length : null} hint="Tidak termasuk fixture QA" tone="ok" />
        <Stat label="Pendapatan kotor terverifikasi" value={s.data ? paid.reduce((a, o) => a + Number(o.cash_charged) - Number(o.refunded_amount), 0) : null} hint="Bersih refund" tone="gold" fmt={rupiah} />
        <Stat label="Menunggu pembayaran" value={s.data ? s.data.orders.filter((o) => o.status === 'PAYMENT_PENDING').length : null} hint="Belum ada akses" tone="warn" />
      </section>
      <Tabs label="Tampilan" value={tab} onChange={setTab} tabs={[['orders', 'Order', s.data?.orders.length], ['programs', 'Program & akses privat', s.data?.progs.length]]} />
      <Loaded state={s}>
        {(d) => tab === 'orders' ? (
          !d.orders.length ? <Empty title="Belum ada order" icon={I.wallet}>Order muncul saat pengunjung EDU atau member Studio checkout.</Empty> : (
            <div className="st-table">
              <div className="st-tr st-tr--h"><span>Order · pembeli</span><span>Nominal</span><span>Sumber</span><span>Status</span><span /></div>
              {d.orders.map((o, i) => (
                <div key={o.id} className="st-tr" style={{ ['--i' as string]: i }}>
                  <span><b>{o.product.title}</b><small>{o.order_no} · {o.buyer_name} · {o.email}{o.product.qa ? ' · QA sandbox' : ''}</small></span>
                  <span className="st-mono">{o.product.free ? 'Gratis' : rupiah(o.cash_charged)}</span>
                  <span className="st-small">{o.order_source === 'STUDIO_MEMBER' ? 'Member Studio' : 'Guest EDU'}</span>
                  <span><StatusBadge map={ORDER_STATUS} value={o.status} /></span>
                  <span><Btn size="sm" onClick={() => setSel(o)}>Detail</Btn></span>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="st-cards">
            {d.progs.map((p, i) => {
              const pv = d.priv.find((x) => x.program_id === p.id);
              return (
                <button type="button" key={p.id} className="st-lead" style={{ ['--i' as string]: i }} onClick={() => setProg(p)}>
                  <span className="row-between"><span className="st-mono">{p.data.type}</span>{p.data.qa ? <Badge tone="violet">Fixture QA</Badge> : p.published ? <Badge tone="ok">Tayang</Badge> : <Badge tone="muted">Belum tayang</Badge>}</span>
                  <b>{p.data.title}</b>
                  <span className="st-small st-muted">{p.data.free ? 'Gratis' : p.data.price ? rupiah(p.data.price) : 'Harga belum ada'} · {d.orders.filter((o) => o.program_id === p.id && PAID_STATES.includes(o.status)).length} peserta</span>
                  <span className="st-small">{pv?.meeting_url ? 'Tautan sesi tersimpan' : pv?.ebook_path ? 'File e-book tersimpan' : 'Akses privat belum diisi'}</span>
                </button>
              );
            })}
          </div>
        )}
      </Loaded>
      {sel && <OrderDialog o={sel} onClose={() => setSel(null)} onDone={(m) => { toast(m); setSel(null); s.reload(); }} />}
      {prog && <ProgramDialog p={prog} priv={s.data?.priv.find((x) => x.program_id === prog.id)} onClose={() => setProg(null)} onDone={(m) => { toast(m); setProg(null); s.reload(); }} />}
    </div>
  );
}

function OrderDialog({ o, onClose, onDone }: { o: EduOrder; onClose: () => void; onDone: (m: string) => void }) {
  const toast = useToast();
  const [amount, setAmount] = useState(String(Number(o.cash_charged) - Number(o.refunded_amount)));
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState('');
  const { busy, run } = useAction();
  const s = useLoad(async () => {
    const [ev, ent] = await Promise.all([
      must(sb.from('edu_payment_events').select('id, source, transaction_status, signature_valid, transition, created_at').eq('order_no', o.order_no).order('id', { ascending: false })) as Promise<PayEvent[]>,
      must(sb.from('edu_entitlements').select('*').eq('order_id', o.id).maybeSingle()) as Promise<Entitlement | null>,
    ]);
    const att = ent ? await must(sb.from('edu_attendance').select('evidence, created_at').eq('entitlement_id', ent.id).maybeSingle()) as { evidence: string; created_at: string } | null : null;
    return { ev, ent, att };
  });
  const canRefund = PAID_STATES.includes(o.status) && Number(o.cash_charged) > 0;
  return (
    <Dialog open onClose={onClose} title={`Order ${o.order_no}`} wide>
      <div className="st-stack">
        <KV rows={[['Program', o.product.title], ['Pembeli', `${o.buyer_name} · ${o.email}`], ['Sumber', o.order_source], ['Nominal', rupiah(o.cash_charged)], ['Direfund', rupiah(o.refunded_amount)],
          ['Status', <StatusBadge key="s" map={ORDER_STATUS} value={o.status} />], ['Metode', o.payment_type ?? '—'], ['Lingkungan', o.gateway_env ?? (o.product.free ? 'Tanpa gateway' : '—')],
          ['Terverifikasi', o.paid_at ? fmtDate(o.paid_at) : '—'], ['Email akses', o.access_email_status]]} />
        <Loaded state={s}>
          {(d) => (
            <>
              <div><span className="st-eyebrow">Jejak pembayaran</span>
                <ul className="st-list">{d.ev.map((e) => <li key={e.id}><span><b>{e.transition ?? '—'}</b><small>{e.source} · {e.transaction_status ?? '—'} · signature {e.signature_valid == null ? 'n/a' : e.signature_valid ? 'valid' : 'TIDAK valid'}</small></span><span className="st-small st-muted">{fmtDate(e.created_at)}</span></li>)}</ul>
              </div>
              {d.ent && !isDigital(o.product.type) && (d.att ? <div className="st-alert st-alert--ok">Kehadiran terverifikasi {fmtDate(d.att.created_at)} — {d.att.evidence}</div> : !d.ent.revoked_at && (
                <div className="st-form">
                  <Text label="Bukti kehadiran" value={evidence} onChange={setEvidence} wide placeholder="mis. laporan peserta Zoom: hadir 85 menit" />
                  <div className="st-form__act"><Btn busy={busy === 'att'} onClick={() => run('att', () => rpc('edu_mark_attendance', { p_entitlement: d.ent!.id, p_evidence: evidence }), () => onDone('Kehadiran tercatat (+25 progres bintang).'), (e) => toast(e, 'err'))}>Catat kehadiran</Btn></div>
                </div>
              ))}
            </>
          )}
        </Loaded>
        {canRefund && (
          <div className="st-form">
            <Text label="Nominal refund (Rp)" type="number" min={1} value={amount} onChange={setAmount} hint="Eksekusi refund di dashboard Midtrans / transfer bank lebih dulu." />
            <Area label="Alasan" value={reason} onChange={setReason} rows={2} />
            <div className="st-form__act"><Btn kind="danger" busy={busy === 'ref'} onClick={() => run('ref', () => rpc<string>('edu_record_refund', { p_order: o.id, p_amount: Number(amount), p_reason: reason }), (st) => onDone(`Refund tercatat — status ${st}. Akses & bagi hasil disesuaikan.`), (e) => toast(e, 'err'))}>Catat refund</Btn></div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

function ProgramDialog({ p, priv, onClose, onDone }: { p: Prog; priv?: Priv; onClose: () => void; onDone: (m: string) => void }) {
  const toast = useToast();
  const [meet, setMeet] = useState(priv?.meeting_url ?? '');
  const [note, setNote] = useState(priv?.access_note ?? '');
  const [file, setFile] = useState<File | null>(null);
  const { busy, run } = useAction();
  const save = () => run('save', async () => {
    if (meet && !/^https:\/\//.test(meet)) throw new Error('Tautan harus diawali https://');
    let path = priv?.ebook_path ?? null;
    if (file) {
      if (file.size > 50 * 1024 * 1024) throw new Error('File maksimal 50 MB.');
      path = `programs/${p.id}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_')}`;
      const { error } = await sb.storage.from('edu-private').upload(path, file, { upsert: false });
      if (error) throw new Error(error.message);
    }
    await must(sb.from('edu_program_private').upsert({ program_id: p.id, meeting_url: meet.trim() || null, ebook_path: path, access_note: note.trim() || null }));
  }, () => onDone('Akses privat disimpan — hanya keluar untuk pemilik entitlement.'), (e) => toast(e, 'err'));
  const release = () => run('rel', () => rpc('st_release_program_payable', { p_program: p.id }), () => onDone('Payable kontributor dibuat — menunggu approval di Payable & payout.'), (e) => toast(e, 'err'));
  return (
    <Dialog open onClose={onClose} title={p.data.title} wide>
      <div className="st-stack">
        <div className="st-alert st-alert--info st-small">Data di sini TIDAK pernah tampil di halaman publik EDU. Peserta melihatnya hanya di halaman order/My Learning setelah aksesnya terverifikasi.</div>
        <div className="st-form">
          {!isDigital(p.data.type)
            ? <Text label="Tautan sesi Zoom/Meet" value={meet} onChange={setMeet} wide />
            : <div className="st-field st-field--wide"><label className="st-label" htmlFor="eb-file">File e-book (PDF/EPUB)</label><input id="eb-file" type="file" accept=".pdf,.epub,application/pdf,application/epub+zip" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /><small className="st-muted">{priv?.ebook_path ? `Tersimpan: ${priv.ebook_path.split('/').pop()}` : 'Belum ada file.'} Diunduh pembeli lewat tautan bertanda tangan 10 menit.</small></div>}
          <Area label="Catatan akses untuk peserta" value={note} onChange={setNote} rows={2} />
          <div className="st-form__act"><Btn kind="primary" busy={busy === 'save'} onClick={save}>Simpan akses privat</Btn></div>
        </div>
        {p.contributor_id && (
          <div className="st-alert st-alert--row st-alert--info">
            <span>Bagi hasil kontributor jadi payable setelah sesi selesai (webinar) atau 7 hari setelah bayar (e-book). Tidak pernah otomatis lunas.</span>
            <Btn size="sm" busy={busy === 'rel'} onClick={release}>Rilis payable</Btn>
          </div>
        )}
      </div>
    </Dialog>
  );
}

/** Learner Assessment QA: rilis soal hanya setelah dicek manusia; esai & banding dinilai reviewer (LEA-008/009/012). */
export function AssessmentQA() {
  const toast = useToast();
  const [tab, setTab] = useState<'asm' | 'attempts' | 'summaries'>('asm');
  const [asm, setAsm] = useState<Assessment | null>(null);
  const [att, setAtt] = useState<(Attempt & { a?: Assessment }) | null>(null);
  const s = useLoad(async () => {
    const [list, attempts, sums, sugs] = await Promise.all([
      must(sb.from('st_assessments').select('*').order('updated_at', { ascending: false })) as Promise<Assessment[]>,
      must(sb.from('st_assessment_attempts').select('*').eq('status', 'NEEDS_REVIEW').order('created_at')) as Promise<Attempt[]>,
      must(sb.from('st_session_summaries').select('*').order('submitted_at', { ascending: false })) as Promise<{ id: string; program_id: string; outcomes: string; modules: string; skills: string[]; late: boolean; submitted_at: string }[]>,
      must(sb.from('st_attempt_ai_suggestions').select('attempt_id, suggestion')) as Promise<{ attempt_id: string; suggestion: AiEssaySuggestion }[]>,
    ]);
    return { list, attempts: attempts.map((t) => ({ ...t, a: list.find((a) => a.id === t.assessment_id), ai_suggestion: sugs.find((x) => x.attempt_id === t.id)?.suggestion ?? null })), sums };
  });
  return (
    <div className="st-page-in">
      <PageHead eyebrow="Learner Assessment QA" title="Review asesmen" desc="Periksa soal terhadap summary/isi materi, kunci jawaban, dan rubrik. Hasil asesmen bukan keputusan hiring atau Ranger." />
      <Tabs label="Antrean" value={tab} onChange={setTab} tabs={[['asm', 'Soal menunggu rilis', s.data?.list.filter((a) => a.status === 'IN_REVIEW').length], ['attempts', 'Jawaban & banding', s.data?.attempts.length], ['summaries', 'Summary sesi', s.data?.sums.length]]} />
      <Loaded state={s}>
        {(d) => tab === 'asm' ? (
          <ul className="st-list">{d.list.length ? d.list.map((a) => <li key={a.id}><span><b>{a.title}</b><small>{a.kind} · {a.questions.length} soal · v{a.version}</small></span><StatusBadge map={ASM_STATUS} value={a.status} /><Btn size="sm" onClick={() => setAsm(a)}>Periksa</Btn></li>) : <li><span className="st-muted">Belum ada asesmen.</span></li>}</ul>
        ) : tab === 'attempts' ? (
          <ul className="st-list">{d.attempts.length ? d.attempts.map((t) => <li key={t.id}><span><b>{t.a?.title ?? 'Asesmen'}</b><small>{fmtDate(t.created_at)}{t.history.some((h) => h.event === 'appeal') ? ' · banding' : ''}</small></span><Btn size="sm" kind="primary" onClick={() => setAtt(t)}>Nilai</Btn></li>) : <li><span className="st-muted">Tidak ada jawaban yang menunggu.</span></li>}</ul>
        ) : (
          <ul className="st-list">{d.sums.length ? d.sums.map((x) => <li key={x.id}><span><b>{x.outcomes.slice(0, 120)}</b><small>{x.modules.slice(0, 160)} · {x.skills.join(', ')}</small></span>{x.late ? <Badge tone="warn">Terlambat</Badge> : <Badge tone="ok">Tepat waktu</Badge>}<span className="st-small st-muted">{fmtDate(x.submitted_at, false)}</span></li>) : <li><span className="st-muted">Belum ada summary.</span></li>}</ul>
        )}
      </Loaded>
      {asm && <AsmReview a={asm} onClose={() => setAsm(null)} onDone={(m) => { toast(m); setAsm(null); s.reload(); }} />}
      {att && <AttemptReview t={att} onClose={() => setAtt(null)} onDone={() => { toast('Skor & umpan balik tersimpan dengan riwayat.'); setAtt(null); s.reload(); }} />}
    </div>
  );
}

function AsmReview({ a, onClose, onDone }: { a: Assessment; onClose: () => void; onDone: (m: string) => void }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const { busy, run } = useAction();
  const decide = (ok: boolean) => run(ok ? 'y' : 'n', () => rpc('st_assessment_decide', { p_id: a.id, p_release: ok, p_note: note }), () => onDone(ok ? 'Dirilis ke peserta terdaftar.' : 'Dikembalikan ke kontributor.'), (e) => toast(e, 'err'));
  return (
    <Dialog open onClose={onClose} title={a.title} wide>
      <div className="st-stack">
        <ol className="st-qs">{a.questions.map((q, i) => (
          <li key={i} className="st-stack--tight">
            <b>{q.prompt}</b><small className="st-muted">Acuan: {q.source}{q.ai ? ' · berasal dari draf AI — cek akurasi terhadap materi' : ''}</small>
            {q.type === 'mcq' ? <ul className="st-bullets">{(q.options ?? []).map((o, j) => <li key={j}>{j === q.answer ? <b>{o} ✓ kunci</b> : o}</li>)}</ul> : <><small>Rubrik: {q.rubric}</small>{q.reference && <small className="st-muted">Jawaban acuan: {q.reference}</small>}</>}
          </li>
        ))}</ol>
        {a.status === 'IN_REVIEW' && <>
          <Area label="Catatan reviewer" value={note} onChange={setNote} rows={2} hint="Wajib bila meminta revisi." />
          <div className="st-dlg__foot"><Btn onClick={() => decide(false)} busy={busy === 'n'}>Minta revisi</Btn><Btn kind="primary" onClick={() => decide(true)} busy={busy === 'y'}><I.check size={16} />Rilis</Btn></div>
        </>}
      </div>
    </Dialog>
  );
}

const CONF: Record<string, [string, 'ok' | 'warn' | 'muted']> = { high: ['yakin', 'ok'], medium: ['sedang', 'muted'], low: ['ragu — nilai cermat', 'warn'] };

function AttemptReview({ t, onClose, onDone }: { t: Attempt & { a?: Assessment }; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [score, setScore] = useState(t.score != null ? String(t.score) : '');
  const [fb, setFb] = useState('');
  const [sug, setSug] = useState<AiEssaySuggestion | null>(t.ai_suggestion ?? null);
  const { busy, run } = useAction();
  const hint = (i: number) => sug?.items.find((x) => x.index === i);
  return (
    <Dialog open onClose={onClose} title={`Nilai · ${t.a?.title ?? ''}`} wide>
      <div className="st-stack">
        <ol className="st-qs">{(t.a?.questions ?? []).map((q, i) => (
          <li key={i} className="st-stack--tight">
            <b>{q.prompt}</b>
            {q.type === 'mcq' ? <small>Jawaban: {q.options?.[Number(t.answers[i])] ?? '—'} {Number(t.answers[i]) === q.answer ? '✓' : '✗'}</small>
              : <><p className="st-prose">{String(t.answers[i] ?? '')}</p><small className="st-muted">Rubrik: {q.rubric}</small>
                {hint(i) && <div className="st-ai st-ai--note">
                  <span className="row-between st-small"><b>Saran AI: {hint(i)!.score}/100</b><Badge tone={CONF[hint(i)!.confidence][1]}>{CONF[hint(i)!.confidence][0]}</Badge></span>
                  {hint(i)!.strengths && <small>Kuat: {hint(i)!.strengths}</small>}
                  {hint(i)!.gaps && <small>Kurang: {hint(i)!.gaps}</small>}
                  {hint(i)!.evidence.map((e) => <small key={e} className="st-muted">“{e}”</small>)}
                  {hint(i)!.flags.length > 0 && <small className="st-alert st-alert--warn">Perlu perhatian: {hint(i)!.flags.join(' · ')}</small>}
                </div>}</>}
          </li>
        ))}</ol>
        <div className="st-row">
          <Btn size="sm" busy={busy === 'ai'} onClick={() => run('ai', () => aiAssist<{ suggestion: AiEssaySuggestion }>({ action: 'essay_suggest', attempt_id: t.id }), (r) => r && setSug(r.suggestion), (e) => toast(e, 'err'))}><I.spark size={14} />{sug ? 'Minta saran ulang' : 'Saran nilai AI'}</Btn>
          <small className="st-muted">{sug ? `${sug.model} · ${fmtDate(sug.at)}. Saran saja — skor final dari Anda.` : 'Hanya teks esai, rubrik & acuan yang dikirim — tanpa identitas peserta.'}</small>
        </div>
        {t.history.length > 0 && <small className="st-muted">Riwayat: {t.history.map((h) => `${h.event}${h.prev_score != null ? ` (skor sebelumnya ${h.prev_score})` : ''}`).join(' · ')}</small>}
        <div className="st-form">
          <Text label="Skor (0–100)" type="number" min={0} value={score} onChange={setScore} />
          <Area label="Umpan balik" value={fb} onChange={setFb} rows={3} hint="Jelaskan dasar skor sesuai rubrik." />
          <div className="st-form__act"><Btn kind="primary" busy={busy === 's'} onClick={() => run('s', () => rpc('st_review_attempt', { p_attempt: t.id, p_score: Number(score), p_feedback: fb }), onDone, (e) => toast(e, 'err'))}>Simpan penilaian</Btn></div>
        </div>
      </div>
    </Dialog>
  );
}

