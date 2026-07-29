import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import type { Category, Product, Order, OrderStatus } from '@/lib/types';
import { ORDER_STATUS_LABELS } from '@/lib/types';
import { formatPrice } from '@/components/ProductCard';
import {
  Package, Tags, ShoppingBag, LogOut, Plus, Pencil, Trash2, X, Upload, Eye, EyeOff, Sparkles,
} from 'lucide-react';

type Tab = 'products' | 'categories' | 'orders';

export default function AdminDashboard() {
  const { isAdmin, loading: authLoading, signOut } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('products');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [catRes, prodRes, ordRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
    ]);
    setCategories(catRes.data ?? []);
    setProducts(prodRes.data ?? []);
    setOrders(ordRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/admin');
    }
    if (isAdmin) loadData();
  }, [authLoading, isAdmin, navigate, loadData]);

  if (authLoading || (!isAdmin && !authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="h-8 w-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const stats = {
    products: products.length,
    categories: categories.length,
    orders: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
  };

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 md:px-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-4xl text-ink">Dashboard</h1>
            <p className="text-sm text-stone-500 mt-1">Manage your store — products, categories, and orders</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-stone-500 hover:text-red-600 transition-colors self-start"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Package} label="Products" value={stats.products} />
          <StatCard icon={Tags} label="Categories" value={stats.categories} />
          <StatCard icon={ShoppingBag} label="Total Orders" value={stats.orders} />
          <StatCard icon={Sparkles} label="Pending Orders" value={stats.pending} highlight />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-stone-200">
          <TabButton active={tab === 'products'} onClick={() => setTab('products')} icon={Package} label="Products" />
          <TabButton active={tab === 'categories'} onClick={() => setTab('categories')} icon={Tags} label="Categories" />
          <TabButton active={tab === 'orders'} onClick={() => setTab('orders')} icon={ShoppingBag} label="Orders" />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {tab === 'products' && (
              <ProductsTab products={products} categories={categories} onChanged={loadData} notify={notify} />
            )}
            {tab === 'categories' && (
              <CategoriesTab categories={categories} onChanged={loadData} notify={notify} />
            )}
            {tab === 'orders' && <OrdersTab orders={orders} onChanged={loadData} notify={notify} />}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, highlight }: { icon: typeof Package; label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${highlight ? 'bg-gold/10 border-gold/30' : 'bg-white border-stone-200'}`}>
      <Icon className={`h-5 w-5 mb-3 ${highlight ? 'text-gold' : 'text-stone-400'}`} />
      <p className="text-2xl font-serif text-ink">{value}</p>
      <p className="text-xs uppercase tracking-widest text-stone-500 mt-1">{label}</p>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Package; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-3 text-sm uppercase tracking-widest border-b-2 transition-colors ${
        active ? 'border-gold text-ink' : 'border-transparent text-stone-400 hover:text-stone-600'
      }`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

/* ============ PRODUCTS TAB ============ */

function ProductsTab({
  products, categories, onChanged, notify,
}: {
  products: Product[]; categories: Category[]; onChanged: () => void; notify: (m: string, t?: 'success' | 'error') => void;
}) {
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) notify('Could not delete product.', 'error');
    else { notify('Product deleted.'); onChanged(); }
  };

  const toggleActive = async (p: Product) => {
    const { error } = await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id);
    if (error) notify('Could not update.', 'error');
    else { onChanged(); }
  };

  const toggleNew = async (p: Product) => {
    const { error } = await supabase.from('products').update({ is_new_arrival: !p.is_new_arrival }).eq('id', p.id);
    if (error) notify('Could not update.', 'error');
    else onChanged();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-serif text-2xl text-ink">All Products</h2>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 bg-ink text-cream px-5 py-2.5 text-sm uppercase tracking-widest hover:bg-gold transition-all"
        >
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {products.length === 0 ? (
        <p className="text-stone-500 text-center py-16">No products yet. Click "Add Product" to create one.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const cat = categories.find((c) => c.id === p.category_id);
            return (
              <div key={p.id} className="rounded-xl border border-stone-200 bg-white overflow-hidden group">
                <div className="relative aspect-[4/3] bg-stone-100">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Sparkles className="h-8 w-8 text-stone-300" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1">
                    {p.is_new_arrival && (
                      <span className="bg-gold text-cream text-[9px] uppercase tracking-widest px-2 py-1 rounded">New</span>
                    )}
                    {!p.is_active && (
                      <span className="bg-stone-600 text-cream text-[9px] uppercase tracking-widest px-2 py-1 rounded">Hidden</span>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-serif text-lg text-ink truncate">{p.title}</h3>
                      <p className="text-sm text-stone-600">{formatPrice(p.price)}</p>
                      <p className="text-xs text-stone-400 mt-1">{cat?.name ?? 'Uncategorized'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => setEditing(p)} className="flex-1 flex items-center justify-center gap-1 text-xs border border-stone-200 py-2 hover:border-gold hover:text-gold transition-all">
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button onClick={() => toggleActive(p)} className="flex items-center justify-center px-3 border border-stone-200 hover:border-gold hover:text-gold transition-all" title={p.is_active ? 'Hide' : 'Show'}>
                      {p.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </button>
                    <button onClick={() => toggleNew(p)} className={`flex items-center justify-center px-3 border transition-all ${p.is_new_arrival ? 'border-gold text-gold' : 'border-stone-200 hover:border-gold'}`} title="Toggle New Arrival">
                      <Sparkles className="h-3 w-3" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="flex items-center justify-center px-3 border border-stone-200 hover:border-red-500 hover:text-red-500 transition-all">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(editing || creating) && (
        <ProductModal
          product={editing}
          categories={categories}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); onChanged(); }}
          notify={notify}
        />
      )}
    </div>
  );
}

function ProductModal({
  product, categories, onClose, onSaved, notify,
}: {
  product: Product | null; categories: Category[]; onClose: () => void; onSaved: () => void; notify: (m: string, t?: 'success' | 'error') => void;
}) {
  const [title, setTitle] = useState(product?.title ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(String(product?.price ?? ''));
  const [categoryId, setCategoryId] = useState(product?.category_id ?? categories[0]?.id ?? '');
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? '');
  const [isNew, setIsNew] = useState(product?.is_new_arrival ?? false);
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('image').upload(fileName, file, { cacheControl: '3600', upsert: false });
    setUploading(false);
    if (error) {
      notify('Could not upload image.', 'error');
      return;
    }
    const { data: urlData } = supabase.storage.from('image').getPublicUrl(fileName);
    setImageUrl(urlData.publicUrl);
    notify('Image uploaded.');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price) { notify('Title and price are required.', 'error'); return; }
    setSaving(true);
    const payload = {
      title,
      description: description || null,
      price: parseFloat(price),
      category_id: categoryId || null,
      image_url: imageUrl || null,
      is_new_arrival: isNew,
      is_active: isActive,
    };
    const { error } = product
      ? await supabase.from('products').update(payload).eq('id', product.id)
      : await supabase.from('products').insert(payload);
    setSaving(false);
    if (error) notify('Could not save product.', 'error');
    else { notify(product ? 'Product updated.' : 'Product added.'); onSaved(); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-cream rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 md:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-serif text-2xl text-ink">{product ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-ink"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Image upload */}
          <div>
            <span className="text-xs uppercase tracking-widest text-stone-500 mb-2 block">Product Image</span>
            {imageUrl ? (
              <div className="relative aspect-[3/2] rounded-lg overflow-hidden bg-stone-100 mb-2">
                <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setImageUrl('')} className="absolute top-2 right-2 bg-ink/70 text-cream p-1.5 rounded-full hover:bg-ink">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center aspect-[3/2] border-2 border-dashed border-stone-300 rounded-lg cursor-pointer hover:border-gold transition-colors">
                <Upload className="h-6 w-6 text-stone-400 mb-2" />
                <span className="text-sm text-stone-500">{uploading ? 'Uploading...' : 'Click to upload image'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
              </label>
            )}
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="...or paste an image URL"
              className="premium-input mt-2 text-xs"
            />
          </div>

          <label className="block">
            <span className="text-xs uppercase tracking-widest text-stone-500 mb-2 block">Title *</span>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="premium-input" />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-widest text-stone-500 mb-2 block">Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="premium-input resize-none" />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-stone-500 mb-2 block">Price (Rs) *</span>
              <input type="number" required min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="premium-input" />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-stone-500 mb-2 block">Category</span>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="premium-input">
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isNew} onChange={(e) => setIsNew(e.target.checked)} className="h-4 w-4 accent-gold" />
              <span className="text-sm text-stone-600">New Arrival</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-gold" />
              <span className="text-sm text-stone-600">Visible in store</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 bg-ink text-cream py-3 text-sm uppercase tracking-widest hover:bg-gold transition-all disabled:opacity-50">
              {saving ? 'Saving...' : (product ? 'Save Changes' : 'Add Product')}
            </button>
            <button type="button" onClick={onClose} className="border border-stone-300 px-6 py-3 text-sm uppercase tracking-widest hover:border-stone-400 transition-all">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============ CATEGORIES TAB ============ */

