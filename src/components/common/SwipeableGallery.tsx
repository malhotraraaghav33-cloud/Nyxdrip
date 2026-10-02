import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  X, 
  Play, 
  Pause, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { PRODUCT_PLACEHOLDER_IMAGE } from '../../lib/productImage';

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
  const safeImages = images.length > 0 ? images : [PRODUCT_PLACEHOLDER_IMAGE];
  const totalSlides = safeImages.length;

  // Touch and swipe state
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);

  // Slideshow state
  const [isSlideshowActive, setIsSlideshowActive] = useState(totalSlides > 1);
  const [isHovered, setIsHovered] = useState(false);
  const [slideshowProgress, setSlideshowProgress] = useState(0);
  const SLIDESHOW_DURATION = 4000; // 4 seconds per slide

  // Hover magnifier zoom state
  const [isHoverZoomActive, setIsHoverZoomActive] = useState(false);
  const [zoomCoords, setZoomCoords] = useState({ x: 50, y: 50 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Fullscreen Lightbox Zoom state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxScale, setLightboxScale] = useState(1);
  const [lightboxPan, setLightboxPan] = useState({ x: 0, y: 0 });
  const isDraggingLightbox = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  // Navigation handlers
  const goToNext = useCallback(() => {
    onSelectIndex((selectedIndex + 1) % totalSlides);
    setSlideshowProgress(0);
  }, [selectedIndex, totalSlides, onSelectIndex]);

  const goToPrev = useCallback(() => {
    onSelectIndex((selectedIndex - 1 + totalSlides) % totalSlides);
    setSlideshowProgress(0);
  }, [selectedIndex, totalSlides, onSelectIndex]);

  // Slideshow timer effect
  useEffect(() => {
    if (!isSlideshowActive || totalSlides <= 1 || isHovered || isLightboxOpen) {
      return;
    }

    const intervalTime = 50;
    const step = (intervalTime / SLIDESHOW_DURATION) * 100;

    const timer = setInterval(() => {
      setSlideshowProgress((prev) => {
        if (prev >= 100) {
          goToNext();
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isSlideshowActive, totalSlides, isHovered, isLightboxOpen, goToNext]);

  // Touch gestures for mobile swipe
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
    const minSwipe = 45;

    if (distance > minSwipe) {
      goToNext();
    } else if (distance < -minSwipe) {
      goToPrev();
    }
  };

  // Hover magnifier coordinates calculation
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomCoords({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  };

  // Lightbox keyboard controls
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, goToNext, goToPrev]);

  const openLightbox = () => {
    setIsLightboxOpen(true);
    setLightboxScale(1.5);
    setLightboxPan({ x: 0, y: 0 });
    setIsSlideshowActive(false);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
    setLightboxScale(1);
    setLightboxPan({ x: 0, y: 0 });
  };

  const zoomInLightbox = () => {
    setLightboxScale((prev) => Math.min(3, prev + 0.5));
  };

  const zoomOutLightbox = () => {
    setLightboxScale((prev) => {
      const next = Math.max(1, prev - 0.5);
      if (next === 1) setLightboxPan({ x: 0, y: 0 });
      return next;
    });
  };

  const resetLightboxZoom = () => {
    setLightboxScale(1);
    setLightboxPan({ x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col-reverse sm:flex-row gap-4 w-full select-none">
      {/* Thumbnails Strip (desktop / tablet / mobile) */}
      {totalSlides > 1 && (
        <div className="flex sm:flex-col gap-3 shrink-0 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 scrollbar-none">
          {safeImages.map((img, idx) => {
            const isSelected = selectedIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onSelectIndex(idx);
                  setSlideshowProgress(0);
                }}
                className={`group relative w-16 h-20 sm:w-20 sm:h-24 bg-[#15151B] border transition-all duration-200 shrink-0 overflow-hidden ${
                  isSelected
                    ? 'border-[#8B5CF6] ring-2 ring-[#8B5CF6]/50 shadow-md shadow-[#8B5CF6]/20'
                    : 'border-[#2A2A32] hover:border-[#8B5CF6]/60 opacity-60 hover:opacity-100'
                }`}
                aria-label={`View photo ${idx + 1}`}
              >
                <img
                  src={img}
                  alt={`${productName} thumbnail ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = PRODUCT_PLACEHOLDER_IMAGE;
                  }}
                  className={`w-full h-full object-cover transition-transform duration-300 ${
                    isSelected ? 'scale-105' : 'group-hover:scale-105'
                  }`}
                />
                {isSelected && isSlideshowActive && (
                  <div 
                    className="absolute bottom-0 inset-x-0 h-0.5 bg-[#8B5CF6] transition-all duration-75"
                    style={{ width: `${slideshowProgress}%` }}
                  />
                )}
                <div className="absolute top-1 left-1.5 text-[9px] font-mono-numbers px-1 py-0.2 bg-[#0A0A0D]/80 border border-[#2A2A32] text-[#C7CBD3]">
                  0{idx + 1}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Interactive Stage with Slide & Zoom Features */}
      <div className="relative flex-1 aspect-[4/5] bg-[#0A0A0D] border border-[#2A2A32] overflow-hidden group">
        {/* Badge */}
        {badge && (
          <div className="absolute top-4 left-4 z-20 pointer-events-none">
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

        {/* Counter Badge */}
        {totalSlides > 1 && (
          <div className="absolute top-4 right-14 z-20 bg-[#0A0A0D]/80 backdrop-blur-md border border-[#2A2A32] px-2.5 py-1 text-[11px] font-mono-numbers text-[#C7CBD3] tracking-widest">
            <span>0{selectedIndex + 1}</span>
            <span className="text-[#6B7280] mx-1">/</span>
            <span>0{totalSlides}</span>
          </div>
        )}

        {/* Action Controls: Slideshow Toggle & Fullscreen Zoom Button */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {totalSlides > 1 && (
            <button
              type="button"
              onClick={() => setIsSlideshowActive(!isSlideshowActive)}
              className={`w-8 h-8 flex items-center justify-center rounded-none border transition-all ${
                isSlideshowActive
                  ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-[#8B5CF6]'
                  : 'bg-[#0A0A0D]/80 hover:bg-[#15151B] border-[#2A2A32] text-[#9A9AA3] hover:text-white'
              }`}
              title={isSlideshowActive ? 'Pause Slideshow' : 'Start Auto Slideshow'}
              aria-label={isSlideshowActive ? 'Pause Slideshow' : 'Play Slideshow'}
            >
              {isSlideshowActive ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
            </button>
          )}

          <button
            type="button"
            onClick={openLightbox}
            className="w-8 h-8 flex items-center justify-center bg-[#0A0A0D]/80 hover:bg-[#8B5CF6] border border-[#2A2A32] hover:border-[#8B5CF6] text-[#F5F5F7] transition-all shadow-md"
            title="Inspect & Fullscreen Zoom"
            aria-label="Zoom photo"
          >
            <Maximize2 size={14} />
          </button>
        </div>

        {/* Slide Carousel Track */}
        <div
          ref={imageContainerRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseEnter={() => {
            setIsHovered(true);
            setIsHoverZoomActive(true);
          }}
          onMouseLeave={() => {
            setIsHovered(false);
            setIsHoverZoomActive(false);
          }}
          onMouseMove={handleMouseMove}
          className="relative w-full h-full cursor-zoom-in overflow-hidden"
          onClick={openLightbox}
        >
          {/* Animated Slider Track */}
          <div
            className="flex w-full h-full transition-transform duration-500 ease-out"
            style={{
              transform: `translateX(calc(-${selectedIndex * 100}% + ${touchDelta}px))`,
            }}
          >
            {safeImages.map((img, idx) => {
              const isCurrent = selectedIndex === idx;
              return (
                <div
                  key={idx}
                  className="w-full h-full shrink-0 relative overflow-hidden flex items-center justify-center bg-[#0A0A0D]"
                >
                  <img
                    src={img}
                    alt={`${productName} slide ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = PRODUCT_PLACEHOLDER_IMAGE;
                    }}
                    className={`w-full h-full object-cover object-center transition-all duration-700 ease-out ${
                      // When hover zoom is active on current slide, scale up from cursor origin
                      isCurrent && isHoverZoomActive
                        ? 'scale-225'
                        : isCurrent && isSlideshowActive
                        ? 'scale-106 animate-pulse-subtle'
                        : 'scale-100 group-hover:scale-104'
                    }`}
                    style={{
                      transformOrigin:
                        isCurrent && isHoverZoomActive
                          ? `${zoomCoords.x}% ${zoomCoords.y}%`
                          : 'center center',
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Hover Lens Instruction Pill */}
          <div className="hidden sm:flex absolute bottom-4 left-4 z-10 pointer-events-none items-center gap-1.5 px-3 py-1 bg-[#0A0A0D]/75 backdrop-blur-md border border-[#2A2A32] text-[10px] uppercase font-mono-numbers text-[#9A9AA3] tracking-wider transition-opacity duration-300 opacity-80 group-hover:opacity-100">
            <Sparkles size={11} className="text-[#8B5CF6]" />
            <span>Hover to Magnify · Click for Fullscreen</span>
          </div>
        </div>

        {/* Previous & Next Slide Chevrons */}
        {totalSlides > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-[#0A0A0D]/85 hover:bg-[#8B5CF6] border border-[#2A2A32] hover:border-[#8B5CF6] text-white transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-xl"
              aria-label="Previous slide"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-[#0A0A0D]/85 hover:bg-[#8B5CF6] border border-[#2A2A32] hover:border-[#8B5CF6] text-white transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-xl"
              aria-label="Next slide"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Animated Slideshow Progress Bar */}
        {totalSlides > 1 && isSlideshowActive && !isHovered && (
          <div className="absolute bottom-0 inset-x-0 h-1 bg-[#15151B] z-20 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#00D9FF] transition-all duration-75 ease-linear"
              style={{ width: `${slideshowProgress}%` }}
            />
          </div>
        )}

        {/* Mobile Swipe Indicators (dots) */}
        {totalSlides > 1 && (
          <div className="sm:hidden absolute bottom-3 inset-x-0 flex justify-center gap-1.5 z-20 pointer-events-none">
            {safeImages.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  selectedIndex === idx
                    ? 'w-6 bg-[#00D9FF]'
                    : 'w-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Zoom Modal */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-[#0A0A0D]/95 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-8 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeLightbox();
          }}
        >
          {/* Top Control Bar */}
          <div className="flex items-center justify-between z-30 pb-4 border-b border-[#2A2A32]">
            <div className="flex items-center gap-3">
              <span className="font-display font-bold text-sm tracking-wider text-[#F5F5F7]">
                {productName}
              </span>
              <span className="text-xs text-[#9A9AA3] font-mono-numbers">
                Photo {selectedIndex + 1} of {totalSlides}
              </span>
            </div>

            {/* Zoom Adjusters & Close */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={zoomOutLightbox}
                disabled={lightboxScale <= 1}
                className="w-9 h-9 flex items-center justify-center bg-[#15151B] border border-[#2A2A32] text-[#F5F5F7] hover:border-[#8B5CF6] disabled:opacity-30 disabled:pointer-events-none transition-all"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>

              <span className="font-mono-numbers text-xs text-[#C7CBD3] px-2 min-w-[50px] text-center">
                {Math.round(lightboxScale * 100)}%
              </span>

              <button
                type="button"
                onClick={zoomInLightbox}
                disabled={lightboxScale >= 3}
                className="w-9 h-9 flex items-center justify-center bg-[#15151B] border border-[#2A2A32] text-[#F5F5F7] hover:border-[#8B5CF6] disabled:opacity-30 disabled:pointer-events-none transition-all"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>

              <button
                type="button"
                onClick={resetLightboxZoom}
                className="w-9 h-9 flex items-center justify-center bg-[#15151B] border border-[#2A2A32] text-[#F5F5F7] hover:border-[#8B5CF6] transition-all"
                title="Reset Zoom (100%)"
              >
                <RotateCcw size={15} />
              </button>

              <button
                type="button"
                onClick={closeLightbox}
                className="w-9 h-9 flex items-center justify-center bg-[#15151B] hover:bg-red-500/20 border border-[#2A2A32] hover:border-red-500/50 text-[#F5F5F7] transition-all ml-2"
                title="Close (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Image Viewport with Pan Support */}
          <div 
            className="relative flex-1 flex items-center justify-center overflow-hidden my-4 cursor-grab active:cursor-grabbing"
            onMouseDown={(e) => {
              if (lightboxScale > 1) {
                isDraggingLightbox.current = true;
                dragStartPos.current = {
                  x: e.clientX - lightboxPan.x,
                  y: e.clientY - lightboxPan.y,
                };
              }
            }}
            onMouseMove={(e) => {
              if (isDraggingLightbox.current && lightboxScale > 1) {
                setLightboxPan({
                  x: e.clientX - dragStartPos.current.x,
                  y: e.clientY - dragStartPos.current.y,
                });
              }
            }}
            onMouseUp={() => {
              isDraggingLightbox.current = false;
            }}
            onMouseLeave={() => {
              isDraggingLightbox.current = false;
            }}
          >
            <div
              className="transition-transform duration-200 ease-out max-w-full max-h-full flex items-center justify-center"
              style={{
                transform: `scale(${lightboxScale}) translate(${lightboxPan.x / lightboxScale}px, ${lightboxPan.y / lightboxScale}px)`,
              }}
            >
              <img
                src={safeImages[selectedIndex]}
                alt={`${productName} zoomed view`}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = PRODUCT_PLACEHOLDER_IMAGE;
                }}
                className="max-w-[85vw] max-h-[75vh] object-contain shadow-2xl rounded-none border border-[#2A2A32]"
              />
            </div>

            {/* Modal Navigation Buttons */}
            {totalSlides > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrev();
                    setLightboxPan({ x: 0, y: 0 });
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-[#15151B]/80 hover:bg-[#8B5CF6] border border-[#2A2A32] hover:border-[#8B5CF6] text-white transition-all shadow-2xl"
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNext();
                    setLightboxPan({ x: 0, y: 0 });
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-[#15151B]/80 hover:bg-[#8B5CF6] border border-[#2A2A32] hover:border-[#8B5CF6] text-white transition-all shadow-2xl"
                  aria-label="Next photo"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnails inside Modal */}
          {totalSlides > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4 border-t border-[#2A2A32] overflow-x-auto">
              {safeImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onSelectIndex(idx);
                    setLightboxPan({ x: 0, y: 0 });
                  }}
                  className={`w-14 h-16 bg-[#15151B] border transition-all overflow-hidden shrink-0 ${
                    selectedIndex === idx
                      ? 'border-[#8B5CF6] ring-2 ring-[#8B5CF6]/50'
                      : 'border-[#2A2A32] opacity-50 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img}
                    alt={`Thumb ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
