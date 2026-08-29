# EyeGuard — Product Requirements Document

## Original Problem Statement (Marathi)
User wants a screen-distance control app. When the phone gets too close to the eyes (harmful for the user and their small child), any running content/video should pause/blur until the phone is moved back beyond a set distance. Distance is manually configurable from 15 cm to 60 cm. The app should also open YouTube, Facebook, Instagram and any video platform in-app so people use it and the creator's reach grows.

Later request: add a PAID SUBSCRIPTION with an OWNER-CONTROLLED toggle to switch the whole app between free and paid at any time. Publish to Play Store & App Store.

## Architecture
- Frontend: Expo Router (React Native, SDK 54), bottom tabs, context-based state (EyeGuardContext).
- Backend: FastAPI + MongoDB (motor). All routes under /api.
- Payments: Emergent-managed Stripe via emergentintegrations (one-time passes).
- Distance detection: SIMULATED driver in Expo Go (real ML face detection deferred to native/dev build).

## User Personas
- Adult who wants to protect their own eyes while browsing/watching.
- Parent enabling a locked "Child Mode" for a young child.
- App owner/creator who monetizes and controls free-vs-paid centrally.

## Core Requirements (static)
- Front-camera eye-distance monitoring with configurable threshold 15–60 cm (5 cm steps).
- Too-close response: blur overlay + vibration + (planned) sound.
- In-app WebView browser (YouTube, Instagram, Facebook, X, Reddit, TikTok, custom URL) that pauses media when too close.
- Local video player that pauses when too close.
- Daily stats + streaks.
- Child Mode with PIN lock (simplified locked UI).
- Owner-controlled Paid Mode toggle (free launch vs Pro-locked).

## Implemented (with dates)
### 2026-06 (Iteration 1)
- Onboarding flow, Home dashboard, Browse hub, Stats, Settings.
- Distance monitor (simulated) + blur/haptic overlay + Simulate button.
- WebView viewer + local video player with pause-on-close.
- Child Mode + PIN, daily stats + streaks.
- Backend: settings, pin verify, stats event/today/week/streak. 10/10 backend tests pass.

### 2026-06 (Iteration 2 — Monetization)
- EyeGuard Pro: monthly ($1.99 / 30d) & yearly ($14.99 / 365d) one-time passes via Emergent Stripe.
- Owner Panel (/admin): hidden entry via tapping Settings title 5x, unlocked by admin code (ADMIN_CODE, default 142536). Paid Mode ON/OFF toggle affects all users instantly.
- Entitlement: paid_mode OFF => everyone Pro (free); ON => Pro only with active pass.
- Paywall screen, payment-return handler, Stats lock + Child Mode gating.
- WebView web-preview fallback added.
- 21/21 backend tests pass; all frontend flows verified.

## Backlog / Remaining
- P0: Real ML face-distance detection (requires native/dev build; ML Kit or vision-camera face detector).
- P1: Stripe webhook for durable fulfillment (currently poll-based); sound alert asset wiring.
- P1: Per-user accounts/auth (currently single "default" profile).
- P2: Background monitoring service (OS-limited on iOS; Android accessibility service).
- P2: Localization (Marathi/Hindi UI strings).

## Next Tasks
- Wire a real alert sound asset for the too-close event.
- Add Marathi language toggle.
- Prepare store assets and publish via Emergent Publish button.
