import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { loadContent } from './lib/remote';
import './styles/edu.css';

// Kawanan agen aktif sejak frame pertama (agar elemen yang akan "dibangun" tidak berkedip),
// kecuali pengguna memilih reduced motion.
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('agents-on');

// Konten CMS dimuat dulu (dengan batas waktu & fallback), lalu render.
const boot = window.location.pathname.startsWith('/admin') ? Promise.resolve() : loadContent();
boot.finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
});
