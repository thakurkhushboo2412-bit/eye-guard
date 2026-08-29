import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

export const isAdMobNative = Platform.OS === 'android' || Platform.OS === 'ios';
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// AdMob native module only exists in a dev/production build (NOT Expo Go, NOT web).
export const adsEnabled = isAdMobNative && !isExpoGo;

// Google-provided TEST ad unit IDs (safe for development builds).
export const AD_UNIT_IDS = {
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
  },
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
  },
} as const;

export const getAdUnitId = (kind: 'banner' | 'interstitial') => {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  return AD_UNIT_IDS[platform][kind];
};
