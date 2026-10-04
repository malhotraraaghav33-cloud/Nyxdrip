import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { getOptionalUser } from '../_shared/auth.ts';
import { errorResponse, successResponse } from '../_shared/errors.ts';

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const user = await getOptionalUser(req, supabaseAdmin);

    const body = await req.json().catch(() => ({}));
    const { orderId } = body;

    if (!orderId) {
      return errorResponse('INVALID_PAYLOAD', 'orderId is required');
    }

    // Verify order
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, payment_status')
      .eq('id', orderId)
      .maybeSingle();

    if (!order) {
      return errorResponse('ORDER_NOT_FOUND', 'Order not found', 404);
    }

    // If order was created by an authenticated user, require that user
    if (order.user_id && (!user || order.user_id !== user.id)) {
      return errorResponse('UNAUTHORIZED', 'Access denied to this order', 403);
    }

    // Only cancel if still pending
    if (order.payment_status === 'pending') {
      await supabaseAdmin.rpc('release_order_reservation', {
        p_order_id: order.id,
        p_new_payment_status: 'cancelled',
      });
    }

    return successResponse({ success: true, status: 'cancelled' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse('CANCEL_ERROR', msg, 500);
  }
});
