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
  | 'contact'
  | 'account'
  | 'verify'
  | 'admin'
  | 'admin-login'
  | 'admin-dashboard';

interface NavigationParams {
  productId?: string;
  category?: string;
  style?: string;
  search?: string;
  orderId?: string;
  token?: string;
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

  // Parse path and hash routes on initial load and popstate
  const parseRoute = useCallback(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hasVerifyParams = searchParams.has('token_hash') || (searchParams.get('type') === 'signup') || (searchParams.get('type') === 'email');
    
    // Normalize pathname and hash
    const pathname = window.location.pathname.toLowerCase().replace(/^\/+|\/+$/g, '');
    const hash = window.location.hash.toLowerCase().replace(/^#\/?/, '').replace(/\/+$/g, '');

    // Check for email verification indicators in query or hash
    if (
      hash.startsWith('verify') ||
      pathname.startsWith('verify') ||
      hash.includes('type=signup') ||
      hash.includes('type=email_confirmation') ||
      hasVerifyParams
    ) {
      setCurrentView('verify');
      setParams({});
      return;
    }

    // Determine target route from pathname (direct URL) or hash
    const primaryRoute = pathname.startsWith('admin') ? pathname : (hash || pathname);

    if (primaryRoute === 'admin/login' || primaryRoute === 'admin-login') {
      setCurrentView('admin-login');
      setParams({});
      return;
    }

    if (primaryRoute === 'admin/dashboard' || primaryRoute === 'admin-dashboard') {
      setCurrentView('admin-dashboard');
      setParams({});
      return;
    }

    if (primaryRoute === 'admin') {
      setCurrentView('admin-dashboard');
      setParams({});
      return;
    }

    if (!hash && !pathname) {
      setCurrentView('home');
      setParams({});
      return;
    }

    const activeRaw = hash || pathname;
    const [route, ...rest] = activeRaw.split('/');
    const identifier = rest.join('/');

    if (route === 'verify') {
      setCurrentView('verify');
    } else if (route === 'shop') {
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
    } else if (route === 'account' || route === 'reset-password') {
      setCurrentView('account');
    } else if (route === 'admin-login') {
      setCurrentView('admin-login');
    } else if (route === 'admin-dashboard' || route === 'admin') {
      setCurrentView('admin-dashboard');
    } else if (route === 'order-confirmation' || route === 'order') {
      setCurrentView('order-confirmation');
      const urlParams = new URLSearchParams(window.location.search);
      const hashQuery = hash.includes('?') ? new URLSearchParams(hash.split('?')[1]) : null;
      const orderId = (identifier ? identifier.split('?')[0] : '') || urlParams.get('orderId') || hashQuery?.get('orderId') || undefined;
      const token = urlParams.get('token') || hashQuery?.get('token') || undefined;
      setParams({ orderId, token });
    } else if (route === 'collections' && identifier) {
      setCurrentView('shop');
      setParams({ category: identifier });
    } else {
      setCurrentView('home');
      setParams({});
    }
  }, []);

  useEffect(() => {
    parseRoute();
    window.addEventListener('popstate', parseRoute);
    window.addEventListener('hashchange', parseRoute);
    return () => {
      window.removeEventListener('popstate', parseRoute);
      window.removeEventListener('hashchange', parseRoute);
    };
  }, [parseRoute]);

  const navigateTo = useCallback((view: ViewType, newParams: NavigationParams = {}) => {
    setCurrentView(view);
    setParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    let newUrl = `#${view}`;
    if (view === 'admin-login') {
      newUrl = window.location.pathname.startsWith('/admin') ? '/admin/login' : '#admin/login';
    } else if (view === 'admin-dashboard' || view === 'admin') {
      newUrl = window.location.pathname.startsWith('/admin') ? '/admin/dashboard' : '#admin/dashboard';
    } else if (view === 'product' && newParams.productId) {
      newUrl = `#product/${newParams.productId}`;
    } else if (view === 'order-confirmation' && newParams.orderId) {
      newUrl = `#order-confirmation/${newParams.orderId}`;
    } else if (view === 'home') {
      newUrl = window.location.pathname.startsWith('/admin') ? '/' : '#';
    }

    window.history.pushState(null, '', newUrl);
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
