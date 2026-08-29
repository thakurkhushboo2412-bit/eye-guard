import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '@/src/theme';
import { useEyeGuard } from '@/src/state/EyeGuardContext';
import { useI18n } from '@/src/i18n/I18nContext';
import { LANGUAGES } from '@/src/i18n/translations';

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, saveSettings, pro } = useEyeGuard();
  const { t, lang } = useI18n();
  const currentLang = LANGUAGES.find((l) => l.code === lang);
  const [threshold, setThreshold] = useState(30);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [titleTaps, setTitleTaps] = useState(0);

  const isPro = pro ? pro.is_pro : true;
  const paidMode = pro?.paid_mode_enabled ?? false;

  useEffect(() => {
    if (settings) setThreshold(settings.threshold_cm);
  }, [settings]);

  const onTitlePress = () => {
    const next = titleTaps + 1;
    setTitleTaps(next);
    if (next >= 5) {
      setTitleTaps(0);
      router.push('/admin');
    }
  };

  const commitThreshold = async (val: number) => {
    const snapped = Math.round(val / 5) * 5;
    setThreshold(snapped);
    await saveSettings({ threshold_cm: snapped });
    Haptics.selectionAsync().catch(() => {});
  };

  const toggle = async (key: 'alert_blur' | 'alert_vibrate' | 'alert_sound' | 'child_mode', val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (key === 'child_mode' && val && !isPro) {
      router.push('/paywall');
      return;
    }
    if (key === 'child_mode' && val && !settings?.pin) {
      setPinModalOpen(true);
      return;
    }
    await saveSettings({ [key]: val });
  };

  const savePin = async () => {
    if (pinInput.length < 4) {
      Alert.alert('PIN must be at least 4 digits');
      return;
    }
    await saveSettings({ pin: pinInput, child_mode: true });
    setPinInput('');
    setPinModalOpen(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable testID="settings-title" onPress={onTitlePress}>
          <Text style={styles.title}>{t('settings.title')}</Text>
        </Pressable>

        {paidMode && !isPro ? (
          <Pressable
            testID="pro-upsell"
            onPress={() => router.push('/paywall')}
            style={styles.proCard}
          >
            <View style={styles.proIcon}>
              <Ionicons name="star" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.proTitle}>{t('settings.upgrade')}</Text>
              <Text style={styles.proSub}>{t('settings.upgradeDesc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </Pressable>
        ) : (
          <View testID="pro-active" style={styles.proActiveCard}>
            <Ionicons name="checkmark-circle" size={22} color={theme.color.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.proActiveTitle}>
                {paidMode ? t('settings.proActive') : t('settings.allUnlocked')}
              </Text>
              <Text style={styles.proActiveSub}>
                {paidMode ? 'Thanks for supporting EyeGuard!' : 'Free access — enjoy everything.'}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.card} testID="threshold-card">
          <Text style={styles.cardTitle}>{t('settings.distanceThreshold')}</Text>
          <Text style={styles.cardSub}>{t('settings.thresholdDesc')}</Text>
          <View style={styles.thresholdRow}>
            <Text style={styles.thresholdValue}>{threshold}</Text>
            <Text style={styles.thresholdUnit}>cm</Text>
          </View>
          <Slider
            testID="threshold-slider"
            style={{ width: '100%', height: 40 }}
            minimumValue={15}
            maximumValue={60}
            step={5}
            value={threshold}
            onValueChange={(v) => setThreshold(Math.round(v / 5) * 5)}
            onSlidingComplete={commitThreshold}
            minimumTrackTintColor={theme.color.brandPrimary}
            maximumTrackTintColor={theme.color.surfaceTertiary}
            thumbTintColor={theme.color.brandPrimary}
          />
          <View style={styles.sliderScale}>
            <Text style={styles.scaleText}>15</Text>
            <Text style={styles.scaleText}>30</Text>
            <Text style={styles.scaleText}>45</Text>
            <Text style={styles.scaleText}>60</Text>
          </View>
        </View>

        <Text style={styles.section}>{t('settings.alerts')}</Text>
        <View style={styles.listCard}>
          <Row
            testID="toggle-blur"
            icon="eye-off"
            color={theme.color.info}
            title={t('settings.blur')}
            desc="Hide content when too close"
            value={settings?.alert_blur ?? true}
            onChange={(v) => toggle('alert_blur', v)}
          />
          <Divider />
          <Row
            testID="toggle-vibrate"
            icon="phone-portrait"
            color={theme.color.warning}
            title={t('settings.vibration')}
            desc="Haptic feedback on warning"
            value={settings?.alert_vibrate ?? true}
            onChange={(v) => toggle('alert_vibrate', v)}
          />
          <Divider />
          <Row
            testID="toggle-sound"
            icon="volume-high"
            color={theme.color.brandPrimary}
            title={t('settings.sound')}
            desc="Play beep when too close"
            value={settings?.alert_sound ?? true}
            onChange={(v) => toggle('alert_sound', v)}
          />
        </View>

        <Text style={styles.section}>{t('settings.language')}</Text>
        <View style={styles.listCard}>
          <Pressable testID="open-language" onPress={() => router.push('/language')} style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: theme.color.info + '15' }]}>
              <Ionicons name="language" size={18} color={theme.color.info} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{t('settings.language')}</Text>
              <Text style={styles.rowDesc}>{currentLang?.native ?? 'English'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.color.onSurfaceTertiary} />
          </Pressable>
        </View>

        <Text style={styles.section}>{t('settings.childMode')}</Text>
        <View style={styles.listCard}>
          <Row
            testID="toggle-child"
            icon="happy-outline"
            color={theme.color.error}
            title={t('settings.enableChild')}
            desc="Simplified locked UI with PIN"
            value={settings?.child_mode ?? false}
            onChange={(v) => toggle('child_mode', v)}
          />
          <Divider />
          <Pressable
            testID="setup-pin"
            onPress={() => setPinModalOpen(true)}
            style={styles.row}
          >
            <View style={[styles.rowIcon, { backgroundColor: theme.color.surfaceTertiary }]}>
              <Ionicons name="lock-closed" size={18} color={theme.color.onSurface} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>
                {settings?.pin ? 'Change PIN' : 'Set up PIN'}
              </Text>
              <Text style={styles.rowDesc}>Required to exit Child Mode</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.color.onSurfaceTertiary} />
          </Pressable>
        </View>

        {pinModalOpen && (
          <View style={styles.pinCard}>
            <Text style={styles.pinTitle}>Enter new PIN (min 4 digits)</Text>
            <TextInput
              testID="pin-input"
              value={pinInput}
              onChangeText={(t) => setPinInput(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              style={styles.pinInput}
              placeholder="****"
              placeholderTextColor={theme.color.onSurfaceTertiary}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => {
                  setPinModalOpen(false);
                  setPinInput('');
                }}
                style={[styles.pinBtn, { backgroundColor: theme.color.surfaceTertiary }]}
              >
                <Text style={{ color: theme.color.onSurface, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                testID="pin-save"
                onPress={savePin}
                style={[styles.pinBtn, { backgroundColor: theme.color.brandPrimary }]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save PIN</Text>
              </Pressable>
            </View>
          </View>
        )}

        <Text style={styles.section}>About</Text>
        <View style={styles.aboutCard}>
          <Ionicons name="information-circle" size={20} color={theme.color.info} />
          <Text style={styles.aboutText}>
            EyeGuard uses your front camera to monitor eye-to-screen distance. In Expo Go a simulated distance is used for demo; a production build enables real ML face detection.
          </Text>
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  icon,
  color,
  title,
  desc,
  value,
  onChange,
  testID,
}: {
  icon: any;
  color: string;
  title: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
  testID: string;
}) {
  return (
    <View style={styles.row} testID={testID}>
      <View style={[styles.rowIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDesc}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.color.brandPrimary, false: theme.color.surfaceTertiary }}
      />
    </View>
  );
}

const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.surface },
  scroll: { padding: 16, gap: 12 },
  title: { fontSize: 26, fontWeight: '800', color: theme.color.onSurface, marginBottom: 4 },
  proCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.color.brandPrimary,
    borderRadius: 18,
    padding: 16,
  },
  proIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  proSub: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  proActiveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  proActiveTitle: { fontSize: 15, fontWeight: '700', color: theme.color.onSurface },
  proActiveSub: { fontSize: 12, color: theme.color.onSurfaceTertiary, marginTop: 2 },
  card: {
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 20,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: theme.color.onSurface },
  cardSub: { fontSize: 12, color: theme.color.onSurfaceTertiary },
  thresholdRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginVertical: 8 },
  thresholdValue: { fontSize: 44, fontWeight: '800', color: theme.color.brandPrimary },
  thresholdUnit: { fontSize: 18, fontWeight: '600', color: theme.color.onSurfaceTertiary },
  sliderScale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  scaleText: { fontSize: 11, color: theme.color.onSurfaceTertiary },
  section: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.color.onSurfaceTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  listCard: {
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 14, fontWeight: '600', color: theme.color.onSurface },
  rowDesc: { fontSize: 12, color: theme.color.onSurfaceTertiary, marginTop: 2 },
  divider: { height: 1, backgroundColor: theme.color.divider, marginLeft: 62 },
  pinCard: {
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  pinTitle: { fontSize: 14, fontWeight: '600', color: theme.color.onSurface },
  pinInput: {
    backgroundColor: theme.color.surface,
    borderRadius: 10,
    padding: 14,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
    color: theme.color.onSurface,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  pinBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  aboutCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  aboutText: { flex: 1, fontSize: 12, color: theme.color.onSurfaceTertiary, lineHeight: 17 },
});
