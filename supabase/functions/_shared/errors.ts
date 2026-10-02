import { corsHeaders } from './cors.ts';

export const errorResponse = (
  code: string,
  message: string,
  status = 400,
  details?: unknown
): Response => {
  if (status >= 500) {
    console.error(`[SERVER_ERROR] ${code}: ${message}`, details);
  }

  return new Response(
    JSON.stringify({
      error: {
        code,
        message,
      },
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
};

export const successResponse = (data: unknown, status = 200): Response => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
};

/**
 * Maps Postgres/RPC exceptions to clean, client-safe error messages.
 */
export const sanitizeErrorMessage = (errorMsg: string): { code: string; message: string; status: number } => {
  if (errorMsg.includes('OUT_OF_STOCK')) {
    const itemMatch = errorMsg.match(/Product "([^"]+)"/);
    const itemName = itemMatch ? itemMatch[1] : 'an item';
    return {
      code: 'OUT_OF_STOCK',
      message: `Stock reservation failed: ${itemName} is currently out of stock or low in vault inventory.`,
      status: 409,
    };
  }

  if (errorMsg.includes('CART_EMPTY')) {
    return {
      code: 'CART_EMPTY',
      message: 'Your shopping bag is empty. Please add items before placing an order.',
      status: 400,
    };
  }

  if (errorMsg.includes('COUPON_INVALID')) {
    return {
      code: 'COUPON_INVALID',
      message: 'The coupon code provided is invalid or has expired.',
      status: 400,
    };
  }

  if (errorMsg.includes('PRODUCT_UNAVAILABLE')) {
    return {
      code: 'PRODUCT_UNAVAILABLE',
      message: 'One or more pieces in your bag are currently unavailable.',
      status: 409,
    };
  }

  if (errorMsg.includes('AMOUNT_MISMATCH')) {
    return {
      code: 'AMOUNT_MISMATCH',
      message: 'Payment verification failed due to amount inconsistency.',
      status: 400,
    };
  }

  if (errorMsg.includes('UNAUTHORIZED')) {
    return {
      code: 'SESSION_EXPIRED',
      message: 'Your session has expired. Please sign in to complete payment.',
      status: 401,
    };
  }

  return {
    code: 'PAYMENT_UNAVAILABLE',
    message: 'We could not prepare your secure checkout. Please try again.',
    status: 500,
  };
};
