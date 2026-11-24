import { useState } from 'react';
import { ORIGIN } from '@viboxs/shared/ecosystem';
import { useAuth } from '../../lib/auth';
import { useAction, useLoad } from '../../lib/hooks';
import { ASM_STATUS, fmtDate, rupiah } from '../../lib/labels';
import { sb, must, rpc, type Assessment, type CreatorSale, type Question } from '../../lib/sb';
import { Area, Badge, Btn, Dialog, Empty, I, Loaded, PageHead, Select, Stat, StatusBadge, TagInput, Text, useToast } from '../../ui/kit';

/** CON-011/012: penjualan program milik sendiri — agregat tanpa data pembeli; bagi hasil 95/4/1 dari ledger server. */
export function Sales() {
  const s = useLoad(() => rpc<CreatorSale[]>('st_creator_sales'));
  const sum = (k: keyof CreatorSale) => (s.data ?? []).reduce((a, x) => a + Number(x[k]), 0);
  return (
    <div className="st-page-in">
      <PageHead eyebrow="EDU Creator" title="Penjualan & peserta" desc="Hanya order terverifikasi server untuk program Anda. Bagian Anda 95% dari basis transaksi (dikurangi token bila kelak aktif); 4% fee layanan, 1% cadangan proses & sengketa." />
      <section className="st-stats st-stats--3">
        <Stat label="Peserta aktif" value={s.data ? sum('active_participants') : null} hint="Akses belum dicabut" />
        <Stat label="Hak bagi hasil (bersih refund)" value={s.data ? Math.round(sum('contributor_cash')) : null} hint="Belum tentu siap dibayar" tone="gold" fmt={rupiah} />
        <Stat label="Sudah masuk payable" value={s.data ? Math.round(sum('released')) : null} hint="Lihat Laporan & payout" tone="ok" fmt={rupiah} />
      </section>
      <Loaded state={s} empty={(d) => (d.length ? null : <Empty title="Belum ada program di EDU" icon={I.book}>Program muncul di sini setelah dikirim Commander ke EDU.</Empty>)}>
        {(d) => (
          <div className="st-table">
            <div className="st-tr st-tr--h"><span>Program</span><span>Order bayar</span><span>Gratis</span><span>Refund/CB</span><span>Bagian Anda</span></div>
            {d.map((x, i) => (
              <div key={x.program_id} className="st-tr" style={{ ['--i' as string]: i }}>
                <span><b>{x.title}</b><small>{x.published ? 'Tayang' : 'Belum tayang'} · {x.active_participants} peserta aktif</small></span>
                <span className="st-mono">{x.paid_orders}</span><span className="st-mono">{x.free_orders}</span><span className="st-mono">{x.refunded_orders}</span>
                <span className="st-mono">{rupiah(x.contributor_cash)}</span>
              </div>
            ))}
          </div>
        )}
      </Loaded>
      <p className="st-small st-muted">Payout manual oleh Finance dengan bukti transfer, maksimal 7 hari kerja setelah eligible (sesi selesai / masa refund e-book lewat). Status “dibayar” hanya muncul setelah transfer tercatat.</p>
    </div>
  );
}

const newQ = (type: Question['type']): Question => (type === 'mcq' ? { type, prompt: '', options: ['', ''], answer: 0, source: '' } : { type, prompt: '', rubric: '', source: '' });

