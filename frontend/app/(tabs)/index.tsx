import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { theme } from '@/src/theme';
import { api, DailyStat, StreakInfo } from '@/src/api';
import { useEyeGuard } from '@/src/state/EyeGuardContext';
import { useI18n } from '@/src/i18n/I18nContext';

const QUICK_LINKS = [
  {
    key: 'youtube',
    name: 'YouTube',
    url: 'https://m.youtube.com',
    color: '#FF0000',
    icon: 'logo-youtube' as const,
  },
  {
    key: 'instagram',
    name: 'Instagram',
    url: 'https://www.instagram.com',
    color: '#E1306C',
    icon: 'logo-instagram' as const,
  },
  {
    key: 'facebook',
    name: 'Facebook',
    url: 'https://m.facebook.com',
    color: '#1877F2',
    icon: 'logo-facebook' as const,
  },
  {
    key: 'x',
    name: 'X',
    url: 'https://mobile.twitter.com',
    color: '#000000',
    icon: 'logo-twitter' as const,
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { settings } = useEyeGuard();
  const { t } = useI18n();
  const [today, setToday] = useState<DailyStat | null>(null);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([api.today(), api.streak()]);
      setToday(t);
      setStreak(s);
    } catch (e) {
      console.log('load fail', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (settings && !settings.onboarded) {
      router.replace('/onboarding');
    }
  }, [settings, router]);

  useEffect(() => {
    if (settings?.child_mode) {
      router.replace('/child');
    }
  }, [settings?.child_mode, router]);

  const closeSecs = today?.close_seconds ?? 0;
  const totalSecs = today?.total_seconds ?? 0;
  const goal = streak?.goal_daily_close_seconds ?? 300;
  const goalReached = closeSecs <= goal && totalSecs > 0;
  const ratio = Math.min(1, closeSecs / goal);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openLink = (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push({ pathname: '/interstitial', params: { url } });
  };

  const openPlayer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push('/player');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        testID="home-scroll"
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{t('home.greeting')} 👋</Text>
            <Text style={styles.appName}>EyeGuard</Text>
          </View>
          <Pressable
            testID="child-mode-shortcut"
            onPress={() => router.push('/child')}
            style={styles.iconBtn}
          >
            <Ionicons name="happy-outline" size={20} color={theme.color.onSurface} />
          </Pressable>
        </View>

        <View testID="protection-card" style={styles.protectionCard}>
          <View style={styles.protectionTop}>
            <View style={styles.statusDot} />
            <Text style={styles.protectionLabel}>{t('home.protectionToday')}</Text>
          </View>
          <Text style={styles.protectionMain}>
            {Math.round(closeSecs)}s
            <Text style={styles.protectionMinor}>  {t('home.tooClose')}</Text>
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(ratio * 100)}%`, backgroundColor: goalReached ? theme.color.success : ratio > 0.9 ? theme.color.error : theme.color.brandPrimary },
              ]}
            />
          </View>
          <View style={styles.protectionFooter}>
            <Text style={styles.footerText}>
              {t('home.threshold')}: {settings?.threshold_cm ?? 30} cm
            </Text>
            <Text style={styles.footerText}>
              {t('home.streak')}: {streak?.current_streak ?? 0}🔥
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('home.quickLaunch')}</Text>
        <View style={styles.grid}>
          {QUICK_LINKS.map((q) => (
            <Pressable
              key={q.key}
              testID={`quick-${q.key}`}
              onPress={() => openLink(q.url)}
              style={styles.tile}
            >
              <View style={[styles.tileIcon, { backgroundColor: q.color + '15' }]}>
                <Ionicons name={q.icon} size={28} color={q.color} />
              </View>
              <Text style={styles.tileText}>{q.name}</Text>
            </Pressable>
          ))}
          <Pressable
            testID="quick-video"
            onPress={openPlayer}
            style={styles.tile}
          >
            <View style={[styles.tileIcon, { backgroundColor: theme.color.brandTertiary }]}>
              <Ionicons name="play-circle" size={28} color={theme.color.brandPrimary} />
            </View>
            <Text style={styles.tileText}>{t('home.localVideo')}</Text>
          </Pressable>
          <Pressable
            testID="quick-open-browser"
            onPress={() => router.push('/(tabs)/browser')}
            style={styles.tile}
          >
            <View style={[styles.tileIcon, { backgroundColor: theme.color.surfaceTertiary }]}>
              <Ionicons name="compass" size={28} color={theme.color.onSurface} />
            </View>
            <Text style={styles.tileText}>{t('home.webBrowser')}</Text>
          </Pressable>
        </View>

        <View testID="tip-card" style={styles.tipCard}>
          <Ionicons name="bulb" size={20} color={theme.color.warning} />
          <Text style={styles.tipText}>{t('home.tip')}</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.surface },
  scroll: { padding: 16, gap: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  greeting: { fontSize: 14, color: theme.color.onSurfaceTertiary },
  appName: { fontSize: 28, fontWeight: '800', color: theme.color.onSurface, letterSpacing: -0.5 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: theme.color.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  protectionCard: {
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 20,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  protectionTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: theme.color.success },
  protectionLabel: { fontSize: 12, color: theme.color.onSurfaceTertiary, fontWeight: '600' },
  protectionMain: { fontSize: 36, fontWeight: '800', color: theme.color.onSurface, marginTop: 4 },
  protectionMinor: { fontSize: 14, fontWeight: '500', color: theme.color.onSurfaceTertiary },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.color.surfaceTertiary,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999 },
  protectionFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  footerText: { fontSize: 12, color: theme.color.onSurfaceTertiary },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.color.onSurfaceTertiary,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '31%',
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  tileIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: { fontSize: 12, fontWeight: '600', color: theme.color.onSurface },
  tipCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    backgroundColor: '#FFF4E6',
    borderRadius: 14,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#F1E1CC',
  },
  tipText: { flex: 1, fontSize: 13, color: theme.color.onSurface, lineHeight: 18 },
});
