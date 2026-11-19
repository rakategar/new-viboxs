// Membuat public/sitemap.xml untuk satu app. Dipanggil otomatis di script "build" tiap app.
// Pemakaian: node scripts/sitemaps.mjs <corporate|services|edu>
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = process.argv[2];
const read = (p) => readFileSync(join(root, p), 'utf8');
const today = new Date().toISOString().slice(0, 10);

const SITES = {
  corporate: {
    origin: 'https://www.viboxs.com',
    routes: () => [['/', 1.0], ['/ecosystem', 0.9], ['/about', 0.7], ['/contact', 0.7], ['/privacy', 0.3], ['/terms', 0.3]],
  },
  services: {
    origin: 'https://service.viboxs.com',
    routes: () => {
      const slugs = [...read('apps/services/src/lib/content.ts').matchAll(/key: '[a-z]+', n: '\d+', name: '[^']+', slug: '([a-z-]+)'/g)].map((m) => m[1]);
      return [['/', 1.0], ['/start', 0.9], ...slugs.map((s) => [`/services/${s}`, 0.8]), ['/capabilities', 0.7], ['/advisory', 0.7], ['/process', 0.7], ['/partners', 0.6], ['/faq', 0.6], ['/privacy', 0.3], ['/terms', 0.3]];
    },
  },
  edu: {
    origin: 'https://edu.viboxs.com',
    routes: async () => {
      // Program dari CMS (Supabase) bila terjangkau; jika tidak, dari data bawaan di data.ts.
      let items = [...read('apps/edu/src/lib/data.ts').matchAll(/slug: '([a-z0-9-]+)', type: '(webinar|workshop|ebook)'/g)];
      try {
        const be = read('packages/shared/src/backend.ts');
        const url = be.match(/SUPABASE_URL = '([^']+)'/)[1], key = be.match(/SUPABASE_KEY = '([^']+)'/)[1];
        const r = await fetch(`${url}/rest/v1/edu_programs?select=slug,data->>type&published=is.true`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(5000) });
        const rows = r.ok ? await r.json() : [];
        if (rows.length) items = rows.map((x) => [null, x.slug, x.type]);
      } catch { /* offline saat build → pakai data bawaan */ }
      return [['/', 1.0], ['/programs', 0.9], ['/events', 0.9], ['/library', 0.8], ['/kolaborator', 0.7], ['/corporate-training', 0.7], ['/help', 0.5],
        ...items.map(([, s, t]) => [t === 'ebook' ? `/library/${s}` : `/programs/${s}`, 0.7]),
        ...['purchase', 'refund', 'privacy', 'terms'].map((k) => [`/policies/${k}`, 0.3])];
    },
  },
};

const site = SITES[app];
if (!site) { console.error(`App tidak dikenal: ${app}`); process.exit(1); }
const urls = (await site.routes()).map(([p, pr]) => `  <url><loc>${site.origin}${p}</loc><lastmod>${today}</lastmod><priority>${pr.toFixed(1)}</priority></url>`);
writeFileSync(join(root, `apps/${app}/public/sitemap.xml`), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
console.log(`sitemap ${app}: ${urls.length} URL`);
