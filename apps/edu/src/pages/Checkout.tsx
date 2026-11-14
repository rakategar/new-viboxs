import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check } from '@viboxs/shared/icons';
import { reducedMotion } from '@viboxs/shared/motion';
import { NotFound } from './Misc';
import { TYPE, bySlug, emailOk, hrefOf, priceOf, rid, whenOf } from '../lib/data';

type Step = 'summary' | 'data' | 'redirect' | 'pending' | 'paid' | 'free' | 'failed';
const STEPPER = ['Ringkasan', 'Data diri', 'Pembayaran', 'Selesai'];
const stepIdx = (s: Step) => ({ summary: 0, data: 1, redirect: 2, pending: 2, failed: 2, paid: 3, free: 3 })[s];

/**
 * PROTOTIPE alur pendaftaran. Tidak ada transaksi nyata: status "terkonfirmasi" hanya boleh datang dari
 * server (webhook terverifikasi). Tombol simulasi di bawah berlabel jelas sebagai prototipe.
 */
export default function Checkout() {
  const { slug } = useParams();
  const p = bySlug(slug);
  const [step, setStep] = useState<Step>('summary');
  const [f, setF] = useState({ nama: '', email: '', wa: '', terms: false, marketing: false });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState('');
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  if (!p || ['CLOSED', 'CANCELLED', 'COMPLETED', 'FULL', 'ANNOUNCED'].includes(p.status)) return <NotFound />;

  const isEbook = p.type === 'ebook';
  const later = (fn: () => void, ms: number) => { setBusy(true); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => { setBusy(false); fn(); }, reducedMotion() ? 0 : ms); };
  const go = (s: Step) => { setStep(s); window.scrollTo(0, 0); };
  const field = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((x) => ({ ...x, [k]: v })); setErr((x) => ({ ...x, [k]: '' }));
  };
  function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.nama.trim()) er.nama = 'Tulis nama lengkapmu.';
    if (!emailOk(f.email)) er.email = 'Masukkan email yang valid — petunjuk akses dikirim ke sini.';
    if (!f.terms) er.terms = 'Persetujuan ketentuan wajib untuk melanjutkan.';
    setErr(er);
    if (Object.keys(er).length) { window.setTimeout(() => document.getElementById(`co-${Object.keys(er)[0]}`)?.focus(), 0); return; }
    later(() => { setOrder(`${p!.free ? 'REG' : 'EDU'}-${rid()}`); go(p!.free ? 'free' : 'redirect'); }, 800);
  }
  const cur = stepIdx(step);

  return (
    <div className="light pad-page checkout">
      <div className="container container--mid stack-32">
        <div className="row-between flex-wrap">
          <Link to={hrefOf(p)} className="back-link">← Kembali ke program</Link>
          <span className="row-8 xs-13 ink-muted"><LockIcon />Status mengikuti konfirmasi server</span>
        </div>
        <ol aria-label="Tahap pendaftaran" className="stepper" style={{ ['--prog' as string]: `${(cur / 3) * 100}%` }}>
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
                <h1 className="co-h">Ringkasan order</h1>
                <p className="body ink-muted">Periksa dulu apa yang kamu daftarkan. Belum ada yang ditagih di tahap ini.</p>
                <ul className="ticks ticks--plain">
                  <li><Check size={18} />Yang kamu terima tertulis di halaman program</li>
                  <li><Check size={18} />Akses dikirim ke email yang kamu isi di langkah berikutnya</li>
                  {!p.free && <li><Check size={18} />Ketentuan refund &amp; reschedule berlaku sesuai kebijakan pembelian</li>}
                </ul>
                <button type="button" className="btn btn--ink btn--lg self-start" onClick={() => go('data')}>Lanjut isi data →</button>
              </section>
            )}
            {step === 'data' && (
              <form className="co-card" onSubmit={submit} noValidate>
                <h1 className="co-h">Data diri</h1>
                <p className="body ink-muted">Hanya yang diperlukan untuk mengirim akses dan bukti.</p>
                <div className="fld">
                  <label htmlFor="co-nama">Nama lengkap</label>
                  <input id="co-nama" value={f.nama} onChange={field('nama')} autoComplete="name" aria-invalid={!!err.nama} aria-describedby={err.nama ? 'co-nama-e' : undefined} />
                  {err.nama && <span id="co-nama-e" role="alert" className="field-err">{err.nama}</span>}
                </div>
                <div className="fld">
                  <label htmlFor="co-email">Email</label>
                  <input id="co-email" type="email" value={f.email} onChange={field('email')} autoComplete="email" aria-invalid={!!err.email} aria-describedby="co-email-h" />
                  <span id="co-email-h" className="xs-13 ink-muted">Petunjuk akses dan bukti dikirim ke alamat ini.</span>
                  {err.email && <span role="alert" className="field-err">{err.email}</span>}
                </div>
                <div className="fld">
                  <label htmlFor="co-wa">Nomor WhatsApp <span className="opt-l">(opsional)</span></label>
                  <input id="co-wa" type="tel" value={f.wa} onChange={field('wa')} autoComplete="tel" placeholder="+62" />
                </div>
                <div className="consent">
                  <label className="check-l"><input id="co-terms" type="checkbox" checked={f.terms} onChange={field('terms')} aria-invalid={!!err.terms} /><span><strong>Wajib.</strong> Saya menyetujui <Link to="/policies/purchase">kebijakan pembelian</Link> dan <Link to="/policies/privacy">kebijakan privasi</Link> EDU.</span></label>
                  {err.terms && <span role="alert" className="field-err">{err.terms}</span>}
                  <label className="check-l"><input type="checkbox" checked={f.marketing} onChange={field('marketing')} /><span><strong className="ink">Opsional.</strong> Kirimi saya info program EDU lainnya. Tidak memengaruhi pendaftaran.</span></label>
                </div>
                <div className="row-12">
                  <button type="submit" className="btn btn--ink btn--lg" disabled={busy}>{busy && <span className="spin-sm spin-sm--light" aria-hidden="true" />}{busy ? 'Memproses…' : p.free ? 'Konfirmasi registrasi' : 'Buat order'}</button>
                  <button type="button" className="btn btn--ink-ghost btn--lg" onClick={() => go('summary')}>Kembali</button>
                </div>
              </form>
            )}
            {step === 'redirect' && (
              <section className="co-card">
                <h1 className="co-h">Kamu akan pindah ke halaman pembayaran</h1>
                <div className="handoff"><span className="handoff__a">EDU</span><span className="handoff__line" aria-hidden="true" /><span className="handoff__b">[Payment provider]</span></div>
                <ul className="bullets">
                  <li>Pembayaran diproses oleh penyedia pembayaran, bukan di situs ini.</li>
                  <li>Order <strong>{order}</strong> sudah tercatat. Jika kamu menutup halaman, kembali ke email untuk melanjutkan.</li>
                  <li>Setelah membayar, kamu otomatis kembali ke halaman status order.</li>
                </ul>
                <div className="row-12">
                  <button type="button" className="btn btn--primary btn--lg" disabled={busy} onClick={() => later(() => go('pending'), 600)}>Lanjut ke halaman pembayaran ↗</button>
                  <button type="button" className="btn btn--ink-ghost btn--lg" onClick={() => go('summary')}>Kembali ke ringkasan</button>
                </div>
              </section>
            )}
            {step === 'pending' && (
              <section role="status" className="co-card co-card--warn">
                <span className="row-10 pend-tag"><span className="spin-sm spin-sm--warn" aria-hidden="true" />MENUNGGU VERIFIKASI</span>
                <h1 className="co-h">Pembayaran sedang diverifikasi.</h1>
                <p className="body-16"><strong>Jangan membayar ulang sebelum status diperbarui.</strong> Halaman ini diperbarui setelah penyedia pembayaran mengonfirmasi.</p>
                <dl className="kv">
                  <div><dt>Nomor order</dt><dd className="mono">{order}</dd></div>
                  <div><dt>Batas waktu pembayaran</dt><dd>[Sesuai penyedia pembayaran]</dd></div>
                  <div><dt>Instruksi</dt><dd>Dikirim ke {f.email}</dd></div>
                </dl>
                <div className="row-12">
                  <button type="button" className="btn btn--ink" disabled={busy} onClick={() => later(() => go('paid'), 900)}>{busy && <span className="spin-sm spin-sm--light" aria-hidden="true" />}Periksa status</button>
                  <Link to="/help" className="link-arrow ink">Hubungi bantuan</Link>
                </div>
                <div className="proto">
                  <span className="mono">PROTOTIPE · simulasikan respons server:</span>
                  <button type="button" onClick={() => later(() => go('paid'), 900)}>Terkonfirmasi</button>
                  <button type="button" onClick={() => later(() => go('failed'), 900)}>Gagal / kedaluwarsa</button>
                </div>
              </section>
            )}
            {step === 'paid' && (
              <section role="status" className="co-card co-card--ok">
                <span className="okmark"><Check size={26} /></span>
                <h1 className="co-h">Pembayaran terkonfirmasi.</h1>
                <p className="body-16">Petunjuk akses dikirim ke email yang kamu gunakan: <strong>{f.email}</strong>.</p>
                <dl className="kv">
                  <div><dt>Order ID</dt><dd className="mono">{order}</dd></div>
                  <div><dt>Program</dt><dd>{p.title}</dd></div>
                  <div><dt>{isEbook ? 'Format' : 'Jadwal'}</dt><dd>{isEbook ? p.fileFmt : `${whenOf(p)} · ${p.time}`}</dd></div>
                </dl>
                <span className="small ink-muted">Email belum masuk dalam 15 menit? Periksa folder spam, lalu <Link to="/help" className="strong ink">hubungi bantuan</Link> dengan Order ID di atas.</span>
              </section>
            )}
            {step === 'free' && (
              <section role="status" className="co-card co-card--ok">
                <span className="okmark"><Check size={26} /></span>
                <h1 className="co-h">Registrasimu terkonfirmasi.</h1>
                <p className="body-16">Tiket dan link sesi dikirim ke <strong>{f.email}</strong>. Pengingat dikirim H-1 dan 1 jam sebelum sesi.</p>
                <div className="ticket">
                  <span className="stack-4"><span className="mono xxs ls-08 o70">TIKET · {order}</span><span className="strong lg-18">{p.title}</span><span className="small o80">{whenOf(p)} · {p.time}</span></span>
                  <span className="ticket__mode">{p.mode}</span>
                </div>
                <span className="small ink-muted">Berhalangan hadir? Batalkan lewat tautan di email konfirmasi agar kursinya bisa dipakai peserta lain.</span>
              </section>
            )}
            {step === 'failed' && (
              <section role="alert" className="co-card co-card--err">
                <span className="xs-13 strong err-tag">PEMBAYARAN TIDAK BERHASIL / KEDALUWARSA</span>
                <h1 className="co-h">Kami belum dapat memproses permintaanmu.</h1>
                <p className="body-16">Coba lagi atau hubungi bantuan. Order <span className="mono">{order}</span> ditandai kedaluwarsa, jadi tidak ada tagihan ganda saat kamu mencoba lagi.</p>
                <div className="row-12">
                  <button type="button" className="btn btn--ink btn--lg" onClick={() => { setOrder(''); go('summary'); }}>Coba lagi</button>
                  <Link to="/help" className="btn btn--ink-ghost btn--lg">Hubungi bantuan</Link>
                </div>
              </section>
            )}
          </div>
          <aside aria-label="Item order" className="co-item">
            <span className="mono-label ink-muted">ITEM · [CONTOH]</span>
            <span className="strong lg-17">{p.title}</span>
            <span className="small ink-muted">{TYPE[p.type]} · {whenOf(p)}</span>
            <dl className="co-sum">
              <div><dt>Harga</dt><dd>{priceOf(p)}</dd></div>
              {!p.free && <div><dt>Pajak &amp; biaya</dt><dd>[menunggu]</dd></div>}
              <div className="is-total"><dt>Total</dt><dd>{priceOf(p)}</dd></div>
            </dl>
            <Link to="/policies/purchase" className="xs-13 strong">Kebijakan pembelian &amp; refund</Link>
          </aside>
        </div>
      </div>
    </div>
  );
}

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
);
