import React, { useState } from 'react';
import { X, Package, ShieldCheck, Clock, Truck, CheckCircle2, AlertCircle, Phone, Mail, MapPin, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../../context/ToastContext';

interface OrderDetailModalProps {
  order: any | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const { showToast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>(order?.order_status || 'Processing');
  const [updating, setUpdating] = useState(false);

  if (!isOpen || !order) return null;

  const shippingAddr = typeof order.shipping_address === 'string'
    ? JSON.parse(order.shipping_address)
    : (order.shipping_address || {});

  const items = Array.isArray(order.order_items) ? order.order_items : [];

  const handleUpdateStatus = async () => {
    if (selectedStatus === order.order_status) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          order_status: selectedStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (error) throw error;

      showToast('Order Status Updated', `Order #${order.order_number} marked as ${selectedStatus}.`, 'success');
      onUpdated();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update order';
      showToast('Update Error', msg, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-950/80 border border-emerald-700 text-emerald-300">
            <ShieldCheck size={12} />
            <span>Verified Paid</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-950/80 border border-amber-700 text-amber-300">
            <Clock size={12} />
            <span>Payment Pending</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-[#15151B] border border-[#2A2A32] text-[#9A9AA3]">
            {status || 'Unknown'}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#15151B] border border-[#2A2A32] shadow-2xl my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2A2A32] shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#00D9FF] font-semibold">
                ORDER RECORD
              </span>
              <span className="font-mono-numbers text-xs text-white font-bold bg-[#0A0A0D] px-2 py-0.5 border border-[#2A2A32]">
                #{order.order_number}
              </span>
            </div>
            <p className="text-[11px] text-[#9A9AA3] mt-1 font-mono-numbers">
              Placed on {new Date(order.created_at).toLocaleString('en-IN')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#9A9AA3] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Top Status & Payment Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#0A0A0D] border border-[#2A2A32]">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#9A9AA3] font-semibold mb-1">
                Verified Payment Status
              </p>
              <div className="flex items-center gap-2">
                {getPaymentBadge(order.payment_status)}
                <span className="text-[11px] text-[#9A9AA3] font-mono-numbers">
                  Method: {order.payment_method?.toUpperCase() || 'UPI / CARD'}
                </span>
              </div>
              <p className="text-[10px] text-[#9A9AA3]/70 mt-1 italic">
                * Payment records are verified via gateway and cannot be modified manually.
              </p>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#9A9AA3] font-semibold mb-1">
                Update Fulfillment Status
              </p>
              <div className="flex items-center gap-2">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-[#15151B] border border-[#2A2A32] focus:border-[#8B5CF6] text-xs text-white px-3 py-1.5 focus:outline-none"
                >
                  <option value="Processing">Processing</option>
                  <option value="Paid">Paid / Preparing</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                <button
                  type="button"
                  disabled={updating || selectedStatus === order.order_status}
                  onClick={handleUpdateStatus}
                  className="px-3.5 py-1.5 bg-[#8B5CF6] hover:bg-[#7c4def] disabled:opacity-40 text-white text-[11px] font-bold uppercase tracking-wider transition-colors"
                >
                  {updating ? 'Saving...' : 'Update'}
                </button>
              </div>
            </div>
          </div>

          {/* Customer & Shipping Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-[#0A0A0D] border border-[#2A2A32] space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-[#8B5CF6] font-semibold flex items-center gap-1.5">
                <Mail size={12} />
                <span>Customer Contact</span>
              </p>
              <p className="font-bold text-white text-sm">{order.customer_name || 'Guest Customer'}</p>
              <p className="text-[#C7CBD3] flex items-center gap-1.5">
                <Mail size={12} className="text-[#9A9AA3]" />
                <a href={`mailto:${order.customer_email}`} className="hover:underline">{order.customer_email}</a>
              </p>
              <p className="text-[#C7CBD3] flex items-center gap-1.5 font-mono-numbers">
                <Phone size={12} className="text-[#9A9AA3]" />
                <a href={`tel:${order.customer_phone}`} className="hover:underline">{order.customer_phone}</a>
              </p>
            </div>

            <div className="p-4 bg-[#0A0A0D] border border-[#2A2A32] space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest text-[#00D9FF] font-semibold flex items-center gap-1.5">
                <MapPin size={12} />
                <span>Delivery Address</span>
              </p>
              <p className="text-[#C7CBD3] leading-relaxed">
                {shippingAddr.streetAddress || shippingAddr.street_address || order.customer_address || 'Address on file'}
                {shippingAddr.apartment ? `, ${shippingAddr.apartment}` : ''}
              </p>
              <p className="text-[#9A9AA3]">
                {[shippingAddr.city, shippingAddr.state, shippingAddr.postalCode || shippingAddr.postal_code]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              <p className="text-[#9A9AA3] font-mono-numbers">
                Delivery: {order.delivery_method ? order.delivery_method.toUpperCase() : 'STANDARD'}
              </p>
            </div>
          </div>

          {/* Order Items Table */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#9A9AA3] font-semibold mb-3">
              Purchased Hardware ({items.length} piece{items.length === 1 ? '' : 's'})
            </p>
            <div className="border border-[#2A2A32] overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[#0A0A0D] text-[10px] uppercase tracking-wider text-[#9A9AA3] border-b border-[#2A2A32]">
                  <tr>
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-3">Variant</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A32]/60">
                  {items.map((item: any, idx: number) => {
                    const priceVal = Number(item.price_snapshot || item.price || 0);
                    const qtyVal = Number(item.quantity || 1);
                    return (
                      <tr key={item.id || idx} className="hover:bg-[#1A1A22]/40">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            {item.product_image && (
                              <img
                                src={item.product_image}
                                alt={item.product_name}
                                className="w-9 h-9 object-cover border border-[#2A2A32] shrink-0"
                              />
                            )}
                            <div>
                              <p className="font-bold text-white text-xs">{item.product_name}</p>
                              <p className="text-[10px] text-[#9A9AA3] font-mono-numbers">{item.product_slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-[#9A9AA3] text-xs">
                          {item.selected_variant || 'Standard'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-numbers text-xs text-[#C7CBD3]">
                          ₹{priceVal.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-center font-mono-numbers text-xs text-white">
                          ×{qtyVal}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-numbers text-xs font-bold text-white">
                          ₹{(priceVal * qtyVal).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing Totals */}
          <div className="bg-[#0A0A0D] border border-[#2A2A32] p-4 flex flex-col items-end space-y-1.5 font-mono-numbers">
            <div className="flex justify-between w-full sm:w-64 text-[#9A9AA3] text-xs">
              <span>Subtotal:</span>
              <span>₹{Number(order.subtotal || order.total || 0).toLocaleString('en-IN')}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between w-full sm:w-64 text-emerald-400 text-xs">
                <span>Discount ({order.coupon_code || 'PROMO'}):</span>
                <span>-₹{Number(order.discount).toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between w-full sm:w-64 text-[#9A9AA3] text-xs">
              <span>Shipping:</span>
              <span>{Number(order.shipping) > 0 ? `₹${Number(order.shipping)}` : 'FREE'}</span>
            </div>
            <div className="pt-2 border-t border-[#2A2A32] flex justify-between w-full sm:w-64 text-sm font-bold text-white">
              <span>Total Paid:</span>
              <span className="text-[#00D9FF]">₹{Number(order.total || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2A2A32] flex items-center justify-between shrink-0 bg-[#15151B]">
          <span className="text-[11px] text-[#9A9AA3]">
            Internal ID: <code className="text-[#00D9FF]">{order.id}</code>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#2A2A32] hover:border-white text-xs font-semibold text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
