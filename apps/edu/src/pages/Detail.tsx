import { useRef, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Check } from '@viboxs/shared/icons';
import { useMotion } from '@viboxs/shared/motion';
import Status, { Sample, toneOf } from '../components/Status';
import NotifyForm from '../components/NotifyForm';
import Accordion from '../components/Accordion';
import { NotFound } from './Misc';
import { FAQ, PROGRAMS, STATUS, TYPE, bySlug, ctaFor, hrefOf, priceOf, whenOf, type StatusCode } from '../lib/data';

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
  if (!p || p.type === 'ebook') return <NotFound />;

  const st = STATUS[p.status];
  const cta = CTA[p.status] || CTA.OPEN!;
  const label = cta.label(p.free);
  const tone = toneOf(p.status);
  const policies: [string, string][] = p.free
    ? [['Perubahan jadwal', 'Bila jadwal berubah, kami mengirim pemberitahuan ke email terdaftar. Registrasimu tetap berlaku untuk jadwal baru.'], ['Pembatalan oleh peserta', 'Kamu bisa membatalkan registrasi lewat tautan di email konfirmasi.'], ['Lisensi materi', 'Worksheet untuk penggunaan pribadi, bukan untuk didistribusikan ulang.']]
    : [['Refund', '[Ketentuan refund — menunggu kebijakan pembelian final]'], ['Reschedule', 'Bila jadwal berubah, kamu dapat ikut di jadwal baru atau mengajukan pengembalian sesuai kebijakan.'], ['Transfer tiket', '[Ketentuan transfer — menunggu kebijakan]'], ['Lisensi materi', 'Materi untuk penggunaan pribadi, bukan untuk didistribusikan ulang.']];
  const facts: [string, string][] = [['Format', `${TYPE[p.type]} · ${p.mode}`], ['Tanggal', whenOf(p)], ['Jam', p.time!], ['Durasi', p.dur!], ['Lokasi / joining', p.loc!], ['Bahasa', p.lang!], ['Kapasitas', p.cap!]];
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
          <div className="row-8"><span className="tag tag--strong">{TYPE[p.type]}</span><Status code={p.status} /><Sample inline /></div>
          <h1 className="h1-sm maxw-20ch">{p.title}</h1>
          <p className="lead muted maxw-640">{p.summary}</p>
        </div>
      </section>
      <div className="light pad-page pad-page--xl">
        <div className="container detail">
          <article className="detail__main">
            {st.note && (
              <div role="status" className="notice" style={{ '--tone': tone } as CSSProperties}>
                <span className="notice__h">{st.label}</span>
                <span className="body">{st.note}</span>
                {p.status === 'RESCHEDULED' && <span className="small">Jadwal baru: <strong>{whenOf(p)} · {p.time}</strong> — sebelumnya <s>{p.prevDate}</s>.</span>}
              </div>
            )}
            <section className="stack-16" data-build="Blok · Outcome">
              <h2 className="h2-block">Yang akan kamu pelajari</h2>
              <ul className="ticks">{p.outcomes!.map((o) => <li key={o}><Check size={18} />{o}</li>)}</ul>
            </section>
            <section className="duo" data-build="Blok · Untuk siapa">
              <div className="box"><span className="mono-label ink-muted">UNTUK SIAPA</span><span className="strong body-16">{p.forWho}</span></div>
              <div className="box"><span className="mono-label ink-muted">LEVEL &amp; PRASYARAT</span><span className="strong body-16">{p.level}</span></div>
            </section>
            <section className="stack-16">
              <h2 className="h2-block">Format &amp; jadwal</h2>
              <dl className="facts-l" data-build="Tabel · Jadwal">{facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
              <span className="xs-13 ink-muted">Semua jam dalam Waktu Indonesia Barat (WIB, UTC+7).</span>
            </section>
            <section className="stack-16">
              <h2 className="h2-block">Fasilitator</h2>
              <div className="facil" data-build="Slot · Fasilitator"><span className="facil__ph" /><span className="stack-4"><span className="strong">[Nama fasilitator]</span><span className="small ink-muted">Ditampilkan setelah fasilitator menyetujui publikasi profilnya.</span></span></div>
            </section>
            <section className="stack-16">
              <h2 className="h2-block">Agenda</h2>
              <ol className="agenda" data-build="Daftar · Agenda">{p.agenda!.map(([t, d], i) => <li key={t}><span className="mono xs-13 ink-muted">{String(i + 1).padStart(2, '0')}</span><span className="strong">{t}</span><span className="small ink-muted">{d}</span></li>)}</ol>
            </section>
            <section className="stack-16">
              <h2 className="h2-block">Yang kamu terima</h2>
              <ul className="receive" data-build="Daftar · Yang diterima">{p.receive!.map((r) => <li key={r}><DocIcon />{r}</li>)}</ul>
            </section>
            <section className="duo" data-build="Blok · Harga & akses">
              <div className="box"><span className="mono-label ink-muted">HARGA</span><span className="price-xl">{priceOf(p)}</span><span className="small ink-muted">{p.free ? 'Tanpa biaya. Registrasi tetap diperlukan untuk menerima link sesi.' : 'Pajak & biaya layanan: [menunggu ketentuan] — total final tampil di ringkasan order sebelum bayar.'}</span></div>
              <div className="box"><span className="mono-label ink-muted">AKSES &amp; MASA BERLAKU</span><span className="body">{p.access}</span></div>
            </section>
            <section className="stack-16">
              <h2 className="h2-block">Ketentuan</h2>
              <dl className="policy">{policies.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
              <span className="small ink-muted">Anggota Universe? Periksa manfaat yang berlaku untuk program ini.</span>
            </section>
            <section className="stack-8">
              <h2 className="h2-block">FAQ &amp; dukungan</h2>
              <Accordion tone="light" items={FAQ.filter((f) => f.g === 'Akses' || f.g === 'Perubahan').map((f) => ({ q: f.q, a: f.a }))} defaultOpen={null} />
              <Link to="/help" className="link-arrow acc-deep mt-8">Pusat bantuan <ArrowRight size={14} /></Link>
            </section>
          </article>

          <aside id="daftar" aria-label="Ringkasan program" className="buybox" data-build="Panel · Ringkasan">
            <span className="row-between"><Status code={p.status} /><Sample inline /></span>
            <span className="price-xxl">{priceOf(p)}</span>
            <div className="buybox__when"><span className="strong">{whenOf(p)}</span><span className="ink-muted">{p.time} · {p.dur}</span><span className="ink-muted">{p.mode} · {p.loc}</span></div>
            {action()}
            {(cta.kind === 'notify' || cta.notify) && <NotifyForm compact label={cta.kind === 'notify' ? label : 'Kabari sesi berikutnya'} consent="Saya setuju menerima email pemberitahuan." done="Kami kabari lewat email." />}
            <span className="xs-13 ink-muted">Total final dan ketentuan tampil lagi sebelum kamu mengonfirmasi.</span>
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

export const DocIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>
);
