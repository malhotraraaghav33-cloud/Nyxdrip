import React, { useState, useEffect } from 'react';
import { Shield, Lock, Mail, Eye, EyeOff, ArrowLeft, AlertTriangle, CheckCircle2, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { useToast } from '../../context/ToastContext';

export const AdminLoginView: React.FC = () => {
  const { user, profile, isAdmin, isLoading, refreshProfile } = useAuth();
  const { navigateTo } = useNavigation();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot password modal
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // If already authenticated as admin, automatically redirect to /admin/dashboard
  useEffect(() => {
    if (!isLoading && user && isAdmin) {
      navigateTo('admin-dashboard');
    }
  }, [user, isAdmin, isLoading, navigateTo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage('Please provide both administrative email and master password.');
      return;
    }

    if (!isSupabaseConfigured) {
      setErrorMessage('Supabase is not configured yet. Please check your environment variables.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Authenticate with Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError) {
        let msg = authError.message;
        if (msg.toLowerCase().includes('invalid login credentials')) {
          msg = 'Invalid administrative credentials. Please verify your email and password.';
        }
        setErrorMessage(msg);
        showToast('Login Failed', msg, 'error');
        setSubmitting(false);
        return;
      }

      if (!data.user) {
        setErrorMessage('Authentication failed. No user record returned.');
        setSubmitting(false);
        return;
      }

      // 2. Query database-backed authorization in public.profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.warn('Profile role check note:', profileError.message);
      }

      const userRole = profileData?.role || data.user.user_metadata?.role;

      // 3. Security Role Check: Strictly ensure role is 'admin'
      if (userRole !== 'admin') {
        // Immediately terminate session for non-admin accounts
        await supabase.auth.signOut();
        setErrorMessage(
          'Access Denied: This account is not registered with administrative clearance. Only authorized administrators can access this vault.'
        );
        showToast('Unauthorized Role', 'Admin role required to enter dashboard.', 'error');
        setSubmitting(false);
        return;
      }

      // Success
      await refreshProfile();
      showToast('Clearance Verified', `Welcome to Nyxdrip Vault, ${data.user.email?.split('@')[0]}.`, 'success');
      navigateTo('admin-dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected authentication error occurred.';
      setErrorMessage(msg);
      showToast('Authentication Error', msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      showToast('Input Required', 'Please enter your administrator email address.', 'error');
      return;
    }

    setResetSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/admin/login`,
      });

      if (error) {
        showToast('Reset Error', error.message, 'error');
      } else {
        setResetSuccess(true);
        showToast('Recovery Link Dispatched', 'Check your inbox for password reset instructions.', 'success');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send recovery email.';
      showToast('Error', msg, 'error');
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0D] text-[#F5F5F7] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background cybernetic grid aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#8B5CF6]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 left-10 w-72 h-72 bg-[#00D9FF]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navigation Back to Store */}
      <div className="w-full max-w-md mb-6 flex items-center justify-between z-10">
        <button
          type="button"
          onClick={() => navigateTo('home')}
          className="text-xs uppercase tracking-widest text-[#9A9AA3] hover:text-[#00D9FF] flex items-center gap-2 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Return to Storefront</span>
        </button>
        <span className="text-[10px] uppercase tracking-widest font-mono-numbers text-[#8B5CF6]">
          VAULT SECURE v2.4
        </span>
      </div>

      {/* Main Admin Card */}
      <div className="w-full max-w-md bg-[#15151B] border border-[#2A2A32] p-8 sm:p-10 shadow-2xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#1B1B22] border border-[#8B5CF6]/40 flex items-center justify-center text-[#8B5CF6] mb-4 shadow-lg shadow-[#8B5CF6]/10">
            <Shield size={26} />
          </div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#00D9FF] font-semibold block mb-1">
            OPERATIONAL VAULT
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-black uppercase text-white tracking-tight">
            ADMINISTRATOR ACCESS
          </h1>
          <p className="text-xs text-[#9A9AA3] mt-2">
            Restricted entry for verified NYXDRIP store operators.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-3.5 bg-red-950/40 border border-red-800/70 text-red-300 text-xs flex items-start gap-3">
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email field */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#9A9AA3] font-semibold mb-2">
              Operator Email
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A9AA3]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@nyxdrip.store"
                autoComplete="email"
                className="w-full bg-[#0A0A0D] border border-[#2A2A32] focus:border-[#8B5CF6] text-xs text-white placeholder-[#9A9AA3]/50 pl-10 pr-4 py-3 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[11px] uppercase tracking-wider text-[#9A9AA3] font-semibold">
                Master Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setIsForgotModalOpen(true);
                }}
                className="text-[11px] text-[#8B5CF6] hover:text-[#00D9FF] transition-colors"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A9AA3]" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                className="w-full bg-[#0A0A0D] border border-[#2A2A32] focus:border-[#8B5CF6] text-xs text-white placeholder-[#9A9AA3]/50 pl-10 pr-10 py-3 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9A9AA3] hover:text-white transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-[#8B5CF6] hover:bg-[#7c4def] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#8B5CF6]/25 active:scale-[0.99] cursor-pointer"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying Clearance...</span>
              </span>
            ) : (
              <>
                <KeyRound size={15} />
                <span>Unlock Operational Vault</span>
              </>
            )}
          </button>
        </form>

        {/* First Admin Guide Accordion / Info Box */}
        <div className="mt-8 pt-6 border-t border-[#2A2A32] text-left">
          <p className="text-[11px] font-semibold text-[#C7CBD3] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF]" />
            First Admin Account Setup
          </p>
          <div className="bg-[#0A0A0D] border border-[#2A2A32] p-3 text-[11px] text-[#9A9AA3] space-y-1.5">
            <p className="text-[#C7CBD3]">To designate an account as Admin:</p>
            <p>1. Sign up or login with your email through the normal storefront account page.</p>
            <p>2. In your <strong>Supabase SQL Editor</strong>, run:</p>
            <pre className="text-[10px] text-[#00D9FF] bg-[#15151B] p-2 overflow-x-auto select-all font-mono-numbers">
              {`UPDATE public.profiles\nSET role = 'admin'\nWHERE email = 'YOUR_EMAIL@domain.com';`}
            </pre>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#15151B] border border-[#2A2A32] p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A2A32]">
              <h3 className="font-display text-base font-bold text-white uppercase flex items-center gap-2">
                <KeyRound size={16} className="text-[#8B5CF6]" />
                <span>Admin Password Recovery</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsForgotModalOpen(false);
                  setResetSuccess(false);
                }}
                className="text-[#9A9AA3] hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {resetSuccess ? (
              <div className="p-4 bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs space-y-3">
                <div className="flex items-center gap-2 font-bold text-emerald-200">
                  <CheckCircle2 size={16} />
                  <span>Recovery Dispatched</span>
                </div>
                <p className="leading-relaxed">
                  A password reset link has been dispatched to <strong>{resetEmail}</strong>. Follow the link in your email to configure a new master password.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotModalOpen(false);
                    setResetSuccess(false);
                  }}
                  className="w-full py-2 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <p className="text-xs text-[#9A9AA3] leading-relaxed">
                  Enter your registered administrator email address. A secure recovery authorization link will be dispatched via Supabase Auth.
                </p>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#9A9AA3] font-semibold mb-1.5">
                    Admin Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="admin@nyxdrip.store"
                    className="w-full bg-[#0A0A0D] border border-[#2A2A32] focus:border-[#8B5CF6] text-xs text-white px-3.5 py-2.5 focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="px-4 py-2 border border-[#2A2A32] text-xs font-semibold text-[#9A9AA3] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetSubmitting}
                    className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#7c4def] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
                  >
                    {resetSubmitting ? 'Sending...' : 'Send Recovery Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
