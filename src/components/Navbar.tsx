import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Menu, X, Instagram, ShoppingCart, ChevronDown } from 'lucide-react';
import { supabase, BRAND } from '@/lib/supabase';
import { useCart } from '@/lib/cart';
import { useCurrency } from '@/lib/currency';
import AnnouncementBar from '@/components/AnnouncementBar';
import type { Category } from '@/lib/types';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [overHero, setOverHero] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const location = useLocation();
  const { count, openCart, lastAddedAt } = useCart();
  const { code: currencyCode, options: currencyOptions, setCode: setCurrency } = useCurrency();
  const badgeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 30);
      // The homepage hero is full-height and dark; the bar only switches to the
      // light treatment once it has cleared it.
      setOverHero(window.scrollY < window.innerHeight - 80);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Pop the badge whenever something new lands in the bag.
  useEffect(() => {
    if (!lastAddedAt || !badgeRef.current) return;
    gsap.fromTo(
      badgeRef.current,
      { scale: 0.4 },
      { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' }
    );
  }, [lastAddedAt, count]);

  // Fetch categories from Supabase
  useEffect(() => {
    let cancelled = false;
    supabase
      .from('categories')
      .select('*')
      .then(({ data }) => {
        if (!cancelled && data) setCategories(data);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setOpen(false);
    setActiveDropdown(null);
    setMobileExpanded(null);
  }, [location.pathname]);

  // Filter main categories (those without a parent) and subcategories
  const mainCategories = categories.filter((c) => !c.parent_id);
  const getSubcategories = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  // The navbar rides over the homepage's dark hero for a full screen. Going
  // light there would drop a bright cream bar onto the dark scene, so the whole
  // header stays dark until the hero has scrolled past.
  const onDark = location.pathname === '/' && overHero;
  const linkBase = onDark ? 'text-cream hover:text-gold-light' : 'text-ink hover:text-gold';
  const activeColor = onDark ? 'text-gold-light' : 'text-gold';

  // Over the hero the bar keeps a defined surface from the very first pixel —
  // fully transparent, it read as part of the artwork rather than as navigation.
  const headerSurface = onDark
    ? 'glass-dark border-b border-gold/25 shadow-lg shadow-ink/40'
    : scrolled
      ? 'glass shadow-md'
      : 'bg-transparent';

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${headerSurface}`}
      >
        <AnnouncementBar collapsed={scrolled} />

        <nav
          className={`mx-auto flex max-w-7xl items-center justify-between px-6 transition-all duration-500 ${
            scrolled ? 'py-3' : 'py-5'
          }`}
        >
          <Link to="/" className="flex items-center gap-2">
            <span className={`font-serif text-2xl font-semibold tracking-wide transition-colors ${onDark ? 'text-cream' : 'text-ink'}`}>
              {BRAND.name.split(' ')[0]}<span className="text-gold">.</span>
            </span>
            <span className={`hidden sm:inline text-[10px] uppercase tracking-[0.3em] font-sans transition-colors ${onDark ? 'text-cream/60' : 'text-stone-500'}`}>
              {BRAND.name.split(' ').slice(1).join(' ')}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {/* Home link */}
            <Link
              to="/"
              className={`text-sm uppercase tracking-widest transition-colors duration-300 relative group ${
                location.pathname === '/' ? activeColor : linkBase
              }`}
            >
              Home
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-gold transition-all duration-300 group-hover:w-full" />
            </Link>

            {/* Dynamic Main Categories with Conditional Dropdowns / Clickable Links */}
            {mainCategories.map((cat) => {
              const subcategories = getSubcategories(cat.id);
              const hasSubs = subcategories.length > 0;
              const isChildActive = subcategories.some((sub) => location.pathname.includes(`/shop/${sub.slug}`));
              const isCurrentActive = location.pathname.includes(`/shop/${cat.slug}`);

              return (
                <div
                  key={cat.id}
                  className="relative group py-2"
                  onMouseEnter={() => setActiveDropdown(cat.id)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  {hasSubs ? (
                    /* Non-clickable parent header if it has subcategories */
                    <span
                      className={`flex items-center gap-1 text-sm uppercase tracking-widest cursor-pointer transition-colors duration-300 ${
                        isChildActive ? activeColor : linkBase
                      }`}
                    >
                      {cat.name}
                      <ChevronDown className="h-3 w-3" />
                    </span>
                  ) : (
                    /* Clickable link if it has NO subcategories (like Bags/Wallets) */
                    <Link
                      to={`/shop/${cat.slug}`}
                      className={`flex items-center gap-1 text-sm uppercase tracking-widest transition-colors duration-300 ${
                        isCurrentActive ? activeColor : linkBase
                      }`}
                    >
                      {cat.name}
                    </Link>
                  )}

                  <span className="absolute bottom-0 left-0 w-0 h-px bg-gold transition-all duration-300 group-hover:w-full" />

                  {/* Subcategories Dropdown */}
                  {hasSubs && activeDropdown === cat.id && (
                    <div className="absolute top-full left-0 w-48 bg-white border border-stone-200 shadow-xl py-2 z-50 rounded-sm">
                      {subcategories.map((sub) => (
                        <Link
                          key={sub.id}
                          to={`/shop/${sub.slug}`}
                          className={`block px-4 py-2.5 text-xs uppercase tracking-wider transition-colors ${
                            location.pathname.includes(`/shop/${sub.slug}`)
                              ? 'text-gold bg-stone-50 font-medium'
                              : 'text-stone-600 hover:bg-stone-50 hover:text-gold'
                          }`}
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Static New Arrivals link */}
            <Link
              to="/new-arrivals"
              className={`text-sm uppercase tracking-widest transition-colors duration-300 relative group ${
                location.pathname === '/new-arrivals' ? activeColor : linkBase
              }`}
            >
              New Arrivals
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-gold transition-all duration-300 group-hover:w-full" />
            </Link>
          </div>

          <div className="flex items-center gap-5">
            {/* Currency is detected automatically; this just lets a shopper
                override it for the rest of their visit. */}
            <label className="flex items-center" title="Currency">
              <span className="sr-only">Currency</span>
              <select
                value={currencyCode}
                onChange={(e) => setCurrency(e.target.value)}
                className={`cursor-pointer bg-transparent text-xs uppercase tracking-widest outline-none transition-colors ${
                  onDark ? 'text-cream/70 hover:text-gold-light' : 'text-stone-500 hover:text-gold'
                }`}
              >
                {currencyOptions.map((c) => (
                  <option key={c} value={c} className="text-ink">
                    {c}
                  </option>
                ))}
              </select>
            </label>


            <Link
              to="/admin"
              className={`hidden md:block text-xs uppercase tracking-widest transition-colors ${
                onDark ? 'text-cream/60 hover:text-gold-light' : 'text-stone-500 hover:text-gold'
              }`}
            >
              Admin
            </Link>

            {/* Cart */}
            <button
              onClick={openCart}
              aria-label={`Open bag${count > 0 ? `, ${count} item${count > 1 ? 's' : ''}` : ''}`}
              className={`relative transition-colors ${onDark ? 'text-cream hover:text-gold-light' : 'text-ink hover:text-gold'}`}
            >
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span
                  ref={badgeRef}
                  className="absolute -right-2 -top-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-gold px-1 text-[10px] font-medium leading-none text-cream"
                >
                  {count}
                </span>
              )}
            </button>

            <button
              onClick={() => setOpen(!open)}
              className={`md:hidden transition-colors ${onDark ? 'text-cream' : 'text-ink'}`}
              aria-label="Menu"
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 z-40 bg-ink transition-transform duration-500 md:hidden overflow-y-auto ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col items-center justify-center min-h-full gap-6 py-20 px-6">
          <Link
            to="/"
            className="font-serif text-3xl text-cream hover:text-gold transition-colors"
          >
            Home
          </Link>

          {/* Dynamic Mobile Categories */}
          {mainCategories.map((cat) => {
            const subcategories = getSubcategories(cat.id);
            const hasSubs = subcategories.length > 0;
            const isExpanded = mobileExpanded === cat.id;

            return (
              <div key={cat.id} className="flex flex-col items-center">
                <div className="flex items-center gap-3">
                  {hasSubs ? (
                    <span className="font-serif text-3xl text-cream tracking-wide">
                      {cat.name}
                    </span>
                  ) : (
                    <Link
                      to={`/shop/${cat.slug}`}
                      className="font-serif text-3xl text-cream hover:text-gold transition-colors tracking-wide"
                    >
                      {cat.name}
                    </Link>
                  )}

                  {hasSubs && (
                    <button
                      onClick={() => setMobileExpanded(isExpanded ? null : cat.id)}
                      className="text-cream/70 hover:text-gold p-1"
                    >
                      <ChevronDown className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>

                {/* Subcategory list on mobile */}
                {hasSubs && isExpanded && (
                  <div className="flex flex-col items-center gap-3 mt-3 bg-white/5 py-3 px-8 rounded w-full max-w-xs">
                    {subcategories.map((sub) => (
                      <Link
                        key={sub.id}
                        to={`/shop/${sub.slug}`}
                        className="text-xs uppercase tracking-widest text-stone-300 hover:text-gold transition-colors"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <Link
            to="/new-arrivals"
            className="font-serif text-3xl text-cream hover:text-gold transition-colors"
          >
            New Arrivals
          </Link>

          <Link
            to="/admin"
            className="text-sm uppercase tracking-widest text-stone-400 hover:text-gold transition-colors mt-4"
          >
            Admin
          </Link>

          <label className="mt-2 flex flex-col items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-stone-400">Currency</span>
            <select
              value={currencyCode}
              onChange={(e) => setCurrency(e.target.value)}
              className="border border-cream/30 bg-transparent px-4 py-2 text-sm uppercase tracking-widest text-cream outline-none"
            >
              {currencyOptions.map((c) => (
                <option key={c} value={c} className="text-ink">
                  {c}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-6 mt-4">
            <a
              href={BRAND.instagram}
              target="_blank"
              rel="noreferrer"
              aria-label="BM Collection on Instagram"
              className="text-cream/60 hover:text-gold"
            >
              <Instagram className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </>
  );
}