import { useMemo, useState } from 'react';
import { ORIGIN } from '@viboxs/shared/ecosystem';
import { useAction, useLoad } from '../../lib/hooks';
import { PRICING, PROG_PATH, PROG_STATUS, PROG_TYPE, ago, fmtDate } from '../../lib/labels';
import { sb, must, rpc, type ProgramDraft } from '../../lib/sb';
import { Area, Badge, Btn, Check, Dialog, Empty, I, KV, Loaded, PageHead, StatusBadge, Tabs, useToast } from '../../ui/kit';

const GROUP: Record<string, string[]> = { review: ['submitted'], approved: ['approved', 'publish_queued'], live: ['published'], other: ['draft', 'needs_revision', 'archived'] };

/** CMD-08: review program kontributor. EDU tetap pemilik katalog — Studio hanya mengirim draft. */
export default function EduReview() {
  const toast = useToast();
  const [g, setG] = useState<'review' | 'approved' | 'live' | 'other'>('review');
  const [sel, setSel] = useState<ProgramDraft | null>(null);
  const s = useLoad(async () => {
    const [d, p] = await Promise.all([
      must(sb.from('st_program_drafts').select('*').order('updated_at', { ascending: false })) as Promise<ProgramDraft[]>,
      must(sb.from('st_profiles').select('id, display_name, email')) as Promise<{ id: string; display_name: string; email: string }[]>,
    ]);
    return d.map((x) => ({ ...x, owner: p.find((y) => y.id === x.owner_id) }));
  });
  const list = useMemo(() => (s.data ?? []).filter((d) => GROUP[g].includes(d.status)), [s.data, g]);
  const n = (k: string) => (s.data ?? []).filter((d) => GROUP[k].includes(d.status)).length;
  return (
    <div className="st-page-in">
      <PageHead eyebrow="CMD-08 · EDU Creator Approval" title="Review program EDU" desc="Kontributor mengajukan, Commander memeriksa hak materi, copy, jadwal, dan format. Program yang disetujui dikirim ke CMS EDU sebagai draft — tayang hanya saat EDU menayangkannya." />
      <Tabs label="Status" value={g} onChange={setG} tabs={[['review', 'Menunggu review', n('review')], ['approved', 'Disetujui / di EDU', n('approved')], ['live', 'Tayang', n('live')], ['other', 'Draft & revisi']]} />
      <Loaded state={s} empty={() => (list.length ? null : <Empty title="Tidak ada program di sini" icon={I.book}>Program dari EDU Contributor muncul setelah mereka menekan “Ajukan review”.</Empty>)}>
        {() => (
          <div className="st-cards">
            {list.map((d, i) => (
              <button type="button" key={d.id} className="st-lead" style={{ ['--i' as string]: i }} onClick={() => setSel(d)}>
                <span className="row-between"><span className="st-mono">{PROG_TYPE[d.type]} · {PROG_PATH[d.path]}</span><StatusBadge map={PROG_STATUS} value={d.status} /></span>
                <b>{d.title}</b>
                <span className="st-small st-muted st-clamp">{d.summary || '—'}</span>
                <span className="st-small st-muted">{d.owner?.display_name || d.owner?.email} · {ago(d.updated_at)}</span>
              </button>
            ))}
          </div>
        )}
      </Loaded>
      {sel && <Review d={sel} onClose={() => setSel(null)} onDone={(m) => { toast(m); setSel(null); s.reload(); }} />}
    </div>
  );
}

