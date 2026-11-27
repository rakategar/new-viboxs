import { useEffect, useRef, useState } from 'react';
import { useAction } from '../../lib/hooks';
import { COVER_RATIO, PRICING, PROG_PATH, PROG_TYPE, TIMEZONES, fromTzInput, slugify, toTzInput } from '../../lib/labels';
import { sb, must, type FormatFields, type ProgFormat, type ProgramDraft } from '../../lib/sb';
import { Area, Btn, Card, Check, I, Select, TagInput, Text, useToast } from '../../ui/kit';

/**
 * v4 WP04 — form produk adaptif per format (PRD v4 §08.2, QA V4-PF-001..009).
 * Hanya field yang relevan yang tampil & dikirim; server (trigger st_program_shape) membuang sisanya dan memvalidasi saat diajukan.
 * Cover/poster: dipotong di browser sesuai rasio format (focal point), di-encode ulang ke WebP (metadata/EXIF hilang),
 * lalu disimpan ke bucket PRIVAT st-program-media. URL publik baru dibuat Commander setelah program disetujui.
 */

type Draft = Omit<ProgramDraft, 'id' | 'owner_id' | 'status' | 'review_note' | 'edu_slug' | 'updated_at' | 'edu_program_id' | 'publish_error'>;
const BLANK: Draft = {
  title: '', slug: '', type: 'webinar', path: 'ai', pricing: 'free', summary: '', for_who: '', level: '', outcomes: [], tags: [],
  schedule_at: null, duration: '', capacity: null, rights_declared: false,
  price: null, accepts_tokens: false, public_name: '', toc: [], cover_url: '', refund_terms: '', support_contact: '',
  format_fields: { timezone: 'Asia/Jakarta' }, cover_path: null, cover_alt: '', cover_ratio: null, rights_media: false,
};
const KEYS: Record<ProgFormat, (keyof FormatFields)[]> = {
  ebook: ['pages', 'license', 'version', 'preview'],
  webinar: ['speaker_bio', 'timezone', 'agenda', 'faq', 'summary_due'],
  workshop: ['speaker_bio', 'timezone', 'agenda', 'sessions', 'resources', 'assignment', 'output'],
  kit: ['files', 'license', 'version', 'preview'],
  ecourse: [],
};
const DIGITAL = (t: ProgFormat) => t === 'ebook' || t === 'kit';
const SESSION = (t: ProgFormat) => t === 'webinar' || t === 'workshop';
const pick = (ff: FormatFields, t: ProgFormat) => Object.fromEntries(KEYS[t].filter((k) => ff[k] !== undefined).map((k) => [k, ff[k]])) as FormatFields;

