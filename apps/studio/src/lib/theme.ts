import { useEffect, useState } from 'react';

/** Tema terang/gelap. Pilihan disimpan per browser; tanpa pilihan ikut sistem. */
export type Theme = 'light' | 'dark';
const KEY = 'st-theme';
const mq = () => window.matchMedia('(prefers-color-scheme: dark)');

function stored(): Theme | null {
  try { const v = localStorage.getItem(KEY); return v === 'dark' || v === 'light' ? v : null; } catch { return null; }
}
function apply(t: Theme) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t === 'dark' ? '#0E0E0E' : '#FAFAFA');
  window.dispatchEvent(new CustomEvent('st-theme', { detail: t }));
}
export const currentTheme = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

export function useTheme(): [Theme, () => void] {
  const [t, setT] = useState<Theme>(currentTheme);
  useEffect(() => {
    const onTheme = (e: Event) => setT((e as CustomEvent<Theme>).detail);
    const onSys = (e: MediaQueryListEvent) => { if (!stored()) apply(e.matches ? 'dark' : 'light'); };
    const m = mq();
    window.addEventListener('st-theme', onTheme);
    m.addEventListener('change', onSys);
    return () => { window.removeEventListener('st-theme', onTheme); m.removeEventListener('change', onSys); };
  }, []);
  const toggle = () => {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, next); } catch { /* mode privat: tetap berlaku untuk sesi ini */ }
    // transisi warna singkat hanya saat pengguna menekan tombol, bukan saat halaman dimuat
    const root = document.documentElement;
    root.classList.add('theme-swap');
    apply(next);
    window.setTimeout(() => root.classList.remove('theme-swap'), 400);
  };
  return [t, toggle];
}
