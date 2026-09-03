/**
 * Delivery charges.
 *
 * Islamabad / Rawalpindi (the twin cities): Rs 260
 * Every other city in Pakistan:             Rs 350
 *
 * The charge is collected IN ADVANCE — the customer transfers it and attaches a
 * screenshot, and the parcel is dispatched once that has been verified.
 *
 * Two cases pay nothing:
 * - Orders at or above FREE_DELIVERY_THRESHOLD, which is the free-delivery
 *   promise advertised on the announcement bar, the home page and the bag.
 * - Overseas orders, where shipping is quoted per country on WhatsApp instead.
 */

export const TWIN_CITY_DELIVERY_FEE = 260;
export const OTHER_CITY_DELIVERY_FEE = 350;

/**
 * Spellings, abbreviations and localities that all bill at the twin-city rate.
 * Matched as substrings of the normalised city, so "DHA Phase 2, Islamabad"
 * and "Saddar, Rwp" are both recognised.
 */
const TWIN_CITY_PATTERNS = [
  'islamabad',
  'islamabd',
  'islmabad',
  'islambad',
  'isb',
  'ict',
  'federal capital',
  'rawalpindi',
  'rawalpinid',
  'rawlpindi',
  'pindi',
  'rwp',
];

/**
 * Lowercase, drop punctuation and collapse whitespace, so "Rawalpindi.",
 * "RAWALPINDI" and "rawal pindi" all reduce to the same thing.
 */
function normalizeCity(city: string): string {
  return city
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** True when the address is in Islamabad or Rawalpindi. */
export function isTwinCity(city: string): boolean {
  const normalized = normalizeCity(city ?? '');
  if (!normalized) return false;

  // "rawal pindi" typed as two words collapses to one token here.
  const collapsed = normalized.replace(/\s+/g, '');

  return TWIN_CITY_PATTERNS.some((pattern) => {
    // Short codes must be whole words, or "isb" would match "Wisbech" and
    // "ict" would match "Districts".
    if (pattern.length <= 3) return normalized.split(' ').includes(pattern);
    return normalized.includes(pattern) || collapsed.includes(pattern);
  });
}

/** The rate for a city, ignoring free delivery. */
export function baseDeliveryFee(city: string): number {
  return isTwinCity(city) ? TWIN_CITY_DELIVERY_FEE : OTHER_CITY_DELIVERY_FEE;
}

/** Short label for the rate applied, for the checkout summary. */
export function deliveryZoneLabel(city: string): string {
  return isTwinCity(city) ? 'Islamabad / Rawalpindi' : 'Other cities';
}

/**
 * What this particular order owes for delivery, in rupees.
 *
 * `freeDelivery` and `isInternational` come from the cart and currency
 * contexts, so the one free-delivery threshold stays the single source of
 * truth rather than being duplicated here.
 */
export function deliveryFeeFor({
  city,
  freeDelivery,
  isInternational,
}: {
  city: string;
  freeDelivery: boolean;
  isInternational: boolean;
}): number {
  if (isInternational || freeDelivery) return 0;
  return baseDeliveryFee(city);
}
