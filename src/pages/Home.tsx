import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Sparkles, Gem, Shirt, ShoppingBag } from 'lucide-react';
import { supabase, BRAND } from '@/lib/supabase';
import type { Category, Product } from '@/lib/types';
import ProductCard from '@/components/ProductCard';

gsap.registerPlugin(ScrollTrigger);

const categoryIcons: Record<string, typeof Gem> = {
  jewellery: Gem,
  clothing: Shirt,
  bags: ShoppingBag,
};

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(8),
    ]).then(([catRes, prodRes]) => {
      setCategories(catRes.data ?? []);
      setProducts(prodRes.data ?? []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!heroRef.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.hero-line', { y: 100, opacity: 0, duration: 1.2, stagger: 0.15 })
        .from('.hero-sub', { y: 30, opacity: 0, duration: 0.8 }, '-=0.5')
        .from('.hero-cta', { y: 30, opacity: 0, duration: 0.8, stagger: 0.1 }, '-=0.4')
        .from('.hero-scroll', { opacity: 0, duration: 0.6 }, '-=0.3');

      gsap.to('.hero-image', {
        scale: 1.1,
        ease: 'none',
        scrollTrigger: { trigger: heroRef.current, start: 'top top', end: 'bottom top', scrub: true },
      });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  const newArrivals = products.filter((p) => p.is_new_arrival).slice(0, 4);
  const featured = newArrivals.length > 0 ? newArrivals : products.slice(0, 4);

  return (
    <div>
      {/* Hero */}
      <section ref={heroRef} className="relative h-screen overflow-hidden bg-ink">
        <div className="hero-image absolute inset-0">
          <img
            src="https://images.pexels.com/photos/994517/pexels-photo-994517.jpeg?auto=compress&cs=tinysrgb&w=1920"
            alt="Luxury jewellery"
            className="h-full w-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/50 via-ink/30 to-ink/80" />
        </div>

        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center px-6">
          <p className="hero-sub text-xs uppercase tracking-[0.4em] text-gold mb-6">BM Collection</p>
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl text-cream leading-[1.1] max-w-4xl text-balance">
            <span className="hero-line block overflow-hidden">Curated Luxury</span>
            <span className="hero-line block overflow-hidden italic text-gold-light">Crafted for You</span>
          </h1>
          <p className="hero-sub mt-8 max-w-md text-cream/70 text-base leading-relaxed">
            Discover an exquisite collection of jewellery, clothing, and bags — each piece selected for the discerning few.
          </p>
          <div className="hero-cta mt-10 flex flex-col sm:flex-row gap-4">
            <Link
              to="/shop/jewellery"
              className="group flex items-center gap-2 bg-gold text-cream px-8 py-4 text-sm uppercase tracking-widest hover:bg-gold-dark transition-all duration-300"
            >
              Explore Collection
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/new-arrivals"
              className="flex items-center gap-2 border border-cream/30 text-cream px-8 py-4 text-sm uppercase tracking-widest hover:border-gold hover:text-gold transition-all duration-300"
            >
              New Arrivals
            </Link>
          </div>
        </div>

        <div className="hero-scroll absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-cream/50">
          <span className="text-[10px] uppercase tracking-widest">Scroll</span>
          <div className="h-12 w-px bg-cream/30 animate-pulse" />
        </div>
      </section>

      {/* Categories */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.3em] text-gold mb-3">Our Collections</p>
            <h2 className="font-serif text-4xl md:text-5xl text-ink">Explore by Category</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {categories.map((cat, i) => {
              const Icon = categoryIcons[cat.slug] ?? Sparkles;
              return (
                <Link
                  key={cat.id}
                  to={`/shop/${cat.slug}`}
                  className="group relative aspect-[4/5] overflow-hidden rounded-xl image-zoom premium-shadow"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <img
                    src={cat.image_url ?? `https://images.pexels.com/photos/${getCategoryImage(cat.slug)}/pexels-photo-${getCategoryImage(cat.slug)}.jpeg?auto=compress&cs=tinysrgb&w=800`}
                    alt={cat.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8 text-center">
                    <Icon className="mx-auto h-7 w-7 text-gold mb-3" />
                    <h3 className="font-serif text-2xl text-cream mb-1">{cat.name}</h3>
                    <p className="text-sm text-cream/60 mb-4">{cat.description}</p>
                    <span className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gold group-hover:gap-3 transition-all">
                      Discover <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      <section className="py-24 px-6 bg-stone-50">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gold mb-3">Just In</p>
              <h2 className="font-serif text-4xl md:text-5xl text-ink">New Arrivals</h2>
            </div>
            <Link to="/new-arrivals" className="group flex items-center gap-2 text-sm uppercase tracking-widest text-ink hover:text-gold transition-colors mt-4 md:mt-0">
              View All <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-8 grid-cols-2 md:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-lg skeleton" />
              ))}
            </div>
          ) : (
            <div className="grid gap-8 grid-cols-2 md:grid-cols-4">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Video Showcase Section */}
      <section className="relative py-28 px-6 bg-ink overflow-hidden">
        <div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover"
          >
            {/* Place your video file inside the public folder (e.g. /public/promo.mp4) or paste a direct storage link */}
            <source src="/promo.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink" />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-gold mb-4">Cinematic Experience</p>
          <h2 className="font-serif text-4xl md:text-6xl text-cream mb-6">The Art of Refinement</h2>
          <p className="text-cream/70 text-lg leading-relaxed max-w-2xl mx-auto mb-10">
            Witness our pieces come to life. Designed to capture light, command presence, and elevate your everyday wardrobe.
          </p>
          <Link
            to="/shop/jewellery"
            className="inline-flex items-center gap-2 bg-gold text-cream px-8 py-4 text-sm uppercase tracking-widest hover:bg-gold-dark transition-all duration-300"
          >
            Shop The Look <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Brand Story */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <Sparkles className="mx-auto h-8 w-8 text-gold mb-6" />
          <h2 className="font-serif text-4xl md:text-5xl text-ink mb-6">The BM Collection Story</h2>
          <p className="text-stone-600 text-lg leading-relaxed">
            At BM Collection, we believe luxury is found in the details. Each piece in our collection is hand-selected
            for its quality, craftsmanship, and timeless appeal. From delicate jewellery to statement bags and elegant
            clothing, we curate with intention — so you can express your unique style with confidence.
          </p>
          <a
            href={BRAND.instagram}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex items-center gap-2 text-sm uppercase tracking-widest text-gold hover:text-gold-dark transition-colors"
          >
            Follow Our Journey <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>
    </div>
  );
}

function getCategoryImage(slug: string): string {
  const map: Record<string, string> = {
    jewellery: '1454171',
    clothing: '7679720',
    bags: '904350',
  };
  return map[slug] ?? '994517';
}