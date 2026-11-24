import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useAction, useLoad } from '../../lib/hooks';
import { ATTEMPT_STATUS, AVAIL, HIRE_STAGE, HIRE_STATUS, STAR_CODE, STAR_LEVELS, WORKPREF, fmtDate, starLevel } from '../../lib/labels';
import { sb, must, rpc, type Attempt, type HiringRow, type StarEvent, type Talent, type TokenRow } from '../../lib/sb';
import { Area, Badge, Btn, Card, Dialog, Empty, I, KV, Loaded, PageHead, Select, StatusBadge, TagInput, Text, Toggle, useToast } from '../../ui/kit';
import Thread from '../Thread';

interface MyAsm { id: string; program_id: string; program_title: string; kind: 'webinar' | 'ebook'; title: string; pass_score: number; questions: number; attempt_status: string | null; score: number | null; feedback: string | null }

/** Assessment & Report (PRD §06.3–06.5): hanya asesmen yang dirilis reviewer untuk program yang Anda miliki. */
export function Report() {
  const { me } = useAuth();
  const toast = useToast();
  const [appeal, setAppeal] = useState<Attempt | null>(null);
  const s = useLoad(async () => {
    const [list, attempts] = await Promise.all([
      rpc<MyAsm[]>('st_my_assessments'),
      must(sb.from('st_assessment_attempts').select('*').eq('person_id', me!.profile.id).order('created_at', { ascending: false })) as Promise<Attempt[]>,
    ]);
    return { list, attempts };
  });
  return (
    <div className="st-page-in">
      <PageHead eyebrow="EDU Learner" title="Asesmen & laporan" desc="Kompetensi dan Star Ranking dipisah. Skor esai selalu ditinjau manusia; hasil asesmen tidak otomatis menentukan kelayakan kerja atau Ranger." />
      <Loaded state={s}>
        {(d) => (
          <>
            <Card title="Asesmen tersedia">
              {!d.list.length ? <Empty title="Belum ada asesmen" icon={I.compass}>Asesmen muncul setelah program yang Anda ikuti punya summary kontributor dan soal yang sudah ditinjau reviewer.</Empty> : (
                <ul className="st-list">{d.list.map((a) => (
                  <li key={a.id}>
                    <span><b>{a.title}</b><small>{a.program_title} · {a.questions} soal · lulus ≥ {a.pass_score}{a.feedback ? ` · Umpan balik: ${a.feedback}` : ''}</small></span>
                    {a.attempt_status ? <span className="st-row"><StatusBadge map={ATTEMPT_STATUS} value={a.attempt_status} />{a.score != null && <b className="st-mono">{a.score}</b>}</span>
                      : <Link to={`/learn/assessments/${a.id}`} className="st-btn st-btn--primary st-btn--sm">Kerjakan</Link>}
                  </li>
                ))}</ul>
              )}
            </Card>
            <Card title="Competency report" desc="Bukti asesmen beserta versi, reviewer, dan tanggal. Ditampilkan ke perusahaan hanya bila Anda mengizinkannya di Karier.">
              {!d.attempts.length ? <p className="st-muted st-small">Belum ada hasil.</p> : (
                <ul className="st-list">{d.attempts.map((t) => (
                  <li key={t.id}>
                    <span><b>{d.list.find((a) => a.id === t.assessment_id)?.title ?? 'Asesmen'}</b><small>{fmtDate(t.created_at, false)}{t.mcq_total ? ` · PG ${t.mcq_correct}/${t.mcq_total}` : ''}{t.reviewed_at ? ` · ditinjau ${fmtDate(t.reviewed_at, false)}` : ''}{t.history.length ? ` · ${t.history.length} riwayat` : ''}</small></span>
                    <StatusBadge map={ATTEMPT_STATUS} value={t.status} />
                    <b className="st-mono">{t.score ?? '—'}</b>
                    {t.status !== 'NEEDS_REVIEW' && <Btn size="sm" kind="quiet" onClick={() => setAppeal(t)}>Banding</Btn>}
                  </li>
                ))}</ul>
              )}
            </Card>
          </>
        )}
      </Loaded>
      {appeal && <Appeal t={appeal} onClose={() => setAppeal(null)} onDone={() => { setAppeal(null); toast('Banding dikirim ke reviewer. Skor lama tetap tercatat.'); s.reload(); }} />}
    </div>
  );
}

