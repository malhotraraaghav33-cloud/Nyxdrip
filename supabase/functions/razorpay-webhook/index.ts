import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { getRazorpayCredentials, verifyRazorpaySignature } from '../_shared/razorpay.ts';
import { triggerOrderConfirmationEmail } from '../_shared/email.ts';

serve(async (req: Request) => {
  // Webhooks are server-to-server POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';
    const eventId = req.headers.get('x-razorpay-event-id') || `rzp_${Date.now()}`;

    const { webhookSecret, isConfigured } = getRazorpayCredentials();

    // 1. Verify Webhook Signature
    if (isConfigured && webhookSecret) {
      const isValid = await verifyRazorpaySignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error('[WEBHOOK_REJECTED] Invalid Razorpay webhook signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;

    const rzpOrderId = paymentEntity?.order_id || orderEntity?.id;
    const rzpPaymentId = paymentEntity?.id;
    const amountINR = paymentEntity ? paymentEntity.amount / 100 : undefined;

    const supabaseAdmin = getSupabaseAdmin();

    // 2. Webhook Deduplication via payment_events table
    const { error: eventInsertError } = await supabaseAdmin.from('payment_events').insert({
      provider: 'razorpay',
      provider_event_id: eventId,
      event_type: eventType,
      payload: payload,
    });

    if (eventInsertError && eventInsertError.code === '23505') {
      // Event already processed (idempotency deduplication)
      console.log(`[WEBHOOK_DEDUPE] Event ${eventId} already processed.`);
      return new Response(JSON.stringify({ status: 'already_processed' }), { status: 200 });
    }

    // 3. Process specific events
    if ((eventType === 'payment.captured' || eventType === 'order.paid') && rzpOrderId) {
      // Find internal order
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('id, payment_status, total')
        .eq('provider_order_id', rzpOrderId)
        .maybeSingle();

      if (order && order.payment_status !== 'paid') {
        const finalizeAmount = amountINR || order.total;

        await supabaseAdmin.rpc('finalize_paid_order', {
          p_order_id: order.id,
          p_provider: 'razorpay',
          p_provider_payment_id: rzpPaymentId || 'webhook_captured',
          p_amount: finalizeAmount,
          p_currency: 'INR',
        });

        // Trigger confirmation email
        triggerOrderConfirmationEmail(supabaseAdmin, order.id).catch((e) =>
          console.warn('Webhook email trigger note:', e)
        );
      }
    } else if (eventType === 'payment.failed' && rzpOrderId) {
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('id, payment_status')
        .eq('provider_order_id', rzpOrderId)
        .maybeSingle();

      if (order && order.payment_status === 'pending') {
        await supabaseAdmin.rpc('release_order_reservation', {
          p_order_id: order.id,
          p_new_payment_status: 'failed',
        });
      }
    }

    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    console.error('Razorpay webhook handler error:', err);
    // Always return 200 to acknowledge webhook receipt and prevent provider retries
    return new Response(JSON.stringify({ status: 'acknowledged_with_error' }), { status: 200 });
  }
});
