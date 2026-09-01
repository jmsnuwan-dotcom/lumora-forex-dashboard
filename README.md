# Lumora Forex Market Dashboard PWA

Updates:
- Mobile: Market Regime appears before Economic Calendar.
- GOOD TO TRADE notification when the dashboard changes into GOOD TO TRADE.
- Header button to enable notifications.
- PWA manifest and valid 192x192 / 512x512 PNG icons.
- Service worker notification support.
- Existing `/api/market` live market endpoint retained.

Notification permission must be granted by the user. This frontend can alert while the dashboard/PWA is running. Reliable alerts while the app is fully closed require Web Push plus a backend push service.
