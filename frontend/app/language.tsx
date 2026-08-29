import React from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { useI18n } from '@/src/i18n/I18nContext';
import { LANGUAGES } from '@/src/i18n/translations';

export default function LanguageScreen() {
  const router = useRouter();
  const { lang, setLang } = useI18n();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable testID="language-back" onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.color.onSurface} />
        </Pressable>
        <Text style={styles.title}>Language</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {LANGUAGES.map((l) => {
          const active = l.code === lang;
          return (
            <Pressable
              key={l.code}
              testID={`lang-${l.code}`}
              onPress={() => {
                setLang(l.code);
                setTimeout(() => router.back(), 150);
              }}
              style={[styles.row, active && styles.rowActive]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.native}>{l.native}</Text>
                <Text style={styles.label}>{l.label}</Text>
              </View>
              {active && (
                <Ionicons name="checkmark-circle" size={22} color={theme.color.brandPrimary} />
              )}
            </Pressable>
          );
        })}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
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
  list: { padding: 16, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  rowActive: { borderColor: theme.color.brandPrimary, backgroundColor: theme.color.brandTertiary + '40' },
  native: { fontSize: 16, fontWeight: '700', color: theme.color.onSurface },
  label: { fontSize: 12, color: theme.color.onSurfaceTertiary, marginTop: 2 },
});
