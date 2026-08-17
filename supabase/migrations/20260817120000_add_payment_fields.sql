/*
# Payment details on orders

Adds how the customer chose to pay, whether that payment has been confirmed,
and the transaction reference they entered for manual transfers.

1. Changes to `orders`
- `payment_method` (text, not null, default 'cod')
  One of: cod | bank | jazzcash | easypaisa
- `payment_status` (text, not null, default 'unpaid')
  One of: unpaid | awaiting_verification | paid
  Cash on delivery stays 'unpaid' until the courier collects. Manual transfers
  land as 'awaiting_verification' so the admin knows to check the account.
- `payment_reference` (text, nullable)
  The transaction ID / TID the customer entered after transferring.

2. Security
- No policy changes. These columns sit on `orders`, which already allows public
  insert and admin-only read/update, so customers can submit their own payment
  reference but only the admin can read it back or mark an order paid.

3. Notes
- Existing rows are backfilled to 'cod' / 'unpaid', which is what they were.
*/

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cod',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_reference text;

-- Keep the values honest even though the app already constrains them.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_method_check'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
      CHECK (payment_method IN ('cod', 'bank', 'jazzcash', 'easypaisa'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_status_check'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
      CHECK (payment_status IN ('unpaid', 'awaiting_verification', 'paid'));
  END IF;
END $$;

-- The admin dashboard filters on "who still owes me money".
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
