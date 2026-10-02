import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowLeft, CheckCircle2, AlertCircle, Loader2, CreditCard, Smartphone, Building2, Wallet, Globe, MapPin, User, Mail, Lock, Phone } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CustomerInfo, Order, OrderStatus } from '../../types';
import { ScrollReveal } from '../common/ScrollReveal';
import { Magnetic } from '../common/Magnetic';
import { validateCartStock } from '../../services/inventoryService';
import { createOrderInDatabase } from '../../services/orderService';
import { fetchUserAddresses, saveUserAddress, UserAddress } from '../../services/addressService';
import { AccountModal } from '../account/AccountModal';

// ============================================================================
// PAYMENT INTEGRATION INTERFACE CONTRACT
// Note for production deployment:
// TODO: Connect to Razorpay India via process.env.VITE_RAZORPAY_KEY_ID
// TODO: Connect to Cashfree India via process.env.VITE_CASHFREE_APP_ID
// TODO: Connect to PayPal International via process.env.VITE_PAYPAL_CLIENT_ID
// ============================================================================

export const CheckoutView: React.FC = () => {
  const { items, subtotal, discount, shipping, total, clearCart, appliedCoupon } = useCart();
  const { navigateTo } = useNavigation();
  const { user, profile, signIn, signUp, resetPassword, signInWithGoogle } = useAuth();
  const { showToast } = useToast();

  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [saveAddressToAccount, setSaveAddressToAccount] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Guest Checkout Authentication Form States
  const [guestAuthMode, setGuestAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPassword, setGuestPassword] = useState('');
  const [guestConfirmPassword, setGuestConfirmPassword] = useState('');
  const [guestFullName, setGuestFullName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestAuthLoading, setGuestAuthLoading] = useState(false);
  const [guestAuthError, setGuestAuthError] = useState<string | null>(null);
  const [guestAuthSuccess, setGuestAuthSuccess] = useState<string | null>(null);

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

    if (!user) {
      showToast('Sign In Required', 'Please sign in to place an order.', 'error');
      return;
    }

    if (!validateForm()) {
      window.scrollTo({ top: 150, behavior: 'smooth' });
      return;
    }

    // Begin State Machine transition: Pending -> Processing
    setOrderState('Processing');

    // 1. Centralized Inventory Validation check before authorizing transaction
    const stockValidation = await validateCartStock(items);
    if (!stockValidation.valid) {
      setOrderState('Pending');
      showToast(
        'Inventory Allocation Notice',
        `Insufficient stock for "${stockValidation.errorItem}". Only ${stockValidation.availableStock ?? 0} remain in the vault.`,
        'error'
      );
      return;
    }

    // Simulate real gateway handshake (Razorpay / Cashfree / PayPal)
    setTimeout(async () => {
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

      // 2. Persist order & order items to Supabase Database
      await createOrderInDatabase({
        orderNumber: generatedOrderId,
        userId: user?.id || null,
        customer: formData,
        items,
        subtotal,
        discount,
        shipping: finalShipping,
        total: finalTotal,
        deliveryMethod,
        paymentMethod,
        couponCode: appliedCoupon?.code || null,
      });

      // 3. Save address to user's saved addresses in Supabase if requested
      if (user && saveAddressToAccount) {
        saveUserAddress(user.id, {
          full_name: `${formData.firstName} ${formData.lastName}`.trim(),
          phone: formData.phone,
          street_address: formData.address,
          apartment: formData.apartment,
          city: formData.city,
          state: formData.state,
          postal_code: formData.pincode,
          country: formData.country,
          is_default: savedAddresses.length === 0,
        }).catch(() => {});
      }

      try {
        localStorage.setItem(`order_${generatedOrderId}`, JSON.stringify(completedOrder));
        localStorage.setItem('latest_order_id', generatedOrderId);
      } catch {
        // storage fallback
      }

      clearCart();

      setTimeout(() => {
        navigateTo('order-confirmation', { orderId: generatedOrderId });
      }, 800);
    }, 1800);
  };

  const handleGuestSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuestAuthError(null);
    setGuestAuthSuccess(null);

    if (!guestEmail.trim() || !guestPassword) {
      setGuestAuthError('Email and password are required.');
      return;
    }

    setGuestAuthLoading(true);
    const { error } = await signIn(guestEmail, guestPassword);
    setGuestAuthLoading(false);
    if (error) {
      setGuestAuthError(error.message);
    }
  };

  const handleGuestSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuestAuthError(null);
    setGuestAuthSuccess(null);

    if (!guestFullName.trim()) {
      setGuestAuthError('Full name is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
      setGuestAuthError('Please enter a valid email address.');
      return;
    }
    if (guestPassword.length < 6) {
      setGuestAuthError('Password must contain at least 6 characters.');
      return;
    }
    if (guestPassword !== guestConfirmPassword) {
      setGuestAuthError('Passwords do not match. Please re-enter.');
      return;
    }

    setGuestAuthLoading(true);
    const { error } = await signUp(guestEmail, guestPassword, guestFullName, guestPhone);
    setGuestAuthLoading(false);
    if (error) {
      setGuestAuthError(error.message);
    } else {
      setGuestAuthSuccess('Account created. Check your email for a verification link.');
    }
  };

  const handleGuestForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuestAuthError(null);
    setGuestAuthSuccess(null);

    if (!guestEmail.trim()) {
      setGuestAuthError('Please enter your email address.');
      return;
    }

    setGuestAuthLoading(true);
    const { error } = await resetPassword(guestEmail);
    setGuestAuthLoading(false);
    if (error) {
      setGuestAuthError(error.message);
    } else {
      setGuestAuthSuccess('Password reset link sent to your email.');
    }
  };

  // If user is not authenticated, block checkout and display the polished Sign In gateway
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0A0D] text-[#F5F5F7] py-10 sm:py-16">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          {/* Breadcrumb back to cart */}
          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-[#9A9AA3] mb-8">
            <button
              type="button"
              onClick={() => navigateTo('cart')}
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to Bag</span>
            </button>
            <span>/</span>
            <span className="text-[#8B5CF6] font-semibold">Secure Checkout</span>
          </div>

          <ScrollReveal animation="fade-up">
            <div className="bg-[#15151B] border border-[#2A2A32] shadow-2xl p-6 sm:p-8 space-y-6">
              {/* Header Badge */}
              <div className="flex items-center gap-3 pb-4 border-b border-[#2A2A32]">
                <div className="w-10 h-10 rounded-sm bg-[#0A0A0D] border border-[#2A2A32] flex items-center justify-center text-[#8B5CF6]">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-[0.25em] text-[#00D9FF] font-semibold block">
                    GUEST CHECKOUT GATEWAY
                  </span>
                  <h2 className="font-display text-lg sm:text-xl font-bold uppercase tracking-wider text-white">
                    Sign In Required for Checkout
                  </h2>
                </div>
              </div>

              <p className="text-xs text-[#9A9AA3] leading-relaxed">
                An account is required to secure your hardware pieces, activate real-time courier dispatch tracking, and guarantee your order under the NYx Vault Protocol.
              </p>

              {/* Order bag summary chip */}
              <div className="p-3.5 bg-[#0A0A0D] border border-[#2A2A32] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2 overflow-hidden">
                    {items.slice(0, 3).map((item, idx) => (
                      <img
                        key={idx}
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="inline-block w-8 h-8 object-cover rounded-sm border border-[#2A2A32] bg-[#15151B]"
                      />
                    ))}
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-white block">
                      {items.reduce((s, i) => s + i.quantity, 0)} Items In Your Bag
                    </span>
                    <span className="text-[11px] text-[#9A9AA3]">All items will be preserved</span>
                  </div>
                </div>
                <span className="font-mono-numbers text-sm font-bold text-[#00D9FF]">
                  ₹{finalTotal.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Auth Mode Tabs */}
              <div className="flex border-b border-[#2A2A32]">
                <button
                  type="button"
                  onClick={() => { setGuestAuthMode('signin'); setGuestAuthError(null); setGuestAuthSuccess(null); }}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                    guestAuthMode === 'signin'
                      ? 'border-[#8B5CF6] text-white'
                      : 'border-transparent text-[#9A9AA3] hover:text-[#F5F5F7]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setGuestAuthMode('signup'); setGuestAuthError(null); setGuestAuthSuccess(null); }}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                    guestAuthMode === 'signup'
                      ? 'border-[#8B5CF6] text-white'
                      : 'border-transparent text-[#9A9AA3] hover:text-[#F5F5F7]'
                  }`}
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => { setGuestAuthMode('forgot'); setGuestAuthError(null); setGuestAuthSuccess(null); }}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                    guestAuthMode === 'forgot'
                      ? 'border-[#8B5CF6] text-white'
                      : 'border-transparent text-[#9A9AA3] hover:text-[#F5F5F7]'
                  }`}
                >
                  Forgot Password?
                </button>
              </div>

              {/* Status messages */}
              {guestAuthError && (
                <div className="p-3 bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{guestAuthError}</span>
                </div>
              )}
              {guestAuthSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{guestAuthSuccess}</span>
                </div>
              )}

              {/* 1. SIGN IN FORM */}
              {guestAuthMode === 'signin' && (
                <form onSubmit={handleGuestSignIn} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-3 text-[#9A9AA3]" />
                      <input
                        type="email"
                        required
                        placeholder="operator@domain.com"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className="w-full bg-[#0A0A0D] border border-[#2A2A32] pl-9 pr-3.5 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/50 focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold uppercase text-[#9A9AA3]">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setGuestAuthMode('forgot')}
                        className="text-[10px] text-[#8B5CF6] hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3.5 top-3 text-[#9A9AA3]" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={guestPassword}
                        onChange={(e) => setGuestPassword(e.target.value)}
                        className="w-full bg-[#0A0A0D] border border-[#2A2A32] pl-9 pr-3.5 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/50 focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={guestAuthLoading}
                    className="w-full py-3 bg-[#8B5CF6] hover:bg-[#7c4def] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-lg"
                  >
                    {guestAuthLoading && <Loader2 size={14} className="animate-spin" />}
                    <span>Sign In & Continue to Checkout</span>
                  </button>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={signInWithGoogle}
                      className="w-full py-2.5 bg-[#0A0A0D] hover:bg-[#1a1a22] border border-[#2A2A32] text-xs font-semibold text-[#F5F5F7] transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </button>
                  </div>
                </form>
              )}

              {/* 2. CREATE ACCOUNT FORM */}
              {guestAuthMode === 'signup' && (
                <form onSubmit={handleGuestSignUp} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User size={14} className="absolute left-3.5 top-3 text-[#9A9AA3]" />
                      <input
                        type="text"
                        required
                        placeholder="Jordan Vane"
                        value={guestFullName}
                        onChange={(e) => setGuestFullName(e.target.value)}
                        className="w-full bg-[#0A0A0D] border border-[#2A2A32] pl-9 pr-3.5 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/50 focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-3 text-[#9A9AA3]" />
                      <input
                        type="email"
                        required
                        placeholder="operator@domain.com"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className="w-full bg-[#0A0A0D] border border-[#2A2A32] pl-9 pr-3.5 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/50 focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                      Phone Number (For Delivery SMS)
                    </label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3.5 top-3 text-[#9A9AA3]" />
                      <input
                        type="tel"
                        placeholder="9876543210"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        className="w-full bg-[#0A0A0D] border border-[#2A2A32] pl-9 pr-3.5 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/50 focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                      Password * (min 6 characters)
                    </label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3.5 top-3 text-[#9A9AA3]" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••••••"
                        value={guestPassword}
                        onChange={(e) => setGuestPassword(e.target.value)}
                        className="w-full bg-[#0A0A0D] border border-[#2A2A32] pl-9 pr-3.5 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/50 focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3.5 top-3 text-[#9A9AA3]" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••••••"
                        value={guestConfirmPassword}
                        onChange={(e) => setGuestConfirmPassword(e.target.value)}
                        className="w-full bg-[#0A0A0D] border border-[#2A2A32] pl-9 pr-3.5 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/50 focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={guestAuthLoading}
                    className="w-full py-3 bg-[#8B5CF6] hover:bg-[#7c4def] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-lg"
                  >
                    {guestAuthLoading && <Loader2 size={14} className="animate-spin" />}
                    <span>Create Account & Continue</span>
                  </button>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={signInWithGoogle}
                      className="w-full py-2.5 bg-[#0A0A0D] hover:bg-[#1a1a22] border border-[#2A2A32] text-xs font-semibold text-[#F5F5F7] transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </button>
                  </div>
                </form>
              )}

              {/* 3. FORGOT PASSWORD FORM */}
              {guestAuthMode === 'forgot' && (
                <form onSubmit={handleGuestForgotPassword} className="space-y-4">
                  <p className="text-xs text-[#9A9AA3] leading-relaxed">
                    Enter your registered email address to receive password reset instructions.
                  </p>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="operator@domain.com"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full bg-[#0A0A0D] border border-[#2A2A32] px-3.5 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/50 focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={guestAuthLoading}
                    className="w-full py-3 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                  >
                    {guestAuthLoading && <Loader2 size={14} className="animate-spin" />}
                    <span>Send Password Reset Link</span>
                  </button>
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setGuestAuthMode('signin')}
                      className="text-xs text-[#9A9AA3] hover:text-white"
                    >
                      ← Back to Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          </ScrollReveal>
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
                The simulated bank or card issuer declined payment. You can retry with another method or disable simulation.
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
