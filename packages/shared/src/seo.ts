/**
 * SEO per-route untuk SPA: title, description, canonical, Open Graph & Twitter.
 * Dipanggil di RouteEffects tiap app setiap kali pathname berubah.
 */
type Seo = { origin: string; path: string; title: string; description?: string; image?: string; noindex?: boolean };

function meta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.content = content;
}

export function applySeo({ origin, path, title, description, image, noindex }: Seo) {
  const url = origin + (path === '/' ? '/' : path.replace(/\/+$/, ''));
  document.title = title;
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
  link.href = url;
  meta('property', 'og:url', url);
  meta('property', 'og:title', title);
  meta('name', 'twitter:title', title);
  if (description) {
    meta('name', 'description', description);
    meta('property', 'og:description', description);
    meta('name', 'twitter:description', description);
  }
  if (image) { const abs = image.startsWith('http') ? image : origin + image; meta('property', 'og:image', abs); meta('name', 'twitter:image', abs); }
  meta('name', 'robots', noindex ? 'noindex, follow' : 'index, follow');
}
