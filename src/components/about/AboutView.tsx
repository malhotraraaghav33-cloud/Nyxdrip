import React from 'react';
import { ArrowRight, ShieldCheck, Flame, Compass } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { ScrollReveal } from '../common/ScrollReveal';
import { Magnetic } from '../common/Magnetic';
import heroImg from '../../assets/images/hero_gothic_accessories_1790341134351.jpg';

export const AboutView: React.FC = () => {
  const { navigateTo } = useNavigation();

  return (
    <div className="min-h-screen bg-[#0A0A0D] text-[#F5F5F7] py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Banner */}
        <ScrollReveal animation="fade-up">
          <div className="max-w-3xl">
            <span className="text-xs uppercase tracking-[0.3em] text-[#8B5CF6] font-semibold">
              ORIGIN MANIFESTO
            </span>
            <h1 className="font-display text-4xl sm:text-6xl font-black uppercase tracking-tight mt-2 text-balance">
              BORN IN THE SHADOWS OF STREET CULTURE.
            </h1>
            <p className="mt-6 text-sm sm:text-base text-[#9A9AA3] leading-relaxed">
              Nyxdripstore was founded on a singular conviction: contemporary jewelry had become docile, fragile, and uninspired. We sculpt hardware for those who operate after midnight — fusing the rebellious spirit of early-2000s cyber culture, raw gothic brutalism, and uncompromising metallurgic craftsmanship.
            </p>
          </div>
        </ScrollReveal>

        {/* Cinematic Split Layout */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center">
          <ScrollReveal animation="slide-right" delay={100}>
            <div className="aspect-[4/3] bg-[#15151B] border border-[#2A2A32] overflow-hidden group">
              <img
                src={heroImg}
                alt="Nyxdrip Metal Workshop"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover filter brightness-75 group-hover:scale-105 transition-transform duration-700"
              />
            </div>
          </ScrollReveal>

          <ScrollReveal animation="slide-left" delay={150}>
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-[#00D9FF] font-semibold">
                <Compass size={16} />
                <span>THE ARCHITECTURAL CORE</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase text-[#F5F5F7]">
                SURGICAL ALLOYS OVER DISPOSABLE FASHION.
              </h2>
              <p className="text-xs sm:text-sm text-[#9A9AA3] leading-relaxed">
                Every cross, link, and spike band in our catalog is engineered from solid 316L surgical steel, high-density titanium composites, or solid sterling silver. We reject cheap zinc alloy die-casting that turns green within weeks.
              </p>
              <p className="text-xs sm:text-sm text-[#9A9AA3] leading-relaxed">
                Our triple-vacuum PVD chrome immersion process bonds atom-thin titanium-nitride coats that are completely hypoallergenic, sweat-proof, and tarnish-resistant for life.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#2A2A32]">
                <div>
                  <p className="font-mono-numbers text-xl font-bold text-[#F5F5F7]">0%</p>
                  <p className="text-xs text-[#9A9AA3] mt-0.5">Nickel / Harmful Toxins</p>
                </div>
                <div>
                  <p className="font-mono-numbers text-xl font-bold text-[#8B5CF6]">316L</p>
                  <p className="text-xs text-[#9A9AA3] mt-0.5">Medical-Grade Steel</p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Pillars */}
        <div className="mt-24 pt-16 border-t border-[#2A2A32]">
          <ScrollReveal animation="fade-up">
            <h3 className="text-xs uppercase tracking-widest text-[#8B5CF6] font-semibold mb-8 text-center">
              THE THREE PILLARS OF NYXDRIP
            </h3>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <ScrollReveal animation="fade-up" delay={50}>
              <div className="p-8 bg-[#15151B] border border-[#2A2A32] hover:border-[#8B5CF6]/50 space-y-3 transition-colors group">
                <div className="w-10 h-10 rounded-sm bg-[#0A0A0D] border border-[#2A2A32] flex items-center justify-center text-[#8B5CF6] group-hover:scale-110 transition-transform">
                  <Flame size={20} />
                </div>
                <h4 className="font-display text-base font-bold text-[#F5F5F7] uppercase">
                  Y2K Gothic Synergy
                </h4>
                <p className="text-xs text-[#9A9AA3] leading-relaxed">
                  Drawing inspiration from retrofuturistic anime, industrial club culture, and medieval cathedral stone masonry.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={150}>
              <div className="p-8 bg-[#15151B] border border-[#2A2A32] hover:border-[#00D9FF]/50 space-y-3 transition-colors group">
                <div className="w-10 h-10 rounded-sm bg-[#0A0A0D] border border-[#2A2A32] flex items-center justify-center text-[#00D9FF] group-hover:scale-110 transition-transform">
                  <ShieldCheck size={20} />
                </div>
                <h4 className="font-display text-base font-bold text-[#F5F5F7] uppercase">
                  Forever Tarnish-Proof
                </h4>
                <p className="text-xs text-[#9A9AA3] leading-relaxed">
                  Built to withstand swimming, workouts, humidity, and constant daily wear without discoloration or skin irritation.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={250}>
              <div className="p-8 bg-[#15151B] border border-[#2A2A32] hover:border-[#C7CBD3]/50 space-y-3 transition-colors group">
                <div className="w-10 h-10 rounded-sm bg-[#0A0A0D] border border-[#2A2A32] flex items-center justify-center text-[#C7CBD3] group-hover:scale-110 transition-transform">
                  <Compass size={20} />
                </div>
                <h4 className="font-display text-base font-bold text-[#F5F5F7] uppercase">
                  Zero Mass-Replication
                </h4>
                <p className="text-xs text-[#9A9AA3] leading-relaxed">
                  Each collection is pressed in strictly numbered micro-batches. Once an archive vault closes, it never re-enters standard circulation.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>

        {/* CTA */}
        <ScrollReveal animation="scale-in" delay={100}>
          <div className="mt-20 p-8 sm:p-12 bg-[#15151B] border border-[#2A2A32] text-center space-y-4">
            <h3 className="font-display text-2xl font-bold uppercase text-[#F5F5F7]">
              READY TO ASSEMBLE YOUR FIT?
            </h3>
            <p className="text-xs sm:text-sm text-[#9A9AA3] max-w-md mx-auto">
              Discover our flagship drop pieces and join thousands of darkwear creators worldwide.
            </p>
            <div className="pt-2 flex justify-center">
              <Magnetic strength={14}>
                <button
                  onClick={() => navigateTo('shop')}
                  className="px-8 py-3.5 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-widest inline-flex items-center gap-2 transition-all shadow-xl active:scale-95"
                >
                  <span>Explore The Vault</span>
                  <ArrowRight size={14} />
                </button>
              </Magnetic>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
};