function Review({ d, onClose, onDone }: { d: ProgramDraft; onClose: () => void; onDone: (m: string) => void }) {
  const toast = useToast();
  const [note, setNote] = useState(d.review_note ?? '');
  const [c, setC] = useState<Record<string, boolean>>({});
  const { busy, run } = useAction();
  const CHECKS = ['Identitas kontributor sesuai', 'Hak materi dinyatakan & wajar', 'Copy tanpa klaim terlarang (sertifikasi, jaminan hasil, angka palsu)', 'Jadwal, zona waktu & kapasitas masuk akal', 'Model harga sesuai kebijakan EDU (PRICE HOLD)'];
  const decide = (status: 'approved' | 'needs_revision') => run(status, async () => {
    if (status === 'needs_revision' && note.trim().length < 10) throw new Error('Tulis alasan revisi (min. 10 karakter).');
    if (status === 'approved' && CHECKS.some((x) => !c[x])) throw new Error('Lengkapi checklist review sebelum menyetujui.');
    await must(sb.from('st_program_drafts').update({ status, review_note: note.trim() || null, reviewed_at: new Date().toISOString() }).eq('id', d.id));
  }, () => onDone(status === 'approved' ? 'Disetujui. Kirim ke EDU saat siap.' : 'Dikembalikan ke kontributor untuk revisi.'), (e) => toast(e, 'err'));
  const send = () => run('send', () => rpc<string>('st_send_to_edu', { p_id: d.id }),
    (slug) => onDone(`Terkirim ke CMS EDU sebagai draft (/${slug}). Tayangkan dari dashboard EDU setelah harga & jadwal final.`), (e) => toast(e, 'err'));
  return (
    <Dialog open onClose={onClose} title={d.title} wide>
      <div className="st-stack">
        <KV rows={[
          ['Format', PROG_TYPE[d.type]], ['Jalur', PROG_PATH[d.path]], ['Model harga', PRICING[d.pricing]], ['Untuk siapa', d.for_who], ['Level', d.level],
          ['Jadwal', d.schedule_at ? fmtDate(d.schedule_at) : 'Belum ditentukan'], ['Durasi', d.duration], ['Kapasitas', d.capacity ? `${d.capacity} peserta` : '—'],
          ['Hak materi', d.rights_declared ? <Badge key="r" tone="ok">Dinyatakan pemilik</Badge> : <Badge key="r" tone="danger">Belum dinyatakan</Badge>],
        ]} />
        <div><span className="st-eyebrow">Ringkasan</span><p className="st-prose">{d.summary || '—'}</p></div>
        {d.outcomes.length > 0 && <div><span className="st-eyebrow">Hasil belajar</span><ul className="st-bullets">{d.outcomes.map((o) => <li key={o}>{o}</li>)}</ul></div>}
        {d.status === 'submitted' && (
          <>
            <div className="st-qc">{CHECKS.map((x) => <Check key={x} label={x} checked={!!c[x]} onChange={(v) => setC({ ...c, [x]: v })} />)}</div>
            <Area label="Catatan untuk kontributor" value={note} onChange={setNote} rows={3} />
            <div className="st-dlg__foot"><Btn onClick={() => decide('needs_revision')} busy={busy === 'needs_revision'}>Minta revisi</Btn><Btn kind="primary" onClick={() => decide('approved')} busy={busy === 'approved'}><I.check size={16} />Setujui</Btn></div>
          </>
        )}
        {d.status === 'approved' && (
          <div className="st-alert st-alert--info st-alert--row">
            <span>Kirim ke EDU membuat entri <b>belum tayang</b> di CMS EDU. Status di Studio berubah menjadi “Tayang” hanya setelah EDU menayangkannya.</span>
            <Btn kind="primary" onClick={send} busy={busy === 'send'}>Kirim ke EDU</Btn>
          </div>
        )}
        {(d.status === 'publish_queued' || d.status === 'published') && d.edu_slug && (
          <div className="st-row"><a className="st-btn st-btn--ghost st-btn--sm" href={`${ORIGIN.edu}/admin/program`} target="_blank" rel="noopener noreferrer"><I.ext size={14} />Buka CMS EDU</a>{d.status === 'published' && <a className="st-btn st-btn--ghost st-btn--sm" href={`${ORIGIN.edu}/programs/${d.edu_slug}`} target="_blank" rel="noopener noreferrer"><I.ext size={14} />Lihat di EDU</a>}</div>
        )}
      </div>
    </Dialog>
  );
}
