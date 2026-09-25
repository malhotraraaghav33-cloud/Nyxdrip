import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { CATEGORIES_DATA } from '../../data/products';
import { useNavigation } from '../../context/NavigationContext';
import { ScrollReveal } from '../common/ScrollReveal';

export const CategorySection: React.FC = () => {
  const { navigateTo } = useNavigation();

  return (
    <section className="py-20 bg-[#0A0A0D] border-b border-[#2A2A32]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <ScrollReveal animation="fade-up">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#8B5CF6] font-semibold mb-2">
                CATEGORIES
              </p>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-[#F5F5F7]">
                CHOOSE YOUR ARMOR
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('shop')}
              className="mt-4 md:mt-0 text-xs font-bold uppercase tracking-widest text-[#9A9AA3] hover:text-[#00D9FF] transition-colors flex items-center gap-1.5 self-start"
            >
              <span>View All Categories</span>
              <ArrowUpRight size={14} />
            </button>
          </div>
        </ScrollReveal>

        {/* Category Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {CATEGORIES_DATA.map((cat, idx) => (
            <ScrollReveal key={cat.name} animation="fade-up" delay={idx * 60}>
              <div
                onClick={() => navigateTo('shop', { category: cat.name })}
                className="group relative h-64 sm:h-72 bg-[#15151B] border border-[#2A2A32] hover:border-[#8B5CF6]/60 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-end p-4"
              >
                {/* Category Image */}
                <img
                  src={cat.image}
                  alt={cat.name}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover object-center filter brightness-50 group-hover:brightness-60 group-hover:scale-105 transition-all duration-500"
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0D] via-[#0A0A0D]/40 to-transparent pointer-events-none" />

                {/* Text Container */}
                <div className="relative z-10">
                  <span className="text-[10px] uppercase font-mono-numbers text-[#00D9FF] font-semibold tracking-wider">
                    0{cat.count} PIECES
                  </span>
                  <h3 className="font-display text-base font-bold text-[#F5F5F7] group-hover:text-white transition-colors mt-0.5">
                    {cat.name}
                  </h3>
                  <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-[#C7CBD3] group-hover:text-[#00D9FF] transition-colors">
                    <span className="font-semibold uppercase tracking-wider">Shop Now</span>
                    <ArrowUpRight size={12} className="transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};
