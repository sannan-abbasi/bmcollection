import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu, X, ShoppingBag, ChevronDown } from 'lucide-react';
import { supabase, BRAND } from '@/lib/supabase';
import type { Category } from '@/lib/types';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fetch categories from Supabase
  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .then(({ data }) => {
        if (data) setCategories(data);
      });
  }, []);

  useEffect(() => {
    setOpen(false);
    setActiveDropdown(null);
    setMobileExpanded(null);
  }, [location.pathname]);

  // Filter main categories (those without a parent) and subcategories
  const mainCategories = categories.filter((c) => !c.parent_id);
  const getSubcategories = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'glass shadow-md py-3' : 'bg-transparent py-5'
        }`}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-serif text-2xl font-semibold tracking-wide text-ink">
              {BRAND.name.split(' ')[0]}<span className="text-gold">.</span>
            </span>
            <span className="hidden sm:inline text-[10px] uppercase tracking-[0.3em] text-stone-500 font-sans">
              {BRAND.name.split(' ').slice(1).join(' ')}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {/* Home link */}
            <Link
              to="/"
              className={`text-sm uppercase tracking-widest transition-colors duration-300 relative group ${
                location.pathname === '/' ? 'text-gold' : 'text-ink hover:text-gold'
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
                        isChildActive ? 'text-gold' : 'text-ink hover:text-gold'
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
                        isCurrentActive ? 'text-gold' : 'text-ink hover:text-gold'
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
                location.pathname === '/new-arrivals' ? 'text-gold' : 'text-ink hover:text-gold'
              }`}
            >
              New Arrivals
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-gold transition-all duration-300 group-hover:w-full" />
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="hidden md:block text-xs uppercase tracking-widest text-stone-500 hover:text-gold transition-colors"
            >
              Admin
            </Link>
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden text-ink"
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

          <div className="flex gap-6 mt-4">
            <a href={BRAND.instagram} target="_blank" rel="noreferrer" className="text-cream/60 hover:text-gold">
              <ShoppingBag className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </>
  );
}