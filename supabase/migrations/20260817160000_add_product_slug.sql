/*
# Readable product URLs

Adds a URL slug to products so a product page can live at
/product/royalty-in-purple-heart-pendant-piece instead of
/product/4fc42044-97c3-478d-ad06-d1289e3b3b33.

1. Changes to `products`
- `slug` (text, nullable, unique)
  Lower-case, hyphenated form of the title. Nullable so an insert that predates
  this column still succeeds; the app always sets one.

2. Backfill
  Generated from each existing title. Titles that collide (there is currently
  one duplicate pair, "Scrunchies") get -2, -3 … appended by creation order, so
  the unique index below can be applied safely.

3. Security
  No policy changes — `products` already allows public read of active rows and
  admin-only writes.

4. Note on old links
  The app keeps resolving /product/<uuid> and redirects to the slug URL, so any
  link already shared on WhatsApp or indexed by Google continues to work.
*/

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS slug text;

WITH raw AS (
  SELECT
    id,
    created_at,
    trim(both '-' from regexp_replace(lower(coalesce(title, '')), '[^a-z0-9]+', '-', 'g')) AS s0
  FROM products
),
trimmed AS (
  SELECT
    id,
    created_at,
    coalesce(nullif(trim(both '-' from left(s0, 70)), ''), 'product') AS s
  FROM raw
),
numbered AS (
  SELECT
    id,
    s,
    row_number() OVER (PARTITION BY s ORDER BY created_at, id) AS rn
  FROM trimmed
)
UPDATE products p
   SET slug = CASE WHEN n.rn = 1 THEN n.s ELSE n.s || '-' || n.rn END
  FROM numbered n
 WHERE p.id = n.id
   AND (p.slug IS NULL OR p.slug = '');

-- Partial index: many rows may legitimately have no slug in future, but the
-- ones that do must be unique.
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_key
  ON products (slug)
  WHERE slug IS NOT NULL;
