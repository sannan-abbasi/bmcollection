import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import emailjs from '@emailjs/browser';
import { Check, Minus, Plus, ShoppingBag, Trash2, Truck, X } from 'lucide-react';
import { insertOrders } from '@/lib/orders';
import { useCart, FREE_DELIVERY_THRESHOLD } from '@/lib/cart';
import { useCurrency } from '@/lib/currency';
import { useToast } from '@/lib/toast';
import { comparePriceOf, savingsOf } from '@/lib/pricing';
import { productPath } from '@/lib/slug';
import PaymentMethodPicker from '@/components/PaymentMethodPicker';
import {
  DEFAULT_PAYMENT_METHOD,
  PAYMENT_METHOD_LABELS,
  initialPaymentStatus,
  methodById,
  type PaymentMethodId,
} from '@/lib/payments';

type Step = 'cart' | 'checkout' | 'done';

interface CheckoutForm {
  customer_name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  street: string;
  notes: string;
}

const emptyForm: CheckoutForm = {
  customer_name: '',
  email: '',
  phone: '',
  city: '',
  address: '',
  street: '',
  notes: '',
};

export default function CartDrawer() {
  const { items, count, subtotal, freeDelivery, amountToFreeDelivery, isOpen, closeCart, setQty, removeItem, clearCart } =
    useCart();
  const { notify } = useToast();
  const { format: money, billedPkr, isInternational, code: currencyCode } = useCurrency();
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>('cart');
  const [form, setForm] = useState<CheckoutForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [orderRef, setOrderRef] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>(DEFAULT_PAYMENT_METHOD);
  const [paymentProof, setPaymentProof] = useState<string | null>(null);

  // Reset back to the cart view a moment after the drawer closes.
  useEffect(() => {
    if (isOpen) return;
    const t = setTimeout(() => {
      setStep((s) => (s === 'done' ? 'cart' : s));
      setPaymentMethod(DEFAULT_PAYMENT_METHOD);
      setPaymentProof(null);
    }, 400);
    return () => clearTimeout(t);
  }, [isOpen]);

  // Stagger the line items in each time the drawer opens.
  useLayoutEffect(() => {
    if (!isOpen || step !== 'cart' || !listRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from('.cart-line', {
        x: 40,
        opacity: 0,
        duration: 0.5,
        stagger: 0.06,
        delay: 0.12,
        ease: 'power3.out',
      });
    }, listRef);
    return () => ctx.revert();
  }, [isOpen, step, items.length]);

  // Animate the free-delivery progress bar toward its target width.
  useEffect(() => {
    if (!barRef.current) return;
    const pct = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100);
    gsap.to(barRef.current, { width: `${pct}%`, duration: 0.8, ease: 'power3.out' });
  }, [subtotal, isOpen]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    if (methodById(paymentMethod)?.requiresProof && !paymentProof) {
      notify('Please attach a screenshot of your payment first.', 'error');
      return;
    }
    setSubmitting(true);

    const ref = 'BM-' + Date.now().toString(36).toUpperCase().slice(-6);
    const itemLines = items
      .map((i) => `${i.title} x${i.qty} — ${money(i.price * i.qty)}`)
      .join('\n');
    const deliveryNote = freeDelivery
      ? 'FREE DELIVERY (order qualifies)'
      : 'Delivery charges apply (order below free-delivery threshold)';
    const paymentLine = `Payment: ${PAYMENT_METHOD_LABELS[paymentMethod]}${
      paymentProof ? ' — screenshot attached (see admin dashboard)' : ''
    }`;
    const sharedNotes = [
      `Order Ref: ${ref}`,
      `Items (${count}):`,
      itemLines,
      `Subtotal: ${money(subtotal)}`,
      deliveryNote,
      isInternational ? `Shown to customer in ${currencyCode}: ${money(subtotal)}` : null,
      paymentLine,
      form.notes ? `Customer notes: ${form.notes}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    // The orders table stores one product per row, so a cart becomes one row per
    // line item, tied together by the shared order ref in `notes`.
    const rows = items.map((i) => ({
      product_id: i.id,
      product_title: i.qty > 1 ? `${i.title} x${i.qty}` : i.title,
      product_price: billedPkr(i.price) * i.qty,
      customer_name: form.customer_name,
      email: form.email,
      phone: form.phone,
      city: form.city,
      address: form.address,
      street: form.street || null,
      notes: sharedNotes,
      status: 'pending',
      payment_method: paymentMethod,
      payment_status: initialPaymentStatus(paymentMethod),
      payment_reference: null,
      payment_proof_path: paymentProof,
    }));

    const { error } = await insertOrders(rows);
    setSubmitting(false);

    if (error) {
      console.error('Supabase Insert Error:', error);
      notify('Could not place your order. Please try again.', 'error');
      return;
    }

    setOrderRef(ref);
    setStep('done');
    notify('Order placed successfully! We will contact you shortly.', 'success');

    emailjs
      .send(
        'service_mvfviau',
        'template_krdl205',
        {
          product_title: `Cart Order — ${count} item${count > 1 ? 's' : ''} (${ref})`,
          product_price: money(subtotal),
          customer_name: form.customer_name,
          phone: form.phone,
          email: form.email,
          city: form.city,
          address: form.address,
          street: form.street || 'None',
          notes: sharedNotes,
        },
        '8qobEve1uR8ockQxe'
      )
      .catch((err) => console.error('Email alert failed:', err));

    clearCart();
    setForm(emptyForm);
    // Payment selection is deliberately kept until the drawer closes, so the
    // confirmation screen can still tell the customer how they chose to pay.
  };

  const progressPct = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100);
  const totalSavings = items.reduce(
    (sum, i) => sum + savingsOf(i.price, i.compare_at_price, i.qty),
    0
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className={`fixed inset-0 z-[90] bg-ink/60 backdrop-blur-sm transition-opacity duration-400 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`fixed right-0 top-0 z-[95] flex h-full w-full max-w-md flex-col bg-cream shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-gold" />
            <h2 className="font-serif text-2xl text-ink">
              {step === 'checkout' ? 'Checkout' : step === 'done' ? 'Order Placed' : 'Your Bag'}
            </h2>
            {step === 'cart' && count > 0 && (
              <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] uppercase tracking-widest text-cream">
                {count}
              </span>
            )}
          </div>
          <button
            onClick={closeCart}
            aria-label="Close cart"
            className="text-stone-500 transition-colors hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Free delivery meter */}
        {step !== 'done' && (
          <div className="border-b border-stone-200 bg-white/60 px-6 py-4">
            <div className="mb-2 flex items-center gap-2 text-xs tracking-wide text-stone-600">
              <Truck className={`h-4 w-4 ${freeDelivery ? 'text-emerald-600' : 'text-gold'}`} />
              {freeDelivery ? (
                <span className="font-medium text-emerald-700">
                  Free delivery unlocked on this order.
                </span>
              ) : (
                <span>
                  Add <span className="font-medium text-ink">{money(amountToFreeDelivery)}</span> more for{' '}
                  <span className="font-medium text-gold">free delivery</span>
                </span>
              )}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
              <div
                ref={barRef}
                style={{ width: `${progressPct}%` }}
                className={`h-full rounded-full ${freeDelivery ? 'bg-emerald-500' : 'bg-gold'}`}
              />
            </div>
          </div>
        )}

        {/* Body */}
        {step === 'done' ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
              <Check className="h-10 w-10 text-emerald-600" />
            </div>
            <h3 className="mb-3 font-serif text-3xl text-ink">Thank You!</h3>
            <p className="mb-2 text-sm leading-relaxed text-stone-600">
              Your order has been received. Our team will call you shortly to confirm the details.
            </p>
            <p className="mb-2 text-sm text-stone-600">
              Paying by <span className="font-medium text-ink">{PAYMENT_METHOD_LABELS[paymentMethod]}</span>
              {methodById(paymentMethod)?.requiresProof && (
                <> — we will verify your transfer and confirm by phone.</>
              )}
            </p>
            <p className="mb-8 text-xs uppercase tracking-widest text-stone-500">
              Reference <span className="text-gold">{orderRef}</span>
            </p>
            <button
              onClick={closeCart}
              className="border border-stone-300 px-8 py-3 text-sm uppercase tracking-widest transition-all hover:border-gold hover:text-gold"
            >
              Continue Shopping
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <ShoppingBag className="mb-4 h-12 w-12 text-stone-300" />
            <p className="mb-2 font-serif text-2xl text-ink">Your bag is empty</p>
            <p className="mb-8 text-sm text-stone-500">
              Add something beautiful — spend {money(FREE_DELIVERY_THRESHOLD)} and delivery is on us.
            </p>
            <Link
              to="/new-arrivals"
              onClick={closeCart}
              className="bg-ink px-8 py-3 text-sm uppercase tracking-widest text-cream transition-all hover:bg-gold"
            >
              Shop New Arrivals
            </Link>
          </div>
        ) : step === 'cart' ? (
          <>
            <div ref={listRef} className="flex-1 overflow-y-auto px-6 py-4">
              {items.map((item) => (
                <div key={item.id} className="cart-line flex gap-4 border-b border-stone-200 py-4 last:border-0">
                  <Link
                    to={productPath(item)}
                    onClick={closeCart}
                    className="h-24 w-20 flex-shrink-0 overflow-hidden rounded bg-stone-100"
                  >
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ShoppingBag className="h-6 w-6 text-stone-300" />
                      </div>
                    )}
                  </Link>

                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <Link
                        to={productPath(item)}
                        onClick={closeCart}
                        className="font-serif text-lg leading-tight text-ink transition-colors hover:text-gold"
                      >
                        {item.title}
                      </Link>
                      <p className="mt-1 flex items-baseline gap-2 text-sm text-stone-500">
                        <span>{money(item.price)}</span>
                        {comparePriceOf(item.price, item.compare_at_price) !== null && (
                          <span className="text-xs text-stone-400 line-through">
                            {money(comparePriceOf(item.price, item.compare_at_price)!)}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center border border-stone-300">
                        <button
                          onClick={() => setQty(item.id, item.qty - 1)}
                          aria-label={`Decrease quantity of ${item.title}`}
                          className="px-2 py-1.5 text-stone-600 transition-colors hover:text-gold"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[2rem] text-center text-sm tabular-nums text-ink">{item.qty}</span>
                        <button
                          onClick={() => setQty(item.id, item.qty + 1)}
                          aria-label={`Increase quantity of ${item.title}`}
                          className="px-2 py-1.5 text-stone-600 transition-colors hover:text-gold"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-ink">{money(item.price * item.qty)}</span>
                        <button
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.title}`}
                          className="text-stone-400 transition-colors hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-stone-200 bg-white/60 px-6 py-5">
              <div className="mb-1 flex items-center justify-between text-sm text-stone-600">
                <span>Subtotal</span>
                <span className="text-base font-medium text-ink">{money(subtotal)}</span>
              </div>
              {totalSavings > 0 && (
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-stone-600">You save</span>
                  <span className="font-medium text-emerald-700">{money(totalSavings)}</span>
                </div>
              )}
              <div className="mb-4 flex items-center justify-between text-sm text-stone-600">
                <span>Delivery</span>
                <span className={freeDelivery ? 'font-medium text-emerald-700' : 'text-stone-500'}>
                  {freeDelivery ? 'Free' : 'Confirmed on call'}
                </span>
              </div>
              <button
                onClick={() => setStep('checkout')}
                className="w-full bg-ink py-4 text-sm uppercase tracking-widest text-cream transition-all duration-300 hover:bg-gold"
              >
                Proceed to Checkout
              </button>
              <p className="mt-3 text-center text-[11px] tracking-wide text-stone-500">
                Cash on delivery available across Pakistan
              </p>
            </div>
          </>
        ) : (
          <form onSubmit={handleCheckout} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div className="rounded bg-white/70 px-4 py-3 text-sm text-stone-600">
                <div className="flex items-center justify-between">
                  <span>
                    {count} item{count > 1 ? 's' : ''}
                  </span>
                  <span className="font-medium text-ink">{money(subtotal)}</span>
                </div>
              </div>

              <Field label="Full Name" required>
                <input
                  type="text"
                  required
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  className="premium-input"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone Number" required>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="premium-input"
                  />
                </Field>
                <Field label="Email" required>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="premium-input"
                  />
                </Field>
              </div>

              <Field label="City" required>
                <input
                  type="text"
                  required
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="premium-input"
                />
              </Field>

              <Field label="Address" required>
                <input
                  type="text"
                  required
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="premium-input"
                />
              </Field>

              <Field label="Street / Area (optional)">
                <input
                  type="text"
                  value={form.street}
                  onChange={(e) => setForm({ ...form, street: e.target.value })}
                  className="premium-input"
                />
              </Field>

              <div className="border-t border-stone-200 pt-4">
                <h3 className="mb-3 text-xs uppercase tracking-widest text-stone-500">Payment</h3>
                <PaymentMethodPicker
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  proofPath={paymentProof}
                  onProofChange={setPaymentProof}
                />
              </div>

              <Field label="Order Notes (optional)">
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="premium-input resize-none"
                />
              </Field>
            </div>

            <div className="border-t border-stone-200 bg-white/60 px-6 py-5">
              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="text-stone-600">Delivery</span>
                <span className={freeDelivery ? 'font-medium text-emerald-700' : 'text-stone-500'}>
                  {freeDelivery ? 'Free' : 'Confirmed on call'}
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('cart')}
                  className="border border-stone-300 px-5 py-4 text-sm uppercase tracking-widest transition-all hover:border-stone-400"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gold py-4 text-sm uppercase tracking-widest text-cream transition-all hover:bg-gold-dark disabled:opacity-50"
                >
                  {submitting ? 'Placing Order...' : 'Confirm Order'}
                </button>
              </div>
            </div>
          </form>
        )}
      </aside>
    </>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-widest text-stone-500">
        {label} {required && <span className="text-gold">*</span>}
      </span>
      {children}
    </label>
  );
}
