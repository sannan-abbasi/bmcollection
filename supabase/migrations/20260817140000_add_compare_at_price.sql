/*
# Per-product sale pricing

Replaces the single site-wide 20% discount with a per-product "was" price the
admin sets when adding or editing a product.

1. Changes to `products`
- `compare_at_price` (numeric(10,2), nullable)
  The original/struck-through price. `price` stays the real selling price.
  NULL (or anything at or below `price`) means the product is not on sale and
  no discount tag is shown for it.

2. Why store the price and not the percentage
  The discount tag is derived from the two prices, so the advertised percentage
  can never drift out of step with what the customer is actually charged. The
  admin form still lets you type a percentage — it just fills in the price.

3. Backfill
  Existing products are given the "was" price they are already being displayed
  with (price / 0.8, rounded up to the nearest 10 — the old hard-coded 20%), so
  nothing on the live storefront changes until you edit a product.

4. Security
  No policy changes. `products` already allows public read of active rows and
  admin-only writes.
*/

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS compare_at_price numeric(10,2);

-- Keep today's appearance for everything already in the catalogue.
UPDATE products
   SET compare_at_price = CEIL(price / 0.8 / 10) * 10
 WHERE compare_at_price IS NULL
   AND price > 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_compare_at_price_check'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_compare_at_price_check
      CHECK (compare_at_price IS NULL OR compare_at_price >= 0);
  END IF;
END $$;
