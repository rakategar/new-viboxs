import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_FAQ, DEFAULT_PATHS, type Faq, type Path } from '../lib/data';
import { getContent, setContent } from './sb';
import { Area, Card, I, PageHead, StringList, Text, move, useToast } from './ui';

const GROUPS = ['Pendaftaran', 'Pembayaran', 'Akses', 'Perubahan'];

export default function ContentEditor() {
  const toast = useToast();
  const [paths, setPaths] = useState<Path[] | null>(null);
  const [faq, setFaq] = useState<Faq[]>([]);
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([getContent<Path[]>('paths'), getContent<Faq[]>('faq')]).then(([p, f]) => {
      const pp = p?.length ? p : structuredClone(DEFAULT_PATHS), ff = f?.length ? f : structuredClone(DEFAULT_FAQ);
      setPaths(pp); setFaq(ff); setSaved(JSON.stringify([pp, ff]));
    }).catch((e) => toast((e as Error).message, 'err'));
  }, [toast]);
  const dirty = useMemo(() => !!paths && JSON.stringify([paths, faq]) !== saved, [paths, faq, saved]);

  if (!paths) return <div className="adm-page"><div className="adm-skel" /></div>;

  async function save() {
    const ids = paths!.map((p) => p.id.trim());
    if (ids.some((x) => !/^[a-z0-9-]+$/.test(x)) || new Set(ids).size !== ids.length) { toast('ID jalur harus unik, huruf kecil/angka/strip.', 'err'); return; }
    setBusy(true);
    try {
      const pp = paths!.map((p, i) => ({ ...p, n: String(i + 1).padStart(2, '0') }));
      const ff = faq.filter((f) => f.q.trim() && f.a.trim());
      await Promise.all([setContent('paths', pp), setContent('faq', ff)]);
      setPaths(pp); setFaq(ff); setSaved(JSON.stringify([pp, ff]));
      toast('Jalur belajar & FAQ tersimpan.');
    } catch (e) { toast(`Gagal menyimpan: ${(e as Error).message}`, 'err'); }
    setBusy(false);
  }
  const upP = (i: number, patch: Partial<Path>) => setPaths(paths.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const upF = (i: number, patch: Partial<Faq>) => setFaq(faq.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  return (
    <div className="adm-page">
      <PageHead title="Jalur belajar & FAQ" desc="Jalur belajar tampil di beranda & filter katalog. FAQ tampil di /help, halaman program, dan 3 teratas di beranda.">
        <button type="button" className="adm-btn adm-btn--primary" disabled={!dirty || busy} onClick={save}>{busy ? 'Menyimpan…' : dirty ? 'Simpan perubahan' : 'Tersimpan'}</button>
      </PageHead>
      <div className="adm-stack">
        <Card title="Jalur belajar" desc="Disarankan 3 jalur. ID dipakai di URL filter (/programs?path=ID) dan di data program — hati-hati mengubahnya.">
          <div className="adm-cards">
            {paths.map((p, i) => (
              <div key={i} className="adm-sub">
                <div className="adm-sub__head"><b>{String(i + 1).padStart(2, '0')} · {p.name || 'Jalur baru'}</b>
                  <span className="adm-slist__act">
                    <button type="button" className="adm-icon" disabled={i === 0} onClick={() => setPaths(move(paths, i, -1))} aria-label="Naikkan"><I.up size={15} /></button>
                    <button type="button" className="adm-icon" disabled={i === paths.length - 1} onClick={() => setPaths(move(paths, i, 1))} aria-label="Turunkan"><I.down size={15} /></button>
                    <button type="button" className="adm-icon adm-icon--danger" onClick={() => setPaths(paths.filter((_, j) => j !== i))} aria-label="Hapus"><I.trash size={15} /></button>
                  </span>
                </div>
                <div className="adm-form">
                  <Text label="Nama" value={p.name} onChange={(v) => upP(i, { name: v })} />
                  <Text label="ID" value={p.id} onChange={(v) => upP(i, { id: v.toLowerCase() })} />
                  <Area label="Deskripsi" rows={2} value={p.desc} onChange={(v) => upP(i, { desc: v })} />
                  <StringList label="Topik" items={p.topics} onChange={(v) => upP(i, { topics: v })} />
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setPaths([...paths, { id: `jalur-${paths.length + 1}`, n: '', name: '', desc: '', topics: [] }])}><I.plus size={15} />Tambah jalur</button>
        </Card>

        <Card title="FAQ" desc={`${faq.length} pertanyaan. Urutan di sini = urutan di situs.`}>
          <ol className="adm-faq">
            {faq.map((f, i) => (
              <li key={i} className={open === i ? 'is-open' : ''}>
                <div className="adm-faq__row">
                  <button type="button" className="adm-faq__q" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                    <span className="adm-pill">{f.g}</span><span>{f.q || 'Pertanyaan baru'}</span>
                  </button>
                  <span className="adm-slist__act">
                    <button type="button" className="adm-icon" disabled={i === 0} onClick={() => setFaq(move(faq, i, -1))} aria-label="Naikkan"><I.up size={15} /></button>
                    <button type="button" className="adm-icon" disabled={i === faq.length - 1} onClick={() => setFaq(move(faq, i, 1))} aria-label="Turunkan"><I.down size={15} /></button>
                    <button type="button" className="adm-icon adm-icon--danger" onClick={() => setFaq(faq.filter((_, j) => j !== i))} aria-label="Hapus"><I.trash size={15} /></button>
                  </span>
                </div>
                {open === i && (
                  <div className="adm-form">
                    <div className="adm-field"><label htmlFor={`fg-${i}`}>Kategori</label><select id={`fg-${i}`} value={f.g} onChange={(e) => upF(i, { g: e.target.value })}>{GROUPS.map((g) => <option key={g}>{g}</option>)}</select></div>
                    <Text wide label="Pertanyaan" value={f.q} onChange={(v) => upF(i, { q: v })} />
                    <Area label="Jawaban" rows={3} value={f.a} onChange={(v) => upF(i, { a: v })} />
                  </div>
                )}
              </li>
            ))}
          </ol>
          <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => { setFaq([...faq, { g: GROUPS[0], q: '', a: '' }]); setOpen(faq.length); }}><I.plus size={15} />Tambah FAQ</button>
        </Card>
      </div>
    </div>
  );
}
