import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useAction, useLoad } from '../../lib/hooks';
import { RANGER_STATUS, SHOWCASE_STATUS, fmtDate } from '../../lib/labels';
import { sb, must, rpc, type RangerStatus, type Showcase } from '../../lib/sb';
import { Area, Btn, Card, Check, Loaded, PageHead, Select, StatusBadge, Text, useToast } from '../../ui/kit';

const CONSENT = 'showcase-consent-draft-2026-11';

/**
 * Profil publik (showcase) milik sendiri + status Ranger. Profil tayang di EDU hanya setelah Commander memverifikasi
 * identitas & bukti (PUBLIC_APPROVED). Tidak ada label "EDU Graduate" manual; nominal tidak bisa diketik (dihitung server).
 */
export default function Profile() {
  const { me } = useAuth();
  const toast = useToast();
  const kind: 'ranger' | 'opc' = me!.active_role === 'ranger' ? 'ranger' : 'opc';
  const s = useLoad(async () => {
    const [sc, st] = await Promise.all([
      must(sb.from('st_showcase').select('*').eq('owner_id', me!.profile.id).eq('kind', kind).maybeSingle()) as Promise<Showcase | null>,
      kind === 'ranger' ? must(sb.from('st_ranger_status').select('*').eq('person_id', me!.profile.id).maybeSingle()) as Promise<RangerStatus | null> : Promise.resolve(null),
    ]);
    return { sc, st };
  }, [kind]);
  const [f, setF] = useState<Partial<Showcase> | null>(null);
  const [consent, setConsent] = useState(false);
  const [ev, setEv] = useState('');
  const [why, setWhy] = useState('');
  const { busy, run } = useAction();
  const cur = s.data?.sc;
  const form = f ?? cur ?? { display_name: me!.profile.display_name, specialization: '', summary: '', evidence: [], image_url: '', link: '', product_status: kind === 'opc' ? 'In Development' : null, income_consent: false };
  const set = (k: keyof Showcase, v: unknown) => setF({ ...form, [k]: v });
  const locked = cur?.status === 'PUBLIC_APPROVED' || cur?.status === 'SUBMITTED';

  const save = (submit: boolean) => run(submit ? 'sub' : 'save', async () => {
    const evidence = (form.evidence ?? []).filter((e) => /^https:\/\//.test(e.url));
    const row = { display_name: form.display_name, specialization: form.specialization, summary: form.summary ?? '', evidence, image_url: form.image_url || null, link: form.link || null,
      product_status: kind === 'opc' ? form.product_status : null, income_consent: kind === 'ranger' && !!form.income_consent,
      ...(consent ? { consent_at: new Date().toISOString(), consent_version: CONSENT } : {}) };
    const id = cur ? cur.id : (await must(sb.from('st_showcase').insert({ ...row, kind, owner_id: me!.profile.id }).select('id').single()) as { id: string }).id;
    if (cur) await must(sb.from('st_showcase').update({ ...row, status: cur.status === 'REJECTED' ? 'DRAFT' : cur.status }).eq('id', id));
    if (submit) await must(sb.from('st_showcase').update({ status: 'SUBMITTED' }).eq('id', id));
  }, () => { toast(submit ? 'Diajukan ke Commander untuk verifikasi.' : 'Draft disimpan — belum tampil publik.'); setF(null); s.reload(); }, (e) => toast(e, 'err'));
  const withdraw = () => run('wd', () => must(sb.from('st_showcase').update({ status: 'WITHDRAWN' }).eq('id', cur!.id)), () => { toast('Profil ditarik dari EDU.'); s.reload(); }, (e) => toast(e, 'err'));
  const deact = () => run('de', () => rpc('st_ranger_request_deactivation', { p_reason: why }), () => { toast('Permintaan dikirim. Commander memeriksa misi, pembayaran, aset & NDA.'); s.reload(); }, (e) => toast(e, 'err'));

  return (
    <div className="st-page-in">
      <PageHead eyebrow={kind === 'ranger' ? 'Ranger' : 'OPC Founder'} title="Showcase & status" desc="Opsional. Hanya yang Anda setujui dan sudah diverifikasi yang tampil di EDU — tanpa kontak, fee, atau data klien." />
      <Loaded state={s}>
        {(d) => (
          <>
            <Card title={<span className="st-row">Profil showcase {cur && <StatusBadge map={SHOWCASE_STATUS} value={cur.status} />}</span>} desc={cur?.review_note ? `Catatan Commander: ${cur.review_note}` : undefined}>
              <fieldset className="st-form" disabled={locked}>
                <Text label="Nama tampilan" value={form.display_name} onChange={(v) => set('display_name', v)} />
                <Text label={kind === 'ranger' ? 'Spesialisasi' : 'Produk / bidang'} value={form.specialization} onChange={(v) => set('specialization', v)} />
                <Area label="Ringkasan" value={form.summary} onChange={(v) => set('summary', v)} rows={3} hint="Maks. 400 karakter. Tanpa klaim yang tidak bisa dibuktikan." />
                {kind === 'opc' && <Select label="Status produk (berdasarkan bukti)" value={form.product_status ?? 'In Development'} onChange={(v) => set('product_status', v)} options={[['In Development', 'In Development'], ['Beta', 'Beta'], ['Available', 'Available']]} />}
                <Text label="Gambar (https, berhak pakai)" value={form.image_url} onChange={(v) => set('image_url', v)} />
                <Text label="Tautan (https)" value={form.link} onChange={(v) => set('link', v)} />
                <div className="st-field st-field--wide">
                  <span className="st-eyebrow">Bukti karya</span>
                  <ul className="st-list">{(form.evidence ?? []).map((e, i) => <li key={i}><span><b>{e.label}</b><small>{e.url}</small></span>{!locked && <Btn size="sm" kind="quiet" onClick={() => set('evidence', form.evidence!.filter((_, j) => j !== i))}>Hapus</Btn>}</li>)}</ul>
                  {!locked && <div className="st-toolbar"><Text label="Tautan bukti (https)" value={ev} onChange={setEv} /><Btn size="sm" onClick={() => { if (!/^https:\/\//.test(ev)) { toast('Tautan harus https://', 'err'); return; } set('evidence', [...(form.evidence ?? []), { label: new URL(ev).hostname, url: ev }]); setEv(''); }}>Tambah</Btn></div>}
                </div>
                {kind === 'ranger' && <div className="st-field st-field--wide"><Check label="Izinkan menampilkan total honor terverifikasi (dihitung dari pembayaran tercatat, periode dipilih Commander)." checked={!!form.income_consent} onChange={(v) => set('income_consent', v)} /></div>}
                {!locked && <div className="st-field st-field--wide"><Check label="Saya menyetujui profil ini ditampilkan publik di edu.viboxs.com dan dapat menariknya kapan saja." checked={consent || !!cur?.consent_at} onChange={setConsent} /></div>}
                {!locked && <div className="st-form__act"><Btn onClick={() => save(false)} busy={busy === 'save'}>Simpan draft</Btn><Btn kind="primary" onClick={() => save(true)} busy={busy === 'sub'}>Ajukan verifikasi</Btn></div>}
              </fieldset>
              {cur?.status === 'PUBLIC_APPROVED' && <div className="st-row"><span className="st-small st-muted">Tayang sejak {fmtDate(cur.approved_at, false)} · review ulang {fmtDate(cur.review_due, false)}</span><Btn size="sm" kind="danger" busy={busy === 'wd'} onClick={withdraw}>Tarik dari EDU</Btn></div>}
            </Card>
            {kind === 'ranger' && (
              <Card title={<span className="st-row">Status Ranger {d.st && <StatusBadge map={RANGER_STATUS} value={d.st.status} />}</span>}
                desc="Selama aktif, Anda tidak tampil di talent search perusahaan dan tidak berinteraksi langsung dengan klien. Untuk melamar kerja, ajukan nonaktif — Commander memeriksa serah-terima misi, pembayaran, aset, dan NDA.">
                {d.st?.status === 'ACTIVE' ? (
                  <div className="st-form">
                    <Area label="Alasan nonaktif" value={why} onChange={setWhy} rows={2} />
                    <div className="st-form__act"><Btn busy={busy === 'de'} onClick={deact}>Ajukan nonaktif</Btn></div>
                  </div>
                ) : d.st?.status === 'DEACTIVATION_REQUESTED' ? <p className="st-small">Menunggu clearance Commander. Diajukan {fmtDate(d.st.requested_at)}.</p> : null}
              </Card>
            )}
          </>
        )}
      </Loaded>
    </div>
  );
}
