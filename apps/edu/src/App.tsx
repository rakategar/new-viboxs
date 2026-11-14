import { useEffect, useLayoutEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Cursor from '@viboxs/shared/cursor';
import AgentSwarm from '@viboxs/shared/swarm';
import { ScrollTrigger } from '@viboxs/shared/motion';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Programs from './pages/Programs';
import Detail from './pages/Detail';
import Events from './pages/Events';
import Library, { LibraryIndex } from './pages/Library';
import Checkout from './pages/Checkout';
import { Help, NotFound, Policy, Teams } from './pages/Misc';
import { TITLES, bySlug } from './lib/data';

function RouteEffects() {
  const { pathname, hash } = useLocation();
  useLayoutEffect(() => {
    if (!hash) { window.scrollTo(0, 0); return; }
    const t = window.setTimeout(() => {
      const el = document.getElementById(hash.slice(1));
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 88, behavior: 'smooth' });
    }, 60);
    return () => window.clearTimeout(t);
  }, [pathname, hash]);
  useEffect(() => {
    const p = bySlug(pathname.split('/')[2]);
    document.title = p && /^\/(programs|events|library)\//.test(pathname) ? `${p.title} — VIBOXS EDU` : TITLES[pathname] || 'VIBOXS EDU';
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
          <Route path="/programs" element={<Programs />} />
          <Route path="/programs/:slug" element={<Detail />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:slug" element={<Detail from="events" />} />
          <Route path="/library" element={<LibraryIndex />} />
          <Route path="/library/:slug" element={<Library />} />
          <Route path="/checkout/:slug" element={<Checkout />} />
          <Route path="/corporate-training" element={<Teams />} />
          <Route path="/help" element={<Help />} />
          <Route path="/policies/:kind" element={<Policy />} />
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
