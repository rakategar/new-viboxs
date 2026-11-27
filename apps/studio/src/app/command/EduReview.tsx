import { useEffect, useMemo, useState } from 'react';
import { ORIGIN } from '@viboxs/shared/ecosystem';
import { useAction, useLoad } from '../../lib/hooks';
import { PRICING, PROG_PATH, PROG_STATUS, PROG_TYPE, ago, fmtDate, rupiah } from '../../lib/labels';
import { sb, must, rpc, sendOutbox, type ProgramDraft, type ProgramReview } from '../../lib/sb';
import { Area, Badge, Btn, Check, Dialog, Empty, I, KV, Loaded, PageHead, StatusBadge, Tabs, useToast } from '../../ui/kit';

const GROUP: Record<string, string[]> = { review: ['submitted'], approved: ['approved', 'publish_queued', 'publish_failed'], live: ['published'], other: ['draft', 'needs_revision', 'cancelled', 'completed', 'archived'] };

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
      <PageHead eyebrow="CMD-08 · EDU Creator Approval" title="Review program EDU" desc="Kontributor mengajukan, Commander memeriksa hak materi & media, copy, jadwal, dan format. Setujui = langsung tayang di EDU; status “Tayang” hanya setelah EDU mengonfirmasi." />
      <Tabs label="Status" value={g} onChange={setG} tabs={[['review', 'Menunggu review', n('review')], ['approved', 'Disetujui / gagal tayang', n('approved')], ['live', 'Tayang', n('live')], ['other', 'Draft & revisi']]} />
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
      {sel && <Review d={sel} onClose={() => setSel(null)} onDone={(m, bad) => { toast(m, bad ? 'err' : undefined); setSel(null); s.reload(); }} />}
    </div>
  );
}

const CHECKS: [string, string][] = [
  ['identity', 'Identitas kontributor sesuai'], ['rights', 'Hak materi dinyatakan & wajar'], ['media', 'Cover/poster berhak pakai, proporsi & alt text sesuai'],
  ['copy', 'Copy tanpa klaim terlarang (sertifikasi, jaminan hasil, angka palsu)'], ['schedule', 'Jadwal, zona waktu, kapasitas / file & lisensi masuk akal'],
  ['price', 'Harga final, token & ketentuan refund wajar (bukan “non-refundable semua”)'],
];
const mask = (u: string | null) => (u ? u.replace(/^(https:\/\/[^/]+).*$/, '$1/••••') : '—');

/**
 * v4 WP04 (V4-PF-010..015): Setujui → salin cover dari staging privat ke bucket publik edu-media → st_send_to_edu menayangkan.
 * Satu klik. Bila salah satu langkah gagal, status publish_failed / approved tercatat jujur dan tombol "Tayangkan ulang" muncul.
 */
async function publish(d: Pick<ProgramDraft, 'id' | 'cover_path'>) {
  if (d.cover_path) {
    const pub = `programs/${d.id}/${d.cover_path.split('/').pop()}`;
    const { data: blob, error: e1 } = await sb.storage.from('st-program-media').download(d.cover_path);
    if (e1 || !blob) throw new Error(`Cover staging tidak terbaca: ${e1?.message ?? 'kosong'}`);
    const { error: e2 } = await sb.storage.from('edu-media').upload(pub, blob, { contentType: blob.type || 'image/webp', upsert: false });
    if (e2 && !/exists|duplicate/i.test(e2.message)) throw new Error(`Cover belum tersalin ke media publik: ${e2.message}`);
  }
  return rpc<string>('st_send_to_edu', { p_id: d.id });
}

