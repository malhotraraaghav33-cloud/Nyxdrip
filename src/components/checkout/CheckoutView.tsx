import React, { useState } from 'react';
import { ShieldCheck, ArrowLeft, CheckCircle2, AlertCircle, Loader2, CreditCard, Smartphone, Building2, Wallet, Globe } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useNavigation } from '../../context/NavigationContext';
import { CustomerInfo, Order, OrderStatus } from '../../types';
import { ScrollReveal } from '../common/ScrollReveal';
import { Magnetic } from '../common/Magnetic';

// ============================================================================
// PAYMENT INTEGRATION INTERFACE CONTRACT
// Note for production deployment:
// TODO: Connect to Razorpay India via process.env.VITE_RAZORPAY_KEY_ID
// TODO: Connect to Cashfree India via process.env.VITE_CASHFREE_APP_ID
// TODO: Connect to PayPal International via process.env.VITE_PAYPAL_CLIENT_ID
// ============================================================================

export const CheckoutView: React.FC = () => {
  const { items, subtotal, discount, shipping, total, clearCart } = useCart();
  const { navigateTo } = useNavigation();

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

  const [deliveryMethod, setDeliveryMethod] = useState<'standard' | 'express'>('standard');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking' | 'wallets' | 'paypal'>('upi');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Order & Processing State Machine: 'Pending' | 'Processing' | 'Paid' | 'Failed' | 'Cancelled'
  const [orderState, setOrderState] = useState<OrderStatus>('Pending');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [simulateFailure, setSimulateFailure] = useState(false);

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

    if (paymentMethod === 'upi' && !upiId.trim()) {
      err.upi = 'Enter your VPA / UPI ID (e.g. name@okhdfcbank)';
    }

    if (paymentMethod === 'card') {
      if (!cardNumber.replace(/\s/g, '')) err.card = 'Card number is required';
      if (!cardExpiry) err.expiry = 'MM/YY required';
      if (!cardCvv) err.cvv = 'CVV required';
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

    // Begin State Machine transition: Pending -> Processing
    setOrderState('Processing');

    // Simulate real gateway handshake (Razorpay / Cashfree / PayPal)
    setTimeout(() => {
      if (simulateFailure) {
        setOrderState('Failed');
        return;
      }

      // Success branch: Processing -> Paid
      setOrderState('Paid');

      const generatedOrderId = `NYX-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const completedOrder: Order = {
        orderId: generatedOrderId,
        items: [...items],
        subtotal,
        discount,
        shipping: finalShipping,
        total: finalTotal,
        customer: formData,
        deliveryMethod,
        paymentMethod,
        status: 'Paid',
        createdAt: new Date().toISOString(),
        estimatedDelivery: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        }),
      };

      try {
        localStorage.setItem(`order_${generatedOrderId}`, JSON.stringify(completedOrder));
        localStorage.setItem('latest_order_id', generatedOrderId);
      } catch {
        // storage fallback
      }

      clearCart();

      setTimeout(() => {
        navigateTo('order-confirmation', { orderId: generatedOrderId });
      }, 1000);
    }, 2200);
  };

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

        {/* Failed State Alert Modal */}
        {orderState === 'Failed' && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#15151B] border border-red-500/40 p-6 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                <AlertCircle size={24} />
              </div>
              <h3 className="font-display text-lg font-bold text-red-400">
                TRANSACTION FAILED OR DECLINED
              </h3>
              <p className="text-xs text-[#9A9AA3] leading-relaxed">
                The simulated bank or card issuer declined authorization. You can retry with another method or disable simulation.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSimulateFailure(false);
                    setOrderState('Pending');
                  }}
                  className="flex-1 py-2.5 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-wider"
                >
                  Retry Payment
                </button>
                <button
                  type="button"
                  onClick={() => setOrderState('Pending')}
                  className="px-4 py-2.5 border border-[#2A2A32] text-xs text-[#9A9AA3] hover:text-[#F5F5F7]"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleProcessOrder} className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Form Column */}
          <div className="lg:col-span-7 space-y-8">
            {/* Section 1: Contact Information */}
            <div className="p-6 bg-[#15151B] border border-[#2A2A32] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#2A2A32]">
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#F5F5F7]">
                  1. Contact Information
                </h3>
                <span className="text-[11px] text-[#9A9AA3]">Required for order tracking</span>
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
            </div>

            {/* Section 3: Delivery Method */}
            <div className="p-6 bg-[#15151B] border border-[#2A2A32] space-y-4">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#F5F5F7] pb-3 border-b border-[#2A2A32]">
                3. Delivery Method
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label
                  onClick={() => setDeliveryMethod('standard')}
                  className={`p-4 border cursor-pointer flex flex-col justify-between transition-all ${
                    deliveryMethod === 'standard'
                      ? 'bg-[#0A0A0D] border-[#8B5CF6]'
                      : 'bg-[#15151B] border-[#2A2A32] hover:border-[#C7CBD3]/40'
                  }`}
                >
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
                </label>

                <label
                  onClick={() => setDeliveryMethod('express')}
                  className={`p-4 border cursor-pointer flex flex-col justify-between transition-all ${
                    deliveryMethod === 'express'
                      ? 'bg-[#0A0A0D] border-[#8B5CF6]'
                      : 'bg-[#15151B] border-[#2A2A32] hover:border-[#C7CBD3]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-[#F5F5F7]">
                      Priority Air Courier
                    </span>
                    <span className="font-mono-numbers text-xs font-bold text-[#F5F5F7]">
                      ₹{shipping + 150}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9A9AA3] mt-2">
                    Delivered in 24–48 hours via Bluedart Air priority vault dispatch.
                  </p>
                </label>
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

              {/* Payment Selectors */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`p-3 border text-center flex flex-col items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'upi'
                      ? 'border-[#8B5CF6] bg-[#0A0A0D] text-white'
                      : 'border-[#2A2A32] bg-[#15151B] text-[#9A9AA3] hover:text-[#F5F5F7]'
                  }`}
                >
                  <Smartphone size={18} className="text-[#00D9FF]" />
                  <span className="text-[11px] font-bold">UPI / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 border text-center flex flex-col items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'card'
                      ? 'border-[#8B5CF6] bg-[#0A0A0D] text-white'
                      : 'border-[#2A2A32] bg-[#15151B] text-[#9A9AA3] hover:text-[#F5F5F7]'
                  }`}
                >
                  <CreditCard size={18} className="text-[#8B5CF6]" />
                  <span className="text-[11px] font-bold">Cards</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('netbanking')}
                  className={`p-3 border text-center flex flex-col items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'netbanking'
                      ? 'border-[#8B5CF6] bg-[#0A0A0D] text-white'
                      : 'border-[#2A2A32] bg-[#15151B] text-[#9A9AA3] hover:text-[#F5F5F7]'
                  }`}
                >
                  <Building2 size={18} className="text-[#C7CBD3]" />
                  <span className="text-[11px] font-bold">Net Banking</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('wallets')}
                  className={`p-3 border text-center flex flex-col items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'wallets'
                      ? 'border-[#8B5CF6] bg-[#0A0A0D] text-white'
                      : 'border-[#2A2A32] bg-[#15151B] text-[#9A9AA3] hover:text-[#F5F5F7]'
                  }`}
                >
                  <Wallet size={18} className="text-[#00D9FF]" />
                  <span className="text-[11px] font-bold">Wallets</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('paypal')}
                  className={`p-3 border text-center flex flex-col items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'paypal'
                      ? 'border-[#8B5CF6] bg-[#0A0A0D] text-white'
                      : 'border-[#2A2A32] bg-[#15151B] text-[#9A9AA3] hover:text-[#F5F5F7]'
                  }`}
                >
                  <Globe size={18} className="text-[#8B5CF6]" />
                  <span className="text-[11px] font-bold">PayPal</span>
                </button>
              </div>

              {/* Dynamic Sub-Payment Inputs */}
              <div className="p-4 bg-[#0A0A0D] border border-[#2A2A32] text-xs">
                {paymentMethod === 'upi' && (
                  <div className="space-y-3">
                    <p className="text-[#9A9AA3]">
                      Pay instantly via Google Pay, PhonePe, Paytm, CRED, or enter your VPA handle:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="yourname@okhdfcbank"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="flex-1 bg-[#15151B] border border-[#2A2A32] px-3.5 py-2 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/50 focus:outline-none focus:border-[#8B5CF6]"
                      />
                      <button
                        type="button"
                        onClick={() => setUpiId('nyxoperator@okaxis')}
                        className="px-3 py-2 bg-[#2A2A32] text-[10px] font-bold uppercase text-[#C7CBD3] hover:text-white"
                      >
                        Sample UPI
                      </button>
                    </div>
                    {errors.upi && <p className="text-[10px] text-red-400">{errors.upi}</p>}
                    <p className="text-[11px] text-[#9A9AA3]">
                      // Integration point: Razorpay UPI Intent & QR trigger
                    </p>
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] uppercase text-[#9A9AA3] mb-1">
                        Card Number
                      </label>
                      <input
                        type="text"
                        placeholder="4242 ···· ···· 4242"
                        maxLength={19}
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full bg-[#15151B] border border-[#2A2A32] px-3.5 py-2 text-xs font-mono-numbers text-[#F5F5F7]"
                      />
                      {errors.card && <p className="text-[10px] text-red-400 mt-1">{errors.card}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase text-[#9A9AA3] mb-1">
                          Expiry (MM/YY)
                        </label>
                        <input
                          type="text"
                          placeholder="12/28"
                          maxLength={5}
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full bg-[#15151B] border border-[#2A2A32] px-3.5 py-2 text-xs font-mono-numbers text-[#F5F5F7]"
                        />
                        {errors.expiry && <p className="text-[10px] text-red-400 mt-1">{errors.expiry}</p>}
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-[#9A9AA3] mb-1">
                          CVV
                        </label>
                        <input
                          type="password"
                          placeholder="•••"
                          maxLength={4}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="w-full bg-[#15151B] border border-[#2A2A32] px-3.5 py-2 text-xs font-mono-numbers text-[#F5F5F7]"
                        />
                        {errors.cvv && <p className="text-[10px] text-red-400 mt-1">{errors.cvv}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'netbanking' && (
                  <div className="space-y-2">
                    <p className="text-[#9A9AA3]">Select your registered bank portal:</p>
                    <select className="w-full bg-[#15151B] border border-[#2A2A32] px-3 py-2 text-xs text-[#F5F5F7] focus:outline-none">
                      <option>HDFC Bank</option>
                      <option>ICICI Bank</option>
                      <option>State Bank of India (SBI)</option>
                      <option>Axis Bank</option>
                      <option>Kotak Mahindra Bank</option>
                    </select>
                  </div>
                )}

                {paymentMethod === 'wallets' && (
                  <div className="space-y-2">
                    <p className="text-[#9A9AA3]">Supported digital wallets:</p>
                    <div className="flex gap-2">
                      <span className="px-3 py-1.5 bg-[#15151B] border border-[#2A2A32] text-[#F5F5F7] text-xs">
                        Paytm Wallet
                      </span>
                      <span className="px-3 py-1.5 bg-[#15151B] border border-[#2A2A32] text-[#F5F5F7] text-xs">
                        Amazon Pay
                      </span>
                      <span className="px-3 py-1.5 bg-[#15151B] border border-[#2A2A32] text-[#F5F5F7] text-xs">
                        MobiKwik
                      </span>
                    </div>
                  </div>
                )}

                {paymentMethod === 'paypal' && (
                  <div className="space-y-2">
                    <p className="text-[#9A9AA3]">
                      International orders processed in USD / EUR with buyer protection via PayPal.
                    </p>
                    <p className="text-[11px] text-[#00D9FF]">
                      // Integration point: process.env.VITE_PAYPAL_CLIENT_ID
                    </p>
                  </div>
                )}
              </div>

              {/* State Machine Demo Toggle for testing failures vs success */}
              <div className="pt-2 flex items-center justify-between text-[11px] text-[#9A9AA3] border-t border-[#2A2A32]">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={simulateFailure}
                    onChange={(e) => setSimulateFailure(e.target.checked)}
                    className="accent-red-500"
                  />
                  <span>Simulate Payment Failure Mode (for testing State Machine)</span>
                </label>
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
                      <p className="font-semibold text-[#F5F5F7] line-clamp-1">{item.product.name}</p>
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
                  <span>Shipping ({deliveryMethod === 'express' ? 'Priority Air' : 'Standard'})</span>
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
              <Magnetic strength={10} className="w-full">
                <button
                  type="submit"
                  disabled={orderState === 'Processing'}
                  className="w-full py-4 bg-[#8B5CF6] hover:bg-[#7c4def] disabled:opacity-50 text-white text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 shadow-2xl transition-all active:scale-95"
                >
                  <span>Authorize & Complete Order (₹{finalTotal.toLocaleString('en-IN')})</span>
                </button>
              </Magnetic>

              <div className="space-y-1 text-center">
                <p className="text-[11px] text-[#9A9AA3]">
                  🔒 256-Bit Bank Level Encryption · Nyxdrip Vault Protocol
                </p>
                <p className="text-[10px] text-[#9A9AA3]/60">
                  By clicking complete, you agree to our Terms of Drop & Guarantee.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
