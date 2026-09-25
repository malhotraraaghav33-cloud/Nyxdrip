import React, { useEffect, useState } from 'react';

interface BrandLoaderProps {
  onComplete?: () => void;
}

export const BrandLoader: React.FC<BrandLoaderProps> = ({ onComplete }) => {
  const [fadeState, setFadeState] = useState<'entering' | 'holding' | 'leaving' | 'done'>('entering');

  useEffect(() => {
    // Check if session has already seen loader
    const hasSeen = sessionStorage.getItem('nyxdrip_intro_shown');
    if (hasSeen) {
      setFadeState('done');
      onComplete?.();
      return;
    }

    const t1 = setTimeout(() => setFadeState('holding'), 400);
    const t2 = setTimeout(() => setFadeState('leaving'), 1100);
    const t3 = setTimeout(() => {
      setFadeState('done');
      sessionStorage.setItem('nyxdrip_intro_shown', 'true');
      onComplete?.();
    }, 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  if (fadeState === 'done') return null;

  return (
    <div
      className={`fixed inset-0 z-[10000] bg-[#0A0A0D] flex flex-col items-center justify-center transition-opacity duration-500 pointer-events-none select-none ${
        fadeState === 'leaving' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="relative flex flex-col items-center">
        {/* Animated Wordmark */}
        <div className="overflow-hidden">
          <h1
            className={`font-display text-4xl sm:text-5xl font-black tracking-widest text-[#F5F5F7] uppercase transform transition-transform duration-700 ease-out ${
              fadeState === 'entering' ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
            }`}
          >
            NYX<span className="text-[#8B5CF6]">DRIP</span>STORE
          </h1>
        </div>

        {/* Ambient fine silver laser beam sweep */}
        <div className="w-32 h-[1px] bg-[#2A2A32] mt-4 relative overflow-hidden">
          <div
            className={`absolute inset-0 bg-gradient-to-r from-transparent via-[#00D9FF] to-transparent transform transition-transform duration-1000 ease-in-out ${
              fadeState === 'entering' ? '-translate-x-full' : 'translate-x-full'
            }`}
          />
        </div>

        <p className="font-display text-[10px] tracking-[0.3em] text-[#9A9AA3] uppercase mt-3 opacity-80">
          WEAR THE NIGHT
        </p>
      </div>
    </div>
  );
};
