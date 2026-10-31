import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

// A successful result proves only a captured TEST payment. It does NOT create
// a Supabase order, reserve stock, or authorize fulfilment.
type Request = IncomingMessage & { method?: string; body?: unknown };

const send = (res: ServerResponse, status: number, data: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
};

const parseBody = async (req: Request): Promise<any> => {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}');
};

export default async function handler(req: Request, res: ServerResponse) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  if (process.env.RAZORPAY_TEST_MODE_ENABLED !== 'true' ||
      !keyId.startsWith('rzp_test_') || !secret) {
    return send(res, 503, { error: 'Test checkout is not configured' });
  }

  let body: any;
  try {
    body = await parseBody(req);
  } catch {
    return send(res, 400, { error: 'Invalid JSON' });
  }

  const orderId = body?.razorpay_order_id;
  const paymentId = body?.razorpay_payment_id;
  const signature = body?.razorpay_signature;
  if (typeof orderId !== 'string' || !/^order_[A-Za-z0-9]{4,80}$/.test(orderId) ||
      typeof paymentId !== 'string' || !/^pay_[A-Za-z0-9]{4,80}$/.test(paymentId) ||
      typeof signature !== 'string' || !/^[0-9a-f]{64}$/i.test(signature)) {
    return send(res, 400, { error: 'Missing or malformed verification fields' });
  }

  const expected = createHmac('sha256', secret)
    .update(orderId + '|' + paymentId).digest();
  const supplied = Buffer.from(signature, 'hex');
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return send(res, 400, { error: 'Payment signature mismatch' });
  }

  try {
    const authorization = 'Basic ' + Buffer.from(keyId + ':' + secret).toString('base64');
    const headers = { Authorization: authorization, Accept: 'application/json' };
    const [paymentResponse, orderResponse] = await Promise.all([
      fetch('https://api.razorpay.com/v1/payments/' + encodeURIComponent(paymentId), {
        headers, signal: AbortSignal.timeout(10000),
      }),
      fetch('https://api.razorpay.com/v1/orders/' + encodeURIComponent(orderId), {
        headers, signal: AbortSignal.timeout(10000),
      }),
    ]);
    if (!paymentResponse.ok || !orderResponse.ok) {
      return send(res, 502, { error: 'Could not confirm payment with Razorpay' });
    }
    const [payment, order] = await Promise.all([
      paymentResponse.json(), orderResponse.json(),
    ]);

    if (payment.order_id !== orderId || payment.id !== paymentId ||
        payment.status !== 'captured' || payment.currency !== 'INR' ||
        order.id !== orderId || order.currency !== 'INR' ||
        Number(payment.amount) !== Number(order.amount) ||
        !String(order.receipt || '').startsWith('NYXTEST-')) {
      return send(res, 409, { error: 'Test payment is not captured or does not match the order' });
    }

    return send(res, 200, {
      success: true, testMode: true, payment_id: payment.id,
      amount: payment.amount,
      message: 'Test payment verified. No fulfilment order was created.',
    });
  } catch {
    return send(res, 502, { error: 'Payment verification is temporarily unavailable' });
  }
}
