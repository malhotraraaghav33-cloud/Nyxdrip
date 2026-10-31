import { configured, dbFetch, finalize, json, orderForProvider, paymentCheck, readJson, verifyHmac, type Request, type Response } from './_lib/payments';

// An on-screen success is reported only after a captured payment is checked
// against Razorpay AND the order is finalized in Supabase.
export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const config = configured();
  if (!config.enabled) return json(res, 503, { error: 'Live payments are not activated' });

  let input: any;
  try { input = await readJson(req, 8192); }
  catch { return json(res, 400, { error: 'Invalid request' }); }

  const orderId = input?.razorpay_order_id;
  const paymentId = input?.razorpay_payment_id;
  const signature = input?.razorpay_signature;
  const guestToken = input?.guestAccessToken;

  if (typeof orderId !== 'string' || !/^order_[A-Za-z0-9]{4,90}$/.test(orderId) ||
      typeof paymentId !== 'string' || !/^pay_[A-Za-z0-9]{4,90}$/.test(paymentId) ||
      typeof signature !== 'string' ||
      typeof guestToken !== 'string' || guestToken.length < 20 || guestToken.length > 256) {
    return json(res, 400, { error: 'Missing payment verification fields' });
  }

  if (!verifyHmac(orderId + '|' + paymentId, signature, config.keySecret)) {
    return json(res, 400, { error: 'Payment signature mismatch' });
  }

  try {
    const order = await orderForProvider(orderId);
    if (!order || order.guest_access_token !== guestToken ||
        order.charged_currency !== 'INR' ||
        !Number.isFinite(Number(order.total)) || Number(order.total) <= 0) {
      return json(res, 404, { error: 'Order not found or not authorized' });
    }

    if (!(await paymentCheck(orderId, paymentId, order))) {
      return json(res, 409, { error: 'Payment not captured or amount mismatch' });
    }

    if (order.payment_status === 'paid' && order.provider_payment_id && order.provider_payment_id !== paymentId) {
      return json(res, 409, { error: 'Order already paid by another payment' });
    }
    const result = await finalize(order, paymentId);
    return json(res, 200, {
      success: true, orderNumber: order.order_number,
      orderId: order.id, paymentStatus: 'paid', alreadyPaid: Boolean(result?.already_paid),
    });
  } catch {
    // Do not display Paid until DB is committed. Razorpay may have captured
    // money; a webhook or merchant reconciliation can complete the order.
    return json(res, 503, { error: 'Payment cannot yet be confirmed in the order database. Check Razorpay Dashboard before retrying.' });
  }
}
