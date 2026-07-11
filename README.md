# Neon Tracker

A mobile-first PWA for tracking drinks, estimating your blood-alcohol level (BAC), and building sober-day streaks. Dark "neon" aesthetic, works offline, and **all data stays on your device** — nothing is ever sent anywhere.

Built with React + Vite. The same codebase also ships as native iOS and
Android apps via [Capacitor](https://capacitorjs.com/) — the web build runs
inside a native shell with platform storage, haptics, and splash/icons.

**[Live demo →](https://victorious-moss-0f60f0d10.7.azurestaticapps.net/)**

## Features

- **Today** — log drinks, see a live BAC estimate, and know when you'll be sober.
- **History** — review past days and track your sober-day streaks and milestones.
- **Setup** — set your weight, sex, and default drink sizes.
- **Offline-first PWA** — installable and fully usable without a connection.

## Getting started

Requires [Node.js](https://nodejs.org/) 18+.

```bash
npm install       # install dependencies
npm run dev       # start the dev server at http://localhost:5173
```

## Scripts

```bash
npm run dev       # dev server (http://localhost:5173)
npm run build     # production build to dist/ (also generates the service worker)
npm run preview   # serve the built dist/ (use this to test PWA/offline behaviour)
npm run icons     # regenerate PWA + native icons/splash from assets/*.svg
npm run sync      # build + copy the web app into the native projects
npm run android   # build, sync, and run on an Android device/emulator
```

> The service worker only runs in a build, not in `npm run dev`. To test offline
> behaviour, run `npm run build && npm run preview`.

## Native apps (iOS / Android)

The `ios/` and `android/` folders are Capacitor shells around the same
`dist/` build — there is no separate mobile codebase. On native, data is
stored in platform storage (UserDefaults / SharedPreferences) instead of
`localStorage`, and the service worker is skipped.

- **Android:** `npm run android` with an emulator/device (needs the Android
  SDK), or grab the debug APK from the *Android* GitHub Actions workflow.
- **iOS:** built and uploaded to TestFlight by the *iOS (TestFlight)*
  workflow on a macOS runner — no local Mac needed. See `SUBMISSION.md`
  for the one-time App Store / Play Store setup.

## How the estimate works

The BAC number uses the Widmark formula:

$$\text{BAC} = \frac{A}{r \cdot w} - \beta \cdot t$$

where $A$ is grams of pure alcohol consumed, $r$ is the body-water ratio
(0.68 male / 0.55 female), $w$ is your weight, $t$ is hours since the first
drink, and $\beta$ = 0.15 ‰/h burn-off.

**This is only an estimate.** Do not use it to decide whether it's safe to drive
or operate machinery.

## Project structure

```
src/
  main.jsx              Entry point: fonts, global CSS, mounts <App>.
  App.jsx               App shell: header, screen area, bottom nav.
  styles/global.css     Design tokens + resets + fonts.
  lib/                  Pure logic (constants, storage, datetime, alcohol math).
  hooks/useTracker.js   The single store: persisted data + mutations.
  components/           Header, BottomNav.
  screens/              TodayScreen, HistoryScreen, SettingsScreen.
```

Data is persisted to `localStorage` under the key `neontrk_v1`.

## Privacy

Everything runs locally in your browser. There is no account, no server, and no
tracking — your data never leaves your device.
