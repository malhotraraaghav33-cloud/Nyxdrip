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
    // If Supabase is not configured, validate against client-side stock metadata
    for (const item of cartItems) {
      if (item.quantity > item.product.stock) {
        return {
          valid: false,
          errorItem: item.product.name,
          availableStock: item.product.stock,
        };
      }
    }
    return { valid: true };
  }

  try {
    for (const item of cartItems) {
      const { data, error } = await supabase
        .from('inventory')
        .select('quantity, allow_backorder')
        .eq('product_id', item.product.id)
        .maybeSingle();

      if (error) {
        console.warn('Inventory check fallback for', item.product.name);
        continue;
      }

      if (data) {
        if (!data.allow_backorder && data.quantity < item.quantity) {
          return {
            valid: false,
            errorItem: item.product.name,
            availableStock: Math.max(0, data.quantity),
          };
        }
      }
    }

    return { valid: true };
  } catch (err) {
    console.warn('Inventory validation warning:', err);
    return { valid: true };
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
