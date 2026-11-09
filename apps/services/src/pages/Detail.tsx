import { useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Check } from '@viboxs/shared/icons';
import { Magnetic, Split, useSpotlight } from '@viboxs/shared/fx';
import { useMotion } from '@viboxs/shared/motion';
import Accordion from '../components/Accordion';
import { catIcon } from '../components/icons';
import { SVC, SVC_ORDER, dFaq, startHref, svcBySlug, svcHref, type Service } from '../lib/content';
import { NotFound } from './Misc';

export default function Detail() {
  const { slug } = useParams();
  const s = svcBySlug(slug);
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref, [slug]);
  if (!s) return <NotFound />;
  const startLabel = `Diskusikan ${s.name}`;
  const start = startHref({ kategori: s.key, from: s.name });

  return (
    <div ref={ref} key={s.key}>
      <DHero s={s} start={start} startLabel={startLabel} />

      {s.photo && (
        <div className="container pb-section">
          <figure className="photo photo--wide" data-anim="clip">
            <img data-parallax="50" src={s.photo} alt={s.photoAlt} />
            <figcaption>Foto stok · ilustrasi</figcaption>
          </figure>
        </div>
      )}

      <section className="section">
        <div className="container stack-40">
          <div className="sec-head__copy">
            <span className="eyebrow" data-anim="up">Untuk siapa</span>
            <Split className="h2" text="Masalah yang biasanya kami dengar." />
          </div>
          <div className="who3" data-anim="stagger">
            {s.forWhom.map(([t, x], i) => (
              <div key={t} className="who3__card">
                <span className="mono-label">0{i + 1}</span>
                <b className="h4">{t}</b>
                <p className="body muted">“{x}”</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section light">
        <div className="container split-2 align-start">
          <div className="stack-24">
            <span className="eyebrow ink-muted" data-anim="up">Kemungkinan deliverable</span>
            <Split className="h2" text="Yang bisa masuk ruang lingkup." />
            <ul className="deliv" data-anim="stagger">
              {s.deliv.map(([t, c]) => (
                <li key={t}>
                  <span className="deliv__ic"><Check size={14} /></span>
                  <span>{t}</span>
                  {c && <span className="deliv__c">{c}</span>}
                </li>
              ))}
            </ul>
          </div>
          <div className="stack-16">
            <span className="eyebrow ink-muted" data-anim="up">Contoh penggunaan</span>
            <div className="cases" data-anim="stagger">
              {s.cases.map(([t, x], i) => (
                <div key={t} className="case">
                  <span className="mono xs ink-muted">{String(i + 1).padStart(2, '0')}</span>
                  <b>{t}</b>
                  <span className="small ink-muted">{x}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container stack-48">
          <div className="stack-24">
            <div className="sec-head">
              <div className="sec-head__copy">
                <span className="eyebrow" data-anim="up">Proses</span>
                <Split className="h2" text="Alur yang sama untuk setiap proyek." />
              </div>
              <Link to="/process" className="link-arrow" data-anim="up">Detail di halaman Process <ArrowRight /></Link>
            </div>
            <ol className="pstrip" data-anim="stagger">
              {['Discovery', 'Kebutuhan', 'SOW / quotation', 'Build', 'UAT', 'Handover'].map((t, i) => (
                <li key={t}><span className="pstrip__n">{i + 1}</span><span>{t}</span></li>
              ))}
            </ol>
          </div>
          <div className="split-2 align-start">
            <div className="excl" data-anim="up">
              <span className="eyebrow">Batasan &amp; risiko</span>
              <b className="body-16">{s.exclLead}</b>
              <ul>{s.excl.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
            <div className="stack-16" data-anim="up">
              <h2 className="h3">Pertanyaan umum</h2>
              <Accordion items={dFaq(s).map((q) => ({ q: q.q, a: q.a }))} />
            </div>
          </div>
        </div>
      </section>

      <section className="pb-section">
        <div className="container stack-40">
          <div className="cta-band" data-anim="up">
            <div className="stack-6">
              <b className="h3">Siap membahas {s.name}?</b>
              <span className="body muted">Brief Anda kami baca dulu. Tidak ada komitmen biaya sampai proposal disepakati.</span>
            </div>
            <Magnetic><Link to={start} className="btn btn--primary">{startLabel} <ArrowRight /></Link></Magnetic>
          </div>
          <span className="eyebrow">Layanan lain</span>
          <div className="others" data-anim="stagger">
            {SVC_ORDER.filter((k) => k !== s.key).map((k) => <OtherCard key={k} o={SVC[k]} />)}
          </div>
        </div>
      </section>
    </div>
  );
}

function DHero({ s, start, startLabel }: { s: Service; start: string; startLabel: string }) {
  const Ic = catIcon[s.key];
  return (
    <section className="page-hero d-hero">
      <div className="page-hero__glow" aria-hidden="true" />
      <div className="container rel stack-32">
        <nav aria-label="Breadcrumb" className="crumbs">
          <ol>
            <li><Link to="/#solutions">Services</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{s.name}</li>
          </ol>
        </nav>
        <div className="split-2 align-end">
          <div className="stack-24">
            <span className="mono-label row-10"><span className="svc-card__ic"><Ic size={16} /></span>{s.n} · LAYANAN INTI</span>
            <Split as="h1" className="h1-sm" text={s.name} />
            <p className="lead muted" data-anim="up">{s.promise}</p>
            <div className="row-12" data-anim="up">
              <Magnetic><Link to={start} className="btn btn--primary">{startLabel} <ArrowRight /></Link></Magnetic>
              <Link to="/process" className="btn btn--ghost">Lihat proses kerja</Link>
            </div>
            <span className="xs-13 muted" data-anim="up">Berbasis proposal — estimasi biaya disusun setelah scoping.</span>
          </div>
          <div className="io" role="img" aria-label="Diagram: tantangan masuk, diproses melalui layanan, menjadi contoh output." data-anim="up">
            <span className="mono-label">INPUT → INTERVENSI → OUTPUT · ILUSTRASI</span>
            <div className="io__col">
              {s.inputs.map((x, i) => <span key={x} className="io__in" style={{ ['--i' as string]: i }}>{x}</span>)}
            </div>
            <div className="io__link" aria-hidden="true"><i /><i /><i /></div>
            <div className="io__core">
              <span className="io__ring" aria-hidden="true" />
              <b>{s.name}</b>
              <span className="xs muted">Diagnosis → desain lingkup → pembangunan → review &amp; handover</span>
            </div>
            <div className="io__link" aria-hidden="true"><i /><i /><i /></div>
            <div className="io__col io__col--out">
              {s.outputs.map((x, i) => <span key={x} className="io__out" style={{ ['--i' as string]: i }}>{x}</span>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function OtherCard({ o }: { o: Service }) {
  const spot = useSpotlight<HTMLDivElement>();
  const Ic = catIcon[o.key];
  return (
    <div ref={spot} className="other">
      <span className="svc-card__glow" aria-hidden="true" />
      <span className="row-10"><span className="svc-card__ic"><Ic size={16} /></span><span className="mono xs muted">{o.n}</span></span>
      <b className="h4">{o.name}</b>
      <span className="small muted lh">{o.problem}</span>
      <span className="xs muted other__ex">Batasan: {o.exclShort}</span>
      <div className="row-16">
        <Link to={svcHref(o.key)} className="link-arrow">Lihat detail <ArrowRight /></Link>
        <Link to={startHref({ kategori: o.key, from: o.name })} className="small strong">Mulai →</Link>
      </div>
    </div>
  );
}
