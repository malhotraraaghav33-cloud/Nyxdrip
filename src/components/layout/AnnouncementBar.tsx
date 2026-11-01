import React, { useEffect, useState } from 'react';
import { Truck, Timer } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { formatLaunchOfferCountdown, getLaunchOfferRemainingMs } from '../../utils/launchOffer';

export const AnnouncementBar: React.FC = () => {
  const { navigateTo } = useNavigation();
  const [remainingMs, setRemainingMs] = useState(getLaunchOfferRemainingMs);

  useEffect(() => {
    const update = () => setRemainingMs(getLaunchOfferRemainingMs());
    const interval = window.setInterval(update, 1000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  if (remainingMs > 0) {
    return (
      <div className="relative bg-[#120D1D] border-b border-[#8B5CF6]/50 text-[#F5F5F7] px-3 py-2 sm:py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
          <Truck size={16} className="text-[#00D9FF] shrink-0" aria-hidden="true" />
          <span className="text-[10px] sm:text-xs font-bold tracking-[0.08em] sm:tracking-[0.13em] uppercase">
            Launch Special <span className="text-[#00D9FF]">Free Standard Delivery</span>
          </span>
          <span className="hidden sm:block h-4 w-px bg-[#8B5CF6]/60" aria-hidden="true" />
          <div className="flex items-center gap-2">
            <Timer size={14} className="text-[#8B5CF6]" aria-hidden="true" />
            <span className="text-[10px] sm:text-xs text-[#C7CBD3] font-semibold">Ends Tue, 3 Nov · 2 AM IST</span>
            <span className="font-mono-numbers tabular-nums text-[11px] sm:text-sm font-black text-white tracking-wider rounded-sm border border-[#8B5CF6]/50 bg-[#8B5CF6]/20 px-2 py-0.5" role="timer" aria-label="Time left for free standard delivery">
              {formatLaunchOfferCountdown(remainingMs)}
            </span>
          </div>
          <button type="button" onClick={() => navigateTo('shop')} className="text-[10px] sm:text-xs font-bold uppercase underline underline-offset-4 decoration-[#8B5CF6] hover:text-[#00D9FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00D9FF]">
            Shop Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#15151B] border-b border-[#2A2A32] text-[#C7CBD3] text-[11px] md:text-xs py-1.5 px-4 text-center tracking-widest uppercase font-medium flex items-center justify-center gap-3">
      <span>FREE STANDARD SHIPPING ON ORDERS ABOVE ₹999</span>
      <span className="w-1 h-1 rounded-full bg-[#8B5CF6]" />
      <button
        type="button"
        onClick={() => navigateTo('shop', { newArrivalsOnly: true } as unknown as object)}
        className="text-[#F5F5F7] underline underline-offset-2 hover:text-[#00D9FF] transition-colors"
      >
        NEW DROP LIVE
      </button>
    </div>
  );
};
