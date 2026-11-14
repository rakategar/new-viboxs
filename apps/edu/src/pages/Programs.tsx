import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { IconSearch } from '@viboxs/shared/icons';
import { useMotion } from '@viboxs/shared/motion';
import ProgramCard from '../components/ProgramCard';
import NotifyForm from '../components/NotifyForm';
import { CATALOG_FILLED, PATHS, PROGRAMS, byDate } from '../lib/data';

type Key = 'format' | 'path' | 'price' | 'time';
const DEF: Record<Key, string> = { format: 'all', path: 'all', price: 'all', time: 'upcoming' };
const GROUPS: { key: Key; name: string; chips: [string, string][] }[] = [
  { key: 'format', name: 'Format', chips: [['all', 'Semua'], ['ebook', 'E-book'], ['webinar', 'Webinar'], ['workshop', 'Workshop']] },
  { key: 'path', name: 'Topik', chips: [['all', 'Semua'], ...PATHS.map((p) => [p.id, p.name] as [string, string])] },
  { key: 'price', name: 'Biaya', chips: [['all', 'Semua'], ['free', 'Gratis'], ['paid', 'Berbayar']] },
  { key: 'time', name: 'Waktu', chips: [['upcoming', 'Mendatang'], ['past', 'Sudah lewat'], ['all', 'Semua']] },
];

export default function Programs() {
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref);
  const [sp, setSp] = useSearchParams();
  const get = (k: Key) => sp.get(k) || DEF[k];
  const q = sp.get('q') || '';
  const sort = sp.get('sort') || 'upcoming';
  const [qInput, setQInput] = useState(q);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setQInput(q); }, [q]);

  // debounce pencarian → URL (bisa dibagikan & tombol back bekerja)
  useEffect(() => {
    if (qInput === q) return;
    setLoading(true);
    const t = window.setTimeout(() => { set({ q: qInput.trim() }); setLoading(false); }, 280);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput]);

  function set(patch: Record<string, string>) {
    const n = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) {
      if (!v || v === (DEF as Record<string, string>)[k] || (k === 'sort' && v === 'upcoming')) n.delete(k); else n.set(k, v);
    }
    setSp(n, { replace: true });
  }
  const resetAll = () => { setQInput(''); setSp(new URLSearchParams(), { replace: true }); };

  const results = useMemo(() => {
    let L = PROGRAMS.slice();
    const s = q.trim().toLowerCase();
    if (s) L = L.filter((p) => `${p.title} ${p.summary} ${p.tags.join(' ')}`.toLowerCase().includes(s));
    if (get('format') !== 'all') L = L.filter((p) => p.type === get('format'));
    if (get('path') !== 'all') L = L.filter((p) => p.path === get('path'));
    if (get('price') === 'free') L = L.filter((p) => p.free); else if (get('price') === 'paid') L = L.filter((p) => !p.free);
    if (get('time') === 'upcoming') L = L.filter((p) => !p.past); else if (get('time') === 'past') L = L.filter((p) => p.past);
    return L.sort(sort === 'new' ? (a, b) => b.added - a.added : byDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  const active = (['format', 'path', 'price'] as Key[]).filter((k) => get(k) !== 'all').length + (get('time') !== 'upcoming' ? 1 : 0) + (q ? 1 : 0);
  const msg = !CATALOG_FILLED ? 'Belum ada program yang dipublikasikan.' : loading ? 'Memuat program…' : `${results.length} program ditemukan${q ? ` untuk “${q}”` : ''}`;

  return (
    <div ref={ref}>
      <section className="page-top">
        <div className="container stack-24">
          <nav aria-label="Breadcrumb" className="crumbs"><Link to="/">EDU</Link><span>/</span><span aria-current="page">Programs</span></nav>
          <h1 className="h1-sm">Katalog program</h1>
          <form role="search" className="bigsearch" onSubmit={(e) => { e.preventDefault(); set({ q: qInput.trim() }); }}>
            <label htmlFor="cat-q" className="xs-13 strong muted">Cari judul, ringkasan, atau topik</label>
            <div className="bigsearch__field">
              <IconSearch size={20} />
              <input id="cat-q" type="search" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="mis. prompt, SOP, komunikasi" />
              {loading && <span className="spin-sm" aria-hidden="true" />}
              {qInput && <button type="button" className="bigsearch__clear" aria-label="Hapus pencarian" onClick={() => { setQInput(''); set({ q: '' }); }}>×</button>}
            </div>
          </form>
        </div>
      </section>
      <div className="light pad-page">
        <div className="container catalog">
          <aside aria-label="Filter" className="filters">
            <div className="row-between"><span className="strong">Filter</span><button type="button" className="chip-btn" onClick={resetAll}>Reset semua{active > 0 && ` (${active})`}</button></div>
            {GROUPS.map((g) => (
              <fieldset key={g.key} className="filters__g">
                <legend>{g.name}</legend>
                <div className="row-8">
                  {g.chips.map(([v, l]) => (
                    <button key={v} type="button" className={`chip ${get(g.key) === v ? 'is-on' : ''}`} aria-pressed={get(g.key) === v} onClick={() => set({ [g.key]: v })}>{l}</button>
                  ))}
                </div>
              </fieldset>
            ))}
          </aside>
          <div className="catalog__main">
            <div className="catalog__bar">
              <p role="status" aria-live="polite" className="strong">{msg}</p>
              <label className="sort">Urutkan
                <select value={sort} onChange={(e) => set({ sort: e.target.value })}><option value="upcoming">Jadwal terdekat</option><option value="new">Terbaru</option></select>
              </label>
            </div>
            {!CATALOG_FILLED ? (
              <div className="empty-box maxw-720">
                <span className="h4">Belum ada program yang dipublikasikan.</span>
                <span className="body ink-muted">Program tampil di sini setelah materi, jadwal, harga, dan ketentuannya pasti.</span>
                <NotifyForm label="Email untuk pemberitahuan" consent="Saya setuju menerima email pemberitahuan program EDU." />
              </div>
            ) : loading ? (
              <div className="card-grid" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skel"><i /><i /><i /><i /></div>)}</div>
            ) : results.length === 0 ? (
              <div className="empty-box">
                <span className="h4">Belum ada program dengan filter ini.</span>
                <span className="body ink-muted">Coba kata kunci lain atau hapus beberapa filter.</span>
                <button type="button" className="btn btn--ink btn--sm self-start" onClick={resetAll}>Hapus semua filter</button>
              </div>
            ) : (
              <div className="card-grid card-grid--anim" key={sp.toString()}>{results.map((p) => <ProgramCard key={p.slug} p={p} />)}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
