import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ORIGIN } from '@viboxs/shared/ecosystem';
import { useAuth } from '../../lib/auth';
import { useAction, useLoad } from '../../lib/hooks';
import { ORDER_STATUS, PAID_STATES, PROG_PATH, PROG_TYPE, fmtDate, rupiah, isDigital } from '../../lib/labels';
import { sb, must, rpc, type EduOrder, type Entitlement } from '../../lib/sb';
import { eduEdge, idemKey, paymentsEnabled } from '../../lib/edu';
import { Badge, Btn, Card, Check, Empty, ErrorBox, I, KV, Loaded, PageHead, Skeleton, StatusBadge, useToast } from '../../ui/kit';
import { fetchCatalog, type EduProgram } from './rules';

const OPEN = ['OPEN', 'RESCHEDULED', 'AVAILABLE'];
const priceLabel = (p: EduProgram) => (p.free ? 'Gratis' : p.price ? rupiah(p.price) : 'Harga belum diumumkan');
const isPast = (p: EduProgram) => !isDigital(p.type) && !!p.startsAt && Date.parse(p.startsAt) < Date.now();

/** Find Programs — katalog EDU kanonis di dalam Studio (PRD §05.1 member). Tidak ada produk selain yang terbit. */
export function Catalog() {
  const s = useLoad(async () => {
    const [cat, pay] = await Promise.all([fetchCatalog(), paymentsEnabled()]);
    return { cat: cat.filter((p) => !isPast(p)), pay };
  });
  return (
    <div className="st-page-in">
      <PageHead eyebrow="EDU Learner" title="Cari program" desc="Program yang benar-benar terbit di edu.viboxs.com. Checkout di sini memakai sistem order EDU yang sama dan masuk ke My Learning." />
      <Loaded state={s} empty={(d) => (d.cat.length ? null : <Empty title="Belum ada program terbit" icon={I.book}>Belum ada program yang dibuka. Program baru diumumkan di EDU dan di notifikasi Studio.</Empty>)}>
        {(d) => (
          <div className="st-recs">
            {d.cat.map((p, i) => {
              const buy = OPEN.includes(p.status) && (p.free || (d.pay && !!p.price));
              return (
                <article key={p.slug} className="st-rec" style={{ ['--i' as string]: i }}>
                  <span className="st-mono">{PROG_TYPE[p.type] ?? p.type} · {PROG_PATH[p.path] ?? p.path}</span>
                  <b className="st-rec__t">{p.title}</b>
                  <p className="st-small st-muted st-clamp">{p.summary}</p>
                  <span className="st-small">{isDigital(p.type) ? 'Akses mandiri' : p.startsAt ? fmtDate(p.startsAt) : p.date ?? 'Jadwal menyusul'}</span>
                  <div className="row-between">
                    <b>{priceLabel(p)}</b>
                    {buy ? <Link to={`/learn/checkout/${p.slug}`} className="st-btn st-btn--primary st-btn--sm">{p.free ? 'Daftar' : 'Beli'}</Link>
                      : <a href={`${ORIGIN.edu}/${isDigital(p.type) ? 'digital-library' : 'programs'}/${p.slug}`} target="_blank" rel="noopener noreferrer" className="st-btn st-btn--ghost st-btn--sm">Detail<I.ext size={14} /></a>}
                  </div>
                  {!buy && !p.free && <span className="st-small st-muted">{p.price ? 'Pembayaran online sedang disiapkan.' : 'Harga belum diumumkan.'}</span>}
                </article>
              );
            })}
          </div>
        )}
      </Loaded>
    </div>
  );
}

