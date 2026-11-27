import { useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from '@viboxs/shared/icons';
import { useMotion } from '@viboxs/shared/motion';
import { Magnetic } from '@viboxs/shared/fx';
import { CONTACT, ORIGIN, STUDIO_ORIGIN } from '@viboxs/shared/ecosystem';
import { callEdge } from '@viboxs/shared/backend';
import { emailOk } from '../lib/data';

/* ---------------- /edu-learner (PRD v3.0 §15.2) ---------------- */
const BENEFITS: [string, string][] = [
  ['Peta belajar personal', 'Ceritakan tujuan dan kemampuanmu; dapatkan arah belajar dari program yang benar-benar tersedia.'],
  ['Riwayat pembelajaran', 'Program yang kamu ikuti tersimpan di satu akun, tidak tercecer di email.'],
  ['Assessment dan feedback', 'Ukur pemahaman setelah belajar. Hasilnya untuk feedback, bukan sertifikasi profesi.'],
  ['Bintang progres & token reward', 'Penanda aktivitas belajar dan reward sesuai ketentuan yang berlaku. Penukaran token belum tersedia.'],
  ['Akses pengajuan peluang', 'Ajukan diri ke seleksi Rangers atau tampil untuk perusahaan partner — hanya bila kamu memilihnya.'],
];
const FLOW: [string, string][] = [
  ['Daftar gratis', 'Buat akun di VIBOXS Studio dan verifikasi email.'],
  ['Petakan tujuan', 'Jawab pertanyaan singkat tentang tujuan, kemampuan awal, dan waktu belajar.'],
  ['Ikuti pembelajaran', 'Pilih program EDU yang relevan, dengan atau tanpa biaya.'],
  ['Lihat perkembangan', 'Riwayat, assessment, dan progres tersimpan di akunmu.'],
];

export function EduLearner() {
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref);
  return (
    <div ref={ref}>
      <section className="section page-top--glow">
        <div className="container stack-24 maxw-880">
          <nav aria-label="Breadcrumb" className="crumbs"><Link to="/">EDU</Link><span>/</span><span aria-current="page">EDU Learner</span></nav>
          <span className="eyebrow">EDU Learner</span>
          <h1 className="h1-sm">Mulai dari Kemampuanmu Hari Ini. Bangun Langkah Berikutnya dengan Lebih Terarah.</h1>
          <p className="lead muted maxw-640">Ceritakan tujuanmu, dapatkan peta pembelajaran, ikuti materi sesuai kebutuhan, lalu lihat perkembangan dari tugas dan assessment yang kamu selesaikan.</p>
          <div className="row-12 flex-wrap">
            <Magnetic><a href={`${STUDIO_ORIGIN}/daftar`} className="btn btn--primary btn--lg">Daftar EDU Learner <ArrowRight /></a></Magnetic>
            <a href={`${STUDIO_ORIGIN}/login`} className="btn btn--ghost btn--lg">Sudah punya akun? Masuk</a>
          </div>
          <span className="xs-13 muted">Gratis untuk membuat akun. Produk tertentu berbayar. Pendaftaran tidak menjamin diterima bekerja atau menjadi Ranger.</span>
        </div>
      </section>
      <div className="light pad-page">
        <div className="container stack-64">
          <section className="stack-24" aria-labelledby="ben-h">
            <h2 id="ben-h" className="h2-block">Yang kamu dapat</h2>
            <div className="lane-grid lane-grid--light">
              {BENEFITS.map(([t, d]) => <div key={t} className="lane" data-build={`Manfaat · ${t}`}><span className="row-8"><Check size={18} /><span className="h4">{t}</span></span><span className="small ink-muted">{d}</span></div>)}
            </div>
          </section>
          <section className="stack-24" aria-labelledby="flow-h">
            <h2 id="flow-h" className="h2-block">Cara kerjanya</h2>
            <ol className="steps steps--light">
              {FLOW.map(([t, d], i) => (
                <li key={t} className="step"><span className="step__head"><span className="step__n">0{i + 1}</span><span className="step__rule" aria-hidden="true" /></span><span className="step__t">{t}</span><span className="small ink-muted lh">{d}</span></li>
              ))}
            </ol>
          </section>
          <section className="duo">
            <div className="box stack-8">
              <span className="mono-label ink-muted">JALUR RANGERS</span>
              <span className="body">Ranger baru dipilih dari EDU Learner terverifikasi melalui review rekam belajar, assessment, wawancara, dan uji proyek. Menjadi Learner tidak otomatis diterima.</span>
            </div>
            <div className="box stack-8">
              <span className="mono-label ink-muted">PELUANG PERUSAHAAN</span>
              <span className="body">Profilmu tidak ditampilkan kepada perusahaan kecuali kamu mengaktifkannya sendiri di Pengaturan Privasi — dan bisa dicabut kapan saja.</span>
            </div>
          </section>
          <section className="help-cta">
            <span className="stack-6"><span className="h4">Siap memetakan tujuan belajarmu?</span><span className="body o80">Akun Learner hanya membuka akses belajar. Jalur profesional selalu melalui seleksi terpisah.</span></span>
            <a href={`${STUDIO_ORIGIN}/daftar`} className="btn btn--light">Daftar EDU Learner ↗</a>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ---------------- /for-companies (PRD v3.0 §15.4) ---------------- */
const STEPS_CO = ['Verifikasi perusahaan', 'Temukan kandidat', 'Kirim undangan', 'Wawancara', 'Kelola keputusan'];

export function ForCompanies() {
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref);
  return (
    <div ref={ref}>
      <section className="section page-top--glow">
        <div className="container stack-24 maxw-880">
          <nav aria-label="Breadcrumb" className="crumbs"><Link to="/">EDU</Link><span>/</span><span aria-current="page">Untuk Perusahaan</span></nav>
          <span className="eyebrow">Untuk Perusahaan</span>
          <h1 className="h1-sm">Temukan talenta AI yang relevan dengan kebutuhan perusahaan Anda.</h1>
          <p className="lead muted maxw-640">Akses profil kandidat EDU Learner yang bersedia direkrut, jelajahi rekam pembelajaran yang benar-benar terverifikasi, dan kelola proses hiring dalam Company Workspace. Perusahaan melalui verifikasi sebelum bisa membuka akses.</p>
          <div className="row-12 flex-wrap">
            <a href="#daftar-perusahaan" className="btn btn--primary btn--lg">Daftarkan Perusahaan <ArrowRight /></a>
            <a href={ORIGIN.services} className="btn btn--ghost btn--lg" target="_blank" rel="noopener noreferrer">Jelajahi VIBOXS Services ↗</a>
          </div>
          <span className="xs-13 muted">Akses awal melalui verifikasi. Pendaftaran tidak menjamin ketersediaan kandidat atau keberhasilan perekrutan.</span>
        </div>
      </section>
      <div className="light pad-page">
        <div className="container stack-64">
          <section className="stack-24" aria-labelledby="co-steps">
            <h2 id="co-steps" className="h2-block">Alur perekrutan</h2>
            <ol className="steps steps--light">
              {STEPS_CO.map((t, i) => <li key={t} className="step"><span className="step__head"><span className="step__n">0{i + 1}</span><span className="step__rule" aria-hidden="true" /></span><span className="step__t">{t}</span></li>)}
            </ol>
          </section>
          <section className="duo">
            <div className="box stack-8">
              <span className="mono-label ink-muted">PRIVASI KANDIDAT</span>
              <span className="body">Hanya kandidat yang bersedia direkrut dan memenuhi ketentuan akses yang terlihat. Kontak pribadi baru dibagikan setelah kandidat menerima undangan Anda.</span>
            </div>
            <div className="box stack-8">
              <span className="mono-label ink-muted">BATAS DIREKTORI</span>
              <span className="body">Tim Rangers aktif dan data proyek internal VIBOXS tidak termasuk direktori ini.</span>
            </div>
          </section>
          <section className="bridge bridge--light stack-12">
            <span className="mono-label ink-muted">LAYANAN VIBOXS</span>
            <span className="h3">Perlu membangun sistem, otomasi, atau dukungan pengembangan bisnis?</span>
            <span className="body ink-muted">Layanan VIBOXS dapat diajukan langsung dari workspace perusahaan yang sama, atau sekarang melalui VIBOXS Services.</span>
            <Link to="/for-teams" className="link-arrow ink">Lihat program tim &amp; layanan <ArrowRight size={14} /></Link>
          </section>
          <section id="daftar-perusahaan" className="stack-16 maxw-880">
            <h2 className="h2-block">Daftarkan perusahaan</h2>
            <p className="body ink-muted">Lengkapi identitas perusahaan, email, nomor WhatsApp resmi dan logo. Kami akan meninjau pengajuan Anda. Pembaruan status dikirim melalui email dan, setelah layanan WhatsApp terhubung serta Anda menyetujuinya, melalui WhatsApp resmi.</p>
            <CompanyForm />
          </section>
        </div>
      </div>
    </div>
  );
}

type Up = { name: string; size: number; type: string; b64: string; url?: string };
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const DOC_TYPES = [...LOGO_TYPES, 'application/pdf'];
const PURPOSE: [string, string][] = [['hiring', 'Hiring talenta'], ['services', 'VIBOXS Services'], ['both', 'Keduanya']];
const readFile = (f: File) => new Promise<string>((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => no(new Error('File tidak terbaca.')); r.readAsDataURL(f); });
const newIdem = () => { try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; } };

