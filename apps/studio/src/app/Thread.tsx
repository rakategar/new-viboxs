import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';
import { ROLE, ago } from '../lib/labels';
import { sb, errMsg, type Message, type Role } from '../lib/sb';
import { I, useToast } from '../ui/kit';

/** Thread yang terikat pada satu mission (per Ranger) atau satu workspace kolaborasi. Realtime. */
export default function Thread({ type, threadId, rangerId, readOnly }: { type: 'mission' | 'workspace'; threadId: string; rangerId?: string; readOnly?: boolean }) {
  const { me } = useAuth();
  const toast = useToast();
  const [list, setList] = useState<Message[] | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useEffect(() => {
    let alive = true;
    let q = sb.from('st_messages').select('*').eq('thread_type', type).eq('thread_id', threadId).order('created_at').limit(300);
    if (rangerId) q = q.eq('ranger_id', rangerId);
    q.then(({ data, error }) => { if (alive) { if (error) toast(errMsg(error), 'err'); setList((data as Message[]) ?? []); } });
    const ch = sb.channel(`th-${type}-${threadId}-${rangerId ?? ''}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'st_messages', filter: `thread_id=eq.${threadId}` }, (p) => {
        const m = p.new as Message;
        if (rangerId && m.ranger_id !== rangerId) return;
        setList((l) => (l && !l.some((x) => x.id === m.id) ? [...l, m] : l));
      }).subscribe();
    return () => { alive = false; sb.removeChannel(ch); };
  }, [type, threadId, rangerId, toast]);

  useEffect(() => {
    if (!list?.length) return;
    end.current?.scrollIntoView({ block: 'nearest', behavior: first.current ? 'auto' : 'smooth' });
    first.current = false;
  }, [list?.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const t = body.trim();
    if (!t) return;
    setBusy(true);
    const { data, error } = await sb.from('st_messages').insert({ thread_type: type, thread_id: threadId, ranger_id: rangerId ?? null, body: t }).select('*').single();
    setBusy(false);
    if (error) { toast(errMsg(error), 'err'); return; }
    setBody('');
    setList((l) => (l && !l.some((x) => x.id === (data as Message).id) ? [...l, data as Message] : l));
  }

  const uid = me?.profile.id;
  return (
    <div className="st-thread">
      <div className="st-thread__list" aria-live="polite">
        {list === null ? <div className="st-skel"><span /><span /></div> : !list.length ? <p className="st-muted st-small st-thread__empty">Belum ada pesan. Diskusi teknis, klarifikasi brief, dan catatan progres ditulis di sini.</p> : list.map((m) => (
          <div key={m.id} className={`st-msg ${m.author_id === uid ? 'is-me' : ''}`}>
            <span className="st-msg__who">{m.author_id === uid ? 'Anda' : m.author_name || 'Peserta'}{m.acting_as && <small> · {ROLE[m.acting_as as Role]?.label ?? m.acting_as}</small>}</span>
            <p>{m.body}</p>
            <time>{ago(m.created_at)}</time>
          </div>
        ))}
        <div ref={end} />
      </div>
      {!readOnly && (
        <form className="st-thread__form" onSubmit={send}>
          <label htmlFor={`msg-${threadId}-${rangerId ?? ''}`} className="sr-only">Tulis pesan</label>
          <textarea id={`msg-${threadId}-${rangerId ?? ''}`} rows={2} value={body} maxLength={4000} placeholder="Tulis pesan… (Enter kirim, Shift+Enter baris baru)" onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement).requestSubmit(); } }} />
          <button type="submit" className="st-btn st-btn--primary st-btn--sm" disabled={busy || !body.trim()} aria-label="Kirim pesan"><I.arrow size={16} /></button>
        </form>
      )}
    </div>
  );
}
