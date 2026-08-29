const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export type Settings = {
  user_id: string;
  threshold_cm: number;
  alert_blur: boolean;
  alert_vibrate: boolean;
  alert_sound: boolean;
  child_mode: boolean;
  pin: string | null;
  onboarded: boolean;
};

export type DailyStat = {
  user_id: string;
  day: string;
  total_seconds: number;
  close_seconds: number;
  close_events: number;
  updated_at: string;
};

export type StreakInfo = {
  current_streak: number;
  best_streak: number;
  goal_daily_close_seconds: number;
};

export type ProStatus = {
  paid_mode_enabled: boolean;
  is_pro: boolean;
  plan: string | null;
  expires_at: string | null;
};

export type ProPackages = Record<
  string,
  { name: string; amount: number; days: number; currency: string }
>;

export type CheckoutStatus = {
  session_id: string;
  package_id: string;
  status: string;
  paid: boolean;
  terminal: boolean;
  expires_at?: string | null;
};

export type Sponsor = {
  enabled: boolean;
  title: string;
  subtitle: string;
  image_url: string;
  link: string;
};

export type AdStats = {
  impressions: number;
  clicks: number;
  ctr: number;
  estimated_earnings: number;
  currency: string;
};

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!r.ok) throw new Error(`API ${path} ${r.status}`);
  return r.json();
}

export const api = {
  getSettings: () => req<Settings>('/settings'),
  updateSettings: (p: Partial<Settings>) =>
    req<Settings>('/settings', { method: 'PUT', body: JSON.stringify(p) }),
  verifyPin: (pin: string) =>
    req<{ ok: boolean }>('/pin/verify', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),
  recordEvent: (session_seconds: number, close_seconds: number, close_events: number) =>
    req<DailyStat>('/stats/event', {
      method: 'POST',
      body: JSON.stringify({ session_seconds, close_seconds, close_events }),
    }),
  today: () => req<DailyStat>('/stats/today'),
  week: () => req<DailyStat[]>('/stats/week'),
  streak: () => req<StreakInfo>('/stats/streak'),

  proStatus: () => req<ProStatus>('/pro/status'),
  proPackages: () => req<ProPackages>('/pro/packages'),
  createCheckout: (package_id: 'monthly' | 'yearly', origin_url: string) =>
    req<{ session_id: string; checkout_url: string }>('/checkout/create', {
      method: 'POST',
      body: JSON.stringify({ package_id, origin_url }),
    }),
  checkoutStatus: (session_id: string) =>
    req<CheckoutStatus>(`/checkout/status/${session_id}`),

  adminVerify: (code: string) =>
    req<{ ok: boolean }>('/admin/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  adminConfig: (code: string) =>
    req<{ paid_mode_enabled: boolean }>(`/admin/config?code=${encodeURIComponent(code)}`),
  setPaidMode: (code: string, enabled: boolean) =>
    req<{ paid_mode_enabled: boolean }>('/admin/paid-mode', {
      method: 'PUT',
      body: JSON.stringify({ code, enabled }),
    }),

  getSponsor: () => req<Sponsor>('/ads/sponsor'),
  updateSponsor: (code: string, patch: Partial<Sponsor>) =>
    req<any>('/ads/sponsor', {
      method: 'PUT',
      body: JSON.stringify({ code, ...patch }),
    }),
  adImpression: () => req<{ ok: boolean }>('/ads/impression', { method: 'POST' }),
  adClick: () => req<{ ok: boolean }>('/ads/click', { method: 'POST' }),
  adStats: (code: string) =>
    req<AdStats>(`/ads/stats?code=${encodeURIComponent(code)}`),
};
