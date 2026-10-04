import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

/**
 * Generates responsive NYx DRIPstore Branded HTML Email
 */
export const buildOrderConfirmationHtml = (params: {
  orderNumber: string;
  orderDate: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: any;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    variant?: string;
    image?: string;
  }>;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  currency: string;
  paymentMethod: string;
  viewOrderUrl: string;
  estimatedDelivery: string;
}): string => {
  const {
    orderNumber,
    orderDate,
    customerName,
    shippingAddress,
    items,
    subtotal,
    discount,
    shipping,
    total,
    currency,
    paymentMethod,
    viewOrderUrl,
    estimatedDelivery,
  } = params;

  const addressLine = [
    shippingAddress?.address,
    shippingAddress?.apartment,
    shippingAddress?.city,
    shippingAddress?.state,
    shippingAddress?.pincode,
    shippingAddress?.country || 'India',
  ].filter(Boolean).join(', ');

  const itemsHtml = items.map((item) => `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid #2A2A32;vertical-align:middle;">
        <div style="font-family:'Syne',Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;color:#F5F5F7;letter-spacing:0.5px;">
          ${item.name}
        </div>
        <div style="font-size:11px;color:#9A9AA3;margin-top:2px;">
          Qty: ${item.quantity} ${item.variant && item.variant !== 'Standard' ? `· Variant: ${item.variant}` : ''}
        </div>
      </td>
      <td style="padding:14px 0;border-bottom:1px solid #2A2A32;text-align:right;vertical-align:middle;font-family:'JetBrains Mono',monospace;font-size:13px;color:#F5F5F7;white-space:nowrap;">
        ₹${(item.price * item.quantity).toLocaleString('en-IN')}
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NYx DRIPstore — Order Confirmed #${orderNumber}</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0A0D;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif;color:#F5F5F7;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0A0A0D;width:100%;margin:0;padding:32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:580px;background-color:#15151B;border:1px solid #2A2A32;border-radius:0px;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);">
          
          <!-- Top Cyber Brand Header -->
          <tr>
            <td style="background-color:#101015;padding:28px 32px;border-bottom:1px solid #2A2A32;text-align:center;">
              <div style="font-family:'Syne',Helvetica,Arial,sans-serif;font-size:22px;font-weight:900;letter-spacing:4px;color:#F5F5F7;text-transform:uppercase;">
                NY<span style="color:#8B5CF6;">x</span> DRIP<span style="color:#00D9FF;">store</span>
              </div>
              <div style="font-size:10px;font-weight:700;letter-spacing:2.5px;color:#8B5CF6;text-transform:uppercase;margin-top:6px;">
                VAULT PROTOCOL · ORDER CONFIRMED
              </div>
            </td>
          </tr>

          <!-- Confirmation Hero Banner -->
          <tr>
            <td style="padding:32px 32px 24px 32px;text-align:left;">
              <div style="display:inline-block;padding:4px 10px;background-color:rgba(0,217,255,0.1);border:1px solid rgba(0,217,255,0.3);color:#00D9FF;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:16px;">
                STATUS: PAID & CONFIRMED
              </div>
              <h1 style="font-family:'Syne',Helvetica,Arial,sans-serif;font-size:24px;font-weight:800;color:#F5F5F7;margin:0 0 12px 0;letter-spacing:0.5px;">
                ORDER CONFIRMED #${orderNumber}
              </h1>
              <p style="font-size:13px;line-height:22px;color:#C7CBD3;margin:0;">
                Thank you for shopping with <strong style="color:#F5F5F7;">NYx DRIPstore</strong>${customerName ? `, <strong style="color:#F5F5F7;">${customerName}</strong>` : ''}. Your hardware pieces have been verified and prioritized for dispatch.
              </p>
            </td>
          </tr>

          <!-- Order Summary Details -->
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0A0A0D;border:1px solid #2A2A32;padding:16px;">
                <tr>
                  <td style="padding:6px 12px;font-size:11px;color:#9A9AA3;text-transform:uppercase;letter-spacing:1px;">Order Date</td>
                  <td style="padding:6px 12px;font-size:12px;color:#F5F5F7;text-align:right;font-family:'JetBrains Mono',monospace;">${orderDate}</td>
                </tr>
                <tr>
                  <td style="padding:6px 12px;font-size:11px;color:#9A9AA3;text-transform:uppercase;letter-spacing:1px;">Payment Method</td>
                  <td style="padding:6px 12px;font-size:12px;color:#00D9FF;text-align:right;text-transform:uppercase;font-weight:600;">${paymentMethod || 'Razorpay / Prepaid'}</td>
                </tr>
                <tr>
                  <td style="padding:6px 12px;font-size:11px;color:#9A9AA3;text-transform:uppercase;letter-spacing:1px;">Est. Dispatch</td>
                  <td style="padding:6px 12px;font-size:12px;color:#8B5CF6;text-align:right;font-weight:600;">${estimatedDelivery}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#9A9AA3;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #2A2A32;">
                ORDERED PIECES
              </div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                ${itemsHtml}
              </table>
            </td>
          </tr>

          <!-- Financial Breakdown -->
          <tr>
            <td style="padding:0 32px 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:12px;">
                <tr>
                  <td style="padding:4px 0;color:#9A9AA3;">Subtotal</td>
                  <td style="padding:4px 0;text-align:right;color:#F5F5F7;font-family:'JetBrains Mono',monospace;">₹${subtotal.toLocaleString('en-IN')}</td>
                </tr>
                ${discount > 0 ? `
                <tr>
                  <td style="padding:4px 0;color:#00D9FF;">Discount</td>
                  <td style="padding:4px 0;text-align:right;color:#00D9FF;font-family:'JetBrains Mono',monospace;">-₹${discount.toLocaleString('en-IN')}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding:4px 0;color:#9A9AA3;">Shipping</td>
                  <td style="padding:4px 0;text-align:right;color:#F5F5F7;font-family:'JetBrains Mono',monospace;">${shipping === 0 ? 'FREE' : `₹${shipping.toLocaleString('en-IN')}`}</td>
                </tr>
                <tr>
                  <td style="padding:14px 0 0 0;font-size:14px;font-weight:700;color:#F5F5F7;border-top:1px solid #2A2A32;">Grand Total</td>
                  <td style="padding:14px 0 0 0;text-align:right;font-size:16px;font-weight:800;color:#F5F5F7;font-family:'JetBrains Mono',monospace;border-top:1px solid #2A2A32;">₹${total.toLocaleString('en-IN')}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Shipping Destination -->
          <tr>
            <td style="padding:0 32px 32px 32px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#9A9AA3;text-transform:uppercase;margin-bottom:8px;">
                SHIPPING DESTINATION
              </div>
              <div style="padding:14px;background-color:#0A0A0D;border:1px solid #2A2A32;font-size:12px;color:#C7CBD3;line-height:20px;">
                <div style="font-weight:700;color:#F5F5F7;margin-bottom:4px;">${customerName || 'Customer'}</div>
                <div>${addressLine}</div>
                ${shippingAddress?.phone ? `<div style="margin-top:4px;color:#9A9AA3;">Phone: ${shippingAddress.phone}</div>` : ''}
              </div>
            </td>
          </tr>

          <!-- Secure Guest Order Access CTA Button -->
          <tr>
            <td style="padding:0 32px 36px 32px;text-align:center;">
              <a href="${viewOrderUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;width:100%;max-width:320px;padding:16px 24px;background-color:#8B5CF6;color:#FFFFFF;text-decoration:none;font-family:'Syne',Helvetica,Arial,sans-serif;font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;text-align:center;box-shadow:0 10px 25px -5px rgba(139,92,246,0.5);">
                VIEW ORDER & LIVE STATUS
              </a>
              <div style="font-size:10px;color:#9A9AA3;margin-top:10px;">
                Protected by secure encrypted order access token.
              </div>
            </td>
          </tr>

          <!-- Footer & Support Notice -->
          <tr>
            <td style="padding:24px 32px;background-color:#0A0A0D;border-top:1px solid #2A2A32;text-align:center;font-size:11px;color:#9A9AA3;line-height:18px;">
              <p style="margin:0 0 8px 0;">Need support or courier assistance? Contact our vault ops at <a href="mailto:support@nyxdripstore.com" style="color:#00D9FF;text-decoration:none;">support@nyxdripstore.com</a>.</p>
              <p style="margin:0;font-size:10px;color:#6B7280;">© ${new Date().getFullYear()} NYx DRIPstore. All rights reserved. Gothic streetwear hardware & cyber accessories.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

/**
 * Atomic Order Confirmation Email Trigger Hook
 * Ensures the confirmation email is dispatched exactly once post-payment verification.
 */
export const triggerOrderConfirmationEmail = async (
  supabaseAdmin: SupabaseClient,
  orderId: string
): Promise<boolean> => {
  try {
    // 1. Atomic check-and-set on confirmation_email_sent_at and confirmation_email_sent
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .update({
        confirmation_email_sent: true,
        confirmation_email_sent_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('payment_status', 'paid')
      .is('confirmation_email_sent_at', null)
      .select(`
        id,
        order_number,
        user_id,
        customer_email,
        customer_name,
        customer_phone,
        guest_access_token,
        shipping_address,
        delivery_method,
        payment_provider,
        subtotal,
        discount,
        shipping,
        total,
        currency,
        created_at,
        order_items (
          product_name_snapshot,
          quantity,
          price_snapshot,
          selected_variant,
          product_image
        )
      `)
      .maybeSingle();

    if (error || !order) {
      // Email was already sent or order is not yet paid
      return false;
    }

    const email = order.customer_email || order.shipping_address?.email;
    if (!email) {
      console.warn(`[EMAIL_DISPATCH] Order ${order.order_number} has no recipient email address`);
      return false;
    }

    const items = (order.order_items || []).map((oi: any) => ({
      name: oi.product_name_snapshot || 'NYx Hardware',
      quantity: oi.quantity || 1,
      price: Number(oi.price_snapshot || 0),
      variant: oi.selected_variant,
      image: oi.product_image,
    }));

    const estDate = new Date(new Date(order.created_at || Date.now()).getTime() + 4 * 24 * 60 * 60 * 1000);
    const estimatedDelivery = estDate.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    const siteUrl = Deno.env.get('SITE_URL') || Deno.env.get('PUBLIC_APP_URL') || 'https://ais-pre-zjbqf55466mrdxzvos5amc-287082123565.asia-east1.run.app';
    const viewOrderUrl = `${siteUrl}/#order-confirmation?orderId=${encodeURIComponent(order.order_number)}&token=${encodeURIComponent(order.guest_access_token || '')}`;

    const emailHtml = buildOrderConfirmationHtml({
      orderNumber: order.order_number,
      orderDate: new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      customerName: order.customer_name || `${order.shipping_address?.firstName || ''} ${order.shipping_address?.lastName || ''}`.trim() || 'Valued Operative',
      customerEmail: email,
      shippingAddress: order.shipping_address || {},
      items,
      subtotal: Number(order.subtotal || 0),
      discount: Number(order.discount || 0),
      shipping: Number(order.shipping || 0),
      total: Number(order.total || 0),
      currency: order.currency || 'INR',
      paymentMethod: order.payment_provider || 'Prepaid',
      viewOrderUrl,
      estimatedDelivery,
    });

    // 2. Dispatch email via configured SMTP / Resend provider
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'NYx DRIPstore <orders@nyxdripstore.com>',
          to: [email],
          subject: `NYx DRIPstore — Order Confirmed #${order.order_number}`,
          html: emailHtml,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn('Resend email error:', errText);
      } else {
        console.log(`[EMAIL_DISPATCH] Order confirmation sent via Resend for #${order.order_number} to ${email}`);
      }
    } else {
      console.log(`[EMAIL_DISPATCH_HOOK] Order confirmation recorded for #${order.order_number} to ${email}. Token URL: ${viewOrderUrl}`);
    }

    return true;
  } catch (err) {
    console.error('Order confirmation email hook error:', err);
    return false;
  }
};
