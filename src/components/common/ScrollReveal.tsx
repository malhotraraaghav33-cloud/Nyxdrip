import React, { useRef, useState, useEffect } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  animation?: 'fade-up' | 'scale-in' | 'slide-left' | 'slide-right' | 'clip-reveal';
  delay?: number; // ms
  duration?: number; // ms
  className?: string;
  threshold?: number;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  animation = 'fade-up',
  delay = 0,
  duration = 600,
  className = '',
  threshold = 0.15,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    if (mediaQuery.matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    const currentEl = elementRef.current;
    if (currentEl) {
      observer.observe(currentEl);
    }

    return () => {
      if (currentEl) observer.unobserve(currentEl);
    };
  }, [threshold]);

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const getAnimationStyles = (): React.CSSProperties => {
    const baseTransition = `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, clip-path ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`;

    if (!isVisible) {
      switch (animation) {
        case 'fade-up':
          return {
            opacity: 0,
            transform: 'translate3d(0, 32px, 0)',
            transition: baseTransition,
          };
        case 'scale-in':
          return {
            opacity: 0,
            transform: 'scale(0.96) translate3d(0, 16px, 0)',
            transition: baseTransition,
          };
        case 'slide-left':
          return {
            opacity: 0,
            transform: 'translate3d(40px, 0, 0)',
            transition: baseTransition,
          };
        case 'slide-right':
          return {
            opacity: 0,
            transform: 'translate3d(-40px, 0, 0)',
            transition: baseTransition,
          };
        case 'clip-reveal':
          return {
            opacity: 0,
            clipPath: 'inset(10% 0 10% 0)',
            transform: 'scale(1.04)',
            transition: baseTransition,
          };
        default:
          return {
            opacity: 0,
            transform: 'translate3d(0, 24px, 0)',
            transition: baseTransition,
          };
      }
    }

    return {
      opacity: 1,
      transform: 'translate3d(0, 0, 0) scale(1)',
      clipPath: 'inset(0% 0 0% 0)',
      transition: baseTransition,
    };
  };

  return (
    <div
      ref={elementRef}
      className={className}
      style={getAnimationStyles()}
    >
      {children}
    </div>
  );
};
