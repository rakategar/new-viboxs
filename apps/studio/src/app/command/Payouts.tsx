import { useMemo, useState } from 'react';
import { useAction, useLoad } from '../../lib/hooks';
import { PAY_STATUS, SCHEDULE, ago, fmtDate, rupiah } from '../../lib/labels';
import { sb, must, rpc, sendOutbox, type Payable, type Payment } from '../../lib/sb';
import { Area, Btn, Dialog, Empty, I, KV, Loaded, PageHead, Select, StatusBadge, Stat, Tabs, Text, useToast } from '../../ui/kit';

/** CMD-07: liabilities → approve → catat transfer manual + bukti. Klik tombol ≠ uang terkirim. */
export default function Payouts() {
  const toast = useToast();
  const [tab, setTab] = useState<'pending' | 'approved' | 'done'>('pending');
  const [sel, setSel] = useState<(Payable & { name: string; paid: number; payments: Payment[] }) | null>(null);
  const s = useLoad(async () => {
    const [p, pm, pr] = await Promise.all([
      must(sb.from('st_payables').select('*').order('created_at', { ascending: false })) as Promise<Payable[]>,
      must(sb.from('st_payments').select('*').order('paid_at', { ascending: false })) as Promise<Payment[]>,
      must(sb.from('st_profiles').select('id, display_name, email')) as Promise<{ id: string; display_name: string; email: string }[]>,
    ]);
    return p.map((x) => {
      const payments = pm.filter((y) => y.payable_id === x.id);
      const who = pr.find((y) => y.id === x.beneficiary_id);
      return { ...x, name: who?.display_name || who?.email || '—', paid: payments.reduce((a, y) => a + Number(y.amount), 0), payments };
    });
  });
  const G = { pending: ['pending_approval'], approved: ['approved', 'partially_paid'], done: ['paid', 'rejected'] };
  const list = useMemo(() => (s.data ?? []).filter((x) => G[tab].includes(x.status)), [s.data, tab]); // eslint-disable-line react-hooks/exhaustive-deps
  const sum = (st: string[]) => (s.data ?? []).filter((x) => st.includes(x.status)).reduce((a, x) => a + Number(x.amount) - x.paid, 0);
  return (
    <div className="st-page-in">
      <PageHead eyebrow="CMD-07 · Earnings & Payout Review" title="Payable & payout" desc="Disetujui ≠ dibayar. Status lunas hanya setelah transfer dicatat dengan referensi bukti. Payout otomatis belum aktif." />
      <section className="st-stats st-stats--3">
        <Stat label="Menunggu approval" value={s.data ? Math.round(sum(['pending_approval'])) : null} hint="Belum disetujui" tone="warn" fmt={rupiah} />
        <Stat label="Disetujui, belum ditransfer" value={s.data ? Math.round(sum(['approved', 'partially_paid'])) : null} hint="Sisa kewajiban" tone="gold" fmt={rupiah} />
        <Stat label="Payable lunas" value={s.data ? s.data.filter((x) => x.status === 'paid').length : null} hint="item" tone="ok" />
      </section>
      <Tabs label="Status" value={tab} onChange={setTab} tabs={[['pending', 'Perlu approval', s.data?.filter((x) => x.status === 'pending_approval').length], ['approved', 'Perlu transfer'], ['done', 'Selesai']]} />
      <Loaded state={s} empty={() => (list.length ? null : <Empty title="Tidak ada payable di sini" icon={I.wallet}>Payable dibuat saat deliverable mission diterima, atau saat bagi hasil program EDU dirilis dari Order EDU.</Empty>)}>
        {() => (
          <div className="st-table">
            <div className="st-tr st-tr--h"><span>Penerima · sumber</span><span>Nominal</span><span>Terbayar</span><span>Status</span><span /></div>
            {list.map((x, i) => (
              <div key={x.id} className="st-tr" style={{ ['--i' as string]: i }}>
                <span><b>{x.name}</b><small>{x.label} · {ago(x.created_at)}</small></span>
                <span className="st-mono">{rupiah(x.amount)}</span>
                <span className="st-mono">{rupiah(x.paid)}</span>
                <span><StatusBadge map={PAY_STATUS} value={x.status} /></span>
                <span><Btn size="sm" kind={x.status === 'paid' || x.status === 'rejected' ? 'quiet' : 'primary'} onClick={() => setSel(x)}>{x.status === 'pending_approval' ? 'Putuskan' : x.status === 'paid' || x.status === 'rejected' ? 'Detail' : 'Catat transfer'}</Btn></span>
              </div>
            ))}
          </div>
        )}
      </Loaded>
      {sel && <PayDialog p={sel} onClose={() => setSel(null)} onDone={(m) => { toast(m); setSel(null); s.reload(); }} />}
    </div>
  );
}

