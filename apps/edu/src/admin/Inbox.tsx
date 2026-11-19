import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { KIND_LABEL, STATUS_LABEL, sb, type SubKind, type SubStatus, type Submission } from './sb';
import { Empty, I, PageHead, ago, fmtDate, useToast } from './ui';

const LABEL: Record<string, string> = {
  nama: 'Nama', email: 'Email', kontak: 'Kontak', via: 'Hubungi lewat', pesan: 'Pesan', intent: 'Maksud', kategori: 'Kategori', jenis: 'Jenis',
  org: 'Organisasi', orgName: 'Nama organisasi', hasil: 'Hasil yang diharapkan', status: 'Status saat ini', wa: 'WhatsApp', waCode: 'Kode negara',
  horizon: 'Horizon waktu', budget: 'Anggaran', marketing: 'Mau info pemasaran', from: 'Dipilih dari', source: 'Sumber', role: 'Peran',
  produk: 'Jenis produk', judul: 'Judul', deskripsi: 'Deskripsi', instansi: 'Instansi / perusahaan', kota: 'Kota', instagram: 'Instagram',
  linkedin: 'LinkedIn', website: 'Website / portofolio', sosmed_lain: 'Media sosial lain', pengalaman: 'Pengalaman', topik: 'Topik', order: 'Nomor order',
  program: 'Program', slug: 'Slug', jadwal: 'Jadwal', harga: 'Harga', jabatan: 'Jabatan', kategori_produk: 'Kategori produk', halaman: 'Halaman', consent: 'Persetujuan', terms: 'Setuju ketentuan', privacy: 'Setuju privasi',
};
const LONG = new Set(['pesan', 'hasil', 'deskripsi', 'pengalaman']);
const COLLAB_ORDER = ['role', 'produk', 'kategori_produk', 'judul', 'deskripsi', 'pengalaman', 'nama', 'email', 'wa', 'instansi', 'jabatan', 'kota', 'instagram', 'linkedin', 'website', 'sosmed_lain'];
const show = (v: unknown) => (typeof v === 'boolean' ? (v ? 'Ya' : 'Tidak') : Array.isArray(v) ? v.join(', ') : v == null ? '' : String(v));
const STATUSES = Object.keys(STATUS_LABEL) as SubStatus[];
const MAIL: Record<string, string> = { sent_smtp: 'Terkirim (SMTP)', sent_formsubmit: 'Terkirim', pending: 'Diproses', needs_activation: 'Menunggu aktivasi FormSubmit' };

const linkFor = (k: string, v: string) => {
  if (k === 'instagram') return `https://instagram.com/${v.replace(/^@|https?:\/\/(www\.)?instagram\.com\//g, '')}`;
  if (['website', 'linkedin', 'sosmed_lain'].includes(k)) return /^https?:\/\//.test(v) ? v : /\.\w{2,}/.test(v) ? `https://${v}` : null;
  return null;
};
const waLink = (phone: string) => { const d = phone.replace(/\D/g, '').replace(/^0/, '62'); return d.length >= 9 ? `https://wa.me/${d}` : null; };

