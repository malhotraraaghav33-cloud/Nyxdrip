import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { PRODUCTS } from '../../data/products';
import { ProductGrid } from '../product/ProductGrid';
import { useNavigation } from '../../context/NavigationContext';
import { ScrollReveal } from '../common/ScrollReveal';

export const FeaturedSection: React.FC = () => {
  const { navigateTo } = useNavigation();
  const [activeTab, setActiveTab] = useState<'all' | 'bestsellers' | 'new'>('all');

  const filteredProducts = PRODUCTS.filter((p) => {
    if (activeTab === 'bestsellers') return p.isBestSeller;
    if (activeTab === 'new') return p.isNewArrival;
    return true;
  }).slice(0, 8);

  return (
    <section className="py-20 bg-[#0A0A0D] border-b border-[#2A2A32]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header with Tabs */}
        <ScrollReveal animation="fade-up">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#8B5CF6] font-semibold mb-2">
                CURATED SELECTION
              </p>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-[#F5F5F7]">
                FEATURED DROPS
              </h2>
            </div>

            {/* Interactive filter tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-[#15151B] border border-[#2A2A32] self-start">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  activeTab === 'all'
                    ? 'bg-[#8B5CF6] text-white'
                    : 'text-[#9A9AA3] hover:text-[#F5F5F7]'
                }`}
              >
                All Drops
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('bestsellers')}
                className={`px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  activeTab === 'bestsellers'
                    ? 'bg-[#8B5CF6] text-white'
                    : 'text-[#9A9AA3] hover:text-[#F5F5F7]'
                }`}
              >
                Best Sellers
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('new')}
                className={`px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  activeTab === 'new'
                    ? 'bg-[#8B5CF6] text-white'
                    : 'text-[#9A9AA3] hover:text-[#F5F5F7]'
                }`}
              >
                New Arrivals
              </button>
            </div>
          </div>
        </ScrollReveal>

        {/* Product Grid */}
        <ScrollReveal animation="scale-in" delay={100}>
          <ProductGrid products={filteredProducts} columns={4} />
        </ScrollReveal>

        {/* Bottom CTA to view full shop */}
        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={() => navigateTo('shop')}
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#15151B] border border-[#2A2A32] hover:border-[#8B5CF6] text-[#F5F5F7] text-xs font-bold uppercase tracking-widest transition-colors"
          >
            <span>EXPLORE ENTIRE CATALOG ({PRODUCTS.length} ITEMS)</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );
};
