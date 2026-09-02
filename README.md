# Lumora Forex Market Intelligence Dashboard — PWA Fixed

## Included
- XAU/USD M1 live market dashboard
- Gold-relevant economic calendar filtering
- Fixed UTC forex-session detection
- Standard 0–100 ADX calculation
- Automatic install popup on supported browsers
- Direct INSTALL NOW action when `beforeinstallprompt` is available
- iPhone/iPad Safari install guide (Share → Add to Home Screen)
- Web notification permission + GOOD TO TRADE alert while the app is running
- PWA manifest, icons and service worker

## Vercel deployment
Upload/replace these files in the GitHub repository:
`index.html`, `style.css`, `app.js`, `sw.js`, `manifest.webmanifest`, `api/market.js`, `icons/icon-192.png`, `icons/icon-512.png`.

Keep the existing Vercel environment variable `TWELVE_DATA_API_KEY`.
`FINNHUB_API_KEY` remains optional; the backend falls back to the public ForexFactory calendar feed.

## Important
- Native one-tap installation is controlled by the browser. Chromium/Edge can provide `beforeinstallprompt`; iOS Safari cannot be forced to show a native prompt.
- The dashboard's economic calendar is intentionally filtered for XAU/USD relevance; non-USD events are excluded unless their title directly indicates gold/rates/yields/dollar/geopolitical relevance.
