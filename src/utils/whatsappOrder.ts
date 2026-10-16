import { CartItem } from '../types';

export const NYXDRIP_WHATSAPP_PHONE = '919354129232';
export const NYXDRIP_WHATSAPP_URL = `https://wa.me/${NYXDRIP_WHATSAPP_PHONE}`;
export const NYXDRIP_INSTAGRAM_URL = 'https://www.instagram.com/nyxdrip.store?mdxt=YmhiY21xeGZhd2Fn';

export interface WhatsAppOrderParams {
  items: CartItem[];
  subtotal: number;
  discount?: number;
  shipping: number;
  total: number;
  couponCode?: string | null;
  customer?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    apartment?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
}

/**
 * Encodes order details into an order inquiry message for WhatsApp.
 * Opens conversation with official WhatsApp business number: 919354129232.
 * Note: Clearly phrased as an order inquiry / summary; does not claim order is placed or confirmed.
 */
export function buildWhatsAppOrderUrl(params: WhatsAppOrderParams): string {
  if (params.items.length === 0) {
    return NYXDRIP_WHATSAPP_URL;
  }

  let text = `*NYxDRIP.STORE ORDER INQUIRY*\n\n`;
  text += `*Selected Hardware:*\n`;

  params.items.forEach((item, idx) => {
    const pieceUnit = item.product.pieceUnit || (item.product.slug === 'royal-fleur-studs' ? '1 PC' : '');
    const unitStr = pieceUnit ? ` (${pieceUnit})` : '';
    const variantStr = item.selectedVariant && item.selectedVariant !== 'Standard' ? ` [${item.selectedVariant}]` : '';
    const itemTotal = item.product.price * item.quantity;
    text += `${idx + 1}. ${item.product.name}${unitStr}${variantStr} x ${item.quantity} = ₹${itemTotal.toLocaleString('en-IN')}\n`;
  });

  text += `\n*Pricing Summary:*\n`;
  text += `• Subtotal: ₹${params.subtotal.toLocaleString('en-IN')}\n`;

  if (params.discount && params.discount > 0) {
    const couponInfo = params.couponCode ? ` (${params.couponCode})` : '';
    text += `• Discount${couponInfo}: -₹${params.discount.toLocaleString('en-IN')}\n`;
  }

  const shippingText = params.shipping === 0 ? 'FREE (Pan-India for orders > ₹999)' : `₹${params.shipping.toLocaleString('en-IN')}`;
  text += `• Shipping: ${shippingText}\n`;
  text += `• Estimated Total: ₹${params.total.toLocaleString('en-IN')}\n`;

  if (params.customer && (params.customer.firstName || params.customer.phone)) {
    text += `\n*Delivery Destination:*\n`;
    text += `Name: ${params.customer.firstName || ''} ${params.customer.lastName || ''}\n`.trim() + '\n';
    if (params.customer.phone) text += `Contact: ${params.customer.phone}\n`;
    if (params.customer.address) {
      const apt = params.customer.apartment ? `, ${params.customer.apartment}` : '';
      text += `Address: ${params.customer.address}${apt}, ${params.customer.city || ''}, ${params.customer.state || ''} - ${params.customer.pincode || ''}\n`;
    }
  }

  text += `\nPlease verify piece availability and payment instructions.`;

  return `https://wa.me/${NYXDRIP_WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
}
