import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/services.css';

// Kawanan agen aktif sejak frame pertama (agar elemen [data-build] tidak berkedip),
// kecuali pengguna memilih reduced motion atau mematikannya.
try {
  const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const off = localStorage.getItem('vbx-agents') === 'off';
  if (!rm && !off) document.documentElement.classList.add('agents-on');
} catch { /* storage diblokir → biarkan konten tampil biasa */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