function CategoriesTab({
  categories, onChanged, notify,
}: {
  categories: Category[]; onChanged: () => void; notify: (m: string, t?: 'success' | 'error') => void;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category? Products in it will become uncategorized but not deleted.')) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) notify('Could not delete category.', 'error');
    else { notify('Category deleted.'); onChanged(); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-serif text-2xl text-ink">All Categories</h2>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 bg-ink text-cream px-5 py-2.5 text-sm uppercase tracking-widest hover:bg-gold transition-all"
        >
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </div>

      {categories.length === 0 ? (
        <p className="text-stone-500 text-center py-16">No categories yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <div key={c.id} className="rounded-xl border border-stone-200 bg-white p-5">
              <h3 className="font-serif text-xl text-ink">{c.name}</h3>
              <p className="text-sm text-stone-500 mt-1">/{c.slug}</p>
              {c.description && <p className="text-sm text-stone-600 mt-3">{c.description}</p>}
              <div className="flex gap-2 mt-4">
                <button onClick={() => setEditing(c)} className="flex-1 flex items-center justify-center gap-1 text-xs border border-stone-200 py-2 hover:border-gold hover:text-gold transition-all">
                  <Pencil className="h-3 w-3" /> Edit
                </button>
                <button onClick={() => handleDelete(c.id)} className="flex items-center justify-center px-3 border border-stone-200 hover:border-red-500 hover:text-red-500 transition-all">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <CategoryModal
          category={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); onChanged(); }}
          notify={notify}
        />
      )}
    </div>
  );
}

