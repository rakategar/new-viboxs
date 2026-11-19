import { createContext, useCallback, useContext, useId, useState, type ReactNode } from 'react';

/* ---------------- ikon kecil (inline, tanpa dependensi) ---------------- */
const P = (d: string) => (props: { size?: number }) => (
  <svg width={props.size ?? 18} height={props.size ?? 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
export const I = {
  home: P('M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z'),
  grid: P('M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'),
  book: P('M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 5v16M8 7h7'),
  list: P('M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'),
  users: P('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'),
  inbox: P('M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11'),
  cog: P('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1'),
  out: P('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9'),
  ext: P('M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3'),
  plus: P('M12 5v14M5 12h14'),
  up: P('m18 15-6-6-6 6'),
  down: P('m6 9 6 6 6-6'),
  trash: P('M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'),
  copy: P('M9 9h11v11H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1'),
  edit: P('M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z'),
  star: P('m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z'),
  eye: P('M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6'),
  eyeOff: P('M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22'),
  mail: P('M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6'),
  menu: P('M3 6h18M3 12h18M3 18h18'),
  x: P('M18 6 6 18M6 6l12 12'),
  search: P('M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35'),
  refresh: P('M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15'),
};

/* ---------------- toast ---------------- */
type Toast = { id: number; msg: string; tone: 'ok' | 'err' };
const ToastCtx = createContext<(msg: string, tone?: 'ok' | 'err') => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastHost({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const push = useCallback((msg: string, tone: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random();
    setList((l) => [...l, { id, msg, tone }]);
    window.setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), tone === 'err' ? 6000 : 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="adm-toasts" role="status" aria-live="polite">
        {list.map((t) => <div key={t.id} className={`adm-toast adm-toast--${t.tone}`}>{t.msg}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------------- kontrol form ---------------- */
export function Field({ label, hint, children, wide }: { label: string; hint?: string; children: (id: string) => ReactNode; wide?: boolean }) {
  const id = useId();
  return (
    <div className={`adm-field ${wide ? 'adm-field--wide' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {hint && <span className="adm-hint">{hint}</span>}
    </div>
  );
}
export function Text({ label, value, onChange, hint, wide, placeholder, type = 'text' }: { label: string; value: string | undefined; onChange: (v: string) => void; hint?: string; wide?: boolean; placeholder?: string; type?: string }) {
  return <Field label={label} hint={hint} wide={wide}>{(id) => <input id={id} type={type} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}</Field>;
}
export function Area({ label, value, onChange, hint, rows = 3, wide = true, placeholder }: { label: string; value: string | undefined; onChange: (v: string) => void; hint?: string; rows?: number; wide?: boolean; placeholder?: string }) {
  return <Field label={label} hint={hint} wide={wide}>{(id) => <textarea id={id} rows={rows} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}</Field>;
}
export function Select<T extends string>({ label, value, onChange, options, hint, wide }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][]; hint?: string; wide?: boolean }) {
  return <Field label={label} hint={hint} wide={wide}>{(id) => <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}</Field>;
}
export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="adm-toggle">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="adm-toggle__track" aria-hidden="true"><span /></span>
      <span className="adm-toggle__txt"><b>{label}</b>{hint && <span className="adm-hint">{hint}</span>}</span>
    </label>
  );
}

/** Editor daftar teks satu baris (tag, topik, poin). */
export function StringList({ label, items, onChange, placeholder, hint }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string; hint?: string }) {
  const [draft, setDraft] = useState('');
  const add = () => { const v = draft.trim(); if (v) { onChange([...items, v]); setDraft(''); } };
  return (
    <div className="adm-field adm-field--wide">
      <span className="adm-label">{label}</span>
      <ul className="adm-slist">
        {items.map((it, i) => (
          <li key={i}>
            <input value={it} aria-label={`${label} ${i + 1}`} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
            <span className="adm-slist__act">
              <button type="button" className="adm-icon" disabled={i === 0} onClick={() => onChange(move(items, i, -1))} aria-label="Naikkan"><I.up size={15} /></button>
              <button type="button" className="adm-icon" disabled={i === items.length - 1} onClick={() => onChange(move(items, i, 1))} aria-label="Turunkan"><I.down size={15} /></button>
              <button type="button" className="adm-icon adm-icon--danger" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Hapus"><I.trash size={15} /></button>
            </span>
          </li>
        ))}
      </ul>
      <div className="adm-slist__add">
        <input value={draft} placeholder={placeholder ?? 'Tambah item…'} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={add}><I.plus size={15} />Tambah</button>
      </div>
      {hint && <span className="adm-hint">{hint}</span>}
    </div>
  );
}

export const move = <T,>(arr: T[], i: number, d: number) => {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const n = [...arr];
  [n[i], n[j]] = [n[j], n[i]];
  return n;
};

export function Card({ title, desc, children, actions, id }: { title: string; desc?: string; children: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <section className="adm-card" id={id}>
      <header className="adm-card__head">
        <div><h2>{title}</h2>{desc && <p>{desc}</p>}</div>
        {actions && <div className="adm-card__act">{actions}</div>}
      </header>
      <div className="adm-card__body">{children}</div>
    </section>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="adm-empty"><b>{title}</b>{children}</div>;
}

export const fmtDate = (s: string) => new Date(s).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
export const ago = (s: string) => {
  const m = Math.round((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d} hari lalu` : fmtDate(s);
};

/** Kepala halaman dashboard: judul + aksi. */
export function PageHead({ title, desc, children }: { title: string; desc?: string; children?: ReactNode }) {
  return (
    <header className="adm-head">
      <div><h1>{title}</h1>{desc && <p className="adm-muted">{desc}</p>}</div>
      {children && <div className="adm-head__act">{children}</div>}
    </header>
  );
}
