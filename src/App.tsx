import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/lib/toast';
import { CartProvider } from '@/lib/cart';
import { CurrencyProvider } from '@/lib/currency';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ScrollToTop from '@/components/ScrollToTop';
import Home from '@/pages/Home';
import Shop from '@/pages/Shop';
import NewArrivals from '@/pages/NewArrivals';
import ProductDetail from '@/pages/ProductDetail';
import AdminLogin from '@/pages/admin/AdminLogin';
import AdminDashboard from '@/pages/admin/AdminDashboard';

function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <CartProvider>
        <ToastProvider>
          <BrowserRouter>
            <ScrollToTop />
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/shop/:slug" element={<Shop />} />
                  <Route path="/new-arrivals" element={<NewArrivals />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/admin" element={<AdminLogin />} />
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="*" element={<Home />} />
                </Routes>
              </main>
              <Footer />
              <CartDrawer />
            </div>
          </BrowserRouter>
        </ToastProvider>
        </CartProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
}

export default App;
