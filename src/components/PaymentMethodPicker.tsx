import { useState } from 'react';
import { Banknote, Check, Copy, Smartphone, Truck } from 'lucide-react';
import {
  PAYMENT_METHODS,
  type PaymentMethodId,
  type TransferDetail,
} from '@/lib/payments';
import PaymentProofUpload from '@/components/PaymentProofUpload';

const ICONS: Record<PaymentMethodId, typeof Truck> = {
  cod: Truck,
  bank: Banknote,
  jazzcash: Smartphone,
  easypaisa: Smartphone,
};

export default function PaymentMethodPicker({
  value,
  onChange,
  proofPath,
  onProofChange,
}: {
  value: PaymentMethodId;
  onChange: (id: PaymentMethodId) => void;
  proofPath: string | null;
  onProofChange: (path: string | null) => void;
}) {
  const selected = PAYMENT_METHODS.find((m) => m.id === value) ?? PAYMENT_METHODS[0];

  // Only cash on delivery is set up — a one-item radio list is just noise.
  if (PAYMENT_METHODS.length <= 1) {
    const only = PAYMENT_METHODS[0];
    if (!only) return null;
    return (
      <div className="flex items-start gap-3 border border-stone-200 bg-white px-4 py-3">
        <Truck className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold" />
        <div>
          <p className="text-sm font-medium text-ink">{only.label}</p>
          <p className="text-xs text-stone-500">{only.blurb}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {PAYMENT_METHODS.map((method) => {
          const Icon = ICONS[method.id] ?? Banknote;
          const active = method.id === value;
          return (
            <label
              key={method.id}
              className={`flex cursor-pointer items-start gap-3 border px-4 py-3 transition-colors ${
                active ? 'border-gold bg-gold/5' : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <input
                type="radio"
                name="payment-method"
                value={method.id}
                checked={active}
                onChange={() => onChange(method.id)}
                className="sr-only"
              />
              <span
                className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border ${
                  active ? 'border-gold bg-gold' : 'border-stone-300'
                }`}
              >
                {active && <span className="h-1.5 w-1.5 rounded-full bg-cream" />}
              </span>
              <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${active ? 'text-gold' : 'text-stone-400'}`} />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">{method.label}</span>
                <span className="block text-xs leading-relaxed text-stone-500">{method.blurb}</span>
              </span>
            </label>
          );
        })}
      </div>

      {selected && selected.details.length > 0 && (
        <div className="border border-stone-200 bg-stone-50 px-4 py-3">
          <p className="mb-2 text-[11px] uppercase tracking-widest text-stone-500">
            Send payment to
          </p>
          <dl className="space-y-1.5">
            {selected.details.map((detail) => (
              <DetailRow key={detail.label} detail={detail} />
            ))}
          </dl>
        </div>
      )}

      {selected?.requiresProof && (
        <PaymentProofUpload path={proofPath} onChange={onProofChange} />
      )}
    </div>
  );
}

function DetailRow({ detail }: { detail: TransferDetail }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(detail.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (insecure context or denied) — the value is on screen
      // to read anyway, so there is nothing to recover from.
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <dt className="flex-shrink-0 text-stone-500">{detail.label}</dt>
      <dd className="flex min-w-0 items-center gap-2">
        <span className="truncate font-medium text-ink">{detail.value}</span>
        {detail.copyable && (
          <button
            type="button"
            onClick={copy}
            aria-label={`Copy ${detail.label}`}
            className="flex-shrink-0 text-stone-400 transition-colors hover:text-gold"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
      </dd>
    </div>
  );
}
