import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/src/theme';
import { useEyeGuard } from '@/src/state/EyeGuardContext';
import { DistanceBadge, TooCloseOverlay } from '@/src/components/DistanceOverlay';

const SAMPLE =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

export default function PlayerScreen() {
  const router = useRouter();
  const { startMonitor, stopMonitor, monitor, simulateClose } = useEyeGuard();
  const player = useVideoPlayer(SAMPLE, (p) => {
    p.loop = true;
    p.play();
  });
  const wasPlayingRef = useRef(true);
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  useEffect(() => {
    startMonitor();
    return () => stopMonitor();
  }, [startMonitor, stopMonitor]);

  useEffect(() => {
    if (monitor.isTooClose) {
      wasPlayingRef.current = isPlaying;
      if (isPlaying) player.pause();
    } else if (wasPlayingRef.current) {
      player.play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monitor.isTooClose]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          testID="player-back"
          onPress={() => router.back()}
          style={styles.iconBtn}
        >
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Local Video</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.videoWrap}>
        <VideoView
          testID="video-view"
          style={styles.video}
          player={player}
          allowsFullscreen
          contentFit="contain"
        />
        <DistanceBadge />
        <TooCloseOverlay />
      </View>

      <View style={styles.controls}>
        <Pressable
          testID="play-toggle"
          onPress={() => (isPlaying ? player.pause() : player.play())}
          style={styles.controlBtn}
        >
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color="#fff" />
        </Pressable>
        <Pressable
          testID="simulate-close-btn"
          onPress={() => simulateClose(!monitor.isTooClose)}
          style={[styles.controlBtn, styles.simulateBtn]}
        >
          <Ionicons
            name={monitor.isTooClose ? 'sunny' : 'contract'}
            size={18}
            color="#fff"
          />
          <Text style={styles.simulateText}>
            {monitor.isTooClose ? 'Move back' : 'Simulate too close'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#fff', fontWeight: '700', fontSize: 16 },
  videoWrap: { flex: 1 },
  video: { flex: 1 },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  controlBtn: {
    backgroundColor: theme.color.brandPrimary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  simulateBtn: { backgroundColor: theme.color.surfaceInverse },
  simulateText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
