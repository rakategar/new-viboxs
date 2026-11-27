import { useState } from 'react';
import { ORIGIN } from '@viboxs/shared/ecosystem';
import { useAuth } from '../../lib/auth';
import { useLoad } from '../../lib/hooks';
import { PROG_PATH, PROG_STATUS, PROG_TYPE, ago } from '../../lib/labels';
import { sb, must, type ProgramDraft } from '../../lib/sb';
import { Btn, Empty, I, Loaded, PageHead, StatusBadge } from '../../ui/kit';
import { ProgramEditor } from './ProgramForm';

/** EDU-01..07 + v4 WP04: kontributor membuat draft per format & mengajukan review. Tayang otomatis setelah Commander menyetujui. */
export default function Programs() {
  const { me } = useAuth();
  const s = useLoad(() => must(sb.from('st_program_drafts').select('*').eq('owner_id', me!.profile.id).order('updated_at', { ascending: false })) as Promise<ProgramDraft[]>);
  const [edit, setEdit] = useState<ProgramDraft | 'new' | null>(null);
  return (
    <div className="st-page-in">
      <PageHead eyebrow="EDU Creator" title="Program saya" desc="Draft → review Commander → tayang otomatis di EDU. Status “Tayang” muncul hanya setelah EDU mengonfirmasi.">
        {!edit && <Btn kind="primary" onClick={() => setEdit('new')}><I.plus size={16} />Program baru</Btn>}
      </PageHead>
      {edit ? (
        <ProgramEditor initial={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSaved={() => { s.reload(); setEdit(null); }} />
      ) : (
        <Loaded state={s} empty={(d) => (d.length ? null : <Empty title="Belum ada program" icon={I.book}>Mulai dari satu webinar atau e-book. Anda bisa menyimpan draft kapan saja.</Empty>)}>
          {(d) => (
            <div className="st-cards">
              {d.map((p, i) => (
                <article key={p.id} className="st-lead" style={{ ['--i' as string]: i }}>
                  <span className="row-between"><span className="st-mono">{PROG_TYPE[p.type]} · {PROG_PATH[p.path]}</span><StatusBadge map={PROG_STATUS} value={p.status} /></span>
                  <b>{p.title}</b>
                  <span className="st-small st-muted st-clamp">{p.summary || 'Belum ada ringkasan.'}</span>
                  {p.status === 'needs_revision' && p.review_note && <span className="st-alert st-alert--warn st-small">Catatan review: {p.review_note}</span>}
                  {p.status === 'publish_queued' && <span className="st-alert st-alert--info st-small">Permintaan publikasi dikirim. Kami sedang memastikan produk berhasil tampil di EDU.</span>}
                  {p.status === 'publish_failed' && <span className="st-alert st-alert--err st-small">Belum terkirim ke EDU: {p.publish_error ?? 'kesalahan adapter'}. Commander akan menayangkan ulang.</span>}
                  <span className="row-between"><span className="st-small st-muted">Diperbarui {ago(p.updated_at)}</span>
                    {['draft', 'needs_revision'].includes(p.status) ? <Btn size="sm" onClick={() => setEdit(p)}>Edit</Btn>
                      : p.status === 'published' && p.edu_slug ? <a className="st-btn st-btn--ghost st-btn--sm" href={`${ORIGIN.edu}/${p.type === 'ebook' || p.type === 'kit' ? 'digital-library' : 'programs'}/${p.edu_slug}`} target="_blank" rel="noopener noreferrer">Permalink EDU<I.ext size={14} /></a>
                        : <Btn size="sm" kind="quiet" onClick={() => setEdit(p)}>Lihat</Btn>}
                  </span>
                </article>
              ))}
            </div>
          )}
        </Loaded>
      )}
    </div>
  );
}
