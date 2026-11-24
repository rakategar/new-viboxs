import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from '@viboxs/shared/icons';
import { useMotion } from '@viboxs/shared/motion';
import { Magnetic } from '@viboxs/shared/fx';
import { CONTACT, STUDIO_ORIGIN } from '@viboxs/shared/ecosystem';
import { submitForm } from '@viboxs/shared/backend';
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
          <h1 className="h1-sm">Temukan Talenta AI yang Relevan dengan Kebutuhan Tim Anda.</h1>
          <p className="lead muted maxw-640">Jelajahi profil pembelajar yang memilih tersedia untuk peluang kerja, lihat bukti kemampuan yang mereka izinkan, dan kelola proses seleksi dalam satu workspace perusahaan terverifikasi.</p>
          <a href="#daftar-perusahaan" className="btn btn--primary btn--lg self-start">Daftarkan Perusahaan <ArrowRight /></a>
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
            <p className="body ink-muted">Workspace perusahaan di VIBOXS Studio sedang disiapkan. Pendaftaran awal ini masuk ke antrean verifikasi tim VIBOXS; kami menghubungi PIC lewat email bisnis untuk verifikasi legalitas dan kewenangan sebelum akses dibuka.</p>
            <CompanyForm />
          </section>
        </div>
      </div>
    </div>
  );
}

function CompanyForm() {
  const E = { perusahaan: '', nib: '', domain: '', nama: '', jabatan: '', email: '', kebutuhan: '', setuju: false, hp: '' };
  const [f, setF] = useState(E);
  const [err, setErr] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const [refNo, setRefNo] = useState('');
  const set = (k: keyof typeof E, v: string | boolean) => { setF((o) => ({ ...o, [k]: v })); setErr((e) => ({ ...e, [k]: '' })); };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (state === 'sending') return;
    const er: Record<string, string> = {};
    if (f.perusahaan.trim().length < 2) er.perusahaan = 'Isi nama legal perusahaan';
    if (!f.nama.trim()) er.nama = 'Isi nama PIC';
    if (!f.jabatan.trim()) er.jabatan = 'Isi jabatan PIC';
    if (!emailOk(f.email)) er.email = 'Isi email bisnis yang valid';
    if (f.kebutuhan.trim().length < 20) er.kebutuhan = 'Ceritakan kebutuhan perekrutan (minimal 20 karakter)';
    if (!f.setuju) er.setuju = 'Pernyataan kewenangan wajib dicentang';
    setErr(er);
    if (Object.values(er).some(Boolean)) { document.getElementById(`cf-${Object.keys(er)[0]}`)?.focus(); return; }
    setState('sending');
    try {
      const { hp, setuju, ...rest } = f;
      setRefNo(await submitForm('contact', 'edu', { ...rest, intent: 'Company Partner (hiring)', topik: 'Pendaftaran Company Partner (hiring)', pernyataan_kewenangan: setuju, _hp: hp, source: 'edu.viboxs.com/for-companies' }));
      setState('done');
    } catch (x) { setMsg((x as Error).message); setState('error'); }
  }

  if (state === 'done') return (
    <div role="status" className="help-form">
      <span className="h4">Pendaftaran perusahaan diterima.</span>
      <span className="body ink-muted">Status: <b>menunggu verifikasi</b>. Tim VIBOXS menghubungi <b>{f.email}</b> untuk langkah berikutnya. Nomor referensi: <code className="mono strong">{refNo}</code></span>
    </div>
  );
  const fe = (k: string) => err[k] && <span className="field__err">! {err[k]}</span>;
  return (
    <form noValidate onSubmit={submit} className="help-form" data-build="Form · Perusahaan">
      {state === 'error' && <div role="alert" className="note note--warn"><strong>! Belum terkirim</strong><span>{msg}</span></div>}
      <div className="form-2">
        <div className="field"><label htmlFor="cf-perusahaan">Nama legal perusahaan</label><input id="cf-perusahaan" autoComplete="organization" value={f.perusahaan} onChange={(e) => set('perusahaan', e.target.value)} aria-invalid={!!err.perusahaan} />{fe('perusahaan')}</div>
        <div className="field"><label htmlFor="cf-nib">NIB / identitas usaha <span className="ink-muted">(opsional)</span></label><input id="cf-nib" value={f.nib} onChange={(e) => set('nib', e.target.value)} /></div>
        <div className="field"><label htmlFor="cf-nama">Nama PIC</label><input id="cf-nama" autoComplete="name" value={f.nama} onChange={(e) => set('nama', e.target.value)} aria-invalid={!!err.nama} />{fe('nama')}</div>
        <div className="field"><label htmlFor="cf-jabatan">Jabatan PIC</label><input id="cf-jabatan" autoComplete="organization-title" value={f.jabatan} onChange={(e) => set('jabatan', e.target.value)} aria-invalid={!!err.jabatan} />{fe('jabatan')}</div>
        <div className="field"><label htmlFor="cf-email">Email bisnis</label><input id="cf-email" type="email" autoComplete="email" value={f.email} onChange={(e) => set('email', e.target.value)} aria-invalid={!!err.email} />{fe('email')}</div>
        <div className="field"><label htmlFor="cf-domain">Situs / domain perusahaan <span className="ink-muted">(opsional)</span></label><input id="cf-domain" type="url" placeholder="https://" value={f.domain} onChange={(e) => set('domain', e.target.value)} /></div>
      </div>
      <div className="field"><label htmlFor="cf-kebutuhan">Kebutuhan perekrutan</label><textarea id="cf-kebutuhan" rows={4} placeholder="Peran yang dicari, kemampuan utama, lokasi/remote, perkiraan waktu." value={f.kebutuhan} onChange={(e) => set('kebutuhan', e.target.value)} aria-invalid={!!err.kebutuhan} />{fe('kebutuhan')}</div>
      <label className="check-l"><input id="cf-setuju" type="checkbox" checked={f.setuju} onChange={(e) => set('setuju', e.target.checked)} aria-invalid={!!err.setuju} /><span><strong>Wajib.</strong> Saya berwenang mewakili perusahaan ini, informasi di atas akurat, dan data kandidat hanya akan dipakai untuk perekrutan yang sah. Saya menyetujui <Link to="/policies/privacy">kebijakan privasi</Link>.</span></label>
      {fe('setuju')}
      <div className="hp" aria-hidden="true"><label>Jangan diisi<input tabIndex={-1} autoComplete="off" value={f.hp} onChange={(e) => set('hp', e.target.value)} /></label></div>
      <button type="submit" className="btn btn--ink self-start" disabled={state === 'sending'}>{state === 'sending' ? 'Mengirim…' : 'Kirim pendaftaran'} <ArrowRight size={14} /></button>
      <span className="xs-13 ink-muted">Masuk ke antrean verifikasi {CONTACT.email}. Tidak ada biaya untuk akun hiring dasar.</span>
    </form>
  );
}
