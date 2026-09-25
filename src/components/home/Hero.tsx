import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { Magnetic } from '../common/Magnetic';
import heroPoster from '../../assets/images/hero_gothic_accessories_1790341134351.jpg';

export const Hero: React.FC = () => {
  const { navigateTo } = useNavigation();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);

    // Staggered reveal sequence on load
    const timer = setTimeout(() => setIsRevealed(true), 120);

    // Parallax on scroll
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      mediaQuery.removeEventListener('change', listener);
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <section className="relative min-h-[85svh] sm:min-h-screen landscape:min-h-[90svh] landscape:sm:min-h-screen w-full max-w-[100vw] flex items-center justify-center overflow-x-hidden overflow-y-hidden bg-[#0A0A0D] pt-14 pb-10 sm:py-16 lg:py-20 landscape:py-8 landscape:sm:py-12">
      {/* Background Media with Dark Overlay and subtle parallax */}
      <div
        className="absolute inset-0 z-0 w-full h-full overflow-hidden will-change-transform pointer-events-none"
        style={{
          transform: !prefersReducedMotion ? `translate3d(0, ${scrollY * 0.12}px, 0)` : 'none',
        }}
      >
        {/* Poster image fallback always present as foundation */}
        <img
          src={heroPoster}
          alt="Nyxdripstore Dark Gothic Accessories"
          className="w-full h-full object-cover object-center sm:object-[center_35%] filter brightness-40 transform scale-105"
        />

        {/* Video layer if reduced motion is disabled */}
        {!prefersReducedMotion && (
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="none"
            poster={heroPoster}
            onLoadedData={() => setVideoLoaded(true)}
            className={`absolute inset-0 w-full h-full object-cover object-center sm:object-[center_35%] mix-blend-screen opacity-20 pointer-events-none transition-opacity duration-1000 ${
              videoLoaded ? 'opacity-25' : 'opacity-0'
            }`}
          >
            <source src="/assets/hero-product-video.mp4" type="video/mp4" />
          </video>
        )}

        {/* Measured Scrims & Atmospheric Vignette (Section 1.F / 80-15-5 balance) */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0D] via-[#0A0A0D]/75 to-[#0A0A0D]/85 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#0A0A0D_85%)] pointer-events-none" />
      </div>

      {/* Foreground Content with staggered reveals */}
      <div className="relative z-10 w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center py-4 sm:py-10 lg:py-14">
        {/* Small restrained kicker */}
        <div
          className={`flex items-center gap-2 mb-2.5 sm:mb-4 text-[10px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.3em] text-[#C7CBD3] font-semibold transition-all duration-700 ease-out ${
            isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] shrink-0" />
          <span className="whitespace-nowrap">AUTUMN / WINTER 2026 DROP</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] shrink-0" />
        </div>

        {/* Headline Wordmark: Fluid & orientation-aware adaptive typography */}
        <div className="w-full max-w-full overflow-hidden flex items-center justify-center px-1">
          <h1
            className={`hero-wordmark-adaptive font-display font-black tracking-tight uppercase leading-none select-none inline-flex items-center justify-center max-w-full text-center transition-all duration-1000 ease-out delay-150 ${
              isRevealed
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-0 translate-y-6 scale-95'
            }`}
          >
            <span className="animate-metallic-sweep">NYX</span>
            <span className="text-[#8B5CF6]">DRIP</span>
            <span className="animate-metallic-sweep">STORE</span>
          </h1>
        </div>

        {/* Tagline: Responsive & orientation-aware fluid scale */}
        <p
          className={`hero-tagline-adaptive mt-2.5 sm:mt-4 lg:mt-5 font-display font-light text-[#C7CBD3] uppercase transition-all duration-700 ease-out delay-300 max-w-full ${
            isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          WEAR THE NIGHT.
        </p>

        {/* Concise description */}
        <p
          className={`mt-2 sm:mt-3.5 max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl text-[11px] sm:text-xs md:text-sm text-[#9A9AA3] leading-relaxed transition-all duration-700 ease-out delay-400 px-2 ${
            isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Y2K chrome pendants, heavy industrial bracelets, cyber rings, and dark streetwear hardware crafted from surgical-grade alloys.
        </p>

        {/* CTAs with Magnetic Buttons on Desktop, portrait-friendly full-width stack on mobile */}
        <div
          className={`mt-5 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-xs sm:max-w-none px-4 sm:px-0 transition-all duration-700 ease-out delay-500 ${
            isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <Magnetic strength={15}>
            <button
              type="button"
              onClick={() => navigateTo('shop')}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-[11px] sm:text-xs font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2 shadow-xl hover:shadow-[#8B5CF6]/30 active:scale-95 whitespace-nowrap"
            >
              <span>SHOP COLLECTION</span>
              <ArrowRight size={14} />
            </button>
          </Magnetic>

          <Magnetic strength={15}>
            <button
              type="button"
              onClick={() => navigateTo('shop', { newArrivalsOnly: true } as unknown as object)}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 bg-transparent hover:bg-[#15151B] text-[#F5F5F7] border border-[#2A2A32] hover:border-[#C7CBD3] text-[11px] sm:text-xs font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap"
            >
              <Sparkles size={14} className="text-[#00D9FF]" />
              <span>EXPLORE NEW DROPS</span>
            </button>
          </Magnetic>
        </div>

        {/* Micro Trust Indicators: Compact 3-col grid with safe gaps */}
        <div
          className={`mt-8 sm:mt-14 pt-6 sm:pt-8 border-t border-[#2A2A32]/60 grid grid-cols-3 gap-2 sm:gap-8 md:gap-12 w-full max-w-md mx-auto text-center transition-all duration-700 ease-out delay-700 ${
            isRevealed ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div>
            <p className="font-mono-numbers text-xs sm:text-sm md:text-base font-bold text-[#F5F5F7]">316L</p>
            <p className="text-[9px] sm:text-[10px] md:text-[11px] text-[#9A9AA3] uppercase tracking-wider mt-0.5 line-clamp-1">Surgical Steel</p>
          </div>
          <div>
            <p className="font-mono-numbers text-xs sm:text-sm md:text-base font-bold text-[#F5F5F7]">100%</p>
            <p className="text-[9px] sm:text-[10px] md:text-[11px] text-[#9A9AA3] uppercase tracking-wider mt-0.5 line-clamp-1">Tarnish Proof</p>
          </div>
          <div>
            <p className="font-mono-numbers text-xs sm:text-sm md:text-base font-bold text-[#00D9FF]">FREE</p>
            <p className="text-[9px] sm:text-[10px] md:text-[11px] text-[#9A9AA3] uppercase tracking-wider mt-0.5 line-clamp-1">Pan-India Delivery</p>
          </div>
        </div>
      </div>
    </section>
  );
};
