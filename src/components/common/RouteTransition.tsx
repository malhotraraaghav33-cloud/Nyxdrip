import React, { useState, useEffect } from 'react';
import { ViewType } from '../../context/NavigationContext';

interface RouteTransitionProps {
  currentView: ViewType;
  children: React.ReactNode;
}

export const RouteTransition: React.FC<RouteTransitionProps> = ({ currentView, children }) => {
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState<'visible' | 'fading'>('visible');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const prevViewRef = React.useRef(currentView);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayChildren(children);
      prevViewRef.current = currentView;
      return;
    }

    // Only initiate a route fade transition if the currentView has changed
    if (prevViewRef.current !== currentView) {
      prevViewRef.current = currentView;
      setTransitionStage('fading');
      const timer = setTimeout(() => {
        setDisplayChildren(children);
        setTransitionStage('visible');
        window.scrollTo({ top: 0, behavior: 'instant' });
      }, 140);

      return () => clearTimeout(timer);
    } else {
      // When currentView is unchanged, update children immediately without fading out
      setDisplayChildren(children);
    }
  }, [currentView, children, prefersReducedMotion]);

  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  return (
    <div
      className={`transition-all duration-200 ease-out will-change-transform ${
        transitionStage === 'visible'
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-1.5'
      }`}
    >
      {displayChildren}
    </div>
  );
};
