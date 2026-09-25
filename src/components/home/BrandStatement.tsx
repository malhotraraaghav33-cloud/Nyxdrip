import React from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { ScrollReveal } from '../common/ScrollReveal';

export const BrandStatement: React.FC = () => {
  const { navigateTo } = useNavigation();

  return (
    <section className="py-28 sm:py-36 bg-[#0A0A0D] border-b border-[#2A2A32] relative overflow-hidden">
      {/* Subtle atmospheric linear aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#8B5CF6]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <ScrollReveal animation="fade-up">
          <span className="text-xs uppercase tracking-[0.3em] text-[#00D9FF] font-semibold mb-6 inline-block">
            OUR MANIFESTO
          </span>

          <h2
            className="brand-statement-heading font-display font-black text-[#F5F5F7] tracking-tight uppercase leading-[0.95] max-w-full"
          >
            NOT MADE TO <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F5F5F7] via-[#C7CBD3] to-[#8B5CF6]">
              BLEND IN.
            </span>
          </h2>
        </ScrollReveal>

        <ScrollReveal animation="fade-up" delay={150}>
          <p className="mt-8 text-base sm:text-xl md:text-2xl text-[#C7CBD3] font-light tracking-wide max-w-2xl mx-auto leading-relaxed">
            Accessories for people who build their own aesthetic.
          </p>

          <p className="mt-4 text-xs sm:text-sm text-[#9A9AA3] max-w-xl mx-auto leading-relaxed">
            We reject disposable fast-fashion alloy plating. Every link, pendant, and ring is molded in corrosion-immune steel and sealed against the elements.
          </p>

          <div className="mt-10">
            <button
              type="button"
              onClick={() => navigateTo('about')}
              className="text-xs uppercase font-bold tracking-widest text-[#F5F5F7] underline underline-offset-8 decoration-[#8B5CF6] hover:text-[#00D9FF] hover:decoration-[#00D9FF] transition-colors"
            >
              Read Our Underground Story →
            </button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
