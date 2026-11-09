import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useMotion } from '@viboxs/shared/motion';
import { CASE_STUDIES } from '../lib/content';
import EcoLink from './EcoLink';

export default function Footer() {
  const ref = useRef<HTMLElement>(null);
  useMotion(ref);
  return (
    <footer ref={ref} className="ftr">
      <div className="container ftr__in">
        <div className="ftr__grid" data-anim="stagger">
          <div className="ftr__brand">
            <span className="row-10"><img src="/assets/viboxs-wordmark-white.png" alt="VIBOXS" height={20} /><span className="strong muted small">· Services</span></span>
            <p>VIBOXS adalah unit AI Venture Studio di bawah PT Ekosistem Pelosok Hub.</p>
            <span className="small muted">Redaksi identitas legal menunggu verifikasi.</span>
          </div>
          <nav aria-label="Services">
            <span className="eyebrow">Services</span>
            <Link to="/#solutions">Solutions</Link>
            <Link to="/advisory">Advisory</Link>
            <Link to="/capabilities">Capabilities</Link>
            <Link to="/process">Process</Link>
            <Link to="/partners">Partners</Link>
            {CASE_STUDIES.length > 0 && <Link to="/work">Work</Link>}
            <Link to="/faq">FAQ</Link>
            <Link to="/start">Start a Mission</Link>
          </nav>
          <nav aria-label="Ekosistem">
            <span className="eyebrow">Ekosistem</span>
            <EcoLink k="corporate">VIBOXS</EcoLink>
            <EcoLink k="universe">Universe</EcoLink>
            <EcoLink k="edu">EDU</EcoLink>
            <Link to="/" aria-current="page">Services</Link>
          </nav>
          <nav aria-label="Legal">
            <span className="eyebrow">Legal</span>
            <Link to="/privacy">Kebijakan privasi</Link>
            <Link to="/terms">Ketentuan layanan</Link>
            <span className="small muted">Konten menunggu review hukum</span>
          </nav>
          <div className="ftr__contact">
            <span className="eyebrow">Kontak resmi</span>
            <span className="slot">[Email resmi — menunggu verifikasi]</span>
            <span className="slot">[Kanal sosial berlabel — menunggu]</span>
          </div>
        </div>
        <div className="ftr__bottom">
          <span>© {new Date().getFullYear()} VIBOXS · PT Ekosistem Pelosok Hub</span>
          <span>services.viboxs.com · Bahasa Indonesia</span>
        </div>
      </div>
      <div className="container ftr__mark" aria-hidden="true">
        <img data-parallax="40" src="/assets/viboxs-wordmark-white.png" alt="" />
      </div>
    </footer>
  );
}
