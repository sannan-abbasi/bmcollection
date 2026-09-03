import { supabase } from '@/lib/supabase';

/** Columns added by later migrations, which the database may not have yet. */
const OPTIONAL_COLUMNS = [
  // 20260817120000_add_payment_fields.sql
  'payment_method',
  'payment_status',
  'payment_reference',
  // 20260818130000_add_payment_proof.sql
  'payment_proof_path',
  // 20260903120000_add_delivery_fee.sql
  'delivery_fee',
] as const;

/**
 * A missing column surfaces under two different codes depending on the path:
 * Postgres raises 42703 on a query, while PostgREST rejects an INSERT earlier
 * with PGRST204 ("could not find the column ... in the schema cache"). Insert
 * hits the second one, so both must be treated as "column not there yet".
 */
const MISSING_COLUMN_CODES = new Set(['42703', 'PGRST204']);

type OrderRow = Record<string, unknown>;

/**
 * Inserts order rows, tolerating a database that has not had the later
 * migrations applied yet.
 *
 * Checkout is the one path that must never break. If those columns are missing
 * the insert is retried without them — the customer's order still goes through,
 * and nothing is truly lost because the payment method and the delivery charge
 * are also written into `notes`. Once the migrations are run the first insert
 * succeeds and the retry never happens.
 */
export async function insertOrders(rows: OrderRow[]) {
  const { error } = await supabase.from('orders').insert(rows);
  if (!error) return { error: null, degraded: false };

  if (!MISSING_COLUMN_CODES.has(error.code)) return { error, degraded: false };

  console.warn(
    'Orders table is missing the payment / delivery columns — saving without them. ' +
      'Apply the migrations in supabase/migrations to enable payment and delivery tracking.'
  );

  const withoutOptional = rows.map((row) => {
    const copy = { ...row };
    for (const column of OPTIONAL_COLUMNS) delete copy[column];
    return copy;
  });

  const retry = await supabase.from('orders').insert(withoutOptional);
  return { error: retry.error, degraded: retry.error === null };
}
