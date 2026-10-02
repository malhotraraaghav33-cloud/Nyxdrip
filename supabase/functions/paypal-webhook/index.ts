import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { verifyPayPalWebhookSignature } from '../_shared/paypal.ts';
import { triggerOrderConfirmationEmail } from '../_shared/email.ts';

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const rawBody = await req.text();
    const eventId = req.headers.get('PAYPAL-TRANSMISSION-ID') || `pp_${Date.now()}`;

    // 1. Verify Webhook Signature with PayPal API
    const isValid = await verifyPayPalWebhookSignature(req, rawBody);
    if (!isValid) {
      console.error('[WEBHOOK_REJECTED] Invalid PayPal webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.event_type;
    const resource = payload.resource;

    const supabaseAdmin = getSupabaseAdmin();

    // 2. Webhook Deduplication via payment_events table
    const { error: eventInsertError } = await supabaseAdmin.from('payment_events').insert({
      provider: 'paypal',
      provider_event_id: eventId,
      event_type: eventType,
      payload: payload,
    });

    if (eventInsertError && eventInsertError.code === '23505') {
      console.log(`[WEBHOOK_DEDUPE] PayPal event ${eventId} already processed.`);
      return new Response(JSON.stringify({ status: 'already_processed' }), { status: 200 });
    }

    // 3. Process completed capture
    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      const orderNumber = resource.custom_id;
      const captureId = resource.id;
      const amount = Number(resource.amount?.value);
      const currency = resource.amount?.currency_code;

      let orderQuery = supabaseAdmin.from('orders').select('id, payment_status, total, charged_amount');
      if (orderNumber) {
        orderQuery = orderQuery.eq('order_number', orderNumber);
      } else if (resource.supplementary_data?.related_ids?.order_id) {
        orderQuery = orderQuery.eq('provider_order_id', resource.supplementary_data.related_ids.order_id);
      }

      const { data: order } = await orderQuery.maybeSingle();

      if (order && order.payment_status !== 'paid') {
        await supabaseAdmin.rpc('finalize_paid_order', {
          p_order_id: order.id,
          p_provider: 'paypal',
          p_provider_payment_id: captureId,
          p_amount: amount || order.charged_amount,
          p_currency: currency || 'USD',
        });

        triggerOrderConfirmationEmail(supabaseAdmin, order.id).catch((e) =>
          console.warn('PayPal webhook email warning:', e)
        );
      }
    } else if (eventType === 'PAYMENT.CAPTURE.DENIED' || eventType === 'CHECKOUT.ORDER.CANCELLED') {
      const orderNumber = resource.custom_id;
      if (orderNumber) {
        const { data: order } = await supabaseAdmin
          .from('orders')
          .select('id, payment_status')
          .eq('order_number', orderNumber)
          .maybeSingle();

        if (order && order.payment_status === 'pending') {
          await supabaseAdmin.rpc('release_order_reservation', {
            p_order_id: order.id,
            p_new_payment_status: 'failed',
          });
        }
      }
    }

    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    console.error('PayPal webhook error:', err);
    return new Response(JSON.stringify({ status: 'acknowledged_with_error' }), { status: 200 });
  }
});
