import { useCallback, useEffect, useRef, useState } from 'react';

type LoadState<T> = { data: T | null; error: string; loading: boolean; reload: () => Promise<void>; setData: (v: T | null) => void };

/**
 * Muat data async dengan state LOADING / ERROR_RETRY / data (PRD §14.4).
 * `deps` memicu muat ulang; reload() untuk tombol "Coba lagi" dan setelah aksi.
 */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []): LoadState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const n = ++seq.current;
    setLoading(true);
    try {
      const v = await fnRef.current();
      if (n === seq.current) { setData(v); setError(''); }
    } catch (e) {
      if (n === seq.current) setError((e as Error).message || 'Gagal memuat data.');
    } finally {
      if (n === seq.current) setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, deps);
  return { data, error, loading, reload, setData };
}

/** Jalankan aksi dengan state "Memproses…" dan pesan error/sukses. */
export function useAction() {
  const [busy, setBusy] = useState<string | null>(null);
  const run = useCallback(async <T,>(key: string, fn: () => Promise<T>, onOk?: (v: T) => void, onErr?: (m: string) => void) => {
    setBusy(key);
    try { const v = await fn(); onOk?.(v); return v; } catch (e) { onErr?.((e as Error).message); return undefined; } finally { setBusy(null); }
  }, []);
  return { busy, run };
}

/** Angka yang "berhitung naik" saat pertama tampil (mati saat reduced motion). */
export function useCountUp(target: number, ms = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || target === 0) { setV(target); return; }
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}
