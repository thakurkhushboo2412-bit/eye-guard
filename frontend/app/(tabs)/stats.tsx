import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/src/theme';
import { api, DailyStat, StreakInfo } from '@/src/api';
import { useEyeGuard } from '@/src/state/EyeGuardContext';
import { useI18n } from '@/src/i18n/I18nContext';

function formatSec(s: number) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

export default function StatsScreen() {
  const router = useRouter();
  const { pro, refreshPro } = useEyeGuard();
  const { t } = useI18n();
  const [week, setWeek] = useState<DailyStat[]>([]);
  const [today, setToday] = useState<DailyStat | null>(null);
  const [streak, setStreak] = useState<StreakInfo | null>(null);

  const load = useCallback(async () => {
    try {
      const [w, t, s] = await Promise.all([api.week(), api.today(), api.streak()]);
      setWeek(w);
      setToday(t);
      setStreak(s);
    } catch (e) {
      console.log('stats load fail', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      refreshPro();
    }, [load, refreshPro])
  );

  const locked = pro ? !pro.is_pro : false;
  const maxClose = Math.max(1, ...week.map((d) => d.close_seconds));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{t('stats.title')}</Text>

        {locked && (
          <View testID="stats-lock" style={styles.lockCard}>
            <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
            <View style={styles.lockInner}>
              <View style={styles.lockBadge}>
                <Ionicons name="lock-closed" size={24} color={theme.color.brandPrimary} />
              </View>
              <Text style={styles.lockTitle}>{t('stats.lockedTitle')}</Text>
              <Text style={styles.lockSub}>{t('stats.lockedSub')}</Text>
              <Pressable
                testID="stats-unlock-btn"
                onPress={() => router.push('/paywall')}
                style={styles.lockBtn}
              >
                <Ionicons name="star" size={16} color="#fff" />
                <Text style={styles.lockBtnText}>{t('stats.unlock')}</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.statRow}>
          <StatCard
            icon="time-outline"
            color={theme.color.error}
            label={t('stats.tooCloseToday')}
            value={formatSec(today?.close_seconds ?? 0)}
            testID="stat-close"
          />
          <StatCard
            icon="pulse"
            color={theme.color.info}
            label={t('stats.totalScreen')}
            value={formatSec(today?.total_seconds ?? 0)}
            testID="stat-total"
          />
        </View>
        <View style={styles.statRow}>
          <StatCard
            icon="flame"
            color={theme.color.warning}
            label={t('stats.currentStreak')}
            value={`${streak?.current_streak ?? 0} days`}
            testID="stat-streak"
          />
          <StatCard
            icon="trophy"
            color={theme.color.brandPrimary}
            label={t('stats.bestStreak')}
            value={`${streak?.best_streak ?? 0} days`}
            testID="stat-best"
          />
        </View>

        <Text style={styles.section}>{t('stats.last7')}</Text>
        <View testID="week-chart" style={styles.chartCard}>
          {week.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="bar-chart" size={40} color={theme.color.onSurfaceTertiary} />
              <Text style={styles.emptyText}>No data yet. Start monitoring to see stats.</Text>
            </View>
          ) : (
            <View style={styles.chart}>
              {week.map((d) => {
                const h = (d.close_seconds / maxClose) * 120;
                return (
                  <View key={d.day} style={styles.chartBar}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { height: Math.max(4, h) },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>{d.day.slice(-2)}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View testID="goal-card" style={styles.goalCard}>
          <Ionicons name="ribbon" size={20} color={theme.color.brandPrimary} />
          <Text style={styles.goalText}>
            Daily goal: keep too-close time under {formatSec(streak?.goal_daily_close_seconds ?? 300)}
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  color,
  label,
  value,
  testID,
}: {
  icon: any;
  color: string;
  label: string;
  value: string;
  testID: string;
}) {
  return (
    <View testID={testID} style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.surface },
  scroll: { padding: 16, gap: 12 },
  title: { fontSize: 26, fontWeight: '800', color: theme.color.onSurface, marginBottom: 4 },
  statRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 16,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: theme.color.onSurface },
  statLabel: { fontSize: 12, color: theme.color.onSurfaceTertiary },
  section: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.color.onSurfaceTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  chartCard: {
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.color.border,
    minHeight: 180,
  },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  emptyText: { color: theme.color.onSurfaceTertiary, fontSize: 13 },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
    paddingHorizontal: 4,
  },
  chartBar: { alignItems: 'center', gap: 6, flex: 1 },
  barTrack: { height: 120, justifyContent: 'flex-end' },
  barFill: {
    width: 18,
    backgroundColor: theme.color.brandPrimary,
    borderRadius: 6,
  },
  barLabel: { fontSize: 11, color: theme.color.onSurfaceTertiary },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.color.brandTertiary,
    borderRadius: 14,
    padding: 14,
  },
  goalText: { flex: 1, fontSize: 13, color: theme.color.onBrandTertiary, fontWeight: '600' },
  lockCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: theme.color.brandTertiary + '60',
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  lockInner: { alignItems: 'center', gap: 8, padding: 24 },
  lockBadge: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: theme.color.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockTitle: { fontSize: 17, fontWeight: '800', color: theme.color.onSurface },
  lockSub: { fontSize: 13, color: theme.color.onSurfaceTertiary, textAlign: 'center' },
  lockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.color.brandPrimary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: 8,
  },
  lockBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
