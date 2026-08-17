import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import {
  ArrowRight,
  Footprints,
  Gem,
  Glasses,
  Scissors,
  Shirt,
  ShoppingBag,
  Sparkles,
  Truck,
  Watch,
} from 'lucide-react';
import { supabase, BRAND } from '@/lib/supabase';
import type { Category, Product } from '@/lib/types';
import ProductCard from '@/components/ProductCard';
import HeroBackdrop from '@/components/HeroBackdrop';
import { FREE_DELIVERY_THRESHOLD } from '@/lib/cart';
import { SITE_URL, useSeo } from '@/lib/seo';

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * Always animate with explicit from AND to values.
 *
 * `gsap.from()` reads the element's *current* computed value to use as the
 * tween's end point. Any element carrying a CSS `transition` can be mid-
 * transition at that moment (React StrictMode remounts effects, which reverts
 * and re-applies the tween), so GSAP reads the half-faded value — and an
 * element can end up animating 0 → 0 and stay invisible for good.
 */
const HIDDEN = { opacity: 0 };
const SHOWN = { opacity: 1 };

const ROTATING_WORDS = ['Jewellery', 'Clothing', 'Bags', 'Shoes'];

const CINEMA_FRAMES = [
  {
    src: 'https://images.pexels.com/photos/1454171/pexels-photo-1454171.jpeg?auto=compress&cs=tinysrgb&w=1600',
    label: 'Jewellery',
    line: 'Light, caught and held.',
  },
  {
    src: 'https://images.pexels.com/photos/7679720/pexels-photo-7679720.jpeg?auto=compress&cs=tinysrgb&w=1600',
    label: 'Clothing',
    line: 'Fabric that moves with you.',
  },
  {
    src: 'https://images.pexels.com/photos/904350/pexels-photo-904350.jpeg?auto=compress&cs=tinysrgb&w=1600',
    label: 'Bags',
    line: 'Carried, never compromised.',
  },
  {
    src: 'https://images.pexels.com/photos/267301/pexels-photo-267301.jpeg?auto=compress&cs=tinysrgb&w=1600',
    label: 'Shoes',
    line: 'Every step, considered.',
  },
];

const MARQUEE_WORDS = ['Jewellery', 'Clothing', 'Bags', 'Shoes', 'New Arrivals'];

