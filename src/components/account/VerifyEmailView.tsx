import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, Mail, ShieldCheck, ShoppingBag } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { ScrollReveal } from '../common/ScrollReveal';

export const VerifyEmailView: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const { navigateTo } = useNavigation();
  const { items } = useCart();
  const { showToast } = useToast();

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [resendEmail, setResendEmail] = useState<string>('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const performVerification = async () => {
      // 1. Check if Supabase client is configured
      if (!isSupabaseConfigured) {
        setStatus('success');
        return;
      }

      try {
        const url = new URL(window.location.href);
        const searchParams = url.searchParams;

        // Check for error parameters in URL (from Supabase verify redirect)
        const error = searchParams.get('error') || (window.location.hash.includes('error=') ? new URLSearchParams(window.location.hash.substring(1)).get('error') : null);
        const errorDesc = searchParams.get('error_description') || (window.location.hash.includes('error_description=') ? new URLSearchParams(window.location.hash.substring(1)).get('error_description') : null);

        if (error || errorDesc) {
          const formatted = errorDesc ? decodeURIComponent(errorDesc.replace(/\+/g, ' ')) : (error || 'Verification link expired or invalid.');
          setErrorMessage(formatted);
          setStatus('error');
          return;
        }

        // Case A: Token Hash flow (modern Supabase email verification)
        const tokenHash = searchParams.get('token_hash');
        const type = searchParams.get('type') as any || 'signup';

        if (tokenHash) {
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type || 'signup',
          });

          if (verifyError) {
            setErrorMessage(verifyError.message);
            setStatus('error');
            return;
          }

          if (data?.session) {
            await refreshProfile();
            setStatus('success');
            showToast('Email Verified', 'Your email has been verified successfully.', 'success');
            return;
          }
        }

        // Case B: PKCE code parameter
        const code = searchParams.get('code');
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setErrorMessage(exchangeError.message);
            setStatus('error');
            return;
          }
          if (data?.session) {
            await refreshProfile();
            setStatus('success');
            showToast('Email Verified', 'Your email has been verified successfully.', 'success');
            return;
          }
        }

        // Case C: Check existing session in Supabase (from implicit hash token or auto-detected session)
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await refreshProfile();
          setStatus('success');
          return;
        }

        // If user already logged in via context
        if (user) {
          setStatus('success');
          return;
        }

        // If no tokens present and no active session, prompt user
        setErrorMessage('No active verification cipher found in link. If you already verified, please sign in.');
        setStatus('error');
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error('Verification failed');
        setErrorMessage(error.message);
        setStatus('error');
      }
    };

    performVerification();
  }, [refreshProfile, showToast, user]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) {
      showToast('Validation Error', 'Please enter your email address.', 'error');
      return;
    }

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: resendEmail.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/#verify`,
        },
      });

      setIsResending(false);
      if (error) {
        showToast('Resend Failed', error.message, 'error');
      } else {
        setResendSuccess(true);
        showToast('Email Dispatched', 'A new verification email has been sent to your inbox.', 'success');
      }
    } catch {
      setIsResending(false);
      showToast('Error', 'Failed to resend verification email.', 'error');
    }
  };

  return (
    <div className="min-h-[80vh] bg-[#0A0A0D] text-[#F5F5F7] flex items-center justify-center py-16 px-4">
      <div className="max-w-md w-full">
        <ScrollReveal animation="fade-up">
          <div className="bg-[#15151B] border border-[#2A2A32] shadow-2xl p-6 sm:p-8 relative overflow-hidden">
            {/* Ambient cyber glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#8B5CF6]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#00D9FF]/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header Badge */}
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-sm bg-[#0A0A0D] border border-[#2A2A32] flex items-center justify-center relative shadow-inner">
                {status === 'verifying' && (
                  <Loader2 size={28} className="text-[#8B5CF6] animate-spin" />
                )}
                {status === 'success' && (
                  <CheckCircle2 size={30} className="text-[#00D9FF] animate-in zoom-in-75 duration-300" />
                )}
                {status === 'error' && (
                  <AlertCircle size={30} className="text-red-400 animate-in zoom-in-75 duration-300" />
                )}
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
              </div>
            </div>

            {/* Brand Category Tag */}
            <div className="text-center mb-2">
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#00D9FF] font-semibold">
                NYX DRIPSTORE IDENTITY PROTOCOL
              </span>
            </div>

            {/* 1. VERIFYING STATE */}
            {status === 'verifying' && (
              <div className="text-center space-y-4 py-4">
                <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
                  Verifying Your Email
                </h2>
                <p className="text-xs text-[#9A9AA3] leading-relaxed max-w-sm mx-auto">
                  Validating your cryptographic confirmation token with the secure vault. Please hold tight...
                </p>
                <div className="flex items-center justify-center gap-2 text-[11px] text-[#C7CBD3] font-mono-numbers pt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] animate-ping" />
                  <span>Validating signature...</span>
                </div>
              </div>
            )}

            {/* 2. SUCCESS STATE */}
            {status === 'success' && (
              <div className="text-center space-y-5">
                <div>
                  <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
                    Email Verification Complete
                  </h2>
                  <p className="text-xs text-[#9A9AA3] mt-2 leading-relaxed">
                    Your email address has been verified successfully. Your account is now fully active and verified with the NYx DRIPstore vault.
                  </p>
                </div>

                {user?.email && (
                  <div className="p-3 bg-[#0A0A0D] border border-[#2A2A32] text-xs text-[#C7CBD3] flex items-center justify-center gap-2">
                    <ShieldCheck size={14} className="text-[#00D9FF] shrink-0" />
                    <span className="font-mono-numbers truncate">{user.email}</span>
                  </div>
                )}

                <div className="space-y-2.5 pt-2">
                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => navigateTo('checkout')}
                      className="w-full py-3.5 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-lg"
                    >
                      <ShoppingBag size={14} />
                      <span>Proceed to Checkout ({items.length} items)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => navigateTo('account')}
                    className={`w-full py-3 text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${
                      items.length > 0
                        ? 'bg-[#0A0A0D] hover:bg-[#1a1a22] border border-[#2A2A32] text-[#F5F5F7]'
                        : 'bg-[#8B5CF6] hover:bg-[#7c4def] text-white shadow-lg'
                    }`}
                  >
                    <span>View Account Dashboard</span>
                    <ArrowRight size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateTo('shop')}
                    className="w-full py-2.5 text-xs text-[#9A9AA3] hover:text-white transition-colors uppercase tracking-wider"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            )}

            {/* 3. ERROR / EXPIRED STATE */}
            {status === 'error' && (
              <div className="text-center space-y-5">
                <div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-wide text-white">
                    Verification Notice
                  </h2>
                  <p className="text-xs text-red-300/90 mt-2 leading-relaxed bg-red-950/30 border border-red-800/40 p-3">
                    {errorMessage || 'This verification link is invalid, expired, or has already been confirmed.'}
                  </p>
                </div>

                {resendSuccess ? (
                  <div className="p-4 bg-emerald-950/30 border border-emerald-800/50 text-xs text-emerald-300 space-y-1">
                    <p className="font-bold">New Verification Link Sent</p>
                    <p className="text-[#9A9AA3]">Please inspect your email inbox and click the latest confirmation link.</p>
                  </div>
                ) : (
                  <form onSubmit={handleResend} className="space-y-3 pt-1 text-left">
                    <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3]">
                      Resend Verification Link
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-3 text-[#9A9AA3]" />
                      <input
                        type="email"
                        required
                        placeholder="operator@domain.com"
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        className="w-full bg-[#0A0A0D] border border-[#2A2A32] pl-9 pr-3.5 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/50 focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isResending}
                      className="w-full py-2.5 bg-[#8B5CF6] hover:bg-[#7c4def] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                    >
                      {isResending && <Loader2 size={13} className="animate-spin" />}
                      <span>Resend Verification Email</span>
                    </button>
                  </form>
                )}

                <div className="pt-3 border-t border-[#2A2A32] flex gap-2">
                  <button
                    type="button"
                    onClick={() => navigateTo('account')}
                    className="flex-1 py-2.5 bg-[#0A0A0D] hover:bg-[#1a1a22] border border-[#2A2A32] text-xs font-semibold text-[#F5F5F7] uppercase tracking-wider transition-colors"
                  >
                    Go to Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('home')}
                    className="px-4 py-2.5 border border-[#2A2A32] text-xs text-[#9A9AA3] hover:text-white transition-colors"
                  >
                    Home
                  </button>
                </div>
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
};
