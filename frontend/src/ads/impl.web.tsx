import React from 'react';

// Web stub — AdMob native module is never bundled on web.
export const adsAvailable = false;

export function AdMobBannerImpl(): React.ReactElement | null {
  return null;
}

export function showInterstitial(onClosed: () => void): void {
  onClosed();
}
