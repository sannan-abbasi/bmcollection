import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Sparkles } from 'lucide-react';
import type { Product } from '@/lib/types';
import { useCart } from '@/lib/cart';
import { useToast } from '@/lib/toast';
import { useCurrency } from '@/lib/currency';
import { comparePriceOf, discountPercentOf } from '@/lib/pricing';
import { productPath } from '@/lib/slug';

const SIZES = ['M', 'L', 'XL'] as const;

export default function ProductCard({ product }: { product: Product }) {
  const isSoldOut = Boolean(product.is_sold_out);

  const { addItem } = useCart();
  const { notify } = useToast();
  const { format } = useCurrency();

  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const wasPrice = comparePriceOf(
    product.price,
    product.compare_at_price
  );

  const discount = discountPercentOf(
    product.price,
    product.compare_at_price
  );

  const handleSizeSelect = (
    e: React.MouseEvent<HTMLButtonElement>,
    size: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setSelectedSize(size);
  };

  const handleAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSoldOut) {
      return;
    }

    if (!selectedSize) {
      notify('Please select a size first', 'error');
      return;
    }

    addItem(product, {
      size: selectedSize,
      qty: 1,
    });

    notify(
      `${product.title} (${selectedSize}) added to your bag`,
      'success'
    );

    setSelectedSize(null);
  };

  return (
    <Link
      to={productPath(product)}
      className="group block"
    >
      <div className="image-zoom relative aspect-[3/4] overflow-hidden rounded-lg bg-stone-100 premium-shadow">
        {/* Product Image */}
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            loading="lazy"
            className={`h-full w-full object-cover transition-opacity duration-300 ${
              isSoldOut
                ? 'opacity-60 grayscale-[30%]'
                : ''
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-stone-100">
            <Sparkles className="h-10 w-10 text-stone-300" />
          </div>
        )}

        {/* New Badge */}
        {product.is_new_arrival && !isSoldOut && (
          <span className="absolute left-3 top-3 rounded-full bg-ink/90 px-2.5 py-1 text-[10px] uppercase tracking-widest text-cream sm:left-4 sm:top-4 sm:px-3 sm:py-1.5">
            New
          </span>
        )}

        {/* Sold Out Badge */}
        {isSoldOut && (
          <span className="absolute left-3 top-3 rounded-full border border-stone-700 bg-stone-900/90 px-2.5 py-1 text-[10px] uppercase tracking-widest text-stone-200 sm:left-4 sm:top-4 sm:px-3 sm:py-1.5">
            Sold Out
          </span>
        )}

        {/* Discount Badge */}
        {!isSoldOut && discount !== null && (
          <span className="absolute right-3 top-3 rounded-full bg-gold px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-cream sm:right-4 sm:top-4 sm:px-3 sm:py-1.5">
            {discount}% Off
          </span>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        {!isSoldOut && (
          <>
            {/* Size Selector */}
            <div
              className="absolute inset-x-3 bottom-16 flex items-center justify-center gap-2"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {SIZES.map((size) => {
                const isSelected = selectedSize === size;

                return (
                  <button
                    key={size}
                    type="button"
                    onClick={(e) => handleSizeSelect(e, size)}
                    aria-label={`Select size ${size}`}
                    aria-pressed={isSelected}
                    className={`flex h-9 min-w-9 items-center justify-center rounded-full px-2.5 text-[10px] font-medium uppercase tracking-wide transition-all duration-200 ${
                      isSelected
                        ? 'bg-gold text-cream shadow-md scale-105'
                        : 'bg-cream/95 text-ink hover:bg-gold hover:text-cream hover:scale-105'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            {/* Mobile Add Button */}
            <button
              type="button"
              onClick={handleAdd}
              aria-label={`Add ${product.title} to bag`}
              className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-ink/90 text-cream shadow-lg backdrop-blur-sm transition-transform active:scale-95 md:hidden"
            >
              <ShoppingCart className="h-4 w-4" />
            </button>

            {/* Desktop Add Button */}
            <button
              type="button"
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

      {/* Product Information */}
      <div className="mt-3 text-center sm:mt-4">
        <h3 className="font-serif text-base leading-snug text-ink transition-colors duration-300 group-hover:text-gold sm:text-lg">
          {product.title}
        </h3>

        {isSoldOut ? (
          <p className="mt-1 text-sm italic text-stone-400">
            Sold Out
          </p>
        ) : (
          <div className="mt-1 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium text-ink">
              {format(product.price)}
            </span>

            {wasPrice !== null && (
              <span className="text-xs text-stone-400 line-through">
                {format(wasPrice)}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}