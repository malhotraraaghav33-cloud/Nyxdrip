import React, { useEffect, useState } from 'react';
import { Truck, Timer } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { getLaunchOfferRemainingMs } from '../../lib/launchOffer';

const formatCountdown = (remaining: number) => {
  const seconds = Math.ceil(remaining / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(days).padStart(2, '0')}d : ${String(hours).padStart(2, '0')}h : ${String(minutes).padStart(2, '0')}m : ${String(secs).padStart(2, '0')}s`;
};

export const AnnouncementBar: React.FC = () => {
  const { navigateTo } = useNavigation();
  const [remaining, setRemaining] = useState(getLaunchOfferRemainingMs);

  useEffect(() => {
    const update = () => setRemaining(getLaunchOfferRemainingMs());
    const timer = window.setInterval(update, 1000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  if (remaining > 0) {
    return (
      <div className="border-b border-[#8B5CF6]/40 bg-[#170F2C] text-white px-3 py-2 sm:py-2.5">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
          <Truck size={15} className="text-[#00D9FF] shrink-0" aria-hidden="true" />
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.12em]">
            LAUNCH OFFER · FREE STANDARD DELIVERY ON ALL ORDERS
          </span>
          <span className="hidden sm:block w-px h-4 bg-[#8B5CF6]/70" />
          <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-mono-numbers text-[#00D9FF]" role="timer" aria-label={`Launch free delivery ends in ${formatCountdown(remaining)}`}>
            <Timer size={13} aria-hidden="true" />
            <span className="tabular-nums tracking-wider">{formatCountdown(remaining)}</span>
          </span>
          <span className="w-full text-[9px] sm:text-[10px] tracking-wide text-[#C7CBD3]">
            Ends Tuesday, 3 Nov at 2:00 AM IST · Express upgrade ₹150 extra
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#15151B] border-b border-[#2A2A32] text-[#C7CBD3] text-[11px] md:text-xs py-1.5 px-4 text-center tracking-widest uppercase font-medium flex items-center justify-center gap-3">
      <span>FREE STANDARD SHIPPING ON ORDERS ABOVE ₹999</span>
      <span className="w-1 h-1 rounded-full bg-[#8B5CF6]" />
      <button
        onClick={() => navigateTo('shop', { newArrivalsOnly: true } as unknown as object)}
        className="text-[#F5F5F7] underline underline-offset-2 hover:text-[#00D9FF] transition-colors"
      >
        NEW DROP LIVE
      </button>
    </div>
  );
};
