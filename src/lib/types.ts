export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null; // Supports subcategories
  description: string | null;
  image_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_new_arrival: boolean;
  is_sold_out?: boolean; // Added for the admin sold-out toggle
  is_active: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  product_id: string | null;
  product_title: string;
  product_price: number;
  customer_name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  street: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};