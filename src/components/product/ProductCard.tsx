import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../../types';
import { useCart } from '../../context/CartContext';
import { useNavigation } from '../../context/NavigationContext';
import { WishlistButton } from '../common/WishlistButton';
import { getProductImages, PRODUCT_PLACEHOLDER_IMAGE } from '../../lib/productImage';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, priority = false }) => {
  const { addToCart, openCart } = useCart();
  const { navigateTo } = useNavigation();

  // All product images
  const images = React.useMemo(() => getProductImages(product), [product]);
  const hasMultipleImages = images.length > 1;

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileTouched, setIsMobileTouched] = useState(false);
  const slideshowTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isPlaceholderPrice = Boolean(product.priceIsPlaceholder || product.price === 0);

  const discountPercent = (!isPlaceholderPrice && product.originalPrice && product.originalPrice > product.price)
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  // Auto-slideshow animation on card hover if product has multiple photos
  useEffect(() => {
    if (isHovered && hasMultipleImages) {
      slideshowTimerRef.current = setInterval(() => {
        setCurrentSlideIndex((prev) => (prev + 1) % images.length);
      }, 2200);
    } else {
      if (slideshowTimerRef.current) {
        clearInterval(slideshowTimerRef.current);
        slideshowTimerRef.current = null;
      }
      // Reset to primary image when unhovered
      setCurrentSlideIndex(0);
    }

    return () => {
      if (slideshowTimerRef.current) {
        clearInterval(slideshowTimerRef.current);
      }
    };
  }, [isHovered, hasMultipleImages, images.length]);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, 1);
    openCart();
  };

  const handleCardClick = () => {
    navigateTo('product', { productId: product.slug });
  };

  const handlePrevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlideIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlideIndex((prev) => (prev + 1) % images.length);
  };

  const currentImg = images[currentSlideIndex] || images[0] || PRODUCT_PLACEHOLDER_IMAGE;

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsMobileTouched(true)}
      className="group relative flex flex-col bg-[#15151B] border border-[#2A2A32] hover:border-[#8B5CF6]/50 transition-all duration-300 ease-out cursor-pointer overflow-hidden transform hover:-translate-y-1 hover:shadow-xl"
    >
      {/* Visual Image Container with Slide & Zoom effects */}
      <div className="relative aspect-[4/5] w-full bg-[#0A0A0D] overflow-hidden">
        {/* Badge */}
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

        {/* Product Media with slide track & hover zoom */}
        <div className="relative w-full h-full overflow-hidden">
          <div 
            className="flex w-full h-full transition-transform duration-500 ease-out"
            style={{
              transform: `translateX(-${currentSlideIndex * 100}%)`,
            }}
          >
            {images.map((img, idx) => (
              <div key={idx} className="w-full h-full shrink-0 relative overflow-hidden bg-[#0A0A0D]">
                <img
                  src={img}
                  alt={`${product.name} - slide ${idx + 1}`}
                  loading={priority && idx === 0 ? 'eager' : 'lazy'}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = PRODUCT_PLACEHOLDER_IMAGE;
                  }}
                  className={`w-full h-full object-cover object-center transition-all duration-700 ease-out ${
                    isHovered ? 'scale-108' : 'scale-100'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Slide Chevrons on Card (Desktop hover / Mobile active) */}
        {hasMultipleImages && (
          <>
            <button
              type="button"
              onClick={handlePrevSlide}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center bg-[#0A0A0D]/80 hover:bg-[#8B5CF6] border border-[#2A2A32] text-white transition-all duration-200 opacity-0 group-hover:opacity-100"
              aria-label="Previous photo"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleNextSlide}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center bg-[#0A0A0D]/80 hover:bg-[#8B5CF6] border border-[#2A2A32] text-white transition-all duration-200 opacity-0 group-hover:opacity-100"
              aria-label="Next photo"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}

        {/* Slide Dots Indicator */}
        {hasMultipleImages && (
          <div className="absolute bottom-2.5 inset-x-0 flex justify-center items-center gap-1.5 z-10 pointer-events-none">
            {images.map((_, idx) => (
              <span
                key={idx}
                className={`h-1 rounded-full transition-all duration-300 ${
                  currentSlideIndex === idx
                    ? 'w-4 bg-[#8B5CF6]'
                    : 'w-1.5 bg-white/40 group-hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}

        {/* Quick Add overlay button */}
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
          {/* Category & Style metadata */}
          <div className="flex items-center gap-1.5 text-[11px] text-[#9A9AA3] uppercase tracking-wider mb-1">
            <span>{product.category}</span>
            {product.style && (
              <>
                <span aria-hidden="true">·</span>
                <span>{product.style}</span>
              </>
            )}
            {product.color && !product.style && (
              <>
                <span aria-hidden="true">·</span>
                <span>{product.color}</span>
              </>
            )}
            {hasMultipleImages && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#8B5CF6] font-mono-numbers">{images.length} Photos</span>
              </>
            )}
          </div>

          {/* Product Name */}
          <h3 className="text-sm font-semibold text-[#F5F5F7] line-clamp-1 group-hover:text-white transition-colors">
            {product.name}
          </h3>
        </div>

        {/* Price & Rating Row */}
        <div className="mt-3 pt-2.5 border-t border-[#2A2A32]/60 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            {isPlaceholderPrice ? (
              <span className="font-mono-numbers text-xs font-semibold text-[#8B5CF6] tracking-wider uppercase">
                Price On Request
              </span>
            ) : (
              <>
                <span className="font-mono-numbers text-sm font-bold text-[#F5F5F7]">
                  ₹{product.price.toLocaleString('en-IN')}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="font-mono-numbers text-xs text-[#9A9AA3] line-through">
                    ₹{product.originalPrice.toLocaleString('en-IN')}
                  </span>
                )}
                {discountPercent > 0 && (
                  <span className="text-[10px] font-bold text-[#00D9FF]">
                    -{discountPercent}%
                  </span>
                )}
              </>
            )}
          </div>

          {/* Rating only rendered if real rating exists */}
          {typeof product.rating === 'number' && product.rating > 0 ? (
            <div className="flex items-center gap-1 text-[11px] text-[#9A9AA3]">
              <Star size={11} className="fill-[#8B5CF6] text-[#8B5CF6]" />
              <span className="font-mono-numbers font-medium text-[#C7CBD3]">{product.rating.toFixed(1)}</span>
            </div>
          ) : (
            <span className="text-[10px] uppercase font-mono-numbers text-[#71717A] tracking-wider">
              NEW DROP
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
