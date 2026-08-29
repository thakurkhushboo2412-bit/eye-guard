import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/src/theme';
import { useEyeGuard } from '@/src/state/EyeGuardContext';
import { DistanceBadge, TooCloseOverlay } from '@/src/components/DistanceOverlay';
import { SponsorBanner } from '@/src/components/Ads';

const PAUSE_SCRIPT = `
  (function(){
    try {
      document.querySelectorAll('video').forEach(function(v){ try{ v.pause(); }catch(e){} });
      document.querySelectorAll('audio').forEach(function(a){ try{ a.pause(); }catch(e){} });
    } catch(e){}
  })();
  true;
`;

function WebContent({ target, webRef, setLoading }: any) {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webFallback}>
        <Ionicons name="globe-outline" size={48} color={theme.color.onSurfaceTertiary} />
        <Text style={styles.webFallbackTitle}>In-app browser</Text>
        <Text style={styles.webFallbackText}>
          Embedded browsing works inside the mobile app (Expo Go / build). On web preview, open the site in a new tab.
        </Text>
        <Pressable
          testID="web-open-tab"
          onPress={() => {
            if (typeof window !== 'undefined') window.open(target, '_blank');
          }}
          style={styles.webOpenBtn}
        >
          <Text style={styles.webOpenText}>Open {target.replace(/^https?:\/\//, '')}</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <WebView
      testID="webview"
      ref={webRef}
      source={{ uri: target }}
      onLoadStart={() => setLoading(true)}
      onLoadEnd={() => setLoading(false)}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      style={{ flex: 1, backgroundColor: '#000' }}
    />
  );
}

export default function ViewerScreen() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const router = useRouter();
  const { startMonitor, stopMonitor, monitor, simulateClose } = useEyeGuard();
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    startMonitor();
    return () => stopMonitor();
  }, [startMonitor, stopMonitor]);

  useEffect(() => {
    if (monitor.isTooClose && webRef.current) {
      webRef.current.injectJavaScript(PAUSE_SCRIPT);
    }
  }, [monitor.isTooClose]);

  const target = typeof url === 'string' && url ? url : 'https://www.google.com';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          testID="viewer-back"
          onPress={() => router.back()}
          style={styles.iconBtn}
        >
          <Ionicons name="close" size={22} color={theme.color.onSurface} />
        </Pressable>
        <View style={styles.urlPill}>
          <Ionicons name="lock-closed" size={12} color={theme.color.onSurfaceTertiary} />
          <Text numberOfLines={1} style={styles.urlText}>
            {target.replace(/^https?:\/\//, '')}
          </Text>
        </View>
        <Pressable
          testID="viewer-reload"
          onPress={() => webRef.current?.reload()}
          style={styles.iconBtn}
        >
          <Ionicons name="refresh" size={20} color={theme.color.onSurface} />
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        <WebContent target={target} webRef={webRef} setLoading={setLoading} />
        {loading && Platform.OS !== 'web' && (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.color.brandPrimary} />
          </View>
        )}
        <DistanceBadge />
        <TooCloseOverlay />

        <Pressable
          testID="simulate-close-btn"
          onPress={() => simulateClose(!monitor.isTooClose)}
          style={styles.simulateBtn}
        >
          <Ionicons
            name={monitor.isTooClose ? 'sunny' : 'contract'}
            size={18}
            color="#fff"
          />
          <Text style={styles.simulateText}>
            {monitor.isTooClose ? 'Simulate: back' : 'Simulate: too close'}
          </Text>
        </Pressable>
      </View>
      <SponsorBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.surface },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.color.surfaceSecondary,
    borderBottomWidth: 1,
    borderColor: theme.color.border,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.surface,
  },
  urlPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.color.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  urlText: { fontSize: 12, color: theme.color.onSurface, flex: 1 },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simulateBtn: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.color.surfaceInverse,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  simulateText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
    backgroundColor: theme.color.surface,
  },
  webFallbackTitle: { fontSize: 18, fontWeight: '700', color: theme.color.onSurface },
  webFallbackText: {
    fontSize: 13,
    color: theme.color.onSurfaceTertiary,
    textAlign: 'center',
    lineHeight: 19,
  },
  webOpenBtn: {
    marginTop: 8,
    backgroundColor: theme.color.brandPrimary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  webOpenText: { color: '#fff', fontWeight: '700' },
});
