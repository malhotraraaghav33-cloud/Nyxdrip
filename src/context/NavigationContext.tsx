import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ViewType = 
  | 'home' 
  | 'shop' 
  | 'product' 
  | 'cart' 
  | 'checkout' 
  | 'order-confirmation' 
  | 'wishlist' 
  | 'about' 
  | 'contact';

interface NavigationParams {
  productId?: string;
  category?: string;
  style?: string;
  search?: string;
  orderId?: string;
}

interface NavigationContextType {
  currentView: ViewType;
  params: NavigationParams;
  navigateTo: (view: ViewType, params?: NavigationParams) => void;
  openSearchModal: () => void;
  closeSearchModal: () => void;
  isSearchModalOpen: boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [params, setParams] = useState<NavigationParams>({});
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Parse hash route on initial load and popstate
  const parseHash = useCallback(() => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (!hash) {
      setCurrentView('home');
      setParams({});
      return;
    }

    const [route, ...rest] = hash.split('/');
    const identifier = rest.join('/');

    if (route === 'shop') {
      setCurrentView('shop');
      const urlParams = new URLSearchParams(window.location.search);
      setParams({
        category: urlParams.get('category') || undefined,
        style: urlParams.get('style') || undefined,
        search: urlParams.get('search') || undefined,
      });
    } else if (route === 'product' && identifier) {
      setCurrentView('product');
      setParams({ productId: identifier });
    } else if (route === 'checkout') {
      setCurrentView('checkout');
    } else if (route === 'cart') {
      setCurrentView('cart');
    } else if (route === 'wishlist') {
      setCurrentView('wishlist');
    } else if (route === 'about') {
      setCurrentView('about');
    } else if (route === 'contact') {
      setCurrentView('contact');
    } else if (route === 'order-confirmation') {
      setCurrentView('order-confirmation');
      setParams({ orderId: identifier });
    } else if (route === 'collections' && identifier) {
      setCurrentView('shop');
      setParams({ category: identifier });
    } else {
      setCurrentView('home');
      setParams({});
    }
  }, []);

  useEffect(() => {
    parseHash();
    window.addEventListener('popstate', parseHash);
    window.addEventListener('hashchange', parseHash);
    return () => {
      window.removeEventListener('popstate', parseHash);
      window.removeEventListener('hashchange', parseHash);
    };
  }, [parseHash]);

  const navigateTo = useCallback((view: ViewType, newParams: NavigationParams = {}) => {
    setCurrentView(view);
    setParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    let hash = `#${view}`;
    if (view === 'product' && newParams.productId) {
      hash = `#product/${newParams.productId}`;
    } else if (view === 'order-confirmation' && newParams.orderId) {
      hash = `#order-confirmation/${newParams.orderId}`;
    } else if (view === 'home') {
      hash = '#';
    }

    window.history.pushState(null, '', hash);
  }, []);

  const openSearchModal = useCallback(() => setIsSearchModalOpen(true), []);
  const closeSearchModal = useCallback(() => setIsSearchModalOpen(false), []);

  return (
    <NavigationContext.Provider
      value={{
        currentView,
        params,
        navigateTo,
        isSearchModalOpen,
        openSearchModal,
        closeSearchModal,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
