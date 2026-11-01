// Offer expires at Tuesday 03 November 2026, 02:00 AM Asia/Kolkata.
// Keep the end instant fixed so visitors in different time zones see one deadline.
export const LAUNCH_OFFER_END_UTC_MS = Date.parse('2026-11-02T20:30:00.000Z');
export const isLaunchFreeShippingActive = (nowMs: number = Date.now()) =>
  nowMs < LAUNCH_OFFER_END_UTC_MS;

export const getLaunchOfferRemainingMs = (nowMs: number = Date.now()) =>
  Math.max(0, LAUNCH_OFFER_END_UTC_MS - nowMs);

export const formatLaunchOfferCountdown = (remainingMs: number) => {
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return days > 0
    ? `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(secs)}s`
    : `${pad(hours)}h ${pad(minutes)}m ${pad(secs)}s`;
};
