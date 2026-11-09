import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { CASE_STUDIES } from '../lib/content';
import { useMotion } from '../lib/motion';
import DestLink from './DestLink';

export default function Footer() {
  const ref = useRef<HTMLElement>(null);
  useMotion(ref);
  return (
    <footer ref={ref} className="ftr">
      <div className="container ftr__in">
        <div className="ftr__grid" data-anim="stagger">
          <div className="ftr__brand">
            <img src="/assets/viboxs-wordmark-white.png" alt="VIBOXS" height={20} />
            <p>VIBOXS adalah unit AI Venture Studio di bawah PT Ekosistem Pelosok Hub.</p>
            <span className="small muted">Redaksi identitas legal menunggu verifikasi.</span>
          </div>
          <nav aria-label="Ekosistem">
            <span className="eyebrow">Ekosistem</span>
            <Link to="/">VIBOXS</Link>
            <DestLink k="universe">Universe</DestLink>
            <DestLink k="edu">EDU</DestLink>
            <DestLink k="services">Services</DestLink>
          </nav>
          <nav aria-label="Perusahaan">
            <span className="eyebrow">Perusahaan</span>
            <Link to="/ecosystem">Peta ekosistem</Link>
            <Link to="/about">Tentang</Link>
            {CASE_STUDIES.length > 0 && <Link to="/work">Karya</Link>}
            <Link to="/contact">Kontak</Link>
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
          <span>viboxs.com · Bahasa Indonesia</span>
        </div>
      </div>
      <div className="container ftr__mark" aria-hidden="true">
        <img data-parallax="40" src="/assets/viboxs-wordmark-white.png" alt="" />
      </div>
    </footer>
  );
}
