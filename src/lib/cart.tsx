import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Product } from '@/lib/types';

export const FREE_DELIVERY_THRESHOLD = 5000;

const STORAGE_KEY = 'bm-collection-cart';

export interface CartItem {
  id: string;
  cartKey: string;
  title: string;
  slug?: string | null;
  price: number;
  compare_at_price?: number | null;
  image_url: string | null;
  qty: number;
  size?: string | null;
}

interface AddItemOptions {
  qty?: number;
  size?: string | null;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  freeDelivery: boolean;
  amountToFreeDelivery: number;
  isOpen: boolean;
  lastAddedAt: number;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, options?: AddItemOptions) => void;
  removeItem: (cartKey: string) => void;
  setQty: (cartKey: string, qty: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function makeCartKey(productId: string, size?: string | null) {
  return `${productId}:${size || 'default'}`;
}

function readStoredCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => ({
      ...item,
      cartKey:
        item.cartKey ||
        makeCartKey(item.id, item.size),
      size: item.size ?? null,
      qty: Math.min(99, Math.max(1, Number(item.qty) || 1)),
    }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => readStoredCart());
  const [isOpen, setIsOpen] = useState(false);
  const [lastAddedAt, setLastAddedAt] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage errors.
    }
  }, [items]);

  const addItem = useCallback(
    (product: Product, options: AddItemOptions = {}) => {
      const qty = Math.min(99, Math.max(1, options.qty ?? 1));
      const size = options.size ?? null;
      const cartKey = makeCartKey(product.id, size);

      setItems((prev) => {
        const existing = prev.find((item) => item.cartKey === cartKey);

        if (existing) {
          return prev.map((item) =>
            item.cartKey === cartKey
              ? {
                  ...item,
                  qty: Math.min(99, item.qty + qty),
                }
              : item
          );
        }

        return [
          ...prev,
          {
            id: product.id,
            cartKey,
            title: product.title,
            slug: product.slug ?? null,
            price: Number(product.price) || 0,
            compare_at_price: product.compare_at_price ?? null,
            image_url: product.image_url,
            qty,
            size,
          },
        ];
      });

      setLastAddedAt(Date.now());
    },
    []
  );

  const removeItem = useCallback((cartKey: string) => {
    setItems((prev) => prev.filter((item) => item.cartKey !== cartKey));
  }, []);

  const setQty = useCallback((cartKey: string, qty: number) => {
    setItems((prev) => {
      if (qty <= 0) {
        return prev.filter((item) => item.cartKey !== cartKey);
      }

      return prev.map((item) =>
        item.cartKey === cartKey
          ? {
              ...item,
              qty: Math.min(99, Math.max(1, qty)),
            }
          : item
      );
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const openCart = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeCart = useCallback(() => {
    setIsOpen(false);
  }, []);

  const count = useMemo(
    () => items.reduce((total, item) => total + item.qty, 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((total, item) => total + item.price * item.qty, 0),
    [items]
  );

  const freeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD;

  const amountToFreeDelivery = Math.max(
    0,
    FREE_DELIVERY_THRESHOLD - subtotal
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count,
      subtotal,
      freeDelivery,
      amountToFreeDelivery,
      isOpen,
      lastAddedAt,
      openCart,
      closeCart,
      addItem,
      removeItem,
      setQty,
      clearCart,
    }),
    [
      items,
      count,
      subtotal,
      freeDelivery,
      amountToFreeDelivery,
      isOpen,
      lastAddedAt,
      openCart,
      closeCart,
      addItem,
      removeItem,
      setQty,
      clearCart,
    ]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used inside CartProvider');
  }

  return context;
}