import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { CartItem } from '../types';

export interface InventoryStatus {
  productId: string;
  quantity: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  allowBackorder: boolean;
}

/**
 * Validates real-time server inventory for all items in cart before order placement.
 * Returns valid = false if any item has insufficient stock.
 */
export const validateCartStock = async (
  cartItems: CartItem[]
): Promise<{ valid: boolean; errorItem?: string; availableStock?: number }> => {
  if (!isSupabaseConfigured) {
    const shortage = cartItems.find(item => item.quantity > item.product.stock || item.product.stock <= 0);
    return shortage
      ? { valid: false, errorItem: shortage.product.name, availableStock: Math.max(0, shortage.product.stock) }
      : { valid: true };
  }

  // Query server-controlled available stock. A database trigger keeps
  // products.stock aligned with inventory.quantity - reserved_quantity.
  // Never continue checkout on an inventory lookup error.
  try {
    for (const item of cartItems) {
      const { data, error } = await supabase
        .from('products')
        .select('id, slug, stock, is_active')
        .eq('slug', item.product.slug)
        .maybeSingle();

      if (error || !data || !data.is_active || data.stock == null ||
          Number(data.stock) < item.quantity) {
        return {
          valid: false,
          errorItem: item.product.name,
          availableStock: Math.max(0, Number(data?.stock) || 0),
        };
      }
    }
    return { valid: true };
  } catch {
    return { valid: false, errorItem: 'Inventory temporarily unavailable', availableStock: 0 };
  }
};

/**
 * Atomically decrements product stock post-checkout payment to prevent negative inventory.
 */
export const deductInventoryForOrder = async (
  cartItems: CartItem[]
): Promise<boolean> => {
  if (!isSupabaseConfigured) return true;

  try {
    for (const item of cartItems) {
      // Fetch current quantity
      const { data: inv } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('product_id', item.product.id)
        .single();

      if (inv) {
        const newQty = Math.max(0, inv.quantity - item.quantity);
        await supabase
          .from('inventory')
          .update({
            quantity: newQty,
            updated_at: new Date().toISOString(),
          })
          .eq('product_id', item.product.id);
      }
    }
    return true;
  } catch (err) {
    console.warn('Failed to deduct inventory:', err);
    return false;
  }
};
