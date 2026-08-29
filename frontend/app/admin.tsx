import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Switch,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api, Sponsor, AdStats } from '@/src/api';
import { useEyeGuard } from '@/src/state/EyeGuardContext';

export default function AdminScreen() {
  const router = useRouter();
  const { refreshPro } = useEyeGuard();
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState('');
  const [paidMode, setPaidMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sponsor, setSponsor] = useState<Sponsor>({
    enabled: false,
    title: '',
    subtitle: '',
    image_url: '',
    link: '',
  });
  const [stats, setStats] = useState<AdStats | null>(null);
  const [savingSponsor, setSavingSponsor] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const loadAdmin = async (c: string) => {
    const [cfg, sp, st] = await Promise.all([
      api.adminConfig(c),
      api.getSponsor(),
      api.adStats(c),
    ]);
    setPaidMode(cfg.paid_mode_enabled);
    setSponsor(sp);
    setStats(st);
  };

  const unlock = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await api.adminVerify(code);
      if (!r.ok) {
        setError('Wrong admin code');
        setBusy(false);
        return;
      }
      await loadAdmin(code);
      setUnlocked(true);
    } catch (e) {
      setError('Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const togglePaid = async (val: boolean) => {
    setPaidMode(val);
    try {
      await api.setPaidMode(code, val);
      await refreshPro();
    } catch (e) {
      setPaidMode(!val);
      setError('Failed to update');
    }
  };

  const saveSponsor = async () => {
    setSavingSponsor(true);
    setSavedMsg('');
    try {
      await api.updateSponsor(code, sponsor);
      setSavedMsg('Saved!');
      setTimeout(() => setSavedMsg(''), 1500);
    } catch (e) {
      setError('Failed to save sponsor');
    } finally {
      setSavingSponsor(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable testID="admin-back" onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.color.onSurface} />
        </Pressable>
        <Text style={styles.title}>Owner Panel</Text>
        <View style={{ width: 40 }} />
      </View>

      {!unlocked ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.lockWrap}
        >
          <View style={styles.lockIcon}>
            <Ionicons name="shield-half" size={44} color={theme.color.brandPrimary} />
          </View>
          <Text style={styles.lockTitle}>Enter admin code</Text>
          <Text style={styles.lockSub}>Owner-only controls for monetization</Text>
          <TextInput
            testID="admin-code-input"
            value={code}
            onChangeText={(t) => setCode(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={8}
            placeholder="••••••"
            placeholderTextColor={theme.color.onSurfaceTertiary}
            style={styles.codeInput}
          />
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          <Pressable
            testID="admin-unlock-btn"
            onPress={unlock}
            disabled={busy || code.length < 4}
            style={[styles.cta, (busy || code.length < 4) && { opacity: 0.5 }]}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Unlock</Text>}
          </Pressable>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView contentContainerStyle={styles.panel}>
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Ionicons name="cash" size={20} color={theme.color.brandPrimary} />
              <Text style={styles.cardTitle}>Monetization</Text>
            </View>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Paid Mode</Text>
                <Text style={styles.toggleDesc}>
                  {paidMode
                    ? 'ON — Pro features locked behind subscription'
                    : 'OFF — All features free for everyone'}
                </Text>
              </View>
              <Switch
                testID="paid-mode-toggle"
                value={paidMode}
                onValueChange={togglePaid}
                trackColor={{ true: theme.color.brandPrimary, false: theme.color.surfaceTertiary }}
              />
            </View>
          </View>

          <View
            style={[
              styles.statusPill,
              { backgroundColor: paidMode ? theme.color.warning + '22' : theme.color.success + '22' },
            ]}
          >
            <Ionicons
              name={paidMode ? 'lock-closed' : 'gift'}
              size={18}
              color={paidMode ? theme.color.warning : theme.color.success}
            />
            <Text style={styles.statusText}>
              {paidMode
                ? 'Users must subscribe to unlock Stats & Child Mode.'
                : 'Free launch active — everything unlocked.'}
            </Text>
          </View>

          {/* Earnings dashboard */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Ionicons name="trending-up" size={20} color={theme.color.success} />
              <Text style={styles.cardTitle}>Ad Earnings</Text>
            </View>
            <View style={styles.earnRow}>
              <View style={styles.earnBox}>
                <Text style={styles.earnValue}>${stats?.estimated_earnings ?? '0.00'}</Text>
                <Text style={styles.earnLabel}>Est. earnings</Text>
              </View>
              <View style={styles.earnBox}>
                <Text style={styles.earnValue}>{stats?.impressions ?? 0}</Text>
                <Text style={styles.earnLabel}>Impressions</Text>
              </View>
              <View style={styles.earnBox}>
                <Text style={styles.earnValue}>{stats?.clicks ?? 0}</Text>
                <Text style={styles.earnLabel}>Clicks</Text>
              </View>
            </View>
            <Text style={styles.earnNote}>
              CTR {stats?.ctr ?? 0}% · Estimate from sponsor traffic. Real AdMob revenue shows in your AdMob dashboard.
            </Text>
          </View>

          {/* Sponsor banner manager */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Ionicons name="megaphone" size={20} color={theme.color.warning} />
              <Text style={styles.cardTitle}>Sponsor Banner</Text>
            </View>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Show sponsor ad</Text>
                <Text style={styles.toggleDesc}>Displays in browser + before opening apps</Text>
              </View>
              <Switch
                testID="sponsor-toggle"
                value={sponsor.enabled}
                onValueChange={(v) => setSponsor((s) => ({ ...s, enabled: v }))}
                trackColor={{ true: theme.color.brandPrimary, false: theme.color.surfaceTertiary }}
              />
            </View>
            <Field
              label="Title"
              value={sponsor.title}
              onChange={(t) => setSponsor((s) => ({ ...s, title: t }))}
              placeholder="Your ad headline"
              testID="sponsor-title"
            />
            <Field
              label="Subtitle"
              value={sponsor.subtitle}
              onChange={(t) => setSponsor((s) => ({ ...s, subtitle: t }))}
              placeholder="Short description"
              testID="sponsor-subtitle"
            />
            <Field
              label="Image URL"
              value={sponsor.image_url}
              onChange={(t) => setSponsor((s) => ({ ...s, image_url: t }))}
              placeholder="https://…/banner.jpg"
              testID="sponsor-image"
            />
            <Field
              label="Link URL"
              value={sponsor.link}
              onChange={(t) => setSponsor((s) => ({ ...s, link: t }))}
              placeholder="https://your-offer.com"
              testID="sponsor-link"
            />
            <Pressable
              testID="sponsor-save"
              onPress={saveSponsor}
              disabled={savingSponsor}
              style={[styles.saveBtn, savingSponsor && { opacity: 0.6 }]}
            >
              {savingSponsor ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>{savedMsg || 'Save sponsor'}</Text>
              )}
            </Pressable>
          </View>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={18} color={theme.color.info} />
            <Text style={styles.infoText}>
              Google AdMob real ads (banner + interstitial) are wired in and will earn automatically once you publish a build and add your AdMob IDs. Sponsor banner works everywhere including preview.
            </Text>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  testID,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
  testID: string;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.color.onSurfaceTertiary}
        autoCapitalize="none"
        style={styles.fieldInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.surfaceSecondary,
  },
  title: { fontSize: 18, fontWeight: '800', color: theme.color.onSurface },
  lockWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  lockIcon: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: theme.color.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  lockTitle: { fontSize: 20, fontWeight: '800', color: theme.color.onSurface },
  lockSub: { fontSize: 13, color: theme.color.onSurfaceTertiary },
  codeInput: {
    width: '70%',
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
    color: theme.color.onSurface,
    borderWidth: 1,
    borderColor: theme.color.border,
    marginTop: 8,
  },
  errorText: { color: theme.color.error, fontSize: 13, fontWeight: '600' },
  cta: {
    width: '70%',
    backgroundColor: theme.color.brandPrimary,
    padding: 16,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  panel: { padding: 16, gap: 12 },
  card: {
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 20,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: theme.color.onSurface },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleTitle: { fontSize: 15, fontWeight: '700', color: theme.color.onSurface },
  toggleDesc: { fontSize: 12, color: theme.color.onSurfaceTertiary, marginTop: 2 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
  },
  statusText: { flex: 1, fontSize: 13, color: theme.color.onSurface, fontWeight: '500' },
  infoCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  infoText: { flex: 1, fontSize: 12, color: theme.color.onSurfaceTertiary, lineHeight: 17 },
  earnRow: { flexDirection: 'row', gap: 10 },
  earnBox: {
    flex: 1,
    backgroundColor: theme.color.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 2,
  },
  earnValue: { fontSize: 18, fontWeight: '800', color: theme.color.onSurface },
  earnLabel: { fontSize: 11, color: theme.color.onSurfaceTertiary },
  earnNote: { fontSize: 11, color: theme.color.onSurfaceTertiary, lineHeight: 15 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.color.onSurfaceTertiary },
  fieldInput: {
    backgroundColor: theme.color.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.color.onSurface,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  saveBtn: {
    backgroundColor: theme.color.brandPrimary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
