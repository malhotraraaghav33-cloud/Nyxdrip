import { SupabaseClient } from '@supabase/supabase-js';
import { Product } from '../types';
import { PRODUCTS, SLUG_ALIASES } from '../data/products';

export const GUEST_CART_STORAGE_KEY = 'nyx_guest_cart_v1';
export const MAX_ITEM_QUANTITY = 99;
export const MIN_ITEM_QUANTITY = 1;

export interface StoredCartItem {
  product_key: string;
  quantity: number;
}

let runtimeProductsCache: Product[] = PRODUCTS;

export const setRuntimeProductsCache = (prods: Product[]) => {
  if (Array.isArray(prods) && prods.length > 0) {
    runtimeProductsCache = prods;
  }
};

/**
 * SINGLE HELPER for looking up a product by its permanent key (slug or UUID).
 * Searches the runtime Supabase-loaded products first, then local fallback PRODUCTS.
 */
export const getProductByKey = (productKey: string): Product | null => {
  if (!productKey || typeof productKey !== 'string') return null;
  const rawKey = productKey.trim().toLowerCase();
  const normalized = SLUG_ALIASES[rawKey] || rawKey;
  
  // 1. Check runtime Supabase products
  const foundInRuntime = runtimeProductsCache.find(
    (p) => p.slug.toLowerCase() === normalized || p.id.toLowerCase() === normalized
  );
  if (foundInRuntime) return foundInRuntime;

  // 2. Check local fallback PRODUCTS
  const foundInLocal = PRODUCTS.find(
    (p) => p.slug.toLowerCase() === normalized || p.id.toLowerCase() === normalized
  );
  return foundInLocal || null;
};

// ============================================================================
// GUEST LOCAL STORAGE HELPERS
// ============================================================================

/**
 * Safely loads and sanitizes the guest cart from localStorage.
 * Validates product keys against getProductByKey, clamps quantities,
 * and drops any old dummy/orphaned products with zero crash.
 */
export const loadGuestCartFromStorage = (): StoredCartItem[] => {
  try {
    const raw = localStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Map to aggregate duplicates and drop invalid entries
    const keyMap = new Map<string, number>();

    for (const entry of parsed) {
      if (!entry || typeof entry !== 'object') continue;
      const key = typeof entry.product_key === 'string' ? entry.product_key.trim() : (entry.product?.slug || entry.product?.id || '');
      const rawQty = typeof entry.quantity === 'number' ? entry.quantity : 1;

      // Verify product exists in active catalog
      const product = getProductByKey(key);
      if (!product) continue; // Drop orphaned/old dummy products gracefully

      // Use canonical slug as the stable product_key
      const canonicalKey = product.slug;
      const validQty = Math.max(MIN_ITEM_QUANTITY, Math.min(Math.floor(rawQty), MAX_ITEM_QUANTITY));
      const current = keyMap.get(canonicalKey) || 0;
      keyMap.set(canonicalKey, Math.min(current + validQty, MAX_ITEM_QUANTITY));
    }

    const sanitized: StoredCartItem[] = [];
    keyMap.forEach((quantity, product_key) => {
      sanitized.push({ product_key, quantity });
    });

    return sanitized;
  } catch (err) {
    console.warn('Unable to load guest cart from localStorage:', err);
    return [];
  }
};

/**
 * Safely persists the sanitized guest cart to localStorage.
 */
export const saveGuestCartToStorage = (items: StoredCartItem[]): void => {
  try {
    const sanitized = items
      .filter((i) => i && typeof i.product_key === 'string' && i.quantity >= MIN_ITEM_QUANTITY)
      .map((i) => ({
        product_key: i.product_key,
        quantity: Math.min(Math.max(MIN_ITEM_QUANTITY, Math.floor(i.quantity)), MAX_ITEM_QUANTITY),
      }));

    localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.warn('Unable to save guest cart to localStorage:', err);
  }
};

/**
 * Clears the guest cart from localStorage.
 */
export const clearGuestCartFromStorage = (): void => {
  try {
    localStorage.removeItem(GUEST_CART_STORAGE_KEY);
  } catch (err) {
    console.warn('Unable to clear guest cart in localStorage:', err);
  }
};

