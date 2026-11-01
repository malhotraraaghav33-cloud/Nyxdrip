import { useEffect, useState } from 'react';

// Launch promotion: ends Tuesday, 3 November 2026 at 02:00 India Standard Time.
// The server's database clock determines eligibility when an order is created.
export const LAUNCH_FREE_SHIPPING_END = Date.parse('2026-11-03T02:00:00+05:30');

export const isLaunchFreeShippingActive = (now: number = Date.now()) =>
  now < LAUNCH_FREE_SHIPPING_END;

export const getLaunchOfferRemainingMs = (now: number = Date.now()) =>
  Math.max(0, LAUNCH_FREE_SHIPPING_END - now);

// Refresh the UI exactly when the launch offer expires, even if the page stays open.
export const useLaunchFreeShipping = () => {
  const [active, setActive] = useState(isLaunchFreeShippingActive);
  useEffect(() => {
    const refresh = () => setActive(isLaunchFreeShippingActive());
    const timer = window.setInterval(refresh, 1000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return active;
};