export default function Inbox({ mode, onChange }: { mode: 'collab' | 'other'; onChange: () => void }) {
  const toast = useToast();
  const [sp, setSp] = useSearchParams();
  const [rows, setRows] = useState<Submission[] | null>(null);
  const [kind, setKind] = useState<'all' | SubKind>('all');
  const [status, setStatus] = useState<'open' | 'all' | SubStatus>('open');
  const [q, setQ] = useState('');
  const [note, setNote] = useState('');
  const sel = sp.get('id');

  const load = useCallback(async () => {
    let qry = sb.from('submissions').select('*').order('created_at', { ascending: false }).limit(500);
    qry = mode === 'collab' ? qry.eq('kind', 'collab') : qry.neq('kind', 'collab');
    const { data, error } = await qry;
    if (error) { toast(error.message, 'err'); return; }
    setRows(data as Submission[]);
  }, [mode, toast]);
  useEffect(() => { setRows(null); setKind('all'); load(); }, [load]);

  const list = useMemo(() => (rows ?? []).filter((r) =>
    (kind === 'all' || r.kind === kind) &&
    (status === 'all' || (status === 'open' ? !['done', 'rejected', 'spam'].includes(r.status) : r.status === status)) &&
    (!q || `${r.name} ${r.email} ${r.phone} ${r.ref} ${r.subject} ${JSON.stringify(r.payload)}`.toLowerCase().includes(q.toLowerCase())),
  ), [rows, kind, status, q]);
  const cur = rows?.find((r) => r.id === sel) ?? null;
  useEffect(() => setNote(cur?.admin_note ?? ''), [cur?.id, cur?.admin_note]);

  const open = (id: string | null) => setSp(id ? { id } : {}, { replace: true });

  async function patch(r: Submission, p: Partial<Submission>, msg: string) {
    const { error } = await sb.from('submissions').update(p).eq('id', r.id);
    if (error) { toast(error.message, 'err'); return; }
    setRows((rs) => rs?.map((x) => (x.id === r.id ? { ...x, ...p } : x)) ?? null);
    toast(msg); onChange();
  }
  async function remove(r: Submission) {
    if (!confirm(`Hapus kiriman ${r.ref} permanen? Data tidak bisa dikembalikan.`)) return;
    const { error } = await sb.from('submissions').delete().eq('id', r.id);
    if (error) { toast(error.message, 'err'); return; }
    setRows((rs) => rs?.filter((x) => x.id !== r.id) ?? null); open(null); toast('Kiriman dihapus.'); onChange();
  }
  // buka = tandai ditinjau otomatis
  useEffect(() => { if (cur && cur.status === 'new') patch(cur, { status: 'review' }, 'Ditandai sedang ditinjau.'); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [cur?.id]);

  function exportCsv() {
    const keys = Array.from(new Set(list.flatMap((r) => Object.keys(r.payload))));
    const head = ['ref', 'tanggal', 'jenis', 'status', 'nama', 'email', 'telepon', ...keys, 'catatan_admin'];
    const esc = (v: unknown) => `"${show(v).replace(/"/g, '""')}"`;
    const lines = list.map((r) => [r.ref, fmtDate(r.created_at), KIND_LABEL[r.kind], STATUS_LABEL[r.status], r.name, r.email, r.phone, ...keys.map((k) => r.payload[k]), r.admin_note].map(esc).join(','));
    const blob = new Blob(['﻿' + [head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `viboxs-${mode === 'collab' ? 'kolaborator' : 'pesan'}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(a.href);
  }

  const kinds = (Object.keys(KIND_LABEL) as SubKind[]).filter((k) => k !== 'collab');
  const entries = cur ? (mode === 'collab'
    ? [...COLLAB_ORDER.filter((k) => k in cur.payload), ...Object.keys(cur.payload).filter((k) => !COLLAB_ORDER.includes(k))]
    : Object.keys(cur.payload)).filter((k) => show(cur.payload[k]) && !['_hp', 'waCode'].includes(k)) : [];

  return (
    <div className="adm-page adm-page--wide">
      <PageHead title={mode === 'collab' ? 'Kolaborator' : 'Pesan masuk'}
        desc={mode === 'collab' ? 'Pengajuan trainer, educator, dan partnership dari edu.viboxs.com/kolaborator.' : 'Kiriman form dari www.viboxs.com, service.viboxs.com, dan edu.viboxs.com.'}>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={load}><I.refresh size={16} />Muat ulang</button>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={exportCsv} disabled={!list.length}>Ekspor CSV</button>
      </PageHead>

      <div className="adm-filters">
        <div className="adm-search"><I.search size={16} /><input placeholder="Cari nama, email, ref, isi…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari" /></div>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Filter status" className="adm-select">
          <option value="open">Belum selesai</option><option value="all">Semua status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        {mode === 'other' && (
          <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label="Filter jenis" className="adm-select">
            <option value="all">Semua jenis</option>{kinds.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
        )}
      </div>

      <div className={`adm-inbox ${cur ? 'has-sel' : ''}`}>
        <ul className="adm-inbox__list" aria-label="Daftar kiriman">
          {rows === null ? <li className="adm-skel" /> : list.length === 0 ? <li><Empty title="Kosong">Belum ada kiriman yang cocok dengan filter.</Empty></li> : list.map((r) => (
            <li key={r.id}>
              <button type="button" className={`adm-msg ${r.id === sel ? 'is-on' : ''} ${r.status === 'new' ? 'is-new' : ''}`} onClick={() => open(r.id)}>
                <span className="adm-msg__top"><b>{r.name || r.email || '—'}</b><span className="adm-muted adm-small">{ago(r.created_at)}</span></span>
                <span className="adm-msg__sub">{mode === 'collab' ? `${show(r.payload.role)} · ${show(r.payload.produk)} — ${show(r.payload.judul)}` : KIND_LABEL[r.kind]}</span>
                <span className="adm-msg__meta"><span className={`adm-pill adm-pill--s-${r.status}`}>{STATUS_LABEL[r.status]}</span><span className="adm-muted adm-small">{r.ref}</span></span>
              </button>
            </li>
          ))}
        </ul>

        <div className="adm-inbox__detail">
          {!cur ? <Empty title="Pilih kiriman">Detail lengkap, status, dan catatan tampil di sini.</Empty> : (
            <article className="adm-detail">
              <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm adm-detail__back" onClick={() => open(null)}>← Daftar</button>
              <header className="adm-detail__head">
                <div>
                  <span className="adm-muted adm-small">{KIND_LABEL[cur.kind]} · {cur.ref} · {fmtDate(cur.created_at)} WIB</span>
                  <h2>{mode === 'collab' ? show(cur.payload.judul) : cur.name || cur.email}</h2>
                  {mode === 'collab' && <span className="adm-muted">{show(cur.payload.role)} · {show(cur.payload.produk)} · oleh {cur.name}</span>}
                </div>
                <div className="adm-detail__contact">
                  {cur.email && <a className="adm-btn adm-btn--primary adm-btn--sm" href={`mailto:${cur.email}?subject=${encodeURIComponent(`Re: ${cur.subject ?? cur.ref}`)}`}><I.mail size={15} />Balas email</a>}
                  {cur.phone && waLink(cur.phone) && <a className="adm-btn adm-btn--ghost adm-btn--sm" href={waLink(cur.phone)!} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
                </div>
              </header>

              <div className="adm-status-row" role="group" aria-label="Status">
                {STATUSES.map((s) => (
                  <button key={s} type="button" className={`adm-chip ${cur.status === s ? 'is-on' : ''}`} aria-pressed={cur.status === s} onClick={() => cur.status !== s && patch(cur, { status: s }, `Status: ${STATUS_LABEL[s]}`)}>{STATUS_LABEL[s]}</button>
                ))}
              </div>

              <dl className="adm-kv">
                {entries.map((k) => {
                  const v = show(cur.payload[k]);
                  const href = linkFor(k, v);
                  return (
                    <div key={k} className={LONG.has(k) ? 'is-long' : ''}>
                      <dt>{LABEL[k] ?? k}</dt>
                      <dd>{href ? <a href={href} target="_blank" rel="noopener noreferrer nofollow">{v}</a> : v}</dd>
                    </div>
                  );
                })}
                <div><dt>Situs</dt><dd>{cur.site}</dd></div>
                <div><dt>Email ke admin</dt><dd className={cur.email_status.startsWith('sent') ? '' : 'adm-warn'}>{MAIL[cur.email_status] ?? cur.email_status}</dd></div>
              </dl>

              <div className="adm-field adm-field--wide">
                <label htmlFor="adm-note">Catatan internal</label>
                <textarea id="adm-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Hasil review, tindak lanjut, siapa yang menangani…" />
                <div className="adm-quick">
                  <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" disabled={note === (cur.admin_note ?? '')} onClick={() => patch(cur, { admin_note: note }, 'Catatan tersimpan.')}>Simpan catatan</button>
                  <button type="button" className="adm-btn adm-btn--danger adm-btn--sm" onClick={() => remove(cur)}><I.trash size={15} />Hapus</button>
                </div>
              </div>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
