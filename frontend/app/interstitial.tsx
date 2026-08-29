import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api, Sponsor } from '@/src/api';
import { adsAvailable, showInterstitial } from '@/src/ads/impl';

const SKIP_SECONDS = 5;

export default function InterstitialScreen() {
  const router = useRouter();
  const { url } = useLocalSearchParams<{ url: string }>();
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [count, setCount] = useState(SKIP_SECONDS);
  const [ready, setReady] = useState(false);
  const proceeded = useRef(false);

  const proceed = () => {
    if (proceeded.current) return;
    proceeded.current = true;
    router.replace({ pathname: '/viewer', params: { url: url as string } });
  };

  // Native AdMob interstitial attempt
  useEffect(() => {
    if (!adsAvailable) return;
    let cancelled = false;
    showInterstitial(() => {
      if (!cancelled) proceed();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sponsor full-screen ad (works in preview/web)
  useEffect(() => {
    let mounted = true;
    api
      .getSponsor()
      .then((s) => {
        if (!mounted) return;
        if (s.enabled && s.title) {
          setSponsor(s);
          setReady(true);
          api.adImpression().catch(() => {});
        } else if (!adsAvailable) {
          // No ad to show and no native ads → go straight through
          proceed();
        } else {
          setReady(true);
        }
      })
      .catch(() => {
        if (!adsAvailable) proceed();
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !sponsor) return;
    if (count <= 0) return;
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, ready, sponsor]);

  if (!sponsor) {
    return (
      <SafeAreaView style={styles.loadingSafe}>
        <Text style={styles.loadingText}>Loading…</Text>
      </SafeAreaView>
    );
  }

  const onSponsorPress = () => {
    api.adClick().catch(() => {});
    if (sponsor.link) Linking.openURL(sponsor.link).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.adTag}>Sponsored</Text>
        {count > 0 ? (
          <View style={styles.countPill}>
            <Text style={styles.countText}>Skip in {count}s</Text>
          </View>
        ) : (
          <Pressable testID="interstitial-skip" onPress={proceed} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.color.onSurface} />
          </Pressable>
        )}
      </View>

      <Pressable testID="interstitial-ad" onPress={onSponsorPress} style={styles.adBody}>
        {!!sponsor.image_url && (
          <Image source={{ uri: sponsor.image_url }} style={styles.adImg} contentFit="cover" />
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.scrim} />
        <View style={styles.adContent}>
          <Text style={styles.adTitle}>{sponsor.title}</Text>
          {!!sponsor.subtitle && <Text style={styles.adSub}>{sponsor.subtitle}</Text>}
          {!!sponsor.link && (
            <View style={styles.ctaPill}>
              <Text style={styles.ctaText}>Learn more</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </View>
          )}
        </View>
      </Pressable>

      <Pressable
        testID="interstitial-continue"
        onPress={proceed}
        disabled={count > 0}
        style={[styles.continueBtn, count > 0 && { opacity: 0.4 }]}
      >
        <Text style={styles.continueText}>
          {count > 0 ? `Continue in ${count}s` : 'Continue to content'}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  loadingSafe: { flex: 1, backgroundColor: theme.color.surface, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: theme.color.onSurfaceTertiary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  adTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    letterSpacing: 0.5,
  },
  countPill: { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  countText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  skipText: { color: theme.color.onSurface, fontWeight: '700', fontSize: 13 },
  adBody: { flex: 1, margin: 16, borderRadius: 20, overflow: 'hidden', backgroundColor: theme.color.surfaceInverse },
  adImg: { ...StyleSheet.absoluteFillObject },
  scrim: { ...StyleSheet.absoluteFillObject },
  adContent: { flex: 1, justifyContent: 'flex-end', padding: 20, gap: 8 },
  adTitle: { color: '#fff', fontSize: 26, fontWeight: '800' },
  adSub: { color: 'rgba(255,255,255,0.9)', fontSize: 15 },
  ctaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: theme.color.brandPrimary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 6,
  },
  ctaText: { color: '#fff', fontWeight: '700' },
  continueBtn: {
    margin: 16,
    marginTop: 0,
    backgroundColor: theme.color.surfaceSecondary,
    padding: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  continueText: { color: theme.color.onSurface, fontWeight: '700' },
});