/** Summary sesi (≤2 hari setelah webinar) + draft soal → review manusia → rilis (PRD §06.3, §08.3; LEA-007/008). */
export function Assessments() {
  const { me } = useAuth();
  const toast = useToast();
  const [sum, setSum] = useState<CreatorSale | null>(null);
  const [edit, setEdit] = useState<Assessment | { program: CreatorSale } | null>(null);
  const s = useLoad(async () => {
    const [progs, asm, sums] = await Promise.all([
      rpc<CreatorSale[]>('st_creator_sales'),
      must(sb.from('st_assessments').select('*').eq('author_id', me!.profile.id).order('updated_at', { ascending: false })) as Promise<Assessment[]>,
      must(sb.from('st_session_summaries').select('program_id, submitted_at, late')) as Promise<{ program_id: string; submitted_at: string; late: boolean }[]>,
    ]);
    return { progs, asm, sums };
  });
  return (
    <div className="st-page-in">
      <PageHead eyebrow="EDU Creator" title="Summary & asesmen" desc="Webinar: kirim summary terstruktur maksimal 2 hari setelah sesi, lalu susun soal dengan acuan sumber. Asesmen tampil ke peserta hanya setelah disetujui reviewer." />
      <Loaded state={s} empty={(d) => (d.progs.length ? null : <Empty title="Belum ada program di EDU" icon={I.book}>Summary dan asesmen tersedia setelah program Anda dikirim ke EDU.</Empty>)}>
        {(d) => (
          <div className="st-cards">
            {d.progs.map((p, i) => {
              const ebook = p.kind === 'ebook';
              const done = d.sums.find((x) => x.program_id === p.program_id);
              const started = !!p.starts_at && Date.parse(p.starts_at) < Date.now();
              const mine = d.asm.filter((a) => a.program_id === p.program_id);
              return (
                <article key={p.program_id} className="st-lead" style={{ ['--i' as string]: i }}>
                  <span className="row-between"><span className="st-mono">{ebook ? 'E-book' : 'Webinar / workshop'}</span>{p.published ? <Badge tone="ok">Tayang</Badge> : <Badge tone="muted">Belum tayang</Badge>}</span>
                  <b>{p.title}</b>
                  {!ebook && <span className="st-small">{done ? `Summary terkirim ${fmtDate(done.submitted_at, false)}${done.late ? ' · terlambat' : ''}` : started ? 'Summary belum dikirim' : `Sesi ${p.starts_at ? fmtDate(p.starts_at) : 'belum dijadwalkan'}`}</span>}
                  {mine.map((a) => <span key={a.id} className="row-between st-small"><span>{a.title}</span><StatusBadge map={ASM_STATUS} value={a.status} /></span>)}
                  {mine.find((a) => a.review_note && a.status === 'NEEDS_REVISION') && <span className="st-alert st-alert--warn st-small">Catatan reviewer: {mine.find((a) => a.status === 'NEEDS_REVISION')!.review_note}</span>}
                  <span className="st-row">
                    {!ebook && started && <Btn size="sm" onClick={() => setSum(p)}>{done ? 'Perbarui summary' : 'Kirim summary'}</Btn>}
                    {(ebook || done) && (mine.find((a) => ['DRAFT', 'NEEDS_REVISION'].includes(a.status))
                      ? <Btn size="sm" kind="primary" onClick={() => setEdit(mine.find((a) => ['DRAFT', 'NEEDS_REVISION'].includes(a.status))!)}>Lanjutkan draft</Btn>
                      : !mine.some((a) => ['IN_REVIEW', 'RELEASED'].includes(a.status)) && <Btn size="sm" kind="primary" onClick={() => setEdit({ program: p })}>Susun asesmen</Btn>)}
                  </span>
                </article>
              );
            })}
          </div>
        )}
      </Loaded>
      {sum && <SummaryDialog p={sum} onClose={() => setSum(null)} onDone={() => { setSum(null); toast('Summary terkirim ke reviewer.'); s.reload(); }} />}
      {edit && <AsmEditor init={edit} onClose={() => setEdit(null)} onDone={(m) => { setEdit(null); toast(m); s.reload(); }} />}
    </div>
  );
}

function SummaryDialog({ p, onClose, onDone }: { p: CreatorSale; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ outcomes: '', modules: '', examples: '', materials: '', quality: '', skills: [] as string[] });
  const { busy, run } = useAction();
  return (
    <Dialog open onClose={onClose} title={`Summary sesi · ${p.title}`} wide>
      <div className="st-form">
        <Area label="Hasil belajar yang dicapai" value={f.outcomes} onChange={(v) => setF({ ...f, outcomes: v })} rows={3} hint="Min. 30 karakter. Ini jadi acuan soal asesmen." />
        <Area label="Modul / bagian yang dibahas" value={f.modules} onChange={(v) => setF({ ...f, modules: v })} rows={3} />
        <Area label="Contoh & studi kasus" value={f.examples} onChange={(v) => setF({ ...f, examples: v })} rows={2} />
        <Area label="Bahan & sumber" value={f.materials} onChange={(v) => setF({ ...f, materials: v })} rows={2} />
        <TagInput label="Keterampilan yang ditargetkan" value={f.skills} onChange={(v) => setF({ ...f, skills: v })} />
        <Area label="Catatan kualitas sesi" value={f.quality} onChange={(v) => setF({ ...f, quality: v })} rows={2} hint="Kendala teknis, kehadiran, hal yang perlu diperbaiki." />
        <div className="st-form__act"><Btn kind="primary" busy={busy === 's'} onClick={() => run('s', () => rpc('st_submit_summary', {
          p_program: p.program_id, p_outcomes: f.outcomes, p_modules: f.modules, p_examples: f.examples, p_materials: f.materials, p_skills: f.skills, p_quality: f.quality,
        }), onDone, (e) => toast(e, 'err'))}>Kirim summary</Btn></div>
      </div>
    </Dialog>
  );
}

