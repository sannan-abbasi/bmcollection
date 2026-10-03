import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase, BRAND } from '@/lib/supabase';
import { insertOrders } from '@/lib/orders';
import type { Product } from '@/lib/types';
import { comparePriceOf, discountPercentOf, formatPrice } from '@/lib/pricing';
import { absoluteUrl, useSeo } from '@/lib/seo';
import { looksLikeId, productPath } from '@/lib/slug';
import PaymentMethodPicker, { DetailRow } from '@/components/PaymentMethodPicker';
import PaymentProofUpload from '@/components/PaymentProofUpload';
import {
  DEFAULT_PAYMENT_METHOD,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  initialPaymentStatus,
  methodById,
  type PaymentMethodId,
} from '@/lib/payments';
import { deliveryFeeFor, deliveryZoneLabel } from '@/lib/delivery';
import { useToast } from '@/lib/toast';
import { useCart, FREE_DELIVERY_THRESHOLD } from '@/lib/cart';
import { useCurrency, formatPkrAmount } from '@/lib/currency';
import { buildEnquiryUrl } from '@/lib/enquiry';
import {
  ArrowLeft,
  Check,
  MessageCircle,
  Minus,
  Plus,
  ShoppingCart,
  Sparkles,
  Truck,
} from 'lucide-react';
import ProductReviews from '@/components/ProductReviews';
import emailjs from '@emailjs/browser';

interface OrderForm {
  customer_name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  street: string;
  notes: string;
}

const emptyForm: OrderForm = {
  customer_name: '',
  email: '',
  phone: '',
  city: '',
  address: '',
  street: '',
  notes: '',
};