function CategoryModal({
  category, onClose, onSaved, notify,
}: {
  category: Category | null; onClose: () => void; onSaved: () => void; notify: (m: string, t?: 'success' | 'error') => void;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [imageUrl, setImageUrl] = useState(category?.image_url ?? '');
  const [sortOrder, setSortOrder] = useState(String(category?.sort_order ?? '0'));
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) { notify('Name and slug are required.', 'error'); return; }
    setSaving(true);
    const payload = {
      name,
      slug: slug.toLowerCase().replace(/\s+/g, '-'),
      description: description || null,
      image_url: imageUrl || null,
      sort_order: parseInt(sortOrder) || 0,
    };
    const { error } = category
      ? await supabase.from('categories').update(payload).eq('id', category.id)
      : await supabase.from('categories').insert(payload);
    setSaving(false);
    if (error) notify('Could not save category. Slug must be unique.', 'error');
    else { notify(category ? 'Category updated.' : 'Category added.'); onSaved(); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-cream rounded-2xl max-w-md w-full p-6 md:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-serif text-2xl text-ink">{category ? 'Edit Category' : 'Add Category'}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-ink"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-stone-500 mb-2 block">Name *</span>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="premium-input" placeholder="e.g. Watches" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-stone-500 mb-2 block">Slug (URL) *</span>
            <input type="text" required value={slug} onChange={(e) => setSlug(e.target.value)} className="premium-input" placeholder="e.g. watches" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-stone-500 mb-2 block">Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="premium-input resize-none" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-stone-500 mb-2 block">Image URL (optional)</span>
            <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="premium-input" placeholder="https://..." />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-stone-500 mb-2 block">Sort Order</span>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="premium-input" />
          </label>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 bg-ink text-cream py-3 text-sm uppercase tracking-widest hover:bg-gold transition-all disabled:opacity-50">
              {saving ? 'Saving...' : (category ? 'Save Changes' : 'Add Category')}
            </button>
            <button type="button" onClick={onClose} className="border border-stone-300 px-6 py-3 text-sm uppercase tracking-widest hover:border-stone-400 transition-all">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============ ORDERS TAB ============ */

function OrdersTab({
  orders, onChanged, notify,
}: {
  orders: Order[]; onChanged: () => void; notify: (m: string, t?: 'success' | 'error') => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const updateStatus = async (id: string, status: OrderStatus) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) notify('Could not update order status.', 'error');
    else { notify('Order status updated.'); onChanged(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this order?')) return;
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) notify('Could not delete order.', 'error');
    else { notify('Order deleted.'); onChanged(); }
  };

  if (orders.length === 0) {
    return <p className="text-stone-500 text-center py-16">No orders yet. When customers place orders, they will appear here.</p>;
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
    shipped: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <div>
      <h2 className="font-serif text-2xl text-ink mb-6">All Orders</h2>
      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="rounded-xl border border-stone-200 bg-white overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === o.id ? null : o.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-stone-50 transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="min-w-0">
                  <p className="font-medium text-ink truncate">{o.product_title}</p>
                  <p className="text-sm text-stone-500">{o.customer_name} — {o.city}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm text-stone-600 hidden sm:inline">{formatPrice(o.product_price)}</span>
                <span className={`text-xs px-3 py-1 rounded-full border ${statusColors[o.status] ?? ''}`}>
                  {ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status}
                </span>
                <span className="text-xs text-stone-400 hidden md:inline">
                  {new Date(o.created_at).toLocaleDateString()}
                </span>
              </div>
            </button>

            {expanded === o.id && (
              <div className="border-t border-stone-100 p-4 bg-stone-50/50">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-xs uppercase tracking-widest text-stone-400 mb-2">Customer Details</h4>
                    <dl className="space-y-1 text-sm">
                      <div><dt className="inline text-stone-500">Name: </dt><dd className="inline text-ink">{o.customer_name}</dd></div>
                      <div><dt className="inline text-stone-500">Email: </dt><dd className="inline text-ink">{o.email}</dd></div>
                      <div><dt className="inline text-stone-500">Phone: </dt><dd className="inline text-ink">{o.phone}</dd></div>
                      <div><dt className="inline text-stone-500">City: </dt><dd className="inline text-ink">{o.city}</dd></div>
                      <div><dt className="inline text-stone-500">Address: </dt><dd className="inline text-ink">{o.address}</dd></div>
                      {o.street && <div><dt className="inline text-stone-500">Street: </dt><dd className="inline text-ink">{o.street}</dd></div>}
                      {o.notes && <div><dt className="inline text-stone-500">Notes: </dt><dd className="inline text-ink">{o.notes}</dd></div>}
                    </dl>
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-widest text-stone-400 mb-2">Update Status</h4>
                    <div className="flex flex-wrap gap-2">
                      {(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as OrderStatus[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => updateStatus(o.id, s)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                            o.status === s ? statusColors[s] : 'border-stone-200 text-stone-500 hover:border-stone-400'
                          }`}
                        >
                          {ORDER_STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <a
                        href={`https://wa.me/${o.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs flex items-center gap-1 border border-stone-200 px-3 py-1.5 rounded hover:border-gold hover:text-gold transition-all"
                      >
                        Contact on WhatsApp
                      </a>
                      <button
                        onClick={() => handleDelete(o.id)}
                        className="text-xs flex items-center gap-1 border border-stone-200 px-3 py-1.5 rounded hover:border-red-500 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
