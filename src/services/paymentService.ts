import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { CustomerInfo } from '../types';

export interface PaymentConfig {
  razorpayKeyId: string;
  paypalClientId: string;
  paypalCurrency: string;
  environment: string;
  paypalEnvironment: string;
}

export interface RazorpayOrderResponse {
  orderId: string;
  orderNumber: string;
  guestAccessToken?: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface PayPalOrderResponse {
  orderId: string;
  orderNumber: string;
  guestAccessToken?: string;
  paypalOrderId: string;
  amount: number;
  currency: string;
}

// Cached script promises to prevent multiple injections
let razorpayScriptPromise: Promise<boolean> | null = null;
let payPalScriptPromise: Promise<boolean> | null = null;
let cachedConfig: PaymentConfig | null = null;

/**
 * Lazy loads official Razorpay Hosted Checkout SDK
 */
export const loadRazorpayScript = (): Promise<boolean> => {
  if (typeof window !== 'undefined' && (window as any).Razorpay) {
    return Promise.resolve(true);
  }

  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay checkout SDK');
      razorpayScriptPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
};

/**
 * Lazy loads official PayPal JS SDK
 */
export const loadPayPalScript = (clientId: string, currency = 'USD'): Promise<boolean> => {
  if (typeof window !== 'undefined' && (window as any).paypal) {
    return Promise.resolve(true);
  }

  if (payPalScriptPromise) return payPalScriptPromise;

  payPalScriptPromise = new Promise((resolve) => {
    // If no client ID provided yet, use standard sandbox testing key
    const activeClientId = clientId || 'test';
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${activeClientId}&currency=${currency}&intent=capture`;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load PayPal JS SDK');
      payPalScriptPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return payPalScriptPromise;
};

/**
 * Retrieves public payment configuration via Edge Function
 */
export const getPaymentConfig = async (): Promise<PaymentConfig> => {
  if (cachedConfig) return cachedConfig;

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.functions.invoke('get-payment-config');
      if (!error && data) {
        cachedConfig = data;
        return data;
      }
    } catch (err) {
      console.warn('get-payment-config note:', err);
    }
  }

  const fallback: PaymentConfig = {
    razorpayKeyId: 'rzp_test_fallback',
    paypalClientId: 'test',
    paypalCurrency: 'USD',
    environment: 'test',
    paypalEnvironment: 'sandbox',
  };

  cachedConfig = fallback;
  return fallback;
};

/**
 * Initiates Razorpay Order on server (supports both authenticated users and guests)
 */
export const createRazorpayOrder = async (params: {
  shippingAddress: CustomerInfo;
  items?: any[];
  couponCode?: string | null;
  idempotencyKey: string;
  deliveryMethod?: string;
}): Promise<RazorpayOrderResponse> => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
    body: params,
  });

  if (error || !data) {
    const errorMsg = data?.error?.message || error?.message || 'Failed to initialize Razorpay order';
    throw new Error(errorMsg);
  }

  return data;
};

/**
 * Verifies Razorpay payment signature server-side
 */
export const verifyRazorpayPayment = async (params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<{ success: boolean; orderId: string; orderNumber: string; guestAccessToken?: string }> => {
  const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
    body: params,
  });

  if (error || !data?.success) {
    const errorMsg = data?.error?.message || error?.message || 'Payment signature verification failed';
    throw new Error(errorMsg);
  }

  return data;
};

/**
 * Initiates PayPal Order on server (supports both authenticated users and guests)
 */
export const createPayPalOrder = async (params: {
  shippingAddress: CustomerInfo;
  items?: any[];
  couponCode?: string | null;
  idempotencyKey: string;
  deliveryMethod?: string;
}): Promise<PayPalOrderResponse> => {
  const { data, error } = await supabase.functions.invoke('create-paypal-order', {
    body: params,
  });

  if (error || !data) {
    const errorMsg = data?.error?.message || error?.message || 'Failed to initialize PayPal order';
    throw new Error(errorMsg);
  }

  return data;
};

/**
 * Captures approved PayPal order on server
 */
export const capturePayPalOrder = async (params: {
  paypalOrderId: string;
}): Promise<{ success: boolean; orderId: string; orderNumber: string; guestAccessToken?: string }> => {
  const { data, error } = await supabase.functions.invoke('capture-paypal-order', {
    body: params,
  });

  if (error || !data?.success) {
    const errorMsg = data?.error?.message || error?.message || 'PayPal capture failed';
    throw new Error(errorMsg);
  }

  return data;
};

/**
 * Cancels pending order when checkout modal is dismissed
 */
export const cancelOrderPayment = async (orderId: string): Promise<void> => {
  try {
    await supabase.functions.invoke('cancel-payment', {
      body: { orderId },
    });
  } catch (err) {
    console.warn('cancel-payment note:', err);
  }
};

/**
 * Polls order status for up to maxDurationMs in case of network drops post-payment
 */
export const pollOrderStatus = async (
  orderId: string,
  maxDurationMs = 30000,
  intervalMs = 2500
): Promise<'paid' | 'pending' | 'failed' | 'cancelled'> => {
  const startTime = Date.now();

  while (Date.now() - startTime < maxDurationMs) {
    const { data: order } = await supabase
      .from('orders')
      .select('payment_status')
      .eq('id', orderId)
      .maybeSingle();

    if (order?.payment_status === 'paid') {
      return 'paid';
    }
    if (order?.payment_status === 'failed' || order?.payment_status === 'cancelled') {
      return order.payment_status;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return 'pending';
};
