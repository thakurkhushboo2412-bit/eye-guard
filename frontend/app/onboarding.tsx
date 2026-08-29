import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import { theme } from '@/src/theme';
import { useEyeGuard } from '@/src/state/EyeGuardContext';

const STEPS = [
  {
    icon: 'eye' as const,
    title: 'Protect your eyes',
    desc: 'EyeGuard watches how close your phone is to your face and warns you when you cross a safe distance.',
    color: theme.color.brandPrimary,
  },
  {
    icon: 'options' as const,
    title: 'Set your threshold',
    desc: 'Choose any distance between 15 cm and 60 cm. When crossed, screen blurs and video pauses.',
    color: theme.color.info,
  },
  {
    icon: 'happy' as const,
    title: 'Kids-friendly too',
    desc: 'Enable Child Mode with a PIN to lock a simple, safe interface for your little one.',
    color: theme.color.warning,
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [perm, request] = useCameraPermissions();
  const { saveSettings } = useEyeGuard();

  const finish = async () => {
    if (!perm?.granted) {
      await request();
    }
    await saveSettings({ onboarded: true });
    router.replace('/(tabs)');
  };

  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={[styles.hero, { backgroundColor: cur.color + '15' }]}>
          <Ionicons name={cur.icon} size={80} color={cur.color} />
        </View>
        <Text style={styles.title}>{cur.title}</Text>
        <Text style={styles.desc}>{cur.desc}</Text>
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === step && styles.dotActive]}
            />
          ))}
        </View>
      </View>
      <View style={styles.footer}>
        <Pressable
          testID="onboard-next"
          onPress={() => (isLast ? finish() : setStep(step + 1))}
          style={styles.cta}
        >
          <Text style={styles.ctaText}>
            {isLast ? 'Enable camera & Start' : 'Continue'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </Pressable>
        {isLast && (
          <Pressable
            testID="onboard-skip"
            onPress={finish}
            style={styles.skipBtn}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.surface },
  content: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', gap: 16 },
  hero: {
    width: 160,
    height: 160,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800', color: theme.color.onSurface, textAlign: 'center' },
  desc: {
    fontSize: 15,
    color: theme.color.onSurfaceTertiary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  dots: { flexDirection: 'row', gap: 8, marginTop: 12 },
  dot: { width: 8, height: 8, borderRadius: 999, backgroundColor: theme.color.surfaceTertiary },
  dotActive: { backgroundColor: theme.color.brandPrimary, width: 24 },
  footer: { padding: 20, gap: 8 },
  cta: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.color.brandPrimary,
    padding: 16,
    borderRadius: 999,
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  skipBtn: { padding: 12, alignItems: 'center' },
  skipText: { color: theme.color.onSurfaceTertiary, fontSize: 13, fontWeight: '600' },
});
