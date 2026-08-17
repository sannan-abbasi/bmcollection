/**
 * Product URL slugs.
 *
 * Search engines and shoppers both read the URL, so a product lives at
 * /product/royalty-in-purple-heart-pendant-piece rather than at its UUID.
 * The UUID route still resolves and redirects, so links shared before this
 * change keep working.
 */

/** Anything that still routes by UUID rather than slug. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function looksLikeId(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/**
 * Mirrors the SQL used to backfill existing rows, so slugs generated in the
 * browser and in the migration agree.
 */
export function slugify(input: string): string {
  const base = (input ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
    .replace(/^-+|-+$/g, '');
  return base || 'product';
}

/** The canonical path for a product, falling back to the id if it has no slug. */
export function productPath(product: { id: string; slug?: string | null }): string {
  return `/product/${product.slug?.trim() || product.id}`;
}
