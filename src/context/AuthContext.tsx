import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useToast } from './ToastContext';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: 'customer' | 'admin';
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  isRecoveryMode: boolean;
  setIsRecoveryMode: (val: boolean) => void;
  signUp: (email: string, password: string, fullName?: string, phone?: string) => Promise<{ error: AuthError | Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(() => {
    return window.location.hash.includes('type=recovery') || window.location.hash.includes('reset-password');
  });

  // Handle OAuth code exchange and URL callbacks on initial mount
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const handleUrlCallbacks = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        // Check for error in query or hash
        if (error || errorDescription) {
          const msg = errorDescription || error || 'Authentication process encountered an error.';
          showToast('Sign In Notice', msg, 'error');
          // Clean error params from URL without reload
          url.searchParams.delete('error');
          url.searchParams.delete('error_description');
          url.searchParams.delete('error_code');
          window.history.replaceState(null, '', url.pathname + url.search + url.hash);
          return;
        }

        // Exchange PKCE code if present
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.warn('Code exchange note:', exchangeError.message);
          } else if (data?.session) {
            setSession(data.session);
            setUser(data.session.user);
            showToast('Sign In', 'Signed in successfully with Google.', 'success');

            // Redirect to stored destination if available
            try {
              const target = sessionStorage.getItem('nyx_auth_redirect');
              if (target) {
                sessionStorage.removeItem('nyx_auth_redirect');
                window.location.hash = `#${target}`;
              }
            } catch {
              // ignore
            }
          }
          // Clean code from URL
          url.searchParams.delete('code');
          window.history.replaceState(null, '', url.pathname + url.search + url.hash);
        }
      } catch (e) {
        console.warn('Callback handler note:', e);
      }
    };

    handleUrlCallbacks();
  }, [showToast]);

  // Fetch or create profile row in public.profiles
  const fetchProfile = useCallback(async (userId: string, userEmail: string): Promise<UserProfile | null> => {
    if (!isSupabaseConfigured) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('Profile fetch note:', error.message);
      }

      if (data) {
        return data as UserProfile;
      }

      // If profile row doesn't exist yet, insert a fallback
      const fallbackProfile: Partial<UserProfile> = {
        id: userId,
        email: userEmail,
        full_name: userEmail.split('@')[0],
        role: 'customer',
      };

      const { data: inserted, error: insertError } = await supabase
        .from('profiles')
        .insert(fallbackProfile)
        .select()
        .single();

      if (!insertError && inserted) {
        return inserted as UserProfile;
      }

      return fallbackProfile as UserProfile;
    } catch (err) {
      console.warn('Error querying profile:', err);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const p = await fetchProfile(user.id, user.email || '');
      setProfile(p);
    }
  }, [user, fetchProfile]);

  // Listen to Supabase Auth State changes & initialize session
  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    // 1. Initial session check
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!mounted) return;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        const p = await fetchProfile(initialSession.user.id, initialSession.user.email || '');
        if (mounted) setProfile(p);
      }
      if (mounted) setIsLoading(false);
    }).catch(() => {
      if (mounted) setIsLoading(false);
    });

    // 2. Auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
        showToast('Password Recovery Active', 'Please enter your new master password.', 'info');
      }

      if (newSession?.user) {
        const p = await fetchProfile(newSession.user.id, newSession.user.email || '');
        if (mounted) setProfile(p);
      } else {
        if (mounted) setProfile(null);
      }
      if (mounted) setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, showToast]);

  const signUp = async (email: string, password: string, fullName?: string, phone?: string) => {
    if (!isSupabaseConfigured) {
      // Local fallback simulation when env vars not yet configured
      const mockId = 'mock-' + Math.random().toString(36).substring(2, 9);
      const mockUser = {
        id: mockId,
        email,
        app_metadata: {},
        user_metadata: { full_name: fullName || email.split('@')[0], phone },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as unknown as User;
      const mockProfile: UserProfile = {
        id: mockId,
        email,
        full_name: fullName || email.split('@')[0],
        phone: phone || null,
        avatar_url: null,
        role: 'customer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setUser(mockUser);
      setProfile(mockProfile);
      showToast('Account Created', 'Welcome to NYx DRIPstore.', 'success');
      return { error: null };
    }

    try {
      const cleanEmail = email.trim();
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName?.trim() || cleanEmail.split('@')[0],
            phone: phone?.trim() || null,
            role: 'customer',
          },
          emailRedirectTo: `${window.location.origin}/#verify`,
        },
      });

      if (error) {
        let msg = error.message;
        if (msg.toLowerCase().includes('already registered')) {
          msg = 'This email is already registered. Please sign in instead.';
        }
        showToast('Registration Error', msg, 'error');
        return { error: new Error(msg) };
      }

      if (data.user) {
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: cleanEmail,
            full_name: fullName?.trim() || cleanEmail.split('@')[0],
            phone: phone?.trim() || null,
            role: 'customer',
          });
        } catch {
          // Profile safeguard
        }

        if (data.session) {
          showToast('Account Created', 'Welcome to NYx DRIPstore.', 'success');
        } else {
          showToast('Verify Your Email', 'A verification email has been dispatched. Please confirm to complete activation.', 'info');
        }
      }

      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Signup failed');
      showToast('Error', error.message, 'error');
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      // Local fallback simulation
      const mockId = 'mock-' + Math.random().toString(36).substring(2, 9);
      const mockUser = {
        id: mockId,
        email,
        app_metadata: {},
        user_metadata: { full_name: email.split('@')[0] },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as unknown as User;
      const mockProfile: UserProfile = {
        id: mockId,
        email,
        full_name: email.split('@')[0],
        phone: null,
        avatar_url: null,
        role: 'customer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setUser(mockUser);
      setProfile(mockProfile);
      showToast('Signed In', `Welcome back, ${email.split('@')[0]}.`, 'success');
      return { error: null };
    }

    try {
      const cleanEmail = email.trim();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        let msg = error.message;
        if (msg.toLowerCase().includes('invalid login credentials')) {
          msg = 'Incorrect email or password. Please verify your credentials.';
        } else if (msg.toLowerCase().includes('email not confirmed')) {
          msg = 'Please verify your email before signing in. Check your inbox for the verification link.';
        }
        showToast('Sign In Error', msg, 'error');
        return { error: new Error(msg) };
      }

      if (data.user) {
        showToast('Signed In', `Welcome back, ${data.user.email?.split('@')[0]}.`, 'success');
      }

      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Sign in failed');
      showToast('Error', error.message, 'error');
      return { error };
    }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      setUser(null);
      setSession(null);
      setProfile(null);
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        showToast('Sign Out Error', error.message, 'error');
        return { error };
      }
      setUser(null);
      setSession(null);
      setProfile(null);
      showToast('Signed Out', 'You have been signed out successfully.', 'info');
      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Sign out failed');
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured) {
      showToast('Reset Email Sent', 'Password reset instructions sent to your email (sandbox mode).', 'info');
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/#reset-password`,
      });

      if (error) {
        showToast('Reset Failed', error.message, 'error');
        return { error };
      }

      showToast('Password Reset', 'Check your email for password reset instructions.', 'info');
      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Password reset failed');
      showToast('Error', error.message, 'error');
      return { error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    if (!isSupabaseConfigured) {
      setIsRecoveryMode(false);
      showToast('Password Updated', 'Your master password has been reset securely.', 'success');
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        showToast('Update Failed', error.message, 'error');
        return { error };
      }

      setIsRecoveryMode(false);
      showToast('Password Updated', 'Your master password has been reset securely.', 'success');
      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Password update failed');
      showToast('Error', error.message, 'error');
      return { error };
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      return { error: new Error('Not logged in') };
    }

    if (!isSupabaseConfigured) {
      setProfile((prev) => prev ? { ...prev, ...updates } : null);
      showToast('Profile Updated', 'Your profile details have been saved.', 'success');
      return { error: null };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        showToast('Update Failed', error.message, 'error');
        return { error };
      }

      await refreshProfile();
      showToast('Profile Updated', 'Your profile details have been saved.', 'success');
      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Update profile failed');
      showToast('Error', error.message, 'error');
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      const err = new Error('Supabase live backend required for Google Sign In.');
      showToast('Google Sign In', err.message, 'info');
      return { error: err };
    }

    try {
      // Use origin without fragment for Google OAuth compatibility
      const redirectUri = window.location.origin;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        showToast('Google Sign In Error', error.message, 'error');
        return { error };
      }

      if (!data?.url) {
        const err = new Error('Could not initiate Google Sign In.');
        showToast('Google Sign In Error', err.message, 'error');
        return { error: err };
      }

      // Check if provider is enabled on Supabase to prevent unhandled raw Cloudflare JSON error screen
      try {
        const res = await fetch(data.url, { method: 'GET' });
        if (!res.ok) {
          let customMsg = 'Google Sign In is currently unavailable. Please sign in with your email and password.';
          try {
            const errJson = await res.json();
            if (errJson?.msg && errJson.msg.toLowerCase().includes('not enabled')) {
              customMsg = 'Google Sign In provider is not enabled in your Supabase Auth configuration. Please sign in using email and password.';
            } else if (errJson?.msg) {
              customMsg = errJson.msg;
            }
          } catch {
            // non-json body
          }
          const err = new Error(customMsg);
          showToast('Google Sign In', customMsg, 'error');
          return { error: err };
        }
      } catch {
        // Fetch might be blocked by CORS or redirect on some browsers; continue to redirect
      }

      // Save redirect target
      try {
        const currentHash = window.location.hash.replace(/^#\/?/, '');
        if (currentHash === 'checkout') {
          sessionStorage.setItem('nyx_auth_redirect', 'checkout');
        } else {
          sessionStorage.setItem('nyx_auth_redirect', 'account');
        }
      } catch {
        // ignore
      }

      // Perform redirect
      if (window.top && window.top !== window) {
        try {
          window.top.location.href = data.url;
        } catch {
          window.location.href = data.url;
        }
      } else {
        window.location.href = data.url;
      }

      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Google Sign In failed');
      showToast('Google Sign In', error.message, 'error');
      return { error };
    }
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        isLoading,
        isConfigured: isSupabaseConfigured,
        isRecoveryMode,
        setIsRecoveryMode,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
        updateProfile,
        signInWithGoogle,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
