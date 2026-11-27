import { useRef, type CSSProperties } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, Check } from '@viboxs/shared/icons';
import { useMotion } from '@viboxs/shared/motion';
import Status, { toneOf } from '../components/Status';
import { useJsonLd, programLd } from '../lib/ld';
import NotifyForm from '../components/NotifyForm';
import Accordion from '../components/Accordion';
import { NotFound } from './Misc';
import { FAQ, PROGRAMS, STATUS, TYPE, bySlug, canPay, ctaFor, hasPrice, hrefOf, priceOf, whenOf, type StatusCode, isDigital } from '../lib/data';

const CTA: Partial<Record<StatusCode, { kind: 'go' | 'off' | 'notify' | 'help'; label: (free: boolean) => string; notify?: boolean }>> = {
  OPEN: { kind: 'go', label: (f) => (f ? 'Daftar gratis' : 'Lanjut ke pendaftaran') },
  RESCHEDULED: { kind: 'go', label: () => 'Daftar untuk jadwal baru' },
  ANNOUNCED: { kind: 'notify', label: () => 'Beri tahu saya saat dibuka' },
  FULL: { kind: 'off', label: () => 'Pendaftaran penuh', notify: true },
  CLOSED: { kind: 'off', label: () => 'Pendaftaran ditutup' },
  CANCELLED: { kind: 'help', label: () => 'Hubungi bantuan' },
  COMPLETED: { kind: 'off', label: () => 'Sesi telah selesai' },
};

