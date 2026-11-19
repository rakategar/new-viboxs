import { useEffect, useLayoutEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Cursor from './components/Cursor';
import Home from './pages/Home';
import Ecosystem from './pages/Ecosystem';
import About from './pages/About';
import Contact from './pages/Contact';
import { Legal, NotFound, Pending, Work } from './pages/Misc';
import { DESCS, TITLES } from './lib/content';
import { applySeo } from '@viboxs/shared/seo';
import { ORIGIN } from '@viboxs/shared/ecosystem';
import { ScrollTrigger } from './lib/motion';

function RouteEffects() {
  const { pathname, hash } = useLocation();
  useLayoutEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  useEffect(() => {
    const known = pathname in TITLES;
    applySeo({
      origin: ORIGIN.corporate, path: pathname,
      title: TITLES[pathname] || (pathname.startsWith('/disiapkan') ? 'Sedang disiapkan — VIBOXS' : 'Halaman tidak ditemukan — VIBOXS'),
      description: DESCS[pathname] || DESCS['/'],
      noindex: !known || pathname === '/work',
    });
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 120);
    return () => window.clearTimeout(t);
  }, [pathname]);
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  return (
    <>
      <RouteEffects />
      <Header />
      <main id="main" key={pathname} className="page-enter">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ecosystem" element={<Ecosystem />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/work" element={<Work />} />
          <Route path="/privacy" element={<Legal kind="privacy" />} />
          <Route path="/terms" element={<Legal kind="terms" />} />
          <Route path="/disiapkan/:key" element={<Pending />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <Cursor />
      <div className="grain" aria-hidden="true" />
    </>
  );
}
