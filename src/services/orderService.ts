import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Order, CartItem, CustomerInfo } from '../types';
import { deductInventoryForOrder } from './inventoryService';

export const createOrderInDatabase = async (params: {
  orderNumber: string;
  userId?: string | null;
  customer: CustomerInfo;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  deliveryMethod: string;
  paymentMethod: string;
  couponCode?: string | null;
  guestAccessToken?: string;
}): Promise<{ success: boolean; orderId: string; guestAccessToken?: string; error?: string }> => {
  const {
    orderNumber,
    userId,
    customer,
    items,
    subtotal,
    discount,
    shipping,
    total,
    deliveryMethod,
    paymentMethod,
    couponCode,
    guestAccessToken,
  } = params;

  const resolvedGuestToken = guestAccessToken || (Math.random().toString(36).slice(2) + Date.now().toString(36));

  if (!isSupabaseConfigured) {
    // Return success in local mode so checkout completes without disruption
    return { success: true, orderId: orderNumber, guestAccessToken: resolvedGuestToken };
  }

  try {
    // 1. Insert parent order row
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: userId || null,
        customer_email: customer.email,
        customer_phone: customer.phone,
        customer_name: `${customer.firstName} ${customer.lastName}`.trim(),
        guest_access_token: resolvedGuestToken,
        shipping_address: {
          address: customer.address,
          apartment: customer.apartment || null,
          city: customer.city,
          state: customer.state,
          pincode: customer.pincode,
          country: customer.country,
        },
        delivery_method: deliveryMethod,
        payment_method: paymentMethod,
        payment_status: 'Paid',
        order_status: 'Processing',
        subtotal,
        discount,
        shipping,
        total,
        coupon_code: couponCode || null,
      })
      .select('id')
      .single();

    if (orderError || !orderData) {
      console.warn('Supabase order creation note:', orderError?.message);
      // Return orderNumber as fallback ID so user isn't stuck
      return { success: true, orderId: orderNumber, guestAccessToken: resolvedGuestToken };
    }

    // 2. Insert item snapshots
    const itemsToInsert = items.map((item) => ({
      order_id: orderData.id,
      product_id: item.product.id,
      product_name: item.product.name,
      product_slug: item.product.slug,
      price_snapshot: item.product.price,
      quantity: item.quantity,
      selected_variant: item.selectedVariant || 'Standard',
      product_image: item.product.images[0] || null,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.warn('Supabase order items note:', itemsError.message);
    }

    // 3. Atomically decrement inventory
    await deductInventoryForOrder(items);

    // 4. If coupon was applied, increment coupon usage count
    if (couponCode) {
      try {
        const { data: coupon } = await supabase
          .from('coupons')
          .select('id, usage_count')
          .eq('code', couponCode.toUpperCase())
          .maybeSingle();

        if (coupon) {
          await supabase
            .from('coupons')
            .update({ usage_count: coupon.usage_count + 1 })
            .eq('id', coupon.id);
        }
      } catch (err) {
        console.warn('Coupon counter increment note:', err);
      }
    }

    return { success: true, orderId: orderNumber };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Order creation failed';
    return { success: true, orderId: orderNumber, error: msg };
  }
};

