import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check } from '@viboxs/shared/icons';
import { STUDIO_ORIGIN } from '@viboxs/shared/ecosystem';
import { callEdge } from '@viboxs/shared/backend';
import { rupiah, isDigital } from '../lib/data';

/** Token akses guest disimpan di perangkat pembeli (dibuat server sekali saat order dibuat). */
const TK = (no: string) => `edu-order:${no}`;
export function saveOrderToken(no: string, token: string) { try { localStorage.setItem(TK(no), token); } catch { /* storage diblokir */ } }
const readToken = (no: string) => { try { return localStorage.getItem(TK(no)); } catch { return null; } };

interface OrderView {
  order_no: string; status: string; source: string; slug: string; cash: number; refunded: number; created_at: string; paid_at: string | null; expires_at: string | null;
  redirect_url: string | null; email_hint: string; buyer_name: string;
  product: { title: string; type: string; free: boolean; startsAt?: string; date?: string; time?: string };
  access: { meeting_url?: string; ebook_url?: string; note?: string; pending?: boolean } | null;
}

const PAID = ['PAID_VERIFIED', 'FULFILLED', 'COMPLETED'];
const fmt = (s: string) => new Date(s).toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';

/**
 * Status order EDU — satu-satunya sumber kebenaran adalah server (edge function edu-order).
 * Parameter dari redirect Midtrans (?transaction_status=…) sengaja diabaikan (CHE-008).
 */
export default function Order() {
  const { orderNo = '' } = useParams();
  const no = orderNo.toUpperCase();
  const [sig] = useState(() => {
    const m = location.hash.match(/s=(\d{10}\.[a-f0-9]{40})/);
    if (m) { try { sessionStorage.setItem(`edu-sig:${no}`, m[1]); } catch { /* abaikan */ } history.replaceState(null, '', location.pathname); return m[1]; }
    try { return sessionStorage.getItem(`edu-sig:${no}`); } catch { return null; }
  });
  const [o, setO] = useState<OrderView | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading');
  const [checking, setChecking] = useState(false);
  const polls = useRef(0);

  const load = useCallback(async (refresh: boolean) => {
    const { status, data } = await callEdge<OrderView>('edu-order', { order_no: no, token: readToken(no), sig, refresh });
    if (status === 200) { setO(data); setState('ok'); return data; }
    setState(status === 404 ? 'missing' : 'error');
    return null;
  }, [no, sig]);

  useEffect(() => { load(true); }, [load]);
  // Menunggu konfirmasi: cek ulang ke server (yang bertanya langsung ke Midtrans) tiap 6 dtk, maks ~3 menit.
  useEffect(() => {
    if (o?.status !== 'PAYMENT_PENDING' || polls.current >= 30) return;
    const t = window.setTimeout(() => { polls.current += 1; load(true); }, 6000);
    return () => window.clearTimeout(t);
  }, [o, load]);

  const recheck = async () => { setChecking(true); polls.current = 0; await load(true); setChecking(false); };

  return (
    <div className="light pad-page checkout">
      <div className="container container--mid stack-32">
        <div className="row-between flex-wrap">
          <Link to="/programs" className="back-link">← Program EDU</Link>
          <span className="xs-13 ink-muted mono">ORDER {no}</span>
        </div>

        {state === 'loading' && <section className="co-card" role="status"><span className="row-8"><span className="spin-sm" aria-hidden="true" />Memeriksa status order di server…</span></section>}

        {state === 'missing' && (
          <section className="co-card co-card--warn" role="status">
            <h1 className="co-h">Order tidak ditemukan di perangkat ini.</h1>
            <p className="body-16">Detail order hanya bisa dibuka dari perangkat yang dipakai saat checkout, atau dari tautan di email akses. Ini menjaga tautan sesi tetap privat.</p>
            <p className="small ink-muted">Sudah membayar tetapi tidak menerima email? <Link to="/help" className="strong ink">Hubungi bantuan</Link> dengan nomor order <span className="mono">{no}</span>.</p>
          </section>
        )}

        {state === 'error' && (
          <section className="co-card co-card--warn" role="alert">
            <h1 className="co-h">Status belum bisa dimuat.</h1>
            <p className="body-16">Koneksi ke server terputus. Jangan membayar ulang — status pembayaranmu tetap tercatat di server.</p>
            <button type="button" className="btn btn--ink self-start" onClick={recheck}>Coba lagi</button>
          </section>
        )}

        {state === 'ok' && o && <OrderCard o={o} checking={checking} recheck={recheck} />}
      </div>
    </div>
  );
}

