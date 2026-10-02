import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Phone, LogOut, Package, MapPin, Shield, CheckCircle2, AlertCircle, Loader2, ArrowRight, Heart, KeyRound, ShoppingBag, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { fetchUserOrders } from '../../services/orderService';
import { fetchUserAddresses, saveUserAddress, deleteUserAddress, setDefaultAddress, UserAddress } from '../../services/addressService';
import { Order } from '../../types';
import { ScrollReveal } from '../common/ScrollReveal';

export const AccountView: React.FC = () => {
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

  // Auth Mode: 'signin' | 'signup' | 'forgot' | 'reset'
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

  // Authenticated Tabs: 'profile' | 'orders' | 'addresses' | 'wishlist'
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'addresses' | 'wishlist'>('profile');
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Edit Profile States
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Security password state
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Add Address Form State
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
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

  // Switch to recovery mode if flag or hash present
  useEffect(() => {
    if (isRecoveryMode || window.location.hash.includes('reset-password')) {
      setAuthMode('reset');
    }
  }, [isRecoveryMode]);

  // Load User Data
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

  // Handle Sign In
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
    }
  };

  // Handle Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (!fullName.trim()) {
      setAuthError('Full name is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
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
      setAuthSuccess('Operative credentials authorized. Welcome to the NYx syndicate.');
      setConfirmPassword('');
      setPassword('');
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (!email.trim()) {
      setAuthError('Please enter your registered email address.');
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

  // Handle Reset Password Submit
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
      setAuthSuccess('Password reset successfully. You may now sign in with your new cipher.');
      setAuthMode('signin');
      setIsRecoveryMode(false);
      setNewPasswordForReset('');
      setConfirmNewPasswordForReset('');
    }
  };

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    await updateProfile({ full_name: editName, phone: editPhone });
    setSavingProfile(false);
  };

  // Handle Password Update from Profile
  const handleUpdatePasswordFromProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileNewPassword.length < 6) {
      showToast('Validation Error', 'Password must contain at least 6 characters.', 'error');
      return;
    }
    setSavingPassword(true);
    const { error } = await updatePassword(profileNewPassword);
    setSavingPassword(false);
    if (!error) {
      setProfileNewPassword('');
    }
  };

  // Handle Add Address
  const handleAddAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSavingAddress(true);
    const { data, error } = await saveUserAddress(user.id, {
      ...newAddr,
      is_default: addresses.length === 0,
    });
    setSavingAddress(false);

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
      showToast('Address Saved', 'New shipping destination added to your vault.', 'success');
    }
  };

  // Handle Delete Address
  const handleDeleteAddress = async (id: string) => {
    if (!user) return;
    const ok = await deleteUserAddress(user.id, id);
    if (ok) {
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      showToast('Address Removed', 'Destination purged from account.', 'info');
    }
  };

  // Handle Set Default Address
  const handleSetDefaultAddr = async (id: string) => {
    if (!user) return;
    const ok = await setDefaultAddress(user.id, id);
    if (ok) {
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, is_default: a.id === id }))
      );
      showToast('Default Updated', 'Primary shipping address synchronized.', 'success');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0D] text-[#F5F5F7] py-10 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#9A9AA3] mb-6">
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="hover:text-white transition-colors"
          >
            Home
          </button>
          <span>/</span>
          <span className="text-[#8B5CF6] font-semibold">Syndicate Account</span>
        </div>

        {/* Configuration notice if live Supabase is not yet connected */}
        {!isConfigured && (
          <div className="mb-8 p-4 bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-xs text-[#C7CBD3] flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <AlertCircle size={16} className="text-[#00D9FF] shrink-0" />
              <span>
                Operating in local sandbox mode. To connect to live cloud Supabase, define <code className="text-[#8B5CF6]">VITE_SUPABASE_URL</code> and <code className="text-[#8B5CF6]">VITE_SUPABASE_PUBLISHABLE_KEY</code> in environment variables.
              </span>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/40 shrink-0">
              Sandbox Ready
            </span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* UN-AUTHENTICATED: Authentication Gateway */}
        {/* ========================================================================= */}
        {!user ? (
          <div className="max-w-xl mx-auto">
            <ScrollReveal animation="fade-up">
              <div className="text-center mb-8">
                <span className="text-xs uppercase tracking-[0.3em] text-[#00D9FF] font-semibold block mb-2">
                  SECURE ACCESS PROTOCOL
                </span>
                <h1 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-[#F5F5F7]">
                  NYX DRIPSTORE GATEWAY
                </h1>
                <p className="text-xs sm:text-sm text-[#9A9AA3] mt-2 max-w-md mx-auto">
                  Authenticate your credentials to access encrypted drop orders, saved vault hardware, and priority dispatch.
                </p>
              </div>

              <div className="bg-[#15151B] border border-[#2A2A32] shadow-2xl p-6 sm:p-8">
                {/* Mode Tabs */}
                <div className="flex border-b border-[#2A2A32] mb-6">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signin'); setAuthError(null); setAuthSuccess(null); }}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
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
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
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
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
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
                      className="flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 border-[#00D9FF] text-[#00D9FF]"
                    >
                      Reset Password
                    </button>
                  )}
                </div>

                {/* Status Banners */}
                {authError && (
                  <div className="mb-6 p-3.5 bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-center gap-2.5">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}
                {authSuccess && (
                  <div className="mb-6 p-3.5 bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>{authSuccess}</span>
                  </div>
                )}

                {/* 1. SIGN IN FORM */}
                {authMode === 'signin' && (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1.5">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3.5 top-3 text-[#9A9AA3]" />
                        <input
                          type="email"
                          required
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-[#0A0A0D] border border-[#2A2A32] pl-10 pr-4 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/40 focus:outline-none focus:border-[#8B5CF6] transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-semibold uppercase text-[#9A9AA3]">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setAuthMode('forgot')}
                          className="text-[11px] text-[#8B5CF6] hover:underline"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3.5 top-3 text-[#9A9AA3]" />
                        <input
                          type="password"
                          required
                          placeholder="••••••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-[#0A0A0D] border border-[#2A2A32] pl-10 pr-4 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/40 focus:outline-none focus:border-[#8B5CF6] transition-colors"
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

                    <div className="pt-2">
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

                    <div className="pt-4 text-center text-xs text-[#9A9AA3] border-t border-[#2A2A32]/60">
                      <span>New to NYx DRIPstore? </span>
                      <button
                        type="button"
                        onClick={() => setAuthMode('signup')}
                        className="text-[#00D9FF] hover:underline font-semibold"
                      >
                        Create Account →
                      </button>
                    </div>
                  </form>
                )}

                {/* 2. SIGN UP FORM */}
                {authMode === 'signup' && (
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1.5">
                        Full Name *
                      </label>
                      <div className="relative">
                        <User size={15} className="absolute left-3.5 top-3 text-[#9A9AA3]" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. Jordan Vane"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full bg-[#0A0A0D] border border-[#2A2A32] pl-10 pr-4 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/40 focus:outline-none focus:border-[#8B5CF6]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1.5">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3.5 top-3 text-[#9A9AA3]" />
                        <input
                          type="email"
                          required
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-[#0A0A0D] border border-[#2A2A32] pl-10 pr-4 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/40 focus:outline-none focus:border-[#8B5CF6]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1.5">
                        Phone Number (Optional)
                      </label>
                      <div className="relative">
                        <Phone size={15} className="absolute left-3.5 top-3 text-[#9A9AA3]" />
                        <input
                          type="tel"
                          placeholder="9876543210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-[#0A0A0D] border border-[#2A2A32] pl-10 pr-4 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/40 focus:outline-none focus:border-[#8B5CF6]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1.5">
                        Password * (min 6 characters)
                      </label>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3.5 top-3 text-[#9A9AA3]" />
                        <input
                          type="password"
                          required
                          minLength={6}
                          placeholder="••••••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-[#0A0A0D] border border-[#2A2A32] pl-10 pr-4 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/40 focus:outline-none focus:border-[#8B5CF6]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1.5">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3.5 top-3 text-[#9A9AA3]" />
                        <input
                          type="password"
                          required
                          minLength={6}
                          placeholder="••••••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-[#0A0A0D] border border-[#2A2A32] pl-10 pr-4 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/40 focus:outline-none focus:border-[#8B5CF6]"
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

                    <div className="pt-2">
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

                    <div className="pt-4 text-center text-xs text-[#9A9AA3] border-t border-[#2A2A32]/60">
                      <span>Already registered? </span>
                      <button
                        type="button"
                        onClick={() => setAuthMode('signin')}
                        className="text-[#00D9FF] hover:underline font-semibold"
                      >
                        Sign In →
                      </button>
                    </div>
                  </form>
                )}

                {/* 3. FORGOT PASSWORD FORM */}
                {authMode === 'forgot' && (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <p className="text-xs text-[#9A9AA3] leading-relaxed">
                      Enter your email address. We will transmit a secure password reset link to your inbox.
                    </p>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1.5">
                        Registered Email
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#0A0A0D] border border-[#2A2A32] px-4 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/40 focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-3 bg-[#8B5CF6] hover:bg-[#7c4def] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
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

                {/* 4. RESET PASSWORD FORM */}
                {authMode === 'reset' && (
                  <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                    <p className="text-xs text-[#9A9AA3] leading-relaxed">
                      Set your new account password below.
                    </p>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1.5">
                        New Password (min 6 characters)
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••••••"
                        value={newPasswordForReset}
                        onChange={(e) => setNewPasswordForReset(e.target.value)}
                        className="w-full bg-[#0A0A0D] border border-[#2A2A32] px-4 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/40 focus:outline-none focus:border-[#00D9FF]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1.5">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••••••"
                        value={confirmNewPasswordForReset}
                        onChange={(e) => setConfirmNewPasswordForReset(e.target.value)}
                        className="w-full bg-[#0A0A0D] border border-[#2A2A32] px-4 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/40 focus:outline-none focus:border-[#00D9FF]"
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
            </ScrollReveal>
          </div>
        ) : (
          /* ========================================================================= */
          /* AUTHENTICATED: Full Customer Profile Dashboard */
          /* ========================================================================= */
          <div className="space-y-8">
            {/* Top Identity Card */}
            <ScrollReveal animation="fade-up">
              <div className="bg-[#15151B] border border-[#2A2A32] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
                <div className="flex items-center gap-4 sm:gap-6">
                  {/* Cyber Avatar Icon */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-sm bg-[#0A0A0D] border-2 border-[#8B5CF6] flex items-center justify-center text-[#8B5CF6] text-xl font-bold font-display shadow-lg relative shrink-0">
                    <span>{profile?.full_name ? profile.full_name[0].toUpperCase() : 'N'}</span>
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#00D9FF] border-2 border-[#15151B]" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-display text-xl sm:text-2xl font-bold text-white uppercase tracking-wider">
                        {profile?.full_name || 'NYX OPERATOR'}
                      </h2>
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/40">
                        {profile?.role === 'admin' ? 'ADMIN / ARCHITECT' : 'VERIFIED OPERATIVE'}
                      </span>
                    </div>

                    <p className="text-xs text-[#9A9AA3] font-mono-numbers mt-1">
                      {user.email} {profile?.phone ? `· ${profile.phone}` : ''}
                    </p>

                    <p className="text-[11px] text-[#00D9FF] font-mono-numbers mt-1">
                      TIER 1 · SHADOW OPERATOR (ID: {user.id.slice(0, 12)}...)
                    </p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-3 self-start md:self-auto">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => navigateTo('admin')}
                      className="px-4 py-2 bg-[#8B5CF6]/20 hover:bg-[#8B5CF6] border border-[#8B5CF6] text-[#8B5CF6] hover:text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
                    >
                      <Shield size={14} />
                      <span>Admin Center</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={signOut}
                    className="px-4 py-2 bg-[#0A0A0D] hover:bg-red-950/40 border border-[#2A2A32] hover:border-red-700/60 text-[#9A9AA3] hover:text-red-400 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </ScrollReveal>

            {/* Account Navigation Tabs */}
            <div className="flex border-b border-[#2A2A32] bg-[#15151B]/60 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`py-3.5 px-6 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors shrink-0 ${
                  activeTab === 'profile'
                    ? 'border-[#8B5CF6] text-white bg-[#15151B]'
                    : 'border-transparent text-[#9A9AA3] hover:text-white'
                }`}
              >
                <User size={15} />
                <span>Profile & Security</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`py-3.5 px-6 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors shrink-0 ${
                  activeTab === 'orders'
                    ? 'border-[#8B5CF6] text-white bg-[#15151B]'
                    : 'border-transparent text-[#9A9AA3] hover:text-white'
                }`}
              >
                <Package size={15} />
                <span>My Orders ({userOrders.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('addresses')}
                className={`py-3.5 px-6 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors shrink-0 ${
                  activeTab === 'addresses'
                    ? 'border-[#8B5CF6] text-white bg-[#15151B]'
                    : 'border-transparent text-[#9A9AA3] hover:text-white'
                }`}
              >
                <MapPin size={15} />
                <span>Saved Addresses ({addresses.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('wishlist')}
                className={`py-3.5 px-6 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors shrink-0 ${
                  activeTab === 'wishlist'
                    ? 'border-[#8B5CF6] text-white bg-[#15151B]'
                    : 'border-transparent text-[#9A9AA3] hover:text-white'
                }`}
              >
                <Heart size={15} />
                <span>Saved Wishlist ({wishlist.length})</span>
              </button>
            </div>

            {/* TAB CONTENTS */}
            <div className="bg-[#15151B] border border-[#2A2A32] p-6 sm:p-8">
              {dataLoading && (
                <div className="py-16 text-center text-[#9A9AA3] space-y-3">
                  <Loader2 size={28} className="animate-spin mx-auto text-[#8B5CF6]" />
                  <p className="text-xs">Synchronizing encrypted vault database...</p>
                </div>
              )}

              {/* TAB 1: PROFILE & SECURITY */}
              {!dataLoading && activeTab === 'profile' && (
                <div className="max-w-2xl space-y-8">
                  <div>
                    <h3 className="font-display text-lg font-bold text-white uppercase tracking-wider mb-1">
                      Identity Credentials
                    </h3>
                    <p className="text-xs text-[#9A9AA3]">
                      Manage your contact identity for courier dispatch and member announcements.
                    </p>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1.5">
                        Registered Email (Immutable)
                      </label>
                      <input
                        type="email"
                        readOnly
                        value={user.email || ''}
                        className="w-full bg-[#0A0A0D]/70 border border-[#2A2A32] px-4 py-2.5 text-xs text-[#9A9AA3] cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1.5">
                        Operative Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Jordan Vane"
                        className="w-full bg-[#0A0A0D] border border-[#2A2A32] px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1.5">
                        Phone Contact (For Dispatch SMS)
                      </label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="9876543210"
                        className="w-full bg-[#0A0A0D] border border-[#2A2A32] px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-6 py-2.5 bg-[#8B5CF6] hover:bg-[#7c4def] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
                    >
                      {savingProfile && <Loader2 size={13} className="animate-spin" />}
                      <span>Save Profile Changes</span>
                    </button>
                  </form>

                  {/* Password update section */}
                  <div className="pt-8 border-t border-[#2A2A32] space-y-4">
                    <div className="flex items-center gap-2">
                      <KeyRound size={16} className="text-[#00D9FF]" />
                      <h4 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                        Update Security Cipher
                      </h4>
                    </div>

                    <form onSubmit={handleUpdatePasswordFromProfile} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1.5">
                          New Master Password (min 6 characters)
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••••••"
                          value={profileNewPassword}
                          onChange={(e) => setProfileNewPassword(e.target.value)}
                          className="w-full bg-[#0A0A0D] border border-[#2A2A32] px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#00D9FF]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={savingPassword || !profileNewPassword}
                        className="px-6 py-2 bg-[#15151B] hover:bg-[#202029] border border-[#2A2A32] hover:border-[#00D9FF] disabled:opacity-50 text-[#00D9FF] text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
                      >
                        {savingPassword && <Loader2 size={13} className="animate-spin" />}
                        <span>Synchronize New Password</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 2: MY ORDERS */}
              {!dataLoading && activeTab === 'orders' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-display text-lg font-bold text-white uppercase tracking-wider mb-1">
                      Vault Order Records
                    </h3>
                    <p className="text-xs text-[#9A9AA3]">
                      Review all verified purchases, item breakdowns, tracking status, and cryptographic receipts.
                    </p>
                  </div>

                  {userOrders.length === 0 ? (
                    <div className="py-16 text-center border border-[#2A2A32] bg-[#0A0A0D] p-8 space-y-4">
                      <Package size={36} className="mx-auto text-[#9A9AA3]/40" />
                      <h4 className="font-display text-sm font-bold text-white uppercase">
                        No orders recorded yet
                      </h4>
                      <p className="text-xs text-[#9A9AA3] max-w-sm mx-auto">
                        Your hardware collection has not commenced. Explore our cyber crosses, Cuban links, and signet rings.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigateTo('shop')}
                        className="px-6 py-2.5 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-wider transition-colors inline-block"
                      >
                        Explore Catalog
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {userOrders.map((ord) => (
                        <div key={ord.orderId} className="bg-[#0A0A0D] border border-[#2A2A32] p-5 sm:p-6 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#2A2A32] gap-2">
                            <div>
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono-numbers font-bold text-white text-sm">
                                  {ord.orderId}
                                </span>
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/40">
                                  {ord.status}
                                </span>
                              </div>
                              <span className="text-[11px] text-[#9A9AA3] block mt-0.5">
                                Logged on {new Date(ord.createdAt).toLocaleDateString()} at {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <div className="text-left sm:text-right">
                              <span className="font-mono-numbers font-extrabold text-base text-[#00D9FF]">
                                ₹{ord.total.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] text-[#9A9AA3] block uppercase tracking-wider">
                                Payment: {ord.paymentMethod.toUpperCase()}
                              </span>
                            </div>
                          </div>

                          {/* Items Breakdown */}
                          <div className="space-y-2">
                            {ord.items.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs py-1.5">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={item.product.images[0] || '/assets/hero-cross.jpg'}
                                    alt={item.product.name}
                                    className="w-10 h-10 object-cover border border-[#2A2A32] shrink-0"
                                  />
                                  <div>
                                    <span className="font-semibold text-white block">{item.product.name}</span>
                                    <span className="text-[11px] text-[#9A9AA3]">
                                      Qty: {item.quantity} · {item.selectedVariant || 'Standard'}
                                    </span>
                                  </div>
                                </div>

                                <span className="font-mono-numbers text-white font-semibold">
                                  ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Footer Actions */}
                          <div className="pt-3 border-t border-[#2A2A32] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <span className="text-[#9A9AA3]">
                              Dispatch destination: <strong className="text-white">{ord.customer.city}, {ord.customer.state} ({ord.customer.pincode})</strong>
                            </span>

                            <button
                              type="button"
                              onClick={() => navigateTo('order-confirmation', { orderId: ord.orderId })}
                              className="text-[#00D9FF] hover:underline font-semibold flex items-center gap-1 self-start sm:self-auto"
                            >
                              <span>View Receipt & Tracking</span>
                              <ArrowRight size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: SAVED ADDRESSES */}
              {!dataLoading && activeTab === 'addresses' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-lg font-bold text-white uppercase tracking-wider mb-1">
                        Shipping Destinations
                      </h3>
                      <p className="text-xs text-[#9A9AA3]">
                        Stored addresses are automatically offered during 1-click checkout.
                      </p>
                    </div>

                    {!showAddAddress && (
                      <button
                        type="button"
                        onClick={() => setShowAddAddress(true)}
                        className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
                      >
                        <Plus size={14} />
                        <span>Add Address</span>
                      </button>
                    )}
                  </div>

                  {/* Add Address Form */}
                  {showAddAddress && (
                    <form onSubmit={handleAddAddressSubmit} className="bg-[#0A0A0D] border border-[#2A2A32] p-5 sm:p-6 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-[#2A2A32]">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                          New Delivery Location
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowAddAddress(false)}
                          className="text-xs text-[#9A9AA3] hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">Recipient Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="Full Name"
                            value={newAddr.full_name}
                            onChange={(e) => setNewAddr({ ...newAddr, full_name: e.target.value })}
                            className="w-full bg-[#15151B] border border-[#2A2A32] px-3.5 py-2 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">Phone Number *</label>
                          <input
                            type="tel"
                            required
                            placeholder="9876543210"
                            value={newAddr.phone}
                            onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                            className="w-full bg-[#15151B] border border-[#2A2A32] px-3.5 py-2 text-xs text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">Street Address *</label>
                        <input
                          type="text"
                          required
                          placeholder="Flat / Building, Road / Sector"
                          value={newAddr.street_address}
                          onChange={(e) => setNewAddr({ ...newAddr, street_address: e.target.value })}
                          className="w-full bg-[#15151B] border border-[#2A2A32] px-3.5 py-2 text-xs text-white"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">City *</label>
                          <input
                            type="text"
                            required
                            placeholder="City"
                            value={newAddr.city}
                            onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                            className="w-full bg-[#15151B] border border-[#2A2A32] px-3.5 py-2 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">State *</label>
                          <input
                            type="text"
                            required
                            placeholder="State"
                            value={newAddr.state}
                            onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })}
                            className="w-full bg-[#15151B] border border-[#2A2A32] px-3.5 py-2 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">Pincode *</label>
                          <input
                            type="text"
                            required
                            placeholder="Postal Code"
                            value={newAddr.postal_code}
                            onChange={(e) => setNewAddr({ ...newAddr, postal_code: e.target.value })}
                            className="w-full bg-[#15151B] border border-[#2A2A32] px-3.5 py-2 text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="submit"
                          disabled={savingAddress}
                          className="px-5 py-2.5 bg-[#8B5CF6] hover:bg-[#7c4def] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                        >
                          {savingAddress && <Loader2 size={13} className="animate-spin" />}
                          <span>Save Location</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddAddress(false)}
                          className="px-4 py-2.5 border border-[#2A2A32] text-xs text-[#9A9AA3]"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Address List */}
                  {addresses.length === 0 && !showAddAddress ? (
                    <div className="py-12 text-center border border-[#2A2A32] bg-[#0A0A0D] p-6 text-xs text-[#9A9AA3]">
                      No shipping locations stored. Click "+ Add Address" to save your primary destination.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {addresses.map((addr) => (
                        <div key={addr.id} className="bg-[#0A0A0D] border border-[#2A2A32] p-5 flex flex-col justify-between gap-4">
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-sm">{addr.full_name}</span>
                              {addr.is_default && (
                                <span className="px-2 py-0.5 bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/40 text-[9px] font-bold uppercase">
                                  DEFAULT DESTINATION
                                </span>
                              )}
                            </div>
                            <p className="text-[#C7CBD3] leading-relaxed">
                              {addr.street_address}{addr.apartment ? `, ${addr.apartment}` : ''}
                            </p>
                            <p className="text-[#9A9AA3]">
                              {addr.city}, {addr.state} - {addr.postal_code}
                            </p>
                            <p className="text-[#9A9AA3]">Phone: {addr.phone}</p>
                          </div>

                          <div className="pt-3 border-t border-[#2A2A32] flex items-center justify-between text-xs">
                            {!addr.is_default ? (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultAddr(addr.id)}
                                className="text-[#8B5CF6] hover:underline font-semibold"
                              >
                                Set as Default
                              </button>
                            ) : (
                              <span className="text-[11px] text-[#00D9FF] font-semibold">Active Default</span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: SAVED WISHLIST */}
              {!dataLoading && activeTab === 'wishlist' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-lg font-bold text-white uppercase tracking-wider mb-1">
                        Vault Wishlist
                      </h3>
                      <p className="text-xs text-[#9A9AA3]">
                        Hardware pieces saved across your devices and cloud session.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigateTo('shop')}
                      className="text-xs text-[#8B5CF6] hover:underline font-semibold uppercase tracking-wider"
                    >
                      + Browse Catalog
                    </button>
                  </div>

                  {wishlist.length === 0 ? (
                    <div className="py-16 text-center border border-[#2A2A32] bg-[#0A0A0D] p-8 space-y-4">
                      <Heart size={36} className="mx-auto text-[#9A9AA3]/40" />
                      <h4 className="font-display text-sm font-bold text-white uppercase">
                        Your wishlist is empty
                      </h4>
                      <p className="text-xs text-[#9A9AA3] max-w-sm mx-auto">
                        Save chrome pendants, rings, and chains for instant access whenever new drop releases arrive.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigateTo('shop')}
                        className="px-6 py-2.5 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-wider transition-colors inline-block"
                      >
                        Explore Drops
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {wishlist.map((item) => (
                        <div key={item.product.id} className="bg-[#0A0A0D] border border-[#2A2A32] overflow-hidden flex flex-col justify-between">
                          <div className="relative aspect-square w-full bg-[#15151B]">
                            <img
                              src={item.product.images[0] || '/assets/hero-cross.jpg'}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeFromWishlist(item.product.id)}
                              className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-[#9A9AA3] hover:text-red-400 transition-colors"
                              title="Remove"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div className="p-4 space-y-3">
                            <div>
                              <span className="text-[10px] uppercase tracking-widest text-[#8B5CF6] font-semibold">
                                {item.product.category}
                              </span>
                              <h4 className="text-xs font-bold text-white truncate mt-0.5">
                                {item.product.name}
                              </h4>
                              <span className="font-mono-numbers text-sm font-bold text-[#00D9FF]">
                                ₹{item.product.price.toLocaleString('en-IN')}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                addToCart(item.product);
                                openCart();
                              }}
                              className="w-full py-2 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow"
                            >
                              <ShoppingBag size={13} />
                              <span>Move to Bag</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
