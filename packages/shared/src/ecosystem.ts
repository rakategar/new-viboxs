/**
 * Satu sumber kebenaran untuk empat alamat VIBOXS (06_CODE_FOUNDATION_MONOREPO §3).
 * Semua tautan lintas host dibaca dari sini — tidak ada URL hardcode di app.
 *
 * Origin bisa dioverride lewat env Vite (mis. untuk preview Vercel):
 *   VITE_CORPORATE_ORIGIN, VITE_SERVICES_ORIGIN, VITE_EDU_ORIGIN, VITE_UNIVERSE_ORIGIN
 */
export type SiteKey = 'corporate' | 'universe' | 'edu' | 'services';
export type DestKey = Exclude<SiteKey, 'corporate'>;
export type LaunchStatus = 'live' | 'pending';

/**
 * Status peluncuran tiap subdomain. 'pending' → UI "Sedang disiapkan", bukan link mati.
 * Ubah ke 'live' begitu subdomain benar-benar bisa diakses — kedua app ikut berubah.
 */
export const LAUNCH: Record<DestKey, LaunchStatus> = {
  universe: 'pending',
  edu: 'pending',
  services: 'pending',
};

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};

export const ORIGIN: Record<SiteKey, string> = {
  corporate: env.VITE_CORPORATE_ORIGIN || 'https://viboxs.com',
  universe: env.VITE_UNIVERSE_ORIGIN || 'https://universe.viboxs.com',
  edu: env.VITE_EDU_ORIGIN || 'https://edu.viboxs.com',
  services: env.VITE_SERVICES_ORIGIN || 'https://services.viboxs.com',
};

export interface Site { key: SiteKey; name: string; role: string; domain: string }

export const SITES: Record<SiteKey, Site> = {
  corporate: { key: 'corporate', name: 'VIBOXS', role: 'Overview perusahaan', domain: 'viboxs.com' },
  universe: { key: 'universe', name: 'Universe', role: 'Komunitas OPC', domain: 'universe.viboxs.com' },
  edu: { key: 'edu', name: 'EDU', role: 'Pembelajaran', domain: 'edu.viboxs.com' },
  services: { key: 'services', name: 'Services', role: 'Solusi bisnis', domain: 'services.viboxs.com' },
};

export const SITE_ORDER: SiteKey[] = ['corporate', 'universe', 'edu', 'services'];

export const isPending = (k: SiteKey) => k !== 'corporate' && LAUNCH[k] !== 'live';

/**
 * URL absolut ke sebuah destinasi dari host LAIN.
 * Destinasi yang belum live diarahkan ke halaman status di Corporate (router ekosistem).
 */
export const siteUrl = (k: SiteKey, path = '') =>
  isPending(k) ? `${ORIGIN.corporate}/disiapkan/${k}` : `${ORIGIN[k]}${path}`;
