import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { successResponse } from '../_shared/errors.ts';
import { getRazorpayCredentials } from '../_shared/razorpay.ts';
import { getPayPalCredentials } from '../_shared/paypal.ts';

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const razorpay = getRazorpayCredentials();
  const paypal = getPayPalCredentials();

  // Return public identifiers only (Safe for browser)
  const config = {
    razorpayKeyId: razorpay.keyId,
    paypalClientId: paypal.clientId,
    paypalCurrency: paypal.currency,
    environment: razorpay.isConfigured ? 'live' : 'test',
    paypalEnvironment: paypal.environment,
  };

  return successResponse(config);
});
