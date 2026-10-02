import React, { useState, useEffect } from 'react';
import { X, User, Mail, Lock, Phone, LogOut, Package, MapPin, Shield, CheckCircle2, AlertCircle, Loader2, ArrowRight, Heart, KeyRound, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { fetchUserOrders } from '../../services/orderService';
import { fetchUserAddresses, saveUserAddress, deleteUserAddress, setDefaultAddress, UserAddress } from '../../services/addressService';
import { Order } from '../../types';
import { useToast } from '../../context/ToastContext';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    profile,
    isAdmin,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    signInWithGoogle,
    isConfigured,
    isRecoveryMode,
    setIsRecoveryMode,
  } = useAuth();
  const { navigateTo } = useNavigation();
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart, openCart } = useCart();
  const { showToast } = useToast();

  // Auth form states
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [newPasswordForReset, setNewPasswordForReset] = useState('');
  const [confirmNewPasswordForReset, setConfirmNewPasswordForReset] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Authenticated tab states
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'wishlist' | 'profile'>('orders');
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // New Address form states
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({
    full_name: '',
    phone: '',
    street_address: '',
    apartment: '',
    city: '',
    state: 'Maharashtra',
    postal_code: '',
    country: 'India',
  });

  // Profile edit states
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  useEffect(() => {
    if (user) {
      setDataLoading(true);
      Promise.all([
        fetchUserOrders(user.id),
        fetchUserAddresses(user.id),
      ]).then(([orders, addrs]) => {
        setUserOrders(orders);
        setAddresses(addrs);
        setDataLoading(false);
      }).catch(() => {
        setDataLoading(false);
      });

      setEditName(profile?.full_name || '');
      setEditPhone(profile?.phone || '');
    }
  }, [user, profile]);

  useEffect(() => {
    if (isRecoveryMode) {
      setAuthMode('reset');
    }
  }, [isRecoveryMode]);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (!email.trim() || !password) {
      setAuthError('Email and password are required.');
      return;
    }

    setAuthLoading(true);
    const { error } = await signIn(email, password);
    setAuthLoading(false);
    if (error) {
      setAuthError(error.message);
    } else {
      setAuthError(null);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (!fullName.trim()) {
      setAuthError('Full name is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must contain at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setAuthError('Master passwords do not match. Please re-enter.');
      return;
    }

    setAuthLoading(true);
    const { error } = await signUp(email, password, fullName, phone);
    setAuthLoading(false);
    if (error) {
      setAuthError(error.message);
    } else {
      setAuthSuccess('Account authorized. Welcome to the NYx syndicate.');
      setConfirmPassword('');
      setPassword('');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (!email.trim()) {
      setAuthError('Please enter your email address.');
      return;
    }

    setAuthLoading(true);
    const { error } = await resetPassword(email);
    setAuthLoading(false);
    if (error) {
      setAuthError(error.message);
    } else {
      setAuthSuccess('Password recovery cipher transmitted. Please check your inbox.');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (newPasswordForReset.length < 6) {
      setAuthError('New password must contain at least 6 characters.');
      return;
    }
    if (newPasswordForReset !== confirmNewPasswordForReset) {
      setAuthError('New passwords do not match. Please re-enter.');
      return;
    }

    setAuthLoading(true);
    const { error } = await updatePassword(newPasswordForReset);
    setAuthLoading(false);
    if (error) {
      setAuthError(error.message);
    } else {
      setAuthSuccess('Password reset successfully. You may now access your account.');
      setAuthMode('signin');
      setIsRecoveryMode(false);
    }
  };

  const handleAddAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { data, error } = await saveUserAddress(user.id, {
      ...newAddr,
      is_default: addresses.length === 0,
    });

    if (data && !error) {
      setAddresses((prev) => [data, ...prev]);
      setShowAddAddress(false);
      setNewAddr({
        full_name: '',
        phone: '',
        street_address: '',
        apartment: '',
        city: '',
        state: 'Maharashtra',
        postal_code: '',
        country: 'India',
      });
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!user) return;
    const ok = await deleteUserAddress(user.id, id);
    if (ok) {
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const handleSetDefaultAddr = async (id: string) => {
    if (!user) return;
    const ok = await setDefaultAddress(user.id, id);
    if (ok) {
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, is_default: a.id === id }))
      );
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({ full_name: editName, phone: editPhone });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      {/* Dark backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-[#15151B] border border-[#2A2A32] max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl z-10 text-[#F5F5F7]">
        {/* Header */}
        <div className="p-5 sm:p-6 flex items-center justify-between border-b border-[#2A2A32] bg-[#101015] sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-[#0A0A0D] border border-[#2A2A32] flex items-center justify-center text-[#8B5CF6]">
              <Shield size={16} />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#00D9FF] font-semibold block">
                {user ? 'SYNCHRONIZED IDENTITY' : 'ACCESS PROTOCOL'}
              </span>
              <h3 className="font-display text-base font-bold uppercase tracking-wider text-[#F5F5F7]">
                {user ? (profile?.full_name || 'NYX OPERATOR') : 'NYX VIP GATEWAY'}
              </h3>
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

        {/* Configuration Warning Notice if backend env vars are absent */}
        {!isConfigured && (
          <div className="p-3.5 bg-[#8B5CF6]/10 border-b border-[#8B5CF6]/20 text-[11px] text-[#C7CBD3] flex items-center gap-2">
            <AlertCircle size={14} className="text-[#00D9FF] shrink-0" />
            <span>
              Connected to local sandbox state. To connect to live cloud Supabase, provide <code className="text-[#8B5CF6]">VITE_SUPABASE_URL</code> in environment variables.
            </span>
          </div>
        )}

        {/* NOT LOGGED IN: Authentication Flows */}
        {!user ? (
          <div className="p-6 space-y-6">
            {/* Auth Mode Tabs */}
            <div className="flex border-b border-[#2A2A32]">
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setAuthError(null); setAuthSuccess(null); }}
                className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                  authMode === 'signin'
                    ? 'border-[#8B5CF6] text-white'
                    : 'border-transparent text-[#9A9AA3] hover:text-[#F5F5F7]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setAuthError(null); setAuthSuccess(null); }}
                className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                  authMode === 'signup'
                    ? 'border-[#8B5CF6] text-white'
                    : 'border-transparent text-[#9A9AA3] hover:text-[#F5F5F7]'
                }`}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('forgot'); setAuthError(null); setAuthSuccess(null); }}
                className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                  authMode === 'forgot'
                    ? 'border-[#8B5CF6] text-white'
                    : 'border-transparent text-[#9A9AA3] hover:text-[#F5F5F7]'
                }`}
              >
                Forgot Password?
              </button>
              {authMode === 'reset' && (
                <button
                  type="button"
                  onClick={() => { setAuthMode('reset'); setAuthError(null); setAuthSuccess(null); }}
                  className="flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 border-[#00D9FF] text-[#00D9FF]"
                >
                  Reset Password
                </button>
              )}
            </div>

            {/* Status alerts */}
            {authError && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{authError}</span>
              </div>
            )}
            {authSuccess && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>{authSuccess}</span>
              </div>
            )}

            {/* Sign In Form */}
            {authMode === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-3 text-[#9A9AA3]" />
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                      onClick={() => setAuthMode('forgot')}
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
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#0A0A0D] border border-[#2A2A32] pl-9 pr-3.5 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/50 focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 bg-[#8B5CF6] hover:bg-[#7c4def] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  {authLoading && <Loader2 size={14} className="animate-spin" />}
                  <span>Sign In</span>
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={async () => {
                      setAuthError(null);
                      setAuthLoading(true);
                      const res = await signInWithGoogle();
                      setAuthLoading(false);
                      if (res?.error) {
                        setAuthError(res.error.message);
                      }
                    }}
                    className="w-full py-2.5 bg-[#0A0A0D] hover:bg-[#1f1f27] border border-[#2A2A32] text-xs font-semibold text-[#F5F5F7] transition-colors flex items-center justify-center gap-2"
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

                <div className="pt-2 text-center text-xs text-[#9A9AA3]">
                  <span>Don't have an account? </span>
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className="text-[#00D9FF] hover:underline font-semibold"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            )}

            {/* Sign Up Form */}
            {authMode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-3 text-[#9A9AA3]" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jordan Vane"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
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
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#0A0A0D] border border-[#2A2A32] pl-9 pr-3.5 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/50 focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                    Phone Number (Optional)
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3.5 top-3 text-[#9A9AA3]" />
                    <input
                      type="tel"
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
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
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-[#0A0A0D] border border-[#2A2A32] pl-9 pr-3.5 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/50 focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 bg-[#8B5CF6] hover:bg-[#7c4def] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  {authLoading && <Loader2 size={14} className="animate-spin" />}
                  <span>Create Account</span>
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={async () => {
                      setAuthError(null);
                      setAuthLoading(true);
                      const res = await signInWithGoogle();
                      setAuthLoading(false);
                      if (res?.error) {
                        setAuthError(res.error.message);
                      }
                    }}
                    className="w-full py-2.5 bg-[#0A0A0D] hover:bg-[#1f1f27] border border-[#2A2A32] text-xs font-semibold text-[#F5F5F7] transition-colors flex items-center justify-center gap-2"
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

                <div className="pt-2 text-center text-xs text-[#9A9AA3]">
                  <span>Already have an account? </span>
                  <button
                    type="button"
                    onClick={() => setAuthMode('signin')}
                    className="text-[#00D9FF] hover:underline font-semibold"
                  >
                    Sign In
                  </button>
                </div>
              </form>
            )}

            {/* Forgot Password */}
            {authMode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-xs text-[#9A9AA3] leading-relaxed">
                  Enter your registered email address. We will transmit a secure password reset link to your inbox.
                </p>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0A0A0D] border border-[#2A2A32] px-3.5 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/50 focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                >
                  {authLoading && <Loader2 size={14} className="animate-spin" />}
                  <span>Send Password Reset Link</span>
                </button>
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setAuthMode('signin')}
                    className="text-xs text-[#9A9AA3] hover:text-white"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            )}

            {/* Reset Password Form */}
            {authMode === 'reset' && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <p className="text-xs text-[#9A9AA3] leading-relaxed">
                  Set your new account password below.
                </p>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                    New Password (min 6 characters)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••••••"
                    value={newPasswordForReset}
                    onChange={(e) => setNewPasswordForReset(e.target.value)}
                    className="w-full bg-[#0A0A0D] border border-[#2A2A32] px-3.5 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/50 focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••••••"
                    value={confirmNewPasswordForReset}
                    onChange={(e) => setConfirmNewPasswordForReset(e.target.value)}
                    className="w-full bg-[#0A0A0D] border border-[#2A2A32] px-3.5 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/50 focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 bg-[#00D9FF] hover:bg-[#00b5d6] text-[#0A0A0D] text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                >
                  {authLoading && <Loader2 size={14} className="animate-spin" />}
                  <span>Reset Password</span>
                </button>
              </form>
            )}
          </div>
        ) : (
          /* LOGGED IN: Multi-tab User Dashboard */
          <div>
            {/* VIP Status Banner */}
            <div className="p-4 bg-[#0A0A0D] border-b border-[#2A2A32] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{user.email}</span>
                  {isAdmin && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-red-900/60 text-red-300 border border-red-700/50">
                      ADMIN
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#00D9FF] font-mono-numbers mt-0.5">
                  TIER 1 · SHADOW OPERATOR (ID: {user.id.slice(0, 8)}...)
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigateTo('admin' as any);
                    }}
                    className="px-3 py-1.5 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-[10px] font-bold uppercase tracking-wider transition-colors shadow-lg"
                  >
                    Admin Area
                  </button>
                )}
                <button
                  type="button"
                  onClick={signOut}
                  className="p-1.5 text-[#9A9AA3] hover:text-red-400 transition-colors"
                  title="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>

            {/* Dashboard Tabs */}
            <div className="flex border-b border-[#2A2A32] bg-[#101015]">
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                  activeTab === 'orders'
                    ? 'border-[#8B5CF6] text-white'
                    : 'border-transparent text-[#9A9AA3] hover:text-white'
                }`}
              >
                <Package size={14} />
                <span>Orders ({userOrders.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('addresses')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                  activeTab === 'addresses'
                    ? 'border-[#8B5CF6] text-white'
                    : 'border-transparent text-[#9A9AA3] hover:text-white'
                }`}
              >
                <MapPin size={14} />
                <span>Addresses ({addresses.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('wishlist')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                  activeTab === 'wishlist'
                    ? 'border-[#8B5CF6] text-white'
                    : 'border-transparent text-[#9A9AA3] hover:text-white'
                }`}
              >
                <Heart size={14} />
                <span>Wishlist ({wishlist.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                  activeTab === 'profile'
                    ? 'border-[#8B5CF6] text-white'
                    : 'border-transparent text-[#9A9AA3] hover:text-white'
                }`}
              >
                <User size={14} />
                <span>Profile</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-6">
              {dataLoading && (
                <div className="py-12 text-center text-[#9A9AA3] space-y-2">
                  <Loader2 size={24} className="animate-spin mx-auto text-[#8B5CF6]" />
                  <p className="text-xs">Synchronizing vault archives...</p>
                </div>
              )}

              {/* TAB 1: ORDERS */}
              {!dataLoading && activeTab === 'orders' && (
                <div className="space-y-4">
                  {userOrders.length === 0 ? (
                    <div className="py-10 text-center space-y-3 border border-[#2A2A32] bg-[#0A0A0D] p-6">
                      <Package size={32} className="mx-auto text-[#9A9AA3]/50" />
                      <p className="text-xs text-[#9A9AA3]">No order history logged for this account yet.</p>
                      <button
                        type="button"
                        onClick={() => { onClose(); navigateTo('shop'); }}
                        className="px-5 py-2 bg-[#8B5CF6] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#7c4def]"
                      >
                        Explore Catalog
                      </button>
                    </div>
                  ) : (
                    userOrders.map((ord) => (
                      <div key={ord.orderId} className="p-4 bg-[#0A0A0D] border border-[#2A2A32] space-y-3">
                        <div className="flex items-center justify-between text-xs pb-2 border-b border-[#2A2A32]">
                          <div>
                            <span className="font-mono-numbers font-bold text-white">{ord.orderId}</span>
                            <span className="text-[10px] text-[#9A9AA3] block">{new Date(ord.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="text-right">
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/40">
                              {ord.status}
                            </span>
                            <span className="font-mono-numbers font-bold text-[#00D9FF] text-xs block mt-1">
                              ₹{ord.total.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          {ord.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-[#C7CBD3]">
                              <span className="truncate max-w-[260px]">
                                {item.quantity}x {item.product.name} ({item.selectedVariant || 'Standard'})
                              </span>
                              <span className="font-mono-numbers">
                                ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 flex justify-between items-center text-[11px] text-[#9A9AA3]">
                          <span>Delivering to: {ord.customer.city}, {ord.customer.state}</span>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              navigateTo('order-confirmation', { orderId: ord.orderId });
                            }}
                            className="text-[#00D9FF] hover:underline flex items-center gap-1 font-semibold"
                          >
                            <span>Receipt</span>
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 2: ADDRESSES */}
              {!dataLoading && activeTab === 'addresses' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs uppercase text-[#9A9AA3] font-semibold tracking-wider">
                      Saved Shipping Locations
                    </span>
                    {!showAddAddress && (
                      <button
                        type="button"
                        onClick={() => setShowAddAddress(true)}
                        className="text-xs text-[#8B5CF6] hover:text-[#00D9FF] font-bold uppercase tracking-wider"
                      >
                        + Add Address
                      </button>
                    )}
                  </div>

                  {showAddAddress ? (
                    <form onSubmit={handleAddAddressSubmit} className="p-4 bg-[#0A0A0D] border border-[#2A2A32] space-y-3">
                      <h4 className="text-xs font-bold uppercase text-white">Add Delivery Destination</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          required
                          placeholder="Recipient Full Name *"
                          value={newAddr.full_name}
                          onChange={(e) => setNewAddr({ ...newAddr, full_name: e.target.value })}
                          className="w-full bg-[#15151B] border border-[#2A2A32] px-3 py-2 text-xs text-white"
                        />
                        <input
                          type="tel"
                          required
                          placeholder="Phone Number *"
                          value={newAddr.phone}
                          onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                          className="w-full bg-[#15151B] border border-[#2A2A32] px-3 py-2 text-xs text-white"
                        />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Street Address, Building, Flat *"
                        value={newAddr.street_address}
                        onChange={(e) => setNewAddr({ ...newAddr, street_address: e.target.value })}
                        className="w-full bg-[#15151B] border border-[#2A2A32] px-3 py-2 text-xs text-white"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          required
                          placeholder="City *"
                          value={newAddr.city}
                          onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                          className="w-full bg-[#15151B] border border-[#2A2A32] px-3 py-2 text-xs text-white"
                        />
                        <input
                          type="text"
                          required
                          placeholder="State *"
                          value={newAddr.state}
                          onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })}
                          className="w-full bg-[#15151B] border border-[#2A2A32] px-3 py-2 text-xs text-white"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Pincode *"
                          value={newAddr.postal_code}
                          onChange={(e) => setNewAddr({ ...newAddr, postal_code: e.target.value })}
                          className="w-full bg-[#15151B] border border-[#2A2A32] px-3 py-2 text-xs text-white"
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-wider"
                        >
                          Save Address
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddAddress(false)}
                          className="px-4 py-2 border border-[#2A2A32] text-xs text-[#9A9AA3]"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : addresses.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#9A9AA3] border border-[#2A2A32] bg-[#0A0A0D]">
                      No saved addresses. Save one now for expedited 1-click checkout.
                    </div>
                  ) : (
                    addresses.map((addr) => (
                      <div key={addr.id} className="p-3.5 bg-[#0A0A0D] border border-[#2A2A32] flex items-start justify-between gap-4">
                        <div className="text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{addr.full_name}</span>
                            {addr.is_default && (
                              <span className="px-1.5 py-0.2 bg-[#00D9FF]/20 text-[#00D9FF] text-[9px] font-bold uppercase">
                                DEFAULT
                              </span>
                            )}
                          </div>
                          <p className="text-[#C7CBD3]">{addr.street_address}{addr.apartment ? `, ${addr.apartment}` : ''}</p>
                          <p className="text-[#9A9AA3]">{addr.city}, {addr.state} - {addr.postal_code}</p>
                          <p className="text-[#9A9AA3]">Phone: {addr.phone}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 text-[11px]">
                          {!addr.is_default && (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultAddr(addr.id)}
                              className="text-[#8B5CF6] hover:underline"
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="text-red-400 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: WISHLIST */}
              {!dataLoading && activeTab === 'wishlist' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-[#2A2A32]">
                    <span className="text-xs uppercase text-[#9A9AA3] font-semibold tracking-wider">
                      Synchronized Wishlist ({wishlist.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => { onClose(); navigateTo('shop'); }}
                      className="text-xs text-[#8B5CF6] hover:underline"
                    >
                      + Add Pieces
                    </button>
                  </div>
                  {wishlist.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#9A9AA3] border border-[#2A2A32] bg-[#0A0A0D]">
                      Your vault wishlist is empty. Explore our chrome relics and save pieces for later.
                    </div>
                  ) : (
                    wishlist.map((item) => (
                      <div key={item.product.id} className="p-3 bg-[#0A0A0D] border border-[#2A2A32] flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={item.product.images[0] || '/assets/hero-cross.jpg'}
                            alt={item.product.name}
                            className="w-12 h-12 object-cover border border-[#2A2A32] shrink-0"
                          />
                          <div className="truncate">
                            <span className="text-xs font-bold text-white block truncate">{item.product.name}</span>
                            <span className="text-xs font-mono-numbers text-[#00D9FF]">₹{item.product.price.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              addToCart(item.product);
                              openCart();
                              onClose();
                            }}
                            className="px-3 py-1.5 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                          >
                            <ShoppingBag size={12} />
                            <span>Add</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromWishlist(item.product.id)}
                            className="p-1.5 text-[#9A9AA3] hover:text-red-400"
                            title="Remove from wishlist"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 4: PROFILE */}
              {!dataLoading && activeTab === 'profile' && (
                <div className="space-y-6">
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                        Account Email
                      </label>
                      <input
                        type="email"
                        readOnly
                        value={user.email || ''}
                        className="w-full bg-[#0A0A0D]/50 border border-[#2A2A32] px-3.5 py-2.5 text-xs text-[#9A9AA3] cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                        Operative Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-[#0A0A0D] border border-[#2A2A32] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full bg-[#0A0A0D] border border-[#2A2A32] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>

                    <div className="pt-1">
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-widest transition-colors"
                      >
                        Update Identity Profile
                      </button>
                    </div>
                  </form>

                  {/* Password Change Sub-section */}
                  <div className="pt-4 border-t border-[#2A2A32] space-y-3">
                    <div className="flex items-center gap-2">
                      <KeyRound size={14} className="text-[#00D9FF]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-white">
                        Update Security Cipher
                      </span>
                    </div>
                    <div className="space-y-2">
                      <input
                        type="password"
                        placeholder="Enter new master password (min 6 chars)"
                        value={newPasswordForReset}
                        onChange={(e) => setNewPasswordForReset(e.target.value)}
                        className="w-full bg-[#0A0A0D] border border-[#2A2A32] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#00D9FF]"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (newPasswordForReset.length < 6) {
                            showToast('Invalid Password', 'Password must be at least 6 characters.', 'error');
                            return;
                          }
                          await updatePassword(newPasswordForReset);
                          setNewPasswordForReset('');
                        }}
                        className="w-full py-2 bg-[#15151B] hover:bg-[#202029] border border-[#2A2A32] hover:border-[#00D9FF] text-[#00D9FF] text-xs font-bold uppercase tracking-wider transition-colors"
                      >
                        Synchronize New Password
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
