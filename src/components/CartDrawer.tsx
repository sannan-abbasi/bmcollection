import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import emailjs from '@emailjs/browser';
import {
  Check,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
  X,
} from 'lucide-react';

import { insertOrders } from '@/lib/orders';
import {
  useCart,
  FREE_DELIVERY_THRESHOLD,
} from '@/lib/cart';

import {
  deliveryFeeFor,
  deliveryZoneLabel,
  OTHER_CITY_DELIVERY_FEE,
  TWIN_CITY_DELIVERY_FEE,
} from '@/lib/delivery';

import {
  useCurrency,
  formatPkrAmount,
} from '@/lib/currency';

import { buildEnquiryUrl } from '@/lib/enquiry';
import { useToast } from '@/lib/toast';
import {
  comparePriceOf,
  savingsOf,
} from '@/lib/pricing';

import { productPath } from '@/lib/slug';

import PaymentMethodPicker, {
  DetailRow,
} from '@/components/PaymentMethodPicker';

import PaymentProofUpload from '@/components/PaymentProofUpload';

import {
  DEFAULT_PAYMENT_METHOD,
  PAYMENT_METHODS,
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
  const {
    items,
    count,
    subtotal,
    freeDelivery,
    amountToFreeDelivery,
    isOpen,
    closeCart,
    setQty,
    removeItem,
    clearCart,
  } = useCart();

  const { notify } = useToast();

  const {
    format: money,
    billedPkr,
    isInternational,
    code: currencyCode,
    country,
  } = useCurrency();

  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<Step>('cart');

  const [form, setForm] =
    useState<CheckoutForm>(emptyForm);

  const [submitting, setSubmitting] =
    useState(false);

  const [orderRef, setOrderRef] =
    useState('');

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethodId>(
      DEFAULT_PAYMENT_METHOD
    );

  const [paymentProof, setPaymentProof] =
    useState<string | null>(null);

  // Snapshot for the confirmation screen.
  const [paidDeliveryFee, setPaidDeliveryFee] =
    useState(0);

  /*
   * Reset back to the cart view a moment
   * after the drawer closes.
   */
  useEffect(() => {
    if (isOpen) return;

    const t = setTimeout(() => {
      setStep((s) =>
        s === 'done' ? 'cart' : s
      );

      setPaymentMethod(
        DEFAULT_PAYMENT_METHOD
      );

      setPaymentProof(null);
      setPaidDeliveryFee(0);
    }, 400);

    return () => clearTimeout(t);
  }, [isOpen]);

  /*
   * Stagger cart items whenever the drawer opens.
   */
  useLayoutEffect(() => {
    if (
      !isOpen ||
      step !== 'cart' ||
      !listRef.current
    ) {
      return;
    }

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

  /*
   * Animate the free-delivery progress bar.
   */
  useEffect(() => {
    if (!barRef.current) return;

    const pct = Math.min(
      100,
      (subtotal /
        FREE_DELIVERY_THRESHOLD) *
        100
    );

    gsap.to(barRef.current, {
      width: `${pct}%`,
      duration: 0.8,
      ease: 'power3.out',
    });
  }, [subtotal, isOpen]);

  /*
   * Delivery fee depends on customer's city.
   */
  const deliveryFee = deliveryFeeFor({
    city: form.city,
    freeDelivery,
    isInternational,
  });

  const payingForItemsUpfront =
    methodById(paymentMethod)
      ?.requiresProof ?? false;

  /*
   * Delivery is transferred through the
   * wallet the shop already uses.
   */
  const advanceMethod =
    PAYMENT_METHODS.find(
      (m) => m.id === 'jazzcash'
    ) ??
    PAYMENT_METHODS.find(
      (m) => m.requiresProof
    );

  /*
   * COD still requires delivery payment
   * before dispatch.
   */
  const collectDeliveryUpfront =
    deliveryFee > 0 &&
    Boolean(advanceMethod);

  const advanceDue =
    payingForItemsUpfront ||
    collectDeliveryUpfront;

  /*
   * Amount actually billed in PKR.
   */
  const billedSubtotal = items.reduce(
    (sum, i) =>
      sum +
      billedPkr(i.price) * i.qty,
    0
  );

  /*
   * Total savings.
   */
  const totalSavings = items.reduce(
    (sum, i) =>
      sum +
      savingsOf(
        i.price,
        i.compare_at_price,
        i.qty
      ),
    0
  );

  /*
   * Checkout.
   */
  const handleCheckout = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (items.length === 0) return;

    if (advanceDue && !paymentProof) {
      notify(
        deliveryFee > 0 &&
          !payingForItemsUpfront
          ? 'Please attach a screenshot of your delivery charge payment first.'
          : 'Please attach a screenshot of your payment first.',
        'error'
      );

      return;
    }

    setSubmitting(true);

    const ref =
      'BM-' +
      Date.now()
        .toString(36)
        .toUpperCase()
        .slice(-6);

    /*
     * Include size in the item list.
     *
     * Example:
     * T-Shirt — Size: M x2 — Rs. 3,000
     */
    const itemLines = items
      .map((i) => {
        const sizeText = i.size
          ? ` — Size: ${i.size}`
          : '';

        return `${i.title}${sizeText} x${i.qty} — ${money(
          i.price * i.qty
        )}`;
      })
      .join('\n');

    const deliveryNote =
      isInternational
        ? 'Delivery quoted on WhatsApp (overseas order)'
        : freeDelivery
          ? 'FREE DELIVERY (order qualifies)'
          : `Delivery: ${formatPkrAmount(
              deliveryFee
            )} — ${deliveryZoneLabel(
              form.city
            )} (paid in advance, screenshot attached)`;

    const paymentLine =
      `Payment: ${
        PAYMENT_METHOD_LABELS[
          paymentMethod
        ]
      }` +
      (paymentProof
        ? ' — screenshot attached (see admin dashboard)'
        : '');

    /*
     * Shared notes are stored with every order row.
     * This means the selected size will also
     * reach your admin/order system.
     */
    const sharedNotes = [
      `Order Ref: ${ref}`,
      `Items (${count}):`,
      itemLines,
      `Subtotal: ${money(subtotal)}`,
      deliveryNote,
      isInternational
        ? `Shown to customer in ${currencyCode}: ${money(
            subtotal
          )}`
        : null,
      paymentLine,
      form.notes
        ? `Customer notes: ${form.notes}`
        : null,
    ]
      .filter(Boolean)
      .join('\n');

    /*
     * One database row per cart line.
     *
     * IMPORTANT:
     * product_id remains i.id.
     * cartKey is NOT used as product_id.
     */
    const rows = items.map(
      (i, index) => {
        const sizeText = i.size
          ? ` — Size: ${i.size}`
          : '';

        const productTitle =
          i.qty > 1
            ? `${i.title}${sizeText} x${i.qty}`
            : `${i.title}${sizeText}`;

        return {
          product_id: i.id,

          product_title:
            productTitle,

          product_price:
            billedPkr(i.price) *
            i.qty,

          customer_name:
            form.customer_name,

          email: form.email,

          phone: form.phone,

          city: form.city,

          address: form.address,

          street:
            form.street || null,

          notes: sharedNotes,

          status: 'pending',

          payment_method:
            paymentMethod,

          payment_status:
            initialPaymentStatus(
              paymentMethod
            ),

          payment_reference:
            null,

          payment_proof_path:
            paymentProof,

          /*
           * Delivery is charged once
           * per order, not per item.
           */
          delivery_fee:
            index === 0
              ? deliveryFee
              : 0,
        };
      }
    );

    const { error } =
      await insertOrders(rows);

    setSubmitting(false);

    if (error) {
      console.error(
        'Supabase Insert Error:',
        error
      );

      notify(
        'Could not place your order. Please try again.',
        'error'
      );

      return;
    }

    setOrderRef(ref);

    setPaidDeliveryFee(
      deliveryFee
    );

    setStep('done');

    notify(
      'Order placed successfully! We will contact you shortly.',
      'success'
    );

    /*
     * EmailJS notification.
     */
    emailjs
      .send(
        'service_mvfviau',
        'template_krdl205',
        {
          product_title: `Cart Order — ${count} item${
            count > 1 ? 's' : ''
          } (${ref})`,

          product_price:
            formatPkrAmount(
              billedSubtotal +
                deliveryFee
            ),

          customer_name:
            form.customer_name,

          phone: form.phone,

          email: form.email,

          city: form.city,

          address: form.address,

          street:
            form.street || 'None',

          /*
           * This contains each item's
           * selected size.
           */
          notes: sharedNotes,
        },
        '8qobEve1uR8ockQxe'
      )
      .catch((err) =>
        console.error(
          'Email alert failed:',
          err
        )
      );

    /*
     * Clear cart after successful order.
     */
    clearCart();

    setForm(emptyForm);

    /*
     * Payment selection stays until
     * drawer closes so confirmation
     * can still show it.
     */
  };

  /*
   * WhatsApp enquiry.
   *
   * Include selected size in the title
   * so overseas orders also contain it.
   */
  const enquiryUrl =
    buildEnquiryUrl({
      lines: items.map((i) => ({
        title: i.size
          ? `${i.title} — Size: ${i.size}`
          : i.title,

        qty: i.qty,

        price: money(
          i.price * i.qty
        ),
      })),

      total: money(subtotal),

      currency: currencyCode,

      country,
    });

  const progressPct = Math.min(
    100,
    (subtotal /
      FREE_DELIVERY_THRESHOLD) *
      100
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className={`fixed inset-0 z-[90] bg-ink/60 backdrop-blur-sm transition-opacity duration-400 ${
          isOpen
            ? 'opacity-100'
            : 'pointer-events-none opacity-0'
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
          isOpen
            ? 'translate-x-0'
            : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-gold" />

            <h2 className="font-serif text-2xl text-ink">
              {step === 'checkout'
                ? 'Checkout'
                : step === 'done'
                  ? 'Order Placed'
                  : 'Your Bag'}
            </h2>

            {step === 'cart' &&
              count > 0 && (
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

        {/* International shipping */}
        {step !== 'done' &&
          isInternational && (
            <div className="border-b border-stone-200 bg-white/60 px-6 py-3">
              <p className="flex items-start gap-2 text-xs leading-relaxed text-stone-600">
                <Truck className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold" />

                <span>
                  Shipping from Pakistan —
                  we quote delivery for
                  your country on WhatsApp.
                </span>
              </p>
            </div>
          )}

        {/* Free delivery meter */}
        {step !== 'done' &&
          !isInternational && (
            <div className="border-b border-stone-200 bg-white/60 px-6 py-4">
              <div className="mb-2 flex items-center gap-2 text-xs tracking-wide text-stone-600">
                <Truck
                  className={`h-4 w-4 ${
                    freeDelivery
                      ? 'text-emerald-600'
                      : 'text-gold'
                  }`}
                />

                {freeDelivery ? (
                  <span className="font-medium text-emerald-700">
                    Free delivery unlocked
                    on this order.
                  </span>
                ) : (
                  <span>
                    Add{' '}
                    <span className="font-medium text-ink">
                      {money(
                        amountToFreeDelivery
                      )}
                    </span>{' '}
                    more for{' '}
                    <span className="font-medium text-gold">
                      free delivery
                    </span>
                  </span>
                )}
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
                <div
                  ref={barRef}
                  style={{
                    width: `${progressPct}%`,
                  }}
                  className={`h-full rounded-full ${
                    freeDelivery
                      ? 'bg-emerald-500'
                      : 'bg-gold'
                  }`}
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

            <h3 className="mb-3 font-serif text-3xl text-ink">
              Thank You!
            </h3>

            <p className="mb-2 text-sm leading-relaxed text-stone-600">
              Your order has been
              received. Our team will
              call you shortly to confirm
              the details.
            </p>

            <p className="mb-2 text-sm text-stone-600">
              Paying by{' '}
              <span className="font-medium text-ink">
                {
                  PAYMENT_METHOD_LABELS[
                    paymentMethod
                  ]
                }
              </span>

              {methodById(
                paymentMethod
              )?.requiresProof && (
                <>
                  {' '}
                  — we will verify your
                  transfer and confirm by
                  phone.
                </>
              )}
            </p>

            {paidDeliveryFee > 0 && (
              <p className="mb-2 text-sm text-stone-600">
                Delivery{' '}
                <span className="font-medium text-ink">
                  {money(
                    paidDeliveryFee
                  )}
                </span>{' '}
                — we dispatch as soon as
                your payment is verified.
              </p>
            )}

            <p className="mb-8 text-xs uppercase tracking-widest text-stone-500">
              Reference{' '}
              <span className="text-gold">
                {orderRef}
              </span>
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

            <p className="mb-2 font-serif text-2xl text-ink">
              Your bag is empty
            </p>

            <p className="mb-8 text-sm text-stone-500">
              Add something beautiful —
              spend{' '}
              {money(
                FREE_DELIVERY_THRESHOLD
              )}{' '}
              and delivery is on us.
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
            {/* Cart items */}
            <div
              ref={listRef}
              className="flex-1 overflow-y-auto px-6 py-4"
            >
              {items.map((item) => (
                <div
                  key={item.cartKey}
                  className="cart-line flex gap-4 border-b border-stone-200 py-4 last:border-0"
                >
                  {/* Product image */}
                  <Link
                    to={productPath(item)}
                    onClick={closeCart}
                    className="h-24 w-20 flex-shrink-0 overflow-hidden rounded bg-stone-100"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ShoppingBag className="h-6 w-6 text-stone-300" />
                      </div>
                    )}
                  </Link>

                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      {/* Product title */}
                      <Link
                        to={productPath(item)}
                        onClick={closeCart}
                        className="font-serif text-lg leading-tight text-ink transition-colors hover:text-gold"
                      >
                        {item.title}
                      </Link>

                      {/* SIZE */}
                      {item.size && (
                        <p className="mt-1 text-xs uppercase tracking-widest text-stone-500">
                          Size:{' '}
                          <span className="font-medium text-ink">
                            {item.size}
                          </span>
                        </p>
                      )}

                      {/* Price */}
                      <p className="mt-1 flex items-baseline gap-2 text-sm text-stone-500">
                        <span>
                          {money(item.price)}
                        </span>

                        {comparePriceOf(
                          item.price,
                          item.compare_at_price
                        ) !== null && (
                          <span className="text-xs text-stone-400 line-through">
                            {money(
                              comparePriceOf(
                                item.price,
                                item.compare_at_price
                              )!
                            )}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Quantity + total */}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center border border-stone-300">
                        <button
                          onClick={() =>
                            setQty(
                              item.cartKey,
                              item.qty - 1
                            )
                          }
                          aria-label={`Decrease quantity of ${item.title}${
                            item.size
                              ? ` size ${item.size}`
                              : ''
                          }`}
                          className="px-2 py-1.5 text-stone-600 transition-colors hover:text-gold"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>

                        <span className="min-w-[2rem] text-center text-sm tabular-nums text-ink">
                          {item.qty}
                        </span>

                        <button
                          onClick={() =>
                            setQty(
                              item.cartKey,
                              item.qty + 1
                            )
                          }
                          aria-label={`Increase quantity of ${item.title}${
                            item.size
                              ? ` size ${item.size}`
                              : ''
                          }`}
                          className="px-2 py-1.5 text-stone-600 transition-colors hover:text-gold"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-ink">
                          {money(
                            item.price *
                              item.qty
                          )}
                        </span>

                        <button
                          onClick={() =>
                            removeItem(
                              item.cartKey
                            )
                          }
                          aria-label={`Remove ${item.title}${
                            item.size
                              ? ` size ${item.size}`
                              : ''
                          }`}
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

            {/* Cart totals */}
            <div className="border-t border-stone-200 bg-white/60 px-6 py-5">
              <div className="mb-1 flex items-center justify-between text-sm text-stone-600">
                <span>
                  Subtotal
                </span>

                <span className="text-base font-medium text-ink">
                  {money(subtotal)}
                </span>
              </div>

              {totalSavings > 0 && (
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-stone-600">
                    You save
                  </span>

                  <span className="font-medium text-emerald-700">
                    {money(
                      totalSavings
                    )}
                  </span>
                </div>
              )}

              <div className="mb-4 flex items-center justify-between text-sm text-stone-600">
                <span>
                  Delivery
                </span>

                <span
                  className={
                    freeDelivery &&
                    !isInternational
                      ? 'font-medium text-emerald-700'
                      : 'text-stone-500'
                  }
                >
                  {isInternational
                    ? 'Quoted on WhatsApp'
                    : freeDelivery
                      ? 'Free'
                      : `${formatPkrAmount(
                          TWIN_CITY_DELIVERY_FEE
                        )} – ${formatPkrAmount(
                          OTHER_CITY_DELIVERY_FEE
                        )}`}
                </span>
              </div>

              {/* Checkout */}
              <button
                onClick={() =>
                  setStep('checkout')
                }
                className="w-full bg-ink py-4 text-sm uppercase tracking-widest text-cream transition-all duration-300 hover:bg-gold"
              >
                Proceed to Checkout
              </button>

              {isInternational ? (
                <>
                  <a
                    href={enquiryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 flex w-full items-center justify-center gap-2 border border-stone-300 py-3.5 text-sm uppercase tracking-widest text-ink transition-colors duration-300 hover:border-gold hover:text-gold"
                  >
                    <MessageCircle className="h-4 w-4" />

                    Or order on WhatsApp
                  </a>

                  <p className="mt-3 text-center text-[11px] leading-relaxed tracking-wide text-stone-500">
                    We ship from Pakistan —
                    delivery to your country is
                    confirmed after you order.
                  </p>
                </>
              ) : (
                <p className="mt-3 text-center text-[11px] tracking-wide text-stone-500">
                  Cash on delivery available
                  across Pakistan
                </p>
              )}
            </div>
          </>
        ) : (
          /* Checkout */
          <form
            onSubmit={handleCheckout}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {/* Order summary */}
              <div className="rounded bg-white/70 px-4 py-3 text-sm text-stone-600">
                <div className="flex items-center justify-between">
                  <span>
                    {count} item
                    {count > 1 ? 's' : ''}
                  </span>

                  <span className="font-medium text-ink">
                    {money(subtotal)}
                  </span>
                </div>

                {/* Selected sizes */}
                <div className="mt-2 border-t border-stone-200 pt-2">
                  {items.map((item) => (
                    <div
                      key={item.cartKey}
                      className="flex justify-between gap-3 text-xs text-stone-500"
                    >
                      <span>
                        {item.title}
                        {item.size
                          ? ` — Size ${item.size}`
                          : ''}
                        {item.qty > 1
                          ? ` × ${item.qty}`
                          : ''}
                      </span>

                      <span className="whitespace-nowrap">
                        {money(
                          item.price *
                            item.qty
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Field
                label="Full Name"
                required
              >
                <input
                  type="text"
                  required
                  value={
                    form.customer_name
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      customer_name:
                        e.target.value,
                    })
                  }
                  className="premium-input"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Phone Number"
                  required
                >
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        phone: e.target.value,
                      })
                    }
                    className="premium-input"
                  />
                </Field>

                <Field
                  label="Email"
                  required
                >
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        email:
                          e.target.value,
                      })
                    }
                    className="premium-input"
                  />
                </Field>
              </div>

              <Field
                label="City"
                required
              >
                <input
                  type="text"
                  required
                  value={form.city}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      city: e.target.value,
                    })
                  }
                  className="premium-input"
                />
              </Field>

              <Field
                label="Address"
                required
              >
                <input
                  type="text"
                  required
                  value={form.address}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      address:
                        e.target.value,
                    })
                  }
                  className="premium-input"
                />
              </Field>

              <Field label="Street / Area (optional)">
                <input
                  type="text"
                  value={form.street}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      street:
                        e.target.value,
                    })
                  }
                  className="premium-input"
                />
              </Field>

              {/* Payment */}
              <div className="border-t border-stone-200 pt-4">
                <h3 className="mb-3 text-xs uppercase tracking-widest text-stone-500">
                  Payment
                </h3>

                <PaymentMethodPicker
                  value={paymentMethod}
                  onChange={
                    setPaymentMethod
                  }
                  proofPath={paymentProof}
                  onProofChange={
                    setPaymentProof
                  }
                  amountDue={
                    payingForItemsUpfront
                      ? money(
                          subtotal +
                            deliveryFee
                        )
                      : null
                  }
                />

                {collectDeliveryUpfront &&
                  !payingForItemsUpfront &&
                  advanceMethod && (
                    <div className="mt-3 border border-gold/40 bg-gold/5 px-4 py-3.5">
                      <p className="text-sm font-medium text-ink">
                        Delivery charge —
                        pay in advance
                      </p>

                      <p className="mt-1 text-xs leading-relaxed text-stone-600">
                        Send{' '}
                        {money(
                          deliveryFee
                        )}{' '}
                        to the{' '}
                        {
                          advanceMethod.label
                        }{' '}
                        account below and
                        attach the screenshot.
                        Your items are still
                        paid in cash when the
                        parcel arrives.
                        We dispatch as soon
                        as the transfer is
                        verified.
                      </p>

                      <dl className="mt-3 space-y-1.5 border-t border-gold/30 pt-3">
                        {advanceMethod.details.map(
                          (detail) => (
                            <DetailRow
                              key={
                                detail.label
                              }
                              detail={
                                detail
                              }
                            />
                          )
                        )}

                        <div className="flex items-center justify-between gap-3 border-t border-gold/30 pt-2 text-sm">
                          <span className="text-stone-500">
                            Amount to send
                          </span>

                          <span className="font-medium text-ink">
                            {money(
                              deliveryFee
                            )}
                          </span>
                        </div>
                      </dl>

                      <div className="mt-3">
                        <PaymentProofUpload
                          path={
                            paymentProof
                          }
                          onChange={
                            setPaymentProof
                          }
                        />
                      </div>
                    </div>
                  )}
              </div>

              <Field label="Order Notes (optional)">
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      notes:
                        e.target.value,
                    })
                  }
                  rows={3}
                  className="premium-input resize-none"
                />
              </Field>
            </div>

            {/* Checkout bottom */}
            <div className="border-t border-stone-200 bg-white/60 px-6 py-5">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-stone-600">
                  Delivery
                </span>

                <span
                  className={
                    deliveryFee === 0
                      ? 'font-medium text-emerald-700'
                      : 'text-ink'
                  }
                >
                  {isInternational
                    ? 'Quoted on WhatsApp'
                    : freeDelivery
                      ? 'Free'
                      : form.city.trim()
                        ? money(
                            deliveryFee
                          )
                        : 'Enter your city'}
                </span>
              </div>

              {deliveryFee > 0 && (
                <p className="mb-2 text-right text-[11px] text-stone-500">
                  {deliveryZoneLabel(
                    form.city
                  )}
                </p>
              )}

              <div className="mb-4 flex items-center justify-between border-t border-stone-200 pt-2.5 text-sm">
                <span className="font-medium text-ink">
                  Total
                </span>

                <span className="text-base font-medium text-ink">
                  {money(
                    subtotal +
                      deliveryFee
                  )}
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setStep('cart')
                  }
                  className="border border-stone-300 px-5 py-4 text-sm uppercase tracking-widest transition-all hover:border-stone-400"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gold py-4 text-sm uppercase tracking-widest text-cream transition-all hover:bg-gold-dark disabled:opacity-50"
                >
                  {submitting
                    ? 'Placing Order...'
                    : 'Confirm Order'}
                </button>
              </div>
            </div>
          </form>
        )}
      </aside>
    </>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-widest text-stone-500">
        {label}{' '}
        {required && (
          <span className="text-gold">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}