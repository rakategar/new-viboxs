import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mailto } from '@viboxs/shared/ecosystem';
import { useAuth } from '../lib/auth';
import { useAction, useLoad } from '../lib/hooks';
import { ROLE, GRANT_STATUS, ago, fmtDate } from '../lib/labels';
import { sb, must, type Notification, type Grant } from '../lib/sb';
import { Btn, Card, ComingSoon, Empty, I, Loaded, PageHead, StatusBadge, TagInput, Text, Tabs, useToast } from '../ui/kit';

export function Notifications() {
  const nav = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState<'unread' | 'all'>('unread');
  const s = useLoad(() => {
    let q = sb.from('st_notifications').select('*').order('created_at', { ascending: false }).limit(100);
    if (tab === 'unread') q = q.is('read_at', null);
    return must(q) as Promise<Notification[]>;
  }, [tab]);
  const { busy, run } = useAction();
  const markAll = () => run('all', async () => {
    const ids = (s.data ?? []).filter((n) => !n.read_at).map((n) => n.id);
    if (ids.length) await must(sb.from('st_notifications').update({ read_at: new Date().toISOString() }).in('id', ids));
  }, () => { toast('Semua ditandai dibaca.'); s.reload(); }, (m) => toast(m, 'err'));
  const open = async (n: Notification) => {
    if (!n.read_at) await sb.from('st_notifications').update({ read_at: new Date().toISOString() }).eq('id', n.id);
    if (n.link) nav(n.link); else s.reload();
  };
  return (
    <div className="st-page-in">
      <PageHead eyebrow="Pusat notifikasi" title="Notifikasi" desc="Kanal awal in-app dan realtime. Tautan diperiksa ulang sesuai peran setiap kali dibuka.">
        <Btn onClick={markAll} busy={busy === 'all'}><I.check size={16} />Tandai semua dibaca</Btn>
      </PageHead>
      <Tabs label="Filter notifikasi" value={tab} onChange={setTab} tabs={[['unread', 'Belum dibaca'], ['all', 'Semua']]} />
      <Loaded state={s} empty={(d) => (d.length ? null : <Empty title={tab === 'unread' ? 'Tidak ada yang belum dibaca' : 'Belum ada notifikasi'} icon={I.bell}>Notifikasi baru muncul di sini secara realtime.</Empty>)}>
        {(d) => (
          <ul className="st-notifs">
            {d.map((n, i) => (
              <li key={n.id} style={{ ['--i' as string]: i }} className={n.read_at ? '' : 'is-unread'}>
                <button type="button" onClick={() => open(n)}>
                  <i className="st-notifs__dot" aria-hidden="true" />
                  <span><b>{n.title}</b>{n.body && <small>{n.body}</small>}</span>
                  <time>{ago(n.created_at)}</time>
                  {n.link && <I.arrow size={14} />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Loaded>
    </div>
  );
}

export function Settings() {
  const { me, refresh } = useAuth();
  const toast = useToast();
  const p = me!.profile;
  const [name, setName] = useState(p.display_name);
  const [headline, setHeadline] = useState(p.headline ?? '');
  const [skills, setSkills] = useState<string[]>(p.skills ?? []);
  const { busy, run } = useAction();
  const grants = useLoad(() => must(sb.from('st_role_grants').select('*').eq('person_id', p.id).order('created_at')) as Promise<Grant[]>);
  const consents = useLoad(() => must(sb.from('st_consents').select('*').eq('person_id', p.id).order('created_at', { ascending: false })) as Promise<{ id: string; purpose: string; version: string; choice: boolean; created_at: string }[]>);
  const save = () => run('save', async () => {
    if (name.trim().length < 2) throw new Error('Nama minimal 2 karakter.');
    await must(sb.from('st_profiles').update({ display_name: name.trim(), headline: headline.trim() || null, skills }).eq('id', p.id));
    await refresh();
  }, () => toast('Profil disimpan.'), (m) => toast(m, 'err'));

  return (
    <div className="st-page-in">
      <PageHead eyebrow="Akun" title="Profil & privasi" />
      <div className="st-grid2">
        <Card title="Profil" desc="Nama tampil di thread dan daftar internal. Email login tidak bisa diubah di sini.">
          <div className="st-form">
            <Text label="Nama tampilan" value={name} onChange={setName} required />
            <Text label="Email login" value={p.email ?? ''} onChange={() => {}} hint="Untuk mengganti email, hubungi Commander." />
            <Text label="Headline profesional" value={headline} onChange={setHeadline} placeholder="mis. Web developer · Next.js" wide />
            <TagInput label="Keahlian" value={skills} onChange={setSkills} hint="Dipakai Commander untuk menargetkan penawaran misi. Pisahkan dengan koma." />
            <div className="st-form__act"><Btn kind="primary" onClick={save} busy={busy === 'save'}>Simpan profil</Btn></div>
          </div>
        </Card>
        <div className="st-stack">
          <Card title="Peran aktif" desc="Diberikan lewat undangan Commander atau self-register Learner.">
            <Loaded state={grants}>{(g) => <ul className="st-list">{g.map((x) => <li key={x.id}><span><b>{ROLE[x.role].label}</b><small>Sejak {fmtDate(x.created_at, false)}{x.note ? ` · ${x.note}` : ''}</small></span><StatusBadge map={GRANT_STATUS} value={x.status} /></li>)}</ul>}</Loaded>
          </Card>
          <Card title="Persetujuan tercatat" desc="Per tujuan dan versi kebijakan.">
            <Loaded state={consents} empty={(c) => (c.length ? null : <p className="st-muted st-small">Belum ada persetujuan tercatat.</p>)}>
              {(c) => <ul className="st-list">{c.map((x) => <li key={x.id}><span><b>{x.purpose === 'marketing' ? 'Info pemasaran' : 'Pemrosesan data akun'}</b><small>Versi {x.version} · {fmtDate(x.created_at, false)}</small></span>{x.choice ? <span className="st-badge st-badge--ok">Setuju</span> : <span className="st-badge st-badge--muted">Tidak</span>}</li>)}</ul>}
            </Loaded>
            <div className="st-row st-mt">
              <a className="st-btn st-btn--ghost st-btn--sm" href={mailto('Permintaan data pribadi — VIBOXS Studio', `Akun: ${p.email}\nJenis permintaan (ekspor / koreksi / hapus / cabut persetujuan):\n`)}><I.file size={14} />Ajukan permintaan data</a>
            </div>
            <p className="st-hint st-mt">Permintaan ekspor/penghapusan diproses manual sesuai UU 27/2022; catatan akuntansi & audit disimpan sesuai kewajiban hukum.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function Soon() {
  return (
    <div className="st-page-in">
      <PageHead eyebrow="Peta fitur" title="Segera hadir" desc="Ditampilkan sebagai informasi. Tidak ada transaksi, token, komisi, atau janji yang aktif dari halaman ini." />
      <div className="st-soon-grid">
        <ComingSoon title="AI PRD Builder">Brief → PRD, user stories, acceptance criteria, versi & ekspor. Aktif setelah provider, batas biaya, privasi, dan kualitas disetujui.</ComingSoon>
        <ComingSoon title="Design System Builder">Token visual, layout, spesifikasi komponen, pedoman responsif.</ComingSoon>
        <ComingSoon title="AI Quality Inspector" icon={I.shield}>Audit berbasis bukti dengan cakupan yang jelas — bukan label subjektif. QC saat ini dilakukan manusia.</ComingSoon>
        <ComingSoon title="Dede AI Strategy Assistant" icon={I.chat}>Konsultasi metodologi founder dengan knowledge base terkurasi.</ComingSoon>
        <ComingSoon title="Affiliate EDU" icon={I.link}>Tautan referral lintas peran, komisi terverifikasi, payout. Belum ada komisi aktif.</ComingSoon>
        <ComingSoon title="Penukaran poin" icon={I.star}>Early Points tercatat; aturan tukar menunggu persetujuan finance.</ComingSoon>
        <ComingSoon title="Investor Network" icon={I.compass}>Visi eksplorasi — bukan jaminan akses modal, pitching, atau equity.</ComingSoon>
        <ComingSoon title="Payout otomatis" icon={I.wallet}>Saat ini payout dicatat manual dengan bukti transfer.</ComingSoon>
      </div>
    </div>
  );
}

export function NoRole() {
  const { me, signOut } = useAuth();
  return (
    <div className="st-page-in">
      <Empty title="Akun ini belum memiliki peran aktif" icon={I.key}>
        <p>Masuk sebagai <b>{me?.profile.email}</b>. Akses profesional diberikan lewat undangan Commander; peran yang dicabut atau ditangguhkan tidak lagi tampil.</p>
        <div className="st-row">
          <Link to="/daftar" className="st-btn st-btn--primary">Daftar sebagai EDU Learner</Link>
          <Btn onClick={() => signOut()}>Keluar</Btn>
        </div>
      </Empty>
    </div>
  );
}
