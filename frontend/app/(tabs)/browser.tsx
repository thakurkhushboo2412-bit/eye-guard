import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { useI18n } from '@/src/i18n/I18nContext';

const PRESETS = [
  { key: 'youtube', name: 'YouTube', url: 'https://m.youtube.com', color: '#FF0000', icon: 'logo-youtube' as const },
  { key: 'instagram', name: 'Instagram', url: 'https://www.instagram.com', color: '#E1306C', icon: 'logo-instagram' as const },
  { key: 'facebook', name: 'Facebook', url: 'https://m.facebook.com', color: '#1877F2', icon: 'logo-facebook' as const },
  { key: 'x', name: 'X (Twitter)', url: 'https://mobile.twitter.com', color: '#000', icon: 'logo-twitter' as const },
  { key: 'reddit', name: 'Reddit', url: 'https://m.reddit.com', color: '#FF4500', icon: 'logo-reddit' as const },
  { key: 'tiktok', name: 'TikTok', url: 'https://m.tiktok.com', color: '#000', icon: 'musical-notes' as const },
];

export default function BrowserScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [url, setUrl] = useState('');

  const openUrl = (u: string) => {
    let target = u.trim();
    if (!target) return;
    if (!/^https?:\/\//i.test(target)) target = 'https://' + target;
    router.push({ pathname: '/interstitial', params: { url: target } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{t('browse.title')}</Text>
        <Text style={styles.subtitle}>{t('browse.subtitle')}</Text>

        <View style={styles.urlBar}>
          <Ionicons name="search" size={18} color={theme.color.onSurfaceTertiary} />
          <TextInput
            testID="url-input"
            placeholder={t('browse.search')}
            placeholderTextColor={theme.color.onSurfaceTertiary}
            value={url}
            onChangeText={setUrl}
            style={styles.urlInput}
            autoCapitalize="none"
            keyboardType="url"
            returnKeyType="go"
            onSubmitEditing={() => openUrl(url || 'https://www.google.com')}
          />
          <Pressable
            testID="url-go"
            onPress={() => openUrl(url || 'https://www.google.com')}
            style={styles.goBtn}
          >
            <Ionicons name="arrow-forward" size={18} color={theme.color.onBrandPrimary} />
          </Pressable>
        </View>

        <Text style={styles.section}>{t('browse.popular')}</Text>
        <View style={styles.grid}>
          {PRESETS.map((p) => (
            <Pressable
              key={p.key}
              testID={`preset-${p.key}`}
              onPress={() => openUrl(p.url)}
              style={styles.tile}
            >
              <View style={[styles.tileIcon, { backgroundColor: p.color + '15' }]}>
                <Ionicons name={p.icon} size={28} color={p.color} />
              </View>
              <Text style={styles.tileText}>{p.name}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.surface },
  scroll: { padding: 16, gap: 12 },
  title: { fontSize: 26, fontWeight: '800', color: theme.color.onSurface },
  subtitle: { fontSize: 13, color: theme.color.onSurfaceTertiary, marginBottom: 8 },
  urlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  urlInput: { flex: 1, fontSize: 14, color: theme.color.onSurface, paddingVertical: 8 },
  goBtn: {
    backgroundColor: theme.color.brandPrimary,
    padding: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: theme.color.onSurfaceTertiary,
    textTransform: 'uppercase',
    marginTop: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '48%',
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: { fontSize: 14, fontWeight: '600', color: theme.color.onSurface },
});
