import React, { useState, useEffect, useRef } from 'react';
import { ViewType } from '../../context/NavigationContext';

interface RouteTransitionProps {
  currentView: ViewType;
  children: React.ReactNode;
}

export const RouteTransition: React.FC<RouteTransitionProps> = ({ currentView, children }) => {
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState<'visible' | 'fading'>('visible');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  );
  const prevViewRef = useRef(currentView);
  const latestChildrenRef = useRef(children);
  latestChildrenRef.current = children;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Ensure bfcache restoration (mobile Safari, Chrome, Android Back) never restores a faded-out view
  useEffect(() => {
    const handlePageShow = () => {
      setDisplayChildren(latestChildrenRef.current);
      setTransitionStage('visible');
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      prevViewRef.current = currentView;
      setDisplayChildren(latestChildrenRef.current);
      setTransitionStage('visible');
      return;
    }

    if (prevViewRef.current !== currentView) {
      prevViewRef.current = currentView;
      setTransitionStage('fading');

      const timer = window.setTimeout(() => {
        setDisplayChildren(latestChildrenRef.current);
        setTransitionStage('visible');
        window.scrollTo({ top: 0, behavior: 'instant' });
      }, 140);

      return () => window.clearTimeout(timer);
    }
  }, [currentView, prefersReducedMotion]);

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
      {transitionStage === 'visible' ? children : displayChildren}
    </div>
  );
};
