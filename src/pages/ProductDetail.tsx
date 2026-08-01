import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase, BRAND } from '@/lib/supabase';
import type { Product } from '@/lib/types';
import { formatPrice } from '@/components/ProductCard';
import { useToast } from '@/lib/toast';
import { ArrowLeft, Check, MessageCircle, Sparkles } from 'lucide-react';
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

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOrder, setShowOrder] = useState(false);
  const [form, setForm] = useState<OrderForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [ordered, setOrdered] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        setProduct(data);
        setLoading(false);
      });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setSubmitting(true);

    const orderPayload = {
      product_id: product.id,
      product_title: product.title,
      product_price: product.price,
      customer_name: form.customer_name,
      email: form.email,
      phone: form.phone,
      city: form.city,
      address: form.address,
      street: form.street || null,
      notes: form.notes || null,
      status: 'pending',
    };

    const { error } = await supabase.from('orders').insert(orderPayload).select().single();
    setSubmitting(false);

    if (error) {
      console.error('Supabase Insert Error:', error);
      notify('Could not place your order. Please try again.', 'error');
    } else {
      setOrdered(true);
      notify('Order placed successfully! We will contact you shortly.', 'success');

      // Send instant email notification to admin via EmailJS
      emailjs.send(
        'service_mvfviau',
        'template_krdl205',
        {
          product_title: product.title,
          product_price: formatPrice(product.price),
          customer_name: form.customer_name,
          phone: form.phone,
          email: form.email,
          city: form.city,
          address: form.address,
          street: form.street || 'None',
          notes: form.notes || 'None',
        },
        '8qobEve1uR8ockQxe'
      ).catch((err) => console.error('Email alert failed:', err));
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
        <p className="text-stone-500 text-lg">Product not found.</p>
        <Link to="/" className="mt-4 inline-flex items-center gap-2 text-gold hover:text-gold-dark">
          <ArrowLeft className="h-4 w-4" /> Back to Home
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
          <h2 className="font-serif text-4xl text-ink mb-4">Thank You!</h2>
          <p className="text-stone-600 leading-relaxed mb-8">
            Your order for <span className="font-medium text-ink">{product.title}</span> has been received.
            Our team will contact you at <span className="font-medium">{form.phone}</span> shortly to confirm details.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/" className="text-sm uppercase tracking-widest border border-stone-300 px-6 py-3 hover:border-gold hover:text-gold transition-all">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-16 px-6">
      <div className="mx-auto max-w-6xl">
        <nav className="flex items-center gap-2 text-xs uppercase tracking-widest text-stone-500 mb-8">
          <Link to="/" className="hover:text-gold transition-colors">Home</Link>
          <span>/</span>
          <button onClick={() => navigate(-1)} className="hover:text-gold transition-colors">Back</button>
          <span>/</span>
          <span className="text-ink truncate">{product.title}</span>
        </nav>

        <div className="grid gap-12 md:grid-cols-2">
          {/* Image */}
          <div className="relative aspect-[3/4] overflow-hidden rounded-xl premium-shadow bg-stone-100">
            {product.image_url ? (
              <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Sparkles className="h-12 w-12 text-stone-300" />
              </div>
            )}
            {product.is_new_arrival && (
              <span className="absolute top-6 left-6 bg-ink/90 text-cream text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full">
                New Arrival
              </span>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col justify-center">
            <p className="text-xs uppercase tracking-[0.3em] text-gold mb-3">BM Collection</p>
            <h1 className="font-serif text-4xl md:text-5xl text-ink mb-4">{product.title}</h1>
            <p className="text-2xl text-stone-700 font-sans font-light mb-6">{formatPrice(product.price)}</p>

            {product.description && (
              <p className="text-stone-600 leading-relaxed mb-8">{product.description}</p>
            )}

            <div className="space-y-3 mb-8 text-sm text-stone-500">
              <div className="flex items-center gap-3">
                <Check className="h-4 w-4 text-gold" /> Premium quality guaranteed
              </div>
              <div className="flex items-center gap-3">
                <Check className="h-4 w-4 text-gold" /> Cash on delivery available
              </div>
            </div>

            {!showOrder ? (
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowOrder(true)}
                  className="flex items-center justify-center gap-2 bg-ink text-cream px-8 py-4 text-sm uppercase tracking-widest hover:bg-gold transition-all duration-300"
                >
                  Place Order
                </button>
                <a
                  href={`${BRAND.whatsappLink}?text=${encodeURIComponent(`Hi, I'm interested in ${product.title} (${formatPrice(product.price)}).`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 border border-stone-300 text-ink px-8 py-4 text-sm uppercase tracking-widest hover:border-gold hover:text-gold transition-all duration-300"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp Inquiry
                </a>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="border-t border-stone-200 pt-6">
                  <h3 className="font-serif text-2xl text-ink mb-4">Your Information</h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full Name" required>
                    <input
                      type="text"
                      required
                      value={form.customer_name}
                      onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                      className="premium-input"
                    />
                  </Field>
                  <Field label="Phone Number" required>
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="premium-input"
                    />
                  </Field>
                  <Field label="City" required>
                    <input
                      type="text"
                      required
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="premium-input"
                    />
                  </Field>
                </div>

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

                <Field label="Order Notes (optional)">
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                    className="premium-input resize-none"
                  />
                </Field>

                <div className="flex gap-4 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-gold text-cream px-8 py-4 text-sm uppercase tracking-widest hover:bg-gold-dark transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Placing Order...' : 'Confirm Order'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOrder(false)}
                    className="border border-stone-300 px-6 py-4 text-sm uppercase tracking-widest hover:border-stone-400 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Customer Reviews Section */}
        <ProductReviews productId={product.id} />
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-stone-500 mb-2 block">
        {label} {required && <span className="text-gold">*</span>}
      </span>
      {children}
    </label>
  );
}