function Appeal({ t, onClose, onDone }: { t: Attempt; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [why, setWhy] = useState('');
  const { busy, run } = useAction();
  return (
    <Dialog open onClose={onClose} title="Ajukan banding">
      <div className="st-stack">
        <Area label="Alasan" value={why} onChange={setWhy} rows={4} hint="Jelaskan bagian mana yang menurut Anda keliru dinilai. Reviewer melihat jawaban, rubrik, dan riwayat skor." />
        <div className="st-dlg__foot"><Btn kind="primary" busy={busy === 'a'} onClick={() => run('a', () => rpc('st_appeal_attempt', { p_attempt: t.id, p_reason: why }), onDone, (e) => toast(e, 'err'))}>Kirim banding</Btn></div>
      </div>
    </Dialog>
  );
}

interface Paper { id: string; title: string; kind: string; pass_score: number; questions: { type: 'mcq' | 'essay'; prompt: string; options?: string[]; source: string }[] }

export function TakeAssessment() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const s = useLoad(() => rpc<Paper>('st_assessment_paper', { p_id: id }), [id]);
  const [ans, setAns] = useState<(number | string | null)[]>([]);
  const { busy, run } = useAction();
  const submit = (p: Paper) => run('s', async () => {
    const a = p.questions.map((q, i) => (q.type === 'mcq' ? (typeof ans[i] === 'number' ? ans[i] : null) : String(ans[i] ?? '').trim()));
    if (a.some((x) => x === null || x === '')) throw new Error('Jawab semua soal.');
    return rpc<{ status: string; score: number | null }>('st_submit_attempt', { p_id: p.id, p_answers: a });
  }, (r) => { toast(r?.status === 'NEEDS_REVIEW' ? 'Jawaban terkirim — esai dinilai reviewer.' : `Skor Anda: ${r?.score}.`); nav('/learn/report'); }, (e) => toast(e, 'err'));
  return (
    <div className="st-page-in">
      <PageHead eyebrow="Asesmen" title={s.data?.title ?? 'Asesmen'}><Link to="/learn/report" className="st-btn st-btn--quiet st-btn--sm"><I.back size={14} />Kembali</Link></PageHead>
      <Loaded state={s}>
        {(p) => (
          <Card desc={`Lulus ≥ ${p.pass_score}. Jawaban dikirim sekali; banding tersedia setelah hasil keluar.`}>
            <ol className="st-qs">
              {p.questions.map((q, i) => (
                <li key={i} className="st-stack">
                  <b>{q.prompt}</b>
                  <small className="st-muted">Acuan: {q.source}</small>
                  {q.type === 'mcq' ? (
                    <div className="st-radios" role="radiogroup" aria-label={`Soal ${i + 1}`}>
                      {(q.options ?? []).map((o, k) => (
                        <label key={k} className={`st-radio ${ans[i] === k ? 'is-on' : ''}`}><input type="radio" name={`q${i}`} checked={ans[i] === k} onChange={() => { const n = [...ans]; n[i] = k; setAns(n); }} /><span className="st-radio__dot" aria-hidden="true">{ans[i] === k && <I.check size={14} />}</span><span>{o}</span></label>
                      ))}
                    </div>
                  ) : <Area label="Jawaban" value={String(ans[i] ?? '')} onChange={(v) => { const n = [...ans]; n[i] = v; setAns(n); }} rows={5} hint="Minimal 30 karakter. Dinilai reviewer dengan rubrik yang disetujui." />}
                </li>
              ))}
            </ol>
            <div className="st-row"><Btn kind="primary" busy={busy === 's'} onClick={() => submit(p)}>Kirim jawaban</Btn></div>
          </Card>
        )}
      </Loaded>
    </div>
  );
}

