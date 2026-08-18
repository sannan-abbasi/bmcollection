import { BRAND } from '@/lib/supabase';

/**
 * International orders are arranged by hand.
 *
 * The shop ships from Pakistan and takes cash on delivery there, neither of
 * which works abroad — so instead of letting an overseas shopper complete a
 * checkout that cannot be fulfilled, we hand them to WhatsApp with the order
 * already written out. The owner then confirms shipping and payment personally.
 */

export interface EnquiryLine {
  title: string;
  qty: number;
  /** Already formatted in the shopper's display currency. */
  price: string;
}

/** "GB" reads as a code; shoppers expect "United Kingdom". */
function countryName(code?: string | null): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function buildEnquiryUrl({
  lines,
  total,
  currency,
  country,
}: {
  lines: EnquiryLine[];
  total: string;
  currency: string;
  country?: string | null;
}): string {
  const items = lines.map((l) => `• ${l.title} x${l.qty} — ${l.price}`).join('\n');
  const where = countryName(country);

  const message = [
    `Hi ${BRAND.name}, I would like to order${where ? ` from ${where}` : ' from outside Pakistan'}:`,
    '',
    items,
    '',
    `Total: ${total} (${currency})`,
    '',
    'Please confirm delivery and payment for my country. Thank you.',
  ].join('\n');

  return `${BRAND.whatsappLink}?text=${encodeURIComponent(message)}`;
}
