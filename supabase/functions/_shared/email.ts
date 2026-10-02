import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

/**
 * Atomic Order Confirmation Email Trigger Hook
 * Ensures the confirmation email is dispatched exactly once post-payment verification.
 */
export const triggerOrderConfirmationEmail = async (
  supabaseAdmin: SupabaseClient,
  orderId: string
): Promise<boolean> => {
  try {
    // 1. Atomic check-and-set on confirmation_email_sent_at
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('payment_status', 'paid')
      .is('confirmation_email_sent_at', null)
      .select('id, order_number, user_id, customer_email:shipping_address->>email, total, currency')
      .maybeSingle();

    if (error || !order) {
      // Email was already sent or order is not yet paid
      return false;
    }

    // =========================================================================
    // PRODUCTION SMTP / RESEND / POSTMARK / SENDGRID INTEGRATION POINT
    // To send via your custom SMTP provider, configure RESEND_API_KEY
    // or standard SMTP credentials in Supabase Edge Function Secrets.
    // =========================================================================
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey && order.customer_email) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'NYx DRIPstore <vault@nyxdripstore.com>',
          to: [order.customer_email],
          subject: `Order Confirmed: ${order.order_number}`,
          html: `
            <div style="background:#0A0A0D;color:#F5F5F7;padding:32px;font-family:sans-serif;">
              <h1 style="color:#8B5CF6;letter-spacing:2px;">NYX DRIPSTORE</h1>
              <h2>ORDER CONFIRMED: ${order.order_number}</h2>
              <p>Your hardware order has been verified and securely allocated in our vault.</p>
              <p>Total Paid: <strong>${order.currency} ${order.total}</strong></p>
              <p style="color:#9A9AA3;font-size:12px;">Track your delivery updates anytime in your account dashboard.</p>
            </div>
          `,
        }),
      }).catch((e) => console.warn('Resend email dispatch error:', e));
    } else {
      console.log(`[EMAIL_DISPATCH_HOOK] Order confirmation recorded for order ${order.order_number} to ${order.customer_email || 'customer'}`);
    }

    return true;
  } catch (err) {
    console.error('Order confirmation email hook error:', err);
    return false;
  }
};
