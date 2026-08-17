/**
 * Storefront pricing display.
 *
 * `price` is what the customer pays. `compare_at_price` is the optional
 * struck-through "was" price, set per product in the admin dashboard. The
 * discount tag is DERIVED from the two, so the advertised percentage can never
 * disagree with the actual saving. A product with no compare price simply shows
 * no tag and no struck price.
 */

/** Only a starting suggestion in the admin form — nothing on the site uses it. */
export const DEFAULT_DISCOUNT_PERCENT = 20;

export function formatPrice(price: number): string {
  return 'Rs ' + Number(price).toLocaleString('en-PK');
}

/**
 * The "was" price to strike through, or null when the product is not on sale.
 * A compare price at or below the selling price is treated as no discount.
 */
export function comparePriceOf(price: number, compareAt?: number | null): number | null {
  const was = Number(compareAt ?? 0);
  const now = Number(price ?? 0);
  return Number.isFinite(was) && was > now ? was : null;
}

/** Whole-number discount for the tag, or null when there is nothing to show. */
export function discountPercentOf(price: number, compareAt?: number | null): number | null {
  const was = comparePriceOf(price, compareAt);
  if (was === null) return null;
  const percent = Math.round((1 - Number(price) / was) * 100);
  return percent > 0 ? percent : null;
}

/** Rupees saved against the "was" price. */
export function savingsOf(price: number, compareAt: number | null | undefined, qty = 1): number {
  const was = comparePriceOf(price, compareAt);
  return was === null ? 0 : (was - Number(price)) * qty;
}

/* ------------------------------------------------------- admin form helpers */

/**
 * The "was" price implied by a discount percentage, rounded up to the nearest
 * 10 so it reads like a shelf price. Rounding up keeps the advertised
 * percentage honest — the customer always saves at least what the tag claims.
 */
export function priceFromDiscount(price: number, percent: number): number {
  if (!(price > 0) || !(percent > 0) || percent >= 100) return 0;
  return Math.ceil(price / (1 - percent / 100) / 10) * 10;
}
