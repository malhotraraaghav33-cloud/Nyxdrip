import type { IncomingMessage, ServerResponse } from 'node:http';

// TEST MODE ONLY. This endpoint deliberately does not create a fulfilment order.
// A trusted order database + webhook must be added before accepting live money.
type Request = IncomingMessage & { method?: string; body?: unknown };
type Response = ServerResponse;

const send = (res: Response, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

type Line = { productId: string; quantity: number };
const parseLines = (value: unknown): Line[] | null => {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) return null;
  const lines: Line[] = [];
  const ids = new Set<string>();
  for (const item of value) {
    const productId = item?.productId;
    const quantity = item?.quantity;
    if (typeof productId !== 'string' ||
        !/^[a-zA-Z0-9_-]{1,90}$/.test(productId) ||
        !Number.isInteger(quantity) || quantity < 1 || quantity > 10 ||
        ids.has(productId)) return null;
    ids.add(productId);
    lines.push({ productId, quantity });
  }
  return lines;
};

const parseBody = async (req: Request): Promise<any> => {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}');
};

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  if (process.env.RAZORPAY_TEST_MODE_ENABLED !== 'true' ||
      !keyId.startsWith('rzp_test_') || !secret || !supabaseUrl || !supabaseKey) {
    return send(res, 503, { error: 'Test checkout is not configured' });
  }

  let body: any;
  try {
    body = await parseBody(req);
  } catch {
    return send(res, 400, { error: 'Invalid JSON payload' });
  }

  const lines = parseLines(body?.items);
  if (!lines || !['standard', 'express'].includes(body?.deliveryMethod)) {
    return send(res, 400, { error: 'Invalid items or delivery method' });
  }
  if (body?.couponCode) {
    return send(res, 400, { error: 'Coupons are not supported in payment test mode' });
  }

  // Never trust frontend prices or totals. Prices come only from public Supabase products.
  let subtotalPaise = 0;
  try {
    const base = new URL(supabaseUrl);
    if (base.protocol !== 'https:' || base.pathname !== '/') throw new Error('Invalid Supabase URL');

    for (const line of lines) {
      const url = new URL('/rest/v1/products', base.origin);
      url.searchParams.set('select', 'id,price,stock,is_active');
      url.searchParams.set('id', 'eq.' + line.productId);
      url.searchParams.set('limit', '1');
      const response = await fetch(url, {
        headers: { apikey: supabaseKey, Accept: 'application/json' },
        signal: AbortSignal.timeout(7000),
      });
      if (!response.ok) throw new Error('Catalog lookup failed');
      const rows = await response.json();
      const product = rows?.[0];
      const price = Number(product?.price);
      if (!product || product.is_active !== true || !Number.isFinite(price) ||
          price <= 0 || price > 100000 || !Number.isInteger(Number(product.stock)) ||
          Number(product.stock) < line.quantity) {
        return send(res, 400, { error: 'A product is unavailable or out of stock' });
      }
      subtotalPaise += Math.round(price * 100) * line.quantity;
    }

    const shippingPaise = (subtotalPaise >= 99900 ? 0 : 9900) +
      (body.deliveryMethod === 'express' ? 15000 : 0);
    const amount = subtotalPaise + shippingPaise;

    if (!Number.isSafeInteger(amount) || amount < 100 || amount > 20000000) {
      return send(res, 400, { error: 'Invalid order amount' });
    }

    const receipt = 'NYXTEST-' + Date.now().toString(36) + '-' +
      crypto.randomUUID().slice(0, 8);
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(keyId + ':' + secret).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount, currency: 'INR', receipt,
        notes: { purpose: 'NYXDRIP TEST ONLY - NOT A FULFILMENT ORDER' },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 401) return send(res, 401, { error: 'Razorpay test credentials are invalid' });
    if (!response.ok) return send(res, 502, { error: 'Razorpay could not create a test order' });
    const order = await response.json();
    if (!order?.id || order.amount !== amount || order.currency !== 'INR') {
      return send(res, 502, { error: 'Unexpected Razorpay order response' });
    }

    return send(res, 200, {
      order_id: order.id, amount: order.amount, currency: order.currency,
      key_id: keyId, subtotalPaise, shippingPaise, testMode: true,
    });
  } catch {
    return send(res, 502, { error: 'Could not validate the catalog or initialize Razorpay test checkout' });
  }
}
