import { useEffect, useState, type FormEvent } from 'react';
import { CONTACT } from '@viboxs/shared/ecosystem';
import { DEFAULT_SETTINGS, type Settings as S } from '../lib/data';
import { getContent, sb, setContent } from './sb';
import { Area, Card, PageHead, Text, Toggle, useToast } from './ui';

export default function Settings() {
  const toast = useToast();
  const [s, setS] = useState<S | null>(null);
  const [saved, setSaved] = useState('');
  const [pw, setPw] = useState({ a: '', b: '' });
  const [mail, setMail] = useState<Record<string, number>>({});

  useEffect(() => {
    getContent<Partial<S>>('settings').then((v) => { const x = { ...DEFAULT_SETTINGS, ...v }; setS(x); setSaved(JSON.stringify(x)); }).catch((e) => toast(e.message, 'err'));
    sb.from('submissions').select('email_status').limit(5000).then(({ data }) => {
      const m: Record<string, number> = {};
      for (const r of (data ?? []) as { email_status: string }[]) m[r.email_status] = (m[r.email_status] ?? 0) + 1;
      setMail(m);
    });
  }, [toast]);

  if (!s) return <div className="adm-page"><div className="adm-skel" /></div>;
  const dirty = JSON.stringify(s) !== saved;

  async function save() {
    try { await setContent('settings', s); setSaved(JSON.stringify(s)); toast('Pengaturan tersimpan.'); }
    catch (e) { toast((e as Error).message, 'err'); }
  }
  async function changePw(e: FormEvent) {
    e.preventDefault();
    if (pw.a.length < 8) { toast('Password minimal 8 karakter.', 'err'); return; }
    if (pw.a !== pw.b) { toast('Konfirmasi password tidak sama.', 'err'); return; }
    const { error } = await sb.auth.updateUser({ password: pw.a });
    if (error) toast(error.message, 'err'); else { setPw({ a: '', b: '' }); toast('Password diganti. Pakai password baru saat login berikutnya.'); }
  }

  const sent = (mail.sent_formsubmit ?? 0) + (mail.sent_smtp ?? 0);
  const waiting = mail.needs_activation ?? 0;
  const failed = Object.entries(mail).filter(([k]) => k.startsWith('failed')).reduce((a, [, v]) => a + v, 0);

  return (
    <div className="adm-page">
      <PageHead title="Pengaturan">
        <button type="button" className="adm-btn adm-btn--primary" disabled={!dirty} onClick={save}>{dirty ? 'Simpan perubahan' : 'Tersimpan'}</button>
      </PageHead>
      <div className="adm-stack">
        <Card title="Katalog" desc="Saat katalog dinonaktifkan, beranda menampilkan state “Program sedang disiapkan” + form pemberitahuan.">
          <Toggle label="Tampilkan katalog program" checked={s.catalogFilled} onChange={(v) => setS({ ...s, catalogFilled: v })} hint="Matikan bila program masih berupa contoh dan belum siap dipublikasikan." />
        </Card>
        <Card title="SEO beranda" desc="Judul & deskripsi yang muncul di Google dan saat link dibagikan.">
          <div className="adm-form">
            <Text wide label={`Judul halaman (${s.seoTitle.length}/60)`} value={s.seoTitle} onChange={(v) => setS({ ...s, seoTitle: v })} />
            <Area label={`Deskripsi (${s.seoDesc.length}/160)`} rows={3} value={s.seoDesc} onChange={(v) => setS({ ...s, seoDesc: v })} />
          </div>
          <div className="adm-serp" aria-label="Pratinjau hasil Google">
            <span className="adm-serp__url">edu.viboxs.com</span>
            <span className="adm-serp__t">{s.seoTitle.slice(0, 64)}{s.seoTitle.length > 64 ? '…' : ''}</span>
            <span className="adm-serp__d">{s.seoDesc.slice(0, 160)}{s.seoDesc.length > 160 ? '…' : ''}</span>
          </div>
        </Card>
        <Card title="Pengiriman email form" desc={`Semua form di 3 situs disimpan di database lalu diteruskan otomatis ke ${CONTACT.email}.`}>
          <dl className="adm-kv">
            <div><dt>Terkirim</dt><dd>{sent}</dd></div>
            <div><dt>Menunggu aktivasi</dt><dd className={waiting ? 'adm-warn' : ''}>{waiting}</dd></div>
            <div><dt>Gagal</dt><dd className={failed ? 'adm-warn' : ''}>{failed}</dd></div>
          </dl>
          {waiting > 0 && <div className="adm-alert adm-alert--warn">Buka inbox <b>{CONTACT.email}</b>, cari email dari FormSubmit berjudul “Action Required: Activate FormSubmit”, lalu klik <b>Activate Form</b>. Setelah itu semua kiriman baru langsung masuk ke email.</div>}
        </Card>
        <Card title="Ganti password admin">
          <form className="adm-form" onSubmit={changePw}>
            <Text label="Password baru" type="password" value={pw.a} onChange={(v) => setPw({ ...pw, a: v })} />
            <Text label="Ulangi password baru" type="password" value={pw.b} onChange={(v) => setPw({ ...pw, b: v })} />
            <div><button type="submit" className="adm-btn adm-btn--ghost">Ganti password</button></div>
          </form>
        </Card>
      </div>
    </div>
  );
}