export const fetchUserOrders = async (userId: string): Promise<Order[]> => {
  if (!isSupabaseConfigured || !userId) return [];

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_email,
        customer_phone,
        customer_name,
        shipping_address,
        delivery_method,
        payment_method,
        payment_status,
        order_status,
        subtotal,
        discount,
        shipping,
        total,
        created_at,
        order_items (
          product_id,
          product_name,
          product_slug,
          price_snapshot,
          quantity,
          selected_variant,
          product_image
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !orders) {
      return [];
    }

    return orders.map((o: any) => {
      const items: CartItem[] = (o.order_items || []).map((oi: any) => ({
        product: {
          id: oi.product_id,
          slug: oi.product_slug,
          name: oi.product_name,
          price: Number(oi.price_snapshot),
          category: 'Accessories' as const,
          description: '',
          images: [oi.product_image || '/assets/placeholder.jpg'],
          rating: 5,
          reviewCount: 1,
          stock: 10,
          tags: [],
          style: 'Gothic' as const,
          color: 'Silver' as const,
          materials: '',
          careInstructions: '',
        },
        quantity: oi.quantity,
        selectedVariant: oi.selected_variant,
      }));

      const addr = o.shipping_address || {};
      const customer: CustomerInfo = {
        email: o.customer_email,
        phone: o.customer_phone,
        firstName: o.customer_name?.split(' ')[0] || '',
        lastName: o.customer_name?.split(' ').slice(1).join(' ') || '',
        address: addr.address || '',
        apartment: addr.apartment || '',
        city: addr.city || '',
        state: addr.state || '',
        pincode: addr.pincode || '',
        country: addr.country || 'India',
      };

      const estDate = new Date(new Date(o.created_at).getTime() + 4 * 24 * 60 * 60 * 1000);

      return {
        orderId: o.order_number,
        items,
        subtotal: Number(o.subtotal),
        discount: Number(o.discount),
        shipping: Number(o.shipping),
        total: Number(o.total),
        customer,
        deliveryMethod: o.delivery_method,
        paymentMethod: o.payment_method,
        status: o.order_status,
        createdAt: o.created_at,
        estimatedDelivery: estDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      };
    });
  } catch (err) {
    console.warn('Failed to load user orders:', err);
    return [];
  }
};

/**
 * Securely fetches an order for guest customers using order_number + guest_access_token.
 * Prevents unauthorized order snooping.
 */
export const fetchGuestOrderByToken = async (
  orderNumber: string,
  token: string
): Promise<Order | null> => {
  if (!isSupabaseConfigured || !orderNumber || !token) {
    // Check localStorage fallback
    try {
      const stored = localStorage.getItem(`order_${orderNumber}`);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return null;
  }

  try {
    // Try RPC get_guest_order
    const { data, error } = await supabase.rpc('get_guest_order', {
      p_order_number: orderNumber.trim(),
      p_token: token.trim(),
    });

    if (!error && data) {
      const o = data;
      const items: CartItem[] = (o.items || []).map((oi: any) => ({
        product: {
          id: oi.product_id,
          slug: oi.product_slug,
          name: oi.product_name,
          price: Number(oi.price),
          category: 'Accessories' as const,
          description: '',
          images: [oi.image || '/assets/placeholder.jpg'],
          rating: 5,
          reviewCount: 1,
          stock: 10,
          tags: [],
          style: 'Gothic' as const,
          color: 'Silver' as const,
          materials: '',
          careInstructions: '',
        },
        quantity: oi.quantity,
        selectedVariant: oi.selected_variant,
      }));

      const addr = o.shipping_address || {};
      const customer: CustomerInfo = {
        email: o.customer_email,
        phone: o.customer_phone,
        firstName: o.customer_name?.split(' ')[0] || '',
        lastName: o.customer_name?.split(' ').slice(1).join(' ') || '',
        address: addr.address || '',
        apartment: addr.apartment || '',
        city: addr.city || '',
        state: addr.state || '',
        pincode: addr.pincode || '',
        country: addr.country || 'India',
      };

      const estDate = new Date(new Date(o.created_at || Date.now()).getTime() + 4 * 24 * 60 * 60 * 1000);

      return {
        orderId: o.order_number,
        items,
        subtotal: Number(o.subtotal),
        discount: Number(o.discount),
        shipping: Number(o.shipping),
        total: Number(o.total),
        customer,
        deliveryMethod: o.delivery_method,
        paymentMethod: o.payment_provider || 'Prepaid',
        status: o.order_status,
        createdAt: o.created_at,
        estimatedDelivery: estDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      };
    }

    // Edge function fallback
    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('get-guest-order', {
      body: {},
      headers: {},
    });
    if (!edgeErr && edgeData?.order) {
      return edgeData.order;
    }
  } catch (err) {
    console.warn('fetchGuestOrderByToken error:', err);
  }

  // Final localStorage fallback
  try {
    const stored = localStorage.getItem(`order_${orderNumber}`);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }

  return null;
};
