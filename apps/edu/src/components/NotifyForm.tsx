import { useId, useState, type FormEvent } from 'react';
import { Check } from '@viboxs/shared/icons';
import { emailOk } from '../lib/data';
import { submitForm } from '@viboxs/shared/backend';

/** Opt-in pemberitahuan → disimpan di database + email ke admin. */
export default function NotifyForm({ label = 'Email', consent = 'Saya setuju menerima email pemberitahuan program EDU. Bisa berhenti kapan saja.', compact, done = 'Terima kasih. Kami kirim email saat program pertama dibuka.' }: { label?: string; consent?: string; compact?: boolean; done?: string }) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!emailOk(email)) { setErr('Masukkan email yang valid.'); return; }
    if (!ok) { setErr('Centang persetujuan agar kami boleh mengirim pemberitahuan.'); return; }
    setErr(''); setBusy(true);
    try {
      await submitForm('notify', 'edu', { email: email.trim(), consent: true, halaman: window.location.pathname });
      setSent(true);
    } catch (x) { setErr((x as Error).message); }
    finally { setBusy(false); }
  }

  if (sent) return <div role="status" className="notify__done"><Check size={18} />{done}</div>;
  return (
    <form onSubmit={submit} noValidate className={`notify ${compact ? 'notify--compact' : ''}`}>
      <label htmlFor={id} className="notify__label">{label}</label>
      <div className="notify__row">
        <input id={id} type="email" autoComplete="email" value={email} placeholder="nama@domain.com" aria-invalid={!!err && !emailOk(email)}
          onChange={(e) => { setEmail(e.target.value); setErr(''); }} />
        <button type="submit" className="btn btn--ink" disabled={busy}>{busy ? 'Menyimpan…' : 'Beri tahu saya'}</button>
      </div>
      <label className="check-l"><input type="checkbox" checked={ok} onChange={(e) => { setOk(e.target.checked); setErr(''); }} />{consent}</label>
      {err && <span role="alert" className="field-err">{err}</span>}
    </form>
  );
}
