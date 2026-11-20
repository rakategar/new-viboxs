import { useAuth } from '../../lib/auth';
import { useLoad } from '../../lib/hooks';
import { PAY_STATUS, SCHEDULE, fmtDate, rupiah } from '../../lib/labels';
import { sb, must, type Payable, type Payment } from '../../lib/sb';
import { Card, Empty, I, Loaded, PageHead, Stat, StatusBadge } from '../../ui/kit';

/** Honor milik sendiri saja (MIS-18) — tidak ada pendapatan perusahaan, margin, atau honor orang lain. */
export default function Earnings({ creator }: { creator?: boolean }) {
  const { me } = useAuth();
  const s = useLoad(async () => {
    const p = await must(sb.from('st_payables').select('*').eq('beneficiary_id', me!.profile.id).eq('source_type', creator ? 'program' : 'mission').order('created_at', { ascending: false })) as Payable[];
    const pm = p.length ? await must(sb.from('st_payments').select('*').in('payable_id', p.map((x) => x.id))) as Payment[] : [];
    return p.map((x) => { const pays = pm.filter((y) => y.payable_id === x.id); return { ...x, pays, paid: pays.reduce((a, y) => a + Number(y.amount), 0) }; });
  }, [creator]);
  const sum = (st: string[], paid = false) => (s.data ?? []).filter((x) => st.includes(x.status)).reduce((a, x) => a + (paid ? x.paid : Number(x.amount) - x.paid), 0);
  return (
    <div className="st-page-in">
      <PageHead eyebrow={creator ? 'EDU Creator' : 'VIBOXS Missions'} title={creator ? 'Laporan & payout' : 'Pendapatan'}
        desc={creator ? 'Penjualan terverifikasi berasal dari EDU. Perhitungan bagi hasil mengikuti perjanjian per program.' : 'Hanya honor milik Anda. Status bergerak: disepakati → disetujui → ditransfer.'} />
      {creator && <div className="st-alert st-alert--info">Integrasi order EDU belum aktif. Tidak ada penjualan terverifikasi, sehingga belum ada payable program. Angka tidak akan ditampilkan sebelum sumbernya tersedia.</div>}
      <section className="st-stats st-stats--3">
        <Stat label="Menunggu approval" value={s.data ? sum(['pending_approval']) : null} hint="Belum disetujui" tone="warn" fmt={rupiah} />
        <Stat label="Disetujui, menunggu transfer" value={s.data ? sum(['approved', 'partially_paid']) : null} hint="Bukan dana terkirim" tone="gold" fmt={rupiah} />
        <Stat label="Sudah ditransfer" value={s.data ? (s.data).reduce((a, x) => a + x.paid, 0) : null} hint="Tercatat dengan bukti" tone="ok" fmt={rupiah} />
      </section>
      <Card title="Riwayat">
        <Loaded state={s} empty={(d) => (d.length ? null : <Empty title="Belum ada honor tercatat" icon={I.wallet}>{creator ? 'Payable program muncul setelah penjualan terverifikasi & periode refund terpenuhi.' : 'Honor masuk setelah deliverable diterima Commander.'}</Empty>)}>
          {(d) => (
            <ul className="st-list">{d.map((x) => (
              <li key={x.id}>
                <span><b>{x.label}</b><small>{x.schedule ? SCHEDULE[x.schedule] ?? x.schedule : '—'} · dibuat {fmtDate(x.created_at, false)}{x.pays.length ? ` · ${x.pays.length} transfer` : ''}{x.note && x.status === 'rejected' ? ` · Alasan: ${x.note}` : ''}</small></span>
                <span className="st-mono">{rupiah(x.amount)}</span>
                <StatusBadge map={PAY_STATUS} value={x.status} />
              </li>
            ))}</ul>
          )}
        </Loaded>
      </Card>
    </div>
  );
}