/** v4 WP02: pengajuan Company Partner langsung ke antrean Commander (edge company-apply). Tanpa akun sampai diverifikasi. */
function CompanyForm() {
  const E = { legal_name: '', nib: '', industry: '', address: '', website: '', business_email: '', company_whatsapp: '', pic_name: '', pic_role: '', pic_email: '',
    purpose: '', hiring_needs: '', logo_rights: false, authority_statement: false, data_consent: false, comm_consent_wa: false, hp: '' };
  const [f, setF] = useState(E);
  const [logo, setLogo] = useState<Up | null>(null);
  const [doc, setDoc] = useState<Up | null>(null);
  const [err, setErr] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const [refNo, setRefNo] = useState('');
  const idem = useRef(newIdem());
  const set = (k: keyof typeof E, v: string | boolean) => { setF((o) => ({ ...o, [k]: v })); setErr((e) => ({ ...e, [k]: '' })); };

  async function pick(kind: 'logo' | 'nib_doc', file: File | undefined) {
    setErr((e) => ({ ...e, [kind]: '' }));
    if (!file) { kind === 'logo' ? setLogo(null) : setDoc(null); return; }
    const types = kind === 'logo' ? LOGO_TYPES : DOC_TYPES;
    const max = kind === 'logo' ? 2 : 5;
    if (!types.includes(file.type)) { setErr((e) => ({ ...e, [kind]: kind === 'logo' ? 'Format logo harus PNG, JPG, atau WebP (SVG belum didukung).' : 'Format harus PDF, PNG, JPG, atau WebP.' })); return; }
    if (file.size > max * 1024 * 1024) { setErr((e) => ({ ...e, [kind]: `Ukuran maksimal ${max} MB.` })); return; }
    const b64 = await readFile(file);
    const up = { name: file.name, size: file.size, type: file.type, b64, url: kind === 'logo' ? b64 : undefined };
    if (kind === 'logo') setLogo(up); else setDoc(up);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (state === 'sending') return;
    const er: Record<string, string> = {};
    if (f.legal_name.trim().length < 3) er.legal_name = 'Isi nama legal perusahaan';
    if (f.nib.trim().length < 5) er.nib = 'Isi nomor NIB atau identitas usaha';
    if (!doc) er.nib_doc = 'Unggah file NIB / dokumen usaha';
    if (f.industry.trim().length < 2) er.industry = 'Isi industri';
    if (f.address.trim().length < 10) er.address = 'Isi alamat usaha (minimal 10 karakter)';
    if (f.website && !/^https?:\/\//.test(f.website.trim())) er.website = 'Website diawali https://';
    if (!emailOk(f.business_email)) er.business_email = 'Isi email perusahaan yang valid';
    if (!/^(\+?62|0)[0-9\s-]{8,16}$/.test(f.company_whatsapp.trim()) && !/^\+[1-9][0-9]{7,14}$/.test(f.company_whatsapp.replace(/[\s-]/g, ''))) er.company_whatsapp = 'Isi nomor WhatsApp perusahaan, contoh 0812xxxxxxx';
    if (f.pic_name.trim().length < 3) er.pic_name = 'Isi nama PIC HR';
    if (f.pic_role.trim().length < 2) er.pic_role = 'Isi jabatan PIC';
    if (f.pic_email && !emailOk(f.pic_email)) er.pic_email = 'Email PIC tidak valid';
    if (!f.purpose) er.purpose = 'Pilih tujuan penggunaan';
    if (f.hiring_needs.trim().length < 30) er.hiring_needs = 'Ceritakan kebutuhan kandidat/layanan (minimal 30 karakter)';
    if (!logo) er.logo = 'Unggah logo perusahaan';
    if (!f.logo_rights) er.logo_rights = 'Izin pemakaian logo wajib dicentang';
    if (!f.authority_statement) er.authority_statement = 'Pernyataan kewenangan wajib dicentang';
    if (!f.data_consent) er.data_consent = 'Kesepakatan data wajib dicentang';
    setErr(er);
    if (Object.values(er).some(Boolean)) { document.getElementById(`cf-${Object.keys(er)[0]}`)?.focus(); return; }
    setState('sending');
    try {
      const { hp, ...rest } = f;
      const { status, data } = await callEdge<{ ref: string; field?: string }>('company-apply', { ...rest, _hp: hp, idem_key: idem.current, logo: { b64: logo!.b64 }, nib_doc: { b64: doc!.b64 } }, undefined, 60000);
      if (status !== 200) { const fld = data.field; if (fld === 'logo' || fld === 'nib_doc') setErr((x) => ({ ...x, [fld]: data.error ?? '' })); throw new Error(data.error ?? 'Pengajuan belum terkirim. Coba lagi.'); }
      setRefNo(data.ref);
      idem.current = newIdem();
      setState('done');
    } catch (x) { setMsg((x as Error).message); setState('error'); }
  }

  if (state === 'done') return (
    <div role="status" className="help-form">
      <span className="h4">Pengajuan perusahaan diterima.</span>
      <span className="body ink-muted">Nomor referensi: <code className="mono strong">{refNo}</code>. Konfirmasi dikirim ke email <b>{f.business_email}</b>. Status: <b>menunggu verifikasi Commander</b> — Anda belum memperoleh akses Talent Discovery sampai verifikasi selesai.</span>
      <span className="xs-13 ink-muted">Setelah terverifikasi, PIC menerima email aktivasi untuk membuat password Company Workspace. VIBOXS tidak pernah mengirim password lewat email atau WhatsApp.</span>
    </div>
  );
  const fe = (k: string) => err[k] && <span className="field__err">! {err[k]}</span>;
  const inp = (k: keyof typeof E, label: ReactNode, p: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="field"><label htmlFor={`cf-${k}`}>{label}</label><input id={`cf-${k}`} value={String(f[k])} onChange={(e) => set(k, e.target.value)} aria-invalid={!!err[k]} {...p} />{fe(k)}</div>
  );
  const chk = (k: 'logo_rights' | 'authority_statement' | 'data_consent' | 'comm_consent_wa', body: ReactNode) => (
    <><label className="check-l"><input id={`cf-${k}`} type="checkbox" checked={f[k]} onChange={(e) => set(k, e.target.checked)} aria-invalid={!!err[k]} /><span>{body}</span></label>{fe(k)}</>
  );
  return (
    <form noValidate onSubmit={submit} className="help-form" data-build="Form · Perusahaan v4">
      {state === 'error' && <div role="alert" className="note note--warn"><strong>! Belum terkirim</strong><span>{msg}</span></div>}
      <span className="mono-label ink-muted">IDENTITAS PERUSAHAAN</span>
      <div className="form-2">
        {inp('legal_name', 'Nama legal perusahaan', { autoComplete: 'organization' })}
        {inp('industry', 'Industri', { placeholder: 'mis. Ritel, Teknologi, Pendidikan' })}
        {inp('nib', 'Nomor NIB / identitas usaha')}
        <div className="field"><label htmlFor="cf-nib_doc">File NIB / dokumen usaha <span className="ink-muted">(PDF/JPG/PNG, maks. 5 MB)</span></label>
          <input id="cf-nib_doc" type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={(e) => pick('nib_doc', e.target.files?.[0])} aria-invalid={!!err.nib_doc} />
          {doc && <span className="xs-13 ink-muted">{doc.name} · {Math.round(doc.size / 1024)} KB</span>}{fe('nib_doc')}</div>
        {inp('website', <>Website <span className="ink-muted">(bila ada)</span></>, { type: 'url', placeholder: 'https://' })}
        {inp('business_email', 'Email perusahaan', { type: 'email', autoComplete: 'email' })}
        {inp('company_whatsapp', 'Nomor WhatsApp perusahaan', { type: 'tel', autoComplete: 'tel', placeholder: '0812xxxxxxx' })}
      </div>
      <div className="field"><label htmlFor="cf-address">Alamat usaha</label><textarea id="cf-address" rows={2} value={f.address} onChange={(e) => set('address', e.target.value)} aria-invalid={!!err.address} />{fe('address')}</div>
      <span className="mono-label ink-muted">PIC &amp; KEBUTUHAN</span>
      <div className="form-2">
        {inp('pic_name', 'Nama PIC HR', { autoComplete: 'name' })}
        {inp('pic_role', 'Jabatan PIC', { autoComplete: 'organization-title' })}
        {inp('pic_email', <>Email PIC <span className="ink-muted">(jika berbeda)</span></>, { type: 'email' })}
        <div className="field"><label htmlFor="cf-purpose">Tujuan penggunaan</label>
          <select id="cf-purpose" value={f.purpose} onChange={(e) => set('purpose', e.target.value)} aria-invalid={!!err.purpose}><option value="">Pilih…</option>{PURPOSE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>{fe('purpose')}</div>
      </div>
      <div className="field"><label htmlFor="cf-hiring_needs">Kebutuhan kandidat / layanan</label><textarea id="cf-hiring_needs" rows={4} placeholder="Peran yang dicari, kemampuan utama, lokasi/remote, perkiraan waktu — atau layanan yang dibutuhkan." value={f.hiring_needs} onChange={(e) => set('hiring_needs', e.target.value)} aria-invalid={!!err.hiring_needs} />{fe('hiring_needs')}</div>
      <span className="mono-label ink-muted">LOGO PERUSAHAAN</span>
      <div className="field"><label htmlFor="cf-logo">Logo <span className="ink-muted">(PNG/JPG/WebP, maks. 2 MB — metadata foto dihapus otomatis)</span></label>
        <input id="cf-logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => pick('logo', e.target.files?.[0])} aria-invalid={!!err.logo} />
        {logo?.url && <img src={logo.url} alt="Pratinjau logo" style={{ maxHeight: 72, maxWidth: 200, objectFit: 'contain', background: '#fff', borderRadius: 8, padding: 6, border: '1px solid var(--v-light-line)' }} />}{fe('logo')}</div>
      {chk('logo_rights', <><strong>Wajib.</strong> Perusahaan memiliki hak atas logo ini dan mengizinkan VIBOXS memakainya untuk verifikasi serta (dengan persetujuan terpisah) tampilan mitra.</>)}
      <span className="mono-label ink-muted">PERNYATAAN &amp; PERSETUJUAN</span>
      {chk('authority_statement', <><strong>Wajib.</strong> Saya berwenang mewakili perusahaan ini dan informasi di atas akurat.</>)}
      {chk('data_consent', <><strong>Wajib.</strong> Data kandidat hanya dipakai untuk perekrutan yang sah, tidak diekspor massal atau diperjualbelikan. Saya menyetujui <Link to="/policies/privacy">kebijakan privasi</Link>.</>)}
      {chk('comm_consent_wa', <>Saya bersedia menerima pembaruan status lewat WhatsApp resmi perusahaan <span className="ink-muted">setelah layanan WhatsApp VIBOXS terhubung</span>. Saat ini pembaruan dikirim lewat email.</>)}
      <div className="hp" aria-hidden="true"><label>Jangan diisi<input tabIndex={-1} autoComplete="off" value={f.hp} onChange={(e) => set('hp', e.target.value)} /></label></div>
      <button type="submit" className="btn btn--ink self-start" disabled={state === 'sending'}>{state === 'sending' ? 'Mengirim…' : 'Kirim pengajuan'} <ArrowRight size={14} /></button>
      <span className="xs-13 ink-muted">Masuk ke antrean verifikasi Commander VIBOXS ({CONTACT.email}). Tidak ada biaya untuk akun hiring dasar. Pengajuan bukan status terverifikasi.</span>
    </form>
  );
}
