import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_PROGRAMS, PATHS, STATUS, TYPE, priceOf, type ProgType, type Program, type StatusCode } from '../lib/data';
import { getContent, sb, setContent, type ProgramRow } from './sb';
import { Area, Card, Empty, I, PageHead, Select, StringList, Text, Toggle, ago, useToast } from './ui';
import type { HomeContent } from '../lib/data';

const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
const BLANK: Program = { slug: '', type: 'webinar', path: 'ai', title: '', summary: '', forWho: '', level: 'Pemula', status: 'ANNOUNCED', free: true, sortDate: '', added: 0, tags: [], mode: 'Online', loc: 'Zoom — link dikirim lewat email', cap: '[Kapasitas]', dur: '90 menit' };
const STATUS_OPTS = (t: ProgType) => (Object.keys(STATUS) as StatusCode[]).filter((k) => (t === 'ebook' ? ['AVAILABLE', 'ANNOUNCED', 'CLOSED'].includes(k) : k !== 'AVAILABLE')).map((k) => [k, STATUS[k].label] as [StatusCode, string]);
const ID_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const ID_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** Dari tanggal ISO (yyyy-mm-dd) → field tampilan program (hari, tanggal panjang, dShort, mShort). */
function fromIso(iso: string): Partial<Program> {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return { sortDate: iso };
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return { sortDate: iso, day: ID_DAYS[d.getDay()], date: `${d.getDate()} ${ID_MONTHS[d.getMonth()]} ${d.getFullYear()}`, dShort: String(d.getDate()).padStart(2, '0'), mShort: ID_MONTHS[d.getMonth()].slice(0, 3).toUpperCase() };
}

