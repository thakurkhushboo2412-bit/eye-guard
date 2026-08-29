import React from 'react';
import { StyleSheet, View } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { getAdUnitId } from './admob';

// AdMob native module only exists in a dev/prod build, NOT Expo Go.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
export const adsAvailable = !isExpoGo;

let ads: any = null;
if (adsAvailable) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ads = require('react-native-google-mobile-ads');
  } catch {
    ads = null;
  }
}

export function AdMobBannerImpl(): React.ReactElement | null {
  if (!ads) return null;
  const { BannerAd, BannerAdSize } = ads;
  return (
    <View style={styles.wrap}>
      <BannerAd
        unitId={getAdUnitId('banner')}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={(e: Error) => console.warn('banner failed', e?.message)}
      />
    </View>
  );
}

export function showInterstitial(onClosed: () => void): void {
  if (!ads) {
    onClosed();
    return;
  }
  try {
    const { InterstitialAd, AdEventType } = ads;
    const ad = InterstitialAd.createForAdRequest(getAdUnitId('interstitial'));
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onClosed();
    };
    ad.addAdEventListener(AdEventType.LOADED, () => {
      try {
        ad.show();
      } catch {
        finish();
      }
    });
    ad.addAdEventListener(AdEventType.CLOSED, finish);
    ad.addAdEventListener(AdEventType.ERROR, finish);
    ad.load();
    // Safety timeout so a stuck ad never blocks navigation.
    setTimeout(finish, 6000);
  } catch {
    onClosed();
  }
}

const styles = StyleSheet.create({
  wrap: { minHeight: 50, alignItems: 'center', justifyContent: 'center' },
});