export default function Home() {
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const cinemaRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowMotion] = useState(
    () => typeof window === 'undefined' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  // Tells Google this is a shop, who runs it and how to reach it.
  const storeJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'Store',
      name: BRAND.name,
      description: `${BRAND.name} — curated jewellery, clothing, bags and shoes, delivered across Pakistan.`,
      url: SITE_URL || undefined,
      telephone: `+92${BRAND.whatsapp.replace(/^0/, '').replace(/\D/g, '')}`,
      email: BRAND.email,
      sameAs: [BRAND.instagram, BRAND.facebook],
      address: { '@type': 'PostalAddress', addressCountry: 'PK' },
      areaServed: 'PK',
      currenciesAccepted: 'PKR',
      paymentAccepted: 'Cash on Delivery',
    }),
    []
  );

  useSeo({
    title: `${BRAND.name} — Pakistan's No.1 Online Jewellery & Clothing Store`,
    exactTitle: true,
    description: `Shop jewellery, clothing, bags & accessories online at ${BRAND.name} — Pakistan's No.1 online store. Cash on delivery, free delivery over Rs ${FREE_DELIVERY_THRESHOLD.toLocaleString('en-PK')}.`,
    path: '/',
    jsonLd: storeJsonLd,
  });

  useEffect(() => {
    // The effect runs twice under StrictMode. Without this guard the discarded
    // first run can resolve last and overwrite good data with an empty list,
    // blanking the categories and products.
    let cancelled = false;

    Promise.all([
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(8),
    ]).then(([catRes, prodRes]) => {
      if (cancelled) return;
      if (catRes.error) console.error('Failed to load categories:', catRes.error);
      if (prodRes.error) console.error('Failed to load products:', prodRes.error);
      // Only replace what actually came back — a failed call keeps what we have.
      if (catRes.data) setCategories(catRes.data);
      if (prodRes.data) setProducts(prodRes.data);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------------------------------------------------------- hero */
  useLayoutEffect(() => {
    if (!heroRef.current) return;
    const ctx = gsap.context(() => {
      const heading = heroRef.current!.querySelector('.hero-heading') as HTMLElement;
      const split = new SplitText(heading, { type: 'chars,lines', linesClass: 'split-line' });

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo('.hero-eyebrow', { ...HIDDEN, y: 20 }, { ...SHOWN, y: 0, duration: 0.8 }, 0.2)
        .fromTo(
          split.chars,
          { ...HIDDEN, yPercent: 120 },
          { ...SHOWN, yPercent: 0, duration: 1, stagger: 0.025, ease: 'power4.out' },
          0.35
        )
        .fromTo('.hero-roller', { ...HIDDEN, y: 20 }, { ...SHOWN, y: 0, duration: 0.7 }, '-=0.5')
        .fromTo('.hero-sub', { ...HIDDEN, y: 24 }, { ...SHOWN, y: 0, duration: 0.8 }, '-=0.45')
        .fromTo(
          '.hero-pill',
          { ...HIDDEN, y: 20, scale: 0.94 },
          { ...SHOWN, y: 0, scale: 1, duration: 0.7 },
          '-=0.5'
        )
        .fromTo(
          '.hero-cta',
          { ...HIDDEN, y: 24 },
          { ...SHOWN, y: 0, duration: 0.7, stagger: 0.1 },
          '-=0.4'
        )
        .fromTo('.hero-scroll', HIDDEN, { ...SHOWN, duration: 0.6 }, '-=0.2');

      // Word roller — cycles the four departments. The track repeats its first
      // word at the end, so the loop can snap back invisibly.
      if (allowMotion) {
        const steps = ROTATING_WORDS.length; // track has steps + 1 children
        const stepPct = 100 / (steps + 1);
        const roll = gsap.timeline({ repeat: -1, delay: 1.6 });
        for (let i = 1; i <= steps; i++) {
          roll.to('.roller-track', {
            yPercent: -stepPct * i,
            duration: 0.7,
            ease: 'power3.inOut',
            delay: 1.7,
          });
        }
        roll.set('.roller-track', { yPercent: 0 });
      }

      // Hero drifts away as the page scrolls on.
      gsap.to('.hero-stage', {
        yPercent: 18,
        opacity: 0.15,
        scale: 0.94,
        ease: 'none',
        scrollTrigger: { trigger: heroRef.current, start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.to('.hero-content', {
        yPercent: -35,
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: heroRef.current, start: 'top top', end: '70% top', scrub: true },
      });

      return () => split.revert();
    }, heroRef);
    return () => ctx.revert();
  }, [allowMotion]);

  /* ------------------------------------------------------------- marquee */
  useLayoutEffect(() => {
    if (!marqueeRef.current || !allowMotion) return;
    const ctx = gsap.context(() => {
      const loop = gsap.to('.marquee-track', {
        xPercent: -50,
        duration: 22,
        ease: 'none',
        repeat: -1,
      });

      // Scroll speed drives the ticker — faster scroll, faster words.
      ScrollTrigger.create({
        trigger: marqueeRef.current,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (self) => {
          const v = gsap.utils.clamp(-6, 6, self.getVelocity() / 250);
          gsap.to(loop, { timeScale: 1 + Math.abs(v), duration: 0.4, overwrite: true });
          // Skew a wrapper, never the track itself: an `overwrite: true` tween
          // on the track would kill the infinite scroll tween running on it and
          // the marquee would stop dead at the first scroll.
          gsap.to('.marquee-skew', {
            skewX: gsap.utils.clamp(-6, 6, v),
            duration: 0.4,
            overwrite: 'auto',
          });
        },
        onLeave: () => gsap.to(loop, { timeScale: 1, duration: 0.6 }),
      });
    }, marqueeRef);
    return () => ctx.revert();
  }, [allowMotion]);

  /* ---------------------------------------------- reveals + cinema + band */
  useLayoutEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      // Section headings animate word by word.
      const splits: SplitText[] = [];
      gsap.utils.toArray<HTMLElement>('.reveal-title').forEach((el) => {
        const split = new SplitText(el, { type: 'words,lines', linesClass: 'split-line' });
        splits.push(split);
        gsap.fromTo(
          split.words,
          { ...HIDDEN, yPercent: 115 },
          {
            ...SHOWN,
            yPercent: 0,
            duration: 0.9,
            stagger: 0.07,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          }
        );
      });

      // The story mark turns slowly, forever.
      gsap.to('.story-sparkle', { rotate: 360, duration: 26, ease: 'none', repeat: -1 });

      // Generic reveals.
      gsap.utils.toArray<HTMLElement>('.reveal').forEach((el) => {
        gsap.fromTo(
          el,
          { ...HIDDEN, y: 60 },
          {
            ...SHOWN,
            y: 0,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          }
        );
      });

      gsap.utils.toArray<HTMLElement>('.reveal-group').forEach((group) => {
        gsap.fromTo(
          group.children,
          { ...HIDDEN, y: 70 },
          {
            ...SHOWN,
            y: 0,
            duration: 0.9,
            stagger: 0.12,
            ease: 'power3.out',
            scrollTrigger: { trigger: group, start: 'top 82%', once: true },
          }
        );
      });

      // Free-delivery counter ticks up to the threshold.
      if (counterRef.current) {
        const obj = { v: 0 };
        gsap.to(obj, {
          v: FREE_DELIVERY_THRESHOLD,
          duration: 1.6,
          ease: 'power2.out',
          scrollTrigger: { trigger: counterRef.current, start: 'top 85%', once: true },
          onUpdate: () => {
            if (counterRef.current) {
              counterRef.current.textContent = Math.round(obj.v).toLocaleString('en-PK');
            }
          },
        });
      }

      // Delivery truck drives across the promo band.
      gsap.fromTo(
        '.promo-truck',
        { xPercent: -140 },
        {
          xPercent: 140,
          ease: 'none',
          scrollTrigger: { trigger: '.promo-band', start: 'top bottom', end: 'bottom top', scrub: 1 },
        }
      );

      // Cinematic reel: pinned on desktop so scrolling scrubs through the frames
      // like a film. On mobile the frames simply stack and scroll normally.
      const mm = gsap.matchMedia();
      mm.add('(min-width: 768px)', () => {
        if (!cinemaRef.current) return;
        const frames = gsap.utils.toArray<HTMLElement>('.cinema-frame');

        // Every frame after the first starts hidden, revealed by a wipe.
        gsap.set(frames.slice(1), { clipPath: 'inset(100% 0% 0% 0%)' });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: cinemaRef.current,
            start: 'top top',
            end: `+=${frames.length * 90}%`,
            pin: true,
            scrub: 1,
            anticipatePin: 1,
          },
        });

        frames.forEach((frame, i) => {
          const img = frame.querySelector('.cinema-img');
          const caption = frame.querySelector('.cinema-caption');
          if (i > 0) {
            tl.to(frame, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power2.inOut' });
          }
          tl.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 1.2, ease: 'none' }, i > 0 ? '<' : '>')
            .fromTo(
              caption,
              { y: 40, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' },
              '<0.15'
            );
          if (i < frames.length - 1) {
            tl.to(caption, { y: -30, opacity: 0, duration: 0.4, ease: 'power2.in' }, '>0.4');
          }
        });
      });

      return () => {
        mm.revert();
        splits.forEach((s) => s.revert());
      };
    }, rootRef);
    return () => ctx.revert();
  }, [loading]);

  // Layout shifts once products land — let ScrollTrigger recompute.
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => ScrollTrigger.refresh(), 120);
    return () => clearTimeout(t);
  }, [loading]);

  const newArrivals = products.filter((p) => p.is_new_arrival).slice(0, 4);
  const featured = newArrivals.length > 0 ? newArrivals : products.slice(0, 4);

  // Real shop photography for the hero's floating frames.
  const productImages = products
    .map((p) => p.image_url)
    .filter((url): url is string => Boolean(url));

  // Keep only leaf categories — parents with subcategories are nav-only.
  const displayCategories = categories.filter(
    (cat) => !categories.some((c) => c.parent_id === cat.id)
  );


  return (
    <div ref={rootRef} className="overflow-x-hidden">
      {/* ============================================================ HERO */}
      <section ref={heroRef} className="relative h-[100svh] min-h-[600px] overflow-hidden bg-ink">
        <div className="hero-stage absolute inset-0">
          <HeroBackdrop productImages={productImages} allowMotion={allowMotion} />
        </div>

        {/* Vignette + a soft scrim under the copy so the type always wins */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(26,22,20,0.85)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-[12%] h-[62%] bg-[radial-gradient(ellipse_50%_50%_at_50%_45%,rgba(26,22,20,0.72)_0%,rgba(26,22,20,0.35)_55%,transparent_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink to-transparent" />

        {/* pt clears the fixed header — the copy must never sit under the nav */}
        <div className="hero-content relative z-10 flex h-full flex-col items-center justify-center px-6 pt-28 pb-16 text-center md:pt-32 md:pb-20">
          <p className="hero-eyebrow mb-5 text-[11px] uppercase tracking-[0.45em] text-gold">
            {BRAND.name}
          </p>

          <h1 className="hero-heading max-w-4xl text-balance font-serif text-cream">
            Curated Luxury <span className="italic text-gold-light">Crafted for You</span>
          </h1>

          {/* Rotating department word */}
          <div className="hero-roller mt-7 flex items-center gap-3 text-sm uppercase tracking-[0.3em] text-cream/60">
            <span>Shop</span>
            <span className="relative h-7 overflow-hidden">
              <span className="roller-track flex flex-col">
                {[...ROTATING_WORDS, ROTATING_WORDS[0]].map((w, i) => (
                  <span key={`${w}-${i}`} className="flex h-7 flex-shrink-0 items-center text-gold-light">
                    {w}
                  </span>
                ))}
              </span>
            </span>
          </div>

          <p className="hero-sub mt-7 max-w-md text-base leading-relaxed text-cream/70">
            Jewellery, clothing, bags and shoes — each piece selected for the discerning few.
          </p>

          {/* Free delivery headline */}
          <div className="hero-pill mt-8 inline-flex items-center gap-3 rounded-full border border-gold/40 bg-gold/10 px-6 py-3 backdrop-blur-sm">
            <Truck className="h-4 w-4 flex-shrink-0 text-gold-light" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-cream sm:text-xs">
              Shop upto Rs {FREE_DELIVERY_THRESHOLD.toLocaleString('en-PK')} and get{' '}
              <span className="font-medium text-gold-light">Free Delivery</span>
            </span>
          </div>

          <div className="hero-actions mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              to="/new-arrivals"
              className="hero-cta group flex items-center justify-center gap-2 bg-gold px-8 py-4 text-sm uppercase tracking-widest text-cream transition-colors duration-300 hover:bg-gold-dark"
            >
              Explore Collection
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#collections"
              className="hero-cta flex items-center justify-center gap-2 border border-cream/30 px-8 py-4 text-sm uppercase tracking-widest text-cream transition-colors duration-300 hover:border-gold hover:text-gold"
            >
              Browse Categories
            </a>
          </div>
        </div>

        <div className="hero-scroll absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-cream/50">
          <span className="text-[10px] uppercase tracking-widest">Scroll</span>
          <span className="scroll-line block h-12 w-px bg-cream/30" />
        </div>
      </section>

      {/* ========================================================= MARQUEE */}
      <div ref={marqueeRef} className="overflow-hidden border-y border-gold/20 bg-ink py-4 md:py-5">
        <div className="marquee-skew">
          <div className="marquee-track flex w-max whitespace-nowrap">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex" aria-hidden={copy === 1}>
                {MARQUEE_WORDS.map((word, i) => (
                  <span key={`${copy}-${i}`} className="flex items-center gap-5 px-5 md:gap-7 md:px-7">
                    <span className="font-serif text-xl italic text-cream/90 md:text-3xl">{word}</span>
                    <Sparkles className="h-3.5 w-3.5 text-gold md:h-4 md:w-4" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===================================================== CATEGORIES */}
      <section id="collections" className="scroll-mt-24 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <p className="reveal mb-3 text-xs uppercase tracking-[0.3em] text-gold">Our Collections</p>
            <h2 className="reveal-title font-serif text-4xl text-ink md:text-5xl">Explore by Category</h2>
          </div>

          <div className="reveal-group grid gap-6 md:grid-cols-3" style={{ perspective: '1200px' }}>
            {displayCategories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} allowMotion={allowMotion} />
            ))}
          </div>
        </div>
      </section>

      {/* =================================================== NEW ARRIVALS */}
      <section className="bg-stone-50 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex flex-col justify-between md:flex-row md:items-end">
            <div>
              <p className="reveal mb-3 text-xs uppercase tracking-[0.3em] text-gold">Just In</p>
              <h2 className="reveal-title font-serif text-4xl text-ink md:text-5xl">New Arrivals</h2>
            </div>
            <Link
              to="/new-arrivals"
              className="reveal group mt-4 flex items-center gap-2 text-sm uppercase tracking-widest text-ink transition-colors hover:text-gold md:mt-0"
            >
              View All <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton aspect-[3/4] rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="reveal-group grid grid-cols-2 gap-8 md:grid-cols-4">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ================================================== CINEMATIC REEL */}
      <section ref={cinemaRef} className="relative bg-ink md:h-[100svh] md:overflow-hidden">
        {CINEMA_FRAMES.map((frame, i) => (
          <div
            key={frame.label}
            className="cinema-frame relative h-[70svh] overflow-hidden md:absolute md:inset-0 md:h-full"
            style={{ zIndex: i + 1, willChange: 'clip-path' }}
          >
            <img
              src={frame.src}
              alt={frame.label}
              loading={i === 0 ? 'eager' : 'lazy'}
              className="cinema-img h-full w-full object-cover opacity-70"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/60" />
            <div className="cinema-caption absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <p className="mb-4 text-[11px] uppercase tracking-[0.45em] text-gold">
                {String(i + 1).padStart(2, '0')} — {frame.label}
              </p>
              <h3 className="max-w-3xl font-serif text-4xl leading-tight text-cream md:text-7xl">
                {frame.line}
              </h3>
            </div>
          </div>
        ))}

        <div className="relative z-20 flex justify-center py-12 md:absolute md:inset-x-0 md:bottom-10 md:py-0">
          <Link
            to="/new-arrivals"
            className="inline-flex items-center gap-2 bg-gold px-8 py-4 text-sm uppercase tracking-widest text-cream transition-all duration-300 hover:bg-gold-dark"
          >
            Shop The Look <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ================================================== FREE DELIVERY */}
      <section className="promo-band relative overflow-hidden bg-gold px-6 py-20">
        <Truck className="promo-truck pointer-events-none absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 text-cream/10" />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <p className="reveal mb-4 text-xs uppercase tracking-[0.4em] text-cream/70">
            Nationwide Delivery
          </p>
          <h2 className="reveal font-serif text-4xl leading-tight text-cream md:text-6xl">
            {/* Renders the real figure up front, so it still reads correctly
                if the count-up animation never runs. */}
            Shop upto Rs{' '}
            <span ref={counterRef}>{FREE_DELIVERY_THRESHOLD.toLocaleString('en-PK')}</span> and get{' '}
            <span className="italic">Free Delivery</span>
          </h2>
          <p className="reveal mx-auto mt-6 max-w-xl leading-relaxed text-cream/80">
            Reach Rs {FREE_DELIVERY_THRESHOLD.toLocaleString('en-PK')} in your bag and we cover the
            delivery — anywhere in Pakistan. Cash on delivery available on every order.
          </p>
          <Link
            to="/new-arrivals"
            className="reveal mt-10 inline-flex items-center gap-2 bg-ink px-8 py-4 text-sm uppercase tracking-widest text-cream transition-colors duration-300 hover:bg-ink/80"
          >
            Start Shopping <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ==================================================== BRAND STORY */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-4xl text-center">
          <Sparkles className="story-sparkle mx-auto mb-6 h-8 w-8 text-gold" />
          <h2 className="reveal-title mb-6 font-serif text-4xl text-ink md:text-5xl">
            The BM Collection Story
          </h2>
          <p className="reveal text-lg leading-relaxed text-stone-600">
            At BM Collection, we believe luxury is found in the details. Each piece in our collection is
            hand-selected for its quality, craftsmanship, and timeless appeal. From delicate jewellery to
            statement bags, elegant clothing and shoes made to be walked in, we curate with intention — so
            you can express your unique style with confidence.
          </p>
          <a
            href={BRAND.instagram}
            target="_blank"
            rel="noreferrer"
            className="reveal mt-8 inline-flex items-center gap-2 text-sm uppercase tracking-widest text-gold transition-colors hover:text-gold-dark"
          >
            Follow Our Journey <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ bits */

function CategoryCard({ category, allowMotion }: { category: Category; allowMotion: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const Icon = iconFor(category.slug, category.name);

  const handleMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!allowMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(ref.current, {
      rotateY: px * 10,
      rotateX: -py * 10,
      scale: 1.02,
      duration: 0.5,
      ease: 'power3.out',
      transformPerspective: 1000,
    });
  };

  const handleLeave = () => {
    if (!ref.current) return;
    gsap.to(ref.current, { rotateY: 0, rotateX: 0, scale: 1, duration: 0.7, ease: 'power3.out' });
  };

  return (
    <Link
      ref={ref}
      to={`/shop/${category.slug}`}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="image-zoom premium-shadow group relative block aspect-[4/5] overflow-hidden rounded-xl will-change-transform"
    >
      <img
        src={category.image_url ?? categoryImage(category.slug, category.name)}
        alt={category.name}
        loading="lazy"
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-8 text-center">
        <Icon className="mx-auto mb-3 h-7 w-7 text-gold" />
        <h3 className="mb-1 font-serif text-2xl text-cream">{category.name}</h3>
        {category.description && <p className="mb-4 text-sm text-cream/60">{category.description}</p>}
        <span className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gold transition-all group-hover:gap-3">
          Discover <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

/**
 * Category tile artwork and icon.
 *
 * These are fallbacks only — whatever the admin dashboard sets as a category's
 * `image_url` always wins. Matching is done on slug + name so it keeps working
 * when new categories are added. Order matters: the more specific patterns
 * (watches, glasses, hair) are tested before the broad ones.
 */
const CATEGORY_MATCHERS: Array<{ test: RegExp; photo: string; icon: typeof Gem }> = [
  { test: /watch|wrist/, photo: '236915', icon: Watch },
  { test: /glass|sunglass|eyewear|shade|spec/, photo: '343720', icon: Glasses },
  { test: /hair|clip|scrunchie|headband|pin/, photo: '973401', icon: Scissors },
  { test: /shoe|heel|footwear|sandal|sneaker|khussa/, photo: '1598505', icon: Footprints },
  { test: /bag|wallet|purse|clutch|pouch/, photo: '1152077', icon: ShoppingBag },
  { test: /key ?chain|key ?ring|charm/, photo: '322207', icon: Sparkles },
  { test: /jewel|ring|neck|earring|bangle|bracelet|pendant|stud/, photo: '1721937', icon: Gem },
  { test: /kid|child|baby|infant|toddler/, photo: '5560019', icon: Shirt },
  { test: /\bmen\b|mens|gent|male|boy/, photo: '297933', icon: Shirt },
  { test: /women|ladies|girl|dress|abaya|kurta|frock|cloth|apparel|wear|suit/, photo: '1926769', icon: Shirt },
];

// For categories none of the above match — varied so the grid never repeats.
const GENERIC_PHOTOS = ['322207', '1030946', '1927259', '1191531'];

function matchCategory(slug: string, name: string) {
  const key = `${slug} ${name}`.toLowerCase().replace(/[-_/]+/g, ' ');
  return CATEGORY_MATCHERS.find((m) => m.test.test(key));
}

function iconFor(slug: string, name: string) {
  return matchCategory(slug, name)?.icon ?? Sparkles;
}

function categoryImage(slug: string, name: string): string {
  const matched = matchCategory(slug, name);
  const hash = [...slug].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const id = matched?.photo ?? GENERIC_PHOTOS[hash % GENERIC_PHOTOS.length];
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800`;
}
