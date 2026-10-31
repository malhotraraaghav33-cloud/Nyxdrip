import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

// All secrets remain on the Vercel server. This LIVE gateway is intentionally
// disabled until the merchant has completed order/database readiness checks.
export type Request = IncomingMessage & { method?: string; body?: unknown };
export type Response = ServerResponse;

export const json = (res: Response, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

export const configured = () => {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  const dbUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return {
    keyId, keySecret, dbUrl, serviceKey,
    enabled: process.env.RAZORPAY_LIVE_ENABLED === 'true' &&
      keyId.startsWith('rzp_live_') && Boolean(keySecret && dbUrl && serviceKey),
  };
};

export const readJson = async (req: Request, maxBytes = 32768): Promise<any> => {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    if (Buffer.byteLength(req.body) > maxBytes) throw new Error('Payload too large');
    return JSON.parse(req.body);
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const part = Buffer.from(chunk);
    size += part.length;
    if (size > maxBytes) throw new Error('Payload too large');
    chunks.push(part);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
};

export const basic = (keyId: string, secret: string) =>
  'Basic ' + Buffer.from(keyId + ':' + secret).toString('base64');

export const verifyHmac = (payload: string | Buffer, signature: string, secret: string) => {
  if (!/^[a-f0-9]{64}$/i.test(signature) || !secret) return false;
  const expected = createHmac('sha256', secret).update(payload).digest();
  const received = Buffer.from(signature, 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
};

export const dbFetch = async (
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
) => {
  const { dbUrl, serviceKey } = configured();
  const base = new URL(dbUrl);
  if (base.protocol !== 'https:' || base.pathname !== '/' ||
      (!base.hostname.endsWith('.supabase.co') && !base.hostname.endsWith('.supabase.in'))) {
    throw new Error('Invalid Supabase project URL');
  }
  const url = new URL('/rest/v1/' + path, base.origin);
  const response = await fetch(url, {
    method: init.method || 'GET',
    headers: {
      apikey: serviceKey,
      Authorization: 'Bearer ' + serviceKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers || {}),
    },
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    signal: AbortSignal.timeout(12000),
  });
  const raw = await response.text();
  let data: any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!response.ok) {
    console.error('Supabase payment backend error:', response.status, data?.code || 'unknown');
    throw new Error('ORDER_DATABASE_UNAVAILABLE');
  }
  return data;
};

export const orderForProvider = async (providerOrderId: string) => {
  const rows = await dbFetch('orders?select=id,order_number,guest_access_token,total,currency,charged_amount,charged_currency,payment_status,order_status,provider_order_id,provider_payment_id&provider_order_id=eq.' + encodeURIComponent(providerOrderId) + '&limit=1');
  return Array.isArray(rows) ? rows[0] : null;
};

export const fetchProvider = async (endpoint: string) => {
  const { keyId, keySecret } = configured();
  const response = await fetch('https://api.razorpay.com/v1/' + endpoint, {
    headers: { Authorization: basic(keyId, keySecret), Accept: 'application/json' },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    console.error('Razorpay API error:', response.status);
    throw new Error('PAYMENT_PROVIDER_UNAVAILABLE');
  }
  return response.json();
};

export const paymentCheck = async (providerOrderId: string, paymentId: string, order: any) => {
  const payment = await fetchProvider('payments/' + encodeURIComponent(paymentId));
  if (payment.id !== paymentId || payment.order_id !== providerOrderId ||
      payment.status !== 'captured' || payment.currency !== 'INR' ||
      !Number.isSafeInteger(payment.amount) ||
      payment.amount !== Math.round(Number(order.total) * 100)) {
    return false;
  }
  return true;
};

export const finalize = async (order: any, paymentId: string) => {
  const result = await dbFetch('rpc/finalize_paid_order', {
    method: 'POST',
    body: {
      p_order_id: order.id,
      p_provider: 'razorpay',
      p_provider_payment_id: paymentId,
      p_amount: Number(order.total),
      p_currency: 'INR',
    },
  });
  if (!result?.success) throw new Error('ORDER_FINALIZATION_FAILED');
  return result;
};
