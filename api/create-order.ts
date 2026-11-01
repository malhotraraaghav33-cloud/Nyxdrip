import { randomUUID } from 'node:crypto';
import { basic, configured, dbFetch, json, readJson, type Request, type Response } from './_lib/payments.js';

// Creates a *database-backed pending order*, reserves inventory atomically,
// and then creates the matching Razorpay order for the server-calculated amount.
export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const config = configured();
  if (!config.enabled) return json(res, 503, { error: 'Live payments are not activated' });

  let payload: any;
  try { payload = await readJson(req); }
  catch { return json(res, 400, { error: 'Invalid request' }); }

  const address = payload?.shippingAddress;
  const lines = payload?.items;
  const deliveryMethod = payload?.deliveryMethod;
  const email = address?.email;
  const name = String(address?.firstName || '').trim() + ' ' + String(address?.lastName || '').trim();
  const phone = address?.phone;

  if (!address || typeof address !== 'object' ||
      typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof phone !== 'string' || !/^\d{10}$/.test(phone) ||
      name.trim().length < 2 || name.length > 120 ||
      typeof address.address !== 'string' || address.address.length < 5 || address.address.length > 300 ||
      typeof address.city !== 'string' || address.city.length < 2 || address.city.length > 100 ||
      typeof address.state !== 'string' || address.state.length < 2 || address.state.length > 100 ||
      !/^\d{6}$/.test(String(address.pincode || '')) ||
      address.country !== 'India' ||
      deliveryMethod !== 'standard' ||
      !Array.isArray(lines) || lines.length < 1 || lines.length > 20) {
    return json(res, 400, { error: 'Enter complete, valid shipping details' });
  }

  const seen = new Set<string>();
  const items: Array<{ product_id: string; quantity: number; selectedVariant: string }> = [];
  for (const line of lines) {
    const productId = line?.productId;
    const quantity = line?.quantity;
    const variant = line?.selectedVariant || 'Standard';
    if (typeof productId !== 'string' || !/^[a-zA-Z0-9_-]{1,90}$/.test(productId) ||
        seen.has(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10 ||
        typeof variant !== 'string' || variant.length > 90) {
      return json(res, 400, { error: 'Invalid cart contents' });
    }
    seen.add(productId);
    items.push({ product_id: productId, quantity, selectedVariant: variant });
  }

  const couponCode = payload?.couponCode;
  if (couponCode != null && (typeof couponCode !== 'string' || !/^[A-Z0-9_-]{1,24}$/i.test(couponCode))) {
    return json(res, 400, { error: 'Invalid coupon' });
  }
  const idempotencyKey = typeof payload?.idempotencyKey === 'string' &&
    /^[A-Za-z0-9_-]{12,90}$/.test(payload.idempotencyKey)
    ? payload.idempotencyKey : randomUUID();

  let pending: any;
  try {
    pending = await dbFetch('rpc/create_pending_order', {
      method: 'POST',
      body: {
        p_user_id: null,
        p_provider: 'razorpay',
        p_idempotency_key: idempotencyKey,
        p_coupon_code: couponCode || null,
        p_shipping_address: address,
        p_delivery_method: deliveryMethod,
        p_charged_currency: 'INR',
        p_guest_email: email,
        p_guest_name: name.trim(),
        p_guest_phone: phone,
        p_items: items,
      },
    });
  } catch {
    return json(res, 503, { error: 'Order database is not ready or cart cannot be reserved' });
  }

  const totalPaise = Math.round(Number(pending?.total) * 100);
  if (!pending?.order_id || !pending?.order_number || !pending?.guest_access_token ||
      !Number.isSafeInteger(totalPaise) || totalPaise < 100 || totalPaise > 20000000) {
    return json(res, 503, { error: 'Could not validate server-calculated order total' });
  }

  // Reused pending orders must be verified as belonging to this guest token.
  // An existing provider order can be reused if its amount matches the DB total.
  if (pending.is_existing && pending.provider_order_id) {
    try {
      const response = await fetch(
        'https://api.razorpay.com/v1/orders/' + encodeURIComponent(pending.provider_order_id),
        { headers: { Authorization: basic(config.keyId, config.keySecret) }, signal: AbortSignal.timeout(12000) },
      );
      const providerOrder = response.ok ? await response.json() : null;
      if (providerOrder?.amount === totalPaise && providerOrder?.currency === 'INR') {
        return json(res, 200, {
          order_id: providerOrder.id, amount: totalPaise, currency: 'INR', key_id: config.keyId,
          orderNumber: pending.order_number, guestAccessToken: pending.guest_access_token,
        });
      }
    } catch { /* fail closed below */ }
    return json(res, 409, { error: 'Existing order cannot be safely resumed' });
  }

  // Avoid unintentionally recharging an existing pending order with no provider ID.
  if (pending.is_existing) return json(res, 409, { error: 'Existing checkout is incomplete. Please contact support.' });

  try {
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: basic(config.keyId, config.keySecret),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: totalPaise,
        currency: 'INR',
        receipt: String(pending.order_number).slice(0, 40),
        notes: { nyx_order_id: pending.order_id, order_number: pending.order_number },
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (response.status === 401) return json(res, 503, { error: 'Merchant payment credentials require attention' });
    if (!response.ok) throw new Error('RAZORPAY_ORDER_FAILED');
    const order = await response.json();
    if (!/^order_[A-Za-z0-9]+$/.test(String(order?.id || '')) ||
        order.amount !== totalPaise || order.currency !== 'INR') throw new Error('INVALID_RAZORPAY_ORDER');

    const updated = await dbFetch('orders?id=eq.' + encodeURIComponent(pending.order_id) + '&payment_status=eq.pending', {
      method: 'PATCH',
      body: { provider_order_id: order.id },
    });
    if (!Array.isArray(updated) || updated.length !== 1 || updated[0].provider_order_id !== order.id) {
      throw new Error('ORDER_LINK_FAILED');
    }

    return json(res, 200, {
      order_id: order.id, amount: order.amount, currency: 'INR', key_id: config.keyId,
      orderNumber: pending.order_number, guestAccessToken: pending.guest_access_token,
    });
  } catch {
    // An orphaned Razorpay order does not charge anyone: no checkout link returned.
    // Reservation expiry migration releases abandoned pending orders.
    return json(res, 502, { error: 'Could not link payment to your order. No payment was initiated.' });
  }
}
