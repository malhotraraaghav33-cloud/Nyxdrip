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
  newArrivalsOnly?: boolean;
}

interface HistoryRouteState {
  view: ViewType;
  params?: NavigationParams;
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

function parseLocationRoute(): { view: ViewType; params: NavigationParams } {
  const searchParams = new URLSearchParams(window.location.search);
  const hasVerifyParams =
    searchParams.has('token_hash') ||
    searchParams.get('type') === 'signup' ||
    searchParams.get('type') === 'email';

  const pathname = window.location.pathname.toLowerCase().replace(/^\/+|\/+$/g, '');
  const rawHash = window.location.hash.replace(/^#\/?/, '').replace(/\/+$/g, '');
  const hashLower = rawHash.toLowerCase();

  // Check for email verification indicators in query or hash
  if (
    hashLower.startsWith('verify') ||
    pathname.startsWith('verify') ||
    hashLower.includes('type=signup') ||
    hashLower.includes('type=email_confirmation') ||
    hasVerifyParams
  ) {
    return { view: 'verify', params: {} };
  }

  // Determine target route from pathname (direct URL) or hash
  const primaryRoute = pathname.startsWith('admin') ? pathname : (hashLower.split('?')[0] || pathname);

  if (primaryRoute === 'admin/login' || primaryRoute === 'admin-login') {
    return { view: 'admin-login', params: {} };
  }

  if (primaryRoute === 'admin/dashboard' || primaryRoute === 'admin-dashboard' || primaryRoute === 'admin') {
    return { view: 'admin-dashboard', params: {} };
  }

  if (!hashLower && !pathname) {
    return { view: 'home', params: {} };
  }

  const activeRawWithQuery = rawHash || pathname;
  const [activePath, activeQuery = ''] = activeRawWithQuery.split('?');
  const [routeRaw, ...rest] = activePath.split('/');
  const route = routeRaw.toLowerCase();
  const identifier = rest.join('/');

  const hashQueryParams = new URLSearchParams(activeQuery);
  const mergedGet = (key: string) => hashQueryParams.get(key) || searchParams.get(key) || undefined;

  if (route === 'verify') {
    return { view: 'verify', params: {} };
  }
  if (route === 'shop') {
    return {
      view: 'shop',
      params: {
        category: mergedGet('category'),
        style: mergedGet('style'),
        search: mergedGet('search'),
        newArrivalsOnly: mergedGet('newArrivalsOnly') === 'true' ? true : undefined,
      },
    };
  }
  if (route === 'product' && identifier) {
    return { view: 'product', params: { productId: identifier } };
  }
  if (route === 'checkout') {
    return { view: 'checkout', params: {} };
  }
  if (route === 'cart') {
    return { view: 'cart', params: {} };
  }
  if (route === 'wishlist') {
    return { view: 'wishlist', params: {} };
  }
  if (route === 'about') {
    return { view: 'about', params: {} };
  }
  if (route === 'contact') {
    return { view: 'contact', params: {} };
  }
  if (route === 'account' || route === 'reset-password') {
    return { view: 'account', params: {} };
  }
  if (route === 'admin-login') {
    return { view: 'admin-login', params: {} };
  }
  if (route === 'admin-dashboard' || route === 'admin') {
    return { view: 'admin-dashboard', params: {} };
  }
  if (route === 'order-confirmation' || route === 'order') {
    const orderId = identifier || mergedGet('orderId');
    const token = mergedGet('token');
    return { view: 'order-confirmation', params: { orderId, token } };
  }
  if (route === 'collections' && identifier) {
    return { view: 'shop', params: { category: identifier } };
  }

  return { view: 'home', params: {} };
}

function buildRouteUrl(view: ViewType, newParams: NavigationParams): string {
  if (view === 'admin-login') {
    return window.location.pathname.startsWith('/admin') ? '/admin/login' : '/#admin/login';
  }
  if (view === 'admin-dashboard' || view === 'admin') {
    return window.location.pathname.startsWith('/admin') ? '/admin/dashboard' : '/#admin/dashboard';
  }
  if (view === 'product' && newParams.productId) {
    return `/#product/${newParams.productId}`;
  }
  if (view === 'order-confirmation' && newParams.orderId) {
    return `/#order-confirmation/${newParams.orderId}`;
  }
  if (view === 'shop') {
    const qs = new URLSearchParams();
    if (newParams.category) qs.set('category', newParams.category);
    if (newParams.style) qs.set('style', newParams.style);
    if (newParams.search) qs.set('search', newParams.search);
    if (newParams.newArrivalsOnly) qs.set('newArrivalsOnly', 'true');
    const queryStr = qs.toString();
    return queryStr ? `/#shop?${queryStr}` : '/#shop';
  }
  if (view === 'home') {
    return '/';
  }
  return `/#${view}`;
}

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialRoute = React.useMemo(() => parseLocationRoute(), []);
  const [currentView, setCurrentView] = useState<ViewType>(initialRoute.view);
  const [params, setParams] = useState<NavigationParams>(initialRoute.params);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const syncFromHistoryOrLocation = useCallback((historyState?: unknown) => {
    setIsSearchModalOpen(false);
    if (
      historyState &&
      typeof historyState === 'object' &&
      'view' in historyState &&
      typeof (historyState as HistoryRouteState).view === 'string'
    ) {
      const typed = historyState as HistoryRouteState;
      setCurrentView(typed.view);
      setParams(typed.params || {});
      return;
    }

    const parsed = parseLocationRoute();
    setCurrentView(parsed.view);
    setParams(parsed.params);
  }, []);

  useEffect(() => {
    // Ensure initial history entry has state so pressing Back to the first page always restores cleanly
    if (!window.history.state || typeof window.history.state !== 'object' || !('view' in window.history.state)) {
      const initial = parseLocationRoute();
      window.history.replaceState({ view: initial.view, params: initial.params }, '', window.location.href);
    }

    const handlePopState = (event: PopStateEvent) => {
      syncFromHistoryOrLocation(event.state);
    };

    const handleHashChange = () => {
      // Only fall back to URL parsing if history.state doesn't already carry the route
      if (window.history.state && typeof window.history.state === 'object' && 'view' in window.history.state) {
        syncFromHistoryOrLocation(window.history.state);
      } else {
        syncFromHistoryOrLocation();
      }
    };

    const handlePageShow = () => {
      syncFromHistoryOrLocation(window.history.state);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [syncFromHistoryOrLocation]);

  const navigateTo = useCallback((view: ViewType, newParams: NavigationParams = {}) => {
    setIsSearchModalOpen(false);
    setCurrentView(view);
    setParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const newUrl = buildRouteUrl(view, newParams);
    const currentFullPath = `${window.location.pathname}${window.location.hash}`;
    const stateObj: HistoryRouteState = { view, params: newParams };

    if (currentFullPath === newUrl) {
      window.history.replaceState(stateObj, '', newUrl);
    } else {
      window.history.pushState(stateObj, '', newUrl);
    }
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
