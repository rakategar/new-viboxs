import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useAction, useLoad } from '../../lib/hooks';
import { BID_KIND, CATEGORY, DELIV_STATUS, FEE_TYPE, MISSION_STATUS, SCHEDULE, ago, fmtDate, rupiah } from '../../lib/labels';
import { sb, must, rpc, type Assignment, type Bid, type Deliverable, type Mission } from '../../lib/sb';
import { Area, Badge, Btn, Card, Check, Empty, ErrorBox, I, KV, Loaded, MissionRail, PageHead, StatusBadge, Text, useToast } from '../../ui/kit';
import Thread from '../Thread';

/** Detail misi versi Ranger: proyeksi tanpa harga klien, margin, atau data lead (dijaga RLS). */
export default function RangerMission() {
  const { id = '' } = useParams();
  const { me } = useAuth();
  const uid = me!.profile.id;
  const s = useLoad(async () => {
    const { data: m, error } = await sb.from('st_missions').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!m) return null;
    const [bids, asg, del] = await Promise.all([
      must(sb.from('st_bids').select('*').eq('mission_id', id).eq('ranger_id', uid).order('created_at')) as Promise<Bid[]>,
      must(sb.from('st_assignments').select('*').eq('mission_id', id).eq('ranger_id', uid).maybeSingle()) as Promise<Assignment | null>,
      must(sb.from('st_deliverables').select('*').eq('mission_id', id).eq('ranger_id', uid).order('version', { ascending: false })) as Promise<Deliverable[]>,
    ]);
    return { m: m as Mission, bids, asg, del };
  }, [id]);

  if (s.error) return <div className="st-page-in"><ErrorBox msg={s.error} onRetry={s.reload} /></div>;
  if (!s.loading && s.data === null) {
    return <div className="st-page-in"><Empty title="Misi tidak tersedia untuk Anda" icon={I.lock}>Misi hanya terlihat oleh Ranger yang ditargetkan atau ditugaskan. <Link to="/missions/offers">Kembali ke penawaran</Link></Empty></div>;
  }
  return (
    <div className="st-page-in">
      <Link to={s.data?.asg ? '/missions/my' : '/missions/offers'} className="st-back"><I.back size={16} />Kembali</Link>
      <Loaded state={s as never}>
        {() => {
          const d = s.data!;
          return (
            <>
              <PageHead eyebrow={`${d.m.ref} · ${CATEGORY[d.m.category]}`} title={d.m.title} desc={<StatusBadge map={MISSION_STATUS} value={d.m.status} />} />
              {d.asg && <MissionRail status={d.m.status} />}
              <div className="st-split">
                <div className="st-stack">
                  <Card title="Brief" desc="Versi tersanitasi. Kontak dan harga klien sengaja tidak ditampilkan.">
                    <div className="st-prose"><p>{d.m.brief || '—'}</p></div>
                    <KV rows={[['Deliverables', d.m.deliverables], ['Kriteria penerimaan', d.m.acceptance], ['Revisi termasuk', d.m.revisions_included ?? '—'], ['Tenggat', fmtDate(d.m.due_at)], ['Tipe fee', FEE_TYPE[d.m.fee_type]]]} />
                    {d.m.skill_tags.length > 0 && <div className="st-row">{d.m.skill_tags.map((t) => <span key={t} className="st-tag">{t}</span>)}</div>}
                  </Card>
                  {d.asg?.agreement_state === 'executed' && <Deliver m={d.m} del={d.del} onDone={s.reload} />}
                  {d.asg && <Card title="Thread dengan Commander" desc="Privat. Tidak ada kanal langsung ke klien/partner."><Thread type="mission" threadId={d.m.id} rangerId={uid} /></Card>}
                </div>
                <div className="st-stack">
                  {d.asg ? <Agreement a={d.asg} m={d.m} onDone={s.reload} /> : <BidBox m={d.m} bids={d.bids} onDone={s.reload} />}
                </div>
              </div>
            </>
          );
        }}
      </Loaded>
    </div>
  );
}

