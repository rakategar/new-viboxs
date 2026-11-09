import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check } from '@viboxs/shared/icons';
import { Split } from '@viboxs/shared/fx';
import { useMotion } from '@viboxs/shared/motion';
import { IcAlert, IcCopy, IcLock, IcWifiOff, catIcon } from '../components/icons';
import { BUDGET, CATS, HORIZON, INTAKE_ENDPOINT, JENIS, ORGS, STATUSES, WA, catLabel, type CatKey } from '../lib/content';

type F = {
  kategori: string; jenis: string; org: string; hasil: string; status: string;
  nama: string; email: string; waCode: string; wa: string; orgName: string; horizon: string; budget: string;
  privacy: boolean; marketing: boolean; website: string; // website = honeypot
};
const EMPTY: F = { kategori: '', jenis: '', org: '', hasil: '', status: '', nama: '', email: '', waCode: '+62', wa: '', orgName: '', horizon: '', budget: '', privacy: false, marketing: false, website: '' };
type Status = 'idle' | 'submitting' | 'success' | 'error' | 'offline';
type Sim = 'ok' | 'error' | 'offline';

const DEV = import.meta.env.DEV;
const isOffline = () => !window.navigator.onLine;
/** Formulir hanya aktif bila ada penerima brief. Di dev tanpa endpoint → simulasi berlabel (tidak pernah ikut build produksi). */
const FORM_OFF = !INTAKE_ENDPOINT && !DEV;
const SIMULATE = !INTAKE_ENDPOINT && DEV;

function v1(f: F) {
  const e: Partial<Record<keyof F, string>> = {};
  const h = f.hasil.trim();
  if (!f.kategori) e.kategori = 'Pilih satu kategori — atau pilih "Belum yakin"';
  if (!f.jenis) e.jenis = 'Pilih jenis kebutuhan';
  if (!h) e.hasil = 'Ceritakan hasil yang Anda harapkan';
  else if (h.length < 20) e.hasil = `Tambahkan sedikit detail — minimal 20 karakter (sekarang ${h.length})`;
  else if (h.length > 2000) e.hasil = 'Maksimal 2000 karakter';
  return e;
}
function v2(f: F) {
  const e: Partial<Record<keyof F, string>> = {};
  const m = f.email.trim(), w = f.wa.replace(/[\s-]/g, '');
  if (!f.nama.trim()) e.nama = 'Isi nama Anda';
  if (!m) e.email = 'Isi alamat email Anda';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m)) e.email = 'Format email belum lengkap, contoh nama@domain.id';
  if (w && !/^\d{8,15}$/.test(w)) e.wa = 'Nomor belum valid — isi 8–15 digit tanpa kode negara';
  if (!f.privacy) e.privacy = 'Setujui kebijakan privasi untuk mengirim kebutuhan';
  return e;
}
const ERR_ORDER: [keyof F, string][] = [['kategori', 'st-kategori'], ['jenis', 'st-jenis'], ['hasil', 'st-hasil'], ['nama', 'st-nama'], ['email', 'st-email'], ['wa', 'st-wa'], ['privacy', 'st-privacy']];

