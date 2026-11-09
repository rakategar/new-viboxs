import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const b = (size = 20, sw = 1.75): SVGProps<SVGSVGElement> => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
});

export const IcWeb = ({ size, ...p }: P) => <svg {...b(size)} {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M7 6.5h.01M10 6.5h.01" /></svg>;
export const IcFlow = ({ size, ...p }: P) => <svg {...b(size)} {...p}><rect x="3" y="3" width="6" height="6" rx="1.5" /><rect x="15" y="15" width="6" height="6" rx="1.5" /><path d="M9 6h4a3 3 0 0 1 3 3v6" /><path d="m13.5 12.5 2.5 2.5 2.5-2.5" /></svg>;
export const IcChart = ({ size, ...p }: P) => <svg {...b(size)} {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>;
export const IcSpark = ({ size, ...p }: P) => <svg {...b(size)} {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>;
export const IcMega = ({ size, ...p }: P) => <svg {...b(size)} {...p}><path d="M3 11v2a1 1 0 0 0 1 1h3l7 4V6L7 10H4a1 1 0 0 0-1 1Z" /><path d="M18 9a4 4 0 0 1 0 6" /></svg>;
export const IcCompass = ({ size, ...p }: P) => <svg {...b(size)} {...p}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></svg>;
export const IcUser = ({ size, ...p }: P) => <svg {...b(size)} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
export const IcStore = ({ size, ...p }: P) => <svg {...b(size)} {...p}><path d="M4 10v10h16V10M3 6l2-3h14l2 3v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z" /><path d="M10 20v-5h4v5" /></svg>;
export const IcBuilding = ({ size, ...p }: P) => <svg {...b(size)} {...p}><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M10 21v-3h4v3" /></svg>;
export const IcShield = ({ size, ...p }: P) => <svg {...b(size)} {...p}><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z" /><path d="m9 12 2 2 4-4" /></svg>;
export const IcLock = ({ size, ...p }: P) => <svg {...b(size)} {...p}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;
export const IcDoc = ({ size, ...p }: P) => <svg {...b(size)} {...p}><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>;
export const IcGrad = ({ size, ...p }: P) => <svg {...b(size)} {...p}><path d="M12 4 2 9l10 5 10-5z" /><path d="M6 11v5c3 2 9 2 12 0v-5" /></svg>;
export const IcServer = ({ size, ...p }: P) => <svg {...b(size)} {...p}><rect x="3" y="4" width="18" height="7" rx="1.5" /><rect x="3" y="13" width="18" height="7" rx="1.5" /><path d="M7 7.5h.01M7 16.5h.01" /></svg>;
export const IcHelp = ({ size, ...p }: P) => <svg {...b(size)} {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01" /></svg>;
export const IcCopy = ({ size, ...p }: P) => <svg {...b(size)} {...p}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>;
export const IcAlert = ({ size, ...p }: P) => <svg {...b(size)} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>;
export const IcWifiOff = ({ size, ...p }: P) => <svg {...b(size)} {...p}><path d="m3 3 18 18M8.5 16.5a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 4-2.3M19 12.5a10 10 0 0 0-2.5-1.7M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8A15 15 0 0 0 11 5M12 20h.01" /></svg>;
export const IcSend = ({ size, ...p }: P) => <svg {...b(size)} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

import type { CatKey } from '../lib/content';
export const catIcon: Record<CatKey, (p: P) => JSX.Element> = {
  websites: IcWeb, automation: IcFlow, dashboards: IcChart, ai: IcSpark, growth: IcMega,
  advisory: IcCompass, training: IcGrad, infra: IcServer, unsure: IcHelp,
};