function OrderCard({ o, checking, recheck }: { o: OrderView; checking: boolean; recheck: () => void }) {
  const paid = PAID.includes(o.status);
  const webinar = !isDigital(o.product.type);
  const when = o.product.startsAt ? fmt(o.product.startsAt) : [o.product.date, o.product.time].filter(Boolean).join(' · ') || 'Jadwal menyusul';
  const rows: [string, string][] = [
    ['Program', o.product.title], [webinar ? 'Jadwal' : 'Format', webinar ? when : 'E-book'],
    ['Total', o.product.free ? 'Gratis' : rupiah(o.cash)], ['Email', o.email_hint],
    ...(o.paid_at ? [['Terverifikasi', fmt(o.paid_at)] as [string, string]] : []),
    ...(o.refunded > 0 ? [['Dikembalikan', rupiah(o.refunded)] as [string, string]] : []),
  ];
  const kv = <dl className="kv">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;

  if (paid) return (
    <section className="co-card co-card--ok" role="status">
      <span className="okmark"><Check size={26} /></span>
      <h1 className="co-h">{o.product.free ? 'Pendaftaranmu tercatat.' : 'Pembayaran terverifikasi.'}</h1>
      <p className="body-16">{o.product.free ? 'Kursi atas namamu sudah tercatat di server.' : 'Server sudah menerima konfirmasi pembayaran dari Midtrans.'} Simpan halaman ini — detail akses di bawah hanya untukmu.</p>
      {kv}
      <div className="co-access">
        <span className="mono-label ink-muted">AKSES</span>
        {o.access?.meeting_url ? (
          <>
            <a href={o.access.meeting_url} target="_blank" rel="noopener noreferrer" className="btn btn--ink self-start">Buka tautan sesi ↗</a>
            <span className="xs-13 ink-muted">Tautan pribadi — jangan dibagikan. {webinar ? `Sesi dimulai ${when}.` : ''}</span>
          </>
        ) : o.access?.ebook_url ? (
          <>
            <a href={o.access.ebook_url} className="btn btn--ink self-start">Unduh e-book</a>
            <span className="xs-13 ink-muted">Tautan unduh berlaku 10 menit. Muat ulang halaman ini untuk tautan baru.</span>
          </>
        ) : (
          <span className="body">Detail akses sedang disiapkan penyelenggara dan akan tampil di halaman ini{webinar ? ' sebelum sesi dimulai' : ''}.</span>
        )}
        {o.access?.note && <span className="small ink-muted">{o.access.note}</span>}
      </div>
      <a href={`${STUDIO_ORIGIN}/daftar`} className="link-arrow ink">Simpan di My Learning: gabung EDU Learner dengan email yang sama ↗</a>
    </section>
  );

  if (o.status === 'PAYMENT_PENDING') return (
    <section className="co-card co-card--warn" role="status" aria-live="polite">
      <span className="xs-13 strong pend-tag"><span className="spin-sm" aria-hidden="true" />MENUNGGU KONFIRMASI</span>
      <h1 className="co-h">Pembayaran sedang diverifikasi…</h1>
      <p className="body-16">Halaman ini memeriksa server secara otomatis. Bila kamu sudah membayar, <strong>jangan membayar ulang</strong> — konfirmasi bank/e-wallet kadang perlu beberapa menit.</p>
      {kv}
      <div className="row-12 flex-wrap">
        {o.redirect_url && <a href={o.redirect_url} className="btn btn--ink">Lanjutkan pembayaran</a>}
        <button type="button" className="btn btn--ink-ghost" onClick={recheck} disabled={checking}>{checking ? 'Memeriksa…' : 'Periksa status'}</button>
      </div>
      {o.expires_at && <span className="xs-13 ink-muted">Batas pembayaran: {fmt(o.expires_at)}.</span>}
    </section>
  );

  const ended: Record<string, [string, string]> = {
    EXPIRED: ['Batas waktu pembayaran habis.', 'Tidak ada dana yang ditarik untuk order ini. Kamu bisa membuat order baru dari halaman program.'],
    FAILED: ['Pembayaran tidak berhasil.', 'Tidak ada akses yang dibuat. Coba lagi dengan metode pembayaran lain dari halaman program.'],
    CANCELLED: ['Order dibatalkan.', 'Tidak ada akses yang dibuat dari order ini.'],
    REFUNDED: ['Dana sudah dikembalikan.', 'Akses untuk order ini sudah ditutup. Waktu dana masuk mengikuti bank/penyedia pembayaranmu.'],
    PARTIALLY_REFUNDED: ['Sebagian dana dikembalikan.', 'Akses mengikuti kesepakatan refund yang tercatat. Hubungi bantuan bila ada yang tidak sesuai.'],
    CHARGEBACK: ['Pembayaran disengketakan.', 'Akses ditangguhkan sampai sengketa dengan penyedia pembayaran selesai.'],
    CREATED: ['Order tercatat.', 'Order belum memerlukan tindakan.'],
  };
  const [h, b] = ended[o.status] ?? ['Status order: ' + o.status, ''];
  return (
    <section className="co-card co-card--warn" role="status">
      <h1 className="co-h">{h}</h1>
      <p className="body-16">{b}</p>
      {kv}
      <div className="row-12 flex-wrap">
        <Link to={isDigital(o.product.type) ? `/digital-library/${o.slug}` : `/programs/${o.slug}`} className="btn btn--ink">Ke halaman program</Link>
        <Link to="/help" className="btn btn--ink-ghost">Hubungi bantuan</Link>
      </div>
    </section>
  );
}
