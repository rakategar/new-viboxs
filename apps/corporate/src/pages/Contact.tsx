import { useRef, useState, type FormEvent } from 'react';
import DestLink from '../components/DestLink';
import { Split } from '../components/fx';
import { ArrowRight } from '../components/Icons';
import { CONTACT_FORM_ENDPOINT, DEST, INTENTS, type DestKey, isPending } from '../lib/content';
import { useMotion } from '../lib/motion';

type C = { nama: string; via: 'email' | 'wa'; kontak: string; pesan: string; privacy: boolean };
type Errs = Partial<Record<keyof C, string>>;
const EMPTY: C = { nama: '', via: 'email', kontak: '', pesan: '', privacy: false };

function validate(c: C): Errs {
  const e: Errs = {};
  const k = c.kontak.trim();
  if (!c.nama.trim()) e.nama = 'Isi nama Anda';
  if (c.via === 'email') {
    if (!k) e.kontak = 'Isi alamat email Anda';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(k)) e.kontak = 'Format email belum lengkap, contoh nama@domain.id';
  } else {
    const d = k.replace(/[\s-]/g, '');
    if (!d) e.kontak = 'Isi nomor WhatsApp Anda';
    else if (!/^(\+62|62|0)8\d{7,12}$/.test(d)) e.kontak = 'Nomor belum valid, contoh 0812 3456 7890';
  }
  const p = c.pesan.trim();
  if (!p) e.pesan = 'Tulis ringkasan pesan Anda';
  else if (p.length < 10) e.pesan = 'Ceritakan sedikit lebih detail (minimal 10 karakter)';
  if (!c.privacy) e.privacy = 'Setujui kebijakan privasi untuk mengirim pesan';
  return e;
}

