import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, ArrowLeft, CheckCircle2, AlertCircle, Loader2, CreditCard, Smartphone, Building2, Wallet, Globe, MapPin, User, Mail, Lock, Phone, MessageSquare } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CustomerInfo, OrderStatus } from '../../types';
import { ScrollReveal } from '../common/ScrollReveal';
import { Magnetic } from '../common/Magnetic';
import { validateCartStock } from '../../services/inventoryService';
import { loadRazorpayScript } from '../../services/paymentService';
import { fetchUserAddresses, saveUserAddress, UserAddress } from '../../services/addressService';
import { AccountModal } from '../account/AccountModal';
import { buildWhatsAppOrderUrl } from '../../utils/whatsappOrder';

// Razorpay Standard Checkout. Every charge and order is verified server-side.
export const CheckoutView: React.FC = () => {
  const { items, subtotal, discount, shipping, total, clearCart, appliedCoupon } = useCart();
  const { navigateTo } = useNavigation();
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [saveAddressToAccount, setSaveAddressToAccount] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState<CustomerInfo>({
    email: '',
    phone: '',
    firstName: '',
    lastName: '',
    address: '',
    apartment: '',
    city: '',
    state: 'Maharashtra',
    pincode: '',
    country: 'India',
  });

  // Pre-fill user data & fetch saved addresses
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        email: prev.email || user.email || '',
        phone: prev.phone || profile?.phone || '',
        firstName: prev.firstName || profile?.full_name?.split(' ')[0] || '',
        lastName: prev.lastName || profile?.full_name?.split(' ').slice(1).join(' ') || '',
      }));

      fetchUserAddresses(user.id).then((addresses) => {
        setSavedAddresses(addresses);
        const defaultAddr = addresses.find((a) => a.is_default) || addresses[0];
        if (defaultAddr) {
          setFormData((prev) => ({
            ...prev,
            firstName: defaultAddr.full_name.split(' ')[0] || prev.firstName,
            lastName: defaultAddr.full_name.split(' ').slice(1).join(' ') || prev.lastName,
            phone: defaultAddr.phone || prev.phone,
            address: defaultAddr.street_address,
            apartment: defaultAddr.apartment || '',
            city: defaultAddr.city,
            state: defaultAddr.state,
            pincode: defaultAddr.postal_code,
            country: defaultAddr.country || 'India',
          }));
        }
      });
    }
  }, [user, profile]);

  const [deliveryMethod, setDeliveryMethod] = useState<'standard' | 'express'>('standard');
  const [orderState, setOrderState] = useState<OrderStatus>('Pending');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentFeedback, setPaymentFeedback] = useState('');
  const liveCheckoutEnabled = import.meta.env.VITE_RAZORPAY_LIVE_ENABLED === 'true';
  const checkoutKeyRef = useRef<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<{ number: string; total: number } | null>(null);

  // Delivery fee adjustments
  const finalShipping = deliveryMethod === 'express' ? shipping + 150 : shipping;
  const finalTotal = Math.max(0, subtotal - discount + finalShipping);

  // Form validation
  const validateForm = () => {
    const err: Record<string, string> = {};

    if (!formData.email.trim()) {
      err.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      err.email = 'Enter a valid email address';
    }

    if (!formData.phone.trim()) {
      err.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/[\s-]/g, ''))) {
      err.phone = 'Enter valid 10-digit phone number';
    }

    if (!formData.firstName.trim()) err.firstName = 'First name is required';
    if (!formData.lastName.trim()) err.lastName = 'Last name is required';
    if (!formData.address.trim()) err.address = 'Street address is required';
    if (!formData.city.trim()) err.city = 'City is required';
    if (!formData.pincode.trim()) {
      err.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(formData.pincode.replace(/\s/g, ''))) {
      err.pincode = 'Enter valid 6-digit postal code';
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleInputChange = (field: keyof CustomerInfo, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleProcessOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      window.scrollTo({ top: 150, behavior: 'smooth' });
      return;
    }
    if (!liveCheckoutEnabled) {
      showToast('Checkout not yet available', 'Secure payments have not been activated.', 'error');
      return;
    }

    setPaymentFeedback('');
    setOrderState('Processing');
    try {
      const stock = await validateCartStock(items);
      if (!stock.valid) throw new Error('A product is out of stock.');

      // Keep one idempotency key for retries so the server does not double-create orders.
      if (!checkoutKeyRef.current) checkoutKeyRef.current = crypto.randomUUID();

      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            // Backend's guest-order RPC matches public.products.slug (not the
            // frontend's local 'prod-...' identifier or the DB UUID).
            productId: item.product.slug,
            quantity: item.quantity,
            selectedVariant: item.selectedVariant || 'Standard',
          })),
          shippingAddress: formData,
          deliveryMethod,
          couponCode: appliedCoupon?.code || null,
          idempotencyKey: checkoutKeyRef.current,
        }),
      });
      const order = await response.json().catch(() => ({}));
      if (!response.ok || !order?.order_id || !order?.key_id ||
          !order?.guestAccessToken || !order?.orderNumber ||
          !Number.isSafeInteger(order?.amount) || order.amount < 100) {
        throw new Error(order?.error || 'Could not create your order');
      }
      if (!(await loadRazorpayScript()) || !(window as any).Razorpay) {
        throw new Error('Razorpay Checkout could not load.');
      }
      const Razorpay = (window as any).Razorpay;
      const checkout = new Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: 'NYXDRIP',
        description: 'Order ' + order.orderNumber,
        prefill: {
          name: [formData.firstName, formData.lastName].join(' '),
          email: formData.email,
          contact: formData.phone,
        },
        modal: {
          ondismiss: () => {
            setOrderState('Pending');
            showToast('Checkout closed', 'No new payment was confirmed.', 'info');
          },
        },
        handler: async (result: any) => {
          setOrderState('Processing');
          try {
            const verificationResponse = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: result.razorpay_order_id,
                razorpay_payment_id: result.razorpay_payment_id,
                razorpay_signature: result.razorpay_signature,
                guestAccessToken: order.guestAccessToken,
              }),
            });
            const verified = await verificationResponse.json().catch(() => ({}));
            if (!verificationResponse.ok || verified?.success !== true ||
                verified?.paymentStatus !== 'paid' || verified?.orderNumber !== order.orderNumber) {
              throw new Error(verified?.error || 'Could not confirm payment in the order database');
            }
            setConfirmedOrder({ number: verified.orderNumber, total: order.amount / 100 });
            setPaymentFeedback('Payment captured, verified and recorded as order ' + verified.orderNumber);
            checkoutKeyRef.current = null;
            clearCart();
            setOrderState('Paid');
            showToast('Payment confirmed', 'Order ' + verified.orderNumber + ' has been recorded.', 'success');
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Verification incomplete';
            setOrderState('Pending');
            setPaymentFeedback('Your payment may have been captured. Do NOT retry until support checks Razorpay and your order. ' + message);
            showToast('Payment needs verification', 'Do not pay again. Contact support with your Razorpay payment ID.', 'error');
          }
        },
      });
      checkout.on('payment.failed', () => {
        setOrderState('Pending');
        showToast('Payment failed', 'No payment was confirmed. You can try again.', 'error');
      });
      setOrderState('Pending');
      checkout.open();
    } catch (error) {
      setOrderState('Pending');
      showToast('Checkout unavailable', error instanceof Error ? error.message : 'Please try again later', 'error');
    }
  };

  if (orderState === 'Paid' && confirmedOrder) {
    return (
      <div className="min-h-screen bg-[#0A0A0D] text-[#F5F5F7] py-24 text-center">
        <div className="max-w-lg mx-auto px-6 border border-[#8B5CF6] bg-[#15151B] p-8 space-y-4">
          <CheckCircle2 size={44} className="mx-auto text-[#00D9FF]" />
          <h1 className="font-display text-2xl font-bold uppercase">Payment Verified</h1>
          <p className="text-sm text-[#C7CBD3]">Your payment was captured and your NYXDRIP order was recorded securely.</p>
          <p className="font-mono-numbers text-xl font-bold">{confirmedOrder.number}</p>
          <p className="text-sm">Paid: ₹{confirmedOrder.total.toLocaleString('en-IN')}</p>
          <p className="text-xs text-[#9A9AA3]">Save this order number for support and shipping enquiries.</p>
          <button onClick={() => navigateTo('shop')} className="px-6 py-3 bg-[#8B5CF6] text-white text-xs font-bold uppercase">Continue Shopping</button>
        </div>
      </div>
    );
  }

  if (items.length === 0 && orderState === 'Pending') {
    return (
      <div className="min-h-screen bg-[#0A0A0D] text-[#F5F5F7] py-24 text-center">
        <div className="max-w-md mx-auto px-4 border border-[#2A2A32] bg-[#15151B] p-8">
          <h2 className="font-display text-xl font-bold">Your bag is empty</h2>
          <p className="text-xs text-[#9A9AA3] mt-2">
            Please add items to your bag before proceeding to checkout.
          </p>
          <button
            onClick={() => navigateTo('shop')}
            className="mt-6 px-6 py-2.5 bg-[#8B5CF6] text-white text-xs font-bold uppercase tracking-wider"
          >
            Explore Catalog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0D] text-[#F5F5F7] py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <ScrollReveal animation="fade-up">
          <div className="pb-8 border-b border-[#2A2A32] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigateTo('cart')}
                className="p-1 text-[#9A9AA3] hover:text-[#F5F5F7] transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <span className="text-xs uppercase tracking-widest text-[#8B5CF6] font-semibold">
                  SECURE TRANSACTION
                </span>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold uppercase mt-0.5">
                  CHECKOUT
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#00D9FF]">
              <ShieldCheck size={16} />
              <span className="hidden sm:inline font-semibold">256-Bit SSL Encrypted</span>
            </div>
          </div>
        </ScrollReveal>

        {/* Processing State Modal / Overlay */}
        {orderState === 'Processing' && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
            <Loader2 size={44} className="text-[#8B5CF6] animate-spin mb-4" />
            <h3 className="font-display text-lg font-bold text-[#F5F5F7]">
              CONNECTING TO SECURE PAYMENT GATEWAY
            </h3>
            <p className="text-xs text-[#9A9AA3] mt-2 max-w-sm text-center">
              Encrypting transaction payload and reserving inventory vault items... Please do not refresh.
            </p>
            <div className="mt-6 flex items-center gap-2 text-[11px] text-[#C7CBD3] font-mono-numbers">
              <span className="w-2 h-2 rounded-full bg-[#00D9FF] animate-ping" />
              <span>Status: StateMachine.TRANSITION_TO_PROCESSING</span>
            </div>
          </div>
        )}


        <form onSubmit={handleProcessOrder} className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Form Column */}
          <div className="lg:col-span-7 space-y-8">
            {/* Section 1: Contact Information */}
            <div className="p-6 bg-[#15151B] border border-[#2A2A32] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#2A2A32] flex-wrap gap-2">
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#F5F5F7]">
                  1. Contact Information
                </h3>
                {!user ? (
                  <button
                    type="button"
                    onClick={() => setAuthModalOpen(true)}
                    className="text-xs text-[#00D9FF] hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>Already an operative? Sign In</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-[#8B5CF6] font-semibold">
                    ✓ Authenticated: {profile?.full_name || user.email}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full bg-[#0A0A0D] border border-[#2A2A32] px-3.5 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/50 focus:outline-none focus:border-[#8B5CF6]"
                  />
                  {errors.email && <p className="text-[10px] text-red-400 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                    Phone (10-Digit) *
                  </label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full bg-[#0A0A0D] border border-[#2A2A32] px-3.5 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/50 focus:outline-none focus:border-[#8B5CF6]"
                  />
                  {errors.phone && <p className="text-[10px] text-red-400 mt-1">{errors.phone}</p>}
                </div>
              </div>
            </div>

            {/* Section 2: Shipping Address */}
            <div className="p-6 bg-[#15151B] border border-[#2A2A32] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#2A2A32]">
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#F5F5F7]">
                  2. Shipping Address
                </h3>
                <span className="text-[11px] text-[#9A9AA3]">Pan-India Delivery</span>
              </div>

              {/* Saved Addresses quick-select for logged-in users */}
              {user && savedAddresses.length > 0 && (
                <div className="pb-3 border-b border-[#2A2A32] space-y-2">
                  <span className="text-[11px] font-semibold text-[#8B5CF6] uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin size={13} />
                    <span>Saved Cloud Addresses</span>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {savedAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            firstName: addr.full_name.split(' ')[0] || prev.firstName,
                            lastName: addr.full_name.split(' ').slice(1).join(' ') || prev.lastName,
                            phone: addr.phone || prev.phone,
                            address: addr.street_address,
                            apartment: addr.apartment || '',
                            city: addr.city,
                            state: addr.state,
                            pincode: addr.postal_code,
                            country: addr.country || 'India',
                          }));
                        }}
                        className={`px-3 py-1.5 text-[11px] border transition-colors text-left ${
                          formData.address === addr.street_address
                            ? 'border-[#8B5CF6] bg-[#8B5CF6]/15 text-white'
                            : 'border-[#2A2A32] bg-[#0A0A0D] text-[#9A9AA3] hover:border-[#C7CBD3]'
                        }`}
                      >
                        <span className="font-semibold text-[#F5F5F7] block">{addr.full_name}</span>
                        <span className="text-[10px] text-[#9A9AA3] truncate max-w-[200px] block">{addr.street_address}, {addr.city}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Alex"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="w-full bg-[#0A0A0D] border border-[#2A2A32] px-3.5 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/50 focus:outline-none focus:border-[#8B5CF6]"
                  />
                  {errors.firstName && <p className="text-[10px] text-red-400 mt-1">{errors.firstName}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mercer"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="w-full bg-[#0A0A0D] border border-[#2A2A32] px-3.5 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/50 focus:outline-none focus:border-[#8B5CF6]"
                  />
                  {errors.lastName && <p className="text-[10px] text-red-400 mt-1">{errors.lastName}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                    Street Address & Building *
                  </label>
                  <input
                    type="text"
                    placeholder="Flat / House No., Street, Landmark"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full bg-[#0A0A0D] border border-[#2A2A32] px-3.5 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/50 focus:outline-none focus:border-[#8B5CF6]"
                  />
                  {errors.address && <p className="text-[10px] text-red-400 mt-1">{errors.address}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="w-full bg-[#0A0A0D] border border-[#2A2A32] px-3.5 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/50 focus:outline-none focus:border-[#8B5CF6]"
                  />
                  {errors.city && <p className="text-[10px] text-red-400 mt-1">{errors.city}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                    Pincode (6-Digit) *
                  </label>
                  <input
                    type="text"
                    placeholder="400001"
                    maxLength={6}
                    value={formData.pincode}
                    onChange={(e) => handleInputChange('pincode', e.target.value)}
                    className="w-full bg-[#0A0A0D] border border-[#2A2A32] px-3.5 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/50 focus:outline-none focus:border-[#8B5CF6]"
                  />
                  {errors.pincode && <p className="text-[10px] text-red-400 mt-1">{errors.pincode}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                    State
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className="w-full bg-[#0A0A0D] border border-[#2A2A32] px-3.5 py-2.5 text-xs text-[#F5F5F7] focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Delhi">Delhi NCR</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Telangana">Telangana</option>
                    <option value="West Bengal">West Bengal</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Other">Other States</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="India"
                    className="w-full bg-[#0A0A0D]/60 border border-[#2A2A32] px-3.5 py-2.5 text-xs text-[#9A9AA3] cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Save Address Checkbox for Authenticated Users */}
              {user && (
                <div className="pt-2 flex items-center gap-2 border-t border-[#2A2A32]/60">
                  <input
                    type="checkbox"
                    id="saveAddressCheck"
                    checked={saveAddressToAccount}
                    onChange={(e) => setSaveAddressToAccount(e.target.checked)}
                    className="accent-[#8B5CF6] w-4 h-4 bg-[#0A0A0D] border-[#2A2A32] rounded cursor-pointer"
                  />
                  <label htmlFor="saveAddressCheck" className="text-xs text-[#9A9AA3] cursor-pointer hover:text-[#F5F5F7]">
                    Save this address to my encrypted cloud profile
                  </label>
                </div>
              )}
            </div>

            {/* Section 3: Delivery Method */}
            <div className="p-6 bg-[#15151B] border border-[#2A2A32] space-y-4">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#F5F5F7] pb-3 border-b border-[#2A2A32]">
                3. Delivery Method
              </h3>

              <div>
                <div className="p-4 border bg-[#0A0A0D] border-[#8B5CF6] flex flex-col justify-between transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-[#F5F5F7]">
                      Standard Ground Tracked
                    </span>
                    <span className="font-mono-numbers text-xs font-bold text-[#00D9FF]">
                      {shipping === 0 ? 'FREE' : `₹${shipping}`}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9A9AA3] mt-2">
                    Delivered in 3–5 business days across Indian metros. Full live tracking link.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 4: Payment Method UI */}
            <div className="p-6 bg-[#15151B] border border-[#2A2A32] space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#2A2A32]">
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#F5F5F7]">
                  4. Payment Method
                </h3>
                <span className="text-[11px] text-[#9A9AA3]">Zero Gateway Convenience Fee</span>
              </div>

              <div className="border border-[#8B5CF6]/30 bg-[#0A0A0D] p-4 space-y-3 text-xs text-[#C7CBD3]">
                <p className="font-bold text-white uppercase tracking-wider">Secure Razorpay Checkout</p>
                <p>UPI, cards, and supported methods open inside the official Razorpay checkout. Card details are never entered on this website.</p>
                {!liveCheckoutEnabled && <p className="text-amber-300">Checkout is not activated. Payments cannot be placed yet.</p>}
                <p className="text-[#9A9AA3]">The final amount is calculated by our server from current product prices, shipping and valid coupons.</p>
                {paymentFeedback && <p role="status" className="text-amber-200">{paymentFeedback}</p>}
              </div>
            </div>
          </div>

          {/* Right Summary Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 bg-[#15151B] border border-[#2A2A32] sticky top-28 space-y-6">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#F5F5F7] pb-3 border-b border-[#2A2A32]">
                Order Breakdown ({items.length} items)
              </h3>

              {/* Mini Item List */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={`${item.product.id}-${item.selectedVariant}`} className="flex items-center gap-3 text-xs">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-14 object-cover bg-[#0A0A0D] border border-[#2A2A32]"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-[#F5F5F7] line-clamp-1">
                        {item.product.name}
                        {(item.product.pieceUnit || item.product.slug === 'royal-fleur-studs') && (
                          <span className="text-[10px] text-[#8B5CF6] font-bold uppercase tracking-wider ml-1">
                            ({item.product.pieceUnit || '1 PC'})
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-[#9A9AA3]">Qty: {item.quantity} · {item.selectedVariant}</p>
                    </div>
                    <span className="font-mono-numbers font-medium text-[#F5F5F7]">
                      ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Calculation Breakdown */}
              <div className="space-y-2 text-xs border-t border-[#2A2A32] pt-4">
                <div className="flex justify-between text-[#9A9AA3]">
                  <span>Subtotal</span>
                  <span className="font-mono-numbers text-[#F5F5F7]">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-[#00D9FF]">
                    <span>Coupon Discount</span>
                    <span className="font-mono-numbers">-₹{discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#9A9AA3]">
                  <span>Shipping</span>
                  <span className="font-mono-numbers text-[#F5F5F7]">
                    {finalShipping === 0 ? 'FREE' : `₹${finalShipping.toLocaleString('en-IN')}`}
                  </span>
                </div>
                <div className="pt-3 border-t border-[#2A2A32] flex justify-between font-bold text-base text-[#F5F5F7]">
                  <span>Total Amount</span>
                  <span className="font-mono-numbers text-xl">₹{finalTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Place Order CTA */}
              <div className="space-y-2">
                <Magnetic strength={10} className="w-full">
                  <button
                    type="submit"
                    disabled={orderState === 'Processing' || !liveCheckoutEnabled}
                    className="w-full py-4 bg-[#8B5CF6] hover:bg-[#7c4def] disabled:opacity-50 text-white text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 shadow-2xl transition-all active:scale-95"
                  >
                    <span>{liveCheckoutEnabled ? 'Pay Securely with Razorpay' : 'Online Checkout Coming Soon'}</span>
                  </button>
                </Magnetic>

                <a
                  href={buildWhatsAppOrderUrl({
                    items,
                    subtotal,
                    discount,
                    shipping: finalShipping,
                    total: finalTotal,
                    couponCode: appliedCoupon?.code,
                    customer: formData,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-[#15151B] hover:bg-[#1f1f27] border border-[#2A2A32] hover:border-[#00D9FF] text-[#F5F5F7] text-[11px] font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <MessageSquare size={13} className="text-[#00D9FF]" />
                  <span>Send Order Inquiry to WhatsApp</span>
                </a>
              </div>

              <div className="space-y-1 text-center">
                <p className="text-[11px] text-[#9A9AA3]">
                  Razorpay hosted checkout · Server-verified payments
                </p>
                <p className="text-[10px] text-[#9A9AA3]/60">
                  The final payable amount is confirmed by the server before payment.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>

      <AccountModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
};
