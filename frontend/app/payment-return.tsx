import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useEyeGuard } from '@/src/state/EyeGuardContext';

export default function PaymentReturn() {
  const router = useRouter();
  const { session_id, canceled } = useLocalSearchParams<{ session_id?: string; canceled?: string }>();
  const { refreshPro } = useEyeGuard();
  const [state, setState] = useState<'checking' | 'success' | 'failed'>('checking');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (canceled || !session_id) {
        setState('failed');
        return;
      }
      for (let i = 0; i < 20; i++) {
        if (cancelled) return;
        try {
          const s = await api.checkoutStatus(session_id as string);
          if (s.paid) {
            await refreshPro();
            setState('success');
            return;
          }
          if (s.terminal) {
            setState('failed');
            return;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 2000));
      }
      setState('failed');
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [session_id, canceled, refreshPro]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        {state === 'checking' && (
          <>
            <ActivityIndicator size="large" color={theme.color.brandPrimary} />
            <Text style={styles.title}>Verifying payment…</Text>
          </>
        )}
        {state === 'success' && (
          <>
            <View style={[styles.icon, { backgroundColor: theme.color.success + '22' }]}>
              <Ionicons name="checkmark-circle" size={56} color={theme.color.success} />
            </View>
            <Text style={styles.title}>You’re Pro! 🎉</Text>
            <Text style={styles.sub}>All premium features are unlocked.</Text>
          </>
        )}
        {state === 'failed' && (
          <>
            <View style={[styles.icon, { backgroundColor: theme.color.error + '22' }]}>
              <Ionicons name="close-circle" size={56} color={theme.color.error} />
            </View>
            <Text style={styles.title}>Payment not completed</Text>
            <Text style={styles.sub}>No charge was made. You can try again.</Text>
          </>
        )}
        {state !== 'checking' && (
          <Pressable testID="return-home" onPress={() => router.replace('/(tabs)')} style={styles.cta}>
            <Text style={styles.ctaText}>Back to app</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  icon: {
    width: 96,
    height: 96,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', color: theme.color.onSurface, textAlign: 'center' },
  sub: { fontSize: 14, color: theme.color.onSurfaceTertiary, textAlign: 'center' },
  cta: {
    marginTop: 16,
    backgroundColor: theme.color.brandPrimary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
