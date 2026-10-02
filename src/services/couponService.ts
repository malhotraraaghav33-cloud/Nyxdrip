import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Coupon } from '../types';
import { VALID_COUPONS } from '../data/products';

export interface CouponValidationResult {
  valid: boolean;
  message: string;
  coupon?: Coupon;
}

export const validateCouponCode = async (
  rawCode: string,
  subtotal: number
): Promise<CouponValidationResult> => {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return { valid: false, message: 'Please enter a coupon code.' };
  }

  // 1. If Supabase is configured, check database first
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .maybeSingle();

      if (!error && data) {
        // Expiration check
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          return { valid: false, message: 'This coupon has expired.' };
        }

        // Usage limit check
        if (data.max_uses && data.usage_count >= data.max_uses) {
          return { valid: false, message: 'This coupon has reached its maximum redemption limit.' };
        }

        // Min order check
        const minOrder = Number(data.min_order_amount || 0);
        if (subtotal < minOrder) {
          return {
            valid: false,
            message: `Minimum order amount of ₹${minOrder.toLocaleString('en-IN')} required for ${code}.`,
          };
        }

        return {
          valid: true,
          message: `${data.discount_percent}% discount authorized!`,
          coupon: {
            code: data.code,
            discountPercent: data.discount_percent,
            description: data.description,
            minOrderAmount: minOrder,
          },
        };
      }
    } catch (err) {
      console.warn('Coupon database check note:', err);
    }
  }

  // 2. Fallback to built-in verified promotional coupons
  const localCoupon = VALID_COUPONS.find((c) => c.code.toUpperCase() === code);
  if (localCoupon) {
    if (localCoupon.minOrderAmount && subtotal < localCoupon.minOrderAmount) {
      return {
        valid: false,
        message: `Requires minimum cart value of ₹${localCoupon.minOrderAmount.toLocaleString('en-IN')}`,
      };
    }

    return {
      valid: true,
      message: `${localCoupon.discountPercent}% discount authorized!`,
      coupon: localCoupon,
    };
  }

  return { valid: false, message: 'Invalid or expired cipher key.' };
};
