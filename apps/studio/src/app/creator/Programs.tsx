import { useEffect, useState } from 'react';
import { ORIGIN } from '@viboxs/shared/ecosystem';
import { useAuth } from '../../lib/auth';
import { useAction, useLoad } from '../../lib/hooks';
import { PRICING, PROG_PATH, PROG_STATUS, PROG_TYPE, ago, fromLocalInput, slugify, toLocalInput } from '../../lib/labels';
import { sb, must, type ProgramDraft } from '../../lib/sb';
import { Area, Btn, Card, Check, Empty, I, Loaded, PageHead, Select, StatusBadge, TagInput, Text, useToast } from '../../ui/kit';

const BLANK: Omit<ProgramDraft, 'id' | 'owner_id' | 'status' | 'review_note' | 'edu_slug' | 'updated_at'> = {
  title: '', slug: '', type: 'webinar', path: 'ai', pricing: 'free', summary: '', for_who: '', level: '', outcomes: [], tags: [],
  schedule_at: null, duration: '', capacity: null, rights_declared: false,
};

/** EDU-01..07: kontributor membuat draft & mengajukan review. Tidak pernah publish langsung. */
export default function Programs() {
  const { me } = useAuth();
  const s = useLoad(() => must(sb.from('st_program_drafts').select('*').eq('owner_id', me!.profile.id).order('updated_at', { ascending: false })) as Promise<ProgramDraft[]>);
  const [edit, setEdit] = useState<ProgramDraft | 'new' | null>(null);
  return (
    <div className="st-page-in">
      <PageHead eyebrow="EDU Creator" title="Program saya" desc="Draft → review Commander → dikirim ke EDU → tayang saat EDU menayangkan. Harga final ditetapkan EDU (PRICE HOLD).">
        {!edit && <Btn kind="primary" onClick={() => setEdit('new')}><I.plus size={16} />Program baru</Btn>}
      </PageHead>
      {edit ? (
        <Editor initial={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSaved={() => { s.reload(); setEdit(null); }} />
      ) : (
        <Loaded state={s} empty={(d) => (d.length ? null : <Empty title="Belum ada program" icon={I.book}>Mulai dari satu webinar atau e-book. Anda bisa menyimpan draft kapan saja.</Empty>)}>
          {(d) => (
            <div className="st-cards">
              {d.map((p, i) => (
                <article key={p.id} className="st-lead" style={{ ['--i' as string]: i }}>
                  <span className="row-between"><span className="st-mono">{PROG_TYPE[p.type]} · {PROG_PATH[p.path]}</span><StatusBadge map={PROG_STATUS} value={p.status} /></span>
                  <b>{p.title}</b>
                  <span className="st-small st-muted st-clamp">{p.summary || 'Belum ada ringkasan.'}</span>
                  {p.status === 'needs_revision' && p.review_note && <span className="st-alert st-alert--warn st-small">Catatan review: {p.review_note}</span>}
                  <span className="row-between"><span className="st-small st-muted">Diperbarui {ago(p.updated_at)}</span>
                    {['draft', 'needs_revision'].includes(p.status) ? <Btn size="sm" onClick={() => setEdit(p)}>Edit</Btn>
                      : p.status === 'published' && p.edu_slug ? <a className="st-btn st-btn--ghost st-btn--sm" href={`${ORIGIN.edu}/programs/${p.edu_slug}`} target="_blank" rel="noopener noreferrer">Permalink EDU<I.ext size={14} /></a>
                        : <Btn size="sm" kind="quiet" onClick={() => setEdit(p)}>Lihat</Btn>}
                  </span>
                </article>
              ))}
            </div>
          )}
        </Loaded>
      )}
    </div>
  );
}

function Editor({ initial, onClose, onSaved }: { initial: ProgramDraft | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState(initial ? { ...initial } : { ...BLANK });
  const [err, setErr] = useState<Record<string, string>>({});
  const [autoSlug, setAutoSlug] = useState(!initial);
  const { busy, run } = useAction();
  const readOnly = !!initial && !['draft', 'needs_revision'].includes(initial.status);
  useEffect(() => { if (autoSlug) setF((x) => ({ ...x, slug: slugify(x.title) })); }, [f.title, autoSlug]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF({ ...f, [k]: v });

  const validate = (submit: boolean) => {
    const e: Record<string, string> = {};
    if (f.title.trim().length < 6) e.title = 'Judul minimal 6 karakter.';
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug)) e.slug = 'Slug hanya huruf kecil, angka, dan tanda hubung.';
    if (submit) {
      if (f.summary.trim().length < 40) e.summary = 'Ringkasan minimal 40 karakter.';
      if (!f.for_who.trim()) e.for_who = 'Isi sasaran peserta.';
      if (f.outcomes.length < 2) e.outcomes = 'Tulis minimal 2 hasil belajar.';
      if (f.type !== 'ebook' && f.schedule_at && new Date(f.schedule_at) < new Date()) e.schedule_at = 'Jadwal sudah lewat.';
      if (!f.rights_declared) e.rights = 'Nyatakan hak atas materi sebelum mengajukan.';
    }
    setErr(e);
    return !Object.keys(e).length;
  };
  const save = (submit: boolean) => run(submit ? 'sub' : 'save', async () => {
    if (!validate(submit)) throw new Error(submit ? 'Lengkapi isian yang ditandai sebelum mengajukan.' : 'Periksa isian yang ditandai.');
    const row = {
      title: f.title.trim(), slug: f.slug, type: f.type, path: f.path, pricing: f.pricing, summary: f.summary.trim(), for_who: f.for_who.trim(), level: f.level.trim(),
      outcomes: f.outcomes, tags: f.tags, schedule_at: f.type === 'ebook' ? null : f.schedule_at, duration: f.duration || null, capacity: f.type === 'ebook' ? null : f.capacity,
      rights_declared: f.rights_declared, status: submit ? 'submitted' : 'draft',
    };
    if (initial) await must(sb.from('st_program_drafts').update(row).eq('id', initial.id));
    else await must(sb.from('st_program_drafts').insert(row));
  }, () => { toast(submit ? 'Diajukan untuk review Commander.' : 'Draft disimpan — belum terlihat publik.'); onSaved(); }, (e) => toast(e, 'err'));

  return (
    <Card title={initial ? (readOnly ? f.title : 'Edit program') : 'Program baru'} desc={readOnly ? 'Program sedang/selesai direview — tidak bisa diedit.' : 'Disimpan sebagai draft. Tidak ada yang tayang sebelum disetujui dan ditayangkan EDU.'}
      actions={<Btn size="sm" kind="quiet" onClick={onClose}><I.back size={14} />Kembali</Btn>}>
      <fieldset className="st-form" disabled={readOnly}>
        <Text label="Judul" value={f.title} onChange={(v) => set('title', v)} error={err.title} wide required />
        <Text label="Slug URL (saran)" value={f.slug} onChange={(v) => { setAutoSlug(false); set('slug', v); }} error={err.slug} hint={`edu.viboxs.com/programs/${f.slug || '…'}`} />
        <Select label="Format" value={f.type} onChange={(v) => set('type', v)} options={Object.entries(PROG_TYPE) as [ProgramDraft['type'], string][]} hint={f.type === 'ecourse' ? 'E-course: konten tetap terkunci sampai delivery EDU siap.' : undefined} />
        <Select label="Jalur belajar" value={f.path} onChange={(v) => set('path', v)} options={Object.entries(PROG_PATH) as [ProgramDraft['path'], string][]} />
        <Select label="Model harga" value={f.pricing} onChange={(v) => set('pricing', v)} options={Object.entries(PRICING) as [ProgramDraft['pricing'], string][]} hint="Nominal tidak diisi di sini — ditetapkan EDU setelah kebijakan disetujui." />
        <Area label="Ringkasan" value={f.summary} onChange={(v) => set('summary', v)} error={err.summary} rows={4} hint="Tanpa klaim sertifikasi resmi, jaminan hasil, atau angka yang belum terverifikasi." />
        <Text label="Untuk siapa" value={f.for_who} onChange={(v) => set('for_who', v)} error={err.for_who} wide />
        <Text label="Level & prasyarat" value={f.level} onChange={(v) => set('level', v)} placeholder="mis. Pemula · tanpa prasyarat" />
        <Text label="Durasi" value={f.duration} onChange={(v) => set('duration', v)} placeholder="mis. 90 menit" />
        {f.type !== 'ebook' && <>
          <Text label="Jadwal (WIB)" type="datetime-local" value={toLocalInput(f.schedule_at)} onChange={(v) => set('schedule_at', fromLocalInput(v))} error={err.schedule_at} hint="Boleh dikosongkan — tampil “Tanggal menyusul”." />
          <Text label="Kapasitas" type="number" min={1} value={f.capacity ?? ''} onChange={(v) => set('capacity', v ? Number(v) : null)} />
        </>}
        <TagInput label="Hasil belajar" value={f.outcomes} onChange={(v) => set('outcomes', v)} hint={err.outcomes || 'Pisahkan dengan koma. Tulis sebagai kemampuan yang bisa dipraktikkan.'} />
        <TagInput label="Tag topik" value={f.tags} onChange={(v) => set('tags', v)} />
        <div className="st-field st-field--wide">
          <Check label="Saya pemilik atau pemegang hak materi ini dan mengizinkan VIBOXS EDU mempromosikannya." hint={err.rights || 'Pernyataan tercatat bersama versi draft.'} checked={f.rights_declared} onChange={(v) => set('rights_declared', v)} />
        </div>
        {!readOnly && <div className="st-form__act"><Btn onClick={() => save(false)} busy={busy === 'save'}>Simpan draft</Btn><Btn kind="primary" onClick={() => save(true)} busy={busy === 'sub'}>Ajukan review</Btn></div>}
      </fieldset>
    </Card>
  );
}
