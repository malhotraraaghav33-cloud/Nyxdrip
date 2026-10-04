import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { getOptionalUser } from '../_shared/auth.ts';
import { errorResponse, successResponse, sanitizeErrorMessage } from '../_shared/errors.ts';
import { triggerOrderConfirmationEmail } from '../_shared/email.ts';

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabaseAdmin = getSupabaseAdmin();
    // Support both logged-in users and guests
    const user = await getOptionalUser(req, supabaseAdmin);

    const body = await req.json().catch(() => ({}));
    const {
      shippingAddress,
      customer,
      items,
      couponCode,
      idempotencyKey,
      deliveryMethod = 'standard',
      paymentMethod = 'mock',
      autoFinalize = false,
    } = body;

    const resolvedAddress = shippingAddress || customer;
    if (!resolvedAddress || typeof resolvedAddress !== 'object') {
      return errorResponse('INVALID_ADDRESS', 'A valid shipping address is required.');
    }

    const guestEmail = resolvedAddress.email || customer?.email || user?.email || null;
    const guestName = `${resolvedAddress.firstName || ''} ${resolvedAddress.lastName || ''}`.trim() || customer?.name || null;
    const guestPhone = resolvedAddress.phone || customer?.phone || null;

    if (!guestEmail) {
      return errorResponse('INVALID_EMAIL', 'A valid customer email address is required.');
    }

    // Call atomic database RPC create_pending_order
    const { data: orderData, error: rpcError } = await supabaseAdmin.rpc('create_pending_order', {
      p_user_id: user?.id || null,
      p_provider: paymentMethod,
      p_idempotency_key: idempotencyKey || null,
      p_coupon_code: couponCode || null,
      p_shipping_address: resolvedAddress,
      p_delivery_method: deliveryMethod,
      p_charged_currency: 'INR',
      p_guest_email: guestEmail,
      p_guest_name: guestName,
      p_guest_phone: guestPhone,
      p_items: Array.isArray(items) && items.length > 0 ? items : null,
    });

    if (rpcError || !orderData) {
      const sanitized = sanitizeErrorMessage(rpcError?.message || 'Failed to create order');
      return errorResponse(sanitized.code, sanitized.message, sanitized.status);
    }

    const orderId = orderData.order_id;
    const orderNumber = orderData.order_number;
    const guestAccessToken = orderData.guest_access_token;
    const totalAmount = Number(orderData.total);

    // If autoFinalize is requested (for test/offline/direct orders):
    if (autoFinalize) {
      await supabaseAdmin.rpc('finalize_paid_order', {
        p_order_id: orderId,
        p_provider: paymentMethod,
        p_provider_payment_id: `manual_${Date.now()}`,
        p_amount: totalAmount,
        p_currency: 'INR',
      });

      triggerOrderConfirmationEmail(supabaseAdmin, orderId).catch((e) =>
        console.warn('Email trigger warning:', e)
      );
    }

    return successResponse({
      orderId,
      orderNumber,
      guestAccessToken,
      subtotal: Number(orderData.subtotal),
      discount: Number(orderData.discount),
      shipping: Number(orderData.shipping),
      total: totalAmount,
      currency: 'INR',
      status: autoFinalize ? 'paid' : 'pending',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const sanitized = sanitizeErrorMessage(errorMsg);
    return errorResponse(sanitized.code, sanitized.message, sanitized.status);
  }
});
