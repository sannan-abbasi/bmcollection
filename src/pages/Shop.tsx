import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, BRAND } from '@/lib/supabase';
import type { Category, Product } from '@/lib/types';
import ProductCard from '@/components/ProductCard';
import { absoluteUrl, useSeo } from '@/lib/seo';
import { productPath } from '@/lib/slug';
import { ArrowRight } from 'lucide-react';

export default function Shop() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryName = category?.name ?? 'Shop';
  // Several categories have one-word descriptions in the database ("bags"),
  // which makes a useless search snippet — fall back to a written one unless
  // the stored text is substantial enough to stand on its own.
  const storedDescription = category?.description?.trim() ?? '';
  const writtenDescription = `Shop ${categoryName.toLowerCase()} at ${BRAND.name} — browse the latest pieces with cash on delivery across Pakistan and free delivery over Rs 5,000.`;

  // Breadcrumb so Google shows "Home › Bags/Wallets", plus the product list on
  // the page — both help this rank as a category page rather than a dead end.
  const categoryJsonLd = useMemo(() => {
    if (!category) return null;
    const categoryUrl = absoluteUrl(`/shop/${category.slug}`) ?? undefined;
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') ?? undefined },
            { '@type': 'ListItem', position: 2, name: category.name, item: categoryUrl },
          ],
        },
        {
          '@type': 'ItemList',
          name: category.name,
          numberOfItems: products.length,
          itemListElement: products.slice(0, 30).map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: p.title,
            url: absoluteUrl(productPath(p)) ?? undefined,
          })),
        },
      ],
    };
  }, [category, products]);

  useSeo({
    title: `${categoryName} — Buy Online in Pakistan`,
    description: storedDescription.length >= 60 ? storedDescription : writtenDescription,
    path: `/shop/${slug ?? ''}`,
    image: category?.image_url ?? products.find((p) => p.image_url)?.image_url ?? null,
    jsonLd: categoryJsonLd,
    // An unknown slug renders an empty shell — keep it out of the index.
    noindex: !loading && !category,
  });

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