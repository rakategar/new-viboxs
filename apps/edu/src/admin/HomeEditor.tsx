import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_HOME, DEFAULT_STEPS, SECTION_LABEL, TYPE, type HomeContent, type SectionKey } from '../lib/data';
import { getContent, sb, setContent, type ProgramRow } from './sb';
import { Area, Card, I, PageHead, StringList, Text, Toggle, move, useToast } from './ui';

const merge = (v: Partial<HomeContent> | null): HomeContent => {
  const out = structuredClone(DEFAULT_HOME);
  if (!v) return out;
  for (const k of Object.keys(out) as (keyof HomeContent)[]) {
    const n = v[k];
    if (n == null) continue;
    (out as unknown as Record<string, unknown>)[k] = Array.isArray(out[k]) ? n : { ...(out[k] as object), ...(n as object) };
  }
  return out;
};

export default function HomeEditor() {
  const toast = useToast();
  const [home, setHome] = useState<HomeContent | null>(null);
  const [steps, setSteps] = useState<[string, string][]>([]);
  const [saved, setSaved] = useState('');
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [h, st, pr] = await Promise.all([getContent<Partial<HomeContent>>('home'), getContent<[string, string][]>('steps'), sb.from('edu_programs').select('*').order('position')]);
        const hh = merge(h), ss = st?.length ? st : structuredClone(DEFAULT_STEPS);
        setHome(hh); setSteps(ss); setSaved(JSON.stringify([hh, ss]));
        setPrograms((pr.data ?? []) as ProgramRow[]);
      } catch (e) { toast((e as Error).message, 'err'); }
    })();
  }, [toast]);

  const dirty = useMemo(() => !!home && JSON.stringify([home, steps]) !== saved, [home, steps, saved]);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  if (!home) return <div className="adm-page"><div className="adm-skel" /></div>;

  const up = <K extends keyof HomeContent>(k: K, patch: Partial<HomeContent[K]>) => setHome((h) => h && ({ ...h, [k]: Array.isArray(h[k]) ? patch : { ...(h[k] as object), ...patch } }));
  const sec = (k: SectionKey, v: boolean) => setHome((h) => h && ({ ...h, sections: { ...h.sections, [k]: v } }));

  async function save() {
    if (!home) return;
    setBusy(true);
    try {
      await Promise.all([setContent('home', home), setContent('steps', steps.filter(([t]) => t.trim()))]);
      setSaved(JSON.stringify([home, steps]));
      toast('Halaman utama tersimpan. Perubahan tampil saat situs dimuat ulang.');
    } catch (e) { toast(`Gagal menyimpan: ${(e as Error).message}`, 'err'); }
    setBusy(false);
  }

  const pub = programs.filter((p) => p.published);
  const featured = home.featured.slugs;
  const titleOf = (slug: string) => programs.find((p) => p.slug === slug)?.data.title ?? `${slug} (tidak ditemukan)`;

  return (
    <div className="adm-page">
      <PageHead title="Halaman utama" desc="Atur teks, urutan program pilihan, dan bagian yang tampil di beranda edu.viboxs.com.">
        <a href="/" target="_blank" rel="noopener noreferrer" className="adm-btn adm-btn--ghost"><I.eye size={16} />Pratinjau</a>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={() => { if (confirm('Kembalikan semua teks beranda ke bawaan? (belum tersimpan sampai kamu klik Simpan)')) { setHome(structuredClone(DEFAULT_HOME)); setSteps(structuredClone(DEFAULT_STEPS)); } }}>Kembalikan bawaan</button>
        <button type="button" className="adm-btn adm-btn--primary" disabled={!dirty || busy} onClick={save}>{busy ? 'Menyimpan…' : dirty ? 'Simpan perubahan' : 'Tersimpan'}</button>
      </PageHead>

      <div className="adm-editor">
        <nav className="adm-toc" aria-label="Bagian">
          {[['h-ann', 'Pengumuman'], ['h-sec', 'Tampilkan bagian'], ['h-hero', 'Hero'], ['h-mq', 'Marquee'], ['h-feat', 'Program pilihan'], ['h-txt', 'Judul bagian'], ['h-steps', 'Langkah daftar'], ['h-collab', 'Kolaborator'], ['h-close', 'Penutup']].map(([id, l]) => (
            <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{l}</a>
          ))}
        </nav>

        <div className="adm-stack">
          <Card id="h-ann" title="Pengumuman" desc="Bar tipis di atas hero — untuk info pendaftaran dibuka, promo, atau perubahan jadwal.">
            <Toggle label="Tampilkan pengumuman" checked={home.announcement.on} onChange={(v) => up('announcement', { on: v })} />
            <div className="adm-form">
              <Text wide label="Teks pengumuman" value={home.announcement.text} onChange={(v) => up('announcement', { text: v })} placeholder="Pendaftaran webinar Desember sudah dibuka." />
              <Text label="Link (opsional)" value={home.announcement.link} onChange={(v) => up('announcement', { link: v })} placeholder="/programs atau https://…" />
              <Text label="Label link" value={home.announcement.linkLabel} onChange={(v) => up('announcement', { linkLabel: v })} />
            </div>
          </Card>

          <Card id="h-sec" title="Tampilkan bagian" desc="Matikan bagian yang belum siap. Hero selalu tampil.">
            <div className="adm-toggles">
              {(Object.keys(SECTION_LABEL) as SectionKey[]).map((k) => <Toggle key={k} label={SECTION_LABEL[k]} checked={home.sections[k]} onChange={(v) => sec(k, v)} />)}
            </div>
          </Card>

          <Card id="h-hero" title="Hero" desc="Bagian pertama yang dilihat pengunjung.">
            <div className="adm-form">
              <Text wide label="Badge" value={home.hero.chip} onChange={(v) => up('hero', { chip: v })} />
              <Text wide label="Judul" value={home.hero.title} onChange={(v) => up('hero', { title: v })} />
              <Text label="Kata aksen (berwarna)" value={home.hero.accent} onChange={(v) => up('hero', { accent: v })} hint="Ditampilkan setelah judul dengan warna aksen." />
              <div className="adm-preview adm-field"><span className="adm-label">Pratinjau judul</span><span className="adm-preview__h">{home.hero.title} <em>{home.hero.accent}</em></span></div>
              <Area label="Paragraf pembuka" value={home.hero.lead} onChange={(v) => up('hero', { lead: v })} />
              <Text label="Tombol utama" value={home.hero.cta1} onChange={(v) => up('hero', { cta1: v })} hint="Menuju /programs" />
              <Text label="Tombol kedua" value={home.hero.cta2} onChange={(v) => up('hero', { cta2: v })} hint="Menuju /events" />
              <Text wide label="Catatan kecil" value={home.hero.note} onChange={(v) => up('hero', { note: v })} />
            </div>
          </Card>

          <Card id="h-mq" title="Marquee topik" desc="Deretan topik yang berjalan di bawah hero.">
            <StringList label="Topik" items={home.marquee} onChange={(v) => setHome({ ...home, marquee: v })} placeholder="Tambah topik…" />
          </Card>

          <Card id="h-feat" title="Program pilihan" desc="Pilih dan urutkan program yang tampil di bagian “Program pilihan”. Disarankan 3 atau 6.">
            <div className="adm-form">
              <Text label="Label kecil" value={home.featured.eyebrow} onChange={(v) => up('featured', { eyebrow: v })} />
              <Text label="Judul bagian" value={home.featured.title} onChange={(v) => up('featured', { title: v })} />
            </div>
            <ol className="adm-pick">
              {featured.map((slug, i) => (
                <li key={slug}>
                  <span className="adm-pick__n">{i + 1}</span>
                  <span className="adm-pick__t">{titleOf(slug)}</span>
                  <span className="adm-slist__act">
                    <button type="button" className="adm-icon" disabled={i === 0} onClick={() => up('featured', { slugs: move(featured, i, -1) })} aria-label="Naikkan"><I.up size={15} /></button>
                    <button type="button" className="adm-icon" disabled={i === featured.length - 1} onClick={() => up('featured', { slugs: move(featured, i, 1) })} aria-label="Turunkan"><I.down size={15} /></button>
                    <button type="button" className="adm-icon adm-icon--danger" onClick={() => up('featured', { slugs: featured.filter((s) => s !== slug) })} aria-label="Lepas"><I.x size={15} /></button>
                  </span>
                </li>
              ))}
            </ol>
            <div className="adm-field adm-field--wide">
              <label htmlFor="feat-add">Tambah program</label>
              <select id="feat-add" value="" onChange={(e) => { if (e.target.value) up('featured', { slugs: [...featured, e.target.value] }); }}>
                <option value="">— pilih program yang tayang —</option>
                {pub.filter((p) => !featured.includes(p.slug)).map((p) => <option key={p.slug} value={p.slug}>{TYPE[p.data.type]} · {p.data.title}</option>)}
              </select>
              {programs.length === 0 && <span className="adm-hint">Belum ada program di database — buka menu Program & e-book lalu impor katalog bawaan.</span>}
            </div>
          </Card>

          <Card id="h-txt" title="Judul bagian lain" desc="Teks pengantar di tiap bagian beranda.">
            <div className="adm-form">
              <Text label="Jalur belajar · label" value={home.paths.eyebrow} onChange={(v) => up('paths', { eyebrow: v })} />
              <Text label="Jalur belajar · judul" value={home.paths.title} onChange={(v) => up('paths', { title: v })} />
              <Area label="Jalur belajar · deskripsi" rows={2} value={home.paths.desc} onChange={(v) => up('paths', { desc: v })} />
              <Text label="Format · label" value={home.formats.eyebrow} onChange={(v) => up('formats', { eyebrow: v })} />
              <Text label="Format · judul" value={home.formats.title} onChange={(v) => up('formats', { title: v })} />
              <Area label="Format · catatan" rows={2} value={home.formats.note} onChange={(v) => up('formats', { note: v })} />
              <Text label="Jadwal · label" value={home.schedule.eyebrow} onChange={(v) => up('schedule', { eyebrow: v })} />
              <Text label="Jadwal · judul" value={home.schedule.title} onChange={(v) => up('schedule', { title: v })} />
              <Area label="Jadwal · deskripsi" rows={2} value={home.schedule.desc} onChange={(v) => up('schedule', { desc: v })} />
            </div>
          </Card>

          <Card id="h-steps" title="Cara pendaftaran" desc="Langkah-langkah yang tampil di bagian “Cara pendaftaran”.">
            <div className="adm-form">
              <Text label="Label" value={home.enroll.eyebrow} onChange={(v) => up('enroll', { eyebrow: v })} />
              <Text label="Judul" value={home.enroll.title} onChange={(v) => up('enroll', { title: v })} />
              <Area label="Deskripsi" rows={2} value={home.enroll.desc} onChange={(v) => up('enroll', { desc: v })} />
            </div>
            <ol className="adm-rows">
              {steps.map(([t, d], i) => (
                <li key={i}>
                  <span className="adm-pick__n">{i + 1}</span>
                  <div className="adm-rows__f">
                    <input aria-label={`Langkah ${i + 1} judul`} value={t} onChange={(e) => setSteps(steps.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} />
                    <input aria-label={`Langkah ${i + 1} keterangan`} value={d} onChange={(e) => setSteps(steps.map((x, j) => (j === i ? [x[0], e.target.value] : x)))} />
                  </div>
                  <span className="adm-slist__act">
                    <button type="button" className="adm-icon" disabled={i === 0} onClick={() => setSteps(move(steps, i, -1))} aria-label="Naikkan"><I.up size={15} /></button>
                    <button type="button" className="adm-icon" disabled={i === steps.length - 1} onClick={() => setSteps(move(steps, i, 1))} aria-label="Turunkan"><I.down size={15} /></button>
                    <button type="button" className="adm-icon adm-icon--danger" onClick={() => setSteps(steps.filter((_, j) => j !== i))} aria-label="Hapus"><I.trash size={15} /></button>
                  </span>
                </li>
              ))}
            </ol>
            <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setSteps([...steps, ['', '']])}><I.plus size={15} />Tambah langkah</button>
          </Card>

          <Card id="h-collab" title="Ajakan kolaborator" desc="Panel yang mengarah ke form /kolaborator.">
            <div className="adm-form">
              <Text label="Label" value={home.collab.eyebrow} onChange={(v) => up('collab', { eyebrow: v })} />
              <Text label="Tombol" value={home.collab.cta} onChange={(v) => up('collab', { cta: v })} />
              <Area label="Judul" rows={2} value={home.collab.title} onChange={(v) => up('collab', { title: v })} />
              <Area label="Deskripsi" rows={2} value={home.collab.desc} onChange={(v) => up('collab', { desc: v })} />
            </div>
          </Card>

          <Card id="h-close" title="Penutup" desc="Ajakan akhir halaman. FAQ yang tampil adalah 3 pertama dari menu Jalur belajar & FAQ.">
            <div className="adm-form">
              <Text wide label="Judul" value={home.closing.title} onChange={(v) => up('closing', { title: v })} />
              <Area label="Deskripsi" rows={2} value={home.closing.desc} onChange={(v) => up('closing', { desc: v })} />
              <Text label="Tombol utama" value={home.closing.cta1} onChange={(v) => up('closing', { cta1: v })} />
              <Text label="Tombol kedua" value={home.closing.cta2} onChange={(v) => up('closing', { cta2: v })} />
            </div>
          </Card>
        </div>
      </div>
      {dirty && (
        <div className="adm-savebar">
          <span>Ada perubahan yang belum disimpan.</span>
          <button type="button" className="adm-btn adm-btn--primary" disabled={busy} onClick={save}>{busy ? 'Menyimpan…' : 'Simpan perubahan'}</button>
        </div>
      )}
    </div>
  );
}
