import React, { useState, useEffect } from 'react';
import { CheckCircle2, Package, Truck, ArrowRight, Copy, Check } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { Order } from '../../types';
import { ScrollReveal } from '../common/ScrollReveal';
import { Magnetic } from '../common/Magnetic';

export const OrderConfirmationView: React.FC = () => {
  const { params, navigateTo } = useNavigation();
  const [order, setOrder] = useState<Order | null>(null);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const orderId = params.orderId || localStorage.getItem('latest_order_id');
    if (orderId) {
      const stored = localStorage.getItem(`order_${orderId}`);
      if (stored) {
        try {
          setOrder(JSON.parse(stored));
        } catch {
          // ignore
        }
      }
    }
  }, [params.orderId]);

  const copyOrderId = () => {
    if (order?.orderId) {
      navigator.clipboard.writeText(order.orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0D] text-[#F5F5F7] py-16 sm:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Confirmation Header */}
        <ScrollReveal animation="fade-up">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/40 flex items-center justify-center text-[#8B5CF6] animate-bounce">
              <CheckCircle2 size={32} />
            </div>

            <span className="text-xs uppercase tracking-[0.3em] text-[#00D9FF] font-semibold">
              TRANSACTION AUTHORIZED & VAULT PACKED
            </span>

            <h1 className="font-display text-3xl sm:text-5xl font-black uppercase text-[#F5F5F7]">
              ORDER CONFIRMED
            </h1>

            <p className="text-xs sm:text-sm text-[#9A9AA3] max-w-lg mx-auto leading-relaxed">
              Your hardware order has been successfully queued for prioritized dispatch. A confirmation dispatch receipt has been dispatched to {order?.customer.email || 'your email'}.
            </p>
          </div>
        </ScrollReveal>

        {/* Order Details Card */}
        <ScrollReveal animation="scale-in" delay={150}>
          <div className="mt-12 bg-[#15151B] border border-[#2A2A32] divide-y divide-[#2A2A32] shadow-2xl">
          {/* Top Metadata Bar */}
          <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#101015]">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#9A9AA3]">ORDER IDENTIFIER</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono-numbers text-lg sm:text-xl font-bold text-[#F5F5F7]">
                  {order?.orderId || 'NYX-9941X-ARCHIVE'}
                </span>
                <button
                  type="button"
                  onClick={copyOrderId}
                  className="p-1 text-[#9A9AA3] hover:text-white"
                  title="Copy order ID"
                >
                  {copied ? <Check size={14} className="text-[#00D9FF]" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Magnetic strength={10}>
                <button
                  type="button"
                  onClick={() => setTrackingModalOpen(true)}
                  className="px-5 py-2.5 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-lg"
                >
                  <Truck size={14} />
                  <span>Track Order</span>
                </button>
              </Magnetic>
            </div>
          </div>

          {/* Purchased Items List */}
          <div className="p-6 sm:p-8 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#9A9AA3]">
              PURCHASED PIECES
            </h3>
            <div className="divide-y divide-[#2A2A32]/60">
              {order?.items.map((item, idx) => (
                <div key={idx} className="py-4 first:pt-0 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      referrerPolicy="no-referrer"
                      className="w-14 h-16 object-cover bg-[#0A0A0D] border border-[#2A2A32]"
                    />
                    <div>
                      <p className="text-xs uppercase text-[#9A9AA3]">{item.product.category}</p>
                      <h4 className="text-sm font-semibold text-[#F5F5F7]">{item.product.name}</h4>
                      <p className="text-[11px] text-[#9A9AA3]">
                        Qty: {item.quantity} · {item.selectedVariant}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono-numbers text-sm font-bold text-[#F5F5F7]">
                    ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping & Payment Information Grid */}
          <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-[#9A9AA3]">
            <div>
              <p className="font-bold uppercase tracking-wider text-[#F5F5F7] mb-2">Shipping To</p>
              <p className="text-[#F5F5F7] font-medium">
                {order?.customer.firstName} {order?.customer.lastName}
              </p>
              <p className="mt-1">{order?.customer.address}</p>
              <p>
                {order?.customer.city}, {order?.customer.state} - {order?.customer.pincode}
              </p>
              <p className="mt-1">Ph: {order?.customer.phone}</p>
            </div>

            <div>
              <p className="font-bold uppercase tracking-wider text-[#F5F5F7] mb-2">Delivery & Status</p>
              <p className="text-[#00D9FF] font-semibold">
                Estimated: {order?.estimatedDelivery || 'In 3-4 Business Days'}
              </p>
              <p className="mt-1">
                Method: {order?.deliveryMethod === 'express' ? 'Priority Air' : 'Standard Ground'}
              </p>
              <p className="mt-1 font-mono-numbers">Payment Status: {order?.status || 'Paid'}</p>
            </div>

            <div>
              <p className="font-bold uppercase tracking-wider text-[#F5F5F7] mb-2">Payment Summary</p>
              <p className="capitalize">Channel: {order?.paymentMethod.toUpperCase()}</p>
              <p className="mt-1">Subtotal: ₹{order?.subtotal.toLocaleString('en-IN')}</p>
              {order?.discount && order.discount > 0 ? (
                <p className="text-[#00D9FF]">Discount: -₹{order.discount.toLocaleString('en-IN')}</p>
              ) : null}
              <p className="mt-1 font-bold text-sm text-[#F5F5F7] font-mono-numbers">
                Total Paid: ₹{order?.total.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Action button */}
      <div className="mt-8 text-center flex justify-center">
        <Magnetic strength={12}>
          <button
            type="button"
            onClick={() => navigateTo('shop')}
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#15151B] border border-[#2A2A32] hover:border-[#8B5CF6] text-white text-xs font-bold uppercase tracking-widest transition-all active:scale-95 shadow-md"
          >
            <span>Continue Shopping</span>
            <ArrowRight size={14} />
          </button>
        </Magnetic>
      </div>
      </div>

      {/* Interactive Track Order Simulation Dialog */}
      {trackingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => setTrackingModalOpen(false)}
          />
          <div className="relative bg-[#15151B] border border-[#2A2A32] max-w-lg w-full p-6 shadow-2xl z-10 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#2A2A32]">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#00D9FF]">Real-Time Logistics</span>
                <h3 className="font-display text-base font-bold text-[#F5F5F7]">
                  VAULT SHIPMENT TRACKER
                </h3>
              </div>
              <button
                onClick={() => setTrackingModalOpen(false)}
                className="text-[#9A9AA3] hover:text-[#F5F5F7] text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Stepper */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center text-xs shrink-0 font-bold">
                  ✓
                </div>
                <div>
                  <p className="text-xs font-bold text-[#F5F5F7]">Order Confirmed & Payment Verified</p>
                  <p className="text-[11px] text-[#9A9AA3]">Today · Cryptographically signed into ledger</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center text-xs shrink-0 font-bold">
                  ✓
                </div>
                <div>
                  <p className="text-xs font-bold text-[#F5F5F7]">Vault Allocation & Microfiber Inspection</p>
                  <p className="text-[11px] text-[#9A9AA3]">In Progress · Cleanroom ultrasonic polish</p>
                </div>
              </div>

              <div className="flex items-start gap-4 opacity-50">
                <div className="w-6 h-6 rounded-full border border-[#2A2A32] text-[#9A9AA3] flex items-center justify-center text-xs shrink-0 font-bold">
                  3
                </div>
                <div>
                  <p className="text-xs font-bold text-[#F5F5F7]">Dispatched via Priority Air Vault</p>
                  <p className="text-[11px] text-[#9A9AA3]">Scheduled within 24 hours</p>
                </div>
              </div>

              <div className="flex items-start gap-4 opacity-40">
                <div className="w-6 h-6 rounded-full border border-[#2A2A32] text-[#9A9AA3] flex items-center justify-center text-xs shrink-0 font-bold">
                  4
                </div>
                <div>
                  <p className="text-xs font-bold text-[#F5F5F7]">Out For Doorstep Delivery</p>
                  <p className="text-[11px] text-[#9A9AA3]">Estimated: {order?.estimatedDelivery}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#2A2A32] flex justify-end">
              <button
                type="button"
                onClick={() => setTrackingModalOpen(false)}
                className="px-5 py-2 bg-[#2A2A32] hover:bg-[#8B5CF6] text-white text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Close Tracking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
