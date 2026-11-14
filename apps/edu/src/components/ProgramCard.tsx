import { Link } from 'react-router-dom';
import { ArrowRight } from '@viboxs/shared/icons';
import { useSpotlight } from '@viboxs/shared/fx';
import Status, { Sample } from './Status';
import { TYPE, ctaFor, hrefOf, lcFirst, pathName, priceOf, timeOf, whenOf, type Program } from '../lib/data';

const DIM = ['CLOSED', 'CANCELLED', 'COMPLETED'];

export default function ProgramCard({ p, from = 'programs', showPath, build }: { p: Program; from?: 'programs' | 'events'; showPath?: boolean; build?: boolean }) {
  const spot = useSpotlight<HTMLAnchorElement>();
  return (
    <Link ref={spot} to={hrefOf(p, from)} className={`pcard ${DIM.includes(p.status) ? 'is-dim' : ''}`} data-build={build ? `Kartu · ${TYPE[p.type]}` : undefined}>
      <span className="pcard__glow" aria-hidden="true" />
      <span className="row-between pcard__top">
        <span className="pcard__type">{TYPE[p.type]}{showPath && ` · ${pathName(p.path)}`}</span>
        <Status code={p.status} size="sm" />
      </span>
      <span className="pcard__title">{p.title}</span>
      <span className="pcard__who">Untuk {lcFirst(p.forWho)}</span>
      <span className="pcard__when">
        <span className="strong">{whenOf(p)}</span>
        <span className="ink-muted">{timeOf(p)}</span>
        {p.status === 'RESCHEDULED' && <span className="pcard__resched">Jadwal baru · sebelumnya <s>{p.prevDate}</s></span>}
      </span>
      <span className="pcard__foot">
        <span className="pcard__price">{priceOf(p)}</span>
        <span className="pcard__cta">{ctaFor(p)}<ArrowRight size={14} /></span>
      </span>
      <Sample />
    </Link>
  );
}
