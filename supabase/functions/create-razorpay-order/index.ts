import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { errorResponse, successResponse, sanitizeErrorMessage } from '../_shared/errors.ts';
import { createRazorpayApiOrder, getRazorpayCredentials } from '../_shared/razorpay.ts';

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

    // 1. Call atomic database RPC create_pending_order
    const { data: orderData, error: rpcError } = await supabaseAdmin.rpc('create_pending_order', {
      p_user_id: user.id,
      p_provider: 'razorpay',
      p_idempotency_key: idempotencyKey || null,
      p_coupon_code: couponCode || null,
      p_shipping_address: shippingAddress,
      p_delivery_method: deliveryMethod,
      p_charged_currency: 'INR',
    });

    if (rpcError || !orderData) {
      const sanitized = sanitizeErrorMessage(rpcError?.message || 'Failed to create order');
      return errorResponse(sanitized.code, sanitized.message, sanitized.status);
    }

    const orderId = orderData.order_id;
    const orderNumber = orderData.order_number;
    const totalAmount = Number(orderData.total);
    const amountPaise = Math.round(totalAmount * 100);

    // If order already had a Razorpay order ID (from idempotency reuse), return it
    if (orderData.is_existing && orderData.provider_order_id) {
      const { keyId } = getRazorpayCredentials();
      return successResponse({
        orderId,
        orderNumber,
        razorpayOrderId: orderData.provider_order_id,
        amount: totalAmount,
        currency: 'INR',
        keyId,
      });
    }

    // 2. Create Razorpay order via official API
    let razorpayOrder;
    try {
      razorpayOrder = await createRazorpayApiOrder({
        amountPaise,
        currency: 'INR',
        receipt: orderNumber,
        notes: {
          order_id: orderId,
          user_id: user.id,
          order_number: orderNumber,
        },
      });
    } catch (rzpErr) {
      console.error('Razorpay order creation error:', rzpErr);
      // Release inventory reservation if gateway call fails
      await supabaseAdmin.rpc('release_order_reservation', {
        p_order_id: orderId,
        p_new_payment_status: 'failed',
      });
      return errorResponse('GATEWAY_ERROR', 'Unable to initialize Razorpay checkout. Please try again.', 502);
    }

    // 3. Save provider_order_id
    await supabaseAdmin
      .from('orders')
      .update({ provider_order_id: razorpayOrder.id, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    const { keyId } = getRazorpayCredentials();

    return successResponse({
      orderId,
      orderNumber,
      razorpayOrderId: razorpayOrder.id,
      amount: totalAmount,
      currency: 'INR',
      keyId,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const sanitized = sanitizeErrorMessage(errorMsg);
    return errorResponse(sanitized.code, sanitized.message, sanitized.status);
  }
});
