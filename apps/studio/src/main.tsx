import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './lib/auth';
import '@viboxs/shared/base.css';
import '@viboxs/shared/swarm.css';
import './styles/studio.css';
import './styles/landing.css';

// Kawanan agen hanya "membangun" landing publik; ruang kerja tetap tenang (PRD §14.1).
if (window.location.pathname === '/' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('agents-on');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