function AsmEditor({ init, onClose, onDone }: { init: Assessment | { program: CreatorSale }; onClose: () => void; onDone: (m: string) => void }) {
  const toast = useToast();
  const existing = 'id' in init ? init : null;
  const program = 'program' in init ? init.program : null;
  const [title, setTitle] = useState(existing?.title ?? `Asesmen · ${program?.title ?? ''}`);
  const [qs, setQs] = useState<Question[]>(existing?.questions?.length ? existing.questions : [newQ('mcq')]);
  const k: 'webinar' | 'ebook' = existing?.kind ?? (program?.kind === 'ebook' ? 'ebook' : 'webinar');
  const { busy, run } = useAction();
  const upd = (i: number, q: Partial<Question>) => setQs(qs.map((x, j) => (j === i ? { ...x, ...q } : x)));
  const save = (submit: boolean) => run(submit ? 'sub' : 'save', async () => {
    const row = { title: title.trim(), questions: qs, status: submit ? 'IN_REVIEW' : 'DRAFT' };
    if (existing) await must(sb.from('st_assessments').update(row).eq('id', existing.id));
    else await must(sb.from('st_assessments').insert({ ...row, status: 'DRAFT', program_id: program!.program_id, kind: k }).select('id').single().then(async (r) => {
      if (submit && r.data) return sb.from('st_assessments').update({ status: 'IN_REVIEW' }).eq('id', (r.data as { id: string }).id);
      return r;
    }));
  }, () => onDone(submit ? 'Diajukan ke reviewer. Belum terlihat peserta.' : 'Draft asesmen disimpan.'), (e) => toast(e, 'err'));
  return (
    <Dialog open onClose={onClose} title={existing ? 'Edit asesmen' : 'Asesmen baru'} wide>
      <div className="st-stack">
        <div className="st-alert st-alert--info st-small">Draft soal otomatis dengan AI belum aktif. Tulis soal sendiri berdasarkan summary/isi e-book; setiap soal wajib punya acuan sumber dan esai wajib punya rubrik.</div>
        <div className="st-form">
          <Text label="Judul" value={title} onChange={setTitle} wide />
          <span className="st-small st-muted">{k === 'ebook' ? 'Refleksi/esai e-book — pembelian tidak mewajibkan esai.' : 'Asesmen webinar — berdasar summary sesi.'}</span>
        </div>
        <ol className="st-qs">
          {qs.map((q, i) => (
            <li key={i} className="st-form">
              <Area label={`Soal ${i + 1} · ${q.type === 'mcq' ? 'Pilihan ganda' : 'Esai'}`} value={q.prompt} onChange={(v) => upd(i, { prompt: v })} rows={2} />
              <Text label="Acuan sumber" value={q.source} onChange={(v) => upd(i, { source: v })} placeholder="mis. Modul 2 · menit 15 / Bab 3 hlm. 12" />
              {q.type === 'mcq' ? (
                <>
                  {(q.options ?? []).map((o, j) => (
                    <Text key={j} label={`Opsi ${String.fromCharCode(65 + j)}${q.answer === j ? ' (kunci)' : ''}`} value={o} onChange={(v) => upd(i, { options: q.options!.map((x, m) => (m === j ? v : x)) })} />
                  ))}
                  <Select label="Kunci jawaban" value={String(q.answer ?? 0)} onChange={(v) => upd(i, { answer: Number(v) })} options={(q.options ?? []).map((_, j) => [String(j), String.fromCharCode(65 + j)])} />
                  <div className="st-row">{(q.options?.length ?? 0) < 5 && <Btn size="sm" kind="quiet" onClick={() => upd(i, { options: [...(q.options ?? []), ''] })}><I.plus size={14} />Opsi</Btn>}</div>
                </>
              ) : <Area label="Rubrik penilaian" value={q.rubric} onChange={(v) => upd(i, { rubric: v })} rows={3} hint="Kriteria dan bobot yang dipakai reviewer. Min. 20 karakter." />}
              <div className="st-row"><Btn size="sm" kind="quiet" onClick={() => setQs(qs.filter((_, j) => j !== i))} disabled={qs.length < 2}>Hapus soal</Btn></div>
            </li>
          ))}
        </ol>
        <div className="st-row">
          <Btn size="sm" onClick={() => setQs([...qs, newQ('mcq')])}><I.plus size={14} />Pilihan ganda</Btn>
          <Btn size="sm" onClick={() => setQs([...qs, newQ('essay')])}><I.plus size={14} />Esai</Btn>
        </div>
        <div className="st-dlg__foot"><Btn onClick={() => save(false)} busy={busy === 'save'}>Simpan draft</Btn><Btn kind="primary" onClick={() => save(true)} busy={busy === 'sub'}>Ajukan ke reviewer</Btn></div>
        <a href={`${ORIGIN.edu}/policies/terms`} target="_blank" rel="noopener noreferrer" className="st-small st-muted">Skor esai selalu ditetapkan reviewer manusia.</a>
      </div>
    </Dialog>
  );
}
