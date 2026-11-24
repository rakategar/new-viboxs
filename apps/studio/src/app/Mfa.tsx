import { useState } from 'react';
import type { Factor } from '@supabase/supabase-js';
import { useAuth } from '../lib/auth';
import { useAction, useLoad } from '../lib/hooks';
import { fmtDate } from '../lib/labels';
import { sb } from '../lib/sb';
import { Badge, Btn, Card, I, Loaded, Text, useToast } from '../ui/kit';

const totpFactors = async () => {
  const { data, error } = await sb.auth.mfa.listFactors();
  if (error) throw new Error(error.message);
  return data.totp as Factor[];
};

/** Tantangan MFA setelah login (AUT-016): akun yang punya authenticator wajib memasukkan kode sebelum masuk workspace. */
export function MfaChallenge() {
  const { signOut, refreshAal } = useAuth();
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const { busy, run } = useAction();
  const verify = () => run('v', async () => {
    const f = (await totpFactors()).find((x) => x.status === 'verified');
    if (!f) throw new Error('Authenticator tidak ditemukan. Hubungi Commander lain.');
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: f.id, code: code.trim() });
    if (error) throw new Error('Kode salah atau kedaluwarsa. Coba kode terbaru.');
    await refreshAal();
  }, undefined, setErr);
  return (
    <div className="st-boot">
      <form className="st-mfa" onSubmit={(e) => { e.preventDefault(); verify(); }}>
        <span className="st-mfa__ico"><I.shield size={22} /></span>
        <b>Verifikasi dua langkah</b>
        <span className="st-small st-muted">Masukkan 6 digit kode dari aplikasi authenticator untuk membuka Studio.</span>
        <Text label="Kode authenticator" value={code} onChange={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} autoComplete="one-time-code" inputMode="numeric" />
        {err && <span className="st-alert st-alert--err st-small">{err}</span>}
        <Btn kind="primary" type="submit" busy={busy === 'v'} disabled={code.length !== 6}>Verifikasi</Btn>
        <Btn kind="quiet" onClick={signOut}>Keluar</Btn>
      </form>
    </div>
  );
}

/** Pendaftaran authenticator (TOTP) untuk Commander. Penegakan di server lewat flag commander_mfa_required. */
export function MfaPanel({ required }: { required: boolean }) {
  const toast = useToast();
  const { aal, refreshAal } = useAuth();
  const s = useLoad(totpFactors);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const { busy, run } = useAction();
  const verified = (s.data ?? []).filter((f) => f.status === 'verified');
  const start = () => run('e', async () => {
    for (const f of (s.data ?? []).filter((x) => x.status !== 'verified')) await sb.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}` });
    if (error) throw new Error(error.message);
    if (data.type !== 'totp') throw new Error('Jenis authenticator tidak didukung.');
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }, undefined, (e) => toast(e, 'err'));
  const confirm = () => run('c', async () => {
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: enroll!.id, code: code.trim() });
    if (error) throw new Error('Kode salah. Pastikan jam ponsel sinkron, lalu coba kode terbaru.');
    await refreshAal();
  }, () => { toast('Authenticator aktif. Sesi ini sudah terverifikasi MFA.'); setEnroll(null); setCode(''); s.reload(); }, (e) => toast(e, 'err'));
  const remove = (f: Factor) => run(f.id, async () => {
    const { error } = await sb.auth.mfa.unenroll({ factorId: f.id });
    if (error) throw new Error(error.message.includes('aal2') ? 'Verifikasi MFA dulu (masuk ulang) sebelum menghapus authenticator.' : error.message);
    await refreshAal();
  }, () => { toast('Authenticator dihapus.'); s.reload(); }, (e) => toast(e, 'err'));
  return (
    <Card title={<span className="st-row"><I.shield size={16} />MFA Commander</span>}
      desc="Payout, refund, approval, undangan & rilis butuh sesi yang diverifikasi authenticator saat flag “MFA wajib untuk Commander” ON. Daftarkan authenticator dulu, lalu nyalakan flag dari sesi ini."
      actions={<Badge tone={aal?.current === 'aal2' ? 'ok' : 'warn'}>{aal?.current === 'aal2' ? 'Sesi MFA' : 'Sesi tanpa MFA'}</Badge>}>
      <Loaded state={s}>
        {() => (
          <div className="st-stack">
            {verified.length > 0 ? (
              <ul className="st-list">{verified.map((f) => <li key={f.id}><span><b>{f.friendly_name ?? 'Authenticator'}</b><small>Terdaftar {fmtDate(f.created_at)}</small></span><Badge tone="ok">Aktif</Badge><Btn size="sm" kind="quiet" busy={busy === f.id} onClick={() => remove(f)}>Hapus</Btn></li>)}</ul>
            ) : <p className="st-small st-muted">Belum ada authenticator.{required ? ' Flag MFA sedang ON — aksi sensitif akan ditolak sampai Anda mendaftar dan masuk dengan kode.' : ''}</p>}
            {!verified.length && !enroll && <div className="st-row"><Btn kind="primary" size="sm" busy={busy === 'e'} onClick={start}>Daftarkan authenticator</Btn></div>}
            {enroll && (
              <div className="st-mfa-enroll">
                <img src={enroll.qr} alt="QR code authenticator" width={168} height={168} />
                <div className="st-stack--tight">
                  <span className="st-small">Pindai dengan Google Authenticator, 1Password, atau Authy. Tidak bisa memindai? Masukkan kunci ini:</span>
                  <code className="st-mono st-small">{enroll.secret}</code>
                  <Text label="Kode 6 digit" value={code} onChange={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" />
                  <div className="st-row"><Btn kind="primary" size="sm" busy={busy === 'c'} disabled={code.length !== 6} onClick={confirm}>Aktifkan</Btn><Btn size="sm" kind="quiet" onClick={() => setEnroll(null)}>Batal</Btn></div>
                </div>
              </div>
            )}
          </div>
        )}
      </Loaded>
    </Card>
  );
}
