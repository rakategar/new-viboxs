import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check } from '@viboxs/shared/icons';
import { STUDIO_ORIGIN } from '@viboxs/shared/ecosystem';
import { NotFound } from './Misc';
import NotifyForm from '../components/NotifyForm';
import { PAYMENTS_ENABLED, TYPE, bySlug, emailOk, hasPrice, hrefOf, priceOf, whenOf } from '../lib/data';
import { submitForm } from '@viboxs/shared/backend';

type Step = 'summary' | 'data' | 'recorded';
const STEPPER = ['Ringkasan', 'Data diri', 'Selesai'];
const stepIdx = (s: Step) => ({ summary: 0, data: 1, recorded: 2 })[s];
const OPEN = ['OPEN', 'RESCHEDULED', 'AVAILABLE'];

/**
 * Checkout publik EDU (guest). Batch 1: hanya program GRATIS yang bisa didaftarkan — dicatat sebagai
 * registrasi (`submissions`, kind=register) lalu diverifikasi tim. Tidak ada status "terkonfirmasi/terbayar"
 * di sisi klien (QA CHE-008). Program berbayar menunggu order server + webhook Midtrans (Batch 2).
 */
export default function Checkout() {
  const { slug } = useParams();
  const p = bySlug(slug);
  const [step, setStep] = useState<Step>('summary');
  const [f, setF] = useState({ nama: '', email: '', wa: '', terms: false, marketing: false, hp: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState('');
  const [modal, setModal] = useState(true);
  const dlg = useRef<HTMLDivElement>(null);

  useEffect(() => { if (modal) dlg.current?.querySelector<HTMLElement>('a,button')?.focus(); }, [modal]);
  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModal(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modal]);

  if (!p || !OPEN.includes(p.status) || p.past) return <NotFound />;
  const paidBlocked = !p.free && !(PAYMENTS_ENABLED && hasPrice(p));

  const go = (s: Step) => { setStep(s); window.scrollTo(0, 0); };
  const field = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((x) => ({ ...x, [k]: v })); setErr((x) => ({ ...x, [k]: '' }));
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const er: Record<string, string> = {};
    if (!f.nama.trim()) er.nama = 'Tulis nama lengkapmu.';
    if (!emailOk(f.email)) er.email = 'Masukkan email yang valid — detail akses dikirim ke sini.';
    if (!f.terms) er.terms = 'Persetujuan ketentuan wajib untuk melanjutkan.';
    setErr(er);
    if (Object.keys(er).length) { window.setTimeout(() => document.getElementById(`co-${Object.keys(er)[0]}`)?.focus(), 0); return; }
    setBusy(true);
    try {
      const r = await submitForm('register', 'edu', {
        program: p!.title, slug: p!.slug, jenis: p!.type, jadwal: whenOf(p!), harga: priceOf(p!), order_source: 'EDU_PUBLIC_GUEST',
        nama: f.nama.trim(), email: f.email.trim(), wa: f.wa.trim(), marketing: f.marketing, terms: f.terms, _hp: f.hp,
      });
      setRef(r); go('recorded');
    } catch (x) {
      setErr({ form: (x as Error).message });
    } finally { setBusy(false); }
  }
  const cur = stepIdx(step);

  return (
    <div className="light pad-page checkout">
      <div className="container container--mid stack-32">
        <div className="row-between flex-wrap">
          <Link to={hrefOf(p)} className="back-link">← Kembali ke program</Link>
          <span className="row-8 xs-13 ink-muted"><LockIcon />Status hanya mengikuti konfirmasi server</span>
        </div>

        {paidBlocked ? (
          <section role="status" className="co-card co-card--warn">
            <span className="xs-13 strong pend-tag">PEMBAYARAN BELUM TERSEDIA</span>
            <h1 className="co-h">Pembayaran online sedang disiapkan.</h1>
            <p className="body-16">Program berbayar belum dapat diproses di EDU. Kami tidak membuat order atau menagih apa pun sebelum sistem pembayaran terverifikasi siap. Tinggalkan email agar kami kabari saat pendaftaran program ini dibuka.</p>
            <NotifyForm label="Email untuk pemberitahuan" consent="Saya setuju menerima email pemberitahuan program ini." done="Terima kasih. Kami kabari lewat email." />
            <Link to={hrefOf(p)} className="link-arrow ink">Kembali ke detail program</Link>
          </section>
        ) : (
          <>
            <ol aria-label="Tahap pendaftaran" className="stepper" style={{ ['--prog' as string]: `${(cur / 2) * 100}%` }}>
              <span className="stepper__line" aria-hidden="true"><span /></span>
              {STEPPER.map((l, i) => (
                <li key={l} aria-current={i === cur ? 'step' : undefined} className={i < cur ? 'is-done' : i === cur ? 'is-cur' : ''}>
                  <span className="stepper__dot">{i < cur ? <Check size={16} /> : i + 1}</span>
                  <span className="stepper__l">{l}</span>
                </li>
              ))}
            </ol>
            <div className="co">
              <div className="co__main">
                {step === 'summary' && (
                  <section className="co-card">
                    <h1 className="co-h">Ringkasan pendaftaran</h1>
                    <p className="body ink-muted">Periksa dulu apa yang kamu daftarkan. Program ini gratis — tidak ada tagihan.</p>
                    <ul className="ticks ticks--plain">
                      <li><Check size={18} />Yang kamu terima tertulis di halaman program</li>
                      <li><Check size={18} />Detail akses dikirim ke email yang kamu isi setelah pendaftaran diverifikasi</li>
                      <li><Check size={18} />Tautan sesi bersifat privat, tidak dipublikasikan</li>
                    </ul>
                    <button type="button" className="btn btn--ink btn--lg self-start" onClick={() => go('data')}>Lanjut isi data →</button>
                  </section>
                )}
                {step === 'data' && (
                  <form className="co-card" onSubmit={submit} noValidate>
                    <h1 className="co-h">Data diri</h1>
                    <p className="body ink-muted">Hanya yang diperlukan untuk mengirim detail akses.</p>
                    <div className="fld">
                      <label htmlFor="co-nama">Nama lengkap</label>
                      <input id="co-nama" value={f.nama} onChange={field('nama')} autoComplete="name" aria-invalid={!!err.nama} aria-describedby={err.nama ? 'co-nama-e' : undefined} />
                      {err.nama && <span id="co-nama-e" role="alert" className="field-err">{err.nama}</span>}
                    </div>
                    <div className="fld">
                      <label htmlFor="co-email">Email</label>
                      <input id="co-email" type="email" value={f.email} onChange={field('email')} autoComplete="email" aria-invalid={!!err.email} aria-describedby="co-email-h" />
                      <span id="co-email-h" className="xs-13 ink-muted">Detail akses dikirim ke alamat ini. Email yang sama nantinya bisa dipakai untuk menautkan riwayat ke akun EDU Learner.</span>
                      {err.email && <span role="alert" className="field-err">{err.email}</span>}
                    </div>
                    <div className="fld">
                      <label htmlFor="co-wa">Nomor WhatsApp <span className="opt-l">(opsional)</span></label>
                      <input id="co-wa" type="tel" value={f.wa} onChange={field('wa')} autoComplete="tel" placeholder="+62" />
                    </div>
                    <div className="hp" aria-hidden="true"><label>Jangan diisi<input tabIndex={-1} autoComplete="off" value={f.hp} onChange={field('hp')} /></label></div>
                    <div className="consent">
                      <label className="check-l"><input id="co-terms" type="checkbox" checked={f.terms} onChange={field('terms')} aria-invalid={!!err.terms} /><span><strong>Wajib.</strong> Saya menyetujui <Link to="/policies/terms">ketentuan layanan</Link> dan <Link to="/policies/privacy">kebijakan privasi</Link> EDU.</span></label>
                      {err.terms && <span role="alert" className="field-err">{err.terms}</span>}
                      <label className="check-l"><input type="checkbox" checked={f.marketing} onChange={field('marketing')} /><span><strong className="ink">Opsional.</strong> Kirimi saya info program EDU lainnya. Tidak memengaruhi pendaftaran.</span></label>
                    </div>
                    {err.form && <span role="alert" className="field-err">{err.form}</span>}
                    <div className="row-12">
                      <button type="submit" className="btn btn--ink btn--lg" disabled={busy}>{busy && <span className="spin-sm spin-sm--light" aria-hidden="true" />}{busy ? 'Mengirim…' : 'Kirim pendaftaran'}</button>
                      <button type="button" className="btn btn--ink-ghost btn--lg" onClick={() => go('summary')}>Kembali</button>
                    </div>
                  </form>
                )}
                {step === 'recorded' && (
                  <section role="status" className="co-card co-card--ok">
                    <span className="okmark"><Check size={26} /></span>
                    <h1 className="co-h">Pendaftaranmu sudah kami terima.</h1>
                    <p className="body-16">Tim EDU memverifikasi pendaftaran lalu mengirim detail akses ke <strong>{f.email}</strong>. Pendaftaran belum final sampai kamu menerima email tersebut.</p>
                    <dl className="kv">
                      <div><dt>Nomor referensi</dt><dd className="mono">{ref}</dd></div>
                      <div><dt>Program</dt><dd>{p.title}</dd></div>
                      <div><dt>{p.type === 'ebook' ? 'Format' : 'Jadwal'}</dt><dd>{p.type === 'ebook' ? p.fileFmt || 'E-book' : [whenOf(p), p.time].filter(Boolean).join(' · ')}</dd></div>
                    </dl>
                    <span className="small ink-muted">Belum ada email dalam 1×24 jam? Periksa folder spam, lalu <Link to="/help" className="strong ink">hubungi bantuan</Link> dengan nomor referensi di atas.</span>
                    <a href={`${STUDIO_ORIGIN}/daftar`} className="link-arrow ink">Simpan riwayat belajarmu: gabung EDU Learner (gratis) ↗</a>
                  </section>
                )}
              </div>
              <aside aria-label="Item" className="co-item">
                <span className="mono-label ink-muted">ITEM</span>
                <span className="strong lg-17">{p.title}</span>
                <span className="small ink-muted">{TYPE[p.type]} · {whenOf(p)}</span>
                <dl className="co-sum">
                  <div><dt>Harga</dt><dd>{priceOf(p)}</dd></div>
                  <div className="is-total"><dt>Total</dt><dd>{priceOf(p)}</dd></div>
                </dl>
                <Link to="/policies/refund" className="xs-13 strong">Kebijakan refund &amp; reschedule</Link>
              </aside>
            </div>
          </>
        )}
      </div>

      {modal && !paidBlocked && step === 'summary' && (
        <div className="gmodal" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setModal(false); }}>
          <div ref={dlg} className="gmodal__card" role="dialog" aria-modal="true" aria-labelledby="gm-h">
            <span className="mono-label ink-muted">EDU LEARNER · OPSIONAL</span>
            <h2 id="gm-h" className="h3">Mau sekalian membangun perjalanan belajarmu?</h2>
            <p className="body ink-muted">Sebagai EDU Learner, kamu bisa menyimpan riwayat belajar, mendapatkan peta pembelajaran, mengikuti assessment, dan menggunakan benefit yang sudah tersedia. Kamu tetap bisa mendaftar program ini tanpa membuat akun.</p>
            <div className="row-12 flex-wrap">
              <a href={`${STUDIO_ORIGIN}/daftar`} className="btn btn--primary">Gabung EDU Learner ↗</a>
              <button type="button" className="btn btn--ink-ghost" onClick={() => setModal(false)}>Lanjut Tanpa Akun</button>
            </div>
            <span className="xs-13 ink-muted">Gratis untuk membuat akun. Pendaftaran tidak menjamin diterima bekerja atau menjadi Ranger.</span>
          </div>
        </div>
      )}
    </div>
  );
}

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
);
