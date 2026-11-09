import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from '@viboxs/shared/icons';
import { Magnetic, Split, useSpotlight } from '@viboxs/shared/fx';
import { useMotion } from '@viboxs/shared/motion';
import EcoLink from '../components/EcoLink';
import { IcGrad, IcLock, IcServer } from '../components/icons';
import { startHref } from '../lib/content';

/* ---------------- /partners ---------------- */
export function Partners() {
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref);
  const start = startHref({ jenis: 'partner', org: 'agency', from: 'Partners · kolaborasi' });
  return (
    <div ref={ref}>
      <section className="page-hero">
        <div className="page-hero__glow page-hero__glow--l" aria-hidden="true" />
        <div className="container rel split-2 align-center">
          <div className="stack-24">
            <span className="mono-label">PARTNERS · B2B &amp; WHITE-LABEL · RAHASIA</span>
            <Split as="h1" className="h1-sm" text="Technology delivery di belakang hubungan bisnis yang sudah Anda bangun." />
            <p className="lead muted" data-anim="up">Untuk trainer, konsultan, dan agency yang ingin menawarkan solusi digital kepada klien — tanpa membangun tim teknis sendiri.</p>
            <div data-anim="up"><Magnetic><Link to={start} className="btn btn--primary">Diskusikan Kolaborasi <ArrowRight /></Link></Magnetic></div>
          </div>
          <div className="collab" role="img" aria-label="Diagram kolaborasi anonim: klien Anda berhubungan dengan Anda; VIBOXS bekerja di belakang Anda sebagai tim delivery dalam lapisan kerahasiaan." data-build="Diagram · kolaborasi">
            <span className="mono-label">DIAGRAM KOLABORASI · ANONIM · ILUSTRASI</span>
            <div className="collab__stack">
              <div className="collab__layer collab__layer--client">
                <span className="mono-label">Klien Anda</span><b>Pemilik kebutuhan</b><span className="xs muted">Berhubungan langsung dengan Anda.</span>
              </div>
              <div className="collab__wire" aria-hidden="true"><i /></div>
              <div className="collab__layer collab__layer--you">
                <span className="mono-label accent">Anda · partner</span><b>Pemegang hubungan</b><span className="xs muted">Tetap menjadi wajah di depan klien.</span>
              </div>
              <div className="collab__wire" aria-hidden="true"><i /></div>
              <div className="collab__layer collab__layer--secret">
                <span className="collab__lock"><IcLock size={14} /> Lapisan rahasia</span>
                <img src="/assets/viboxs-wordmark-white.png" alt="" height={12} />
                <b>Tim delivery</b><span className="xs muted">Build, QC, dan dokumentasi di belakang Anda.</span>
              </div>
            </div>
            <div className="collab__legend xs muted"><span>Klien ↔ Anda: hubungan &amp; komunikasi</span><span>Anda ↔ VIBOXS: brief, SOW, QC, dokumentasi</span></div>
          </div>
        </div>
      </section>

      <section className="section section--line">
        <div className="container stack-48">
          <div className="stack-16">
            <span className="eyebrow" data-anim="up">Untuk siapa</span>
            <div className="tags" data-anim="stagger">
              {['Trainer', 'Consultant', 'Agency', 'Strategic business partner', 'Channel partner'].map((t) => <span key={t}>{t}</span>)}
            </div>
          </div>
          <div className="split-2 align-start">
            <div className="panel" data-build="Panel · manfaat">
              <span className="eyebrow">Yang Anda dapatkan</span>
              <ul className="ticks">
                {['Konsultasi solusi sebelum Anda menawarkan ke klien', 'Kemampuan build untuk lima layanan inti', 'Delivery rahasia — nama Anda yang tampil', 'Dokumentasi dan quality control per milestone'].map((t) => (
                  <li key={t}><span><Check size={14} /></span>{t}</li>
                ))}
              </ul>
            </div>
            <div className="panel" data-build="Panel · batas kerja sama">
              <span className="eyebrow">Batas kerja sama</span>
              <ul className="bounds">
                <li><strong>NDA bila relevan</strong><span className="small muted">Kerahasiaan diatur tertulis sebelum detail klien dibagikan.</span></li>
                <li><strong>Client ownership</strong><span className="small muted">Hubungan dengan klien tetap milik Anda.</span></li>
                <li><strong>SOW per engagement</strong><span className="small muted">Setiap proyek punya lingkup, biaya, dan jadwal sendiri.</span></li>
              </ul>
            </div>
          </div>
          <div className="cta-band" data-anim="up">
            <span className="body-16 row-10"><IcLock size={18} />Inquiry partner diperlakukan rahasia sejak pesan pertama.</span>
            <Link to={start} className="btn btn--light btn--sm">Diskusikan Kolaborasi <ArrowRight /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------------- /advisory ---------------- */
export function Advisory() {
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref);
  return (
    <div ref={ref}>
      <section className="page-hero">
        <div className="page-hero__glow" aria-hidden="true" />
        <div className="container rel split-2 align-center">
          <div className="stack-24">
            <span className="mono-label">01 · DIAGNOSE · STRATEGIC ADVISORY</span>
            <Split as="h1" className="h1-sm" text="Pahami masalahnya sebelum memilih solusinya." />
            <p className="lead muted" data-anim="up">Diagnosis bisnis, opportunity mapping, dan roadmap produk atau AI — untuk Anda yang belum yakin apa yang perlu dibangun lebih dulu.</p>
            <div data-anim="up"><Magnetic><Link to={startHref({ kategori: 'advisory', from: 'Strategic Advisory' })} className="btn btn--primary">Diskusikan tantangan <ArrowRight /></Link></Magnetic></div>
          </div>
          <figure className="photo" data-build="Gambar · foto stok">
            <img data-parallax="40" src="/assets/photo-diskusi.jpeg" alt="Tim berdiskusi di depan papan berisi grafik" />
            <figcaption>Foto stok · ilustrasi</figcaption>
          </figure>
        </div>
      </section>
      <section className="section section--line">
        <div className="container stack-40">
          <div className="mods">
            {[
              ['A · DIAGNOSIS', 'Diagnosis bisnis', 'Memetakan proses, hambatan, dan data yang ada sekarang.', 'Output: peta masalah'],
              ['B · DISCOVERY', 'Opportunity mapping', 'Membandingkan peluang perbaikan beserta dampak, risiko, dan prasyaratnya.', 'Output: daftar prioritas'],
              ['C · ROADMAP', 'Arah produk & AI', 'Urutan langkah yang realistis, termasuk kapan AI relevan dan kapan tidak.', 'Output: roadmap bertahap'],
            ].map(([k, t, d, o], i) => <ModCard key={k} k={k} t={t} d={d} o={o} i={i} />)}
          </div>
          <div className="note note--warn hold" data-anim="up">
            <strong>Harga advisory ditahan sampai lingkupnya jelas</strong>
            <span>Tidak ada harga publik dan tidak ada booking berbayar. Setelah percakapan awal, kami menyiapkan penjelasan lingkup, estimasi, dan ketentuan dalam proposal.</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function ModCard({ k, t, d, o, i }: { k: string; t: string; d: string; o: string; i: number }) {
  const spot = useSpotlight<HTMLDivElement>();
  return (
    <div ref={spot} className="mod" data-build={`Modul · ${t}`}>
      <span className="svc-card__glow" aria-hidden="true" />
      <span className="mod__track" aria-hidden="true"><span style={{ width: `${(i + 1) * 33.3}%` }} /></span>
      <span className="mono-label">{k}</span>
      <b className="h3">{t}</b>
      <span className="body muted">{d}</span>
      <span className="mod__out">{o}</span>
    </div>
  );
}

/* ---------------- /capabilities ---------------- */
export function Capabilities() {
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref);
  return (
    <div ref={ref}>
      <section className="page-hero page-hero--pb">
        <div className="page-hero__glow" aria-hidden="true" />
        <div className="container rel stack-48">
          <div className="stack-20 maxw-720">
            <span className="mono-label">CAPABILITIES · KAPABILITAS PENDUKUNG</span>
            <Split as="h1" className="h1-sm" text="Pelatihan tim dan infrastruktur digital." />
            <p className="lead muted" data-anim="up">Dua kapabilitas yang mendukung lima layanan inti — dikerjakan custom per organisasi.</p>
          </div>
          <div className="caps">
            <CapCard>
              <span className="icon-tile icon-tile--lg"><IcGrad size={24} /></span>
              <h2 className="h3-lg">Academy &amp; Corporate Training</h2>
              <p className="body-16 muted">Program pelatihan yang disusun untuk satu organisasi — materi, latihan, dan studi kasus disesuaikan dengan proses tim Anda.</p>
              <ul className="ticks">{['Asesmen kebutuhan tim', 'Kurikulum dan materi custom', 'Sesi praktik dengan data contoh internal'].map((t) => <li key={t}><span><Check size={14} /></span>{t}</li>)}</ul>
              <div className="edu-note"><span className="strong small">Mencari kelas publik?</span><span className="small muted">Kelas untuk individu dikelola oleh EDU. <EcoLink k="edu">Lihat program di EDU ↗</EcoLink></span></div>
              <Link to={startHref({ kategori: 'training', from: 'Corporate Training' })} className="btn btn--light btn--sm self-start">Diskusikan pelatihan tim <ArrowRight /></Link>
            </CapCard>
            <CapCard>
              <span className="icon-tile icon-tile--lg"><IcServer size={24} /></span>
              <h2 className="h3-lg">Digital Infrastructure</h2>
              <p className="body-16 muted">Fondasi teknis agar website dan sistem tetap bisa diakses dan diperbarui.</p>
              <div className="infra">
                {['Domain', 'Hosting', 'SSL', 'Maintenance'].map((t, i) => <span key={t} style={{ ['--i' as string]: i }}><i />{t}</span>)}
              </div>
              <span className="xs-13 muted">Biaya pihak ketiga (registrar, penyedia hosting) dijelaskan terpisah di proposal. Kepemilikan akun ditulis di SOW.</span>
              <Link to={startHref({ kategori: 'infra', from: 'Digital Infrastructure' })} className="btn btn--light btn--sm self-start">Bahas infrastruktur <ArrowRight /></Link>
            </CapCard>
          </div>
        </div>
      </section>
    </div>
  );
}

function CapCard({ children }: { children: ReactNode }) {
  const spot = useSpotlight<HTMLDivElement>();
  return <div ref={spot} className="cap" data-build="Kartu · kapabilitas"><span className="svc-card__glow" aria-hidden="true" />{children}</div>;
}