/** Star Ranking (PRD §06.6): indikator AKTIVITAS — bintang terisi kontinu, label teks untuk pembaca layar, tanpa animasi saat reduced motion. */
export function Stars() {
  const s = useLoad(async () => must(sb.from('st_star_events').select('*').order('created_at', { ascending: false })) as Promise<StarEvent[]>);
  const total = (s.data ?? []).reduce((a, e) => a + e.units, 0);
  const lv = starLevel(total);
  return (
    <div className="st-page-in">
      <PageHead eyebrow="EDU Learner" title="Star Ranking" desc="Penanda keterlibatan belajar, bukan sertifikasi profesi. Setiap aktivitas tercatat sekali; refund membalik progres." />
      <Card>
        <div className="st-star" role="img" aria-label={`${lv.name}: ${total} unit progres${lv.next ? `, ${lv.next - total} lagi menuju level berikutnya` : ''}`}>
          <svg viewBox="0 0 100 100" width="120" height="120" aria-hidden="true">
            <defs><clipPath id="st-star-clip"><path d="M50 6l12.9 27.3 29.6 3.6-21.8 20.4 5.6 29.4L50 72.1 23.7 86.7l5.6-29.4L7.5 36.9l29.6-3.6z" /></clipPath></defs>
            <path d="M50 6l12.9 27.3 29.6 3.6-21.8 20.4 5.6 29.4L50 72.1 23.7 86.7l5.6-29.4L7.5 36.9l29.6-3.6z" className="st-star__shell" />
            <rect x="0" y={100 - lv.fill * 100} width="100" height={lv.fill * 100} clipPath="url(#st-star-clip)" className="st-star__fluid" />
          </svg>
          <div className="st-stack--tight">
            <b className="st-big">{lv.name}</b>
            <span className="st-muted">{total} unit progres{lv.next ? ` · ${lv.next - total} lagi menuju level berikutnya` : ' · level tertinggi'}</span>
            <span className="st-small st-muted">{STAR_LEVELS.map(([n, a]) => `${n} ${a}+`).join(' · ')}</span>
          </div>
        </div>
      </Card>
      <Card title="Riwayat">
        <Loaded state={s} empty={(d) => (d.length ? null : <Empty title="Belum ada aktivitas" icon={I.star}>Progres bertambah dari pembelian e-book terverifikasi (+10), kehadiran webinar terverifikasi (+25), lulus asesmen webinar (+60), dan lulus esai e-book (+50).</Empty>)}>
          {(d) => <ul className="st-list">{d.map((e) => <li key={e.id}><span><b>{STAR_CODE[e.code] ?? e.code}</b><small>{e.source_ref} · {fmtDate(e.created_at)}</small></span><b className="st-mono">{e.units > 0 ? `+${e.units}` : e.units}</b></li>)}</ul>}
        </Loaded>
      </Card>
    </div>
  );
}

/** Token Wallet: ledger transparan, penerbitan & penukaran OFF sampai sign-off Legal + Finance (TOK-019). */
export function Tokens() {
  const s = useLoad(async () => must(sb.from('st_token_ledger').select('*').order('created_at', { ascending: false })) as Promise<TokenRow[]>);
  return (
    <div className="st-page-in">
      <PageHead eyebrow="EDU Learner" title="Token Wallet" desc="1 token = manfaat potongan Rp10 pada transaksi yang memenuhi syarat. Bukan saldo uang: tidak bisa dicairkan, ditransfer, atau dibeli." />
      <div className="st-alert st-alert--info">Penukaran token belum aktif. Kami menunggu persetujuan Legal & Finance; sampai saat itu tidak ada token yang diterbitkan atau dipakai.</div>
      <Card title="Ledger">
        <Loaded state={s} empty={(d) => (d.length ? null : <Empty title="Belum ada token" icon={I.wallet}>Belum ada kampanye reward yang disetujui.</Empty>)}>
          {(d) => <ul className="st-list">{d.map((t) => <li key={t.id}><span><b>{t.source}</b><small>{t.state} · {fmtDate(t.created_at)}{t.expires_at ? ` · kedaluwarsa ${fmtDate(t.expires_at, false)}` : ''}</small></span><b className="st-mono">{t.delta}</b></li>)}</ul>}
        </Loaded>
      </Card>
    </div>
  );
}

