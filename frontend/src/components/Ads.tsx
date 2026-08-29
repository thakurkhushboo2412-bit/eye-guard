import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/src/theme';
import { AdMobBannerImpl } from '@/src/ads/impl';
import { api, Sponsor } from '@/src/api';

/** Google AdMob banner — only renders in a native build. No-op on web / Expo Go. */
export function AdMobBanner() {
  return <AdMobBannerImpl />;
}

/** Owner-controlled sponsor banner — works everywhere (incl. preview/web). */
export function SponsorBanner() {
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .getSponsor()
      .then((s) => {
        if (mounted && s.enabled && s.title) {
          setSponsor(s);
          api.adImpression().catch(() => {});
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  if (!sponsor) {
    return <AdMobBanner />;
  }

  const onPress = () => {
    api.adClick().catch(() => {});
    if (sponsor.link) Linking.openURL(sponsor.link).catch(() => {});
  };

  return (
    <View>
      <Pressable testID="sponsor-banner" onPress={onPress} style={styles.sponsor}>
        {!!sponsor.image_url && (
          <Image source={{ uri: sponsor.image_url }} style={styles.sponsorImg} contentFit="cover" />
        )}
        <View style={styles.sponsorBody}>
          <Text style={styles.sponsorAd}>Sponsored</Text>
          <Text numberOfLines={1} style={styles.sponsorTitle}>
            {sponsor.title}
          </Text>
          {!!sponsor.subtitle && (
            <Text numberOfLines={1} style={styles.sponsorSub}>
              {sponsor.subtitle}
            </Text>
          )}
        </View>
        <Ionicons name="open-outline" size={18} color={theme.color.brandPrimary} />
      </Pressable>
      <AdMobBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  sponsor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    backgroundColor: theme.color.surfaceSecondary,
    borderTopWidth: 1,
    borderColor: theme.color.border,
  },
  sponsorImg: { width: 44, height: 44, borderRadius: 8, backgroundColor: theme.color.surfaceTertiary },
  sponsorBody: { flex: 1 },
  sponsorAd: { fontSize: 9, fontWeight: '800', color: theme.color.warning, letterSpacing: 0.5 },
  sponsorTitle: { fontSize: 14, fontWeight: '700', color: theme.color.onSurface },
  sponsorSub: { fontSize: 12, color: theme.color.onSurfaceTertiary },
});
