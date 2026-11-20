import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useAction } from '../../lib/hooks';
import { sb, must, type LearnerProfile } from '../../lib/sb';
import { Btn, Chips, I, PageHead, useToast } from '../../ui/kit';
import { FORMATS, GOALS, HOURS, INTERESTS, LEVELS } from './rules';

type Ans = { goal: string; level: string; hours: string; interests: string[]; formats: string[] };
const STEPS = ['Tujuan', 'Pengalaman', 'Waktu', 'Minat', 'Format'] as const;

/** LRN-02: wawancara awal terstruktur, 5 langkah, bisa diulang & dikoreksi kapan saja. */
export default function Assessment() {
  const { me } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [i, setI] = useState(0);
  const [a, setA] = useState<Ans>({ goal: '', level: '', hours: '', interests: [], formats: [] });
  const { busy, run } = useAction();
  useEffect(() => {
    sb.from('st_learner_profiles').select('*').eq('person_id', me!.profile.id).maybeSingle().then(({ data }) => {
      const lp = data as LearnerProfile | null;
      if (lp) setA({ goal: lp.goal ?? '', level: lp.level ?? '', hours: lp.hours ?? '', interests: lp.interests, formats: lp.formats });
    });
  }, [me]);
  const ok = [!!a.goal, !!a.level, !!a.hours, a.interests.length > 0, a.formats.length > 0][i];
  const finish = () => run('save', async () => {
    await must(sb.from('st_learner_profiles').upsert({ person_id: me!.profile.id, goal: a.goal, level: a.level, hours: a.hours, interests: a.interests, formats: a.formats, answers: a, rules_version: 'rules-v1' }));
  }, () => { toast('Jawaban tersimpan. Rekomendasi diperbarui.'); nav('/learn/recommendations'); }, (e) => toast(e, 'err'));

  const Radio = ({ opts, k }: { opts: [string, string, ...unknown[]][]; k: 'goal' | 'level' | 'hours' }) => (
    <div className="st-radios" role="radiogroup" aria-label={STEPS[i]}>
      {opts.map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={a[k] === v} className={`st-radio ${a[k] === v ? 'is-on' : ''}`} onClick={() => setA({ ...a, [k]: v })}>
          <span className="st-radio__dot" aria-hidden="true">{a[k] === v && <I.check size={12} />}</span>{l}
        </button>
      ))}
    </div>
  );

  return (
    <div className="st-page-in st-narrow">
      <PageHead eyebrow={`Asesmen awal · langkah ${i + 1} dari ${STEPS.length}`} title={['Apa yang ingin Anda capai?', 'Seberapa familiar dengan topik ini?', 'Berapa waktu belajar Anda?', 'Topik apa yang menarik?', 'Format belajar favorit?'][i]}
        desc="Berbasis aturan yang bisa dijelaskan — bukan tes bakat, bukan diagnosis, bukan seleksi kerja." />
      <ol className="st-stepper" aria-label="Kemajuan">
        {STEPS.map((s, j) => <li key={s} className={j < i ? 'is-done' : j === i ? 'is-now' : ''} aria-current={j === i ? 'step' : undefined}><span>{j < i ? <I.check size={12} /> : j + 1}</span>{s}</li>)}
      </ol>
      <div className="st-assess" key={i}>
        {i === 0 && <Radio opts={GOALS} k="goal" />}
        {i === 1 && <Radio opts={LEVELS} k="level" />}
        {i === 2 && <Radio opts={HOURS} k="hours" />}
        {i === 3 && <Chips label="Pilih satu atau lebih" options={INTERESTS} value={a.interests} onChange={(v) => setA({ ...a, interests: v })} />}
        {i === 4 && <Chips label="Pilih satu atau lebih" options={FORMATS} value={a.formats} onChange={(v) => setA({ ...a, formats: v })} />}
      </div>
      <div className="st-form__act">
        {i > 0 && <Btn onClick={() => setI(i - 1)}><I.back size={16} />Sebelumnya</Btn>}
        {i < STEPS.length - 1 ? <Btn kind="primary" disabled={!ok} onClick={() => setI(i + 1)}>Lanjut<I.arrow size={16} /></Btn>
          : <Btn kind="primary" disabled={!ok} onClick={finish} busy={busy === 'save'}>Simpan & lihat rekomendasi</Btn>}
      </div>
      <p className="st-hint">Anggaran tidak ditanyakan. Jawaban hanya dipakai untuk mengurutkan program EDU yang tersedia, dan bisa Anda ubah kapan saja.</p>
    </div>
  );
}
