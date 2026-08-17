import { Link } from 'react-router-dom';
import { ShoppingCart, Sparkles } from 'lucide-react';
import type { Product } from '@/lib/types';
import { useCart } from '@/lib/cart';
import { useToast } from '@/lib/toast';
import { comparePriceOf, discountPercentOf, formatPrice } from '@/lib/pricing';
import { productPath } from '@/lib/slug';

export default function ProductCard({ product }: { product: Product }) {
  // Now checks the manual admin checkbox flag
  const isSoldOut = Boolean(product.is_sold_out);
  const { addItem } = useCart();
  const { notify } = useToast();
  const wasPrice = comparePriceOf(product.price, product.compare_at_price);
  const discount = discountPercentOf(product.price, product.compare_at_price);

  const handleAdd = (e: React.MouseEvent) => {
    // The whole card is a link — keep the click from navigating away.
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    notify(`${product.title} added to your bag`, 'success');
  };

  return (
    <Link to={productPath(product)} className="group block">
      <div className="image-zoom relative aspect-[3/4] overflow-hidden rounded-lg bg-stone-100 premium-shadow">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            loading="lazy"
            className={`h-full w-full object-cover transition-opacity duration-300 ${isSoldOut ? 'opacity-60 grayscale-[30%]' : ''}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-stone-100">
            <Sparkles className="h-10 w-10 text-stone-300" />
          </div>
        )}

        {/* New Arrival Badge */}
        {product.is_new_arrival && !isSoldOut && (
          <span className="absolute top-3 left-3 bg-ink/90 text-cream text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full sm:top-4 sm:left-4 sm:px-3 sm:py-1.5">
            New
          </span>
        )}

        {/* Sold Out Badge */}
        {isSoldOut && (
          <span className="absolute top-3 left-3 bg-stone-900/90 text-stone-200 text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border border-stone-700 sm:top-4 sm:left-4 sm:px-3 sm:py-1.5">
            Sold Out
          </span>
        )}

        {/* Only shown when this product actually has a sale price set */}
        {!isSoldOut && discount !== null && (
          <span className="absolute top-3 right-3 bg-gold text-cream text-[10px] font-medium uppercase tracking-widest px-2.5 py-1 rounded-full sm:top-4 sm:right-4 sm:px-3 sm:py-1.5">
            {discount}% Off
          </span>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-ink/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {!isSoldOut && (
          <>
            {/* Touch screens get a compact tap target that keeps the photo clear */}
            <button
              onClick={handleAdd}
              aria-label={`Add ${product.title} to bag`}
              className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-ink/90 text-cream shadow-lg backdrop-blur-sm active:scale-95 transition-transform md:hidden"
            >
              <ShoppingCart className="h-4 w-4" />
            </button>

            {/* Pointer devices get the full bar, revealed on hover */}
            <button
              onClick={handleAdd}
              aria-label={`Add ${product.title} to bag`}
              className="absolute inset-x-3 bottom-3 hidden items-center justify-center gap-2 bg-ink/90 py-3 text-[11px] uppercase tracking-widest text-cream backdrop-blur-sm transition-all duration-300 hover:bg-gold md:flex md:translate-y-3 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Add to Bag
            </button>
          </>
        )}
      </div>

      <div className="mt-3 text-center sm:mt-4">
        <h3 className="font-serif text-base leading-snug text-ink group-hover:text-gold transition-colors duration-300 sm:text-lg">
          {product.title}
        </h3>
        {isSoldOut ? (
          <p className="mt-1 text-sm text-stone-400 italic">Sold Out</p>
        ) : (
          <div className="mt-1 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium text-ink">{formatPrice(product.price)}</span>
            {wasPrice !== null && (
              <span className="text-xs text-stone-400 line-through">{formatPrice(wasPrice)}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
