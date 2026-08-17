import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import type { Product } from '@/lib/types';

/** Spend this much (or more) and delivery is on us. */
export const FREE_DELIVERY_THRESHOLD = 5000;

const STORAGE_KEY = 'bm-collection-cart';

export interface CartItem {
  id: string;
  title: string;
  /** URL slug so the bag can link to the readable product URL. */
  slug?: string | null;
  price: number;
  /** Snapshot of the product's "was" price, so the bag can show the saving. */
  compare_at_price?: number | null;
  image_url: string | null;
  qty: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  freeDelivery: boolean;
  /** Rupees still to add before delivery becomes free (0 once unlocked). */
  amountToFreeDelivery: number;
  isOpen: boolean;
  /** Bumps every time something is added — lets the navbar badge animate. */
  lastAddedAt: number;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, qty?: number) => void;
  removeItem: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

function readStoredCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((i) => i && typeof i.id === 'string')
      .map((i) => ({
        id: i.id,
        title: String(i.title ?? ''),
        slug: i.slug ? String(i.slug) : null,
        price: Number(i.price) || 0,
        // Older saved carts predate this field — absent simply means no sale.
        compare_at_price: i.compare_at_price == null ? null : Number(i.compare_at_price) || null,
        image_url: i.image_url ?? null,
        qty: Math.max(1, Math.min(99, Number(i.qty) || 1)),
      }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readStoredCart);
  const [isOpen, setIsOpen] = useState(false);
  const [lastAddedAt, setLastAddedAt] = useState(0);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage full or blocked — the cart still works for this session
    }
  }, [items]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const addItem = useCallback((product: Product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: Math.min(99, i.qty + qty) } : i
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          title: product.title,
          slug: product.slug ?? null,
          price: Number(product.price) || 0,
          compare_at_price: product.compare_at_price ?? null,
          image_url: product.image_url,
          qty: Math.min(99, Math.max(1, qty)),
        },
      ];
    });
    setLastAddedAt(Date.now());
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.id !== id)
        : prev.map((i) => (i.id === id ? { ...i, qty: Math.min(99, qty) } : i))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const freeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD;
    return {
      items,
      count: items.reduce((sum, i) => sum + i.qty, 0),
      subtotal,
      freeDelivery,
      amountToFreeDelivery: freeDelivery ? 0 : FREE_DELIVERY_THRESHOLD - subtotal,
      isOpen,
      lastAddedAt,
      openCart,
      closeCart,
      addItem,
      removeItem,
      setQty,
      clearCart,
    };
  }, [items, isOpen, lastAddedAt, openCart, closeCart, addItem, removeItem, setQty, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