function ContactForm({ endpoint }: { endpoint: string }) {
  const [c, setC] = useState<C>(EMPTY);
  const [err, setErr] = useState<Errs>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [refNo, setRefNo] = useState('');
  const summaryRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof C>(k: K, v: C[K]) => {
    const nc = { ...c, [k]: v };
    setC(nc);
    if (err[k] && !validate(nc)[k]) { const ne = { ...err }; delete ne[k]; setErr(ne); }
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (status === 'loading') return;
    const errs = validate(c);
    if (Object.keys(errs).length) { setErr(errs); setTimeout(() => summaryRef.current?.focus(), 0); return; }
    setErr({}); setStatus('loading');
    try {
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) });
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json().catch(() => ({}));
      if (!j.ref) throw new Error('no-ref'); // sukses hanya bila server mengonfirmasi penyimpanan
      setRefNo(String(j.ref)); setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  const errList = (['nama', 'kontak', 'pesan', 'privacy'] as const).filter((k) => err[k]).map((k) => ({ href: k === 'privacy' ? '#c-privacy' : `#c-${k}`, msg: err[k]! }));

  if (status === 'success') {
    return (
      <div className="form-card"><div role="status" className="note note--ok">
        <strong>✓ Pesan diterima</strong>
        <span>Jika perlu, tim akan menghubungi melalui kontak yang Anda berikan.</span>
        <span className="small">Nomor referensi <code className="mono strong">{refNo}</code></span>
        <button type="button" className="btn btn--ghost btn--sm self-start" onClick={() => { setC(EMPTY); setStatus('idle'); }}>Kirim pesan lain</button>
      </div></div>
    );
  }
  return (
    <form noValidate className="form-card" onSubmit={submit}>
      {errList.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="note note--err">
          <strong>! {errList.length} isian perlu diperbaiki</strong>
          <ul>{errList.map((x) => <li key={x.href}><a href={x.href}>{x.msg}</a></li>)}</ul>
        </div>
      )}
      {status === 'error' && <div role="alert" className="note note--warn"><strong>! Pesan belum terkirim</strong><span>Periksa koneksi atau coba kembali. Isian Anda tidak hilang.</span></div>}
      <div className="field">
        <label htmlFor="c-nama">Nama</label>
        <input id="c-nama" value={c.nama} onChange={(e) => set('nama', e.target.value)} aria-invalid={!!err.nama} aria-describedby="c-nama-err" autoComplete="name" />
        {err.nama && <span id="c-nama-err" className="field__err">! {err.nama}</span>}
      </div>
      <fieldset className="field">
        <legend>Hubungi saya melalui</legend>
        <div className="seg">
          {([['email', 'Email'], ['wa', 'WhatsApp']] as const).map(([k, l]) => (
            <label key={k} className={c.via === k ? 'is-sel' : ''}><input type="radio" name="via" value={k} checked={c.via === k} onChange={() => { setC({ ...c, via: k, kontak: '' }); const ne = { ...err }; delete ne.kontak; setErr(ne); }} />{l}</label>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor="c-kontak">{c.via === 'email' ? 'Email' : 'Nomor WhatsApp'}</label>
        <span id="c-kontak-hint" className="xs-13 muted">Pilih satu saja. Kami hanya memakainya untuk menanggapi pesan ini.</span>
        <input id="c-kontak" type={c.via === 'email' ? 'email' : 'tel'} value={c.kontak} onChange={(e) => set('kontak', e.target.value)}
          placeholder={c.via === 'email' ? 'nama@domain.id' : '0812 3456 7890'} autoComplete={c.via === 'email' ? 'email' : 'tel'}
          aria-invalid={!!err.kontak} aria-describedby="c-kontak-hint c-kontak-err" />
        {err.kontak && <span id="c-kontak-err" className="field__err">! {err.kontak}</span>}
      </div>
      <div className="field">
        <label htmlFor="c-pesan">Ringkasan pesan</label>
        <textarea id="c-pesan" rows={5} value={c.pesan} onChange={(e) => set('pesan', e.target.value)} aria-invalid={!!err.pesan} aria-describedby="c-pesan-err" placeholder="Contoh: kami dari media dan ingin mewawancarai tim VIBOXS." />
        {err.pesan && <span id="c-pesan-err" className="field__err">! {err.pesan}</span>}
      </div>
      <div className="field">
        <label id="c-privacy" className="check"><input type="checkbox" checked={c.privacy} onChange={(e) => set('privacy', e.target.checked)} aria-invalid={!!err.privacy} /><span>Saya menyetujui <a href="/privacy">kebijakan privasi</a> — data ini hanya dipakai untuk menanggapi pesan saya. <span className="muted">(wajib)</span></span></label>
        {err.privacy && <span className="field__err">! {err.privacy}</span>}
      </div>
      <button type="submit" className="btn btn--primary btn--w200" aria-busy={status === 'loading'}>
        {status === 'loading' && <span className="spinner" aria-hidden="true" />}
        {status === 'loading' ? 'Memproses…' : status === 'error' ? 'Kirim ulang' : 'Kirim pesan'}
      </button>
    </form>
  );
}

export default function Contact() {
  const root = useRef<HTMLDivElement>(null);
  const [intent, setIntent] = useState<string>('umum');
  useMotion(root);
  const hand = intent in DEST ? DEST[intent as DestKey] : null;

  return (
    <div ref={root}>
      <section className="page-hero page-hero--pb">
        <div className="page-hero__glow" aria-hidden="true" data-parallax="60" />
        <div className="container stack-48 rel">
          <div className="stack-20 maxw-720">
            <code className="mono xs muted" data-anim="up">viboxs.com/contact</code>
            <Split as="h1" className="h1" text="Ada yang bisa kami arahkan?" />
            <p className="lead muted" data-anim="up">Ceritakan kebutuhan secara singkat. Kami akan mengarahkannya ke jalur yang sesuai.</p>
          </div>
          <div className="split-2 align-start gap-48">
            <fieldset className="intents" data-anim="stagger">
              <legend>Apa maksud Anda menghubungi kami?</legend>
              {INTENTS.map((it) => (
                <label key={it.k} className={`intent ${intent === it.k ? 'is-sel' : ''}`}>
                  <input type="radio" name="intent" value={it.k} checked={intent === it.k} onChange={() => setIntent(it.k)} />
                  <span className="stack-2"><b>{it.title}</b><span className="small muted">{it.desc}</span></span>
                  {intent === it.k && <span className="intent__sel">✓ Dipilih</span>}
                </label>
              ))}
              <p className="xs-13 muted mt-8">Kami tidak meminta data identitas seperti KTP atau NPWP.</p>
            </fieldset>

            <div className="contact-panel" key={intent}>
              {hand && !isPending(hand.key) && (
                <div className="form-card stack-16">
                  <span className="eyebrow">Diteruskan langsung</span>
                  <h2 className="h3">Pertanyaan tentang {hand.name} ditangani langsung di {hand.name}.</h2>
                  <p className="body muted">Di sana tersedia informasi dan formulir yang sesuai — Anda tidak perlu mengisi form di halaman ini.</p>
                  <div className="row-12"><DestLink k={hand.key} className="btn btn--primary">Lanjut ke {hand.domain}<ArrowRight size={16} /></DestLink><span className="xs-13 muted">Dibuka di tab yang sama</span></div>
                </div>
              )}
              {hand && isPending(hand.key) && (
                <div className="form-card form-card--dashed stack-16">
                  <span className="badge badge--pending self-start">◷ Sedang disiapkan</span>
                  <h2 className="h3">{hand.domain} belum dibuka untuk publik.</h2>
                  <p className="body muted">Pilih “Pertanyaan umum” bila Anda tetap ingin menghubungi kami sekarang.</p>
                </div>
              )}
              {!hand && !CONTACT_FORM_ENDPOINT && (
                <div className="form-card stack-16">
                  <span className="badge badge--warn self-start">! Form belum dibuka</span>
                  <h2 className="h3">Form kontak umum sedang disiapkan.</h2>
                  <p className="body muted">Kami menunggu kebijakan privasi dan penerima pesan siap sebelum menerima data Anda. Sementara itu, gunakan kanal resmi berikut.</p>
                  <div className="stack-8"><span className="slot slot--lg">[Email resmi — menunggu verifikasi]</span><span className="slot slot--lg">[Kanal alternatif terverifikasi — menunggu]</span></div>
                </div>
              )}
              {!hand && CONTACT_FORM_ENDPOINT && <ContactForm endpoint={CONTACT_FORM_ENDPOINT} />}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