// ============================================================================
// SUPABASE DATABASE-BACKED CART OPERATIONS
// ============================================================================

/**
 * Retrieves the current authenticated user's cart ID, creating one if not exists.
 * Uses atomic RPC get_or_create_cart() with a safe direct-query fallback.
 */
export const getOrCreateCartId = async (supabase: SupabaseClient): Promise<string> => {
  // 1. Try atomic RPC get_or_create_cart()
  try {
    const { data: rpcCartId, error: rpcError } = await supabase.rpc('get_or_create_cart');
    if (!rpcError && rpcCartId && typeof rpcCartId === 'string') {
      return rpcCartId;
    }
  } catch {
    // Proceed to fallback
  }

  // 2. Direct query fallback
  const { data: userResp } = await supabase.auth.getUser();
  const userId = userResp?.user?.id;
  if (!userId) {
    throw new Error('User is not authenticated');
  }

  // Select existing
  const { data: existingCart, error: selectErr } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!selectErr && existingCart?.id) {
    return existingCart.id;
  }

  // Insert new cart
  const { data: newCart, error: insertErr } = await supabase
    .from('carts')
    .insert({ user_id: userId })
    .select('id')
    .single();

  if (insertErr || !newCart?.id) {
    throw new Error(insertErr?.message || 'Failed to initialize database cart');
  }

  return newCart.id;
};

/**
 * Loads all items for a given cart ID from Supabase public.cart_items.
 */
