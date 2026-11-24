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
      // Hanya program yang benar-benar terbit di CMS (Supabase). Tidak ada fallback ke data contoh (PRD v3.0 §17 SEO).
      let items = [];
      try {
        const be = read('packages/shared/src/backend.ts');
        const url = be.match(/SUPABASE_URL = '([^']+)'/)[1], key = be.match(/SUPABASE_KEY = '([^']+)'/)[1];
        const r = await fetch(`${url}/rest/v1/edu_programs?select=slug,data->>type&published=is.true`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(5000) });
        items = r.ok ? await r.json() : [];
      } catch { console.warn('sitemap edu: CMS tidak terjangkau — hanya halaman statis.'); }
      return [['/', 1.0], ['/programs', 0.9], ['/events', 0.9], ['/digital-library', 0.8], ['/edu-learner', 0.8], ['/for-companies', 0.7], ['/kolaborator', 0.7], ['/for-teams', 0.6], ['/help', 0.5],
        ...items.map((x) => [x.type === 'ebook' ? `/digital-library/${x.slug}` : `/programs/${x.slug}`, 0.7]),
        ...['privacy', 'terms', 'refund', 'identity'].map((k) => [`/policies/${k}`, 0.3])];
    },
  },
};

const site = SITES[app];
if (!site) { console.error(`App tidak dikenal: ${app}`); process.exit(1); }
const urls = (await site.routes()).map(([p, pr]) => `  <url><loc>${site.origin}${p}</loc><lastmod>${today}</lastmod><priority>${pr.toFixed(1)}</priority></url>`);
writeFileSync(join(root, `apps/${app}/public/sitemap.xml`), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
console.log(`sitemap ${app}: ${urls.length} URL`);
