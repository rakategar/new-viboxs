import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { MISSION_FLOW, MISSION_STEP_LABEL, type Tone } from '../lib/labels';
import { useCountUp } from '../lib/hooks';

/* ---------------- ikon (outline 1.8px, satu gaya) ---------------- */
const P = (d: string) => function Icon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
};
export const I = {
  home: P('M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z'),
  grid: P('M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'),
  inbox: P('M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11'),
  users: P('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'),
  key: P('M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zM15.5 7.5l3 3L22 7l-3-3'),
  lead: P('M3 3h18v4H3zM5 7v13h14V7M9 11h6'),
  target: P('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'),
  book: P('M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 5v16M8 7h7'),
  wallet: P('M20 12V8H6a2 2 0 0 1 0-4h12v4M4 6v12a2 2 0 0 0 2 2h14v-4M18 12a2 2 0 0 0 0 4h4v-4z'),
  link: P('M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'),
  sliders: P('M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6'),
  shield: P('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'),
  bell: P('M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0'),
  user: P('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8'),
  out: P('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9'),
  ext: P('M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3'),
  plus: P('M12 5v14M5 12h14'),
  x: P('M18 6 6 18M6 6l12 12'),
  check: P('M20 6 9 17l-5-5'),
  menu: P('M3 6h18M3 12h18M3 18h18'),
  search: P('M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35'),
  refresh: P('M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15'),
  copy: P('M9 9h11v11H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1'),
  arrow: P('M5 12h14M13 6l6 6-6 6'),
  back: P('M19 12H5M11 18l-6-6 6-6'),
  spark: P('M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8'),
  star: P('m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z'),
  box: P('M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96 12 12.01l8.73-5.05M12 22.08V12'),
  chat: P('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'),
  compass: P('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z'),
  file: P('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5'),
  clock: P('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2'),
  lock: P('M5 11h14v10H5zM8 11V7a4 4 0 1 1 8 0v4'),
  swap: P('M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16'),
  eye: P('M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6'),
  eyeOff: P('M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22'),
};

