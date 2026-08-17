import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/lib/types';
import ProductCard from '@/components/ProductCard';
import { useSeo } from '@/lib/seo';

export default function NewArrivals() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useSeo({
    title: 'New Arrivals — Latest Jewellery, Clothing & Bags',
    description:
      'The newest pieces at BM Collection — jewellery, clothing, bags and accessories, added weekly. Cash on delivery across Pakistan.',
    path: '/new-arrivals',
    image: products.find((p) => p.image_url)?.image_url ?? null,
  });

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .eq('is_new_arrival', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProducts(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="pt-28 pb-16 px-6">
      <div className="mx-auto max-w-7xl">
        <nav className="flex items-center gap-2 text-xs uppercase tracking-widest text-stone-500 mb-8">
          <Link to="/" className="hover:text-gold transition-colors">Home</Link>
          <span>/</span>
          <span className="text-ink">New Arrivals</span>
        </nav>

        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.3em] text-gold mb-3">Just In</p>
          <h1 className="font-serif text-5xl md:text-6xl text-ink mb-4">New Arrivals</h1>
          <p className="text-stone-600 max-w-xl mx-auto">
            The latest additions to our collection — fresh pieces curated for the season.
          </p>
        </div>

        {loading ? (
          <div className="grid gap-8 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-lg skeleton" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-stone-500 text-lg">No new arrivals at the moment.</p>
            <p className="text-stone-400 text-sm mt-2">Check back soon for fresh additions!</p>
          </div>
        ) : (
          <div className="grid gap-8 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
