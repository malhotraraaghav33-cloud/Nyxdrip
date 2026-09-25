import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { PRODUCTS } from '../../data/products';
import { useNavigation } from '../../context/NavigationContext';
import { useCart } from '../../context/CartContext';
import { ScrollReveal } from '../common/ScrollReveal';
import heroImg from '../../assets/images/hero_gothic_accessories_1790341134351.jpg';

export const NewDropSection: React.FC = () => {
  const { navigateTo } = useNavigation();
  const { addToCart, openCart } = useCart();

  // Curated flagship drop product
  const heroDrop = PRODUCTS.find((p) => p.slug === 'chrome-cross-pendant') || PRODUCTS[0];
  const sideDrops = PRODUCTS.filter((p) => p.isNewArrival).slice(0, 2);

  return (
    <section className="py-20 sm:py-24 bg-[#0A0A0D] border-b border-[#2A2A32]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Campaign Header */}
        <ScrollReveal animation="fade-up">
          <div className="flex items-center justify-between mb-12">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#00D9FF] font-semibold mb-2">
                <Sparkles size={13} />
                <span>LIMITED CAPSULE ARCHIVE</span>
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-bold text-[#F5F5F7]">
                THE NEW DROP
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('shop', { newArrivalsOnly: true } as unknown as object)}
              className="text-xs uppercase font-bold tracking-widest text-[#9A9AA3] hover:text-[#00D9FF] transition-colors flex items-center gap-1.5"
            >
              <span>All New Drops</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </ScrollReveal>

        {/* Campaign Editorial Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* Main Campaign Feature Box */}
          <div className="lg:col-span-7">
            <ScrollReveal animation="slide-right" delay={100} className="h-full">
              <div className="h-full bg-[#15151B] border border-[#2A2A32] flex flex-col justify-between overflow-hidden group">
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#0A0A0D]">
                  <img
                    src={heroImg}
                    alt="The New Drop Campaign"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-2.5 py-1 text-[11px] font-bold tracking-widest uppercase bg-[#8B5CF6] text-white">
                      FLAGSHIP PIECE
                    </span>
                  </div>
                </div>

                <div className="p-6 sm:p-8 flex flex-col justify-between flex-1">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-[#9A9AA3] font-mono-numbers">
                      SERIES 04 · CYBER INDUSTRIAL
                    </p>
                    <h3 className="font-display text-xl sm:text-2xl font-bold text-[#F5F5F7] mt-1.5">
                      {heroDrop.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#9A9AA3] mt-3 leading-relaxed">
                      {heroDrop.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-6 border-t border-[#2A2A32] flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono-numbers text-xl font-bold text-[#F5F5F7]">
                        ₹{heroDrop.price.toLocaleString('en-IN')}
                      </span>
                      {heroDrop.originalPrice && (
                        <span className="font-mono-numbers text-sm text-[#9A9AA3] line-through">
                          ₹{heroDrop.originalPrice.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => navigateTo('product', { productId: heroDrop.slug })}
                        className="px-5 py-2.5 border border-[#2A2A32] hover:border-[#C7CBD3] text-[#F5F5F7] text-xs font-bold uppercase tracking-wider transition-colors"
                      >
                        View Piece
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          addToCart(heroDrop, 1);
                          openCart();
                        }}
                        className="px-6 py-2.5 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-lg"
                      >
                        Add to Bag
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Side Editorial Capsule Products */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {sideDrops.map((drop, idx) => (
              <ScrollReveal key={drop.id} animation="slide-left" delay={150 + idx * 100} className="flex-1">
                <div
                  onClick={() => navigateTo('product', { productId: drop.slug })}
                  className="h-full bg-[#15151B] border border-[#2A2A32] hover:border-[#C7CBD3]/40 p-5 flex flex-col sm:flex-row gap-5 cursor-pointer group transition-all"
                >
                  <div className="w-full sm:w-36 h-40 bg-[#0A0A0D] overflow-hidden shrink-0">
                    <img
                      src={drop.images[0]}
                      alt={drop.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[10px] uppercase text-[#00D9FF] font-semibold tracking-wider">
                        <span>{drop.badge || 'NEW RELEASE'}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#9A9AA3]">{drop.category}</span>
                      </div>
                      <h4 className="font-display text-sm font-bold text-[#F5F5F7] mt-1 group-hover:text-white transition-colors">
                        {drop.name}
                      </h4>
                      <p className="text-xs text-[#9A9AA3] mt-2 line-clamp-2">
                        {drop.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#2A2A32] flex items-center justify-between">
                      <span className="font-mono-numbers text-sm font-bold text-[#F5F5F7]">
                        ₹{drop.price.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs font-semibold text-[#C7CBD3] group-hover:text-[#8B5CF6] flex items-center gap-1 transition-colors">
                        Explore <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
