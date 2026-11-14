import { useEffect, useLayoutEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Cursor from '@viboxs/shared/cursor';
import { ScrollTrigger } from '@viboxs/shared/motion';
import Header from './components/Header';
import Footer from './components/Footer';
import AgentSwarm from '@viboxs/shared/swarm';
import Home from './pages/Home';
import Detail from './pages/Detail';
import Start from './pages/Start';
import Process from './pages/Process';
import { Advisory, Capabilities, Partners } from './pages/Offer';
import { Faq, Legal, NotFound, Work } from './pages/Misc';
import { TITLES, svcBySlug } from './lib/content';

function RouteEffects() {
  const { pathname, hash } = useLocation();
  useLayoutEffect(() => {
    if (!hash) { window.scrollTo(0, 0); return; }
    const id = hash.slice(1);
    const t = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: 'smooth' });
    }, 60);
    return () => window.clearTimeout(t);
  }, [pathname, hash]);
  useEffect(() => {
    const svc = pathname.startsWith('/services/') ? svcBySlug(pathname.split('/')[2]) : undefined;
    document.title = svc ? `${svc.name} — VIBOXS Services` : TITLES[pathname] || 'VIBOXS Services';
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
          <Route path="/services/:slug" element={<Detail />} />
          <Route path="/start" element={<Start />} />
          <Route path="/process" element={<Process />} />
          <Route path="/partners" element={<Partners />} />
          <Route path="/advisory" element={<Advisory />} />
          <Route path="/capabilities" element={<Capabilities />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/work" element={<Work />} />
          <Route path="/privacy" element={<Legal kind="privacy" />} />
          <Route path="/terms" element={<Legal kind="terms" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <Cursor />
      <AgentSwarm />
      <div className="grain" aria-hidden="true" />
    </>
  );
}