function PayDialog({ p, onClose, onDone }: { p: Payable & { name: string; paid: number; payments: Payment[] }; onClose: () => void; onDone: (m: string) => void }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState(String(Number(p.amount) - p.paid));
  const [ref, setRef] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState('bank_transfer');
  const [file, setFile] = useState<File | null>(null);
  const { busy, run } = useAction();
  const decide = (ok: boolean) => run(ok ? 'a' : 'r', () => rpc('st_payable_decide', { p_id: p.id, p_approve: ok, p_note: note || null }), () => onDone(ok ? 'Payable disetujui — status belum dibayar sampai transfer dicatat.' : 'Payable ditolak dengan alasan.'), (e) => toast(e, 'err'));
  // Bukti transfer (v4 WP03): bucket privat st-proofs/payments/<payable>/…, hanya Commander/Finance; file tidak bisa ditimpa;
  // hash SHA-256 + versi dicatat (V4-BP-005). Penerima hanya melihat status, nominal, tanggal & referensi tersamar.
  const record = () => run('pay', async () => {
    const rest = Number(p.amount) - p.paid;
    if (!(Number(amount) > 0) || Number(amount) > rest) throw new Error(`Nominal harus 1–${rest}.`);
    if (ref.trim().length < 4) throw new Error('Isi referensi/bukti transfer.');
    const up = file ? await uploadProof(p.id, file) : null;
    const st = await rpc<string>('st_record_payment', { p_payable: p.id, p_amount: Number(amount), p_reference: ref, p_paid_at: date, p_method: method, p_proof_path: up?.path ?? null, p_proof_sha256: up?.hash ?? null });
    void sendOutbox();
    return st;
  }, (st) => onDone(st === 'paid' ? 'Transfer tercatat — payable lunas. Penerima diberi tahu tanpa lampiran bukti.' : 'Pembayaran sebagian tercatat.'), (e) => toast(e, 'err'));
  return (
    <Dialog open onClose={onClose} title={`Payable · ${p.name}`}>
      <div className="st-stack">
        <KV rows={[['Sumber', p.label], ['Nominal', rupiah(p.amount)], ['Jadwal', p.schedule ? SCHEDULE[p.schedule] ?? p.schedule : '—'], ['Sudah dibayar', rupiah(p.paid)], ['Sisa', rupiah(Number(p.amount) - p.paid)], ['Status', <StatusBadge key="s" map={PAY_STATUS} value={p.status} />]]} />
        {p.payments.length > 0 && <ul className="st-list">{p.payments.map((x) => <ProofRow key={x.id} x={x} payable={p.id} onDone={onDone} />)}</ul>}
        {p.status === 'pending_approval' && (
          <>
            <Area label="Catatan (wajib bila menolak)" value={note} onChange={setNote} rows={2} />
            <div className="st-dlg__foot"><Btn kind="danger" onClick={() => decide(false)} busy={busy === 'r'}>Tolak</Btn><Btn kind="primary" onClick={() => decide(true)} busy={busy === 'a'}><I.check size={16} />Setujui payable</Btn></div>
          </>
        )}
        {(p.status === 'approved' || p.status === 'partially_paid') && (
          <div className="st-form">
            <Text label="Nominal ditransfer (IDR)" type="number" min={1} value={amount} onChange={setAmount} />
            <Text label="Tanggal transfer" type="date" value={date} onChange={setDate} />
            <Text label="Referensi / bukti transfer" value={ref} onChange={setRef} wide placeholder="mis. nomor referensi bank" hint="Jangan tempel nomor rekening lengkap. Pembayaran sebagian didukung." />
            <Select label="Metode" value={method} onChange={setMethod} options={[['bank_transfer', 'Transfer bank'], ['ewallet', 'E-wallet'], ['other', 'Lainnya']]} />
            <div className="st-field"><label htmlFor="pf">Bukti transfer (gambar/PDF, ≤5 MB)</label><input id="pf" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /><small className="st-muted">Bukti hanya untuk Commander/Finance; penerima tidak dapat melihat atau mengunduh. File tidak bisa ditimpa — koreksi disimpan sebagai versi baru.</small></div>
            <div className="st-form__act"><Btn kind="primary" onClick={record} busy={busy === 'pay'}>Catat transfer</Btn></div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

const sha256 = async (f: File) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await f.arrayBuffer())), (b) => b.toString(16).padStart(2, '0')).join('');

async function uploadProof(payable: string, file: File) {
  if (file.size > 5 * 1024 * 1024) throw new Error('Bukti maksimal 5 MB.');
  if (!['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(file.type)) throw new Error('Bukti harus PNG, JPG, WebP, atau PDF.');
  const hash = await sha256(file);
  const path = `payments/${payable}/${Date.now()}-${hash.slice(0, 12)}-${file.name.replace(/[^\w.-]+/g, '_').slice(-60)}`;
  const { error } = await sb.storage.from('st-proofs').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return { path, hash };
}

/** Satu transfer: lihat bukti (tautan 60 detik, hanya Commander/Finance) atau simpan versi bukti baru dengan alasan. */
function ProofRow({ x, payable, onDone }: { x: Payment; payable: string; onDone: (m: string) => void }) {
  const toast = useToast();
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState<File | null>(null);
  const [why, setWhy] = useState('');
  const { busy, run } = useAction();
  const view = () => run('v', async () => {
    const { data, error } = await sb.storage.from('st-proofs').createSignedUrl(x.proof_path!, 60);
    if (error || !data) throw new Error('Bukti belum bisa dibuka.');
    window.open(data.signedUrl, '_blank', 'noopener');
  }, () => undefined, (e) => toast(e, 'err'));
  const replace = () => run('r', async () => {
    if (!f) throw new Error('Pilih file bukti baru.');
    if (why.trim().length < 5) throw new Error('Tulis alasan mengganti bukti.');
    const up = await uploadProof(payable, f);
    return rpc<number>('st_payment_add_proof', { p_payment: x.id, p_path: up.path, p_sha256: up.hash, p_note: why });
  }, (v) => onDone(`Bukti versi ${v} disimpan. Versi lama tetap tersimpan.`), (e) => toast(e, 'err'));
  return (
    <li style={{ flexWrap: 'wrap' }}>
      <span><b>{rupiah(x.amount)}</b><small>Ref {x.reference}{x.method ? ` · ${x.method}` : ''}{x.proof_path ? ` · bukti v${x.proof_version ?? 1}` : ' · tanpa bukti'}</small></span>
      <span className="st-muted st-small">{fmtDate(x.paid_at, false)}</span>
      {x.proof_path && <Btn size="sm" kind="quiet" onClick={view} busy={busy === 'v'}>Lihat bukti</Btn>}
      <Btn size="sm" kind="quiet" onClick={() => setEdit((v) => !v)}>{x.proof_path ? 'Ganti bukti' : 'Lampirkan bukti'}</Btn>
      {edit && (
        <div className="st-form" style={{ width: '100%' }}>
          <div className="st-field"><label htmlFor={`pv-${x.id}`}>File bukti baru (gambar/PDF, ≤5 MB)</label><input id={`pv-${x.id}`} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => setF(e.target.files?.[0] ?? null)} /></div>
          <Text label="Alasan" value={why} onChange={setWhy} wide placeholder="mis. bukti pertama terpotong" />
          <div className="st-form__act"><Btn size="sm" kind="primary" onClick={replace} busy={busy === 'r'}>Simpan versi baru</Btn></div>
        </div>
      )}
    </li>
  );
}
