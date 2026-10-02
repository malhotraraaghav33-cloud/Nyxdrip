import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Product, WishlistItem } from '../types';
import { useCart } from './CartContext';
import { useToast } from './ToastContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { PRODUCTS } from '../data/products';

interface WishlistContextType {
  wishlist: WishlistItem[];
  toggleWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  moveToCart: (product: Product) => void;
  wishlistCount: number;
  isSyncing: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const WISHLIST_STORAGE_KEY = 'nyxdrip_wishlist_v1';

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addToCart, openCart } = useCart();
  const { showToast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const isMergingRef = useRef(false);

  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist locally for guests
  useEffect(() => {
    if (!userId) {
      try {
        localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
      } catch {
        // Storage safeguard
      }
    }
  }, [wishlist, userId]);

  // Sync with Supabase on auth state change
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let mounted = true;

    const syncWishlist = async (currentUserId: string | null) => {
      if (!currentUserId) {
        setUserId(null);
        return;
      }

      setUserId(currentUserId);
      if (isMergingRef.current) return;
      isMergingRef.current = true;
      setIsSyncing(true);

      try {
        // Fetch user's wishlist from Supabase
        const { data: dbWishlist, error } = await supabase
          .from('wishlists')
          .select('product_id, created_at')
          .eq('user_id', currentUserId);

        if (error) {
          console.warn('Wishlist fetch note:', error.message);
          return;
        }

        // Merge local guest items into database
        const guestItems = wishlist;
        if (guestItems.length > 0) {
          for (const item of guestItems) {
            const alreadyInDb = (dbWishlist || []).some((w) => w.product_id === item.product.id);
            if (!alreadyInDb) {
              await supabase
                .from('wishlists')
                .insert({
                  user_id: currentUserId,
                  product_id: item.product.id,
                });
            }
          }
          localStorage.removeItem(WISHLIST_STORAGE_KEY);
        }

        // Re-query complete merged wishlist
        const { data: mergedDb } = await supabase
          .from('wishlists')
          .select('product_id, created_at')
          .eq('user_id', currentUserId);

        if (mergedDb && mounted) {
          const loadedItems: WishlistItem[] = [];

          for (const row of mergedDb) {
            let product = PRODUCTS.find((p) => p.id === row.product_id);
            if (!product) {
              const { data: pData } = await supabase
                .from('products')
                .select('*')
                .eq('id', row.product_id)
                .maybeSingle();

              if (pData) {
                product = {
                  id: pData.id,
                  slug: pData.slug,
                  name: pData.name,
                  price: Number(pData.price),
                  category: pData.category_name as any,
                  description: pData.description,
                  images: Array.isArray(pData.images) && pData.images.length > 0 ? pData.images : ['/assets/placeholder.jpg'],
                  rating: Number(pData.rating || 4.9),
                  reviewCount: Number(pData.review_count || 12),
                  stock: Number(pData.stock || 10),
                  tags: pData.tags || [],
                  style: pData.style as any,
                  color: 'Silver',
                  materials: pData.materials || '316L Surgical Steel',
                  careInstructions: pData.care_instructions || '',
                };
              }
            }

            if (product) {
              loadedItems.push({
                product,
                addedAt: row.created_at,
              });
            }
          }

          setWishlist(loadedItems);
        }
      } catch (err) {
        console.warn('Wishlist sync error:', err);
      } finally {
        isMergingRef.current = false;
        if (mounted) setIsSyncing(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) syncWishlist(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) syncWishlist(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isInWishlist = useCallback(
    (productId: string) => {
      return wishlist.some((item) => item.product.id === productId);
    },
    [wishlist]
  );

  const toggleWishlist = useCallback(
    async (product: Product) => {
      const exists = wishlist.some((item) => item.product.id === product.id);

      if (exists) {
        setWishlist((prev) => prev.filter((item) => item.product.id !== product.id));
        showToast('Removed from vault', product.name, 'info');

        if (userId && isSupabaseConfigured) {
          try {
            await supabase
              .from('wishlists')
              .delete()
              .eq('user_id', userId)
              .eq('product_id', product.id);
          } catch (err) {
            console.warn('Supabase wishlist removal error:', err);
          }
        }
      } else {
        const newItem: WishlistItem = { product, addedAt: new Date().toISOString() };
        setWishlist((prev) => [...prev, newItem]);
        showToast('Saved to vault', product.name, 'success');

        if (userId && isSupabaseConfigured) {
          try {
            await supabase
              .from('wishlists')
              .insert({
                user_id: userId,
                product_id: product.id,
              });
          } catch (err) {
            console.warn('Supabase wishlist insertion error:', err);
          }
        }
      }
    },
    [wishlist, showToast, userId]
  );

  const removeFromWishlist = useCallback(
    async (productId: string) => {
      const item = wishlist.find((i) => i.product.id === productId);
      if (item) {
        showToast('Removed from vault', item.product.name, 'info');
      }
      setWishlist((prev) => prev.filter((i) => i.product.id !== productId));

      if (userId && isSupabaseConfigured) {
        try {
          await supabase
            .from('wishlists')
            .delete()
            .eq('user_id', userId)
            .eq('product_id', productId);
        } catch (err) {
          console.warn('Supabase wishlist delete error:', err);
        }
      }
    },
    [wishlist, showToast, userId]
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
        isSyncing,
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
