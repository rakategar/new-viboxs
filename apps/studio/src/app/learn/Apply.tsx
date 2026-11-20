import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useAction, useLoad } from '../../lib/hooks';
import { APP_STATUS, APP_TYPE, fmtDate } from '../../lib/labels';
import { sb, must, rpc, type Application } from '../../lib/sb';
import { Area, Btn, Card, Check, I, Loaded, PageHead, StatusBadge, TagInput, Text, useToast } from '../../ui/kit';

const PATHS: [Application['type'], string, string][] = [
  ['ranger', 'Ranger', 'Mengerjakan misi proyek (web, desain, video, AI, konten) dengan fee per proyek.'],
  ['trainer', 'EDU Contributor', 'Menyusun webinar, workshop, atau e-book untuk EDU.'],
  ['opc_founder', 'OPC Founder', 'Menjalankan usaha sendiri dan ingin bergabung dengan jaringan bisnis.'],
  ['business_partner', 'Business Partner', 'Kerja sama B2B dengan VIBOXS atau anggota jaringan.'],
];

/** LRN-07: jalur profesional = aplikasi baru ke Commander. Tidak ada upgrade otomatis. */
export default function Apply() {
  const { me } = useAuth();
  const toast = useToast();
  const mine = useLoad(() => must(sb.from('st_applications').select('*').eq('person_id', me!.profile.id).order('created_at', { ascending: false })) as Promise<Application[]>);
  const [type, setType] = useState<Application['type'] | null>(null);
  const [exp, setExp] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [portfolio, setPortfolio] = useState('');
  const [role, setRole] = useState('');
  const [agree, setAgree] = useState(false);
  const { busy, run } = useAction();
  const send = () => run('s', async () => {
    if (!agree) throw new Error('Setujui pemrosesan data aplikasi.');
    if (portfolio && !/^https:\/\//.test(portfolio)) throw new Error('Tautan portofolio harus diawali https://');
    return rpc<string>('st_apply', { p_type: type, p_payload: { experience: exp.trim(), skills, portfolio, role_in_previous_project: role, consent_version: 'application-draft-2026-11' } });
  }, (ref) => { toast(`Aplikasi ${ref} terkirim. Status: menunggu review Commander.`); setType(null); setExp(''); setSkills([]); setPortfolio(''); setRole(''); setAgree(false); mine.reload(); }, (e) => toast(e, 'err'));
  return (
    <div className="st-page-in">
      <PageHead eyebrow="Progressive path" title="Jalur profesional" desc="Mengajukan aplikasi tidak menambah akses apa pun. Commander meninjau, lalu — bila disetujui — mengirim undangan untuk peran baru di akun yang sama." />
      <Loaded state={mine} empty={() => null}>
        {(d) => d.length > 0 ? (
          <Card title="Aplikasi Anda">
            <ul className="st-list">{d.map((a) => <li key={a.id}><span><b>{APP_TYPE[a.type]}</b><small>{a.ref} · {fmtDate(a.created_at, false)}</small></span><StatusBadge map={APP_STATUS} value={a.status} /></li>)}</ul>
          </Card>
        ) : null}
      </Loaded>
      {!type ? (
        <div className="st-paths">
          {PATHS.map(([k, t, d], i) => (
            <button key={k} type="button" className="st-pathcard" style={{ ['--i' as string]: i }} onClick={() => setType(k)}>
              <b>{t}</b><span>{d}</span><I.arrow size={16} />
            </button>
          ))}
        </div>
      ) : (
        <Card title={`Aplikasi ${APP_TYPE[type]}`} actions={<Btn size="sm" kind="quiet" onClick={() => setType(null)}><I.back size={14} />Ganti jalur</Btn>}>
          <div className="st-form">
            <Area label="Pengalaman singkat" value={exp} onChange={setExp} rows={4} required hint="Minimal 20 karakter. Ceritakan proyek/karya yang relevan." />
            <TagInput label="Keahlian utama" value={skills} onChange={setSkills} />
            <Text label="Tautan portofolio / karya" value={portfolio} onChange={setPortfolio} placeholder="https://…" wide hint="Jangan kirim kata sandi atau akses repo privat." />
            {type === 'ranger' && <Text label="Peran di proyek sebelumnya" value={role} onChange={setRole} placeholder="mis. sendiri / anggota tim frontend" wide />}
            <div className="st-field st-field--wide"><Check label="Saya setuju data aplikasi ini diproses untuk seleksi." hint="Klaim level & keahlian bersifat self-declared sampai diverifikasi." checked={agree} onChange={setAgree} /></div>
            <div className="st-form__act"><Btn kind="primary" onClick={send} busy={busy === 's'}>Kirim aplikasi</Btn></div>
          </div>
        </Card>
      )}
    </div>
  );
}