export default function Start() {
  const [sp] = useSearchParams();
  const pre = useMemo<F>(() => {
    const kat = sp.get('kategori') || '';
    const jenis = sp.get('jenis') || '';
    const org = sp.get('org') || '';
    return {
      ...EMPTY,
      kategori: CATS.some((c) => c.k === kat) ? kat : '',
      jenis: JENIS.some(([v]) => v === jenis) ? jenis : '',
      org: ORGS.some(([v]) => v === org) ? org : '',
      hasil: (sp.get('hasil') || '').slice(0, 2000),
    };
  }, [sp]);
  const from = sp.get('from') || '';

  const [step, setStep] = useState<1 | 2>(1);
  const [f, setF] = useState<F>(pre);
  const [err, setErr] = useState<Partial<Record<keyof F, string>>>({});
  const [status, setStatus] = useState<Status>('idle');
  const [refNo, setRefNo] = useState('');
  const [sim, setSim] = useState<Sim>('ok');
  const [copied, setCopied] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  useMotion(rootRef);

  useEffect(() => { setF(pre); setStep(1); setErr({}); setStatus('idle'); }, [pre]);

  const set = <K extends keyof F>(k: K, v: F[K]) => {
    setF((o) => ({ ...o, [k]: v }));
    if (err[k]) setErr((e) => { const n = { ...e }; delete n[k]; return n; });
  };
  const toTop = () => {
    const el = topRef.current;
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: 'smooth' });
  };
  const focusSummary = () => setTimeout(() => summaryRef.current?.focus(), 0);

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (status === 'submitting' || FORM_OFF) return;
    if (step === 1) {
      const e = v1(f);
      if (Object.keys(e).length) { setErr(e); focusSummary(); return; }
      setErr({}); setStep(2); toTop(); return;
    }
    const e = v2(f);
    if (Object.keys(e).length) { setErr(e); setStatus('idle'); focusSummary(); return; }
    setErr({});
    if (f.website) return; // honeypot terisi → abaikan diam-diam
    setStatus('submitting');

    if (SIMULATE) {
      window.setTimeout(() => {
        if (sim === 'offline' || isOffline()) setStatus('offline');
        else if (sim === 'error') setStatus('error');
        else { setRefNo(`SIMULASI-${Math.floor(1000 + Math.random() * 9000)}`); setStatus('success'); toTop(); }
      }, 1400);
      return;
    }
    if (isOffline()) { setStatus('offline'); return; }
    const ac = new AbortController();
    const to = window.setTimeout(() => ac.abort(), 15000);
    try {
      const { website: _hp, ...payload } = f;
      void _hp;
      const res = await fetch(INTAKE_ENDPOINT as string, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, hasil: f.hasil.trim(), source: 'services.viboxs.com/start', from }),
        signal: ac.signal,
      });
      const data = await res.json().catch(() => null);
      // Sukses HANYA bila server menyimpan dan mengembalikan nomor referensi.
      if (res.ok && data && typeof data.ref === 'string' && data.ref) { setRefNo(data.ref); setStatus('success'); toTop(); }
      else setStatus('error');
    } catch {
      setStatus(isOffline() ? 'offline' : 'error');
    } finally {
      window.clearTimeout(to);
    }
  }

  const reset = () => { setF({ ...EMPTY }); setStep(1); setErr({}); setStatus('idle'); setRefNo(''); setCopied(false); toTop(); };
  const copy = async () => {
    try { await navigator.clipboard.writeText(refNo); setCopied(true); window.setTimeout(() => setCopied(false), 2400); } catch { /* clipboard tidak tersedia */ }
  };

  const errList = ERR_ORDER.filter(([k]) => err[k]);
  const sumKat = catLabel(f.kategori);
  const sumJenis = JENIS.find(([v]) => v === f.jenis)?.[1] || '';
  const disabled = FORM_OFF || status === 'submitting';

  return (
    <section className="st" ref={rootRef}>
      <div className="st__glow" aria-hidden="true" />
      <div className="container st__grid">
        <aside className="st__aside stack-24">
          <span className="mono-label">START A MISSION · KIRIM KEBUTUHAN</span>
          <Split as="h1" className="h2 st__h" text="Ceritakan kebutuhan Anda. Kami akan membantu mengarahkan langkah berikutnya." />
          <p className="body-17 muted" data-anim="up">Ceritakan kebutuhan Anda, tanpa komitmen biaya.</p>
          {from && <span className="from-chip" data-anim="up"><span className="xs muted">Dipilih dari:</span><strong>{from}</strong></span>}
          <div className="after" data-build="Panel · setelah mengirim">
            <span className="eyebrow">Setelah Anda mengirim</span>
            <ol>
              <li><span>1</span><span>Kami membaca brief dan memastikan kategorinya.</span></li>
              <li><span>2</span><span>Bila relevan, kami mengajak discovery untuk memahami konteks.</span></li>
              <li><span>3</span><span>Solusi, estimasi biaya, dan ketentuan kerja ditulis dalam proposal.</span></li>
            </ol>
            <span className="xs-13 muted">Kebutuhan yang tidak feasible bisa kami tolak, dengan alasan yang jelas.</span>
          </div>
          {SIMULATE && (
            <div className="sim">
              <span className="mono-label">KONTROL PROTOTIPE · HANYA DI MODE DEV</span>
              <div role="radiogroup" aria-label="Simulasi respons server" className="sim__opts">
                {([['ok', 'Berhasil'], ['error', 'Server error'], ['offline', 'Offline']] as [Sim, string][]).map(([k, l]) => (
                  <button key={k} type="button" role="radio" aria-checked={sim === k} className={sim === k ? 'is-on' : ''} onClick={() => setSim(k)}>{l}</button>
                ))}
              </div>
              <span className="xxs muted">Tidak ada data yang dikirim. Set VITE_INTAKE_ENDPOINT untuk mengirim sungguhan.</span>
            </div>
          )}
        </aside>

        <div className="st__main" ref={topRef}>
          {status !== 'success' ? (
            <div className="st__card" data-build="Form · Start a Mission">
              <div className="st__progress">
                <span className="xs-13 strong">Langkah {step} dari 2</span>
                <ol aria-label="Progres formulir" className="steps">
                  <li className={step === 1 ? 'is-cur' : 'is-done'} aria-current={step === 1 ? 'step' : undefined}>
                    <span className="steps__dot">{step === 2 ? <Check size={12} /> : null}</span><span>1 · Kebutuhan</span>
                  </li>
                  <li className={step === 2 ? 'is-cur' : ''} aria-current={step === 2 ? 'step' : undefined}>
                    <span className="steps__dot" /><span>2 · Kontak</span>
                  </li>
                </ol>
                <div className="steps__bar" aria-hidden="true"><span style={{ transform: `scaleX(${step === 1 ? 0.5 : 1})` }} /></div>
              </div>

              {FORM_OFF && (
                <div role="status" className="note note--warn">
                  <span className="row-10"><IcLock size={18} /><strong>Formulir belum dibuka</strong></span>
                  <span>Kami menyiapkan kebijakan privasi dan penerima permintaan sebelum formulir dibuka. Sementara itu, pelajari <Link to="/process">proses kerja kami</Link> atau hubungi <span className="slot">[email resmi — menunggu verifikasi]</span>.</span>
                </div>
              )}
              {errList.length > 0 && (
                <div ref={summaryRef} tabIndex={-1} role="alert" className="note note--err">
                  <strong className="row-8"><IcAlert size={16} />{errList.length} isian perlu diperbaiki</strong>
                  <ul>{errList.map(([k, id]) => <li key={k}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.focus(); document.getElementById(id)?.scrollIntoView({ block: 'center' }); }}>{err[k]}</a></li>)}</ul>
                  <span className="xs-13 muted">Isian Anda tetap tersimpan.</span>
                </div>
              )}
              {status === 'error' && (
                <div role="alert" className="note note--err">
                  <strong className="row-8"><IcAlert size={16} />Belum berhasil dikirim. Coba lagi.</strong>
                  <span>Server tidak merespons. Isian Anda tidak hilang.</span>
                </div>
              )}
              {status === 'offline' && (
                <div role="alert" className="note note--warn">
                  <strong className="row-8"><IcWifiOff size={16} />Koneksi terputus; permintaan belum terkirim.</strong>
                  <span>Isian Anda tetap di halaman ini. Kirim ulang setelah koneksi kembali, atau gunakan kanal alternatif: <span className="slot">[email resmi — menunggu verifikasi]</span></span>
                </div>
              )}
              {status === 'submitting' && (
                <div role="status" className="note note--info"><span className="row-10"><span className="spinner" />Sedang mengirim; jangan tutup halaman.</span></div>
              )}

              <form noValidate onSubmit={submit}>
                <fieldset disabled={disabled} className="st__fs">
                  <div className="hp" aria-hidden="true">
                    <label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set('website', e.target.value)} /></label>
                  </div>
                  {step === 1 ? (
                    <div className="stack-32 st__step" key="s1">
                      <fieldset className="field" id="st-kategori" tabIndex={-1} aria-describedby={err.kategori ? 'st-kategori-err' : undefined}>
                        <legend>Kategori kebutuhan <span className="req">· wajib</span></legend>
                        <div className="cats">
                          {CATS.map((c) => {
                            const Ic = catIcon[c.k as CatKey];
                            const sel = f.kategori === c.k;
                            return (
                              <label key={c.k} className={`cat ${sel ? 'is-sel' : ''} ${c.k === 'unsure' ? 'cat--unsure' : ''}`}>
                                <input type="radio" name="kategori" value={c.k} checked={sel} onChange={() => set('kategori', c.k)} />
                                <span className="cat__ic"><Ic size={18} /></span>
                                <span className="stack-2"><b>{c.t}</b><span>{c.d}</span></span>
                                <span className="cat__tick" aria-hidden="true"><Check size={12} /></span>
                              </label>
                            );
                          })}
                        </div>
                        {err.kategori && <span id="st-kategori-err" className="field__err">! {err.kategori}</span>}
                      </fieldset>

                      <fieldset className="field" id="st-jenis" tabIndex={-1}>
                        <legend>Jenis kebutuhan <span className="req">· wajib</span></legend>
                        <div className="pills">
                          {JENIS.map(([v, l]) => (
                            <label key={v} className={f.jenis === v ? 'is-sel' : ''}><input type="radio" name="jenis" value={v} checked={f.jenis === v} onChange={() => set('jenis', v)} />{l}</label>
                          ))}
                        </div>
                        {err.jenis && <span className="field__err">! {err.jenis}</span>}
                      </fieldset>

                      <fieldset className="field">
                        <legend>Jenis organisasi <span className="opt">· opsional</span></legend>
                        <div className="pills">
                          {ORGS.map(([v, l]) => (
                            <label key={v} className={f.org === v ? 'is-sel' : ''}><input type="radio" name="org" value={v} checked={f.org === v} onChange={() => set('org', v)} />{l}</label>
                          ))}
                        </div>
                      </fieldset>

                      <div className="field">
                        <label htmlFor="st-hasil">Hasil yang diharapkan <span className="req">· wajib</span></label>
                        <span id="st-hasil-hint" className="xs-13 muted">Apa yang ingin berubah setelah proyek selesai? Siapa yang memakainya? Proses apa yang sekarang menghambat?</span>
                        <textarea
                          id="st-hasil" rows={5} maxLength={2000} value={f.hasil}
                          onChange={(e) => set('hasil', e.target.value)}
                          aria-invalid={!!err.hasil}
                          aria-describedby={`st-hasil-hint st-hasil-count${err.hasil ? ' st-hasil-err' : ''}`}
                          placeholder="Contoh: booking tiga cabang masih lewat chat; kami ingin pelanggan memilih jadwal sendiri dan admin menerima notifikasi."
                        />
                        <div className="row-between">
                          {err.hasil ? <span id="st-hasil-err" className="field__err">! {err.hasil}</span> : <span />}
                          <span id="st-hasil-count" className={`xs muted counter ${f.hasil.trim().length >= 20 ? 'is-ok' : ''}`}>{f.hasil.length} / 2000 · minimal 20 karakter</span>
                        </div>
                      </div>

                      <fieldset className="field">
                        <legend>Status saat ini <span className="opt">· opsional</span></legend>
                        <div className="pills">
                          {STATUSES.map(([v, l]) => (
                            <label key={v} className={f.status === v ? 'is-sel' : ''}><input type="radio" name="status" value={v} checked={f.status === v} onChange={() => set('status', v)} />{l}</label>
                          ))}
                        </div>
                      </fieldset>
                    </div>
                  ) : (
                    <div className="stack-24 st__step" key="s2">
                      <div className="recap">
                        <div className="row-between"><span className="eyebrow">Ringkasan langkah 1</span><button type="button" className="btn-text" onClick={() => setStep(1)}>Ubah</button></div>
                        <span className="small strong">{sumKat} · {sumJenis}</span>
                        <span className="small muted recap__txt">{f.hasil.trim()}</span>
                      </div>
                      <div className="grid-2">
                        <div className="field">
                          <label htmlFor="st-nama">Nama <span className="req">· wajib</span></label>
                          <input id="st-nama" value={f.nama} onChange={(e) => set('nama', e.target.value)} aria-invalid={!!err.nama} aria-describedby={err.nama ? 'st-nama-err' : undefined} autoComplete="name" />
                          {err.nama && <span id="st-nama-err" className="field__err">! {err.nama}</span>}
                        </div>
                        <div className="field">
                          <label htmlFor="st-email">Email <span className="req">· wajib</span></label>
                          <input id="st-email" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} aria-invalid={!!err.email} aria-describedby={err.email ? 'st-email-err' : undefined} autoComplete="email" placeholder="nama@domain.id" />
                          {err.email && <span id="st-email-err" className="field__err">! {err.email}</span>}
                        </div>
                        <div className="field">
                          <label htmlFor="st-wa">WhatsApp <span className="opt">· opsional</span></label>
                          <div className="wa">
                            <select aria-label="Kode negara" value={f.waCode} onChange={(e) => set('waCode', e.target.value)}>{WA.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                            <input id="st-wa" type="tel" value={f.wa} onChange={(e) => set('wa', e.target.value)} aria-invalid={!!err.wa} aria-describedby={err.wa ? 'st-wa-err' : undefined} autoComplete="tel-national" placeholder="812 3456 7890" />
                          </div>
                          {err.wa && <span id="st-wa-err" className="field__err">! {err.wa}</span>}
                        </div>
                        <div className="field">
                          <label htmlFor="st-orgname">Nama organisasi <span className="opt">· opsional</span></label>
                          <input id="st-orgname" value={f.orgName} onChange={(e) => set('orgName', e.target.value)} aria-describedby="st-orgname-hint" autoComplete="organization" />
                          <span id="st-orgname-hint" className="xs muted">OPC tidak wajib memiliki PT.</span>
                        </div>
                        <div className="field">
                          <label htmlFor="st-horizon">Batas waktu <span className="opt">· opsional</span></label>
                          <select id="st-horizon" value={f.horizon} onChange={(e) => set('horizon', e.target.value)}><option value="">Pilih horizon</option>{HORIZON.map((o) => <option key={o} value={o}>{o}</option>)}</select>
                        </div>
                        <div className="field">
                          <label htmlFor="st-budget">Anggaran <span className="opt">· opsional</span></label>
                          <select id="st-budget" value={f.budget} onChange={(e) => set('budget', e.target.value)}><option value="">Pilih salah satu</option>{BUDGET.map((o) => <option key={o} value={o}>{o}</option>)}</select>
                        </div>
                      </div>
                      <label id="st-privacy" tabIndex={-1} className={`consent ${err.privacy ? 'is-err' : ''}`}>
                        <input type="checkbox" checked={f.privacy} onChange={(e) => set('privacy', e.target.checked)} aria-invalid={!!err.privacy} />
                        <span className="stack-4">
                          <span className="strong">Saya menyetujui kebijakan privasi <span className="req">· wajib</span></span>
                          <span className="xs-13 muted">Data dipakai untuk menindaklanjuti permintaan ini. <Link to="/privacy">Baca kebijakan privasi</Link></span>
                          {err.privacy && <span className="field__err">! {err.privacy}</span>}
                        </span>
                      </label>
                      <div className="optin">
                        <span className="xs muted">Opsional · terpisah dari persetujuan di atas</span>
                        <label className="consent consent--plain">
                          <input type="checkbox" checked={f.marketing} onChange={(e) => set('marketing', e.target.checked)} />
                          <span className="small">Kirimi saya kabar program dan aktivitas VIBOXS. Bisa berhenti kapan saja.</span>
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="st__actions">
                    {step === 1 ? (
                      <>
                        <span className="xs-13 muted">Berikutnya: data kontak.</span>
                        <button type="submit" className="btn btn--primary">Lanjut ke kontak <ArrowRight /></button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="btn btn--ghost" onClick={() => { setStep(1); setStatus('idle'); }}>← Kembali</button>
                        <button type="submit" className="btn btn--primary">
                          {status === 'submitting' && <span className="spinner" />}
                          {status === 'submitting' ? 'Mengirim…' : status === 'error' || status === 'offline' ? 'Kirim ulang' : 'Kirim kebutuhan'}
                        </button>
                      </>
                    )}
                  </div>
                </fieldset>
              </form>
            </div>
          ) : (
            <div role="status" className="st__card success">
              <span className="success__burst" aria-hidden="true"><Check size={28} /></span>
              <div className="stack-8">
                <h2 className="h2-sm">Permintaan diterima.</h2>
                <p className="body-16 muted">Proses tindak lanjut sesuai kanal yang Anda isi. Simpan nomor referensi untuk korespondensi.</p>
              </div>
              <div className="ref">
                <span className="stack-4"><span className="xs muted">Nomor referensi</span><code className="ref__no">{refNo}</code></span>
                <button type="button" className="btn btn--ghost btn--sm" onClick={copy}><IcCopy size={16} />{copied ? 'Tersalin' : 'Salin nomor'}</button>
              </div>
              <dl className="kv">
                <div><dt>Kategori</dt><dd>{sumKat}</dd></div>
                <div><dt>Jenis</dt><dd>{sumJenis}</dd></div>
                <div><dt>Hasil</dt><dd>{f.hasil.trim()}</dd></div>
                <div><dt>Kontak</dt><dd>{f.nama} · {f.email}</dd></div>
              </dl>
              <span className="xs-13 muted">Konfirmasi ini tampil setelah server menerima permintaan. Mengirim brief bukan kontrak.</span>
              <div className="row-12">
                <Link to="/process" className="btn btn--light btn--sm">Lihat tahap berikutnya <ArrowRight /></Link>
                <button type="button" className="btn btn--ghost btn--sm" onClick={reset}>Kirim kebutuhan lain</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
