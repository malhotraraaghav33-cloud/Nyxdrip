import React from 'react';
import { X, User, ShoppingBag, Mail, Phone, Calendar, ArrowRight } from 'lucide-react';

interface CustomerDetailModalProps {
  customer: any | null;
  isOpen: boolean;
  onClose: () => void;
  onViewOrder: (order: any) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  isOpen,
  onClose,
  onViewOrder,
}) => {
  if (!isOpen || !customer) return null;

  const orders = Array.isArray(customer.orders) ? customer.orders : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#15151B] border border-[#2A2A32] shadow-2xl my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2A2A32] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1B1B22] border border-[#8B5CF6]/40 flex items-center justify-center text-[#8B5CF6]">
              <User size={18} />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#8B5CF6] font-semibold">
                OPERATIVE DOSSIER
              </span>
              <h2 className="font-display text-base sm:text-lg font-bold text-white">
                {customer.name || customer.email?.split('@')[0]}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#9A9AA3] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 bg-[#0A0A0D] border border-[#2A2A32] text-center">
              <span className="text-[10px] uppercase text-[#9A9AA3] tracking-wider block">Total Orders</span>
              <span className="font-mono-numbers text-lg font-bold text-white mt-0.5 block">
                {customer.orderCount || orders.length}
              </span>
            </div>
            <div className="p-3.5 bg-[#0A0A0D] border border-[#2A2A32] text-center">
              <span className="text-[10px] uppercase text-[#9A9AA3] tracking-wider block">Total Spent</span>
              <span className="font-mono-numbers text-lg font-bold text-[#00D9FF] mt-0.5 block">
                ₹{Number(customer.totalSpent || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="p-3.5 bg-[#0A0A0D] border border-[#2A2A32] text-center">
              <span className="text-[10px] uppercase text-[#9A9AA3] tracking-wider block">Role</span>
              <span className="font-mono-numbers text-xs font-bold uppercase text-[#8B5CF6] mt-1.5 block">
                {customer.role || 'Customer'}
              </span>
            </div>
          </div>

          {/* Contact Details */}
          <div className="p-4 bg-[#0A0A0D] border border-[#2A2A32] space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-[#9A9AA3] font-semibold">Contact Records</p>
            <p className="text-[#F5F5F7] flex items-center gap-2">
              <Mail size={13} className="text-[#9A9AA3]" />
              <a href={`mailto:${customer.email}`} className="hover:underline">{customer.email}</a>
            </p>
            {customer.phone && (
              <p className="text-[#F5F5F7] flex items-center gap-2 font-mono-numbers">
                <Phone size={13} className="text-[#9A9AA3]" />
                <a href={`tel:${customer.phone}`} className="hover:underline">{customer.phone}</a>
              </p>
            )}
            {customer.createdAt && (
              <p className="text-[#9A9AA3] flex items-center gap-2 font-mono-numbers text-[11px]">
                <Calendar size={13} className="text-[#9A9AA3]" />
                <span>Registered: {new Date(customer.createdAt).toLocaleDateString('en-IN')}</span>
              </p>
            )}
          </div>

          {/* Past Orders */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#9A9AA3] font-semibold mb-3 flex items-center justify-between">
              <span>Order History</span>
              <span className="font-mono-numbers">{orders.length} Records</span>
            </p>

            {orders.length === 0 ? (
              <div className="p-8 text-center bg-[#0A0A0D] border border-[#2A2A32] text-[#9A9AA3]">
                <ShoppingBag size={24} className="mx-auto mb-2 opacity-50" />
                <p>No orders logged for this operative yet.</p>
              </div>
            ) : (
              <div className="border border-[#2A2A32] divide-y divide-[#2A2A32]/60 overflow-hidden">
                {orders.map((ord: any) => (
                  <div
                    key={ord.id}
                    onClick={() => {
                      onViewOrder(ord);
                      onClose();
                    }}
                    className="p-3.5 bg-[#0A0A0D] hover:bg-[#15151B] transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-numbers font-bold text-white text-xs">
                          #{ord.order_number}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                          ord.payment_status === 'Paid'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                            : 'bg-amber-950/60 text-amber-400 border border-amber-800'
                        }`}>
                          {ord.payment_status}
                        </span>
                        <span className="text-[10px] text-[#9A9AA3]">
                          ({ord.order_status})
                        </span>
                      </div>
                      <p className="text-[10px] text-[#9A9AA3] mt-1 font-mono-numbers">
                        {new Date(ord.created_at).toLocaleDateString('en-IN')}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono-numbers text-xs font-bold text-[#00D9FF]">
                        ₹{Number(ord.total || 0).toLocaleString('en-IN')}
                      </span>
                      <ArrowRight size={14} className="text-[#9A9AA3]" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2A2A32] flex items-center justify-end shrink-0 bg-[#15151B]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#2A2A32] text-xs font-semibold text-white hover:border-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
