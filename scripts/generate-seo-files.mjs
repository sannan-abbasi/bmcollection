/**
 * Writes public/robots.txt and public/sitemap.xml at build time.
 *
 * The sitemap lists the real category and product URLs pulled from Supabase, so
 * Google does not have to discover them by executing JavaScript. Runs from the
 * `prebuild` script, which means `npm run build` (and therefore Netlify) always
 * regenerates it against the current catalogue.
 *
 * This never fails the build. If the domain is not configured or Supabase is
 * unreachable, it writes a safe robots.txt, says why, and moves on.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const PUBLIC_DIR = join(process.cwd(), 'public');

/** Netlify supplies these as real env vars; locally we read .env ourselves. */
function readEnv() {
  const env = { ...process.env };
  const envFile = join(process.cwd(), '.env');
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (match && !env[match[1]]) env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

const env = readEnv();
const siteUrl = (env.VITE_SITE_URL || '').trim().replace(/\/+$/, '');
const supabaseUrl = (env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const supabaseKey = (env.VITE_SUPABASE_ANON_KEY || '').trim();

mkdirSync(PUBLIC_DIR, { recursive: true });

/* --------------------------------------------------------------- robots.txt */

const robots = [
  'User-agent: *',
  'Allow: /',
  '',
  '# Store administration — never useful in search results.',
  'Disallow: /admin',
  'Disallow: /admin/',
  '',
  siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml` : '# Sitemap: set VITE_SITE_URL to emit this line',
  '',
].join('\n');

writeFileSync(join(PUBLIC_DIR, 'robots.txt'), robots);
console.log('[seo] wrote public/robots.txt');

/* ---------------------------------------------------------------- sitemap.xml */

const sitemapPath = join(PUBLIC_DIR, 'sitemap.xml');

if (!siteUrl) {
  // Remove any sitemap left over from a build that did have a domain — shipping
  // one full of the wrong URLs is worse than shipping none.
  if (existsSync(sitemapPath)) {
    rmSync(sitemapPath);
    console.warn('[seo] removed stale public/sitemap.xml (no VITE_SITE_URL set)');
  }
  console.warn(
    '[seo] VITE_SITE_URL is not set — skipping sitemap.xml. ' +
      'A sitemap of placeholder URLs is worse than none, so nothing was written.'
  );
  process.exit(0);
}

const urls = [
  { loc: '/', changefreq: 'daily', priority: '1.0' },
  { loc: '/new-arrivals', changefreq: 'daily', priority: '0.9' },
];

async function fetchRows(table, query) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
  });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

try {
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase credentials not available');

  const [categories, products] = await Promise.all([
    fetchRows('categories', 'select=slug'),
    // `slug` may not exist yet if the migration has not been run — fall back.
    fetchRows('products', 'select=id,slug,title,image_url,created_at&is_active=eq.true').catch(() =>
      fetchRows('products', 'select=id,title,image_url,created_at&is_active=eq.true')
    ),
  ]);

  for (const c of categories) {
    if (c.slug) urls.push({ loc: `/shop/${c.slug}`, changefreq: 'weekly', priority: '0.8' });
  }
  let slugged = 0;
  for (const p of products) {
    if (p.slug) slugged++;
    urls.push({
      loc: `/product/${p.slug || p.id}`,
      changefreq: 'weekly',
      priority: '0.7',
      lastmod: p.created_at ? String(p.created_at).slice(0, 10) : undefined,
      // Image entries get product photos into Google Images, which matters a
      // lot for clothing and jewellery searches.
      image: p.image_url ? { url: p.image_url, title: p.title } : undefined,
    });
  }
  console.log(
    `[seo] sitemap: ${categories.length} categories, ${products.length} products ` +
      `(${slugged} with readable slugs, ${products.length - slugged} still on UUIDs)`
  );
} catch (err) {
  console.warn(`[seo] could not reach Supabase (${err.message}) — sitemap covers static pages only.`);
}

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
  '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
  ...urls.map((u) =>
    [
      '  <url>',
      `    <loc>${escape(siteUrl + u.loc)}</loc>`,
      u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>` : null,
      `    <changefreq>${u.changefreq}</changefreq>`,
      `    <priority>${u.priority}</priority>`,
      u.image ? '    <image:image>' : null,
      u.image ? `      <image:loc>${escape(u.image.url)}</image:loc>` : null,
      u.image?.title ? `      <image:title>${escape(u.image.title)}</image:title>` : null,
      u.image ? '    </image:image>' : null,
      '  </url>',
    ]
      .filter(Boolean)
      .join('\n')
  ),
  '</urlset>',
  '',
].join('\n');

writeFileSync(sitemapPath, xml);
console.log(`[seo] wrote public/sitemap.xml (${urls.length} URLs)`);
