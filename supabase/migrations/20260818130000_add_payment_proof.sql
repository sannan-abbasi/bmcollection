/*
# Payment screenshots instead of typed transaction IDs

Customers paying by JazzCash / Easypaisa / bank transfer now upload a
screenshot of the transfer rather than copying a transaction ID.

1. Changes to `orders`
- `payment_proof_path` (text, nullable)
  Path of the uploaded screenshot inside the `payment-proofs` storage bucket.
  `payment_reference` is kept for existing orders and any future use.

2. New storage bucket `payment-proofs`
- PRIVATE (public = false). A payment screenshot shows the customer's name,
  phone number and often their balance, so it must never be readable by URL.
  The admin views them through short-lived signed URLs generated in the
  dashboard; nobody else can read the bucket at all.
- 5 MB per file, images only.

3. Security
- Anyone (anon) may INSERT into the bucket — customers are not signed in when
  they check out. They cannot read, list, update or delete.
- Only the admin may SELECT.

  NOTE: the app's ADMIN_EMAIL is sannanabbasi025@gmail.com while the original
  schema migration wrote policies for binteakram224@gmail.com. Both are allowed
  below so this cannot lock you out. Worth settling on one and making the other
  policies match.
*/

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_proof_path text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "payment_proofs_public_insert" ON storage.objects;
CREATE POLICY "payment_proofs_public_insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "payment_proofs_admin_read" ON storage.objects;
CREATE POLICY "payment_proofs_admin_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND auth.jwt() ->> 'email' IN ('sannanabbasi025@gmail.com', 'binteakram224@gmail.com')
  );

DROP POLICY IF EXISTS "payment_proofs_admin_delete" ON storage.objects;
CREATE POLICY "payment_proofs_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND auth.jwt() ->> 'email' IN ('sannanabbasi025@gmail.com', 'binteakram224@gmail.com')
  );
