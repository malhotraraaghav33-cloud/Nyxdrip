import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { getOptionalUser } from '../_shared/auth.ts';
import { errorResponse, successResponse } from '../_shared/errors.ts';
import { capturePayPalApiOrder } from '../_shared/paypal.ts';
import { triggerOrderConfirmationEmail } from '../_shared/email.ts';

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabaseAdmin = getSupabaseAdmin();
    // Allow both authenticated users and guests
    const user = await getOptionalUser(req, supabaseAdmin);

    const body = await req.json().catch(() => ({}));
    const { paypalOrderId } = body;

    if (!paypalOrderId) {
      return errorResponse('INVALID_PAYLOAD', 'paypalOrderId is required');
    }

    // 1. Fetch internal order and confirm ownership
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, user_id, guest_access_token, payment_status, charged_amount, charged_currency')
      .eq('provider_order_id', paypalOrderId)
      .maybeSingle();

    if (orderError || !order) {
      return errorResponse('ORDER_NOT_FOUND', 'Corresponding order could not be located.', 404);
    }

    // For authenticated orders, verify user matches. For guest orders (user_id === null), allow verification
    if (order.user_id && (!user || order.user_id !== user.id)) {
      return errorResponse('UNAUTHORIZED', 'Access denied to this order.', 403);
    }

    if (order.payment_status === 'paid') {
      return successResponse({
        success: true,
        orderId: order.id,
        orderNumber: order.order_number,
        guestAccessToken: order.guest_access_token,
        status: 'paid',
        alreadyPaid: true,
      });
    }

    // 2. Capture payment via PayPal Orders V2 API
    let captureResult;
    try {
      captureResult = await capturePayPalApiOrder(paypalOrderId);
    } catch (capErr) {
      console.error('PayPal capture error:', capErr);
      await supabaseAdmin.rpc('release_order_reservation', {
        p_order_id: order.id,
        p_new_payment_status: 'failed',
      });
      return errorResponse('CAPTURE_FAILED', 'PayPal was unable to capture payment authorization.', 400);
    }

    if (captureResult.status !== 'COMPLETED') {
      await supabaseAdmin.rpc('release_order_reservation', {
        p_order_id: order.id,
        p_new_payment_status: 'failed',
      });
      return errorResponse('PAYMENT_INCOMPLETE', `PayPal payment status is ${captureResult.status}`, 400);
    }

    // 3. Finalize order in database
    const { data: finalizeData, error: finalizeError } = await supabaseAdmin.rpc('finalize_paid_order', {
      p_order_id: order.id,
      p_provider: 'paypal',
      p_provider_payment_id: captureResult.captureId,
      p_amount: order.charged_amount,
      p_currency: order.charged_currency,
    });

    if (finalizeError || !finalizeData?.success) {
      console.error('Finalize paid order RPC failed for PayPal:', finalizeError);
      return errorResponse('FINALIZE_FAILED', 'Could not record order finalization.', 500);
    }

    // 4. Trigger email confirmation
    triggerOrderConfirmationEmail(supabaseAdmin, order.id).catch((e) =>
      console.warn('Email trigger warning:', e)
    );

    return successResponse({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      guestAccessToken: order.guest_access_token,
      status: 'paid',
    });
  } catch (err: unknown) {
    console.error('Capture PayPal exception:', err);
    return errorResponse('CAPTURE_ERROR', 'An error occurred while capturing PayPal order.', 500);
  }
});
