import { useEffect } from 'react';
import { BRAND } from '@/lib/supabase';

/*
 * ═══════════════════════════════════════════════════════════════════════════
 *  SET YOUR LIVE DOMAIN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Set VITE_SITE_URL to the address the site is actually served from, e.g.
 *
 *   .env                 VITE_SITE_URL=https://bmcollection.pk
 *   netlify.toml         VITE_SITE_URL = "https://bmcollection.pk"
 *
 * Until it is set, canonical tags and absolute share URLs are left out
 * entirely. A canonical pointing at the wrong domain is far worse for search
 * than no canonical at all, so nothing is guessed here.
 */
const RAW_SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined) ?? '';

/** The site's origin with no trailing slash, or '' when not configured. */
export const SITE_URL = RAW_SITE_URL.trim().replace(/\/+$/, '');

export const SITE_CONFIGURED = /^https?:\/\/.+\..+/.test(SITE_URL);

if (import.meta.env.DEV && !SITE_CONFIGURED) {
  console.info(
    '[seo] VITE_SITE_URL is not set — canonical and absolute share URLs are being skipped. ' +
      'Add it to .env and netlify.toml to switch them on.'
  );
}

export function absoluteUrl(path: string): string | null {
  if (!SITE_CONFIGURED) return null;
  return SITE_URL + (path.startsWith('/') ? path : `/${path}`);
}

/** Used for share previews on pages with no image of their own. */
export const DEFAULT_SHARE_IMAGE = "/logo.png";

const TITLE_SUFFIX = ` | ${BRAND.name}`;
const MAX_DESCRIPTION = 160;

/** Search results truncate at roughly 160 characters — trim on a word. */
export function clampDescription(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= MAX_DESCRIPTION) return clean;
  const cut = clean.slice(0, MAX_DESCRIPTION);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\-—]$/, '') + '…';
}

export interface SeoOptions {
  /** Page title without the brand suffix; pass the full string for the home page. */
  title: string;
  description: string;
  /** Route path, e.g. '/product/123'. Used for the canonical URL. */
  path: string;
  image?: string | null;
  /** Admin screens and anything private. */
  noindex?: boolean;
  /** Structured data object, already shaped as schema.org JSON-LD. */
  jsonLd?: Record<string, unknown> | null;
  /** Open Graph type — 'product' for a single item. */
  type?: 'website' | 'article' | 'product';
  /** Skip the brand suffix (the home page sets its own full title). */
  exactTitle?: boolean;
}

/* Every tag this hook writes is marked so it can be replaced or removed
 * cleanly on the next navigation — this is a single-page app, so stale tags
 * from the previous route would otherwise linger. */
const OWNED = 'data-seo';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    el.setAttribute(OWNED, '');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeMeta(attr: 'name' | 'property', key: string) {
  document.head.querySelector(`meta[${attr}="${key}"][${OWNED}]`)?.remove();
}

function upsertCanonical(href: string | null) {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!href) {
    existing?.remove();
    return;
  }
  const el = existing ?? document.createElement('link');
  el.setAttribute('rel', 'canonical');
  el.setAttribute(OWNED, '');
  el.setAttribute('href', href);
  if (!existing) document.head.appendChild(el);
}

function upsertJsonLd(data: Record<string, unknown> | null | undefined) {
  document.head.querySelector(`script[type="application/ld+json"][${OWNED}]`)?.remove();
  if (!data) return;
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute(OWNED, '');
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

/**
 * Sets the document title, meta description, canonical URL, social tags and
 * structured data for the current route.
 *
 * Note: Google executes JavaScript so it reads these, but WhatsApp, Facebook
 * and Instagram crawlers do not. Their link previews need the tags present in
 * the served HTML, which requires prerendering — deliberately out of scope here.
 */
export function useSeo(options: SeoOptions) {
  const {
    title,
    description,
    path,
    image,
    noindex = false,
    jsonLd = null,
    type = 'website',
    exactTitle = false,
  } = options;

  useEffect(() => {
    const fullTitle = exactTitle ? title : `${title}${TITLE_SUFFIX}`;
    const desc = clampDescription(description);
    const canonical = absoluteUrl(path);

    document.title = fullTitle;
    upsertMeta('name', 'description', desc);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    upsertCanonical(noindex ? null : canonical);

    upsertMeta('property', 'og:site_name', BRAND.name);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:type', type === 'product' ? 'product' : 'website');
    upsertMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', desc);

    if (canonical) upsertMeta('property', 'og:url', canonical);
    else removeMeta('property', 'og:url');

    const shareImage = image || absoluteUrl(DEFAULT_SHARE_IMAGE);
    if (shareImage) {
      upsertMeta('property', 'og:image', shareImage);
      upsertMeta('name', 'twitter:image', shareImage);
    } else {
      removeMeta('property', 'og:image');
      removeMeta('name', 'twitter:image');
    }

    upsertJsonLd(noindex ? null : jsonLd);
  }, [title, description, path, image, noindex, jsonLd, type, exactTitle]);
}
