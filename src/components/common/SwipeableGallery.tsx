import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SwipeableGalleryProps {
  images: string[];
  productName: string;
  badge?: string | null;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
}

export const SwipeableGallery: React.FC<SwipeableGalleryProps> = ({
  images,
  productName,
  badge,
  selectedIndex,
  onSelectIndex,
}) => {
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
    if (touchStartX.current !== null) {
      setTouchDelta(touchEndX.current - touchStartX.current);
    }
  };

  const onTouchEnd = () => {
    setTouchDelta(0);
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && selectedIndex < images.length - 1) {
      onSelectIndex(selectedIndex + 1);
    }
    if (isRightSwipe && selectedIndex > 0) {
      onSelectIndex(selectedIndex - 1);
    }
  };

  const nextImage = () => {
    if (selectedIndex < images.length - 1) {
      onSelectIndex(selectedIndex + 1);
    }
  };

  const prevImage = () => {
    if (selectedIndex > 0) {
      onSelectIndex(selectedIndex - 1);
    }
  };

  return (
    <div className="flex flex-col-reverse sm:flex-row gap-4 w-full">
      {/* Thumbnails (desktop & tablet) */}
      <div className="flex sm:flex-col gap-3 shrink-0 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0">
        {images.map((img, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectIndex(idx)}
            className={`relative w-16 h-20 bg-[#15151B] border transition-all shrink-0 ${
              selectedIndex === idx
                ? 'border-[#8B5CF6] ring-1 ring-[#8B5CF6]'
                : 'border-[#2A2A32] hover:border-[#C7CBD3]/60'
            }`}
            aria-label={`View thumbnail ${idx + 1}`}
          >
            <img
              src={img}
              alt={`${productName} thumbnail ${idx + 1}`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* Main Swipeable Interactive Canvas */}
      <div
        className="relative flex-1 aspect-[4/5] bg-[#15151B] border border-[#2A2A32] overflow-hidden select-none group"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Badge */}
        {badge && (
          <div className="absolute top-4 left-4 z-10">
            <span
              className={`px-3 py-1 text-xs font-bold tracking-widest uppercase border ${
                badge === 'NEW'
                  ? 'bg-[#00D9FF]/10 text-[#00D9FF] border-[#00D9FF]/30'
                  : badge === 'LIMITED'
                  ? 'bg-red-500/10 text-red-400 border-red-500/30'
                  : 'bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/30'
              }`}
            >
              {badge}
            </span>
          </div>
        )}

        {/* Desktop Navigation Chevrons */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevImage}
              disabled={selectedIndex === 0}
              className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center bg-[#0A0A0D]/70 hover:bg-[#15151B] border border-[#2A2A32] text-[#F5F5F7] disabled:opacity-20 disabled:pointer-events-none transition-all opacity-0 group-hover:opacity-100"
              aria-label="Previous image"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={nextImage}
              disabled={selectedIndex === images.length - 1}
              className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center bg-[#0A0A0D]/70 hover:bg-[#15151B] border border-[#2A2A32] text-[#F5F5F7] disabled:opacity-20 disabled:pointer-events-none transition-all opacity-0 group-hover:opacity-100"
              aria-label="Next image"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        {/* Display Image with subtle touch drag hint */}
        <img
          src={images[selectedIndex] || images[0]}
          alt={productName}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center transition-transform duration-300 ease-out"
          style={{
            transform: touchDelta !== 0 ? `translateX(${touchDelta * 0.3}px)` : 'none',
          }}
        />

        {/* Mobile Swipe Indicators (dots) */}
        {images.length > 1 && (
          <div className="sm:hidden absolute bottom-3 inset-x-0 flex justify-center gap-1.5 z-10">
            {images.map((_, idx) => (
              <span
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  selectedIndex === idx ? 'bg-[#00D9FF] w-4' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
