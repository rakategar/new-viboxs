import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { type DestKey, destHref, isPending } from '../lib/content';

type Props = { k: DestKey; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>;

/** Tautan ke destinasi ekosistem: subdomain live → tab yang sama; belum live → halaman "Sedang disiapkan". */
const DestLink = forwardRef<HTMLAnchorElement, Props>(function DestLink({ k, children, ...rest }, ref) {
  if (isPending(k)) return <Link ref={ref} to={destHref(k)} {...rest}>{children}</Link>;
  return <a ref={ref} href={destHref(k)} {...rest}>{children}</a>;
});

export default DestLink;
