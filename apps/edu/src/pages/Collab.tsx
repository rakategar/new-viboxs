import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from '@viboxs/shared/icons';
import { useMotion } from '@viboxs/shared/motion';
import { submitForm } from '@viboxs/shared/backend';
import { CONTACT } from '@viboxs/shared/ecosystem';
import { emailOk } from '../lib/data';

type Role = 'Trainer' | 'Educator' | 'Partnership';
const ROLES: { k: Role; d: string }[] = [
  { k: 'Trainer', d: 'Praktisi yang ingin membawakan webinar atau menulis e-book praktis.' },
  { k: 'Educator', d: 'Pengajar, dosen, atau kreator edukasi yang ingin mempublikasikan materi.' },
  { k: 'Partnership', d: 'Lembaga atau perusahaan yang ingin bekerja sama mempublikasikan produk AI.' },
];
const PRODUK_INDIVIDU = ['E-book', 'Webinar'];
const PRODUK_PARTNER = ['E-book', 'Webinar', 'Workshop', 'Paket / bundel produk AI', 'Lainnya'];

type F = {
  role: Role | ''; produk: string; nama: string; email: string; wa: string; instansi: string; jabatan: string; kota: string;
  judul: string; deskripsi: string; pengalaman: string; instagram: string; linkedin: string; website: string; sosmed_lain: string;
  privacy: boolean; hp: string;
};
const EMPTY: F = { role: '', produk: '', nama: '', email: '', wa: '', instansi: '', jabatan: '', kota: '', judul: '', deskripsi: '', pengalaman: '', instagram: '', linkedin: '', website: '', sosmed_lain: '', privacy: false, hp: '' };
type K = keyof F;

function validate(f: F) {
  const e: Partial<Record<K, string>> = {};
  if (!f.role) e.role = 'Pilih peranmu';
  if (!f.produk) e.produk = 'Pilih jenis produk yang diajukan';
  if (!f.nama.trim()) e.nama = 'Isi nama lengkap';
  if (!emailOk(f.email)) e.email = 'Isi email yang valid, contoh nama@domain.com';
  const w = f.wa.replace(/[\s-]/g, '');
  if (!/^(\+?62|0)8\d{7,12}$/.test(w)) e.wa = 'Isi nomor WhatsApp yang valid, contoh 0812 3456 7890';
  if (f.role === 'Partnership' && !f.instansi.trim()) e.instansi = 'Isi nama lembaga / perusahaan';
  if (f.judul.trim().length < 5) e.judul = 'Isi judul produk (minimal 5 karakter)';
  const d = f.deskripsi.trim().length;
  if (d < 50) e.deskripsi = `Ceritakan produkmu lebih detail — minimal 50 karakter (sekarang ${d})`;
  if (![f.instagram, f.linkedin, f.website, f.sosmed_lain].some((x) => x.trim())) e.instagram = 'Isi minimal satu media sosial atau portofolio';
  if (!f.privacy) e.privacy = 'Setujui kebijakan privasi untuk mengirim pengajuan';
  return e;
}
const SOCIAL: K[] = ['instagram', 'linkedin', 'website', 'sosmed_lain'];
const ORDER: K[] = ['role', 'produk', 'nama', 'email', 'wa', 'instansi', 'judul', 'deskripsi', 'instagram', 'privacy'];

