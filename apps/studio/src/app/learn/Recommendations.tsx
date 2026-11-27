import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ORIGIN } from '@viboxs/shared/ecosystem';
import { useAuth } from '../../lib/auth';
import { aiAssist } from '../../lib/edu';
import { useAction, useLoad } from '../../lib/hooks';
import { PROG_PATH, PROG_TYPE, isDigital } from '../../lib/labels';
import { sb, must, type AiDiscovery, type LearnerProfile } from '../../lib/sb';
import { Badge, Btn, Empty, I, Loaded, PageHead, useToast } from '../../ui/kit';
import { GOALS, fetchCatalog, recommend } from './rules';

/** LRN-03: hanya program EDU yang benar-benar tayang; tiap kartu menjelaskan alasannya. */
export default function Recommendations() {
  const { me } = useAuth();
  const toast = useToast();
  const [ai, setAi] = useState<AiDiscovery | null>(null);
  const { busy, run } = useAction();
  const s = useLoad(async () => {
    const [lp, cat] = await Promise.all([
      must(sb.from('st_learner_profiles').select('*').eq('person_id', me!.profile.id).maybeSingle()) as Promise<LearnerProfile | null>,
      fetchCatalog(),
    ]);
    return { lp, recs: lp ? recommend(lp, cat) : [], total: cat.length };
  });
  return (
    <div className="st-page-in">
      <PageHead eyebrow="Rekomendasi · rules-v1" title="Program yang cocok untuk Anda" desc="Diurutkan dari katalog edu.viboxs.com yang sedang tayang. Pembelian tetap di EDU; membeli ≠ menyelesaikan ≠ kualifikasi profesional.">
        <Link to="/learn/assessment" className="st-btn st-btn--ghost st-btn--sm"><I.refresh size={14} />Ubah jawaban</Link>
      </PageHead>
      <Loaded state={s}>
        {(d) => !d.lp ? (
          <Empty title="Isi asesmen awal dulu" icon={I.compass}><Link to="/learn/assessment" className="st-btn st-btn--primary st-btn--sm">Mulai asesmen</Link></Empty>
        ) : (
          <>
            <p className="st-muted">Tujuan: <b>{GOALS.find((g) => g[0] === d.lp!.goal)?.[1] ?? '—'}</b> · {d.total} program tayang diperiksa.</p>
            <section className="st-ai">
              {!ai ? (
                <>
                  <span className="st-stack--tight"><b className="st-small">Ringkasan kebutuhan dengan AI (opsional)</b><span className="st-small st-muted">Jawaban asesmen awalmu dibaca AI untuk merangkum celah belajar. AI hanya boleh memilih dari program yang tayang; bukan tes psikologi dan bukan jaminan peluang.</span></span>
                  <Btn size="sm" busy={busy === 'ai'} onClick={() => run('ai', () => aiAssist<AiDiscovery>({ action: 'discovery_summary' }), (r) => r && setAi(r), (e) => toast(e, 'err'))}><I.spark size={14} />Buat ringkasan</Btn>
                </>
              ) : (
                <div className="st-stack--tight">
                  <span className="row-between"><b className="st-small">Ringkasan AI · versi jawaban {ai.discovery_version}</b><Badge tone={ai.confidence_band === 'high' ? 'ok' : ai.confidence_band === 'medium' ? 'info' : 'warn'}>keyakinan {ai.confidence_band === 'high' ? 'tinggi' : ai.confidence_band === 'medium' ? 'sedang' : 'rendah'}</Badge></span>
                  {ai.goal && <p className="st-small"><b>Arah:</b> {ai.goal}</p>}
                  {ai.current_gap && <p className="st-small"><b>Yang perlu dikuatkan:</b> {ai.current_gap}</p>}
                  {ai.recommended.length ? <ul className="st-reasons">{ai.recommended.map((r) => <li key={r.slug}><I.check size={12} /><a href={`${ORIGIN.edu}/programs/${r.slug}`} target="_blank" rel="noopener noreferrer">{r.title}</a>{r.reason && ` — ${r.reason}`}</li>)}</ul>
                    : <p className="st-small st-muted">Belum ada kelas yang sesuai. Kami tidak mengarang kelas.</p>}
                  {ai.alternative_actions.length > 0 && <p className="st-small st-muted">Langkah lain: {ai.alternative_actions.join(' · ')}</p>}
                  <small className="st-muted">{ai.model} · dapat keliru; ubah jawaban asesmen bila kurang tepat.</small>
                </div>
              )}
            </section>
            {!d.recs.length ? (
              <Empty title="Belum ada kelas yang sesuai" icon={I.book}>
                <p>Kami tidak mengarang kelas. Coba ubah minat, atau jelajahi kategori umum: {Object.values(PROG_PATH).join(' · ')}.</p>
                <a href={`${ORIGIN.edu}/programs`} className="st-btn st-btn--ghost st-btn--sm">Lihat semua program EDU<I.ext size={14} /></a>
              </Empty>
            ) : (
              <div className="st-recs">
                {d.recs.map(({ p, reasons, score }, i) => (
                  <article key={p.slug} className="st-rec" style={{ ['--i' as string]: i }}>
                    <div className="row-between"><span className="st-mono">{PROG_TYPE[p.type] ?? p.type} · {PROG_PATH[p.path] ?? p.path}</span><span className="st-match" style={{ ['--m' as string]: Math.min(1, score / 8) }}><i />cocok</span></div>
                    <b className="st-rec__t">{p.title}</b>
                    <p className="st-small st-muted st-clamp">{p.summary}</p>
                    <ul className="st-reasons">{reasons.map((r) => <li key={r}><I.check size={12} />{r}</li>)}</ul>
                    <div className="row-between">
                      <span className="st-small">{p.date ?? (isDigital(p.type) ? 'Akses mandiri' : 'Tanggal menyusul')}{p.free && <Badge tone="ok">Gratis</Badge>}</span>
                      <a href={`${ORIGIN.edu}/programs/${p.slug}`} target="_blank" rel="noopener noreferrer" className="st-btn st-btn--ghost st-btn--sm">Lihat di EDU<I.ext size={14} /></a>
                    </div>
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
