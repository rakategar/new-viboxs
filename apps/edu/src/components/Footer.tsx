import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useMotion } from '@viboxs/shared/motion';
import EcoLink from './EcoLink';
import { CONTACT } from '@viboxs/shared/ecosystem';

export default function Footer() {
  const ref = useRef<HTMLElement>(null);
  useMotion(ref);
  return (
    <footer ref={ref} className="ftr">
      <div className="container ftr__in">
        <div className="ftr__grid" data-anim="stagger">
          <div className="ftr__brand">
            <span className="row-10"><img src="/assets/viboxs-wordmark-white.png" alt="VIBOXS" height={20} /><span className="strong muted small">· EDU</span></span>
            <p>Pembelajaran AI yang terarah dari ekosistem VIBOXS, unit usaha PT Ekosistem Pelosok Hub. Semua kesempatan bersifat selektif dan tidak dijamin.</p>
          </div>
          <nav aria-label="EDU">
            <span className="eyebrow">EDU</span>
            <Link to="/for-companies">Untuk Perusahaan</Link>
            <Link to="/kolaborator">Jadi Kontributor</Link>
            <Link to="/for-teams">Program Tim</Link>
            <Link to="/help">Bantuan</Link>
          </nav>
          <nav aria-label="Ekosistem">
            <span className="eyebrow">Ekosistem</span>
            <EcoLink k="corporate">VIBOXS</EcoLink>
            <Link to="/" aria-current="page">EDU</Link>
            <EcoLink k="services">Services</EcoLink>
          </nav>
          <nav aria-label="Kebijakan">
            <span className="eyebrow">Kebijakan</span>
            <Link to="/policies/privacy">Kebijakan Privasi</Link>
            <Link to="/policies/terms">Syarat dan Ketentuan</Link>
            <Link to="/policies/refund">Refund</Link>
            <Link to="/policies/identity">Identitas PT EPH</Link>
            <span className="small muted">Draf — menunggu review hukum</span>
          </nav>
          <div className="ftr__contact">
            <span className="eyebrow">Bantuan</span>
            <Link to="/help" className="small">Pusat bantuan &amp; FAQ</Link>
            <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            <a href={CONTACT.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram @{CONTACT.instagram}</a>
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
