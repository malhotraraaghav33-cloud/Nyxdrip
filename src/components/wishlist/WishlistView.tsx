import React from 'react';
import { Heart, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { useNavigation } from '../../context/NavigationContext';
import { ScrollReveal } from '../common/ScrollReveal';
import { Magnetic } from '../common/Magnetic';

export const WishlistView: React.FC = () => {
  const { wishlist, removeFromWishlist, moveToCart } = useWishlist();
  const { navigateTo } = useNavigation();

  return (
    <div className="min-h-screen bg-[#0A0A0D] text-[#F5F5F7] py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <ScrollReveal animation="fade-up">
          <div className="pb-8 border-b border-[#2A2A32] flex items-end justify-between">
            <div>
              <span className="text-xs uppercase tracking-[0.25em] text-[#8B5CF6] font-semibold">
                SAVED VAULT
              </span>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold uppercase mt-1">
                MY WISHLIST ({wishlist.length})
              </h1>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('shop')}
              className="text-xs font-bold uppercase tracking-wider text-[#9A9AA3] hover:text-[#00D9FF] transition-colors hidden sm:block"
            >
              Continue Browsing →
            </button>
          </div>
        </ScrollReveal>

        {/* Content */}
        {wishlist.length === 0 ? (
          <div className="py-24 text-center border border-[#2A2A32] bg-[#15151B] mt-8 p-8 animate-in fade-in duration-300">
            <div className="w-16 h-16 mx-auto rounded-full border border-[#2A2A32] flex items-center justify-center text-[#9A9AA3] mb-4">
              <Heart size={24} />
            </div>
            <h3 className="font-display text-lg font-bold text-[#F5F5F7]">
              YOUR WISHLIST IS EMPTY
            </h3>
            <p className="text-xs text-[#9A9AA3] mt-2 max-w-sm mx-auto">
              Save pieces you love to keep an eye on stock levels and limited drops.
            </p>
            <div className="mt-6 flex justify-center">
              <Magnetic strength={12}>
                <button
                  type="button"
                  onClick={() => navigateTo('shop')}
                  className="px-6 py-2.5 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-wider transition-colors active:scale-95"
                >
                  Explore Drops
                </button>
              </Magnetic>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlist.map(({ product }, idx) => (
              <ScrollReveal key={product.id} animation="fade-up" delay={Math.min(idx * 60, 360)}>
                <div
                  className="bg-[#15151B] border border-[#2A2A32] hover:border-[#8B5CF6]/50 flex flex-col justify-between overflow-hidden transition-all duration-300 group hover:-translate-y-1"
                >
                  {/* Image */}
                  <div
                    onClick={() => navigateTo('product', { productId: product.slug })}
                    className="relative aspect-[4/5] bg-[#0A0A0D] cursor-pointer overflow-hidden"
                  >
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromWishlist(product.id);
                      }}
                      className="absolute top-2.5 right-2.5 p-2 bg-[#0A0A0D]/80 border border-[#2A2A32] text-[#9A9AA3] hover:text-red-400 hover:border-red-400/40 transition-colors active:scale-90"
                      aria-label="Remove item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#9A9AA3]">
                        {product.category} · {product.style}
                      </span>
                      <h4
                        onClick={() => navigateTo('product', { productId: product.slug })}
                        className="font-semibold text-sm text-[#F5F5F7] group-hover:text-white cursor-pointer mt-0.5 line-clamp-1 transition-colors"
                      >
                        {product.name}
                      </h4>
                      <p className="font-mono-numbers text-sm font-bold text-[#F5F5F7] mt-2">
                        ₹{product.price.toLocaleString('en-IN')}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#2A2A32] flex gap-2">
                      <button
                        type="button"
                        onClick={() => moveToCart(product)}
                        className="flex-1 py-2 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md"
                      >
                        <ShoppingBag size={13} />
                        <span>Move to Bag</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateTo('product', { productId: product.slug })}
                        className="px-2.5 py-2 border border-[#2A2A32] hover:border-[#C7CBD3] text-[#F5F5F7] text-xs transition-colors active:scale-95"
                        aria-label="View product"
                      >
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
