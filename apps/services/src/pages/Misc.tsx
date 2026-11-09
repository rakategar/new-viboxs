import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from '@viboxs/shared/icons';
import { Split } from '@viboxs/shared/fx';
import { useMotion } from '@viboxs/shared/motion';
import Accordion from '../components/Accordion';
import { IcDoc } from '../components/icons';
import { CASE_STUDIES, FAQ, FAQ_G } from '../lib/content';

/* ---------------- /faq ---------------- */
export function Faq() {
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref);
  const [g, setG] = useState('Semua');
  const pillsRef = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState({ x: 0, w: 0 });
  const list = FAQ.filter((q) => g === 'Semua' || q.g === g);

  useLayoutEffect(() => {
    const btn = pillsRef.current?.querySelector<HTMLElement>('[aria-pressed=true]');
    if (btn) setInd({ x: btn.offsetLeft, w: btn.offsetWidth });
  }, [g]);

  return (
    <div ref={ref}>
      <section className="page-hero page-hero--pb">
        <div className="page-hero__glow" aria-hidden="true" />
        <div className="container rel stack-40 maxw-720-c">
          <div className="stack-16">
            <span className="mono-label">FAQ</span>
            <Split as="h1" className="h1-sm" text="Pertanyaan yang sering diajukan" />
            <p className="lead muted" data-anim="up">Jawaban di sini bersifat umum. Ketentuan akhir selalu mengikuti proposal dan SOW yang disepakati.</p>
          </div>
          <div role="group" aria-label="Filter topik" className="filter" ref={pillsRef} data-anim="up">
            <span className="filter__ind" aria-hidden="true" style={{ transform: `translateX(${ind.x}px)`, width: ind.w }} />
            {FAQ_G.map((x) => (
              <button key={x} type="button" aria-pressed={g === x} onClick={() => setG(x)}>{x}</button>
            ))}
          </div>
          <div key={g} className="faq-list">
            <Accordion heading="h2" defaultOpen={null} items={list.map((q) => ({ key: q.q, q: <span className="stack-4"><span className="mono-label">{q.g}</span><span>{q.q}</span></span>, a: q.a }))} />
          </div>
          <div className="cta-band" data-anim="up">
            <span className="body-16 strong">Pertanyaan Anda belum terjawab?</span>
            <Link to="/start" className="btn btn--light btn--sm">Tanyakan lewat brief <ArrowRight /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------------- /work ---------------- */
export function Work() {
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref);
  return (
    <div ref={ref}>
      <section className="page-hero page-hero--pb">
        <div className="container rel stack-40">
          <div className="stack-16 maxw-720">
            <span className="mono-label">WORK · STUDI KASUS</span>
            <Split as="h1" className="h1-sm" text="Karya terpilih" />
            <p className="lead muted" data-anim="up">Maksimal tiga kasus, hanya yang sudah disetujui klien untuk dipublikasikan.</p>
          </div>
          {CASE_STUDIES.length === 0 && (
            <div className="empty" data-anim="up">
              <span className="icon-tile icon-tile--round"><IcDoc size={22} /></span>
              <b className="h4">Belum ada studi kasus yang dipublikasikan.</b>
              <p className="body muted maxw-560">Kami tidak menampilkan logo atau testimoni tanpa izin. Lihat cara kami menyusun kebutuhan dan menyiapkan serah terima pekerjaan.</p>
              <Link to="/process" className="link-arrow">Lihat proses kerja <ArrowRight /></Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ---------------- legal ---------------- */
export function Legal({ kind }: { kind: 'privacy' | 'terms' }) {
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref, [kind]);
  const title = kind === 'privacy' ? 'Kebijakan privasi' : 'Ketentuan layanan';
  return (
    <div ref={ref} key={kind}>
      <section className="page-hero">
        <div className="container rel stack-16 maxw-720-c">
          <span className="mono-label">LEGAL · SERVICES</span>
          <Split as="h1" className="h1-sm" text={title} />
          <span className="badge badge--warn self-start" data-anim="up">Menunggu review hukum</span>
        </div>
      </section>
      <section className="pb-section">
        <div className="container maxw-720-c">
          <div className="light legal-box stack-16" data-anim="up">
            <p className="body-16">Dokumen ini belum dipublikasikan. Isi {title.toLowerCase()} disusun dan ditinjau tim hukum sebelum formulir Start a Mission dibuka.</p>
            <dl className="legal-dl">
              <div><dt>Pengendali data</dt><dd><span className="slot-ink">[Identitas legal — menunggu verifikasi]</span></dd></div>
              <div><dt>Kontak</dt><dd><span className="slot-ink">[Email resmi — menunggu verifikasi]</span></dd></div>
              <div><dt>Versi</dt><dd><span className="slot-ink">[Belum ditetapkan]</span></dd></div>
            </dl>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------------- 404 ---------------- */
export function NotFound() {
  return (
    <section className="full-center">
      <svg className="orbit-bg" viewBox="0 0 1000 1000" aria-hidden="true">
        <g className="spin-slow"><circle cx="500" cy="500" r="260" fill="none" stroke="rgba(246,247,255,.08)" strokeDasharray="2 10" /></g>
        <g className="spin-rev"><circle cx="500" cy="500" r="380" fill="none" stroke="rgba(246,247,255,.06)" /><circle cx="880" cy="500" r="5" fill="#FF4A26" /></g>
      </svg>
      <div className="full-center__in">
        <span className="mono-label">404 · HALAMAN TIDAK DITEMUKAN</span>
        <h1 className="h1-sm">Halaman ini tidak ada.</h1>
        <p className="body-16 muted">Mungkin tautannya sudah berubah. Mulai dari daftar layanan atau kirim kebutuhan Anda.</p>
        <div className="row-12 center">
          <Link to="/" className="btn btn--light">Ke beranda Services</Link>
          <Link to="/start" className="btn btn--ghost">Start a Mission</Link>
        </div>
      </div>
    </section>
  );
}