/* ---------------- toast ---------------- */
type Toast = { id: number; msg: string; tone: 'ok' | 'err' | 'info'; title?: string; link?: string };
type Push = (msg: string, tone?: Toast['tone'], extra?: { title?: string; link?: string }) => void;
const ToastCtx = createContext<Push>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastHost({ children, onOpen }: { children: ReactNode; onOpen?: (link: string) => void }) {
  const [list, setList] = useState<Toast[]>([]);
  const push = useCallback<Push>((msg, tone = 'ok', extra) => {
    const id = Date.now() + Math.random();
    setList((l) => [...l.slice(-3), { id, msg, tone, ...extra }]);
    window.setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), tone === 'err' ? 7000 : 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="st-toasts" role="status" aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className={`st-toast st-toast--${t.tone}`}>
            {t.title && <b>{t.title}</b>}
            <span>{t.msg}</span>
            {t.link && onOpen && <button type="button" className="st-linkbtn" onClick={() => onOpen(t.link!)}>Buka</button>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------------- dasar ---------------- */
export function Badge({ tone = 'muted', children, dot }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return <span className={`st-badge st-badge--${tone}`}>{dot && <i aria-hidden="true" />}{children}</span>;
}
export function StatusBadge({ map, value }: { map: Record<string, [string, Tone]>; value: string }) {
  const [label, tone] = map[value] ?? [value, 'muted' as Tone];
  return <Badge tone={tone} dot={tone === 'accent' || tone === 'violet' || tone === 'warn'}>{label}</Badge>;
}

export function Btn({ children, kind = 'ghost', size, busy, busyLabel = 'Memproses…', ...p }:
  { children: ReactNode; kind?: 'primary' | 'ghost' | 'danger' | 'quiet'; size?: 'sm'; busy?: boolean; busyLabel?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...p} disabled={p.disabled || busy} aria-busy={busy || undefined} className={`st-btn st-btn--${kind} ${size ? `st-btn--${size}` : ''} ${p.className ?? ''}`}>
      {busy ? <><span className="st-spin" aria-hidden="true" />{busyLabel}</> : children}
    </button>
  );
}

export function PageHead({ eyebrow, title, desc, children }: { eyebrow?: string; title: string; desc?: ReactNode; children?: ReactNode }) {
  return (
    <header className="st-head">
      <div className="st-head__txt">
        {eyebrow && <span className="st-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {desc && <p className="st-muted">{desc}</p>}
      </div>
      {children && <div className="st-head__act">{children}</div>}
    </header>
  );
}

export function Card({ title, desc, children, actions, className, id }: { title?: ReactNode; desc?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string; id?: string }) {
  return (
    <section className={`st-card ${className ?? ''}`} id={id}>
      {(title || actions) && (
        <header className="st-card__head">
          <div>{title && <h2>{title}</h2>}{desc && <p>{desc}</p>}</div>
          {actions && <div className="st-card__act">{actions}</div>}
        </header>
      )}
      <div className="st-card__body">{children}</div>
    </section>
  );
}

export function Empty({ title, children, icon: Ico = I.box }: { title: string; children?: ReactNode; icon?: (p: { size?: number }) => JSX.Element }) {
  return <div className="st-empty"><span className="st-empty__ico"><Ico size={22} /></span><b>{title}</b>{children && <div className="st-empty__txt">{children}</div>}</div>;
}

export function ErrorBox({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
  return (
    <div className="st-alert st-alert--err" role="alert">
      <span>{msg}</span>
      {onRetry && <Btn size="sm" onClick={onRetry}><I.refresh size={14} />Coba lagi</Btn>}
    </div>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return <div className="st-skel" aria-label="Memuat…" role="status">{Array.from({ length: rows }, (_, i) => <span key={i} style={{ ['--i' as string]: i }} />)}</div>;
}

/** Bungkus state halaman: loading → error → kosong → isi. */
export function Loaded<T>({ state, empty, children }: { state: { data: T | null; error: string; loading: boolean; reload: () => void }; empty?: (d: T) => ReactNode | null; children: (d: T) => ReactNode }) {
  if (state.error && !state.data) return <ErrorBox msg={state.error} onRetry={state.reload} />;
  if (state.loading && state.data === null) return <Skeleton />;
  if (state.data === null) return null;
  const e = empty?.(state.data);
  return <>{state.error && <ErrorBox msg={state.error} onRetry={state.reload} />}{e ?? children(state.data)}</>;
}

/* ---------------- form ---------------- */
export function Field({ label, hint, error, children, wide, required }: { label: string; hint?: ReactNode; error?: string; children: (id: string, describedBy?: string) => ReactNode; wide?: boolean; required?: boolean }) {
  const id = useId();
  const hid = hint || error ? `${id}-d` : undefined;
  return (
    <div className={`st-field ${wide ? 'st-field--wide' : ''} ${error ? 'has-err' : ''}`}>
      <label htmlFor={id}>{label}{required && <span className="st-req" aria-hidden="true"> *</span>}</label>
      {children(id, hid)}
      {(error || hint) && <span id={hid} className={error ? 'st-ferr' : 'st-hint'}>{error || hint}</span>}
    </div>
  );
}
type TextProps = { label: string; value: string | number | null | undefined; onChange: (v: string) => void; hint?: ReactNode; error?: string; wide?: boolean; placeholder?: string; type?: string; required?: boolean; autoComplete?: string; min?: number; step?: number };
export function Text({ label, value, onChange, hint, error, wide, placeholder, type = 'text', required, autoComplete, min, step }: TextProps) {
  return <Field label={label} hint={hint} error={error} wide={wide} required={required}>{(id, d) => <input id={id} type={type} value={value ?? ''} placeholder={placeholder} autoComplete={autoComplete} min={min} step={step} aria-invalid={!!error || undefined} aria-describedby={d} required={required} onChange={(e) => onChange(e.target.value)} />}</Field>;
}
export function Area({ label, value, onChange, hint, error, rows = 4, wide = true, placeholder, required }: { label: string; value: string | null | undefined; onChange: (v: string) => void; hint?: ReactNode; error?: string; rows?: number; wide?: boolean; placeholder?: string; required?: boolean }) {
  return <Field label={label} hint={hint} error={error} wide={wide} required={required}>{(id, d) => <textarea id={id} rows={rows} value={value ?? ''} placeholder={placeholder} aria-invalid={!!error || undefined} aria-describedby={d} onChange={(e) => onChange(e.target.value)} />}</Field>;
}
export function Select<T extends string>({ label, value, onChange, options, hint, wide }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][]; hint?: ReactNode; wide?: boolean }) {
  return <Field label={label} hint={hint} wide={wide}>{(id, d) => <select id={id} value={value} aria-describedby={d} onChange={(e) => onChange(e.target.value as T)}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}</Field>;
}
export function Check({ label, checked, onChange, hint }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; hint?: ReactNode }) {
  return (
    <label className="st-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="st-check__box" aria-hidden="true"><I.check size={12} /></span>
      <span><b>{label}</b>{hint && <span className="st-hint">{hint}</span>}</span>
    </label>
  );
}
export function Toggle({ label, checked, onChange, hint, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: ReactNode; disabled?: boolean }) {
  return (
    <label className={`st-toggle ${disabled ? 'is-disabled' : ''}`}>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="st-toggle__track" aria-hidden="true"><span /></span>
      <span className="st-toggle__txt"><b>{label}</b>{hint && <span className="st-hint">{hint}</span>}</span>
    </label>
  );
}
/** Pilih banyak tag (chip). */
export function Chips({ label, options, value, onChange, hint }: { label: string; options: [string, string][]; value: string[]; onChange: (v: string[]) => void; hint?: ReactNode }) {
  return (
    <fieldset className="st-field st-field--wide st-chips">
      <legend>{label}</legend>
      <div className="st-chips__row">
        {options.map(([v, l]) => {
          const on = value.includes(v);
          return <button key={v} type="button" className={`st-chip ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== v) : [...value, v])}>{on && <I.check size={12} />}{l}</button>;
        })}
      </div>
      {hint && <span className="st-hint">{hint}</span>}
    </fieldset>
  );
}
/** Daftar teks bebas dipisah koma. */
export function TagInput({ label, value, onChange, hint, placeholder }: { label: string; value: string[]; onChange: (v: string[]) => void; hint?: ReactNode; placeholder?: string }) {
  const [raw, setRaw] = useState(value.join(', '));
  useEffect(() => { setRaw(value.join(', ')); }, [value.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Text label={label} value={raw} placeholder={placeholder} hint={hint ?? 'Pisahkan dengan koma.'} wide onChange={(v) => { setRaw(v); onChange(v.split(',').map((s) => s.trim()).filter(Boolean)); }} />;
}

/* ---------------- tabs ---------------- */
export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: [T, ReactNode, number?][]; value: T; onChange: (v: T) => void; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState({ x: 0, w: 0 });
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    if (el) setInd({ x: el.offsetLeft, w: el.offsetWidth });
  }, [value, tabs.length]);
  const onKey = (e: React.KeyboardEvent) => {
    const i = tabs.findIndex((t) => t[0] === value);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length][0];
      onChange(n);
      window.setTimeout(() => ref.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus(), 0);
    }
  };
  return (
    <div className="st-tabs" role="tablist" aria-label={label} ref={ref} onKeyDown={onKey}>
      {tabs.map(([v, l, n]) => (
        <button key={v} type="button" role="tab" aria-selected={v === value} tabIndex={v === value ? 0 : -1} className={`st-tab ${v === value ? 'is-on' : ''}`} onClick={() => onChange(v)}>
          {l}{n != null && n > 0 && <em>{n}</em>}
        </button>
      ))}
      <span className="st-tabs__ind" style={{ transform: `translateX(${ind.x}px)`, width: ind.w }} aria-hidden="true" />
    </div>
  );
}

/* ---------------- dialog ---------------- */
export function Dialog({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    back.current = document.activeElement as HTMLElement;
    const el = ref.current!;
    const focusables = () => [...el.querySelectorAll<HTMLElement>('a,button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])')];
    window.setTimeout(() => (focusables()[1] ?? focusables()[0])?.focus(), 30);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'Tab') {
        const f = focusables(); if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener('keydown', key);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = ''; back.current?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="st-dlg" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`st-dlg__box ${wide ? 'is-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <header><h2>{title}</h2><button type="button" className="st-icon" onClick={onClose} aria-label="Tutup"><I.x /></button></header>
        <div className="st-dlg__body">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- data viz kecil ---------------- */
export function Stat({ label, value, hint, tone, onClick, live, fmt }: { label: string; value: number | null; hint?: string; tone?: Tone; onClick?: () => void; live?: boolean; fmt?: (n: number) => string }) {
  const n = useCountUp(value ?? 0);
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} className={`st-stat ${tone ? `st-stat--${tone}` : ''} ${onClick ? 'is-btn' : ''}`} onClick={onClick}>
      <span className="st-stat__label">{live && <i className="st-live" aria-hidden="true" />}{label}</span>
      <b className="st-stat__val">{value == null ? '—' : fmt ? fmt(n) : n}</b>
      {hint && <span className="st-stat__hint">{value === 0 ? 'Belum ada data' : hint}</span>}
    </Tag>
  );
}

/** Rail state machine mission — langkah selesai/aktif terisi bergerak. */
export function MissionRail({ status }: { status: string }) {
  const idx = MISSION_FLOW.indexOf(status as (typeof MISSION_FLOW)[number]);
  const alt = idx < 0;
  const mapped = status === 'revision_requested' ? MISSION_FLOW.indexOf('in_progress') : status === 'review' ? MISSION_FLOW.indexOf('submitted') : idx;
  const pct = mapped < 0 ? 0 : (mapped / (MISSION_FLOW.length - 1)) * 100;
  return (
    <div className={`st-rail ${alt && mapped < 0 ? 'is-alt' : ''}`} aria-label={`Tahap mission: ${status}`}>
      <div className="st-rail__line"><span style={{ width: `${pct}%` }} /></div>
      <ol>
        {MISSION_FLOW.map((s, i) => (
          <li key={s} className={i < mapped ? 'is-done' : i === mapped ? 'is-now' : ''} style={{ ['--i' as string]: i }}>
            <i aria-hidden="true" /><span>{MISSION_STEP_LABEL[s]}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Kartu "Coming Soon" — informasi saja, tanpa kontrol palsu. */
export function ComingSoon({ title, children, icon: Ico = I.spark }: { title: string; children: ReactNode; icon?: (p: { size?: number }) => JSX.Element }) {
  return (
    <div className="st-soon">
      <span className="st-soon__ico"><Ico size={18} /></span>
      <div><b>{title}</b><p>{children}</p></div>
      <Badge tone="muted">Coming Soon</Badge>
    </div>
  );
}

export function Copy({ text, label = 'Salin' }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <Btn size="sm" onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); window.setTimeout(() => setOk(false), 1800); } catch { /* clipboard diblokir */ } }}>
      {ok ? <><I.check size={14} />Tersalin</> : <><I.copy size={14} />{label}</>}
    </Btn>
  );
}

export function KV({ rows }: { rows: [string, ReactNode][] }) {
  return <dl className="st-kv">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v ?? '—'}</dd></div>)}</dl>;
}