/** Tanda tangan file (magic bytes) — bukan hanya ekstensi/MIME dari browser. */
async function sniff(f: File): Promise<'png' | 'jpeg' | 'webp' | 'pdf' | 'zip' | 'svg' | null> {
  const b = new Uint8Array(await f.slice(0, 16).arrayBuffer());
  const s = (i: number, n: number) => String.fromCharCode(...b.slice(i, i + n));
  if (b[0] === 0x89 && s(1, 3) === 'PNG') return 'png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (s(0, 4) === 'RIFF' && s(8, 4) === 'WEBP') return 'webp';
  if (s(0, 5) === '%PDF-') return 'pdf';
  if (b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return 'zip'; // ZIP & ePub
  const head = (await f.slice(0, 256).text()).toLowerCase();
  if (head.includes('<svg') || head.includes('<?xml')) return 'svg';
  return null;
}

export function ProgramEditor({ initial, onClose, onSaved }: { initial: ProgramDraft | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [id, setId] = useState<string | null>(initial?.id ?? null);
  const [f, setF] = useState<Draft>(() => initial ? {
    ...BLANK, ...initial, public_name: initial.public_name ?? '', cover_url: initial.cover_url ?? '', refund_terms: initial.refund_terms ?? '',
    support_contact: initial.support_contact ?? '', cover_alt: initial.cover_alt ?? '', format_fields: { timezone: 'Asia/Jakarta', ...(initial.format_fields ?? {}) },
  } : { ...BLANK });
  const [meet, setMeet] = useState('');
  const [file, setFile] = useState<string | null>(null);
  const [nameOk, setNameOk] = useState(!!initial?.public_name);
  const [err, setErr] = useState<Record<string, string>>({});
  const [autoSlug, setAutoSlug] = useState(!initial);
  const { busy, run } = useAction();
  const readOnly = !!initial && !['draft', 'needs_revision'].includes(initial.status);
  const t = f.type;
  const ff = f.format_fields;
  const tz = ff.timezone || 'Asia/Jakarta';

  useEffect(() => {
    if (!initial) return;
    sb.from('st_program_private').select('meeting_url, ebook_path').eq('draft_id', initial.id).maybeSingle().then(({ data }) => {
      const d = data as { meeting_url: string | null; ebook_path: string | null } | null;
      setMeet(d?.meeting_url ?? ''); setFile(d?.ebook_path ?? null);
    });
  }, [initial]);
  useEffect(() => { if (autoSlug) setF((x) => ({ ...x, slug: slugify(x.title) })); }, [f.title, autoSlug]);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setF((x) => ({ ...x, [k]: v }));
  const setFF = <K extends keyof FormatFields>(k: K, v: FormatFields[K]) => setF((x) => ({ ...x, format_fields: { ...x.format_fields, [k]: v } }));
  const setType = (v: ProgFormat) => setF((x) => ({ ...x, type: v, format_fields: { timezone: 'Asia/Jakarta', ...x.format_fields },
    // rasio cover lama tidak cocok untuk format baru → minta unggah ulang
    cover_path: x.cover_ratio && x.cover_ratio !== COVER_RATIO[v] ? null : x.cover_path, cover_ratio: x.cover_ratio && x.cover_ratio !== COVER_RATIO[v] ? null : x.cover_ratio }));

  const row = (submit: boolean) => ({
    title: f.title.trim(), slug: f.slug, type: t, path: f.path, pricing: f.pricing, summary: f.summary.trim(), for_who: f.for_who.trim(), level: f.level.trim(),
    outcomes: f.outcomes, tags: f.tags, schedule_at: t === 'webinar' ? f.schedule_at : null, duration: f.duration || null,
    capacity: SESSION(t) ? f.capacity : null, rights_declared: f.rights_declared, rights_media: f.rights_media, status: submit ? 'submitted' : 'draft',
    price: f.pricing === 'paid' && f.price ? Number(f.price) : null, public_name: nameOk ? (f.public_name ?? '').trim() || null : null,
    toc: t === 'ebook' ? f.toc : [], refund_terms: (f.refund_terms ?? '').trim() || null, support_contact: (f.support_contact ?? '').trim() || null,
    format_fields: pick(ff, t), cover_path: f.cover_path, cover_alt: (f.cover_alt ?? '').trim() || null, cover_ratio: f.cover_ratio,
  });

  const validate = (submit: boolean) => {
    const e: Record<string, string> = {};
    if (f.title.trim().length < 6) e.title = 'Judul minimal 6 karakter.';
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug)) e.slug = 'Slug hanya huruf kecil, angka, dan tanda hubung.';
    if (meet && !/^https:\/\//.test(meet)) e.meet = 'Tautan sesi harus diawali https://';
    if (f.public_name && !nameOk) e.name = 'Centang persetujuan publikasi nama, atau kosongkan.';
    if (submit) {
      if (t === 'ecourse') e.type = 'E-course segera hadir — belum bisa diajukan.';
      if (f.summary.trim().length < 40) e.summary = 'Ringkasan minimal 40 karakter.';
      if (!f.for_who.trim()) e.for_who = 'Isi sasaran peserta.';
      if (f.outcomes.length < 2) e.outcomes = 'Tulis minimal 2 hasil belajar.';
      if (!f.rights_declared) e.rights = 'Nyatakan hak atas materi sebelum mengajukan.';
      if (!f.rights_media) e.rights_media = 'Nyatakan hak pakai cover/poster.';
      if (!f.cover_path) e.cover = SESSION(t) ? 'Unggah poster 16:9.' : 'Unggah cover 4:5.';
      if ((f.cover_alt ?? '').trim().length < 5) e.cover_alt = 'Isi alt text minimal 5 karakter.';
      if (f.pricing === 'paid' && !(Number(f.price) >= 1000)) e.price = 'Isi harga final (min. Rp1.000) untuk program berbayar.';
      if (f.pricing === 'paid' && (f.refund_terms ?? '').trim().length < 10) e.refund = 'Tulis ketentuan refund/reschedule.';
      if (t === 'ebook') {
        if (f.toc.length < 2) e.toc = 'Isi daftar isi minimal 2 bab.';
        if (!/^\d{1,5}$/.test(ff.pages ?? '') || Number(ff.pages) < 1) e.pages = 'Isi jumlah halaman.';
        if (!file) e.file = 'Unggah file e-book (PDF/ePub).';
      }
      if (t === 'kit') {
        if (!(ff.files ?? []).length) e.files = 'Tambahkan minimal 1 file.';
        else if ((ff.files ?? []).some((x) => x.name.trim().length < 3 || !x.toc.length || x.license.trim().length < 3)) e.files = 'Setiap file wajib punya nama, daftar isi, dan lisensi.';
        if (!file) e.file = 'Unggah paket file kit (ZIP/PDF).';
      }
      if (DIGITAL(t)) {
        if ((ff.license ?? '').trim().length < 3) e.license = 'Isi lisensi.';
        if (t === 'ebook' && !(ff.version ?? '').trim()) e.version = 'Isi versi.';
        if ((ff.preview ?? '').trim().length < 20) e.preview = 'Isi preview berizin minimal 20 karakter.';
      }
      if (SESSION(t)) {
        if ((ff.agenda ?? []).filter((x) => x.item.trim()).length < 2) e.agenda = 'Isi agenda minimal 2 butir.';
        if (!(Number(f.capacity) >= 1)) e.capacity = t === 'workshop' ? 'Isi peserta maksimal.' : 'Isi kapasitas.';
        if (!meet) e.meet = 'Isi tautan sesi privat (Zoom/Meet).';
      }
      if (t === 'webinar') {
        if ((ff.speaker_bio ?? '').trim().length < 30) e.speaker_bio = 'Bio pembicara minimal 30 karakter.';
        if (!f.schedule_at || new Date(f.schedule_at) < new Date()) e.schedule_at = 'Isi tanggal & jam di masa depan.';
        if (!(f.duration ?? '').trim()) e.duration = 'Isi durasi.';
        if (!(ff.faq ?? []).some((x) => x.q.trim().length >= 5 && x.a.trim().length >= 5)) e.faq = 'Isi minimal 1 FAQ (pertanyaan & jawaban).';
        if (!(ff.summary_due ?? '').trim()) e.summary_due = 'Isi tenggat summary sesi.';
      }
      if (t === 'workshop') {
        const ss = ff.sessions ?? [];
        if (!ss.length) e.sessions = 'Tambahkan minimal 1 sesi.';
        else if (ss.some((x) => !x.starts_at || new Date(x.starts_at) < new Date() || !x.dur.trim())) e.sessions = 'Setiap sesi butuh tanggal di masa depan dan durasi.';
        if ((ff.resources ?? '').trim().length < 10) e.resources = 'Isi resources.';
        if ((ff.assignment ?? '').trim().length < 10) e.assignment = 'Isi tugas/assignment.';
        if ((ff.output ?? '').trim().length < 10) e.output = 'Isi output latihan.';
      }
    }
    setErr(e);
    return !Object.keys(e).length;
  };

  /** Draft harus ada dulu agar media punya folder drafts/<id>/. */
  const ensureId = async () => {
    if (id) return id;
    if (!validate(false)) throw new Error('Isi judul & slug yang valid dulu — draft disimpan sebelum mengunggah.');
    const r = await must(sb.from('st_program_drafts').insert({ ...row(false), status: 'draft' }).select('id').single()) as { id: string };
    setId(r.id);
    return r.id;
  };

  const save = (submit: boolean) => run(submit ? 'sub' : 'save', async () => {
    if (!validate(submit)) throw new Error(submit ? 'Lengkapi isian yang ditandai sebelum mengajukan.' : 'Periksa isian yang ditandai.');
    const did = await ensureId();
    // URL sesi & file produk di tabel privat — tidak pernah ikut data publik EDU (CON-003)
    await must(sb.from('st_program_private').upsert({ draft_id: did, meeting_url: SESSION(t) ? meet.trim() || null : null, ebook_path: DIGITAL(t) ? file : null }));
    await must(sb.from('st_program_drafts').update(row(submit)).eq('id', did));
  }, () => { toast(submit ? 'Diajukan untuk review Commander.' : 'Draft disimpan — belum terlihat publik.'); onSaved(); }, (e) => toast(e, 'err'));

  const uploadFile = (fl: File) => run('file', async () => {
    const k = await sniff(fl);
    if (t === 'ebook' ? !(k === 'pdf' || k === 'zip') : !(k === 'zip' || k === 'pdf')) throw new Error(t === 'ebook' ? 'File e-book harus PDF atau ePub.' : 'Paket kit harus ZIP atau PDF.');
    if (fl.size > 50 * 1024 * 1024) throw new Error('Ukuran file maksimal 50 MB.');
    const did = await ensureId();
    const ext = k === 'pdf' ? 'pdf' : /\.epub$/i.test(fl.name) ? 'epub' : 'zip';
    const mime = k === 'pdf' ? 'application/pdf' : ext === 'epub' ? 'application/epub+zip' : 'application/zip';
    const path = `drafts/${did}/file-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from('edu-private').upload(path, fl, { contentType: mime, upsert: false });
    if (error) throw new Error(error.message);
    await must(sb.from('st_program_private').upsert({ draft_id: did, ebook_path: path, meeting_url: null }));
    setFile(path);
  }, () => toast('File tersimpan privat. Hanya pembeli terverifikasi yang mendapat tautan unduh.'), (e) => toast(e, 'err'));

  const ratio = COVER_RATIO[t];
  return (
    <Card title={initial ? (readOnly ? f.title : 'Edit program') : 'Program baru'} desc={readOnly ? 'Program sedang/selesai direview — tidak bisa diedit.' : 'Disimpan sebagai draft. Setelah Commander menyetujui, program langsung tayang di EDU.'}
      actions={<Btn size="sm" kind="quiet" onClick={onClose}><I.back size={14} />Kembali</Btn>}>
      <fieldset className="st-form" disabled={readOnly}>
        <Select label="Format" value={t} onChange={setType} options={Object.entries(PROG_TYPE) as [ProgFormat, string][]}
          hint={t === 'ecourse' ? <span className="st-ferr">E-course segera hadir — draft boleh disimpan, tetapi belum bisa diajukan atau tayang sampai delivery LMS siap.</span> : 'Field di bawah menyesuaikan format. Field format lain tidak ikut tersimpan.'} />
        <Select label="Jalur belajar" value={f.path} onChange={(v) => set('path', v)} options={Object.entries(PROG_PATH) as [ProgramDraft['path'], string][]} />
        <Text label="Judul" value={f.title} onChange={(v) => set('title', v)} error={err.title} wide required />
        <Text label="Slug URL (saran)" value={f.slug} onChange={(v) => { setAutoSlug(false); set('slug', v); }} error={err.slug} hint={`edu.viboxs.com/${DIGITAL(t) ? 'digital-library' : 'programs'}/${f.slug || '…'}`} />
        <Select label="Model harga" value={f.pricing} onChange={(v) => set('pricing', v)} options={Object.entries(PRICING) as [ProgramDraft['pricing'], string][]} />
        {f.pricing === 'paid' && <Text label="Harga final (Rp)" type="number" min={1000} step={1000} value={f.price ?? ''} onChange={(v) => set('price', v ? Number(v) : null)} error={err.price} hint="Bagian Anda 95% dari basis transaksi; 4% fee layanan, 1% cadangan proses. Order lama tetap memakai harga saat dibeli." />}
        <Area label="Ringkasan" value={f.summary} onChange={(v) => set('summary', v)} error={err.summary} rows={4} hint="Tanpa klaim sertifikasi resmi, jaminan hasil, atau angka yang belum terverifikasi." />
        <Text label="Untuk siapa" value={f.for_who} onChange={(v) => set('for_who', v)} error={err.for_who} wide />
        <Text label="Level & prasyarat" value={f.level} onChange={(v) => set('level', v)} placeholder="mis. Pemula · tanpa prasyarat" />
        <TagInput label="Hasil belajar" value={f.outcomes} onChange={(v) => set('outcomes', v)} hint={err.outcomes || 'Pisahkan dengan koma. Tulis sebagai kemampuan yang bisa dipraktikkan.'} />
        <TagInput label="Tag topik" value={f.tags} onChange={(v) => set('tags', v)} />

        <CoverField draftId={id} ensureId={ensureId} ratio={ratio} path={f.cover_path} error={err.cover} disabled={readOnly}
          onChange={(p) => setF((x) => ({ ...x, cover_path: p, cover_ratio: ratio }))} label={SESSION(t) ? 'Poster/banner (16:9)' : 'Cover (4:5)'} />
        <Text label="Alt text cover" value={f.cover_alt} onChange={(v) => set('cover_alt', v)} error={err.cover_alt} wide hint="Deskripsikan isi gambar untuk pembaca layar, mis. “Sampul e-book: tangan menulis prompt di laptop”." />
        <div className="st-field st-field--wide"><Check label="Saya pemegang hak atau berizin memakai gambar cover/poster ini untuk promosi di VIBOXS EDU." hint={err.rights_media} checked={f.rights_media} onChange={(v) => set('rights_media', v)} /></div>

        {t === 'ebook' && <>
          <TagInput label="Daftar isi" value={f.toc} onChange={(v) => set('toc', v)} hint={err.toc || 'Pisahkan bab dengan koma.'} />
          <Text label="Jumlah halaman" type="number" min={1} value={ff.pages ?? ''} onChange={(v) => setFF('pages', v)} error={err.pages} />
          <Text label="Versi" value={ff.version ?? ''} onChange={(v) => setFF('version', v)} error={err.version} placeholder="mis. 1.0" />
        </>}
        {DIGITAL(t) && <>
          <Text label={t === 'kit' ? 'Lisensi paket' : 'Lisensi'} value={ff.license ?? ''} onChange={(v) => setFF('license', v)} error={err.license} wide placeholder="mis. Penggunaan pribadi, tidak untuk dijual ulang" />
          <Area label="Preview berizin" value={ff.preview ?? ''} onChange={(v) => setFF('preview', v)} error={err.preview} rows={3} hint="Cuplikan yang boleh tampil publik (mis. paragraf pembuka bab 1)." />
          <FileField label={t === 'ebook' ? 'File e-book (PDF/ePub, ≤50 MB)' : 'Paket file kit (ZIP/PDF, ≤50 MB)'} accept={t === 'ebook' ? 'application/pdf,application/epub+zip,.epub' : 'application/zip,application/pdf,.zip'}
            path={file} error={err.file} busy={busy === 'file'} onPick={uploadFile} />
        </>}
        {t === 'kit' && <KitFiles value={ff.files ?? []} onChange={(v) => setFF('files', v)} error={err.files} />}

        {SESSION(t) && <>
          <Select label="Zona waktu" value={tz} onChange={(v) => setFF('timezone', v)} options={TIMEZONES.map(([v, l]) => [v, l] as [string, string])} hint="Jam di bawah diisi dalam zona waktu ini. EDU menampilkan dalam WIB." />
          {t === 'webinar' && <>
            <Text label="Tanggal & jam" type="datetime-local" value={toTzInput(f.schedule_at, tz)} onChange={(v) => set('schedule_at', fromTzInput(v, tz))} error={err.schedule_at} />
            <Text label="Durasi" value={f.duration} onChange={(v) => set('duration', v)} error={err.duration} placeholder="mis. 90 menit" />
          </>}
          <Text label={t === 'workshop' ? 'Peserta maksimal' : 'Kapasitas'} type="number" min={1} value={f.capacity ?? ''} onChange={(v) => set('capacity', v ? Number(v) : null)} error={err.capacity} />
          <Text label="Tautan sesi Zoom/Meet (privat)" value={meet} onChange={setMeet} error={err.meet} wide hint="Hanya dikirim ke peserta yang aksesnya terverifikasi. Tidak tampil di halaman publik." />
          <Area label={t === 'workshop' ? 'Bio fasilitator (opsional)' : 'Bio pembicara'} value={ff.speaker_bio ?? ''} onChange={(v) => setFF('speaker_bio', v)} error={err.speaker_bio} rows={3} />
          <Pairs label={t === 'workshop' ? 'Agenda latihan' : 'Agenda'} a="Butir" b="Durasi" rows={(ff.agenda ?? []).map((x) => [x.item, x.dur])} error={err.agenda}
            onChange={(r) => setFF('agenda', r.map(([item, dur]) => ({ item, dur })))} />
        </>}
        {t === 'webinar' && <>
          <Pairs label="FAQ" a="Pertanyaan" b="Jawaban" rows={(ff.faq ?? []).map((x) => [x.q, x.a])} error={err.faq} onChange={(r) => setFF('faq', r.map(([q, a]) => ({ q, a })))} />
          <Text label="Tenggat summary sesi" value={ff.summary_due ?? ''} onChange={(v) => setFF('summary_due', v)} error={err.summary_due} placeholder="mis. H+2 setelah sesi" />
        </>}
        {t === 'workshop' && <>
          <Sessions tz={tz} value={ff.sessions ?? []} onChange={(v) => setFF('sessions', v)} error={err.sessions} />
          <Area label="Resources" value={ff.resources ?? ''} onChange={(v) => setFF('resources', v)} error={err.resources} rows={2} />
          <Area label="Tugas / assignment" value={ff.assignment ?? ''} onChange={(v) => setFF('assignment', v)} error={err.assignment} rows={2} />
          <Area label="Output latihan" value={ff.output ?? ''} onChange={(v) => setFF('output', v)} error={err.output} rows={2} />
        </>}

        <Text label="Kontak dukungan peserta" value={f.support_contact} onChange={(v) => set('support_contact', v)} placeholder="mis. email kontributor" />
        {f.pricing === 'paid' && <Area label="Ketentuan refund & reschedule" value={f.refund_terms} onChange={(v) => set('refund_terms', v)} error={err.refund} rows={3} hint="Tidak boleh “non-refundable semua”. Final copy ditinjau tim hukum." />}
        <Text label="Nama publik fasilitator/penulis" value={f.public_name} onChange={(v) => set('public_name', v)} error={err.name} hint="Kosongkan bila belum ingin nama Anda tampil di EDU." />
        {f.public_name && <div className="st-field st-field--wide"><Check label="Saya menyetujui nama ini ditampilkan di halaman program EDU." checked={nameOk} onChange={setNameOk} /></div>}
        <div className="st-field st-field--wide"><span className="st-small st-muted">Penerimaan token reward: belum tersedia (penukaran token OFF sampai ada persetujuan Legal & Finance).</span></div>
        <div className="st-field st-field--wide">
          <Check label="Saya pemilik atau pemegang hak materi ini dan mengizinkan VIBOXS EDU mempromosikannya." hint={err.rights || 'Pernyataan tercatat bersama versi draft.'} checked={f.rights_declared} onChange={(v) => set('rights_declared', v)} />
        </div>
        {err.type && <div className="st-alert st-alert--warn st-field--wide">{err.type}</div>}
        {!readOnly && <div className="st-form__act"><Btn onClick={() => save(false)} busy={busy === 'save'}>Simpan draft</Btn><Btn kind="primary" onClick={() => save(true)} busy={busy === 'sub'} disabled={t === 'ecourse'}>Ajukan review</Btn></div>}
      </fieldset>
    </Card>
  );
}

/** Unggah cover: decode di browser (file bukan gambar → gagal), potong sesuai rasio dengan titik fokus, encode ulang WebP. */
function CoverField({ draftId, ensureId, ratio, path, onChange, label, error, disabled }:
  { draftId: string | null; ensureId: () => Promise<string>; ratio: '4:5' | '16:9'; path: string | null; onChange: (p: string) => void; label: string; error?: string; disabled?: boolean }) {
  const toast = useToast();
  const [src, setSrc] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [fx, setFx] = useState(50), [fy, setFy] = useState(50);
  const [saved, setSaved] = useState<string | null>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const { busy, run } = useAction();
  const [w, h] = ratio === '4:5' ? [1200, 1500] : [1600, 900];
  useEffect(() => {
    if (!path || !draftId) { setSaved(null); return; }
    sb.storage.from('st-program-media').createSignedUrl(path, 600).then(({ data }) => setSaved(data?.signedUrl ?? null));
  }, [path, draftId]);
  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);
  // gambar potongan
  useEffect(() => {
    const c = cv.current; if (!c || !img) return;
    const s = Math.min(img.naturalWidth / w, img.naturalHeight / h);
    const cw = w * s, ch = h * s;
    const sx = Math.max(0, Math.min(img.naturalWidth - cw, (img.naturalWidth * fx) / 100 - cw / 2));
    const sy = Math.max(0, Math.min(img.naturalHeight - ch, (img.naturalHeight * fy) / 100 - ch / 2));
    c.width = w; c.height = h;
    c.getContext('2d')!.drawImage(img, sx, sy, cw, ch, 0, 0, w, h);
  }, [img, fx, fy, w, h]);
  const pick = async (fl: File | undefined) => {
    if (!fl) return;
    const k = await sniff(fl);
    if (k === 'svg') { toast('SVG belum didukung demi keamanan. Unggah PNG, JPG, atau WebP.', 'err'); return; }
    if (!k || !['png', 'jpeg', 'webp'].includes(k)) { toast('Format cover harus PNG, JPG, atau WebP.', 'err'); return; }
    if (fl.size > 10 * 1024 * 1024) { toast('Ukuran gambar maksimal 10 MB sebelum dipotong.', 'err'); return; }
    const u = URL.createObjectURL(fl);
    const im = new Image();
    im.onload = () => {
      if (im.naturalWidth < w / 2 || im.naturalHeight < h / 2) { toast(`Resolusi terlalu kecil — minimal ${w / 2}×${h / 2} px.`, 'err'); URL.revokeObjectURL(u); return; }
      setSrc(u); setImg(im); setFx(50); setFy(50);
    };
    im.onerror = () => { toast('File gambar rusak atau tidak bisa dibaca.', 'err'); URL.revokeObjectURL(u); };
    im.src = u;
  };
  const upload = () => run('up', async () => {
    const c = cv.current; if (!c || !img) throw new Error('Pilih gambar dulu.');
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/webp', 0.88));
    if (!blob) throw new Error('Gagal memproses gambar.');
    if (blob.size > 5 * 1024 * 1024) throw new Error('Hasil potongan melebihi 5 MB.');
    const did = await ensureId();
    const p = `drafts/${did}/cover-${Date.now()}.webp`;
    const { error: e } = await sb.storage.from('st-program-media').upload(p, blob, { contentType: 'image/webp', upsert: false });
    if (e) throw new Error(e.message);
    onChange(p); setImg(null); setSrc(null);
  }, () => toast('Cover tersimpan privat. Tayang publik hanya setelah disetujui Commander.'), (m) => toast(m, 'err'));
  return (
    <div className="st-field st-field--wide">
      <span className="st-label">{label}</span>
      <div className="st-cover">
        {img ? <canvas ref={cv} className="st-cover__img" style={{ aspectRatio: ratio.replace(':', ' / ') }} aria-label="Pratinjau potongan cover" />
          : saved ? <img src={saved} alt="" className="st-cover__img" style={{ aspectRatio: ratio.replace(':', ' / ') }} />
            : <div className="st-cover__img st-cover__empty" style={{ aspectRatio: ratio.replace(':', ' / ') }}><I.book size={20} />Belum ada {ratio === '4:5' ? 'cover' : 'poster'}</div>}
        <div className="st-stack">
          <input type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} aria-label={`Pilih file ${label}`} />
          {img && <>
            <label className="st-small">Titik fokus horizontal <input type="range" min={0} max={100} value={fx} onChange={(e) => setFx(Number(e.target.value))} /></label>
            <label className="st-small">Titik fokus vertikal <input type="range" min={0} max={100} value={fy} onChange={(e) => setFy(Number(e.target.value))} /></label>
            <Btn size="sm" kind="primary" onClick={upload} busy={busy === 'up'}>Simpan potongan {ratio}</Btn>
          </>}
          <small className="st-muted">PNG/JPG/WebP. Dipotong ke {ratio} ({w}×{h}), metadata foto (mis. lokasi) dihapus. SVG tidak didukung.</small>
          {error && <small className="st-ferr">{error}</small>}
        </div>
      </div>
    </div>
  );
}

function FileField({ label, accept, path, error, busy, onPick }: { label: string; accept: string; path: string | null; error?: string; busy: boolean; onPick: (f: File) => void }) {
  return (
    <div className="st-field st-field--wide">
      <label className="st-label" htmlFor="pf-file">{label}</label>
      <input id="pf-file" type="file" accept={accept} disabled={busy} onChange={(e) => { const x = e.target.files?.[0]; if (x) onPick(x); e.target.value = ''; }} />
      <small className="st-muted">{busy ? 'Mengunggah…' : path ? `Tersimpan privat: ${path.split('/').pop()}` : 'Belum ada file. Disimpan privat; pembeli mendapat tautan unduh sementara.'}</small>
      {error && <small className="st-ferr">{error}</small>}
    </div>
  );
}

function Pairs({ label, a, b, rows, onChange, error }: { label: string; a: string; b: string; rows: [string, string][]; onChange: (r: [string, string][]) => void; error?: string }) {
  const up = (i: number, j: 0 | 1, v: string) => onChange(rows.map((r, k) => (k === i ? (j === 0 ? [v, r[1]] : [r[0], v]) : r)));
  return (
    <fieldset className="st-field st-field--wide st-rows">
      <legend className="st-label">{label}</legend>
      {rows.map((r, i) => (
        <div key={i} className="st-rows__row">
          <input aria-label={`${a} ${i + 1}`} placeholder={a} value={r[0]} onChange={(e) => up(i, 0, e.target.value)} />
          <input aria-label={`${b} ${i + 1}`} placeholder={b} value={r[1]} onChange={(e) => up(i, 1, e.target.value)} />
          <Btn size="sm" kind="quiet" onClick={() => onChange(rows.filter((_, k) => k !== i))} aria-label={`Hapus baris ${i + 1}`}><I.x size={14} /></Btn>
        </div>
      ))}
      <Btn size="sm" onClick={() => onChange([...rows, ['', '']])}><I.plus size={14} />Tambah</Btn>
      {error && <small className="st-ferr">{error}</small>}
    </fieldset>
  );
}

function Sessions({ tz, value, onChange, error }: { tz: string; value: { starts_at: string; dur: string }[]; onChange: (v: { starts_at: string; dur: string }[]) => void; error?: string }) {
  const up = (i: number, p: Partial<{ starts_at: string; dur: string }>) => onChange(value.map((x, k) => (k === i ? { ...x, ...p } : x)));
  return (
    <fieldset className="st-field st-field--wide st-rows">
      <legend className="st-label">Sesi workshop</legend>
      {value.map((x, i) => (
        <div key={i} className="st-rows__row">
          <input type="datetime-local" aria-label={`Mulai sesi ${i + 1}`} value={toTzInput(x.starts_at, tz)} onChange={(e) => up(i, { starts_at: fromTzInput(e.target.value, tz) ?? '' })} />
          <input aria-label={`Durasi sesi ${i + 1}`} placeholder="Durasi, mis. 2 jam" value={x.dur} onChange={(e) => up(i, { dur: e.target.value })} />
          <Btn size="sm" kind="quiet" onClick={() => onChange(value.filter((_, k) => k !== i))} aria-label={`Hapus sesi ${i + 1}`}><I.x size={14} /></Btn>
        </div>
      ))}
      <Btn size="sm" onClick={() => onChange([...value, { starts_at: '', dur: '' }])}><I.plus size={14} />Tambah sesi</Btn>
      {error && <small className="st-ferr">{error}</small>}
    </fieldset>
  );
}

function KitFiles({ value, onChange, error }: { value: { name: string; toc: string[]; license: string }[]; onChange: (v: { name: string; toc: string[]; license: string }[]) => void; error?: string }) {
  const up = (i: number, p: Partial<{ name: string; toc: string[]; license: string }>) => onChange(value.map((x, k) => (k === i ? { ...x, ...p } : x)));
  return (
    <fieldset className="st-field st-field--wide st-rows">
      <legend className="st-label">Isi paket kit</legend>
      {value.map((x, i) => (
        <div key={`${i}-${value.length}`} className="st-rows__row st-rows__row--3">
          <input aria-label={`Nama file ${i + 1}`} placeholder="Nama file" value={x.name} onChange={(e) => up(i, { name: e.target.value })} />
          <input aria-label={`Daftar isi file ${i + 1}`} placeholder="Daftar isi (pisahkan koma)" defaultValue={x.toc.join(', ')}
            onBlur={(e) => up(i, { toc: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
          <input aria-label={`Lisensi file ${i + 1}`} placeholder="Lisensi" value={x.license} onChange={(e) => up(i, { license: e.target.value })} />
          <Btn size="sm" kind="quiet" onClick={() => onChange(value.filter((_, k) => k !== i))} aria-label={`Hapus file ${i + 1}`}><I.x size={14} /></Btn>
        </div>
      ))}
      <Btn size="sm" onClick={() => onChange([...value, { name: '', toc: [], license: '' }])}><I.plus size={14} />Tambah file</Btn>
      {error && <small className="st-ferr">{error}</small>}
    </fieldset>
  );
}
