import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Category, Product } from '@/lib/types';
import ProductCard from '@/components/ProductCard';
import { ArrowRight } from 'lucide-react';

export default function Shop() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    const formattedSlug = slug.trim();

    // Use .ilike() for case-insensitive slug matching (e.g. "Women" matches "women")
    supabase
      .from('categories')
      .select('*')
      .ilike('slug', formattedSlug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching category:', error);
        }

        setCategory(data);

        if (data) {
          supabase
            .from('products')
            .select('*')
            .eq('category_id', data.id)
            .order('created_at', { ascending: false })
            .then(({ data: prods, error: prodError }) => {
              if (prodError) {
                console.error('Error fetching products:', prodError);
              }
              setProducts(prods ?? []);
              setLoading(false);
            });
        } else {
          setProducts([]);
          setLoading(false);
        }
      });
  }, [slug]);

  return (
    <div className="pt-28 pb-16 px-6">
      <div className="mx-auto max-w-7xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs uppercase tracking-widest text-stone-500 mb-8">
          <Link to="/" className="hover:text-gold transition-colors">Home</Link>
          <span>/</span>
          <span className="text-ink">{category?.name ?? 'Shop'}</span>
        </nav>

        {/* Category header */}
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.3em] text-gold mb-3">Collection</p>
          <h1 className="font-serif text-5xl md:text-6xl text-ink mb-4">{category?.name ?? 'All Products'}</h1>
          <p className="text-stone-600 max-w-xl mx-auto">{category?.description}</p>
        </div>

        {/* Products grid */}
        {loading ? (
          <div className="grid gap-8 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i}>
                <div className="aspect-[3/4] rounded-lg skeleton" />
                <div className="h-4 mt-4 skeleton rounded" />
                <div className="h-3 mt-2 skeleton rounded w-2/3 mx-auto" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-stone-500 text-lg">No products in this collection yet.</p>
            <p className="text-stone-400 text-sm mt-2">Please check back soon — new pieces are arriving regularly.</p>
          </div>
        ) : (
          <div className="grid gap-8 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {/* Cross-links */}
        <div className="mt-20 flex flex-wrap justify-center gap-6">
          <Link to="/shop/accessories" className="text-xs uppercase tracking-widest text-stone-500 hover:text-gold transition-colors flex items-center gap-2">
            Accessories <ArrowRight className="h-3 w-3" />
          </Link>
          <Link to="/shop/women" className="text-xs uppercase tracking-widest text-stone-500 hover:text-gold transition-colors flex items-center gap-2">
            Women Clothing <ArrowRight className="h-3 w-3" />
          </Link>
          <Link to="/shop/bags-wallets" className="text-xs uppercase tracking-widest text-stone-500 hover:text-gold transition-colors flex items-center gap-2">
            Bags/Wallets <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}