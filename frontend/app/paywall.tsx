import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/src/theme';
import { api, ProPackages } from '@/src/api';
import { useEyeGuard } from '@/src/state/EyeGuardContext';

const BENEFITS = [
  { icon: 'stats-chart', text: 'Detailed stats, weekly charts & streaks' },
  { icon: 'happy', text: 'Child Mode with PIN lock' },
  { icon: 'options', text: 'Full distance customization (15–60 cm)' },
  { icon: 'shield-checkmark', text: 'Priority eye-care reminders' },
];

export default function Paywall() {
  const router = useRouter();
  const { refreshPro, pro } = useEyeGuard();
  const [packages, setPackages] = useState<ProPackages | null>(null);
  const [selected, setSelected] = useState<'monthly' | 'yearly'>('yearly');
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const pollRef = useRef(false);

  useEffect(() => {
    api.proPackages().then(setPackages).catch(() => {});
  }, []);

  useEffect(() => {
    if (pro?.is_pro && pro?.paid_mode_enabled) {
      // already pro
    }
  }, [pro]);

  const pollStatus = async (sessionId: string) => {
    for (let i = 0; i < 30; i++) {
      if (!pollRef.current) return;
      await new Promise((r) => setTimeout(r, 2500));
      try {
        const s = await api.checkoutStatus(sessionId);
        if (s.paid) {
          setStatusMsg('Payment successful! Unlocking Pro…');
          await refreshPro();
          setTimeout(() => router.back(), 900);
          return;
        }
        if (s.terminal) {
          setStatusMsg('Payment was not completed.');
          return;
        }
      } catch {
        // keep polling
      }
    }
    setStatusMsg('Still processing. Pull to refresh in a moment.');
  };

  const subscribe = async () => {
    setBusy(true);
    setStatusMsg('');
    pollRef.current = true;
    try {
      const origin =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? window.location.origin
          : (process.env.EXPO_PUBLIC_BACKEND_URL as string);
      const { checkout_url, session_id } = await api.createCheckout(selected, origin);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(checkout_url, '_blank');
      } else {
        await WebBrowser.openBrowserAsync(checkout_url);
      }
      setStatusMsg('Verifying payment…');
      await pollStatus(session_id);
    } catch (e: any) {
      setStatusMsg(e?.message || 'Could not start checkout');
    } finally {
      setBusy(false);
    }
  };

  const monthly = packages?.monthly;
  const yearly = packages?.yearly;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable testID="paywall-close" onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={theme.color.onSurface} />
        </Pressable>

        <LinearGradient
          colors={[theme.color.brandPrimary, theme.color.brandSecondary]}
          style={styles.hero}
        >
          <View style={styles.crown}>
            <Ionicons name="star" size={36} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>EyeGuard Pro</Text>
          <Text style={styles.heroSub}>Protect every pair of eyes at home</Text>
        </LinearGradient>

        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b.text} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Ionicons name={b.icon as any} size={18} color={theme.color.brandPrimary} />
              </View>
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>

        <Pressable
          testID="plan-yearly"
          onPress={() => setSelected('yearly')}
          style={[styles.plan, selected === 'yearly' && styles.planActive]}
        >
          <View style={styles.bestBadge}>
            <Text style={styles.bestText}>BEST VALUE</Text>
          </View>
          <View style={styles.planLeft}>
            <View style={[styles.radio, selected === 'yearly' && styles.radioOn]}>
              {selected === 'yearly' && <View style={styles.radioDot} />}
            </View>
            <View>
              <Text style={styles.planName}>Yearly Pass</Text>
              <Text style={styles.planMeta}>{yearly?.days ?? 365} days access</Text>
            </View>
          </View>
          <Text style={styles.planPrice}>${yearly?.amount ?? '14.99'}</Text>
        </Pressable>

        <Pressable
          testID="plan-monthly"
          onPress={() => setSelected('monthly')}
          style={[styles.plan, selected === 'monthly' && styles.planActive]}
        >
          <View style={styles.planLeft}>
            <View style={[styles.radio, selected === 'monthly' && styles.radioOn]}>
              {selected === 'monthly' && <View style={styles.radioDot} />}
            </View>
            <View>
              <Text style={styles.planName}>Monthly Pass</Text>
              <Text style={styles.planMeta}>{monthly?.days ?? 30} days access</Text>
            </View>
          </View>
          <Text style={styles.planPrice}>${monthly?.amount ?? '1.99'}</Text>
        </Pressable>

        {!!statusMsg && (
          <Text testID="paywall-status" style={styles.statusMsg}>
            {statusMsg}
          </Text>
        )}

        <Pressable
          testID="subscribe-btn"
          onPress={subscribe}
          disabled={busy}
          style={[styles.cta, busy && { opacity: 0.6 }]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-open" size={18} color="#fff" />
              <Text style={styles.ctaText}>Unlock Pro</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.disclaimer}>
          One-time pass (not auto-renewing). Test mode: use card 4242 4242 4242 4242.
        </Text>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.surface },
  scroll: { padding: 16, gap: 16 },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.surfaceSecondary,
  },
  hero: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  crown: {
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  benefits: { gap: 12, paddingHorizontal: 4 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.color.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: { flex: 1, fontSize: 14, color: theme.color.onSurface, fontWeight: '500' },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: theme.color.border,
  },
  planActive: { borderColor: theme.color.brandPrimary, backgroundColor: theme.color.brandTertiary + '40' },
  planLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: theme.color.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: theme.color.brandPrimary },
  radioDot: { width: 12, height: 12, borderRadius: 999, backgroundColor: theme.color.brandPrimary },
  planName: { fontSize: 16, fontWeight: '700', color: theme.color.onSurface },
  planMeta: { fontSize: 12, color: theme.color.onSurfaceTertiary },
  planPrice: { fontSize: 20, fontWeight: '800', color: theme.color.onSurface },
  bestBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: theme.color.warning,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  bestText: { fontSize: 10, fontWeight: '800', color: theme.color.onWarning },
  statusMsg: { textAlign: 'center', fontSize: 13, color: theme.color.info, fontWeight: '600' },
  cta: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.color.brandPrimary,
    padding: 16,
    borderRadius: 999,
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  disclaimer: { textAlign: 'center', fontSize: 11, color: theme.color.onSurfaceTertiary },
});