function Review({ d, onClose, onDone }: { d: ProgramDraft; onClose: () => void; onDone: (m: string, bad?: boolean) => void }) {
  const toast = useToast();
  const [note, setNote] = useState(d.review_note ?? '');
  const [c, setC] = useState<Record<string, boolean>>({});
  const [cover, setCover] = useState<string | null>(null);
  const [priv, setPriv] = useState<{ meeting_url: string | null; ebook_path: string | null } | null>(null);
  const [hist, setHist] = useState<ProgramReview[]>([]);
  const { busy, run } = useAction();
  const ff = d.format_fields ?? {};
  useEffect(() => {
    if (d.cover_path) sb.storage.from('st-program-media').createSignedUrl(d.cover_path, 600).then(({ data }) => setCover(data?.signedUrl ?? null));
    sb.from('st_program_private').select('meeting_url, ebook_path').eq('draft_id', d.id).maybeSingle().then(({ data }) => setPriv(data as typeof priv));
    sb.from('st_program_reviews').select('*').eq('draft_id', d.id).order('created_at', { ascending: false }).then(({ data }) => setHist((data ?? []) as ProgramReview[]));
  }, [d.id, d.cover_path]);
  const done = (slug: string) => slug.startsWith('FAILED')
    ? onDone(`Belum tayang: ${slug.slice(8)} — buka program ini lalu tekan “Tayangkan ulang”.`, true)
    : (void sendOutbox(), onDone(`Tayang di EDU (/${slug}). Kontributor diberi tahu setelah EDU mengonfirmasi.`));
  const decide = (status: 'approved' | 'needs_revision') => run(status, async () => {
    if (status === 'needs_revision' && note.trim().length < 10) throw new Error('Tulis alasan revisi yang bisa ditindaklanjuti (min. 10 karakter).');
    if (status === 'approved' && CHECKS.some(([k]) => !c[k])) throw new Error('Lengkapi checklist review sebelum menyetujui.');
    await rpc('st_review_draft', { p_id: d.id, p_decision: status, p_note: note.trim() || null, p_checks: c });
    if (status === 'needs_revision') return 'REV';
    try { return await publish(d); } catch (e) { return `FAILED: ${(e as Error).message}`; }
  }, (r) => (r === 'REV' ? onDone('Dikembalikan ke kontributor dengan catatan revisi.') : done(r as string)), (e) => toast(e, 'err'));
  const retry = () => run('send', () => publish(d), done, (e) => toast(e, 'err'));
  const digital = d.type === 'ebook' || d.type === 'kit';
  return (
    <Dialog open onClose={onClose} title={d.title} wide>
      <div className="st-stack">
        <div className="st-cover">
          {cover ? <img src={cover} alt={d.cover_alt ?? ''} className="st-cover__img" style={{ aspectRatio: (d.cover_ratio ?? '16:9').replace(':', ' / ') }} />
            : <div className="st-cover__img st-cover__empty" style={{ aspectRatio: '16 / 9' }}>{d.cover_url ? 'Draft lama: sampul URL eksternal' : 'Tanpa cover'}</div>}
          <KV rows={[
            ['Format', PROG_TYPE[d.type] ?? d.type], ['Jalur', PROG_PATH[d.path]],
            ['Model harga', PRICING[d.pricing] + (d.pricing === 'paid' ? ` · ${d.price ? rupiah(d.price) : 'harga belum diisi'}` : '')],
            ['Token reward', 'Tidak diterima (redemption OFF)'], ['Pajak', 'Mengikuti kebijakan EDU (harga final termasuk pajak bila berlaku)'],
            ['Alt text', d.cover_alt || '—'], ['Hak media', d.rights_media ? <Badge key="m" tone="ok">Dinyatakan</Badge> : <Badge key="m" tone="danger">Belum</Badge>],
            ['Hak materi', d.rights_declared ? <Badge key="r" tone="ok">Dinyatakan pemilik</Badge> : <Badge key="r" tone="danger">Belum dinyatakan</Badge>],
          ]} />
        </div>
        <KV rows={[
          ['Nama publik', d.public_name ?? 'Tidak ditampilkan'], ['Refund', d.refund_terms ?? '—'], ['Untuk siapa', d.for_who], ['Level', d.level],
          ...(digital ? [
            ['Halaman / versi', [ff.pages, ff.version].filter(Boolean).join(' · ') || '—'], ['Lisensi', ff.license ?? '—'],
            ['File produk', priv?.ebook_path ? `Tersimpan privat (${priv.ebook_path.split('/').pop()})` : 'Belum ada'],
          ] as [string, string][] : [
            ['Jadwal', d.schedule_at ? `${fmtDate(d.schedule_at)}${ff.timezone && ff.timezone !== 'Asia/Jakarta' ? ` · diisi dalam ${ff.timezone}` : ''}` : 'Belum ditentukan'],
            ['Durasi', d.duration ?? '—'], ['Kapasitas', d.capacity ? `${d.capacity} peserta` : '—'], ['Tautan sesi (privat)', mask(priv?.meeting_url ?? null)],
          ] as [string, string][]),
        ]} />
        <div><span className="st-eyebrow">Ringkasan</span><p className="st-prose">{d.summary || '—'}</p></div>
        {d.outcomes.length > 0 && <div><span className="st-eyebrow">Hasil belajar</span><ul className="st-bullets">{d.outcomes.map((o) => <li key={o}>{o}</li>)}</ul></div>}
        {d.toc.length > 0 && <div><span className="st-eyebrow">Daftar isi</span><ul className="st-bullets">{d.toc.map((o) => <li key={o}>{o}</li>)}</ul></div>}
        {(ff.agenda ?? []).length > 0 && <div><span className="st-eyebrow">Agenda</span><ul className="st-bullets">{ff.agenda!.map((a, i) => <li key={i}>{a.item}{a.dur ? ` · ${a.dur}` : ''}</li>)}</ul></div>}
        {(ff.sessions ?? []).length > 0 && <div><span className="st-eyebrow">Sesi</span><ul className="st-bullets">{ff.sessions!.map((x, i) => <li key={i}>{x.starts_at ? fmtDate(x.starts_at) : '—'} · {x.dur}</li>)}</ul></div>}
        {(ff.files ?? []).length > 0 && <div><span className="st-eyebrow">Isi kit</span><ul className="st-bullets">{ff.files!.map((x, i) => <li key={i}><b>{x.name}</b> — {x.toc.join(', ')} · {x.license}</li>)}</ul></div>}
        {ff.speaker_bio && <div><span className="st-eyebrow">Bio pembicara</span><p className="st-prose">{ff.speaker_bio}</p></div>}
        {(ff.faq ?? []).length > 0 && <div><span className="st-eyebrow">FAQ</span><ul className="st-bullets">{ff.faq!.map((x, i) => <li key={i}><b>{x.q}</b> {x.a}</li>)}</ul></div>}
        {ff.preview && <div><span className="st-eyebrow">Preview berizin</span><p className="st-prose">{ff.preview}</p></div>}
        {(ff.resources || ff.assignment || ff.output) && <KV rows={[['Resources', ff.resources ?? '—'], ['Assignment', ff.assignment ?? '—'], ['Output', ff.output ?? '—']]} />}
        {hist.length > 0 && <div><span className="st-eyebrow">Riwayat review</span><ul className="st-list">{hist.map((h) => <li key={h.id}><span><b>{h.decision === 'approved' ? 'Disetujui' : 'Minta revisi'}</b><small>{h.note ?? '—'}</small></span><span className="st-muted st-small">{ago(h.created_at)}</span></li>)}</ul></div>}
        {d.status === 'submitted' && (
          <>
            <div className="st-qc">{CHECKS.map(([k, l]) => <Check key={k} label={l} checked={!!c[k]} onChange={(v) => setC({ ...c, [k]: v })} />)}</div>
            <Area label="Catatan untuk kontributor (wajib bila minta revisi)" value={note} onChange={setNote} rows={3} />
            <div className="st-dlg__foot"><Btn onClick={() => decide('needs_revision')} busy={busy === 'needs_revision'}>Minta revisi</Btn><Btn kind="primary" onClick={() => decide('approved')} busy={busy === 'approved'} busyLabel="Menayangkan…"><I.check size={16} />Setujui &amp; tayangkan</Btn></div>
          </>
        )}
        {d.status === 'publish_failed' && <div className="st-alert st-alert--err">Publikasi gagal: {d.publish_error ?? '—'}</div>}
        {['approved', 'publish_failed', 'publish_queued'].includes(d.status) && (
          <div className="st-alert st-alert--info st-alert--row">
            <span>{d.status === 'publish_queued' ? 'Entri EDU ada tetapi belum tayang (mis. disembunyikan admin CMS).' : 'Program disetujui tetapi belum tayang.'} Tayangkan ulang memperbarui entri EDU yang sama — tidak membuat duplikat.</span>
            <Btn kind="primary" onClick={retry} busy={busy === 'send'}>Tayangkan ulang</Btn>
          </div>
        )}
        {(d.status === 'publish_queued' || d.status === 'published') && d.edu_slug && (
          <div className="st-row"><a className="st-btn st-btn--ghost st-btn--sm" href={`${ORIGIN.edu}/admin/program`} target="_blank" rel="noopener noreferrer"><I.ext size={14} />Buka CMS EDU</a>{d.status === 'published' && <a className="st-btn st-btn--ghost st-btn--sm" href={`${ORIGIN.edu}/${digital ? 'digital-library' : 'programs'}/${d.edu_slug}`} target="_blank" rel="noopener noreferrer"><I.ext size={14} />Lihat di EDU</a>}</div>
        )}
      </div>
    </Dialog>
  );
}
