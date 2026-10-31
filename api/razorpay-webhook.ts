import { configured, dbFetch, finalize, json, orderForProvider, paymentCheck, verifyHmac, type Request, type Response } from './_lib/payments.js';

// Require raw request bytes for a correct Razorpay webhook signature check.
// If Vercel/framework has already parsed the body, fail closed; never reconstruct.
export const config = { api: { bodyParser: false } };

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const settings = configured();
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  if (!settings.enabled || secret.length < 16) return json(res, 503, { error: 'Webhook not configured' });

  let raw: Buffer;
  try {
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of req) {
      const piece = Buffer.from(chunk);
      total += piece.length;
      if (total > 262144) throw new Error('Payload too large');
      chunks.push(piece);
    }
    raw = Buffer.concat(chunks);
    if (!raw.length) throw new Error('Empty body');
  } catch {
    return json(res, 400, { error: 'Raw webhook payload unavailable' });
  }

  const signature = String(req.headers['x-razorpay-signature'] || '');
  if (!verifyHmac(raw, signature, secret)) {
    return json(res, 400, { error: 'Invalid webhook signature' });
  }

  let event: any;
  try { event = JSON.parse(raw.toString('utf8')); }
  catch { return json(res, 400, { error: 'Invalid webhook JSON' }); }

  const eventType = event?.event;
  const eventId = req.headers['x-razorpay-event-id'];
  if (typeof eventType !== 'string' || eventType.length > 120 ||
      typeof eventId !== 'string' || !/^[A-Za-z0-9_-]{4,100}$/.test(eventId)) {
    return json(res, 400, { error: 'Invalid webhook event metadata' });
  }

  const payment = event?.payload?.payment?.entity;
  const gatewayOrder = event?.payload?.order?.entity;
  const providerOrderId = payment?.order_id || gatewayOrder?.id;
  const paymentId = payment?.id;

  try {
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      if (typeof providerOrderId !== 'string' || typeof paymentId !== 'string') {
        // Retrying allows external reconciliation if Razorpay omits payment in a payload.
        return json(res, 500, { error: 'Payment identifier not included in event' });
      }

      const order = await orderForProvider(providerOrderId);
      if (!order) return json(res, 503, { error: 'Order is not linked yet; retry webhook' });
      if (!(await paymentCheck(providerOrderId, paymentId, order))) {
        return json(res, 409, { error: 'Captured amount or currency does not match order' });
      }
      if (order.payment_status === 'paid' && order.provider_payment_id &&
          order.provider_payment_id !== paymentId) {
        return json(res, 409, { error: 'Order has a different payment ID' });
      }

      // finalize_paid_order is idempotent, so webhook retries are safe.
      await finalize(order, paymentId);
    }

    // Audit successful processing after DB finalization. A duplicate event
    // may be processed twice, but finalize_paid_order remains idempotent.
    try {
      await dbFetch('payment_events?on_conflict=provider,provider_event_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: {
          provider: 'razorpay',
          provider_event_id: eventId,
          event_type: eventType,
          payload: { event: eventType, provider_order_id: providerOrderId || null, payment_id: paymentId || null },
        },
      });
    } catch {
      // Fail closed on audit writes so delivery retries.
      return json(res, 503, { error: 'Unable to record webhook audit' });
    }
    return json(res, 200, { received: true });
  } catch {
    return json(res, 503, { error: 'Webhook processing incomplete; retry' });
  }
}
