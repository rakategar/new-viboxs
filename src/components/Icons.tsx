import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 16, sw = 2): SVGProps<SVGSVGElement> => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
});

export const ArrowRight = ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const ArrowDown = ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M12 5v14M6 13l6 6 6-6" /></svg>;
export const ArrowUp = ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M12 19V5M6 11l6-6 6 6" /></svg>;
export const Check = ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M20 6 9 17l-5-5" /></svg>;
export const Chevron = ({ size, ...p }: P) => <svg {...base(size, 1.75)} {...p}><path d="m6 9 6 6 6-6" /></svg>;
export const Grid = ({ size, ...p }: P) => (
  <svg {...base(size, 1.75)} {...p}><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></svg>
);
export const Menu = ({ size, ...p }: P) => <svg {...base(size, 1.75)} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
export const Close = ({ size, ...p }: P) => <svg {...base(size, 1.75)} {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>;
export const IconUniverse = ({ size, ...p }: P) => (
  <svg {...base(size, 1.75)} {...p}><circle cx="12" cy="12" r="3" /><ellipse cx="12" cy="12" rx="9.5" ry="4.5" transform="rotate(-24 12 12)" /></svg>
);
export const IconEdu = ({ size, ...p }: P) => (
  <svg {...base(size, 1.75)} {...p}><path d="M12 4 3 8.5l9 4.5 9-4.5z" /><path d="m3 13 9 4.5 9-4.5" /></svg>
);
export const IconServices = ({ size, ...p }: P) => (
  <svg {...base(size, 1.75)} {...p}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /><path d="M14 7.5h4.5V11M10 16.5H5.5V13" /></svg>
);
export const IconFlow = ({ size, ...p }: P) => (
  <svg {...base(size, 1.75)} {...p}><circle cx="5" cy="12" r="2.5" /><circle cx="19" cy="6" r="2.5" /><circle cx="19" cy="18" r="2.5" /><path d="M7.5 12h4l5-5M11.5 12l5 5" /></svg>
);
export const IconSearch = ({ size, ...p }: P) => <svg {...base(size, 1.75)} {...p}><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></svg>;
export const IconLayout = ({ size, ...p }: P) => <svg {...base(size, 1.75)} {...p}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 10h16M10 10v10" /></svg>;
export const IconBuild = ({ size, ...p }: P) => <svg {...base(size, 1.75)} {...p}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>;
export const IconSupport = ({ size, ...p }: P) => (
  <svg {...base(size, 1.75)} {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /><path d="m6.5 6.5 3 3M14.5 14.5l3 3M17.5 6.5l-3 3M9.5 14.5l-3 3" /></svg>
);
export const IconBriefcase = ({ size, ...p }: P) => <svg {...base(size, 1.75)} {...p}><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M8 6V4h8v2M3 12h18" /></svg>;
export const IconClock = ({ size, ...p }: P) => <svg {...base(size, 1.75)} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;

export const destIcon = { universe: IconUniverse, edu: IconEdu, services: IconServices };
