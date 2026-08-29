import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useIconFonts } from '@/src/hooks/use-icon-fonts';
import { EyeGuardProvider } from '@/src/state/EyeGuardContext';
import { I18nProvider } from '@/src/i18n/I18nContext';

LogBox.ignoreAllLogs(true);

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <I18nProvider>
            <EyeGuardProvider>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="viewer" options={{ presentation: 'fullScreenModal' }} />
                <Stack.Screen name="interstitial" options={{ presentation: 'fullScreenModal' }} />
                <Stack.Screen name="player" options={{ presentation: 'fullScreenModal' }} />
                <Stack.Screen name="child" options={{ presentation: 'fullScreenModal' }} />
                <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
                <Stack.Screen name="admin" options={{ presentation: 'modal' }} />
                <Stack.Screen name="language" options={{ presentation: 'modal' }} />
                <Stack.Screen name="payment-return" options={{ presentation: 'fullScreenModal' }} />
              </Stack>
            </EyeGuardProvider>
          </I18nProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