export default function Programs() {
  const toast = useToast();
  const [sp, setSp] = useSearchParams();
  const [rows, setRows] = useState<ProgramRow[] | null>(null);
  const [featured, setFeatured] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [ft, setFt] = useState<'all' | ProgType>('all');
  const [edit, setEdit] = useState<{ p: Program; published: boolean; isNew: boolean; orig?: string } | null>(null);

  const load = useCallback(async () => {
    const [{ data, error }, home] = await Promise.all([sb.from('edu_programs').select('*').order('position'), getContent<Partial<HomeContent>>('home')]);
    if (error) { toast(error.message, 'err'); return; }
    setRows(data as ProgramRow[]);
    setFeatured(home?.featured?.slugs ?? []);
  }, [toast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (sp.get('baru')) { setEdit({ p: structuredClone(BLANK), published: false, isNew: true }); setSp({}, { replace: true }); } }, [sp, setSp]);

  const list = useMemo(() => (rows ?? []).filter((r) => (ft === 'all' || r.data.type === ft) && (!q || `${r.data.title} ${r.slug} ${r.data.tags?.join(' ')}`.toLowerCase().includes(q.toLowerCase()))), [rows, ft, q]);

  async function seed() {
    const payload = DEFAULT_PROGRAMS.map((p, i) => ({ slug: p.slug, data: p, published: true, position: i }));
    const { error } = await sb.from('edu_programs').upsert(payload);
    if (error) toast(error.message, 'err'); else { toast(`${payload.length} program bawaan diimpor.`); load(); }
  }
  async function togglePub(r: ProgramRow) {
    const { error } = await sb.from('edu_programs').update({ published: !r.published }).eq('slug', r.slug);
    if (error) toast(error.message, 'err'); else { toast(r.published ? 'Disembunyikan dari situs.' : 'Ditayangkan di situs.'); load(); }
  }
  async function toggleFeat(slug: string) {
    const home = (await getContent<Partial<HomeContent>>('home')) ?? {};
    const cur = home.featured?.slugs ?? featured;
    const slugs = cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug];
    try {
      await setContent('home', { ...home, featured: { eyebrow: 'Program pilihan', title: 'Yang bisa kamu ikuti sekarang.', ...home.featured, slugs } });
      setFeatured(slugs); toast(cur.includes(slug) ? 'Dilepas dari program pilihan.' : 'Ditambahkan ke program pilihan beranda.');
    } catch (e) { toast((e as Error).message, 'err'); }
  }
  async function reorder(i: number, d: number) {
    if (!rows) return;
    const all = [...rows];
    const a = list[i], b = list[i + d];
    if (!a || !b) return;
    const ia = all.indexOf(a), ib = all.indexOf(b);
    [all[ia], all[ib]] = [all[ib], all[ia]];
    setRows(all);
    const { error } = await sb.from('edu_programs').upsert(all.map((r, k) => ({ slug: r.slug, data: r.data, published: r.published, position: k })));
    if (error) { toast(error.message, 'err'); load(); }
  }
  async function remove(r: ProgramRow) {
    if (!confirm(`Hapus “${r.data.title}” permanen? Tindakan ini tidak bisa dibatalkan. (Pilih “Sembunyikan” bila hanya ingin menurunkan dari situs.)`)) return;
    const { error } = await sb.from('edu_programs').delete().eq('slug', r.slug);
    if (error) toast(error.message, 'err'); else { toast('Program dihapus.'); load(); }
  }
  const duplicate = (r: ProgramRow) => setEdit({ p: { ...structuredClone(r.data), slug: `${r.slug}-salinan`, title: `${r.data.title} (salinan)` }, published: false, isNew: true });

  async function save() {
    if (!edit) return;
    const p = { ...edit.p, slug: slugify(edit.p.slug || edit.p.title) };
    if (!p.title.trim() || !p.slug) { toast('Judul dan slug wajib diisi.', 'err'); return; }
    if (edit.isNew && rows?.some((r) => r.slug === p.slug)) { toast('Slug sudah dipakai program lain.', 'err'); return; }
    // bersihkan nilai kosong agar data rapi
    const clean = Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v !== undefined && !(Array.isArray(v) && v.length === 0))) as unknown as Program;
    const position = edit.isNew ? (rows?.length ?? 0) : rows?.find((r) => r.slug === edit.orig)?.position ?? 0;
    if (!edit.isNew && edit.orig && edit.orig !== p.slug) {
      const { error } = await sb.from('edu_programs').delete().eq('slug', edit.orig);
      if (error) { toast(error.message, 'err'); return; }
    }
    const { error } = await sb.from('edu_programs').upsert({ slug: p.slug, data: clean, published: edit.published, position });
    if (error) { toast(error.message, 'err'); return; }
    toast(edit.isNew ? 'Program dibuat.' : 'Perubahan program tersimpan.');
    setEdit(null); load();
  }

  if (edit) return <Editor edit={edit} setEdit={setEdit} onSave={save} />;

  return (
    <div className="adm-page">
      <PageHead title="Program & e-book" desc="Katalog yang tampil di /programs, /events, /library, dan beranda.">
        <button type="button" className="adm-btn adm-btn--primary" onClick={() => setEdit({ p: structuredClone(BLANK), published: false, isNew: true })}><I.plus size={16} />Program baru</button>
      </PageHead>
      {rows === null ? <div className="adm-skel" /> : rows.length === 0 ? (
        <Card title="Katalog masih kosong di database">
          <Empty title="Situs saat ini memakai data bawaan.">
            Impor {DEFAULT_PROGRAMS.length} program bawaan (berlabel contoh) agar bisa diedit dari dashboard, atau buat program baru dari nol.
            <div className="adm-quick"><button type="button" className="adm-btn adm-btn--primary adm-btn--sm" onClick={seed}>Impor katalog bawaan</button></div>
          </Empty>
        </Card>
      ) : (
        <>
          <div className="adm-filters">
            <div className="adm-search"><I.search size={16} /><input placeholder="Cari judul, slug, tag…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari program" /></div>
            <div className="adm-seg" role="group" aria-label="Filter tipe">
              {([['all', 'Semua'], ['webinar', 'Webinar'], ['workshop', 'Workshop'], ['ebook', 'E-book']] as const).map(([k, l]) => (
                <button key={k} type="button" aria-pressed={ft === k} className={ft === k ? 'is-on' : ''} onClick={() => setFt(k)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Program</th><th>Status</th><th>Jadwal / format</th><th>Harga</th><th>Tayang</th><th><span className="sr-only">Aksi</span></th></tr></thead>
              <tbody>
                {list.map((r, i) => (
                  <tr key={r.slug} className={r.published ? '' : 'is-muted'}>
                    <td>
                      <button type="button" className="adm-tlink" onClick={() => setEdit({ p: structuredClone(r.data), published: r.published, isNew: false, orig: r.slug })}>{r.data.title}</button>
                      <span className="adm-muted adm-small">{TYPE[r.data.type]} · /{r.slug} · diubah {ago(r.updated_at)}</span>
                    </td>
                    <td><span className={`adm-pill adm-pill--${STATUS[r.data.status]?.tone}`}>{STATUS[r.data.status]?.label ?? r.data.status}</span></td>
                    <td className="adm-small">{r.data.type === 'ebook' ? r.data.fileFmt || 'E-book' : `${r.data.day ? `${r.data.day}, ` : ''}${r.data.date || '—'}`}</td>
                    <td className="adm-small">{priceOf(r.data)}</td>
                    <td>
                      <button type="button" className={`adm-icon ${r.published ? 'is-on' : ''}`} onClick={() => togglePub(r)} aria-label={r.published ? 'Sembunyikan' : 'Tayangkan'} title={r.published ? 'Tayang — klik untuk sembunyikan' : 'Tersembunyi — klik untuk tayangkan'}>{r.published ? <I.eye size={16} /> : <I.eyeOff size={16} />}</button>
                      <button type="button" className={`adm-icon ${featured.includes(r.slug) ? 'is-star' : ''}`} onClick={() => toggleFeat(r.slug)} aria-label="Program pilihan beranda" title={featured.includes(r.slug) ? 'Di program pilihan beranda' : 'Tambahkan ke program pilihan beranda'}><I.star size={16} /></button>
                    </td>
                    <td className="adm-row-act">
                      <button type="button" className="adm-icon" disabled={i === 0 || ft !== 'all' || !!q} onClick={() => reorder(i, -1)} aria-label="Naikkan"><I.up size={15} /></button>
                      <button type="button" className="adm-icon" disabled={i === list.length - 1 || ft !== 'all' || !!q} onClick={() => reorder(i, 1)} aria-label="Turunkan"><I.down size={15} /></button>
                      <button type="button" className="adm-icon" onClick={() => setEdit({ p: structuredClone(r.data), published: r.published, isNew: false, orig: r.slug })} aria-label="Edit"><I.edit size={15} /></button>
                      <button type="button" className="adm-icon" onClick={() => duplicate(r)} aria-label="Duplikat"><I.copy size={15} /></button>
                      <button type="button" className="adm-icon adm-icon--danger" onClick={() => remove(r)} aria-label="Hapus"><I.trash size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && <Empty title="Tidak ada yang cocok dengan filter." />}
          </div>
          <p className="adm-hint">Urutan di tabel = urutan di katalog. Ikon mata = tayang/tersembunyi; bintang = tampil di “Program pilihan” beranda. Harga mengikuti aturan PRICE HOLD: hanya “Gratis” atau “[Harga]”.</p>
        </>
      )}
    </div>
  );
}

/* ---------------- editor program ---------------- */
type EditState = { p: Program; published: boolean; isNew: boolean; orig?: string };
function Editor({ edit, setEdit, onSave }: { edit: EditState; setEdit: (e: EditState | null) => void; onSave: () => void }) {
  const p = edit.p;
  const set = (patch: Partial<Program>) => setEdit({ ...edit, p: { ...p, ...patch } });
  const ebook = p.type === 'ebook';
  const [busy, setBusy] = useState(false);
  const agendaTxt = (p.agenda ?? []).map(([a, b]) => `${a} | ${b}`).join('\n');

  return (
    <div className="adm-page">
      <PageHead title={edit.isNew ? 'Program baru' : `Edit: ${p.title || 'tanpa judul'}`} desc={edit.isNew ? 'Isi detail lalu simpan. Program baru tersembunyi sampai kamu menayangkannya.' : `/${edit.orig}`}>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setEdit(null)}>Batal</button>
        <button type="button" className="adm-btn adm-btn--primary" disabled={busy} onClick={async () => { setBusy(true); await onSave(); setBusy(false); }}>{busy ? 'Menyimpan…' : 'Simpan program'}</button>
      </PageHead>
      <div className="adm-stack">
        <Card title="Dasar">
          <div className="adm-form">
            <Text wide label="Judul" value={p.title} onChange={(v) => set({ title: v, ...(edit.isNew ? { slug: slugify(v) } : {}) })} />
            <Text label="Slug (alamat URL)" value={p.slug} onChange={(v) => set({ slug: v })} hint={`${ebook ? '/library/' : '/programs/'}${slugify(p.slug || p.title) || '…'}`} />
            <Select label="Tipe" value={p.type} onChange={(v) => set({ type: v, status: v === 'ebook' ? 'AVAILABLE' : p.status === 'AVAILABLE' ? 'OPEN' : p.status })} options={Object.entries(TYPE) as [ProgType, string][]} />
            <Select label="Jalur belajar" value={p.path} onChange={(v) => set({ path: v })} options={PATHS.map((x) => [x.id, x.name] as [string, string])} />
            <Select label="Status" value={p.status} onChange={(v) => set({ status: v })} options={STATUS_OPTS(p.type)} hint={STATUS[p.status]?.note} />
            <Area label="Ringkasan" value={p.summary} onChange={(v) => set({ summary: v })} hint="1–2 kalimat. Juga dipakai sebagai deskripsi SEO." />
            <Text label="Untuk siapa" value={p.forWho} onChange={(v) => set({ forWho: v })} />
            <Text label="Level" value={p.level} onChange={(v) => set({ level: v })} />
            <StringList label="Tag (untuk pencarian)" items={p.tags ?? []} onChange={(v) => set({ tags: v })} />
          </div>
          <div className="adm-toggles">
            <Toggle label="Tayang di situs" checked={edit.published} onChange={(v) => setEdit({ ...edit, published: v })} />
            <Toggle label="Gratis" checked={p.free} onChange={(v) => set({ free: v })} hint={p.free ? 'Ditampilkan “Gratis”.' : 'Ditampilkan “[Harga]” sampai harga disetujui (PRICE HOLD).'} />
            {!ebook && <Toggle label="Sesi sudah lewat (arsip)" checked={!!p.past} onChange={(v) => set({ past: v })} />}
          </div>
        </Card>

        {!ebook ? (
          <Card title="Jadwal & tempat" desc="Pilih tanggal — hari dan format tanggal Indonesia terisi otomatis.">
            <div className="adm-form">
              <Text label="Tanggal" type="date" value={/^\d{4}-\d{2}-\d{2}$/.test(p.sortDate) ? p.sortDate : ''} onChange={(v) => set(fromIso(v))} hint="Kosongkan bila belum pasti." />
              <Text label="Teks tanggal" value={p.date} onChange={(v) => set({ date: v })} hint="Contoh: 3 Desember 2026 / Tanggal menyusul" />
              <Text label="Jam" value={p.time} onChange={(v) => set({ time: v })} placeholder="19.00–20.30 WIB" />
              <Text label="Durasi" value={p.dur} onChange={(v) => set({ dur: v })} />
              <Text label="Mode" value={p.mode} onChange={(v) => set({ mode: v })} placeholder="Online / Offline" />
              <Text label="Lokasi / platform" value={p.loc} onChange={(v) => set({ loc: v })} />
              <Text label="Kapasitas" value={p.cap} onChange={(v) => set({ cap: v })} />
              {p.status === 'RESCHEDULED' && <Text label="Jadwal sebelumnya" value={p.prevDate} onChange={(v) => set({ prevDate: v })} />}
            </div>
          </Card>
        ) : (
          <Card title="Detail e-book">
            <div className="adm-form">
              <Text label="Format file" value={p.fileFmt} onChange={(v) => set({ fileFmt: v })} placeholder="PDF & EPUB" />
              <Text label="Bahasa" value={p.lang} onChange={(v) => set({ lang: v })} placeholder="Bahasa Indonesia" />
              <Text label="Versi" value={p.version} onChange={(v) => set({ version: v })} />
              <Text label="Jumlah halaman" value={p.pages} onChange={(v) => set({ pages: v })} />
              <Text wide label="Penulis" value={p.author} onChange={(v) => set({ author: v })} />
              <StringList label="Daftar isi" items={p.toc ?? []} onChange={(v) => set({ toc: v })} />
            </div>
          </Card>
        )}

        {!ebook && (
          <Card title="Materi" desc="Kosongkan untuk memakai teks standar webinar.">
            <div className="adm-form">
              <StringList label="Yang akan kamu kuasai" items={p.outcomes ?? []} onChange={(v) => set({ outcomes: v })} />
              <Area label="Agenda (satu baris per sesi: Materi | durasi)" rows={5} value={agendaTxt} onChange={(v) => set({ agenda: v.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((x) => x[0]).map((x) => [x[0], x[1] ?? ''] as [string, string]) })} />
              <StringList label="Yang kamu terima" items={p.receive ?? []} onChange={(v) => set({ receive: v })} />
              <Area label="Cara akses" rows={2} value={p.access} onChange={(v) => set({ access: v })} />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
