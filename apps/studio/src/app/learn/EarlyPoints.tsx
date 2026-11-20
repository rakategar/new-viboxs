import { useLoad } from '../../lib/hooks';
import { fmtDate } from '../../lib/labels';
import { sb, must, type Points } from '../../lib/sb';
import { Card, ComingSoon, Empty, I, Loaded, PageHead } from '../../ui/kit';
import { useCountUp } from '../../lib/hooks';

/** LRN-06: ledger poin milik sendiri. Tidak ada nilai rupiah, tidak bisa ditukar. */
export default function EarlyPoints() {
  const s = useLoad(() => must(sb.from('st_points').select('*').order('created_at', { ascending: false })) as Promise<Points[]>);
  const total = (s.data ?? []).reduce((a, p) => a + p.points, 0);
  const n = useCountUp(total, 1200);
  return (
    <div className="st-page-in">
      <PageHead eyebrow="Rewards v0" title="Early Points" />
      <div className="st-points">
        <div className="st-points__orb" aria-hidden="true"><span /><span /><span /></div>
        <div>
          <span className="st-eyebrow">Saldo tercatat</span>
          <p className="st-points__n">{n}<small> poin</small></p>
          <p className="st-muted">Early Points telah dicatat, belum dapat digunakan. Aturan penukaran dan benefit akan diumumkan setelah disahkan.</p>
        </div>
      </div>
      <Card title="Riwayat poin" desc="Ledger immutable — satu kali per identitas per kampanye.">
        <Loaded state={s} empty={(d) => (d.length ? null : <Empty title="Belum ada poin" icon={I.spark}>Kampanye Early Points belum aktif atau kuota sudah terpenuhi saat Anda mendaftar.</Empty>)}>
          {(d) => <ul className="st-list">{d.map((p) => <li key={p.id}><span><b>{p.reason === 'EARLY_SIGNUP' ? 'Bonus pendaftaran awal' : p.reason}</b><small>{p.note} · {fmtDate(p.created_at, false)}</small></span><span className="st-mono st-pos">+{p.points}</span></li>)}</ul>}
        </Loaded>
      </Card>
      <ComingSoon title="Penukaran poin" icon={I.star}>Rencana: potongan Services atau e-book terpilih. Belum aktif — menunggu budget, ketentuan, dan persetujuan finance. Poin tidak setara rupiah.</ComingSoon>
    </div>
  );
}
