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

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayChildren(children);
      return;
    }

    setTransitionStage('fading');
    const timer = setTimeout(() => {
      setDisplayChildren(children);
      setTransitionStage('visible');
    }, 140);

    return () => clearTimeout(timer);
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
