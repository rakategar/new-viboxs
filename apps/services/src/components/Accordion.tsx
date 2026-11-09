import { useId, useState, type ReactNode } from 'react';
import { Chevron } from '@viboxs/shared/icons';

export interface AccItem { q: ReactNode; a: ReactNode; key?: string }

/** Accordion aksesibel; tinggi beranimasi lewat grid-rows 0fr→1fr (mati di reduced motion). */
export default function Accordion({ items, tone = 'dark', heading = 'h3', defaultOpen = 0 }: { items: AccItem[]; tone?: 'dark' | 'light'; heading?: 'h2' | 'h3'; defaultOpen?: number | null }) {
  const [open, setOpen] = useState<number | null>(defaultOpen);
  const id = useId();
  const H = heading;
  return (
    <div className={`acc acc--${tone}`}>
      {items.map((it, i) => {
        const on = open === i;
        const pid = `${id}-p${i}`;
        return (
          <div key={it.key ?? i} className={`acc__item ${on ? 'is-open' : ''}`}>
            <H className="acc__h">
              <button type="button" className="acc__btn" aria-expanded={on} aria-controls={pid} onClick={() => setOpen(on ? null : i)}>
                <span className="acc__q">{it.q}</span>
                <span className="acc__icon" aria-hidden="true"><Chevron size={16} /></span>
              </button>
            </H>
            <div id={pid} role="region" className="acc__panel" aria-hidden={!on} {...(on ? {} : { inert: '' })}>
              <div className="acc__inner"><div className="acc__body">{it.a}</div></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
