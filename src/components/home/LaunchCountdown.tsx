import React, { useEffect, useState } from 'react';
import { ArrowRight, Sparkles, Truck } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { getLaunchOfferRemainingMs } from '../../lib/launchOffer';

// The promo is time-limited for every visitor regardless of their device's time zone.
// The database uses its own clock to decide shipping charges when an order is placed.
export const LaunchCountdown: React.FC = () => {
  const { navigateTo } = useNavigation();
  const [remaining, setRemaining] = useState(getLaunchOfferRemainingMs);

  useEffect(() => {
    const refresh = () => setRemaining(getLaunchOfferRemainingMs());
    const timer = window.setInterval(refresh, 1000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  if (remaining <= 0) return null;

  const totalSeconds = Math.max(0, Math.ceil(remaining / 1000));
  const blocks = [
    { value: Math.floor(totalSeconds / 86400), label: 'DAYS' },
    { value: Math.floor((totalSeconds % 86400) / 3600), label: 'HOURS' },
    { value: Math.floor((totalSeconds % 3600) / 60), label: 'MINUTES' },
    { value: totalSeconds % 60, label: 'SECONDS' },
  ];

  return (
    <section className="relative isolate overflow-hidden border-y border-[#8B5CF6]/50 bg-[#0D0A18] px-4 py-12 sm:py-16" aria-label="NYXDRIP launch free delivery countdown">
      <div className="absolute -top-28 left-1/4 h-56 w-56 rounded-full bg-[#8B5CF6]/20 blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute -bottom-24 right-1/4 h-56 w-56 rounded-full bg-[#00D9FF]/10 blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="relative mx-auto max-w-5xl text-center">
        <div className="inline-flex items-center gap-2 border border-[#8B5CF6]/50 bg-[#8B5CF6]/15 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#C4B5FD]">
          <Sparkles size={15} aria-hidden="true" />
          LIMITED TIME · LAUNCH SPECIAL
        </div>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Truck size={27} className="text-[#00D9FF]" aria-hidden="true" />
          <h2 className="font-display text-3xl font-black uppercase leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
            FREE <span className="text-[#00D9FF]">DELIVERY</span>
          </h2>
        </div>
        <p className="mt-3 text-sm font-medium text-[#C7CBD3] sm:text-lg">
          On every order. No minimum spend. Standard delivery included.
        </p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-[#A78BFA] sm:text-sm">
          Offer ends Tuesday, 3 November 2026 at 2:00 AM IST
        </p>
        <div className="mx-auto mt-8 grid max-w-2xl grid-cols-4 gap-2 sm:gap-4" role="timer" aria-label="Time left for the NYXDRIP free delivery launch offer">
          {blocks.map(({ value, label }) => (
            <div key={label} className="border border-[#8B5CF6]/40 bg-[#171129] px-1 py-4 shadow-[0_0_24px_rgba(139,92,246,0.10)] sm:py-6">
              <span className="block font-mono-numbers text-3xl font-extrabold tabular-nums leading-none text-white sm:text-5xl md:text-6xl">
                {String(value).padStart(2, '0')}
              </span>
              <span className="mt-3 block text-[9px] font-bold tracking-[0.12em] text-[#A78BFA] sm:text-xs sm:tracking-[0.2em]">{label}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => navigateTo('shop')}
          className="mt-8 inline-flex items-center gap-2 bg-[#8B5CF6] px-8 py-3.5 text-xs font-extrabold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#7C3AED] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00D9FF] sm:text-sm"
        >
          Shop Launch Collection <ArrowRight size={17} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
};
