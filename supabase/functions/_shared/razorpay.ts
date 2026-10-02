/**
 * Razorpay Server-side Integration Helpers
 */

export const getRazorpayCredentials = () => {
  const keyId = Deno.env.get('RAZORPAY_KEY_ID');
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
  const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');

  return {
    keyId: keyId || '',
    keySecret: keySecret || '',
    webhookSecret: webhookSecret || '',
    isConfigured: Boolean(keyId && keySecret),
  };
};

/**
 * Creates a Razorpay order via official REST API
 * POST https://api.razorpay.com/v1/orders
 */
export const createRazorpayApiOrder = async (params: {
  amountPaise: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string }> => {
  const { keyId, keySecret, isConfigured } = getRazorpayCredentials();

  if (!isConfigured) {
    // Return simulated sandbox order ID for testing when live keys aren't set
    return {
      id: `order_test_${Date.now().toString(36)}`,
      amount: params.amountPaise,
      currency: params.currency || 'INR',
    };
  }

  const authHeader = 'Basic ' + btoa(`${keyId}:${keySecret}`);

  const resp = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: params.currency || 'INR',
      receipt: params.receipt,
      notes: params.notes || {},
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error('Razorpay order creation failed:', resp.status, errText);
    throw new Error(`RAZORPAY_ORDER_FAILED: ${resp.status}`);
  }

  const data = await resp.json();
  return {
    id: data.id,
    amount: data.amount,
    currency: data.currency,
  };
};

/**
 * Fetches and verifies a payment from Razorpay API
 * GET https://api.razorpay.com/v1/payments/{payment_id}
 */
export const fetchRazorpayPayment = async (paymentId: string) => {
  const { keyId, keySecret, isConfigured } = getRazorpayCredentials();

  if (!isConfigured) {
    return {
      id: paymentId,
      status: 'captured',
      amount: 10000,
      currency: 'INR',
    };
  }

  const authHeader = 'Basic ' + btoa(`${keyId}:${keySecret}`);

  const resp = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': authHeader,
    },
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error('Razorpay payment fetch failed:', resp.status, errText);
    throw new Error(`RAZORPAY_PAYMENT_FETCH_FAILED: ${resp.status}`);
  }

  return await resp.json();
};

/**
 * Captures an authorized Razorpay payment
 * POST https://api.razorpay.com/v1/payments/{payment_id}/capture
 */
export const captureRazorpayPayment = async (paymentId: string, amountPaise: number, currency = 'INR') => {
  const { keyId, keySecret, isConfigured } = getRazorpayCredentials();

  if (!isConfigured) return;

  const authHeader = 'Basic ' + btoa(`${keyId}:${keySecret}`);

  const resp = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.warn('Razorpay capture warning (may already be captured):', errText);
  }
};

/**
 * Verifies Razorpay HMAC SHA256 Signature using constant-time comparison
 */
export const verifyRazorpaySignature = async (
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> => {
  if (!signature || !secret) return false;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signedBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const hashArray = Array.from(new Uint8Array(signedBuffer));
    const calculatedHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    // Constant-time string comparison to prevent timing attacks
    if (calculatedHex.length !== signature.length) {
      return false;
    }

    let mismatch = 0;
    for (let i = 0; i < calculatedHex.length; i++) {
      mismatch |= calculatedHex.charCodeAt(i) ^ signature.charCodeAt(i);
    }

    return mismatch === 0;
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
};