export const fetchCartItemsFromDB = async (
  supabase: SupabaseClient,
  cartId: string
): Promise<StoredCartItem[]> => {
  const { data, error } = await supabase
    .from('cart_items')
    .select('product_key, product_id, quantity')
    .eq('cart_id', cartId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  if (!data || !Array.isArray(data)) return [];

  // Filter out any entries that might reference discontinued/old dummy products
  return data
    .filter((row) => {
      if (!row || typeof row.quantity !== 'number') return false;
      const key = row.product_key || row.product_id;
      return Boolean(getProductByKey(key));
    })
    .map((row) => ({
      product_key: row.product_key,
      quantity: Math.min(Math.max(MIN_ITEM_QUANTITY, row.quantity), MAX_ITEM_QUANTITY),
    }));
};

/**
 * Adds or increments an item in the user's database cart.
 * Uses atomic RPC add_to_cart() or falls back to upsert on (cart_id, product_key).
 */
export const addItemToDBCart = async (
  supabase: SupabaseClient,
  cartId: string,
  productKey: string,
  quantityToAdd: number
): Promise<void> => {
  const qty = Math.max(MIN_ITEM_QUANTITY, Math.min(quantityToAdd, MAX_ITEM_QUANTITY));
  const product = getProductByKey(productKey);
  const isUUID = product?.id && product.id.length === 36 && product.id.includes('-');
  const productId = isUUID ? product.id : null;

  // 1. Try atomic add_to_cart RPC
  try {
    const { error: rpcError } = await supabase.rpc('add_to_cart', {
      p_product_key: productKey,
      p_quantity: qty,
    });
    if (!rpcError) return;
  } catch {
    // Proceed to fallback
  }

  // 2. Direct upsert fallback
  const { data: existingItem } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('cart_id', cartId)
    .eq('product_key', productKey)
    .maybeSingle();

  if (existingItem) {
    const newQty = Math.min(existingItem.quantity + qty, MAX_ITEM_QUANTITY);
    const { error: updateErr } = await supabase
      .from('cart_items')
      .update({ quantity: newQty, updated_at: new Date().toISOString() })
      .eq('id', existingItem.id);

    if (updateErr) throw new Error(updateErr.message);
  } else {
    const { error: insertErr } = await supabase
      .from('cart_items')
      .insert({
        cart_id: cartId,
        product_key: productKey,
        product_id: productId,
        quantity: qty,
      });

    if (insertErr) throw new Error(insertErr.message);
  }
};

/**
 * Updates the quantity of an item in public.cart_items.
 * Enforces quantity between 1 and 99.
 */
export const updateItemQuantityInDBCart = async (
  supabase: SupabaseClient,
  cartId: string,
  productKey: string,
  newQuantity: number
): Promise<void> => {
  const clamped = Math.max(MIN_ITEM_QUANTITY, Math.min(newQuantity, MAX_ITEM_QUANTITY));

  const { error } = await supabase
    .from('cart_items')
    .update({ quantity: clamped, updated_at: new Date().toISOString() })
    .eq('cart_id', cartId)
    .eq('product_key', productKey);

  if (error) {
    throw new Error(error.message);
  }
};

/**
 * Deletes a single item row from public.cart_items.
 */
export const removeItemFromDBCart = async (
  supabase: SupabaseClient,
  cartId: string,
  productKey: string
): Promise<void> => {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('cart_id', cartId)
    .eq('product_key', productKey);

  if (error) {
    throw new Error(error.message);
  }
};

/**
 * Deletes all items for a given cart in public.cart_items.
 */
export const clearCartInDBCart = async (
  supabase: SupabaseClient,
  cartId: string
): Promise<void> => {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('cart_id', cartId);

  if (error) {
    throw new Error(error.message);
  }
};

/**
 * Merges a guest cart array into the user's database cart upon sign-in.
 * Validates each item against getProductByKey and caps total quantity at MAX_ITEM_QUANTITY.
 */
export const mergeGuestCartWithDB = async (
  supabase: SupabaseClient,
  cartId: string,
  guestItems: StoredCartItem[]
): Promise<StoredCartItem[]> => {
  if (!guestItems || guestItems.length === 0) {
    return fetchCartItemsFromDB(supabase, cartId);
  }

  // 1. Try atomic merge_guest_cart RPC
  try {
    const validPayload = guestItems
      .filter((i) => i && typeof i.product_key === 'string' && getProductByKey(i.product_key))
      .map((i) => ({
        product_key: i.product_key,
        quantity: Math.min(Math.max(MIN_ITEM_QUANTITY, i.quantity), MAX_ITEM_QUANTITY),
      }));

    if (validPayload.length > 0) {
      const { data: mergedRows, error: rpcError } = await supabase.rpc('merge_guest_cart', {
        items: validPayload,
      });

      if (!rpcError && Array.isArray(mergedRows)) {
        return mergedRows
          .filter((r) => r && getProductByKey(r.product_key))
          .map((r) => ({
            product_key: r.product_key,
            quantity: Math.min(Math.max(MIN_ITEM_QUANTITY, r.quantity), MAX_ITEM_QUANTITY),
          }));
      }
    }
  } catch {
    // Proceed to fallback
  }

  // 2. Direct transactional merge fallback
  const dbItems = await fetchCartItemsFromDB(supabase, cartId);
  const dbMap = new Map<string, { id?: string; quantity: number }>();

  // Fetch item IDs to know whether to insert or update
  const { data: rawDbItems } = await supabase
    .from('cart_items')
    .select('id, product_key, quantity')
    .eq('cart_id', cartId);

  (rawDbItems || []).forEach((row) => {
    if (row?.product_key) {
      dbMap.set(row.product_key, { id: row.id, quantity: row.quantity });
    }
  });

  for (const guestItem of guestItems) {
    if (!guestItem?.product_key) continue;
    const product = getProductByKey(guestItem.product_key);
    if (!product) continue;

    const key = product.slug;
    const guestQty = Math.max(MIN_ITEM_QUANTITY, Math.min(guestItem.quantity, MAX_ITEM_QUANTITY));
    const existing = dbMap.get(key);

    if (existing) {
      const mergedQty = Math.min(existing.quantity + guestQty, MAX_ITEM_QUANTITY);
      await supabase
        .from('cart_items')
        .update({ quantity: mergedQty, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      dbMap.set(key, { ...existing, quantity: mergedQty });
    } else {
      const isUUID = product.id && product.id.length === 36 && product.id.includes('-');
      const { data: newRow } = await supabase
        .from('cart_items')
        .insert({
          cart_id: cartId,
          product_key: key,
          product_id: isUUID ? product.id : null,
          quantity: guestQty,
        })
        .select('id')
        .single();

      if (newRow?.id) {
        dbMap.set(key, { id: newRow.id, quantity: guestQty });
      }
    }
  }

  return fetchCartItemsFromDB(supabase, cartId);
};
