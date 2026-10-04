import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { getOptionalUser } from '../_shared/auth.ts';
import { errorResponse, successResponse } from '../_shared/errors.ts';
import {
  getRazorpayCredentials,
  verifyRazorpaySignature,
  fetchRazorpayPayment,
  captureRazorpayPayment,
} from '../_shared/razorpay.ts';
import { triggerOrderConfirmationEmail } from '../_shared/email.ts';

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabaseAdmin = getSupabaseAdmin();
    // Allow both authenticated users and guests
    const user = await getOptionalUser(req, supabaseAdmin);

    const body = await req.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return errorResponse('INVALID_PAYLOAD', 'Missing required verification parameters.');
    }

    // 1. Fetch internal order and confirm ownership
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, user_id, guest_access_token, payment_status, total, currency')
      .eq('provider_order_id', razorpay_order_id)
      .maybeSingle();

    if (orderError || !order) {
      return errorResponse('ORDER_NOT_FOUND', 'Corresponding order could not be located.', 404);
    }

    // For authenticated orders, verify user matches. For guest orders (user_id === null), allow verification
    if (order.user_id && (!user || order.user_id !== user.id)) {
      return errorResponse('UNAUTHORIZED', 'Access denied to this order.', 403);
    }

    // Idempotent: If already paid, return success immediately
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

    // 2. Cryptographic HMAC-SHA256 signature verification
    const { keySecret, isConfigured } = getRazorpayCredentials();

    if (isConfigured) {
      const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
      const isValid = await verifyRazorpaySignature(payload, razorpay_signature, keySecret);

      if (!isValid) {
        console.error('Signature verification failed for payment:', razorpay_payment_id);
        await supabaseAdmin.rpc('release_order_reservation', {
          p_order_id: order.id,
          p_new_payment_status: 'failed',
        });
        return errorResponse('VERIFICATION_FAILED', 'Cryptographic signature mismatch.', 400);
      }

      // 3. Verify payment details against Razorpay API
      const paymentData = await fetchRazorpayPayment(razorpay_payment_id);
      const expectedPaise = Math.round(Number(order.total) * 100);

      if (paymentData.status === 'authorized') {
        // Capture payment if account is configured for two-step auth-capture
        await captureRazorpayPayment(razorpay_payment_id, expectedPaise, 'INR');
      } else if (paymentData.status !== 'captured') {
        await supabaseAdmin.rpc('release_order_reservation', {
          p_order_id: order.id,
          p_new_payment_status: 'failed',
        });
        return errorResponse('PAYMENT_NOT_CAPTURED', 'Payment was not captured or authorized.', 400);
      }
    }

    // 4. Finalize order in database
    const { data: finalizeData, error: finalizeError } = await supabaseAdmin.rpc('finalize_paid_order', {
      p_order_id: order.id,
      p_provider: 'razorpay',
      p_provider_payment_id: razorpay_payment_id,
      p_amount: order.total,
      p_currency: 'INR',
    });

    if (finalizeError || !finalizeData?.success) {
      console.error('Finalize paid order RPC failed:', finalizeError);
      return errorResponse('FINALIZE_FAILED', 'Could not record order finalization.', 500);
    }

    // 5. Trigger email confirmation
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
    console.error('Verify payment exception:', err);
    return errorResponse('VERIFICATION_ERROR', 'An error occurred during payment verification.', 500);
  }
});
