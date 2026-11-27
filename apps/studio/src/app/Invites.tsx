import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useAction, useLoad } from '../lib/hooks';
import { ROLE, fmtDate } from '../lib/labels';
import { rpc, type Role } from '../lib/sb';
import { Btn, I, useToast } from '../ui/kit';

interface MyInvite { id: string; roles: Role[]; expires_at: string }

/**
 * Undangan untuk email akun yang sedang masuk (v4 WP01/WP02). Email login terverifikasi = bukti kepemilikan,
 * jadi peran bisa diaktifkan di sini tanpa membuka tautan email (mis. Learner → Kontributor, PIC → Company).
 */
export function PendingInvites() {
  const { refresh } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const s = useLoad(() => rpc<MyInvite[]>('st_my_invites'));
  const { busy, run } = useAction();
  const accept = (id: string) => run(id, () => rpc<Role[]>('st_accept_invite_by_id', { p_invite: id }),
    async () => { toast('Peran diaktifkan.'); await refresh(); nav('/workspace', { replace: true }); }, (m) => toast(m, 'err'));
  const list = s.data ?? [];
  if (!list.length) return null;
  return (
    <section className="st-alert st-alert--info st-alert--row" aria-label="Undangan menunggu">
      {list.map((x) => (
        <span key={x.id} className="row-between" style={{ width: '100%', gap: 12, flexWrap: 'wrap' }}>
          <span><b>Undangan menunggu:</b> {x.roles.map((r) => ROLE[r]?.label ?? r).join(', ')} <small className="st-muted">· berlaku s.d. {fmtDate(x.expires_at)} · dengan menerima, Anda menyetujui ketentuan peran (draf, menunggu review hukum)</small></span>
          <Btn size="sm" kind="primary" onClick={() => accept(x.id)} busy={busy === x.id}><I.key size={14} />Terima &amp; aktifkan</Btn>
        </span>
      ))}
    </section>
  );
}