/** Checkout member (CHE-005/006): order sumber STUDIO_MEMBER, kembali ke route Studio — bukan ke katalog publik EDU. */
export function MemberCheckout() {
  const { slug = '' } = useParams();
  const { me } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [terms, setTerms] = useState(false);
  const { busy, run } = useAction();
  const s = useLoad(async () => {
    const [cat, pay] = await Promise.all([fetchCatalog(), paymentsEnabled()]);
    return { p: cat.find((x) => x.slug === slug) ?? null, pay };
  }, [slug]);
  const pay = () => run('pay', async () => {
    if (!terms) throw new Error('Setujui ketentuan layanan EDU dulu.');
    const { status, data } = await eduEdge<{ order_no: string; redirect_url?: string | null }>('edu-checkout', {
      slug, member: true, name: me!.profile.display_name || me!.profile.email, idempotency_key: idemKey(slug, me!.profile.id),
      terms_version: 'edu-terms-draft-2026-11', privacy_version: 'edu-privacy-draft-2026-11',
    });
    if (status !== 200 || !data.order_no) {
      if (data.code === 'ALREADY_OWNED') { nav('/learn/my'); throw new Error('Program ini sudah ada di My Learning.'); }
      throw new Error(data.error || 'Order belum bisa dibuat.');
    }
    if (data.redirect_url) { window.location.assign(data.redirect_url); return; }
    nav(`/learn/orders/${data.order_no}`);
  }, undefined, (e) => toast(e, 'err'));

  return (
    <div className="st-page-in">
      <PageHead eyebrow="Checkout · EDU" title="Konfirmasi pembelian"><Link to="/learn/catalog" className="st-btn st-btn--quiet st-btn--sm"><I.back size={14} />Katalog</Link></PageHead>
      <Loaded state={s}>
        {({ p, pay: on }) => !p || !OPEN.includes(p.status) || isPast(p) ? (
          <Empty title="Program tidak tersedia" icon={I.book}>Program ini belum terbit, sudah ditutup, atau sudah lewat.</Empty>
        ) : !p.free && !(on && p.price) ? (
          <Card title={p.title}><div className="st-alert st-alert--warn">Pembayaran online untuk program berbayar sedang disiapkan. Tidak ada order atau tagihan yang dibuat.</div></Card>
        ) : (
          <Card title={p.title} desc={`${PROG_TYPE[p.type] ?? p.type} · ${isDigital(p.type) ? 'akses mandiri' : p.startsAt ? fmtDate(p.startsAt) : 'jadwal menyusul'}`}>
            <div className="st-stack">
              <KV rows={[['Total', <b key="t">{priceLabel(p)}</b>], ['Akun', me!.profile.email ?? '—'], ['Pembayaran', p.free ? 'Tidak ada tagihan' : 'Midtrans (VA, e-wallet, QRIS, kartu)'], ['Akses', 'Terbuka setelah server menerima konfirmasi — tampil di My Learning']]} />
              <Check label={<>Saya menyetujui <a href={`${ORIGIN.edu}/policies/terms`} target="_blank" rel="noopener noreferrer">ketentuan layanan</a> dan <a href={`${ORIGIN.edu}/policies/refund`} target="_blank" rel="noopener noreferrer">kebijakan refund</a> EDU.</>} checked={terms} onChange={setTerms} />
              <div className="st-row"><Btn kind="primary" onClick={pay} busy={busy === 'pay'} busyLabel={p.free ? 'Mendaftarkan…' : 'Membuka pembayaran…'}>{p.free ? 'Daftar sekarang' : `Bayar ${priceLabel(p)}`}</Btn></div>
              <p className="st-small st-muted">Token reward tidak dapat dipakai — penukaran belum aktif sampai ada persetujuan Legal & Finance.</p>
            </div>
          </Card>
        )}
      </Loaded>
    </div>
  );
}

type Owned = Entitlement & { order: EduOrder | undefined; attended: boolean };

