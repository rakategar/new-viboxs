import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { siteUrl, type SiteKey } from '@viboxs/shared/ecosystem';

/** Tautan ke host lain di ekosistem. Belum live → halaman status di viboxs.com, bukan link mati. */
export default function EcoLink({ k, path, children, ...rest }: { k: SiteKey; path?: string; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={siteUrl(k, path)} {...rest}>{children}</a>;
}
