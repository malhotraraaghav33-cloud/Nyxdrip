import React from 'react';
import { ToastProvider } from './context/ToastContext';
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

const AppContent: React.FC = () => {
  const { currentView } = useNavigation();

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0D] text-[#F5F5F7]">
      {/* Brand Intro Loader on first session visit */}
      <BrandLoader />

      {/* Cybernetic Custom Cursor for Desktop */}
      <CustomCursor />

      {/* Sticky Top Navbar */}
      <Navbar />

      {/* Main View Router with Smooth Fade Transition */}
      <main className="flex-1">
        <RouteTransition currentView={currentView}>
          {currentView === 'home' && (
            <>
              <Hero />
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
        </RouteTransition>
      </main>

      {/* Footer */}
      <Footer />

      {/* Global Slide-Over Drawers & Modals */}
      <CartDrawer />
      <SearchModal />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <CartProvider>
        <WishlistProvider>
          <NavigationProvider>
            <AppContent />
          </NavigationProvider>
        </WishlistProvider>
      </CartProvider>
    </ToastProvider>
  );
}
