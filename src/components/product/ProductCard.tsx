import React, { useState } from 'react';
import { ShoppingBag, Star } from 'lucide-react';
import { Product } from '../../types';
import { useCart } from '../../context/CartContext';
import { useNavigation } from '../../context/NavigationContext';
import { WishlistButton } from '../common/WishlistButton';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, priority = false }) => {
  const { addToCart, openCart } = useCart();
  const { navigateTo } = useNavigation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [isMobileTouched, setIsMobileTouched] = useState(false);

  const discountPercent = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, 1);
    openCart();
  };

  const handleCardClick = () => {
    navigateTo('product', { productId: product.slug });
  };

  const hasSecondaryImage = product.images.length > 1;

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={() => hasSecondaryImage && setCurrentImageIndex(1)}
      onMouseLeave={() => hasSecondaryImage && setCurrentImageIndex(0)}
      onTouchStart={() => setIsMobileTouched(true)}
      className="group relative flex flex-col bg-[#15151B] border border-[#2A2A32] hover:border-[#8B5CF6]/50 transition-all duration-300 ease-out cursor-pointer overflow-hidden transform hover:-translate-y-1 hover:shadow-xl"
    >
      {/* Visual Image Container */}
      <div className="relative aspect-[4/5] w-full bg-[#0A0A0D] overflow-hidden">
        {/* Badge: subtle angular label, no pill */}
        {product.badge && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span
              className={`px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase border transition-colors ${
                product.badge === 'NEW'
                  ? 'bg-[#00D9FF]/10 text-[#00D9FF] border-[#00D9FF]/30'
                  : product.badge === 'LIMITED'
                  ? 'bg-red-500/10 text-red-400 border-red-500/30'
                  : 'bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/30'
              }`}
            >
              {product.badge}
            </span>
          </div>
        )}

        {/* Wishlist Button top-right */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <WishlistButton product={product} size="sm" />
        </div>

        {/* Product Media with cross-fade */}
        {!imageError ? (
          <div className="relative w-full h-full">
            <img
              src={product.images[0]}
              alt={product.name}
              loading={priority ? 'eager' : 'lazy'}
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className={`w-full h-full object-cover object-center group-hover:scale-108 transition-all duration-500 ease-out ${
                hasSecondaryImage && currentImageIndex === 1 ? 'opacity-0' : 'opacity-100'
              }`}
            />
            {hasSecondaryImage && (
              <img
                src={product.images[1]}
                alt={`${product.name} secondary view`}
                loading="lazy"
                referrerPolicy="no-referrer"
                className={`absolute inset-0 w-full h-full object-cover object-center group-hover:scale-108 transition-all duration-500 ease-out ${
                  currentImageIndex === 1 ? 'opacity-100' : 'opacity-0'
                }`}
              />
            )}
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-[#15151B] text-center">
            <div className="w-12 h-12 rounded-full border border-[#2A2A32] flex items-center justify-center text-[#8B5CF6] mb-2 font-display font-bold">
              NX
            </div>
            <span className="text-xs text-[#9A9AA3] font-medium">{product.name}</span>
          </div>
        )}

        {/* Quick Add overlay button: elegant spring slide on desktop hover, tap-accessible on mobile */}
        <div
          className={`absolute inset-x-3 bottom-3 z-10 transition-all duration-300 ease-out ${
            isMobileTouched
              ? 'translate-y-0 opacity-100'
              : 'translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 sm:opacity-0'
          }`}
        >
          <button
            type="button"
            onClick={handleQuickAdd}
            className="w-full py-2.5 px-3 bg-[#0A0A0D]/95 hover:bg-[#8B5CF6] active:scale-95 border border-[#2A2A32] hover:border-[#8B5CF6] text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all focus-visible:outline-none"
          >
            <ShoppingBag size={14} />
            <span>Quick Add</span>
          </button>
        </div>
      </div>

      {/* Metadata & Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Category & Style metadata as clean unboxed text */}
          <div className="flex items-center gap-1.5 text-[11px] text-[#9A9AA3] uppercase tracking-wider mb-1">
            <span>{product.category}</span>
            <span aria-hidden="true">·</span>
            <span>{product.style}</span>
          </div>

          {/* Product Name */}
          <h3 className="text-sm font-semibold text-[#F5F5F7] line-clamp-1 group-hover:text-white transition-colors">
            {product.name}
          </h3>
        </div>

        {/* Price & Rating Row */}
        <div className="mt-3 pt-2.5 border-t border-[#2A2A32]/60 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-mono-numbers text-sm font-bold text-[#F5F5F7]">
              ₹{product.price.toLocaleString('en-IN')}
            </span>
            {product.originalPrice && (
              <span className="font-mono-numbers text-xs text-[#9A9AA3] line-through">
                ₹{product.originalPrice.toLocaleString('en-IN')}
              </span>
            )}
            {discountPercent > 0 && (
              <span className="text-[10px] font-bold text-[#00D9FF]">
                -{discountPercent}%
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-[11px] text-[#9A9AA3]">
            <Star size={11} className="fill-[#8B5CF6] text-[#8B5CF6]" />
            <span className="font-mono-numbers font-medium text-[#C7CBD3]">{product.rating.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
