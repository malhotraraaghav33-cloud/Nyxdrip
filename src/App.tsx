import React from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { ProductProvider } from './context/ProductContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { NavigationProvider, useNavigation } from './context/NavigationContext';

import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { CartDrawer } from './components/cart/CartDrawer';
import { SearchModal } from './components/modals/SearchModal';
import { CustomCursor } from './components/common/CustomCursor';
import { BrandLoader } from './components/common/BrandLoader';
import { RouteTransition } from './components/common/RouteTransition';

import { Hero } from './components/home/Hero';
import { LaunchCountdown } from './components/home/LaunchCountdown';
import { CategorySection } from './components/home/CategorySection';
import { FeaturedSection } from './components/home/FeaturedSection';
import { BrandStatement } from './components/home/BrandStatement';
import { NewDropSection } from './components/home/NewDropSection';
import { Newsletter } from './components/home/Newsletter';

import { ShopView } from './components/shop/ShopView';
import { ProductDetailView } from './components/product/ProductDetailView';
import { CartPage } from './components/cart/CartPage';
import { CheckoutView } from './components/checkout/CheckoutView';
import { OrderConfirmationView } from './components/checkout/OrderConfirmationView';
import { WishlistView } from './components/wishlist/WishlistView';
import { AboutView } from './components/about/AboutView';
import { ContactView } from './components/contact/ContactView';
import { AccountView } from './components/account/AccountView';
import { VerifyEmailView } from './components/account/VerifyEmailView';
import { AdminLoginView } from './components/admin/AdminLoginView';
import { AdminDashboardView } from './components/admin/AdminDashboardView';

const AppContent: React.FC = () => {
  const { currentView } = useNavigation();
  const isAdminView = currentView === 'admin' || currentView === 'admin-login' || currentView === 'admin-dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0D] text-[#F5F5F7]">
      {/* Brand Intro Loader on first session visit - storefront only */}
      {!isAdminView && <BrandLoader />}

      {/* Cybernetic Custom Cursor for Desktop */}
      <CustomCursor />

      {/* Sticky Top Navbar - storefront only */}
      {!isAdminView && <Navbar />}

      {/* Main View Router with Smooth Fade Transition */}
      <main className="flex-1">
        <RouteTransition currentView={currentView}>
          {currentView === 'home' && (
            <>
              <Hero />
              <LaunchCountdown />
              <BrandStatement />
              <FeaturedSection />
              <CategorySection />
              <NewDropSection />
              <Newsletter />
            </>
          )}

          {currentView === 'shop' && <ShopView />}
          {currentView === 'product' && <ProductDetailView />}
          {currentView === 'cart' && <CartPage />}
          {currentView === 'checkout' && <CheckoutView />}
          {currentView === 'order-confirmation' && <OrderConfirmationView />}
          {currentView === 'wishlist' && <WishlistView />}
          {currentView === 'about' && <AboutView />}
          {currentView === 'contact' && <ContactView />}
          {currentView === 'account' && <AccountView />}
          {currentView === 'verify' && <VerifyEmailView />}
          {currentView === 'admin-login' && <AdminLoginView />}
          {(currentView === 'admin-dashboard' || currentView === 'admin') && <AdminDashboardView />}
        </RouteTransition>
      </main>

      {/* Footer - storefront only */}
      {!isAdminView && <Footer />}

      {/* Global Slide-Over Drawers & Modals */}
      <CartDrawer />
      <SearchModal />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <ProductProvider>
          <CartProvider>
            <WishlistProvider>
              <NavigationProvider>
                <AppContent />
              </NavigationProvider>
            </WishlistProvider>
          </CartProvider>
        </ProductProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
