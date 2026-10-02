import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Product, CartItem, Coupon } from '../types';
import { useToast } from './ToastContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { validateCouponCode } from '../services/couponService';
import {
  getProductByKey,
  loadGuestCartFromStorage,
  saveGuestCartToStorage,
  clearGuestCartFromStorage,
  GUEST_CART_STORAGE_KEY,
  MAX_ITEM_QUANTITY,
  MIN_ITEM_QUANTITY,
  StoredCartItem,
  getOrCreateCartId,
  fetchCartItemsFromDB,
  addItemToDBCart,
  updateItemQuantityInDBCart,
  removeItemFromDBCart,
  clearCartInDBCart,
  mergeGuestCartWithDB,
} from '../services/cartService';

export interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, selectedVariant?: string) => void;
  updateQuantity: (productId: string, variant: string | undefined, quantity: number) => void;
  removeFromCart: (productId: string, variant?: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  appliedCoupon: Coupon | null;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  itemCount: number;
  freeShippingThreshold: number;
  amountNeededForFreeShipping: number;
  isCartPulsing: boolean;
  isSyncing: boolean;
  isLoading: boolean;
  error: string | null;
  retry: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const COUPON_STORAGE_KEY = 'nyxdrip_coupon_v1';
const FREE_SHIPPING_THRESHOLD = 999;
const STANDARD_SHIPPING_FEE = 99;

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();

  // Active authenticated user ID
  const [userId, setUserId] = useState<string | null>(null);

  // Cached DB cart ID in memory so it's not looked up on every single mutation
  const cachedCartIdRef = useRef<string | null>(null);

  // Stored items: ONLY { product_key, quantity }
  const [storedItems, setStoredItems] = useState<StoredCartItem[]>(() => {
    // Initial state from guest localStorage
    return loadGuestCartFromStorage();
  });

  // Track previous state for optimistic rollback
  const previousStoredItemsRef = useRef<StoredCartItem[]>(storedItems);

  // Loading and error states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Last failed operation for retry
  const pendingRetryActionRef = useRef<(() => Promise<void>) | null>(null);

  // Debounce maps per product_key for rapid quantity clicks
  const quantityDebounceTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Guards against concurrent duplicate merges / fetches
  const isMergingRef = useRef<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);
  const lastFetchedUserIdRef = useRef<string | null>(null);

  // UI state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCartPulsing, setIsCartPulsing] = useState(false);

  // Coupon state
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(() => {
    try {
      const stored = localStorage.getItem(COUPON_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Persist coupon to localStorage
  useEffect(() => {
    try {
      if (appliedCoupon) {
        localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(appliedCoupon));
      } else {
        localStorage.removeItem(COUPON_STORAGE_KEY);
      }
    } catch {
      // Storage safeguard
    }
  }, [appliedCoupon]);

  // Keep previousStoredItemsRef in sync with storedItems
  useEffect(() => {
    previousStoredItemsRef.current = storedItems;
  }, [storedItems]);

  // ============================================================================
  // DERIVED ITEMS & TOTALS (NEVER TRUST CLIENT-SUPPLIED PRICES)
  // ============================================================================

  // Look up full product data by product_key at render time
  const items = useMemo<CartItem[]>(() => {
    const result: CartItem[] = [];
    for (const stored of storedItems) {
      if (!stored?.product_key) continue;
      const product = getProductByKey(stored.product_key);
      if (!product) {
        // Stored product_key no longer exists in dataset: hide gracefully, do not count in totals
        continue;
      }
      result.push({
        product,
        quantity: Math.min(Math.max(MIN_ITEM_QUANTITY, stored.quantity), MAX_ITEM_QUANTITY),
        selectedVariant: product.variants?.options[0] || 'Standard',
      });
    }
    return result;
  }, [storedItems]);

  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [items]);

  const discount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.minOrderAmount && subtotal < appliedCoupon.minOrderAmount) {
      return 0;
    }
    return Math.round((subtotal * appliedCoupon.discountPercent) / 100);
  }, [subtotal, appliedCoupon]);

  const shipping = useMemo(() => {
    if (subtotal === 0) return 0;
    return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
  }, [subtotal]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discount + shipping);
  }, [subtotal, discount, shipping]);

  const amountNeededForFreeShipping = useMemo(() => {
    return Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  }, [subtotal]);

  // ============================================================================
  // GUEST CROSS-TAB STORAGE SYNCHRONIZATION
  // ============================================================================

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Only sync if unauthenticated and the cart key changed
      if (!userId && e.key === GUEST_CART_STORAGE_KEY) {
        const fresh = loadGuestCartFromStorage();
        setStoredItems(fresh);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [userId]);

  // ============================================================================
  // AUTHENTICATION & DATABASE SYNCHRONIZATION
  // ============================================================================

  /**
   * Loads the authenticated user's cart from Supabase.
   * Handles guest cart merge if guest items exist in localStorage.
   */
  const loadDBCart = useCallback(
    async (currentUserId: string, performMerge = true) => {
      if (!isSupabaseConfigured) return;
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        // 1. Get or create user's cart row and cache its ID
        const cartId = await getOrCreateCartId(supabase);
        cachedCartIdRef.current = cartId;

        // 2. Check for guest items to merge
        if (performMerge && !isMergingRef.current) {
          const guestItems = loadGuestCartFromStorage();
          if (guestItems.length > 0) {
            isMergingRef.current = true;
            setIsSyncing(true);

            try {
              await mergeGuestCartWithDB(supabase, cartId, guestItems);
              // Only after successful merge: clear guest localStorage
              clearGuestCartFromStorage();
              showToast('Bag Synchronized', 'Your guest items have been saved to your account.', 'info');
            } catch (mergeErr) {
              console.warn('Guest cart merge failed:', mergeErr);
              // Preserve guest cart in localStorage so items are never lost!
              showToast('Sync Notice', 'Could not merge all guest items. You can retry from your bag.', 'info');
            } finally {
              isMergingRef.current = false;
              setIsSyncing(false);
            }
          }
        }

        // 3. Fetch latest items from database cart
        const dbItems = await fetchCartItemsFromDB(supabase, cartId);
        setStoredItems(dbItems);
        lastFetchedUserIdRef.current = currentUserId;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Database error';
        console.warn('Cart load error:', msg);
        // Fall back gracefully to guest cart so user is never stuck with broken state
        const fallbackGuest = loadGuestCartFromStorage();
        setStoredItems(fallbackGuest);
        setError("We couldn't sync your bag with the cloud. Working locally.");
      } finally {
        isFetchingRef.current = false;
        setIsLoading(false);
      }
    },
    [showToast]
  );

  // Listen to Supabase auth state and synchronize
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let mounted = true;

    const handleAuthChange = async (currentUserId: string | null) => {
      if (!mounted) return;

      if (!currentUserId) {
        // SIGN OUT: Clear in-memory cart & cached cart ID.
        // DO NOT put the previous user's DB cart into localStorage.
        // Start fresh with an empty guest cart.
        setUserId(null);
        cachedCartIdRef.current = null;
        lastFetchedUserIdRef.current = null;
        setStoredItems([]);
        clearGuestCartFromStorage();
        setIsLoading(false);
        setError(null);
        return;
      }

      setUserId(currentUserId);

      // Only fetch if user ID changed or never fetched
      if (lastFetchedUserIdRef.current !== currentUserId) {
        await loadDBCart(currentUserId, true);
      }
    };

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        handleAuthChange(session?.user?.id ?? null);
      }
    });

    // Subscribe to auth events (SIGNED_IN, SIGNED_OUT, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
        handleAuthChange(session?.user?.id ?? null);
      } else if (event === 'SIGNED_OUT') {
        handleAuthChange(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadDBCart]);

  // ============================================================================
  // CART ACTIONS & OPTIMISTIC MUTATIONS
  // ============================================================================

  const triggerPulse = useCallback(() => {
    setIsCartPulsing(true);
    setTimeout(() => setIsCartPulsing(false), 550);
  }, []);

  /**
   * Helper to ensure cart ID is available for authenticated user.
   */
  const getEnsureCartId = useCallback(async (): Promise<string | null> => {
    if (!userId || !isSupabaseConfigured) return null;
    if (cachedCartIdRef.current) return cachedCartIdRef.current;
    try {
      const cid = await getOrCreateCartId(supabase);
      cachedCartIdRef.current = cid;
      return cid;
    } catch {
      return null;
    }
  }, [userId]);

  /**
   * Add Item to Cart.
   * Optimistically updates UI immediately, then persists to DB or localStorage.
   */
  const addToCart = useCallback(
    (product: Product, quantity = 1, selectedVariant?: string) => {
      const productKey = product.id;
      const validQty = Math.max(MIN_ITEM_QUANTITY, Math.min(quantity, MAX_ITEM_QUANTITY));
      const previousState = previousStoredItemsRef.current;

      // 1. OPTIMISTIC UPDATE
      setStoredItems((prev) => {
        const existingIndex = prev.findIndex((i) => i.product_key === productKey);
        let next: StoredCartItem[];

        if (existingIndex > -1) {
          next = [...prev];
          const combined = Math.min(next[existingIndex].quantity + validQty, product.stock, MAX_ITEM_QUANTITY);
          next[existingIndex] = { product_key: productKey, quantity: combined };
        } else {
          const clamped = Math.min(validQty, product.stock, MAX_ITEM_QUANTITY);
          next = [...prev, { product_key: productKey, quantity: clamped }];
        }

        // For guests, persist immediately
        if (!userId) {
          saveGuestCartToStorage(next);
        }

        return next;
      });

      triggerPulse();
      const variantLabel = selectedVariant ? ` (${selectedVariant})` : '';
      showToast('Added to bag', `${product.name}${variantLabel}`, 'success');

      // 2. PERSIST TO DATABASE FOR AUTHENTICATED USERS
      if (userId && isSupabaseConfigured) {
        setIsSyncing(true);
        (async () => {
          try {
            const cartId = await getEnsureCartId();
            if (!cartId) throw new Error('No cart ID');
            await addItemToDBCart(supabase, cartId, productKey, validQty);
          } catch (err) {
            console.warn('Failed to add item to cloud cart:', err);
            // Roll back optimistic state
            setStoredItems(previousState);
            setError("We couldn't update your cart. Please try again.");
            showToast('Cart Update Failed', "We couldn't update your cart. Please try again.", 'error');

            pendingRetryActionRef.current = async () => {
              addToCart(product, quantity, selectedVariant);
            };
          } finally {
            setIsSyncing(false);
          }
        })();
      }
    },
    [userId, showToast, triggerPulse, getEnsureCartId]
  );

  /**
   * Update Item Quantity.
   * Debounces network requests for rapid clicks to prevent race conditions.
   * Respects min (1) and max (stock/99). Does not remove at quantity 1.
   */
  const updateQuantity = useCallback(
    (productId: string, _variant: string | undefined, quantity: number) => {
      // Find item
      const product = getProductByKey(productId);
      const productKey = product ? product.id : productId;
      const maxAllowed = product ? Math.min(product.stock, MAX_ITEM_QUANTITY) : MAX_ITEM_QUANTITY;

      // Block going below 1 (minus at 1 does nothing; remove button is used for removal)
      const targetQty = Math.max(MIN_ITEM_QUANTITY, Math.min(quantity, maxAllowed));
      const previousState = previousStoredItemsRef.current;

      // 1. OPTIMISTIC UPDATE
      setStoredItems((prev) => {
        const next = prev.map((item) => {
          if (item.product_key === productKey) {
            return { ...item, quantity: targetQty };
          }
          return item;
        });

        if (!userId) {
          saveGuestCartToStorage(next);
        }

        return next;
      });

      // 2. DEBOUNCED DATABASE PERSISTENCE
      if (userId && isSupabaseConfigured) {
        const existingTimer = quantityDebounceTimersRef.current.get(productKey);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        const newTimer = setTimeout(async () => {
          quantityDebounceTimersRef.current.delete(productKey);
          setIsSyncing(true);

          try {
            const cartId = await getEnsureCartId();
            if (!cartId) throw new Error('No cart ID');
            await updateItemQuantityInDBCart(supabase, cartId, productKey, targetQty);
          } catch (err) {
            console.warn('Failed to update item quantity in cloud cart:', err);
            setStoredItems(previousState);
            setError("We couldn't update the item quantity. Please try again.");
            showToast('Cart Update Failed', "We couldn't update the item quantity. Please try again.", 'error');

            pendingRetryActionRef.current = async () => {
              updateQuantity(productId, _variant, quantity);
            };
          } finally {
            setIsSyncing(false);
          }
        }, 300); // 300ms debounce ensures rapid clicks coalesce smoothly

        quantityDebounceTimersRef.current.set(productKey, newTimer);
      }
    },
    [userId, showToast, getEnsureCartId]
  );

  /**
   * Remove Item from Cart.
   */
  const removeFromCart = useCallback(
    (productId: string, _variant?: string) => {
      const product = getProductByKey(productId);
      const productKey = product ? product.id : productId;
      const productName = product ? product.name : 'Item';
      const previousState = previousStoredItemsRef.current;

      // 1. OPTIMISTIC UPDATE
      setStoredItems((prev) => {
        const next = prev.filter((i) => i.product_key !== productKey);
        if (!userId) {
          saveGuestCartToStorage(next);
        }
        return next;
      });

      showToast('Removed from bag', productName, 'info');

      // 2. PERSIST TO DATABASE
      if (userId && isSupabaseConfigured) {
        setIsSyncing(true);
        (async () => {
          try {
            const cartId = await getEnsureCartId();
            if (!cartId) throw new Error('No cart ID');
            await removeItemFromDBCart(supabase, cartId, productKey);
          } catch (err) {
            console.warn('Failed to remove item from cloud cart:', err);
            setStoredItems(previousState);
            setError("We couldn't remove the item. Please try again.");
            showToast('Cart Update Failed', "We couldn't remove the item. Please try again.", 'error');

            pendingRetryActionRef.current = async () => {
              removeFromCart(productId, _variant);
            };
          } finally {
            setIsSyncing(false);
          }
        })();
      }
    },
    [userId, showToast, getEnsureCartId]
  );

  /**
   * Clear Cart.
   */
  const clearCart = useCallback(() => {
    const previousState = previousStoredItemsRef.current;

    // 1. OPTIMISTIC UPDATE
    setStoredItems([]);
    setAppliedCoupon(null);
    clearGuestCartFromStorage();

    // 2. PERSIST TO DATABASE
    if (userId && isSupabaseConfigured) {
      setIsSyncing(true);
      (async () => {
        try {
          const cartId = await getEnsureCartId();
          if (!cartId) throw new Error('No cart ID');
          await clearCartInDBCart(supabase, cartId);
        } catch (err) {
          console.warn('Failed to clear cloud cart:', err);
          setStoredItems(previousState);
          setError("We couldn't clear your cart. Please try again.");
        } finally {
          setIsSyncing(false);
        }
      })();
    }
  }, [userId, getEnsureCartId]);

  /**
   * Retry the last failed action.
   */
  const retry = useCallback(async () => {
    if (pendingRetryActionRef.current) {
      const action = pendingRetryActionRef.current;
      pendingRetryActionRef.current = null;
      setError(null);
      await action();
    } else if (userId) {
      await loadDBCart(userId, false);
    }
  }, [userId, loadDBCart]);

  /**
   * Refresh the cart from Supabase.
   */
  const refresh = useCallback(async () => {
    if (userId) {
      await loadDBCart(userId, false);
    } else {
      setStoredItems(loadGuestCartFromStorage());
    }
  }, [userId, loadDBCart]);

  // ============================================================================
  // COUPON HANDLING
  // ============================================================================

  const applyCoupon = useCallback(
    async (code: string) => {
      const result = await validateCouponCode(code, subtotal);

      if (!result.valid || !result.coupon) {
        return { success: false, message: result.message };
      }

      setAppliedCoupon(result.coupon);
      showToast('Code applied', `${result.coupon.code}: ${result.coupon.discountPercent}% OFF`, 'success');
      return { success: true, message: result.message };
    },
    [subtotal, showToast]
  );

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    showToast('Coupon removed', undefined, 'info');
  }, [showToast]);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        isCartOpen,
        openCart,
        closeCart,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        subtotal,
        discount,
        shipping,
        total,
        itemCount,
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
        amountNeededForFreeShipping,
        isCartPulsing,
        isSyncing,
        isLoading,
        error,
        retry,
        refresh,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