const BLANK: Omit<Talent, 'person_id' | 'opted_in_at'> = { opt_in: false, alias: '', headline: '', skills: [], availability: 'now', work_pref: 'any', portfolio_url: '', show_star: false, show_assessments: false };

/** Career & Opportunities: opt-in eksplisit (default OFF), bisa dicabut kapan saja; kontak tidak dibagikan sebelum Anda menerima undangan. */
export function Career() {
  const { me } = useAuth();
  const toast = useToast();
  const [f, setF] = useState<typeof BLANK | null>(null);
  const [thread, setThread] = useState<HiringRow | null>(null);
  const { busy, run } = useAction();
  const s = useLoad(async () => {
    const [t, inv] = await Promise.all([
      must(sb.from('st_talent_profiles').select('*').eq('person_id', me!.profile.id).maybeSingle()) as Promise<Talent | null>,
      rpc<HiringRow[]>('st_hiring_list'),
    ]);
    setF(t ? { ...BLANK, ...t, alias: t.alias ?? '', headline: t.headline ?? '', portfolio_url: t.portfolio_url ?? '' } : { ...BLANK, alias: me!.profile.display_name });
    return { t, inv: inv.filter((x) => x.side === 'candidate') };
  });
  const save = (optIn: boolean) => run(optIn ? 'in' : 'save', async () => {
    const row = { person_id: me!.profile.id, ...f!, opt_in: optIn, consent_version: 'talent-consent-draft-2026-11' };
    await must(sb.from('st_talent_profiles').upsert(row));
  }, () => { toast(optIn ? 'Profil kini dapat ditemukan perusahaan terverifikasi.' : 'Disimpan. Profil tidak terlihat perusahaan.'); s.reload(); }, (e) => toast(e, 'err'));
  const respond = (id: string, d: string) => run(id + d, () => rpc('st_hiring_respond', { p_invite: id, p_decision: d }), () => { toast('Keputusan tercatat.'); s.reload(); }, (e) => toast(e, 'err'));
  const set = <K extends keyof typeof BLANK>(k: K, v: (typeof BLANK)[K]) => setF((x) => ({ ...x!, [k]: v }));

  return (
    <div className="st-page-in">
      <PageHead eyebrow="EDU Learner" title="Karier & peluang" desc="Opsional. VIBOXS tidak menjamin perekrutan; keputusan kerja sepenuhnya antara Anda dan perusahaan." />
      <Loaded state={s}>
        {(d) => (
          <>
            <Card title="Profil kandidat" desc={d.t?.opt_in ? 'Aktif — terlihat oleh perusahaan terverifikasi (tanpa email/telepon).' : 'Tidak aktif — tidak terlihat oleh perusahaan mana pun.'}
              actions={d.t?.opt_in ? <Badge tone="ok">Opt-in aktif</Badge> : <Badge tone="muted">Tidak terlihat</Badge>}>
              {f && (
                <div className="st-form">
                  <Text label="Nama tampilan / alias" value={f.alias} onChange={(v) => set('alias', v)} />
                  <Text label="Headline" value={f.headline} onChange={(v) => set('headline', v)} placeholder="mis. Admin operasional · siap belajar otomasi" />
                  <TagInput label="Keahlian" value={f.skills} onChange={(v) => set('skills', v)} hint="Pisahkan dengan koma." />
                  <Select label="Ketersediaan" value={(f.availability ?? 'now') as string} onChange={(v) => set('availability', v)} options={Object.entries(AVAIL)} />
                  <Select label="Preferensi kerja" value={(f.work_pref ?? 'any') as string} onChange={(v) => set('work_pref', v)} options={Object.entries(WORKPREF)} />
                  <Text label="Portofolio (https)" value={f.portfolio_url} onChange={(v) => set('portfolio_url', v)} />
                  <div className="st-field st-field--wide st-stack--tight">
                    <Toggle label="Tampilkan label Star Ranking" checked={f.show_star} onChange={(v) => set('show_star', v)} hint="Hanya label level, bukan riwayat." />
                    <Toggle label="Tampilkan jumlah asesmen lulus" checked={f.show_assessments} onChange={(v) => set('show_assessments', v)} hint="Esai mentah, transaksi, dan token tidak pernah dibagikan." />
                  </div>
                  <div className="st-form__act">
                    <Btn onClick={() => save(d.t?.opt_in ?? false)} busy={busy === 'save'}>Simpan</Btn>
                    {d.t?.opt_in ? <Btn kind="danger" onClick={() => save(false)} busy={busy === 'save'}>Cabut opt-in</Btn>
                      : <Btn kind="primary" onClick={() => save(true)} busy={busy === 'in'}>Izinkan perusahaan menemukan saya</Btn>}
                  </div>
                </div>
              )}
            </Card>
            <Card title="Undangan rekrutmen">
              {!d.inv.length ? <p className="st-muted st-small">Belum ada undangan.</p> : (
                <ul className="st-list">{d.inv.map((h) => (
                  <li key={h.id}>
                    <span><b>{h.vacancy_title} · {h.company}</b><small>{h.message}</small>{h.interview_at && <small>Interview {fmtDate(h.interview_at)}{h.interview_url ? ` · ${h.interview_url}` : ''}</small>}</span>
                    <StatusBadge map={HIRE_STATUS} value={h.status} />
                    {h.stage && <Badge tone="violet">{HIRE_STAGE.find((x) => x[0] === h.stage)?.[1]}</Badge>}
                    {h.status === 'SENT' && <span className="st-row">
                      <Btn size="sm" kind="primary" busy={busy === h.id + 'ACCEPTED'} onClick={() => respond(h.id, 'ACCEPTED')}>Terima</Btn>
                      <Btn size="sm" busy={busy === h.id + 'DECLINED'} onClick={() => respond(h.id, 'DECLINED')}>Tolak</Btn>
                      <Btn size="sm" kind="quiet" busy={busy === h.id + 'BLOCKED'} onClick={() => respond(h.id, 'BLOCKED')}>Blokir</Btn></span>}
                    {h.status === 'ACCEPTED' && <span className="st-row"><Btn size="sm" onClick={() => setThread(h)}><I.chat size={14} />Pesan</Btn><Btn size="sm" kind="quiet" busy={busy === h.id + 'WITHDRAWN'} onClick={() => respond(h.id, 'WITHDRAWN')}>Tarik diri</Btn></span>}
                  </li>
                ))}</ul>
              )}
            </Card>
            <Card title="Jalur Ranger">
              <p className="st-small st-muted">Ranger baru dipilih dari EDU Learner lewat seleksi Commander. Saat Anda menjadi Ranger aktif, profil kandidat otomatis disembunyikan dari perusahaan.</p>
              <Link to="/learn/apply" className="st-btn st-btn--ghost st-btn--sm">Ajukan jalur profesional</Link>
            </Card>
          </>
        )}
      </Loaded>
      {thread && (
        <Dialog open onClose={() => setThread(null)} title={`${thread.vacancy_title} · ${thread.company}`} wide>
          <KV rows={[['Tahap', HIRE_STAGE.find((x) => x[0] === thread.stage)?.[1] ?? '—'], ['Interview', thread.interview_at ? fmtDate(thread.interview_at) : 'Belum dijadwalkan']]} />
          <Thread type="hiring" threadId={thread.id} />
        </Dialog>
      )}
    </div>
  );
}

