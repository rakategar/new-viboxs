import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useMotion } from '@viboxs/shared/motion';
import EcoLink from './EcoLink';

export default function Footer() {
  const ref = useRef<HTMLElement>(null);
  useMotion(ref);
  return (
    <footer ref={ref} className="ftr">
      <div className="container ftr__in">
        <div className="ftr__grid" data-anim="stagger">
          <div className="ftr__brand">
            <span className="row-10"><img src="/assets/viboxs-wordmark-white.png" alt="VIBOXS" height={20} /><span className="strong muted small">· EDU</span></span>
            <p>Katalog program belajar publik dari ekosistem VIBOXS, unit AI Venture Studio di bawah PT Ekosistem Pelosok Hub.</p>
          </div>
          <nav aria-label="EDU">
            <span className="eyebrow">EDU</span>
            <Link to="/programs">Programs</Link>
            <Link to="/events">Events</Link>
            <Link to="/library">Digital Library</Link>
            <Link to="/corporate-training">For Teams</Link>
          </nav>
          <nav aria-label="Ekosistem">
            <span className="eyebrow">Ekosistem</span>
            <EcoLink k="corporate">VIBOXS</EcoLink>
            <EcoLink k="universe">Universe</EcoLink>
            <Link to="/" aria-current="page">EDU</Link>
            <EcoLink k="services">Services</EcoLink>
          </nav>
          <nav aria-label="Kebijakan">
            <span className="eyebrow">Kebijakan</span>
            <Link to="/policies/purchase">Kebijakan pembelian</Link>
            <Link to="/policies/refund">Refund &amp; reschedule</Link>
            <Link to="/policies/privacy">Kebijakan privasi</Link>
            <Link to="/policies/terms">Ketentuan layanan</Link>
            <span className="small muted">Konten menunggu review hukum</span>
          </nav>
          <div className="ftr__contact">
            <span className="eyebrow">Bantuan</span>
            <Link to="/help" className="small">Pusat bantuan &amp; FAQ</Link>
            <span className="slot">[Email bantuan resmi — menunggu verifikasi]</span>
          </div>
        </div>
        <div className="ftr__bottom">
          <span>© {new Date().getFullYear()} VIBOXS · PT Ekosistem Pelosok Hub</span>
          <span>edu.viboxs.com · Bahasa Indonesia · Semua jadwal dalam WIB</span>
        </div>
      </div>
      <div className="container ftr__mark" aria-hidden="true">
        <img data-parallax="40" src="/assets/viboxs-wordmark-white.png" alt="" />
      </div>
    </footer>
  );
}
