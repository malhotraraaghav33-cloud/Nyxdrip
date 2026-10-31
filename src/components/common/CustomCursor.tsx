import React, { useEffect, useRef, useState } from 'react';

export const CustomCursor: React.FC = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for touch / reduced motion
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouch(touch);
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    if (touch || mediaQuery.matches) return;

    let targetX = -100;
    let targetY = -100;
    let currentX = -100;
    let currentY = -100;
    let animationFrameId: number;
    let hasShown = false;

    const onMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;

      if (!hasShown) {
        hasShown = true;
        setIsVisible(true);
      }

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%)`;
      }

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.closest('button') ||
          target.closest('a') ||
          target.getAttribute('role') === 'button' ||
          target.classList.contains('cursor-pointer'))
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    const onMouseLeave = () => {
      setIsVisible(false);
      hasShown = false;
    };

    const render = () => {
      // Smooth linear interpolation for the outer ring directly in the compositor
      currentX += (targetX - currentX) * 0.2;
      currentY += (targetY - currentY) * 0.2;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
      }
      animationFrameId = requestAnimationFrame(render);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  if (isTouch || prefersReducedMotion || !isVisible) {
    return null;
  }

  return (
    <>
      {/* Central precise dot */}
      <div
        ref={dotRef}
        className="pointer-events-none fixed z-[9999] top-0 left-0 w-1.5 h-1.5 rounded-full bg-[#00D9FF] -translate-x-1/2 -translate-y-1/2 will-change-transform"
        style={{
          transform: 'translate3d(-100px, -100px, 0) translate(-50%, -50%)',
        }}
      />
      {/* Outer subtle follower ring */}
      <div
        ref={ringRef}
        className={`pointer-events-none fixed z-[9998] top-0 left-0 rounded-full border border-[#8B5CF6]/50 transition-[width,height,background-color,border-color] duration-150 ease-out -translate-x-1/2 -translate-y-1/2 will-change-transform ${
          isHovering
            ? 'w-9 h-9 border-[#00D9FF] bg-[#8B5CF6]/10 scale-110'
            : 'w-6 h-6 border-[#C7CBD3]/40 scale-100'
        }`}
        style={{
          transform: 'translate3d(-100px, -100px, 0) translate(-50%, -50%)',
        }}
      />
    </>
  );
};
