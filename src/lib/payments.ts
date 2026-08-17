/*
 * ═══════════════════════════════════════════════════════════════════════════
 *  PUT YOUR REAL ACCOUNT DETAILS IN THE `ACCOUNTS` BLOCK BELOW
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Bank Transfer, JazzCash and Easypaisa are HIDDEN from checkout until their
 * details are filled in — so nothing half-finished is ever shown to a customer.
 * Replace every FILL_ME below with your own details and that method appears at
 * checkout automatically. Delete a whole block to keep that method switched off.
 *
 * Until then customers only see Cash on Delivery, exactly as before.
 */

const FILL_ME = 'FILL_ME';

const ACCOUNTS = {
  bank: {
    bankName: FILL_ME, //  e.g. 'Meezan Bank'
    accountTitle: FILL_ME, //  the name on the account
    accountNumber: FILL_ME,
    iban: FILL_ME, //  e.g. 'PK00MEZN0000000000000000'
  },
  jazzcash: {
    accountTitle: FILL_ME,
    mobileNumber: FILL_ME, //  e.g. '0331 5076479'
  },
  easypaisa: {
    accountTitle: FILL_ME,
    mobileNumber: FILL_ME,
  },
};

/* ────────────────────────────── nothing below here needs editing ────────── */

export type PaymentMethodId = 'cod' | 'bank' | 'jazzcash' | 'easypaisa';
export type PaymentStatus = 'unpaid' | 'awaiting_verification' | 'paid';

export interface TransferDetail {
  label: string;
  value: string;
  /** Long numbers get a copy button — nobody should retype an IBAN. */
  copyable?: boolean;
}

export interface PaymentMethod {
  id: PaymentMethodId;
  label: string;
  blurb: string;
  /** Manual transfers ask the customer for the transaction ID afterwards. */
  requiresReference: boolean;
  details: TransferDetail[];
}

const ALL_METHODS: PaymentMethod[] = [
  {
    id: 'cod',
    label: 'Cash on Delivery',
    blurb: 'Pay the courier in cash when your parcel arrives.',
    requiresReference: false,
    details: [],
  },
  {
    id: 'bank',
    label: 'Bank Transfer',
    blurb: 'Transfer to our account, then enter the transaction ID below.',
    requiresReference: true,
    details: [
      { label: 'Bank', value: ACCOUNTS.bank.bankName },
      { label: 'Account Title', value: ACCOUNTS.bank.accountTitle },
      { label: 'Account Number', value: ACCOUNTS.bank.accountNumber, copyable: true },
      { label: 'IBAN', value: ACCOUNTS.bank.iban, copyable: true },
    ],
  },
  {
    id: 'jazzcash',
    label: 'JazzCash',
    blurb: 'Send the amount to our JazzCash account, then enter the TID below.',
    requiresReference: true,
    details: [
      { label: 'Account Title', value: ACCOUNTS.jazzcash.accountTitle },
      { label: 'JazzCash Number', value: ACCOUNTS.jazzcash.mobileNumber, copyable: true },
    ],
  },
  {
    id: 'easypaisa',
    label: 'Easypaisa',
    blurb: 'Send the amount to our Easypaisa account, then enter the TID below.',
    requiresReference: true,
    details: [
      { label: 'Account Title', value: ACCOUNTS.easypaisa.accountTitle },
      { label: 'Easypaisa Number', value: ACCOUNTS.easypaisa.mobileNumber, copyable: true },
    ],
  },
];

const isConfigured = (m: PaymentMethod) => !m.details.some((d) => d.value === FILL_ME);

/** Methods a customer can actually pick — unconfigured ones never appear. */
export const PAYMENT_METHODS: PaymentMethod[] = ALL_METHODS.filter(isConfigured);

export const DEFAULT_PAYMENT_METHOD: PaymentMethodId = 'cod';

if (import.meta.env.DEV) {
  const hidden = ALL_METHODS.filter((m) => !isConfigured(m));
  if (hidden.length > 0) {
    console.info(
      `[payments] Hidden until you fill in src/lib/payments.ts → ${hidden.map((m) => m.label).join(', ')}`
    );
  }
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodId, string> = {
  cod: 'Cash on Delivery',
  bank: 'Bank Transfer',
  jazzcash: 'JazzCash',
  easypaisa: 'Easypaisa',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Unpaid',
  awaiting_verification: 'Awaiting Verification',
  paid: 'Paid',
};

export function methodById(id: string): PaymentMethod | undefined {
  return ALL_METHODS.find((m) => m.id === id);
}

/**
 * Cash on delivery is not owed to us yet; a manual transfer needs someone to
 * check the account before it counts as received.
 */
export function initialPaymentStatus(method: PaymentMethodId): PaymentStatus {
  return method === 'cod' ? 'unpaid' : 'awaiting_verification';
}
