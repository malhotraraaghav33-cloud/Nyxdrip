import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { errorResponse, successResponse, sanitizeErrorMessage } from '../_shared/errors.ts';
import { createPayPalApiOrder, getPayPalCredentials } from '../_shared/paypal.ts';

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const user = await getAuthenticatedUser(req, supabaseAdmin);

    const body = await req.json().catch(() => ({}));
    const { shippingAddress, couponCode, idempotencyKey, deliveryMethod = 'standard' } = body;

    if (!shippingAddress || typeof shippingAddress !== 'object') {
      return errorResponse('INVALID_ADDRESS', 'A valid shipping address is required.');
    }

    const { currency } = getPayPalCredentials();

    // 1. Call atomic database RPC create_pending_order
    const { data: orderData, error: rpcError } = await supabaseAdmin.rpc('create_pending_order', {
      p_user_id: user.id,
      p_provider: 'paypal',
      p_idempotency_key: idempotencyKey || null,
      p_coupon_code: couponCode || null,
      p_shipping_address: shippingAddress,
      p_delivery_method: deliveryMethod,
      p_charged_currency: currency,
    });

    if (rpcError || !orderData) {
      const sanitized = sanitizeErrorMessage(rpcError?.message || 'Failed to create order');
      return errorResponse(sanitized.code, sanitized.message, sanitized.status);
    }

    const orderId = orderData.order_id;
    const orderNumber = orderData.order_number;
    const chargedAmount = Number(orderData.charged_amount);

    // If order already has a PayPal order ID from idempotency reuse, return it
    if (orderData.is_existing && orderData.provider_order_id) {
      return successResponse({
        orderId,
        orderNumber,
        paypalOrderId: orderData.provider_order_id,
        amount: chargedAmount,
        currency,
      });
    }

    // 2. Create PayPal order via official API
    let paypalOrder;
    try {
      paypalOrder = await createPayPalApiOrder({
        orderId,
        orderNumber,
        amount: chargedAmount,
        currency,
        idempotencyKey,
      });
    } catch (payPalErr) {
      console.error('PayPal create order failed:', payPalErr);
      await supabaseAdmin.rpc('release_order_reservation', {
        p_order_id: orderId,
        p_new_payment_status: 'failed',
      });
      return errorResponse('GATEWAY_ERROR', 'Unable to initialize PayPal checkout. Please try again.', 502);
    }

    // 3. Save provider_order_id
    await supabaseAdmin
      .from('orders')
      .update({ provider_order_id: paypalOrder.id, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    return successResponse({
      orderId,
      orderNumber,
      paypalOrderId: paypalOrder.id,
      amount: chargedAmount,
      currency,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const sanitized = sanitizeErrorMessage(errorMsg);
    return errorResponse(sanitized.code, sanitized.message, sanitized.status);
  }
});
