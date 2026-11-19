import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { STATUS, type StatusCode } from '../lib/data';
import { KIND_LABEL, STATUS_LABEL, sb, type ProgramRow, type Submission, type SubKind } from './sb';
import { Card, Empty, I, PageHead, ago } from './ui';

type Stats = { programs: ProgramRow[]; subs: Submission[]; byKind: Partial<Record<SubKind, { total: number; fresh: number }>>; mailIssue: number };

export default function Overview() {
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      const [pr, sub, all] = await Promise.all([
        sb.from('edu_programs').select('*').order('position'),
        sb.from('submissions').select('*').order('created_at', { ascending: false }).limit(8),
        sb.from('submissions').select('kind,status,email_status').limit(5000),
      ]);
      if (pr.error || sub.error || all.error) { setErr((pr.error || sub.error || all.error)!.message); return; }
      const byKind: Stats['byKind'] = {};
      let mailIssue = 0;
      for (const r of all.data as { kind: SubKind; status: string; email_status: string }[]) {
        const k = (byKind[r.kind] ??= { total: 0, fresh: 0 });
        k.total++; if (r.status === 'new') k.fresh++;
        if (r.email_status !== 'sent_smtp' && r.email_status !== 'sent_formsubmit' && r.email_status !== 'pending') mailIssue++;
      }
      setS({ programs: pr.data as ProgramRow[], subs: sub.data as Submission[], byKind, mailIssue });
    })();
  }, []);

  if (err) return <div className="adm-page"><div className="adm-alert adm-alert--err">Gagal memuat: {err}</div></div>;
  if (!s) return <div className="adm-page"><div className="adm-skel" /></div>;

  const pub = s.programs.filter((p) => p.published);
  const statusCount = pub.reduce<Record<string, number>>((a, p) => { a[p.data.status] = (a[p.data.status] ?? 0) + 1; return a; }, {});
  const collab = s.byKind.collab ?? { total: 0, fresh: 0 };
  const newOther = Object.entries(s.byKind).filter(([k]) => k !== 'collab').reduce((a, [, v]) => a + (v?.fresh ?? 0), 0);

  return (
    <div className="adm-page">
      <PageHead title="Ringkasan" desc="Kondisi konten dan kiriman form di ekosistem VIBOXS.">
        <a href="/" target="_blank" rel="noopener noreferrer" className="adm-btn adm-btn--ghost"><I.ext size={16} />Lihat edu.viboxs.com</a>
      </PageHead>

      {s.mailIssue > 0 && (
        <div className="adm-alert adm-alert--warn">
          <b>{s.mailIssue} kiriman belum terkirim ke email admin.</b> Datanya tetap aman di dashboard. Bila statusnya “needs_activation”, buka inbox admin@viboxs.com dan klik tombol <i>Activate Form</i> dari FormSubmit — setelah itu email masuk otomatis.
        </div>
      )}

      <div className="adm-stats">
        <Link to="/admin/program" className="adm-stat"><span>Program tayang</span><b>{pub.length}</b><em>dari {s.programs.length} di database</em></Link>
        <Link to="/admin/kolaborator" className="adm-stat"><span>Pengajuan kolaborator</span><b>{collab.total}</b><em className={collab.fresh ? 'is-hot' : ''}>{collab.fresh} baru</em></Link>
        <Link to="/admin/pesan" className="adm-stat"><span>Pesan masuk baru</span><b>{newOther}</b><em>kontak, mission, bantuan, pendaftaran</em></Link>
        <Link to="/admin/pesan" className="adm-stat"><span>Pendaftar notifikasi</span><b>{s.byKind.notify?.total ?? 0}</b><em>email opt-in EDU</em></Link>
      </div>

      <div className="adm-grid2">
        <Card title="Kiriman terbaru" actions={<Link to="/admin/pesan" className="adm-btn adm-btn--ghost adm-btn--sm">Semua</Link>}>
          {s.subs.length === 0 ? <Empty title="Belum ada kiriman">Form di ketiga situs akan muncul di sini.</Empty> : (
            <ul className="adm-feed">
              {s.subs.map((m) => (
                <li key={m.id}>
                  <Link to={m.kind === 'collab' ? `/admin/kolaborator?id=${m.id}` : `/admin/pesan?id=${m.id}`}>
                    <span className={`adm-dot adm-dot--${m.status}`} aria-hidden="true" />
                    <span className="adm-feed__main"><b>{m.name || m.email || m.ref}</b><span className="adm-muted adm-small">{KIND_LABEL[m.kind]} · {STATUS_LABEL[m.status]}</span></span>
                    <span className="adm-muted adm-small">{ago(m.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Status katalog" desc="Program yang tayang di situs, per status." actions={<Link to="/admin/program" className="adm-btn adm-btn--ghost adm-btn--sm">Kelola</Link>}>
          {pub.length === 0 ? <Empty title="Belum ada program tayang" /> : (
            <ul className="adm-bars">
              {(Object.keys(STATUS) as StatusCode[]).filter((k) => statusCount[k]).map((k) => (
                <li key={k}><span>{STATUS[k].label}</span><span className="adm-bars__bar"><i style={{ width: `${(statusCount[k] / pub.length) * 100}%` }} /></span><b>{statusCount[k]}</b></li>
              ))}
            </ul>
          )}
          <div className="adm-quick">
            <Link to="/admin/beranda" className="adm-btn adm-btn--ghost adm-btn--sm"><I.home size={15} />Edit halaman utama</Link>
            <Link to="/admin/program?baru=1" className="adm-btn adm-btn--primary adm-btn--sm"><I.plus size={15} />Program baru</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
