import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useEyeGuard } from '@/src/state/EyeGuardContext';

const KID_LINKS = [
  { key: 'youtube', name: 'YouTube Kids', url: 'https://www.youtubekids.com', color: '#FF0000', icon: 'logo-youtube' as const },
  { key: 'video', name: 'Play Video', url: '', color: theme.color.brandPrimary, icon: 'play-circle' as const },
];

export default function ChildScreen() {
  const router = useRouter();
  const { settings, saveSettings } = useEyeGuard();
  const [exitOpen, setExitOpen] = useState(false);
  const [pin, setPin] = useState('');

  const onOpen = (k: typeof KID_LINKS[number]) => {
    if (k.key === 'video') {
      router.push('/player');
    } else {
      router.push({ pathname: '/viewer', params: { url: k.url } });
    }
  };

  const tryExit = async () => {
    try {
      const r = await api.verifyPin(pin);
      if (!r.ok) {
        Alert.alert('Wrong PIN', 'Please try again');
        setPin('');
        return;
      }
      await saveSettings({ child_mode: false });
      setExitOpen(false);
      setPin('');
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Set a PIN first from Settings');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Hey buddy!</Text>
          <Text style={styles.title}>Kids Mode</Text>
        </View>
        <Pressable
          testID="child-exit"
          onPress={() => setExitOpen(true)}
          style={styles.exitBtn}
        >
          <Ionicons name="lock-closed" size={16} color="#fff" />
          <Text style={styles.exitText}>Exit</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.bannerCard}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1525829528215-ffae12a76ac8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAxODF8MHwxfHNlYXJjaHwxfHxjaGlsZCUyMHRhYmxldCUyMGhhcHB5JTIwcGhvdG98ZW58MHx8fHwxNzg2NDQ3ODQ2fDA&ixlib=rb-4.1.0&q=85' }}
            style={styles.bannerImg}
            contentFit="cover"
          />
          <View style={styles.bannerOverlay}>
            <Text style={styles.bannerTitle}>Watch safely!</Text>
            <Text style={styles.bannerSub}>Keep phone {settings?.threshold_cm ?? 30} cm away 👀</Text>
          </View>
        </View>

        <View style={styles.tiles}>
          {KID_LINKS.map((k) => (
            <Pressable
              key={k.key}
              testID={`kid-${k.key}`}
              onPress={() => onOpen(k)}
              style={styles.tile}
            >
              <View style={[styles.tileIcon, { backgroundColor: k.color + '18' }]}>
                <Ionicons name={k.icon} size={40} color={k.color} />
              </View>
              <Text style={styles.tileText}>{k.name}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {exitOpen && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.exitModal}
        >
          <View style={styles.exitCard}>
            <Ionicons name="lock-closed" size={32} color={theme.color.brandPrimary} />
            <Text style={styles.exitTitle}>Parent PIN required</Text>
            <TextInput
              testID="exit-pin-input"
              value={pin}
              onChangeText={(t) => setPin(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              style={styles.pinInput}
              placeholder="****"
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
              <Pressable
                onPress={() => {
                  setExitOpen(false);
                  setPin('');
                }}
                style={[styles.pinBtn, { backgroundColor: theme.color.surfaceTertiary }]}
              >
                <Text style={{ color: theme.color.onSurface, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                testID="exit-pin-confirm"
                onPress={tryExit}
                style={[styles.pinBtn, { backgroundColor: theme.color.brandPrimary }]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Unlock</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8EE' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  hello: { fontSize: 14, color: theme.color.onSurfaceTertiary },
  title: { fontSize: 28, fontWeight: '800', color: theme.color.onSurface },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.color.surfaceInverse,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  exitText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  scroll: { padding: 16, gap: 16 },
  bannerCard: {
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: theme.color.brandPrimary,
  },
  bannerImg: { ...StyleSheet.absoluteFillObject },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 16,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  bannerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  bannerSub: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  tileIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: { fontSize: 14, fontWeight: '700', color: theme.color.onSurface },
  exitModal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  exitCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  exitTitle: { fontSize: 16, fontWeight: '700', color: theme.color.onSurface },
  pinInput: {
    width: '100%',
    backgroundColor: theme.color.surface,
    borderRadius: 10,
    padding: 14,
    fontSize: 22,
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
});