export default function Detail({ from = 'programs' }: { from?: 'programs' | 'events' }) {
  const { slug } = useParams();
  const p = bySlug(slug);
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref, [slug]);
  useJsonLd(p && !isDigital(p.type) ? programLd(p) : null);
  // Tautan lama/Studio ke /programs/<ebook> → halaman Digital Library yang benar.
  if (p && isDigital(p.type)) return <Navigate to={hrefOf(p)} replace />;
  if (!p) return <NotFound />;

  const st = STATUS[p.status];
  // Tombol bayar hanya aktif bila server membuka pembayaran dan harga final tersedia. Program gratis tetap bisa didaftarkan.
  const payReady = canPay(p);
  const cta = CTA[p.status]?.kind === 'go' && !p.free && !payReady
    ? { kind: 'notify' as const, label: () => (hasPrice(p) ? 'Kabari saya saat pembayaran dibuka' : 'Kabari saya saat harga diumumkan') }
    : CTA[p.status] || CTA.OPEN!;
  const label = cta.label(p.free);
  const tone = toneOf(p.status);
  const policies: [string, string][] = p.free
    ? [['Perubahan jadwal', 'Bila jadwal berubah, kami mengirim pemberitahuan ke email terdaftar. Registrasimu tetap berlaku untuk jadwal baru.'], ['Lisensi materi', 'Materi untuk penggunaan pribadi, bukan untuk didistribusikan ulang.']]
    : [['Refund & reschedule', p.refundTerms || 'Bila sesi dibatalkan penyelenggara, kamu dapat memilih pengembalian dana atau jadwal pengganti. Ketentuan lengkap mengikuti kebijakan refund yang sedang ditinjau tim hukum.'], ['Lisensi materi', 'Materi untuk penggunaan pribadi, bukan untuk didistribusikan ulang.']];
  const facts = ([['Format', [TYPE[p.type], p.mode].filter(Boolean).join(' · ')], ['Tanggal', whenOf(p)], ['Jam', p.time], ['Durasi', p.dur], ['Lokasi / joining', p.loc], ['Bahasa', p.lang], ['Kapasitas', p.cap]] as [string, string | undefined][])
    .filter((x): x is [string, string] => !!x[1] && !/^\[/.test(x[1]));
  const related = PROGRAMS.filter((x) => x.slug !== p.slug && (x.path === p.path || x.type === p.type) && !x.past).slice(0, 3);

  const action = (mobile?: boolean) => {
    if (cta.kind === 'go') return <Link to={`/checkout/${p.slug}`} className={`btn btn--primary ${mobile ? '' : 'btn--block btn--lg'}`}>{label}{!mobile && <ArrowRight />}</Link>;
    if (cta.kind === 'help') return <Link to="/help" className={`btn btn--ink ${mobile ? '' : 'btn--block btn--lg'}`}>{label}</Link>;
    if (cta.kind === 'off') return <button type="button" className={`btn btn--off ${mobile ? '' : 'btn--block btn--lg'}`} disabled aria-disabled="true">{label}</button>;
    return null;
  };

  return (
    <div ref={ref}>
      <section className="page-top page-top--glow">
        <div className="container stack-20">
          <nav aria-label="Breadcrumb" className="crumbs">
            <Link to="/">EDU</Link><span>/</span>
            {from === 'events' ? <Link to="/events">Events</Link> : <Link to="/programs">Programs</Link>}<span>/</span>
            <span aria-current="page">{p.title}</span>
          </nav>
          <div className="row-8"><span className="tag tag--strong">{TYPE[p.type]}</span><Status code={p.status} /></div>
          <h1 className="h1-sm maxw-20ch">{p.title}</h1>
          <p className="lead muted maxw-640">{p.summary}</p>
        </div>
      </section>
      <div className="light pad-page pad-page--xl">
        <div className="container detail">
          <article className="detail__main">
            {p.cover && (
              <figure className="poster" style={{ aspectRatio: (p.coverRatio ?? '16:9').replace(':', ' / ') } as CSSProperties} data-build="Media · Poster">
                <img src={p.cover} alt={p.coverAlt || `Poster ${p.title}`} loading="lazy" decoding="async" />
              </figure>
            )}
            {st.note && (
              <div role="status" className="notice" style={{ '--tone': tone } as CSSProperties}>
                <span className="notice__h">{st.label}</span>
                <span className="body">{st.note}</span>
                {p.status === 'RESCHEDULED' && <span className="small">Jadwal baru: <strong>{whenOf(p)} · {p.time}</strong> — sebelumnya <s>{p.prevDate}</s>.</span>}
              </div>
            )}
            {!!p.outcomes?.length && (
              <section className="stack-16" data-build="Blok · Outcome">
                <h2 className="h2-block">Yang akan kamu pelajari</h2>
                <ul className="ticks">{p.outcomes.map((o) => <li key={o}><Check size={18} />{o}</li>)}</ul>
              </section>
            )}
            <section className="duo" data-build="Blok · Untuk siapa">
              <div className="box"><span className="mono-label ink-muted">UNTUK SIAPA</span><span className="strong body-16">{p.forWho || 'Semua pembelajar'}</span></div>
              <div className="box"><span className="mono-label ink-muted">LEVEL &amp; PRASYARAT</span><span className="strong body-16">{p.level || 'Tanpa prasyarat khusus'}</span></div>
            </section>
            <section className="stack-16">
              <h2 className="h2-block">Format &amp; jadwal</h2>
              <dl className="facts-l" data-build="Tabel · Jadwal">{facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
              <span className="xs-13 ink-muted">Semua jam dalam Waktu Indonesia Barat (WIB, Asia/Jakarta, UTC+7). Peserta di luar WIB: sesuaikan dengan zona waktumu.</span>
            </section>
            {!!p.sessions?.length && (
              <section className="stack-16">
                <h2 className="h2-block">Sesi</h2>
                <ol className="agenda" data-build="Daftar · Sesi">{p.sessions.map((x, i) => <li key={x.startsAt + i}><span className="mono xs-13 ink-muted">{String(i + 1).padStart(2, '0')}</span><span className="strong">{wib(x.startsAt)}</span><span className="small ink-muted">{x.dur}</span></li>)}</ol>
              </section>
            )}
            {(p.facilitator || p.speakerBio) && (
              <section className="stack-16">
                <h2 className="h2-block">{p.type === 'webinar' ? 'Pembicara' : 'Kontributor'}</h2>
                <div className="facil" data-build="Slot · Fasilitator"><span className="facil__ph" /><span className="stack-4">{p.facilitator && <span className="strong">{p.facilitator}</span>}{p.speakerBio && <span className="body ink-muted">{p.speakerBio}</span>}</span></div>
              </section>
            )}
            {!!p.agenda?.length && (
              <section className="stack-16">
                <h2 className="h2-block">Agenda</h2>
                <ol className="agenda" data-build="Daftar · Agenda">{p.agenda.map(([t, d], i) => <li key={t}><span className="mono xs-13 ink-muted">{String(i + 1).padStart(2, '0')}</span><span className="strong">{t}</span><span className="small ink-muted">{d}</span></li>)}</ol>
              </section>
            )}
            {(p.resources || p.assignment || p.output) && (
              <section className="stack-16">
                <h2 className="h2-block">Latihan &amp; hasil</h2>
                <dl className="policy">{([['Resources', p.resources], ['Tugas', p.assignment], ['Output latihan', p.output]] as [string, string | undefined][]).filter((x) => x[1]).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
              </section>
            )}
            {!!p.receive?.length && (
              <section className="stack-16">
                <h2 className="h2-block">Yang kamu terima</h2>
                <ul className="receive" data-build="Daftar · Yang diterima">{p.receive.map((r) => <li key={r}><DocIcon />{r}</li>)}</ul>
              </section>
            )}
            <section className="duo" data-build="Blok · Harga & akses">
              <div className="box"><span className="mono-label ink-muted">HARGA</span><span className="price-xl">{priceOf(p)}</span><span className="small ink-muted">{p.free ? 'Tanpa biaya. Registrasi tetap diperlukan untuk menerima detail sesi.' : 'Total final, termasuk pajak atau biaya bila ada, tampil sebelum kamu membayar.'}</span></div>
              <div className="box"><span className="mono-label ink-muted">AKSES</span><span className="body">{p.access || 'Tautan sesi bersifat privat dan hanya dikirim ke email peserta terdaftar — tidak dipublikasikan di halaman ini.'}</span></div>
            </section>
            <section className="stack-16">
              <h2 className="h2-block">Ketentuan</h2>
              <dl className="policy">{policies.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
            </section>
            <section className="stack-8">
              <h2 className="h2-block">FAQ &amp; dukungan</h2>
              <Accordion tone="light" items={[...(p.faq ?? []), ...FAQ.filter((f) => f.g === 'Akses' || f.g === 'Perubahan').map((f) => ({ q: f.q, a: f.a }))]} defaultOpen={null} />
              <Link to="/help" className="link-arrow acc-deep mt-8">Pusat bantuan <ArrowRight size={14} /></Link>
            </section>
          </article>

          <aside id="daftar" aria-label="Ringkasan program" className="buybox" data-build="Panel · Ringkasan">
            <span className="row-between"><Status code={p.status} /></span>
            <span className="price-xxl">{priceOf(p)}</span>
            <div className="buybox__when"><span className="strong">{whenOf(p)}</span><span className="ink-muted">{[p.time, p.dur].filter(Boolean).join(' · ')}</span><span className="ink-muted">{[p.mode, p.loc].filter(Boolean).join(' · ')}</span></div>
            {action()}
            {(cta.kind === 'notify' || cta.notify) && <NotifyForm compact label={cta.kind === 'notify' ? label : 'Kabari sesi berikutnya'} consent="Saya setuju menerima email pemberitahuan." done="Kami kabari lewat email." />}
            <span className="xs-13 ink-muted">{p.free || payReady ? 'Total final dan ketentuan tampil lagi sebelum kamu mengonfirmasi.' : 'Pembayaran online sedang disiapkan. Order berbayar belum dapat diproses — tinggalkan email agar kami kabari.'}</span>
          </aside>
        </div>

        {related.length > 0 && (
          <div className="container stack-20 related">
            <h2 className="h2-block">Program terkait</h2>
            <div className="card-grid">
              {related.map((x) => (
                <Link key={x.slug} to={hrefOf(x, from)} className="mini" data-build="Kartu · Terkait">
                  <span className="row-between"><span className="pcard__type">{TYPE[x.type]}</span><Status code={x.status} size="sm" still /></span>
                  <span className="strong lg-17">{x.title}</span>
                  <span className="small ink-muted">{whenOf(x)}</span>
                  <span className="pcard__cta mt-auto">{ctaFor(x)}<ArrowRight size={14} /></span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mbar">
        <span className="stack-2 min0"><span className="strong lg-17">{priceOf(p)}</span><span className="xs ink-muted ellipsis">{st.label} · {whenOf(p)}</span></span>
        {action(true) ?? <a href="#daftar" className="btn btn--ink">{label}</a>}
      </div>
    </div>
  );
}

const wib = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : `${new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d).replace(':', '.')} WIB`;
};

export const DocIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>
);
