import { useEffect } from 'react';
import { ORIGIN } from '@viboxs/shared/ecosystem';
import { hrefOf, type Program, isDigital } from './data';

/**
 * JSON-LD per program (PRD §17 SEO, QA EDU-015): hanya untuk program yang benar-benar terbit dari CMS.
 * Tidak ada rating/review/offer palsu — `offers` hanya bila program gratis atau harganya sudah final.
 */
export function programLd(p: Program): Record<string, unknown> {
  const url = `${ORIGIN.edu}${hrefOf(p)}`;
  const provider = { '@type': 'Organization', name: 'VIBOXS', url: 'https://www.viboxs.com' };
  const offers = p.free
    ? { '@type': 'Offer', price: 0, priceCurrency: 'IDR', url }
    : typeof p.price === 'number' && p.price > 0 ? { '@type': 'Offer', price: p.price, priceCurrency: 'IDR', url } : undefined;
  if (p.type === 'kit') {
    return { '@context': 'https://schema.org', '@type': 'CreativeWork', name: p.title, description: p.summary, url, inLanguage: 'id', publisher: provider, ...(p.cover && { image: p.cover }), ...(offers && { offers }) };
  }
  if (isDigital(p.type)) {
    return { '@context': 'https://schema.org', '@type': 'Book', name: p.title, description: p.summary, url, inLanguage: 'id', bookFormat: 'https://schema.org/EBook', publisher: provider, ...(offers && { offers }) };
  }
  const base = { '@context': 'https://schema.org', name: p.title, description: p.summary, url, inLanguage: 'id' };
  if (p.startsAt) {
    return {
      ...base, '@type': 'Event', startDate: p.startsAt, organizer: provider,
      eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      eventStatus: p.status === 'CANCELLED' ? 'https://schema.org/EventCancelled' : p.status === 'RESCHEDULED' ? 'https://schema.org/EventRescheduled' : 'https://schema.org/EventScheduled',
      location: { '@type': 'VirtualLocation', url },
      ...(offers && { offers }),
    };
  }
  return { ...base, '@type': 'Course', provider, ...(offers && { offers }) };
}

/** Pasang satu blok JSON-LD selama halaman terbuka; dilepas saat pindah halaman. */
export function useJsonLd(data: Record<string, unknown> | null) {
  const json = data ? JSON.stringify(data) : '';
  useEffect(() => {
    if (!json) return;
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.dataset.page = '1';
    el.textContent = json;
    document.head.appendChild(el);
    return () => el.remove();
  }, [json]);
}