export default function Collab() {
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref);
  const [f, setF] = useState<F>(EMPTY);
  const [err, setErr] = useState<Partial<Record<K, string>>>({});
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const [refNo, setRefNo] = useState('');
  const sumRef = useRef<HTMLDivElement>(null);

  const set = <T extends K>(k: T, v: F[T]) => {
    setF((o) => ({ ...o, [k]: v, ...(k === 'role' ? { produk: '' } : {}) }));
    const soc = SOCIAL.includes(k);
    setErr((e) => { if (!e[k] && !(soc && e.instagram)) return e; const n = { ...e }; delete n[k]; if (soc) delete n.instagram; return n; });
  };
  const produkList = f.role === 'Partnership' ? PRODUK_PARTNER : PRODUK_INDIVIDU;

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (state === 'sending') return;
    const e = validate(f);
    setErr(e);
    if (Object.keys(e).length) { window.setTimeout(() => sumRef.current?.focus(), 0); return; }
    setState('sending');
    try {
      const { hp, privacy, ...rest } = f;
      const r = await submitForm('collab', 'edu', { ...rest, kategori_produk: 'AI', privacy, _hp: hp, source: 'edu.viboxs.com/kolaborator' });
      setRefNo(r); setState('done'); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (x) {
      setMsg((x as Error).message); setState('error');
    }
  }

  const errs = ORDER.filter((k) => err[k]);
  const fe = (k: K) => err[k] && <span id={`k-${k}-err`} className="field__err">! {err[k]}</span>;

  return (
    <div ref={ref}>
      <section className="section page-top--glow">
        <div className="container stack-40">
          <nav aria-label="Breadcrumb" className="crumbs"><Link to="/">EDU</Link><span>/</span><span aria-current="page">Kolaborator</span></nav>
          <div className="collab-grid">
            <aside className="stack-24 collab-aside">
              <span className="mono-label">KOLABORATOR · KATEGORI AI</span>
              <h1 className="h1-sm" data-anim="up">Publikasikan e-book atau webinar AI-mu di VIBOXS EDU.</h1>
              <p className="lead muted" data-anim="up">Trainer, educator, dan partner bisa mengajukan produk belajar. Setiap pengajuan ditinjau tim EDU sebelum dipublikasikan.</p>
              <ol className="collab-steps" data-anim="stagger">
                <li><span>1</span><span><b>Kirim pengajuan</b> — identitas, judul, deskripsi, dan media sosialmu.</span></li>
                <li><span>2</span><span><b>Kurasi tim EDU</b> — kami meninjau relevansi, kualitas, dan kesiapan materi.</span></li>
                <li><span>3</span><span><b>Diskusi & kesepakatan</b> — format, jadwal, harga, dan bagi hasil disepakati tertulis.</span></li>
                <li><span>4</span><span><b>Publikasi</b> — produk tampil di katalog EDU setelah semua detail final.</span></li>
              </ol>
              <span className="xs-13 muted">Pertanyaan? Email <a href={`mailto:${CONTACT.email}`} className="u-link">{CONTACT.email}</a> atau DM Instagram <a href={CONTACT.instagramUrl} target="_blank" rel="noopener noreferrer" className="u-link">@{CONTACT.instagram}</a>.</span>
            </aside>

            <div>
              {state === 'done' ? (
                <div role="status" className="form-card stack-16">
                  <span className="collab-ok" aria-hidden="true"><Check size={26} /></span>
                  <h2 className="h3">Pengajuan diterima. Terima kasih, {f.nama.trim().split(' ')[0]}!</h2>
                  <p className="body muted">Pengajuan “{f.judul.trim()}” sudah masuk ke tim EDU di {CONTACT.email}. Kami membalas ke <b>{f.email.trim()}</b> setelah peninjauan.</p>
                  <div className="ref-box"><span className="xs muted">Nomor referensi</span><code className="mono strong">{refNo}</code></div>
                  <div className="row-12">
                    <Link to="/" className="btn btn--primary btn--sm">Kembali ke beranda <ArrowRight size={14} /></Link>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setF(EMPTY); setState('idle'); }}>Ajukan produk lain</button>
                  </div>
                </div>
              ) : (
                <form noValidate onSubmit={submit} className="form-card" data-build="Form · Kolaborator">
                  {errs.length > 0 && (
                    <div ref={sumRef} tabIndex={-1} role="alert" className="note note--err">
                      <strong>! {errs.length} isian perlu diperbaiki</strong>
                      <ul>{errs.map((k) => <li key={k}><a href={`#k-${k}`}>{err[k]}</a></li>)}</ul>
                    </div>
                  )}
                  {state === 'error' && <div role="alert" className="note note--warn"><strong>! Pengajuan belum terkirim</strong><span>{msg} Isianmu tidak hilang.</span></div>}

                  <fieldset className="field" id="k-role">
                    <legend>Saya mendaftar sebagai</legend>
                    <div className="role-pick">
                      {ROLES.map((r) => (
                        <label key={r.k} className={`role-opt ${f.role === r.k ? 'is-sel' : ''}`}>
                          <input type="radio" name="role" value={r.k} checked={f.role === r.k} onChange={() => set('role', r.k)} />
                          <b>{r.k}</b><span className="xs-13 muted">{r.d}</span>
                        </label>
                      ))}
                    </div>
                    {fe('role')}
                  </fieldset>

                  {f.role && (
                    <fieldset className="field" id="k-produk">
                      <legend>{f.role === 'Partnership' ? 'Bentuk kerja sama' : 'Produk yang diajukan'}</legend>
                      <div className="chip-pick">
                        {produkList.map((x) => (
                          <label key={x} className={`pick-chip ${f.produk === x ? 'is-on' : ''}`}><input type="radio" name="produk" value={x} checked={f.produk === x} onChange={() => set('produk', x)} />{x}</label>
                        ))}
                      </div>
                      <span className="xs-13 muted">Kategori: <b>AI</b> — fokus kurasi EDU saat ini.</span>
                      {fe('produk')}
                    </fieldset>
                  )}

                  <div className="form-sec"><span className="eyebrow">Identitas</span></div>
                  <div className="form-2">
                    <div className="field"><label htmlFor="k-nama">Nama lengkap</label><input id="k-nama" autoComplete="name" value={f.nama} onChange={(e) => set('nama', e.target.value)} aria-invalid={!!err.nama} />{fe('nama')}</div>
                    <div className="field"><label htmlFor="k-email">Email</label><input id="k-email" type="email" autoComplete="email" value={f.email} onChange={(e) => set('email', e.target.value)} aria-invalid={!!err.email} placeholder="nama@domain.com" />{fe('email')}</div>
                    <div className="field"><label htmlFor="k-wa">WhatsApp</label><input id="k-wa" type="tel" autoComplete="tel" value={f.wa} onChange={(e) => set('wa', e.target.value)} aria-invalid={!!err.wa} placeholder="0812 3456 7890" />{fe('wa')}</div>
                    <div className="field"><label htmlFor="k-kota">Kota <span className="muted">(opsional)</span></label><input id="k-kota" autoComplete="address-level2" value={f.kota} onChange={(e) => set('kota', e.target.value)} /></div>
                    <div className="field"><label htmlFor="k-instansi">{f.role === 'Partnership' ? 'Lembaga / perusahaan' : 'Instansi / perusahaan'} {f.role !== 'Partnership' && <span className="muted">(opsional)</span>}</label><input id="k-instansi" autoComplete="organization" value={f.instansi} onChange={(e) => set('instansi', e.target.value)} aria-invalid={!!err.instansi} />{fe('instansi')}</div>
                    <div className="field"><label htmlFor="k-jabatan">Jabatan / profesi <span className="muted">(opsional)</span></label><input id="k-jabatan" autoComplete="organization-title" value={f.jabatan} onChange={(e) => set('jabatan', e.target.value)} /></div>
                  </div>

                  <div className="form-sec"><span className="eyebrow">Produk</span></div>
                  <div className="field"><label htmlFor="k-judul">Judul {f.produk ? f.produk.toLowerCase() : 'produk'}</label><input id="k-judul" value={f.judul} maxLength={140} onChange={(e) => set('judul', e.target.value)} aria-invalid={!!err.judul} placeholder="Contoh: Prompting AI untuk Admin UMKM" />{fe('judul')}</div>
                  <div className="field"><label htmlFor="k-deskripsi">Deskripsi</label>
                    <span className="xs-13 muted">Untuk siapa, apa yang dipelajari, dan hasil yang dibawa pulang peserta.</span>
                    <textarea id="k-deskripsi" rows={6} maxLength={3000} value={f.deskripsi} onChange={(e) => set('deskripsi', e.target.value)} aria-invalid={!!err.deskripsi} />
                    <span className="xs muted right">{f.deskripsi.trim().length}/3000</span>{fe('deskripsi')}</div>
                  <div className="field"><label htmlFor="k-pengalaman">Pengalaman / kredensial <span className="muted">(opsional)</span></label><textarea id="k-pengalaman" rows={3} maxLength={1500} value={f.pengalaman} onChange={(e) => set('pengalaman', e.target.value)} placeholder="Pengalaman mengajar, karya, atau klien yang relevan." /></div>

                  <div className="form-sec"><span className="eyebrow">Media sosial</span><span className="xs-13 muted">Isi minimal satu.</span></div>
                  <div className="form-2" id="k-instagram">
                    <div className="field"><label htmlFor="k-ig">Instagram</label><input id="k-ig" value={f.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="@username" aria-invalid={!!err.instagram} /></div>
                    <div className="field"><label htmlFor="k-li">LinkedIn</label><input id="k-li" value={f.linkedin} onChange={(e) => set('linkedin', e.target.value)} placeholder="linkedin.com/in/…" /></div>
                    <div className="field"><label htmlFor="k-web">Website / portofolio</label><input id="k-web" type="url" value={f.website} onChange={(e) => set('website', e.target.value)} placeholder="https://" /></div>
                    <div className="field"><label htmlFor="k-lain">Lainnya (TikTok, YouTube, dll.)</label><input id="k-lain" value={f.sosmed_lain} onChange={(e) => set('sosmed_lain', e.target.value)} /></div>
                  </div>
                  {fe('instagram')}

                  <div className="hp" aria-hidden="true"><label>Jangan diisi<input tabIndex={-1} autoComplete="off" value={f.hp} onChange={(e) => set('hp', e.target.value)} /></label></div>
                  <div className="field" id="k-privacy">
                    <label className="check"><input type="checkbox" checked={f.privacy} onChange={(e) => set('privacy', e.target.checked)} aria-invalid={!!err.privacy} /><span>Saya menyetujui <Link to="/policies/privacy">kebijakan privasi</Link> — data ini dipakai untuk meninjau dan menindaklanjuti pengajuan. <span className="muted">(wajib)</span></span></label>
                    {fe('privacy')}
                  </div>
                  <button type="submit" className="btn btn--primary btn--lg self-start" aria-busy={state === 'sending'} disabled={state === 'sending'}>
                    {state === 'sending' ? 'Mengirim…' : state === 'error' ? 'Kirim ulang' : 'Kirim pengajuan'} <ArrowRight size={16} />
                  </button>
                  <span className="xs-13 muted">Pengajuan otomatis masuk ke tim EDU ({CONTACT.email}). Mengirim pengajuan bukan kontrak.</span>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
