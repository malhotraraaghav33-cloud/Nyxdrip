import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { errorResponse, successResponse } from '../_shared/errors.ts';

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const url = new URL(req.url);
    const orderNumber = url.searchParams.get('orderNumber') || url.searchParams.get('orderId');
    const token = url.searchParams.get('token');

    if (!orderNumber || !token) {
      return errorResponse('INVALID_REQUEST', 'orderNumber and token are required for guest access', 400);
    }

    const { data: order, error } = await supabaseAdmin.rpc('get_guest_order', {
      p_order_number: orderNumber.trim(),
      p_token: token.trim(),
    });

    if (error || !order) {
      return errorResponse('NOT_FOUND', 'Order not found or invalid security token', 404);
    }

    return successResponse({ order });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse('SERVER_ERROR', msg, 500);
  }
});
