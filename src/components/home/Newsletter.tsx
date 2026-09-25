import React, { useState } from 'react';
import { Mail, Check, Shield } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { ScrollReveal } from '../common/ScrollReveal';

export const Newsletter: React.FC = () => {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setIsSubscribed(true);
    showToast('VIP Access Granted', 'Check your inbox for 10% off your first drop.', 'success');
  };

  return (
    <section className="py-20 sm:py-24 bg-[#0A0A0D] border-b border-[#2A2A32] relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <ScrollReveal animation="fade-up">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#15151B] border border-[#2A2A32] flex items-center justify-center text-[#8B5CF6] mb-5">
            <Mail size={20} />
          </div>

          <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-[#F5F5F7] tracking-tight uppercase">
            ENTER THE NIGHT
          </h2>

          <p className="mt-3 text-xs sm:text-sm text-[#9A9AA3] max-w-md mx-auto leading-relaxed">
            Get notified about new drops, limited pieces and exclusive releases. Never miss a low-stock archive launch.
          </p>
        </ScrollReveal>

        <ScrollReveal animation="scale-in" delay={150}>
          {isSubscribed ? (
            <div className="mt-8 p-4 bg-[#15151B] border border-[#8B5CF6]/50 max-w-md mx-auto flex items-center justify-center gap-3 text-sm text-[#F5F5F7] animate-in fade-in">
              <div className="w-5 h-5 rounded-full bg-[#8B5CF6] flex items-center justify-center text-white">
                <Check size={13} />
              </div>
              <span>You're in. Welcome to the Nyxdrip Syndicate.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 max-w-md mx-auto">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  className="flex-1 bg-[#15151B] border border-[#2A2A32] focus:border-[#8B5CF6] text-xs text-[#F5F5F7] placeholder-[#9A9AA3] px-4 py-3 focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap active:scale-95"
                >
                  Join Syndicate
                </button>
              </div>
              {error && (
                <p className="text-[11px] text-red-400 mt-2 text-left">{error}</p>
              )}
            </form>
          )}

          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[#9A9AA3]">
            <Shield size={12} className="text-[#00D9FF]" />
            <span>No spam. Strict unsubscribe policy.</span>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
