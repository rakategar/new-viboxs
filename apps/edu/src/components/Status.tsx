import type { CSSProperties } from 'react';
import { STATUS, type StatusCode } from '../lib/data';

const TONE_VAR = {
  success: 'var(--v-success-l)', info: 'var(--v-info-l)', warning: 'var(--v-warning-l)',
  danger: 'var(--v-danger-l)', muted: 'var(--v-light-muted)', accent2: 'var(--v-accent-2-deep)',
} as const;

export const toneOf = (code: StatusCode) => TONE_VAR[STATUS[code].tone];

/** Badge status sesi — warna dari tone, titik berdenyut bila pendaftaran aktif. */
export default function Status({ code, size = 'md', still }: { code: StatusCode; size?: 'sm' | 'md' | 'lg'; still?: boolean }) {
  const s = STATUS[code];
  return (
    <span className={`st st--${size}`} style={{ '--tone': toneOf(code) } as CSSProperties}>
      <span className={`st__dot ${s.live && !still ? 'is-live' : ''}`} aria-hidden="true" />
      {s.label}
    </span>
  );
}

export const Sample = ({ inline }: { inline?: boolean }) => <span className={inline ? 'sample sample--inline' : 'sample'}>[contoh]</span>;