/** My Learning: entitlement milik sendiri (RLS) + order yang masih menunggu. Order guest dengan email terverifikasi yang sama ditautkan otomatis (CHE-004). */
export function MyLearning() {
  const { me } = useAuth();
  const toast = useToast();
  const s = useLoad(async () => {
    const claimed = await rpc<number>('edu_claim_orders').catch(() => 0);
    const [ents, orders, att] = await Promise.all([
      must(sb.from('edu_entitlements').select('*').eq('buyer_id', me!.profile.id).order('granted_at', { ascending: false })) as Promise<Entitlement[]>,
      must(sb.from('edu_orders').select('*').eq('buyer_id', me!.profile.id).order('created_at', { ascending: false })) as Promise<EduOrder[]>,
      must(sb.from('edu_attendance').select('entitlement_id')) as Promise<{ entitlement_id: string }[]>,
    ]);
    const owned: Owned[] = ents.map((e) => ({ ...e, order: orders.find((o) => o.id === e.order_id), attended: att.some((a) => a.entitlement_id === e.id) }));
    return { claimed, owned, pending: orders.filter((o) => o.status === 'PAYMENT_PENDING') };
  });
  useEffect(() => { if (s.data?.claimed) toast(`${s.data.claimed} pembelian dengan email ini ditautkan ke akun Anda.`, 'ok'); }, [s.data?.claimed, toast]);
  return (
    <div className="st-page-in">
      <PageHead eyebrow="EDU Learner" title="My Learning" desc="Hanya program dengan akses terverifikasi server. Membeli ≠ menyelesaikan ≠ kualifikasi profesional.">
        <Link to="/learn/catalog" className="st-btn st-btn--primary st-btn--sm"><I.search size={14} />Cari program</Link>
      </PageHead>
      <Loaded state={s}>
        {(d) => (
          <>
            {d.pending.length > 0 && (
              <Card title="Menunggu pembayaran">
                <ul className="st-list">{d.pending.map((o) => (
                  <li key={o.id}><span><b>{o.product.title}</b><small>{o.order_no} · {rupiah(o.cash_charged)}</small></span><Link to={`/learn/orders/${o.order_no}`} className="st-btn st-btn--ghost st-btn--sm">Status</Link></li>
                ))}</ul>
              </Card>
            )}
            {!d.owned.length ? (
              <Empty title="Belum ada program" icon={I.book}>
                <p>Program yang Anda beli atau daftarkan muncul di sini setelah server memverifikasinya. Pembelian sebagai tamu dengan email yang sama ditautkan otomatis setelah email akun terverifikasi.</p>
                <Link to="/learn/catalog" className="st-btn st-btn--ghost st-btn--sm">Cari program</Link>
              </Empty>
            ) : (
              <div className="st-cards">
                {d.owned.map((e, i) => (
                  <article key={e.id} className="st-lead" style={{ ['--i' as string]: i }}>
                    <span className="row-between"><span className="st-mono">{PROG_TYPE[e.order?.product.type ?? ''] ?? 'Program'}</span>
                      {e.revoked_at ? <Badge tone="muted">Akses ditutup</Badge> : e.attended ? <Badge tone="ok">Hadir terverifikasi</Badge> : <Badge tone="info">Akses aktif</Badge>}</span>
                    <b>{e.order?.product.title ?? e.program_slug}</b>
                    <span className="st-small st-muted">{e.order?.product.startsAt ? fmtDate(e.order.product.startsAt) : 'Akses mandiri'}{e.revoke_reason ? ` · ${e.revoke_reason}` : ''}</span>
                    {e.order && <Link to={`/learn/orders/${e.order.order_no}`} className="st-btn st-btn--ghost st-btn--sm">{e.revoked_at ? 'Detail order' : 'Buka akses'}</Link>}
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </Loaded>
    </div>
  );
}

interface View { order_no: string; status: string; cash: number; refunded: number; paid_at: string | null; expires_at: string | null; redirect_url: string | null; product: { title: string; type: string; free: boolean; startsAt?: string }; access: { meeting_url?: string; ebook_url?: string; note?: string; pending?: boolean } | null }

/** Status order member — dari server saja; parameter redirect Midtrans diabaikan (CHE-008). */
export function OrderStatus() {
  const { orderNo = '' } = useParams();
  const [v, setV] = useState<View | null>(null);
  const [err, setErr] = useState('');
  const [checking, setChecking] = useState(false);
  const polls = useRef(0);
  const load = useCallback(async () => {
    const { status, data } = await eduEdge<View>('edu-order', { order_no: orderNo, refresh: true });
    if (status === 200) { setV(data); setErr(''); } else setErr(data.error || 'Status belum bisa dimuat.');
  }, [orderNo]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (v?.status !== 'PAYMENT_PENDING' || polls.current >= 30) return;
    const t = window.setTimeout(() => { polls.current += 1; load(); }, 6000);
    return () => window.clearTimeout(t);
  }, [v, load]);
  const paid = !!v && PAID_STATES.includes(v.status);
  return (
    <div className="st-page-in">
      <PageHead eyebrow={`Order ${orderNo}`} title={v?.product.title ?? 'Status order'}><Link to="/learn/my" className="st-btn st-btn--quiet st-btn--sm"><I.back size={14} />My Learning</Link></PageHead>
      {err ? <ErrorBox msg={err} onRetry={load} /> : !v ? <Skeleton /> : (
        <Card title={<StatusBadge map={ORDER_STATUS} value={v.status} />}>
          <div className="st-stack">
            <KV rows={[['Total', v.product.free ? 'Gratis' : rupiah(v.cash)], ['Jadwal', v.product.startsAt ? fmtDate(v.product.startsAt) : isDigital(v.product.type) ? 'Akses mandiri' : 'Menyusul'],
              ['Terverifikasi', v.paid_at ? fmtDate(v.paid_at) : '—'], ...(v.refunded > 0 ? [['Direfund', rupiah(v.refunded)] as [string, string]] : [])]} />
            {v.status === 'PAYMENT_PENDING' && (
              <div className="st-alert st-alert--warn st-alert--row" role="status" aria-live="polite">
                <span>Pembayaran sedang diverifikasi. Jangan membayar ulang — halaman ini memeriksa server otomatis.</span>
                <span className="st-row">{v.redirect_url && <a href={v.redirect_url} className="st-btn st-btn--primary st-btn--sm">Lanjutkan bayar</a>}
                  <Btn size="sm" busy={checking} onClick={async () => { setChecking(true); polls.current = 0; await load(); setChecking(false); }}>Periksa status</Btn></span>
              </div>
            )}
            {paid && (v.access?.meeting_url ? (
              <div className="st-alert st-alert--ok st-alert--row"><span>Tautan sesi pribadi — jangan dibagikan.</span><a href={v.access.meeting_url} target="_blank" rel="noopener noreferrer" className="st-btn st-btn--primary st-btn--sm">Buka sesi<I.ext size={14} /></a></div>
            ) : v.access?.ebook_url ? (
              <div className="st-alert st-alert--ok st-alert--row"><span>Tautan unduh berlaku 10 menit.</span><a href={v.access.ebook_url} className="st-btn st-btn--primary st-btn--sm">Unduh e-book</a></div>
            ) : <div className="st-alert st-alert--info">Detail akses sedang disiapkan penyelenggara dan akan tampil di sini.</div>)}
            {v.access?.note && <p className="st-small st-muted">{v.access.note}</p>}
            {['EXPIRED', 'FAILED', 'CANCELLED'].includes(v.status) && <div className="st-alert st-alert--info">Tidak ada akses yang dibuat dari order ini. Anda bisa membuat order baru dari katalog.</div>}
          </div>
        </Card>
      )}
    </div>
  );
}
