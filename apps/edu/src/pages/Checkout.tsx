import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check } from '@viboxs/shared/icons';
import { STUDIO_ORIGIN } from '@viboxs/shared/ecosystem';
import { callEdge } from '@viboxs/shared/backend';
import { NotFound } from './Misc';
import NotifyForm from '../components/NotifyForm';
import { TYPE, bySlug, canPay, emailOk, hrefOf, isQa, priceOf, whenOf } from '../lib/data';
import { saveOrderToken } from './Order';

type Step = 'summary' | 'data';
const STEPPER = ['Ringkasan', 'Data diri', 'Konfirmasi'];
const stepIdx = (s: Step) => ({ summary: 0, data: 1 })[s];
const OPEN = ['OPEN', 'RESCHEDULED', 'AVAILABLE'];

/** Satu kunci idempotensi per program + email di tab ini: klik ganda / retry tidak membuat order kedua. */
function idemKey(slug: string, email: string) {
  const k = `edu-idem:${slug}:${email.trim().toLowerCase()}`;
  try {
    const v = sessionStorage.getItem(k);
    if (v) return v;
    const n = crypto.randomUUID();
    sessionStorage.setItem(k, n);
    return n;
  } catch { return crypto.randomUUID(); }
}

/**
 * Checkout publik EDU (guest). Order dibuat server (edu-checkout) dari harga di database; program berbayar diteruskan
 * ke halaman pembayaran Midtrans. Status lunas TIDAK pernah ditentukan di klien — halaman /order membaca server (CHE-008).
 */
export default function Checkout() {
  const { slug } = useParams();
  const nav = useNavigate();
  const p = bySlug(slug);
  const [step, setStep] = useState<Step>('summary');
  const [f, setF] = useState({ nama: '', email: '', wa: '', terms: false, marketing: false, hp: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'' | 'order' | 'redirect'>('');
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
  const paidBlocked = !canPay(p);

  const go = (s: Step) => { setStep(s); window.scrollTo(0, 0); };
  const field = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((x) => ({ ...x, [k]: v })); setErr((x) => ({ ...x, [k]: '' }));
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const er: Record<string, string> = {};
    if (f.nama.trim().length < 2) er.nama = 'Tulis nama lengkapmu.';
    if (!emailOk(f.email)) er.email = p!.free ? 'Masukkan email yang valid — detail akses dikirim ke sini.' : 'Masukkan email yang valid — bukti bayar & akses dikirim ke sini.';
    if (!f.terms) er.terms = 'Persetujuan ketentuan wajib untuk melanjutkan.';
    setErr(er);
    if (Object.keys(er).length) { window.setTimeout(() => document.getElementById(`co-${Object.keys(er)[0]}`)?.focus(), 0); return; }
    setBusy('order');
    try {
      const { status, data } = await callEdge<{ order_no: string; access_token?: string; redirect_url?: string | null }>('edu-checkout', {
        slug: p!.slug, name: f.nama.trim(), email: f.email.trim(), phone: f.wa.trim(), idempotency_key: idemKey(p!.slug, f.email),
        marketing: f.marketing, terms_version: 'edu-terms-draft-2026-11', privacy_version: 'edu-privacy-draft-2026-11', qa: isQa(p!), _hp: f.hp,
      });
      if (status === 200 && data.order_no) {
        if (data.access_token) saveOrderToken(data.order_no, data.access_token);
        if (data.redirect_url) { setBusy('redirect'); window.location.assign(data.redirect_url); return; }
        nav(`/order/${data.order_no}`);
        return;
      }
      setErr({ form: data.code === 'ALREADY_OWNED' ? 'Email ini sudah memiliki akses ke program ini. Buka email akses sebelumnya, atau hubungi bantuan untuk kirim ulang.' : data.error || 'Order belum bisa dibuat. Coba lagi.' });
    } catch {
      setErr({ form: 'Order belum bisa dibuat. Coba lagi sebentar.' });
    }
    setBusy('');
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
                    <p className="body ink-muted">{p.free ? 'Periksa dulu apa yang kamu daftarkan. Program ini gratis — tidak ada tagihan.' : `Total yang dibayar ${priceOf(p)}. Pembayaran diproses Midtrans; akses terbuka setelah server menerima konfirmasi pembayaran.`}</p>
                    <ul className="ticks ticks--plain">
                      <li><Check size={18} />Yang kamu terima tertulis di halaman program</li>
                      <li><Check size={18} />{p.free ? 'Detail akses tampil di halaman konfirmasi dan dikirim ke emailmu' : 'Akses dibuka otomatis setelah pembayaran terverifikasi server'}</li>
                      <li><Check size={18} />Tautan sesi bersifat privat, hanya untuk pemilik pendaftaran</li>
                    </ul>
                    <button type="button" className="btn btn--ink btn--lg self-start" onClick={() => go('data')}>Lanjut isi data →</button>
                  </section>
                )}
                {step === 'data' && (
                  <form className="co-card" onSubmit={submit} noValidate>
                    <h1 className="co-h">Data diri</h1>
                    <p className="body ink-muted">Hanya yang diperlukan untuk mengirim detail akses{p.free ? '' : ' dan bukti pembayaran'}.</p>
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
                      <button type="submit" className="btn btn--ink btn--lg" disabled={!!busy}>{busy && <span className="spin-sm spin-sm--light" aria-hidden="true" />}{busy === 'redirect' ? 'Membuka halaman pembayaran…' : busy ? 'Membuat order…' : p.free ? 'Daftar sekarang' : `Bayar ${priceOf(p)}`}</button>
                      <button type="button" className="btn btn--ink-ghost btn--lg" onClick={() => go('summary')}>Kembali</button>
                    </div>
                  </form>
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
                {!p.free && <span className="xs-13 ink-muted">Dibayar lewat Midtrans (VA, e-wallet, QRIS, kartu). Jangan bayar ulang bila status masih menunggu — periksa di halaman order.</span>}
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
            <a href={`${STUDIO_ORIGIN}/learn/checkout/${p.slug}`} className="xs-13 strong">Sudah punya akun? Checkout lewat Studio agar langsung masuk My Learning ↗</a>
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
