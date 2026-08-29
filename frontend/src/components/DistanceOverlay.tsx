import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/src/theme';
import { useEyeGuard } from '@/src/state/EyeGuardContext';
import { useI18n } from '@/src/i18n/I18nContext';

export function DistanceBadge() {
  const { monitor } = useEyeGuard();
  if (!monitor.active) return null;
  const near = monitor.isTooClose;
  return (
    <View
      testID="distance-badge"
      style={[styles.badge, near ? styles.badgeNear : styles.badgeSafe]}
    >
      <Ionicons
        name={near ? 'alert-circle' : 'shield-checkmark'}
        size={14}
        color={near ? '#fff' : theme.color.onSurface}
      />
      <Text style={[styles.badgeText, near && { color: '#fff' }]}>
        {monitor.distanceCm} cm
      </Text>
    </View>
  );
}

export function TooCloseOverlay() {
  const { monitor, settings, simulateClose } = useEyeGuard();
  const { t } = useI18n();
  const show = monitor.isTooClose && (settings?.alert_blur ?? true);
  useEffect(() => {
    // no-op
  }, [show]);
  if (!show) return null;
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(180)}
      style={StyleSheet.absoluteFill}
      testID="too-close-overlay"
    >
      <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.overlayContent}>
        <View style={styles.warnIcon}>
          <Ionicons name="eye-off" size={44} color="#fff" />
        </View>
        <Text style={styles.title}>{t('warn.moveAway')}</Text>
        <Text style={styles.subtitle}>
          Move device farther than {settings?.threshold_cm ?? 30} cm
        </Text>
        <Text style={styles.reading}>{monitor.distanceCm} cm</Text>
        <Pressable
          testID="overlay-release-sim"
          onPress={() => simulateClose(false)}
          style={styles.releaseBtn}
        >
          <Text style={styles.releaseText}>{t('warn.moveBack')}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 5,
  },
  badgeSafe: { backgroundColor: 'rgba(255,255,255,0.9)' },
  badgeNear: { backgroundColor: theme.color.error },
  badgeText: { fontSize: 12, fontWeight: '600', color: theme.color.onSurface },
  overlayContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  warnIcon: {
    width: 88,
    height: 88,
    borderRadius: 999,
    backgroundColor: 'rgba(201,93,93,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { color: '#fff', fontSize: 26, fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  reading: { color: '#fff', fontSize: 48, fontWeight: '800', marginTop: 8 },
  releaseBtn: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  releaseText: { color: '#fff', fontWeight: '600' },
});
