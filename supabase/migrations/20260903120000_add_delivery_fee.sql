/*
# Advance delivery charge on orders

Delivery is charged up front — Rs 260 to Islamabad / Rawalpindi and Rs 350 to
any other city — and the customer attaches a screenshot of the transfer before
the parcel is dispatched. Orders at or above the free-delivery threshold, and
overseas orders (quoted per country on WhatsApp), are charged nothing.

1. Changes to `orders`
- `delivery_fee` (numeric, not null, default 0)
  What was charged for delivery on this order, in rupees. Stored as a snapshot
  so historic orders keep the rate they were actually charged if the tariff
  changes later.

  A cart becomes one row per line item, so the fee is written on the FIRST row
  of an order only and left at 0 on the rest. Summing the column across rows
  therefore gives the true total collected rather than counting one delivery
  several times.

2. Security
- No policy changes. The column sits on `orders`, which already allows public
  insert and admin-only read/update.

3. Notes
- Existing rows keep 0, which is correct: they predate the charge and were
  placed under the delivery-on-call arrangement.
- The screenshot itself reuses `payment_proof_path` and the existing private
  `payment-proofs` bucket from 20260818130000_add_payment_proof.sql — one
  transfer, one proof, whether it covers the items, the delivery, or both.
*/

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0;

-- A negative delivery charge is never meaningful.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_delivery_fee_check'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_delivery_fee_check
      CHECK (delivery_fee >= 0);
  END IF;
END $$;
