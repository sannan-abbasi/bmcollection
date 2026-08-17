import { supabase } from '@/lib/supabase';

/** The payment columns added by 20260817120000_add_payment_fields.sql. */
const PAYMENT_COLUMNS = ['payment_method', 'payment_status', 'payment_reference'] as const;

/**
 * A missing column surfaces under two different codes depending on the path:
 * Postgres raises 42703 on a query, while PostgREST rejects an INSERT earlier
 * with PGRST204 ("could not find the column ... in the schema cache"). Insert
 * hits the second one, so both must be treated as "column not there yet".
 */
const MISSING_COLUMN_CODES = new Set(['42703', 'PGRST204']);

type OrderRow = Record<string, unknown>;

/**
 * Inserts order rows, tolerating a database that has not had the payment
 * migration applied yet.
 *
 * Checkout is the one path that must never break. If the payment columns are
 * missing the insert is retried without them — the customer's order still goes
 * through, and their chosen payment method is not lost because it is also
 * written into `notes`. Once the migration is run the first insert succeeds and
 * the retry never happens.
 */
export async function insertOrders(rows: OrderRow[]) {
  const { error } = await supabase.from('orders').insert(rows);
  if (!error) return { error: null, degraded: false };

  if (!MISSING_COLUMN_CODES.has(error.code)) return { error, degraded: false };

  console.warn(
    'Orders table is missing the payment columns — saving without them. ' +
      'Apply supabase/migrations/20260817120000_add_payment_fields.sql to enable payment tracking.'
  );

  const withoutPayment = rows.map((row) => {
    const copy = { ...row };
    for (const column of PAYMENT_COLUMNS) delete copy[column];
    return copy;
  });

  const retry = await supabase.from('orders').insert(withoutPayment);
  return { error: retry.error, degraded: retry.error === null };
}
