import React from 'react';
import { Heart } from 'lucide-react';
import { Product } from '../../types';
import { useWishlist } from '../../context/WishlistContext';

interface WishlistButtonProps {
  product: Product;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const WishlistButton: React.FC<WishlistButtonProps> = ({
  product,
  className = '',
  size = 'md',
  showLabel = false,
}) => {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const active = isInWishlist(product.id);
  const [isBouncing, setIsBouncing] = React.useState(false);

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 20,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 380);
    toggleWishlist(product);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center justify-center gap-2 transition-all duration-200 active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#8B5CF6] ${
        showLabel
          ? 'px-4 py-2 border border-[#2A2A32] bg-[#15151B] hover:border-[#C7CBD3]/40 text-xs uppercase tracking-wider font-medium text-[#F5F5F7]'
          : 'p-2 rounded-sm bg-[#0A0A0D]/70 backdrop-blur-sm border border-[#2A2A32]/60 hover:border-[#C7CBD3]/80 hover:bg-[#15151B]'
      } ${className}`}
      aria-label={active ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
    >
      <Heart
        size={iconSizes[size]}
        className={`transition-all duration-300 ${
          isBouncing ? 'scale-125 rotate-6' : 'scale-100 rotate-0'
        } ${
          active
            ? 'fill-[#8B5CF6] text-[#8B5CF6]'
            : 'text-[#C7CBD3] hover:text-[#F5F5F7]'
        }`}
      />
      {showLabel && (
        <span className="whitespace-nowrap">{active ? 'In Wishlist' : 'Add to Wishlist'}</span>
      )}
    </button>
  );
};
