/**
 * PayPal Server-side Integration Helpers
 */

export const getPayPalCredentials = () => {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID') || '';
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET') || '';
  const environment = (Deno.env.get('PAYPAL_ENVIRONMENT') || 'sandbox').toLowerCase();
  const currency = Deno.env.get('PAYPAL_CURRENCY') || 'USD';
  const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID') || '';

  const baseUrl = environment === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  return {
    clientId,
    clientSecret,
    environment,
    currency,
    webhookId,
    baseUrl,
    isConfigured: Boolean(clientId && clientSecret),
  };
};

/**
 * Retrieves OAuth2 Bearer Access Token from PayPal
 */
export const getPayPalAccessToken = async (): Promise<string> => {
  const { clientId, clientSecret, baseUrl, isConfigured } = getPayPalCredentials();

  if (!isConfigured) {
    return 'mock_paypal_token';
  }

  const authHeader = 'Basic ' + btoa(`${clientId}:${clientSecret}`);

  const resp = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error('PayPal OAuth token error:', resp.status, errText);
    throw new Error(`PAYPAL_AUTH_FAILED: ${resp.status}`);
  }

  const data = await resp.json();
  return data.access_token;
};

/**
 * Creates a PayPal Order via official Orders V2 API
 * POST /v2/checkout/orders
 */
export const createPayPalApiOrder = async (params: {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  idempotencyKey?: string;
}): Promise<{ id: string; status: string }> => {
  const { baseUrl, isConfigured } = getPayPalCredentials();

  if (!isConfigured) {
    return {
      id: `PAYPAL-MOCK-${Date.now().toString(36).toUpperCase()}`,
      status: 'CREATED',
    };
  }

  const accessToken = await getPayPalAccessToken();

  const formattedAmount = Number(params.amount).toFixed(2);

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  if (params.idempotencyKey) {
    headers['PayPal-Request-Id'] = params.idempotencyKey;
  }

  const resp = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: params.orderId,
          custom_id: params.orderNumber,
          description: `NYx DRIPstore Order ${params.orderNumber}`,
          amount: {
            currency_code: params.currency,
            value: formattedAmount,
          },
        },
      ],
      application_context: {
        brand_name: 'NYx DRIPstore',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
      },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error('PayPal create order failed:', resp.status, errText);
    throw new Error(`PAYPAL_ORDER_FAILED: ${resp.status}`);
  }

  const data = await resp.json();
  return {
    id: data.id,
    status: data.status,
  };
};

/**
 * Captures an approved PayPal Order
 * POST /v2/checkout/orders/{id}/capture
 */
export const capturePayPalApiOrder = async (
  paypalOrderId: string,
  idempotencyKey?: string
): Promise<{ id: string; status: string; captureId: string; amount: number; currency: string }> => {
  const { baseUrl, isConfigured, currency } = getPayPalCredentials();

  if (!isConfigured) {
    return {
      id: paypalOrderId,
      status: 'COMPLETED',
      captureId: `cap_mock_${Date.now()}`,
      amount: 100,
      currency,
    };
  }

  const accessToken = await getPayPalAccessToken();

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  if (idempotencyKey) {
    headers['PayPal-Request-Id'] = idempotencyKey;
  }

  const resp = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: 'POST',
    headers,
  });

  if (!resp.ok) {
    // If order was already captured, fetch order status
    if (resp.status === 422) {
      const getResp = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (getResp.ok) {
        const orderData = await getResp.json();
        const capture = orderData.purchase_units?.[0]?.payments?.captures?.[0];
        if (orderData.status === 'COMPLETED' && capture) {
          return {
            id: paypalOrderId,
            status: 'COMPLETED',
            captureId: capture.id,
            amount: Number(capture.amount.value),
            currency: capture.amount.currency_code,
          };
        }
      }
    }

    const errText = await resp.text();
    console.error('PayPal capture order failed:', resp.status, errText);
    throw new Error(`PAYPAL_CAPTURE_FAILED: ${resp.status}`);
  }

  const data = await resp.json();
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];

  return {
    id: data.id,
    status: data.status,
    captureId: capture?.id || data.id,
    amount: Number(capture?.amount?.value || 0),
    currency: capture?.amount?.currency_code || currency,
  };
};

/**
 * Verifies PayPal Webhook Signature with official PayPal verify-webhook-signature API
 */
export const verifyPayPalWebhookSignature = async (
  req: Request,
  rawBody: string
): Promise<boolean> => {
  const { baseUrl, webhookId, isConfigured } = getPayPalCredentials();

  if (!isConfigured || !webhookId) {
    return true; // Staging fallback
  }

  try {
    const accessToken = await getPayPalAccessToken();

    const authAlgo = req.headers.get('PAYPAL-AUTH-ALGO') || '';
    const certUrl = req.headers.get('PAYPAL-CERT-URL') || '';
    const transmissionId = req.headers.get('PAYPAL-TRANSMISSION-ID') || '';
    const transmissionSig = req.headers.get('PAYPAL-TRANSMISSION-SIG') || '';
    const transmissionTime = req.headers.get('PAYPAL-TRANSMISSION-TIME') || '';

    const resp = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: JSON.parse(rawBody),
      }),
    });

    if (!resp.ok) return false;
    const result = await resp.json();
    return result.verification_status === 'SUCCESS';
  } catch (err) {
    console.error('PayPal webhook verification exception:', err);
    return false;
  }
};
