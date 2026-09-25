import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, WishlistItem } from '../types';
import { useCart } from './CartContext';
import { useToast } from './ToastContext';

interface WishlistContextType {
  wishlist: WishlistItem[];
  toggleWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  moveToCart: (product: Product) => void;
  wishlistCount: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const WISHLIST_STORAGE_KEY = 'nyxdrip_wishlist_v1';

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addToCart, openCart } = useCart();
  const { showToast } = useToast();

  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
    } catch {
      // Storage safeguard
    }
  }, [wishlist]);

  const isInWishlist = useCallback(
    (productId: string) => {
      return wishlist.some((item) => item.product.id === productId);
    },
    [wishlist]
  );

  const toggleWishlist = useCallback(
    (product: Product) => {
      setWishlist((prev) => {
        const exists = prev.some((item) => item.product.id === product.id);
        if (exists) {
          showToast('Removed from wishlist', product.name, 'info');
          return prev.filter((item) => item.product.id !== product.id);
        } else {
          showToast('Added to wishlist', product.name, 'success');
          return [...prev, { product, addedAt: new Date().toISOString() }];
        }
      });
    },
    [showToast]
  );

  const removeFromWishlist = useCallback(
    (productId: string) => {
      setWishlist((prev) => {
        const item = prev.find((i) => i.product.id === productId);
        if (item) {
          showToast('Removed from wishlist', item.product.name, 'info');
        }
        return prev.filter((i) => i.product.id !== productId);
      });
    },
    [showToast]
  );

  const moveToCart = useCallback(
    (product: Product) => {
      addToCart(product, 1);
      removeFromWishlist(product.id);
      openCart();
    },
    [addToCart, removeFromWishlist, openCart]
  );

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        toggleWishlist,
        removeFromWishlist,
        isInWishlist,
        moveToCart,
        wishlistCount: wishlist.length,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
