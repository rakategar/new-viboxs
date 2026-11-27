import { useAction, useLoad } from '../../lib/hooks';
import { fmtDate } from '../../lib/labels';
import { sb, must, type Flag } from '../../lib/sb';
import { Badge, Card, I, Loaded, PageHead, Toggle, useToast } from '../../ui/kit';
import { MfaPanel } from '../Mfa';

/** CMD-11: feature flags. Invariant keamanan dikunci di database dan tidak bisa diubah dari UI maupun API. */
export default function Config() {
  const s = useLoad(() => must(sb.from('st_flags').select('*').order('locked').order('key')) as Promise<Flag[]>);
  return (
    <div className="st-page-in">
      <PageHead eyebrow="CMD-11 · Config & Feature Flags" title="Feature flags" desc="Setiap perubahan tercatat di audit. Flag terkunci adalah invariant PRD atau fitur Coming Soon — RLS menolak perubahan apa pun." />
      <Loaded state={s}>
        {(d) => (
          <>
          <MfaPanel required={!!d.find((f) => f.key === 'commander_mfa_required')?.enabled} />
          <div className="st-grid2">
            <Card title="Dapat diatur">{d.filter((f) => !f.locked).map((f) => <FlagRow key={f.key} f={f} onDone={s.reload} />)}</Card>
            <Card title={<><I.lock size={16} /> Terkunci</>} desc="Invariant keamanan & Coming Soon.">
              <ul className="st-flags">{d.filter((f) => f.locked).map((f) => (
                <li key={f.key}><span><b>{f.label}</b><small>{f.description}</small><code>{f.key}</code></span><Badge tone={f.enabled ? 'ok' : 'muted'}>{f.enabled ? 'ON' : 'OFF'}</Badge></li>
              ))}</ul>
            </Card>
          </div>
          </>
        )}
      </Loaded>
    </div>
  );
}

function FlagRow({ f, onDone }: { f: Flag; onDone: () => void }) {
  const toast = useToast();
  const { busy, run } = useAction();
  const toggle = (v: boolean) => run('t', async () => { await must(sb.from('st_flags').update({ enabled: v, updated_at: new Date().toISOString() }).eq('key', f.key)); }, () => { toast(`${f.label}: ${v ? 'ON' : 'OFF'}`); onDone(); }, (e) => toast(e, 'err'));
  return (
    <div className="st-flagrow">
      <Toggle label={f.label} hint={<>{f.description} <code>{f.key}</code> · diubah {fmtDate(f.updated_at)}</>} checked={f.enabled} disabled={busy === 't'} onChange={toggle} />
    </div>
  );
}
