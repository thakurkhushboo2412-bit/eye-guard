import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { api, Settings, ProStatus } from '@/src/api';

type MonitorState = {
  active: boolean;
  distanceCm: number;
  isTooClose: boolean;
};

type Ctx = {
  settings: Settings | null;
  refreshSettings: () => Promise<void>;
  saveSettings: (patch: Partial<Settings>) => Promise<void>;
  pro: ProStatus | null;
  refreshPro: () => Promise<void>;
  monitor: MonitorState;
  startMonitor: () => void;
  stopMonitor: () => void;
  simulateClose: (close: boolean) => void;
  flushEvent: () => Promise<void>;
};

const EyeGuardCtx = createContext<Ctx | null>(null);

// Simulated distance oscillation for Expo Go. In a dev build this hook
// would be replaced by a real face-detection driver (e.g., ML Kit).
function useSimulatedDistance(active: boolean, forceClose: boolean, thresholdCm: number) {
  const [distance, setDistance] = useState(45);
  const tRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    const iv = setInterval(() => {
      tRef.current += 1;
      if (forceClose) {
        setDistance(Math.max(10, thresholdCm - 8));
        return;
      }
      // Random walk between 20 - 60 cm; occasionally dip near threshold
      const base = 40 + Math.sin(tRef.current / 6) * 15;
      const jitter = (Math.random() - 0.5) * 6;
      const val = Math.max(15, Math.min(65, base + jitter));
      setDistance(Math.round(val));
    }, 800);
    return () => clearInterval(iv);
  }, [active, forceClose, thresholdCm]);

  return distance;
}

export function EyeGuardProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [pro, setPro] = useState<ProStatus | null>(null);
  const [active, setActive] = useState(false);
  const [forceClose, setForceClose] = useState(false);

  const threshold = settings?.threshold_cm ?? 30;
  const distance = useSimulatedDistance(active, forceClose, threshold);
  const isTooClose = active && distance < threshold;

  // ---- Session accounting ----
  const sessionStart = useRef<number | null>(null);
  const closeStart = useRef<number | null>(null);
  const closeSeconds = useRef(0);
  const closeEvents = useRef(0);
  const lastTooClose = useRef(false);

  useEffect(() => {
    if (isTooClose && !lastTooClose.current) {
      closeStart.current = Date.now();
      closeEvents.current += 1;
      if (settings?.alert_vibrate) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
    } else if (!isTooClose && lastTooClose.current && closeStart.current) {
      closeSeconds.current += Math.floor((Date.now() - closeStart.current) / 1000);
      closeStart.current = null;
    }
    lastTooClose.current = isTooClose;
  }, [isTooClose, settings?.alert_vibrate]);

  const refreshSettings = useCallback(async () => {
    try {
      const s = await api.getSettings();
      setSettings(s);
    } catch (e) {
      console.log('settings fetch failed', e);
    }
  }, []);

  const saveSettings = useCallback(async (patch: Partial<Settings>) => {
    const s = await api.updateSettings(patch);
    setSettings(s);
  }, []);

  const refreshPro = useCallback(async () => {
    try {
      const p = await api.proStatus();
      setPro(p);
    } catch (e) {
      console.log('pro fetch failed', e);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
    refreshPro();
  }, [refreshSettings, refreshPro]);

  const flushEvent = useCallback(async () => {
    if (!sessionStart.current) return;
    if (closeStart.current) {
      closeSeconds.current += Math.floor((Date.now() - closeStart.current) / 1000);
      closeStart.current = null;
    }
    const session = Math.floor((Date.now() - sessionStart.current) / 1000);
    const cs = closeSeconds.current;
    const ce = closeEvents.current;
    sessionStart.current = null;
    closeSeconds.current = 0;
    closeEvents.current = 0;
    if (session <= 0) return;
    try {
      await api.recordEvent(session, cs, ce);
    } catch (e) {
      console.log('record failed', e);
    }
  }, []);

  const startMonitor = useCallback(() => {
    sessionStart.current = Date.now();
    closeSeconds.current = 0;
    closeEvents.current = 0;
    setActive(true);
  }, []);

  const stopMonitor = useCallback(() => {
    setActive(false);
    setForceClose(false);
    flushEvent();
  }, [flushEvent]);

  const simulateClose = useCallback((v: boolean) => setForceClose(v), []);

  // App backgrounded: flush and stop
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active' && active) {
        flushEvent();
      }
    });
    return () => sub.remove();
  }, [active, flushEvent]);

  const value = useMemo<Ctx>(
    () => ({
      settings,
      refreshSettings,
      saveSettings,
      pro,
      refreshPro,
      monitor: { active, distanceCm: distance, isTooClose },
      startMonitor,
      stopMonitor,
      simulateClose,
      flushEvent,
    }),
    [settings, refreshSettings, saveSettings, pro, refreshPro, active, distance, isTooClose, startMonitor, stopMonitor, simulateClose, flushEvent]
  );

  return <EyeGuardCtx.Provider value={value}>{children}</EyeGuardCtx.Provider>;
}

export function useEyeGuard() {
  const c = useContext(EyeGuardCtx);
  if (!c) throw new Error('EyeGuardProvider missing');
  return c;
}