const SIZES = ['M', 'L', 'XL'] as const;

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { addItem, openCart } = useCart();

  const {
    format: money,
    billedPkr,
    isInternational,
    code: currencyCode,
    country,
  } = useCurrency();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOrder, setShowOrder] = useState(false);
  const [form, setForm] = useState<OrderForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethodId>(DEFAULT_PAYMENT_METHOD);
  const [paymentProof, setPaymentProof] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    setLoading(true);

    // `id` is whatever is in the URL — a slug for new links, a UUID for links
    // shared before slugs existed. Try the slug first, then fall back.
    const lookup = looksLikeId(id)
      ? supabase.from('products').select('*').eq('id', id).maybeSingle()
      : supabase.from('products').select('*').eq('slug', id).maybeSingle();

    lookup.then(async ({ data, error }) => {
      let found = data;

      // Slug column missing, or nothing matched — try the other key before giving up.
      if (!found && (error || !looksLikeId(id))) {
        const retry = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        found = retry.data;
      }

      if (cancelled) return;

      setProduct(found);
      setLoading(false);

      // Send UUID links to the readable URL so only one version gets indexed.
      if (found?.slug && found.slug !== id) {
        navigate(`/product/${found.slug}`, { replace: true });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  /* Structured data */
  const productJsonLd = useMemo(() => {
    if (!product) return null;

    const url = absoluteUrl(productPath(product)) ?? undefined;

    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Product',
          name: product.title,
          description: product.description ?? undefined,
          image: product.image_url ? [product.image_url] : undefined,
          sku: product.id,
          url,
          brand: {
            '@type': 'Brand',
            name: BRAND.name,
          },
          offers: {
            '@type': 'Offer',
            price: Number(product.price),
            priceCurrency: 'PKR',
            availability: product.is_sold_out
              ? 'https://schema.org/OutOfStock'
              : 'https://schema.org/InStock',
            url,
            seller: {
              '@type': 'Organization',
              name: BRAND.name,
            },
          },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: absoluteUrl('/') ?? undefined,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: product.title,
              item: url,
            },
          ],
        },
      ],
    };
  }, [product]);

  useSeo({
    title: product
      ? product.title
      : loading
        ? 'Loading…'
        : 'Product Not Found',

    description:
      product?.description?.trim() ||
      (product
        ? `Buy ${product.title} online in Pakistan for ${formatPrice(
            product.price
          )} at ${BRAND.name}. Cash on delivery nationwide and free delivery over Rs 5,000.`
        : 'This product is no longer available.'),

    path: product
      ? productPath(product)
      : `/product/${id ?? ''}`,

    image: product?.image_url ?? null,
    type: 'product',
    jsonLd: productJsonLd,

    noindex: !loading && !product,
  });

  /*
   * Add product to cart.
   */
  const handleAddToBag = () => {
    if (!product) return;

    if (!selectedSize) {
      notify('Please select a size first', 'error');
      return;
    }

    addItem(product, {
      qty,
      size: selectedSize,
    });

    openCart();
  };

  /*
   * Start Buy Now flow.
   */
  const handleBuyNow = () => {
    if (!selectedSize) {
      notify('Please select a size first', 'error');
      return;
    }

    setShowOrder(true);
  };

  // Buying straight from the product page is still one order going to one
  // address, so it owes exactly what the same items would owe through the bag.
  const lineSubtotal = product ? product.price * qty : 0;

  const freeDelivery =
    lineSubtotal >= FREE_DELIVERY_THRESHOLD;

  const deliveryFee = deliveryFeeFor({
    city: form.city,
    freeDelivery,
    isInternational,
  });

  const payingForItemsUpfront =
    methodById(paymentMethod)?.requiresProof ?? false;

  const advanceMethod =
    PAYMENT_METHODS.find((m) => m.id === 'jazzcash') ??
    PAYMENT_METHODS.find((m) => m.requiresProof);

  const collectDeliveryUpfront =
    deliveryFee > 0 && Boolean(advanceMethod);

  const advanceDue =
    payingForItemsUpfront || collectDeliveryUpfront;

  const selectedProductTitle = product
    ? `${product.title} — Size: ${selectedSize ?? 'Not selected'}`
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product) return;

    if (!selectedSize) {
      notify('Please select a size first', 'error');
      return;
    }

    // Anything owed before dispatch has to arrive with a screenshot.
    if (advanceDue && !paymentProof) {
      notify(
        deliveryFee > 0 && !payingForItemsUpfront
          ? 'Please attach a screenshot of your delivery charge payment first.'
          : 'Please attach a screenshot of your payment first.',
        'error'
      );

      return;
    }

    setSubmitting(true);

    const deliveryNote = isInternational
      ? 'Delivery quoted on WhatsApp (overseas order)'
      : freeDelivery
        ? 'FREE DELIVERY (order qualifies)'
        : `Delivery: ${formatPkrAmount(
            deliveryFee
          )} — ${deliveryZoneLabel(form.city)} (paid in advance, screenshot attached)`;

    const productTitleForOrder =
      qty > 1
        ? `${product.title} — Size: ${selectedSize} x${qty}`
        : `${product.title} — Size: ${selectedSize}`;

    const orderPayload = {
      product_id: product.id,

      product_title: productTitleForOrder,

      product_price: billedPkr(product.price) * qty,

      customer_name: form.customer_name,
      email: form.email,
      phone: form.phone,
      city: form.city,
      address: form.address,
      street: form.street || null,

      notes: [
        `Size: ${selectedSize}`,

        `Quantity: ${qty}`,

        isInternational
          ? `Shown to customer in ${currencyCode}: ${money(
              product.price * qty
            )}`
          : null,

        deliveryNote,

        `Payment: ${PAYMENT_METHOD_LABELS[paymentMethod]}${
          paymentProof
            ? ' — screenshot attached (see admin dashboard)'
            : ''
        }`,

        form.notes || null,
      ]
        .filter(Boolean)
        .join('\n'),

      status: 'pending',

      payment_method: paymentMethod,

      payment_status: initialPaymentStatus(paymentMethod),

      payment_reference: null,

      payment_proof_path: paymentProof,

      delivery_fee: deliveryFee,
    };

    const { error } = await insertOrders([orderPayload]);

    setSubmitting(false);

    if (error) {
      console.error('Supabase Insert Error:', error);

      notify(
        'Could not place your order. Please try again.',
        'error'
      );
    } else {
      setOrdered(true);

      notify(
        'Order placed successfully! We will contact you shortly.',
        'success'
      );

      // Send instant email notification to admin via EmailJS
      emailjs
        .send(
          'service_mvfviau',
          'template_krdl205',
          {
            product_title: productTitleForOrder,

            product_price: formatPrice(
              billedPkr(product.price) * qty + deliveryFee
            ),

            customer_name: form.customer_name,

            phone: form.phone,

            email: form.email,

            city: form.city,

            address: form.address,

            street: form.street || 'None',

            notes: [
              `Size: ${selectedSize}`,

              `Quantity: ${qty}`,

              deliveryNote,

              `Payment: ${PAYMENT_METHOD_LABELS[paymentMethod]}${
                paymentProof
                  ? ' — screenshot attached (see admin dashboard)'
                  : ''
              }`,

              form.notes || null,
            ]
              .filter(Boolean)
              .join('\n'),
          },
          '8qobEve1uR8ockQxe'
        )
        .catch((err) =>
          console.error('Email alert failed:', err)
        );
    }
  };

  if (loading) {
    return (
      <div className="pt-28 px-6">
        <div className="mx-auto max-w-6xl grid gap-12 md:grid-cols-2">
          <div className="aspect-[3/4] skeleton rounded-lg" />

          <div className="space-y-4">
            <div className="h-8 skeleton rounded w-3/4" />
            <div className="h-6 skeleton rounded w-1/3" />
            <div className="h-24 skeleton rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pt-28 px-6 text-center py-24">
        <p className="text-stone-500 text-lg">
          Product not found.
        </p>

        <Link
          to="/"
          className="mt-4 inline-flex items-center gap-2 text-gold hover:text-gold-dark"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    );
  }

  if (ordered) {
    return (
      <div className="pt-28 px-6 min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 mb-6">
            <Check className="h-10 w-10 text-emerald-600" />
          </div>

          <h2 className="font-serif text-4xl text-ink mb-4">
            Thank You!
          </h2>

          <p className="text-stone-600 leading-relaxed mb-4">
            Your order for{' '}
            <span className="font-medium text-ink">
              {product.title}
            </span>{' '}
            has been received.
          </p>

          <p className="text-stone-600 leading-relaxed mb-4">
            Size:{' '}
            <span className="font-medium text-ink">
              {selectedSize}
            </span>
            {' · '}
            Quantity:{' '}
            <span className="font-medium text-ink">
              {qty}
            </span>
          </p>

          <p className="text-stone-600 leading-relaxed mb-4">
            Our team will contact you at{' '}
            <span className="font-medium">
              {form.phone}
            </span>{' '}
            shortly to confirm details.
          </p>

          <p
            className={`text-stone-600 leading-relaxed ${
              deliveryFee > 0 ? 'mb-4' : 'mb-8'
            }`}
          >
            Paying by{' '}
            <span className="font-medium text-ink">
              {PAYMENT_METHOD_LABELS[paymentMethod]}
            </span>

            {methodById(paymentMethod)?.requiresProof &&
              ' — we will verify your transfer before dispatch.'}
          </p>

          {deliveryFee > 0 && (
            <p className="text-stone-600 leading-relaxed mb-8">
              Delivery{' '}
              <span className="font-medium text-ink">
                {money(deliveryFee)}
              </span>{' '}
              — we dispatch as soon as your payment is verified.
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/"
              className="text-sm uppercase tracking-widest border border-stone-300 px-6 py-3 hover:border-gold hover:text-gold transition-all"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isSoldOut = Boolean(product.is_sold_out);

  const wasPrice = comparePriceOf(
    product.price,
    product.compare_at_price
  );

  const discount = discountPercentOf(
    product.price,
    product.compare_at_price
  );

  return (
    <div className="pt-28 pb-16 px-6">
      <div className="mx-auto max-w-6xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs uppercase tracking-widest text-stone-500 mb-8">
          <Link
            to="/"
            className="hover:text-gold transition-colors"
          >
            Home
          </Link>

          <span>/</span>

          <button
            onClick={() => navigate(-1)}
            className="hover:text-gold transition-colors"
          >
            Back
          </button>

          <span>/</span>

          <span className="text-ink truncate">
            {product.title}
          </span>
        </nav>

        <div className="grid gap-12 md:grid-cols-2">
          {/* Product Image */}
          <div className="relative aspect-[3/4] overflow-hidden rounded-xl premium-shadow bg-stone-100">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Sparkles className="h-12 w-12 text-stone-300" />
              </div>
            )}

            {product.is_new_arrival && !isSoldOut && (
              <span className="absolute top-6 left-6 bg-ink/90 text-cream text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full">
                New Arrival
              </span>
            )}

            {isSoldOut && (
              <span className="absolute top-6 left-6 bg-stone-900/90 text-stone-200 text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full border border-stone-700">
                Sold Out
              </span>
            )}
          </div>

          {/* Product Details */}
          <div className="flex flex-col justify-center">
            <p className="text-xs uppercase tracking-[0.3em] text-gold mb-3">
              BM Collection
            </p>

            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-ink mb-4">
              {product.title}
            </h1>

            {/* Price */}
            <div className="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-2">
              <span className="text-2xl font-sans font-light text-ink">
                {money(product.price)}
              </span>

              {wasPrice !== null && (
                <span className="text-lg font-sans font-light text-stone-400 line-through">
                  {money(wasPrice)}
                </span>
              )}

              {discount !== null && (
                <span className="rounded-full bg-gold px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-cream">
                  {discount}% Off
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-stone-600 leading-relaxed mb-8">
                {product.description}
              </p>
            )}

            {/* Benefits */}
            <div className="space-y-3 mb-8 text-sm text-stone-500">
              <div className="flex items-center gap-3">
                <Check className="h-4 w-4 text-gold" />
                Premium quality guaranteed
              </div>

              <div className="flex items-center gap-3">
                <Check className="h-4 w-4 text-gold" />
                Cash on delivery available
              </div>

              <div className="flex items-center gap-3">
                <Truck className="h-4 w-4 text-gold" />

                {isInternational
                  ? 'Ships from Pakistan — delivery quoted on WhatsApp'
                  : `Free delivery on orders of ${money(
                      FREE_DELIVERY_THRESHOLD
                    )} and above`}
              </div>
            </div>

            {isSoldOut ? (
              /* Sold Out */
              <div className="border border-stone-200 bg-stone-50 px-6 py-5 text-center">
                <p className="font-serif text-xl text-ink mb-1">
                  Currently Sold Out
                </p>

                <p className="text-sm text-stone-500 mb-4">
                  Message us on WhatsApp and we will let you know the
                  moment it is back.
                </p>

                <a
                  href={`${BRAND.whatsappLink}?text=${encodeURIComponent(
                    `Hi, please notify me when ${product.title} is back in stock.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 border border-stone-300 text-ink px-8 py-3 text-sm uppercase tracking-widest hover:border-gold hover:text-gold transition-all duration-300"
                >
                  <MessageCircle className="h-4 w-4" />
                  Notify Me
                </a>
              </div>
            ) : !showOrder ? (
              /* Product Selection */
              <div className="space-y-5">
                {/* Size Selector */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest text-stone-500">
                      Select Size
                    </span>

                    {selectedSize && (
                      <span className="text-xs text-gold">
                        Size {selectedSize} selected
                      </span>
                    )}
                  </div>

                  <div className="flex gap-3">
                    {SIZES.map((size) => {
                      const isSelected =
                        selectedSize === size;

                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() =>
                            setSelectedSize(size)
                          }
                          className={`flex h-12 min-w-[64px] items-center justify-center border text-sm font-medium uppercase tracking-wider transition-all duration-200 ${
                            isSelected
                              ? 'border-gold bg-gold text-cream'
                              : 'border-stone-300 bg-white text-ink hover:border-gold hover:text-gold'
                          }`}
                          aria-label={`Select size ${size}`}
                          aria-pressed={isSelected}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quantity */}
                <div className="flex items-center gap-4">
                  <span className="text-xs uppercase tracking-widest text-stone-500">
                    Quantity
                  </span>

                  <div className="flex items-center border border-stone-300">
                    <button
                      type="button"
                      onClick={() =>
                        setQty((q) =>
                          Math.max(1, q - 1)
                        )
                      }
                      aria-label="Decrease quantity"
                      className="px-3 py-2 text-stone-600 hover:text-gold transition-colors"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>

                    <span className="min-w-[2.5rem] text-center text-sm tabular-nums text-ink">
                      {qty}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setQty((q) =>
                          Math.min(99, q + 1)
                        )
                      }
                      aria-label="Increase quantity"
                      className="px-3 py-2 text-stone-600 hover:text-gold transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Add / Buy Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    type="button"
                    onClick={handleAddToBag}
                    className="flex flex-1 items-center justify-center gap-2 bg-ink text-cream px-8 py-4 text-sm uppercase tracking-widest hover:bg-gold transition-all duration-300"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Add to Bag
                  </button>

                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="flex flex-1 items-center justify-center gap-2 bg-gold text-cream px-8 py-4 text-sm uppercase tracking-widest hover:bg-gold-dark transition-all duration-300"
                  >
                    Buy Now
                  </button>
                </div>

                {/* WhatsApp Inquiry */}
                <a
                  href={
                    isInternational
                      ? buildEnquiryUrl({
                          lines: [
                            {
                              title: `${product.title} — Size: ${
                                selectedSize ?? 'Not selected'
                              }`,
                              qty,
                              price: money(
                                product.price * qty
                              ),
                            },
                          ],
                          total: money(
                            product.price * qty
                          ),
                          currency: currencyCode,
                          country,
                        })
                      : `${BRAND.whatsappLink}?text=${encodeURIComponent(
                          `Hi, I'm interested in ${
                            product.title
                          } — Size: ${
                            selectedSize ?? 'Not selected'
                          } — Quantity: ${qty} — Price: ${money(
                            product.price * qty
                          )}.`
                        )}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 border border-stone-300 text-ink px-8 py-4 text-sm uppercase tracking-widest hover:border-gold hover:text-gold transition-all duration-300"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp Inquiry
                </a>
              </div>
            ) : (
              /* Order Form */
              <form
                onSubmit={handleSubmit}
                className="space-y-4 mt-2"
              >
                <div className="border-t border-stone-200 pt-6">
                  <h3 className="font-serif text-2xl text-ink mb-4">
                    Your Information
                  </h3>

                  {/* Selected Product */}
                  <div className="mb-5 border border-stone-200 bg-stone-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-ink">
                          {product.title}
                        </p>

                        <p className="mt-1 text-xs text-stone-500">
                          Size: {selectedSize} · Quantity: {qty}
                        </p>
                      </div>

                      <span className="text-sm font-medium text-ink">
                        {money(product.price * qty)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full Name" required>
                    <input
                      type="text"
                      required
                      value={form.customer_name}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          customer_name: e.target.value,
                        })
                      }
                      className="premium-input"
                    />
                  </Field>

                  <Field label="Phone Number" required>
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
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email" required>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          email: e.target.value,
                        })
                      }
                      className="premium-input"
                    />
                  </Field>

                  <Field label="City" required>
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
                </div>

                <Field label="Address" required>
                  <input
                    type="text"
                    required
                    value={form.address}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        address: e.target.value,
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
                        street: e.target.value,
                      })
                    }
                    className="premium-input"
                  />
                </Field>

                {/* Payment */}
                <div className="border-t border-stone-200 pt-5">
                  <h3 className="mb-3 text-xs uppercase tracking-widest text-stone-500">
                    Payment
                  </h3>

                  <PaymentMethodPicker
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                    proofPath={paymentProof}
                    onProofChange={setPaymentProof}
                    amountDue={
                      payingForItemsUpfront
                        ? money(
                            product.price * qty +
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
                          Delivery charge — pay in advance
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-stone-600">
                          Send {money(deliveryFee)} to the{' '}
                          {advanceMethod.label} account below and
                          attach the screenshot. Your item is still
                          paid in cash when the parcel arrives. We
                          dispatch as soon as the transfer is verified.
                        </p>

                        <dl className="mt-3 space-y-1.5 border-t border-gold/30 pt-3">
                          {advanceMethod.details.map(
                            (detail) => (
                              <DetailRow
                                key={detail.label}
                                detail={detail}
                              />
                            )
                          )}

                          <div className="flex items-center justify-between gap-3 border-t border-gold/30 pt-2 text-sm">
                            <span className="text-stone-500">
                              Amount to send
                            </span>

                            <span className="font-medium text-ink">
                              {money(deliveryFee)}
                            </span>
                          </div>
                        </dl>

                        <div className="mt-3">
                          <PaymentProofUpload
                            path={paymentProof}
                            onChange={setPaymentProof}
                          />
                        </div>
                      </div>
                    )}
                </div>

                {/* Order Notes */}
                <Field label="Order Notes (optional)">
                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        notes: e.target.value,
                      })
                    }
                    rows={3}
                    className="premium-input resize-none"
                  />
                </Field>

                {/* Order Total */}
                <div className="border-t border-stone-200 pt-4">
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
                            ? money(deliveryFee)
                            : 'Enter your city'}
                    </span>
                  </div>

                  {deliveryFee > 0 && (
                    <p className="mb-2 text-right text-[11px] text-stone-500">
                      {deliveryZoneLabel(form.city)}
                    </p>
                  )}

                  <div className="flex items-center justify-between border-t border-stone-200 pt-2.5 text-sm">
                    <span className="font-medium text-ink">
                      Total
                    </span>

                    <span className="text-base font-medium text-ink">
                      {money(
                        product.price * qty +
                          deliveryFee
                      )}
                    </span>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-4 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-gold text-cream px-8 py-4 text-sm uppercase tracking-widest hover:bg-gold-dark transition-all disabled:opacity-50"
                  >
                    {submitting
                      ? 'Placing Order...'
                      : 'Confirm Order'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setShowOrder(false)
                    }
                    className="border border-stone-300 px-6 py-4 text-sm uppercase tracking-widest hover:border-stone-400 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Customer Reviews */}
        <ProductReviews productId={product.id} />
      </div>
    </div>
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
      <span className="text-xs uppercase tracking-widest text-stone-500 mb-2 block">
        {label}{' '}
        {required && (
          <span className="text-gold">*</span>
        )}
      </span>

      {children}
    </label>
  );
}