function BidBox({ m, bids, onDone }: { m: Mission; bids: Bid[]; onDone: () => void }) {
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('');
  const [note, setNote] = useState('');
  const { busy, run } = useAction();
  const open = ['offered', 'bidding', 'negotiation'].includes(m.status) && (!m.offer_close_at || new Date(m.offer_close_at) > new Date());
  const last = bids[bids.length - 1];
  const counter = last?.kind === 'counter' ? last : null;
  const done = last && (last.kind === 'withdraw' || last.kind === 'decline');
  const send = (kind: 'bid' | 'accept_counter' | 'withdraw') => run(kind, async () => {
    if (kind === 'bid' && !(Number(amount) > 0)) throw new Error('Isi fee yang Anda ajukan.');
    await must(sb.from('st_bids').insert({
      mission_id: m.id, ranger_id: (await sb.auth.getUser()).data.user!.id, kind,
      amount: kind === 'bid' ? Number(amount) : kind === 'accept_counter' ? counter?.amount : null,
      duration_days: kind === 'bid' && days ? Number(days) : null, note: note || null,
    }));
  }, () => { toast(kind === 'bid' ? 'Tawaran terkirim ke Commander.' : kind === 'accept_counter' ? 'Anda menerima counteroffer. Menunggu penunjukan.' : 'Tawaran ditarik.'); setAmount(''); setDays(''); setNote(''); onDone(); }, (e) => toast(e, 'err'));
  return (
    <Card title="Tawaran Anda" desc="Tawaran ≠ fee. Fee final hanya yang disepakati saat penunjukan.">
      {bids.length > 0 && (
        <ol className="st-timeline">{bids.map((b, i) => (
          <li key={b.id} className={`k-${b.kind}`} style={{ ['--i' as string]: i }}><span><b>{BID_KIND[b.kind]}</b>{b.amount != null && <> · {rupiah(b.amount)}</>}{b.duration_days && <> · {b.duration_days} hari</>}</span>{b.note && <p>{b.note}</p>}<time>{ago(b.created_at)}</time></li>
        ))}</ol>
      )}
      {!open ? <div className="st-alert st-alert--info">Penawaran untuk misi ini sudah ditutup.</div> : done ? <p className="st-muted st-small">Tawaran sudah tidak aktif.</p> : (
        <>
          {counter && (
            <div className="st-alert st-alert--warn st-alert--row"><span>Commander mengajukan <b>{rupiah(counter.amount)}</b>.</span><Btn kind="primary" size="sm" onClick={() => send('accept_counter')} busy={busy === 'accept_counter'}>Terima counter</Btn></div>
          )}
          <div className="st-form">
            <Text label={counter ? 'Atau ajukan fee baru (IDR)' : 'Fee yang diajukan (IDR)'} type="number" min={0} value={amount} onChange={setAmount} />
            <Text label="Estimasi durasi (hari)" type="number" min={1} value={days} onChange={setDays} />
            <Area label="Catatan negosiasi" value={note} onChange={setNote} rows={3} placeholder="Pendekatan, asumsi, pertanyaan lingkup…" />
            <div className="st-form__act">
              {bids.some((b) => b.kind === 'bid') && <Btn kind="quiet" onClick={() => send('withdraw')} busy={busy === 'withdraw'}>Tarik tawaran</Btn>}
              <Btn kind="primary" onClick={() => send('bid')} busy={busy === 'bid'} disabled={!m.negotiation_allowed && bids.some((b) => b.kind === 'bid')}>Kirim tawaran</Btn>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

function Agreement({ a, m, onDone }: { a: Assignment; m: Mission; onDone: () => void }) {
  const toast = useToast();
  const [ok, setOk] = useState(false);
  const { busy, run } = useAction();
  const accept = () => run('a', () => rpc('st_accept_agreement', { p_assignment: a.id }), () => { toast('Perjanjian diterima. Misi dimulai.'); onDone(); }, (e) => toast(e, 'err'));
  return (
    <Card title="Perjanjian misi" desc={`Versi ${a.agreement_version} · ${m.ref}`} className={a.agreement_state === 'pending' ? 'st-card--attn' : ''}>
      <KV rows={[['Fee Anda', <b key="f" className="st-big-inline">{rupiah(a.agreed_fee)}</b>], ['Jadwal pembayaran', SCHEDULE[a.payout_schedule]], ['Status', a.agreement_state === 'executed' ? <Badge key="s" tone="ok">Diterima {fmtDate(a.accepted_at)}</Badge> : <Badge key="s" tone="warn" dot>Menunggu persetujuan Anda</Badge>]]} />
      <pre className="st-terms">{a.agreement_terms}</pre>
      {a.agreement_state === 'pending' && (
        <>
          <Check label="Saya menerima ketentuan misi ini, termasuk kewajiban kerahasiaan." hint="Persetujuan tercatat dengan waktu & identitas akun. Bukan tanda tangan elektronik tersertifikasi." checked={ok} onChange={setOk} />
          <Btn kind="primary" onClick={accept} busy={busy === 'a'} disabled={!ok}>Terima perjanjian</Btn>
        </>
      )}
    </Card>
  );
}

function Deliver({ m, del, onDone }: { m: Mission; del: Deliverable[]; onDone: () => void }) {
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const { busy, run } = useAction();
  const can = ['in_progress', 'revision_requested'].includes(m.status);
  const send = () => run('s', async () => {
    if (!/^https:\/\/\S+\.\S+/.test(url.trim())) throw new Error('Masukkan tautan https yang valid (Drive, repo, preview, dsb.).');
    await must(sb.from('st_deliverables').insert({ mission_id: m.id, ranger_id: (await sb.auth.getUser()).data.user!.id, url: url.trim(), note: note || null }));
  }, () => { toast('Deliverable terkirim sebagai versi baru.'); setUrl(''); setNote(''); onDone(); }, (e) => toast(e, 'err'));
  const lastRev = del.find((d) => d.status === 'revision_requested');
  return (
    <Card title="Deliverable & revisi" desc="Setiap kiriman menjadi versi baru; versi lama tidak ditimpa.">
      {lastRev && m.status === 'revision_requested' && <div className="st-alert st-alert--warn"><b>Revisi diminta (v{lastRev.version}):</b> {lastRev.review_note}</div>}
      {can && (
        <div className="st-form">
          <Text label="Tautan hasil kerja" value={url} onChange={setUrl} wide placeholder="https://…" hint="Jangan sertakan token akses pribadi atau kata sandi di tautan." />
          <Area label="Catatan" value={note} onChange={setNote} rows={2} />
          <div className="st-form__act"><Btn kind="primary" onClick={send} busy={busy === 's'}>Kirim deliverable</Btn></div>
        </div>
      )}
      {del.length > 0 && (
        <ul className="st-deliv">{del.map((d) => (
          <li key={d.id}><div className="row-between"><b>v{d.version}</b><StatusBadge map={DELIV_STATUS} value={d.status} /></div>
            <a href={d.url} target="_blank" rel="noopener noreferrer nofollow" className="st-url"><I.ext size={14} />{d.url}</a>
            {d.review_note && <p className="st-small st-muted">Review: {d.review_note}</p>}<time className="st-small st-muted">{ago(d.created_at)}</time></li>
        ))}</ul>
      )}
    </Card>
  );
}
