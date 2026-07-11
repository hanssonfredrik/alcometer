# Neon Tracker

A mobile-first PWA for tracking drinks, estimating blood-alcohol level, and
building sober-day streaks. Dark "neon" aesthetic. All data is local — nothing
leaves the device.

Ported from a Claude Design mockup (`Neon Tracker.dc.html`) into React + Vite.
Ships as three targets from this one codebase: the web PWA, plus native iOS
and Android apps via **Capacitor** (the `ios/` and `android/` shells wrap the
same `dist/` build — there is no separate mobile UI).

## Commands

```bash
npm run dev       # dev server (http://localhost:5173)
npm run build     # production build to dist/ (also generates the service worker)
npm run preview   # serve the built dist/ (use this to test PWA/offline behaviour)
npm run icons     # regenerate PWA + native icons/splash from assets/*.svg
npm run sync      # build + npx cap sync (copies dist/ into ios/ and android/)
npm run android   # sync, then build & run on an Android emulator/device
```

There is no test suite or linter configured yet. Verify changes by running the
app (see the `run` skill / `.claude/skills/run-app`).

## Architecture

Single-page app, three tabs switched by local state in `App.jsx` (no router).

```
src/
  main.jsx              Entry: font imports, global CSS, mounts <App>.
  App.jsx               Shell: header + scroll area + bottom nav; owns the
                        active screen and the "undo last drink" affordance.
  styles/global.css     Design tokens (CSS custom properties) + resets + fonts.

  lib/                  Pure, framework-free logic (unit-test friendly):
    constants.js        Default drink sizes, labels, milestones, Widmark params.
    storage.js          Async load/save adapter + defaults/backfill:
                        localStorage on web, Capacitor Preferences on native
                        (WebView localStorage is evictable — never rely on it
                        in the native shells).
    datetime.js         Local date keys, day indices, time formatting.
    alcohol.js          Widmark BAC, peak BAC, grams, sober-day streaks.
    haptics.js          Impact feedback on log/undo; no-op on web.

  hooks/
    useTracker.js       The single store: persisted `data`, a ticking `now`,
                        and all mutation actions. Every mutation clones →
                        applies → saves → re-renders. Hydrates async on mount;
                        mutations made before hydration are queued and
                        replayed on top of the loaded state.

  components/           Header, BottomNav (presentational).
  screens/              TodayScreen, HistoryScreen, SettingsScreen. Each derives
                        its display values with a single useMemo over data+now.
```

### State & data model

One object, persisted under the key `neontrk_v1` (localStorage on web,
Capacitor Preferences on native — `lib/storage.js` is the only place that
knows the difference):

```js
{
  profile: { weight: 75, sex: 'M' },          // 'M' | 'F'
  sizes:   { wine|beer|cava|liquor: { ml, abv } },  // abv is a FRACTION (0.12)
  days:    { 'YYYY-MM-DD': { limit, entries: [{ id, type, ml, abv, ts }] } }
}
```

- Dates are **local-zone** `YYYY-MM-DD` keys (see `datetime.js`).
- `abv` is stored as a fraction (0.12), shown as a percent (12) — convert at
  the UI edge, never in storage.
- `now` re-ticks every 20s in `useTracker` so BAC decay, "sober by", and day
  rollover stay live without a manual refresh.

### The estimate (Widmark)

`bacAt()` in `lib/alcohol.js`: `BAC = A / (r · weight) − β · t`, where `A` is
grams of pure alcohol consumed so far, `r` the body-water ratio (0.68 M / 0.55
F), `t` hours since the first drink, and `β` = 0.15 ‰/h burn-off. It's an
estimate — the UI says so, and so should you. If you touch this math, keep it in
`lib/` and keep it pure.

## Conventions

- **Function components + hooks only.** No classes.
- **CSS Modules** per component (`Foo.jsx` + `Foo.module.css`). Colours,
  fonts, and spacing come from the tokens in `global.css` — reference
  `var(--accent)` etc., don't hard-code the neon pink (`oklch(0.72 0.23 350)`).
- **Mobile-first.** The app fills the viewport; above `480px × 940px` it
  presents as a centred phone frame (see `App.module.css`). Respect safe-area
  insets (`env(safe-area-inset-*)`) — already wired in the header and nav.
- **Keep logic out of components.** Derivations belong in `lib/` (pure) or a
  hook; screens should mostly render a memoized value object.
- **Fonts are self-hosted** via `@fontsource` so the PWA works offline — don't
  reintroduce a Google Fonts `<link>`.
- Design accent/danger colours are OKLCH, matching the source mockup.

## PWA

Configured in `vite.config.js` via `vite-plugin-pwa` (`generateSW`,
`autoUpdate`). The manifest, icons, theme colour, and offline precache (app
shell + hashed JS/CSS/fonts) are all set up. Icons are generated from
`assets/icon.svg` / `assets/maskable.svg` by `scripts/generate-icons.mjs`.

Service worker only runs in a **build** (`npm run build && npm run preview`),
not in `npm run dev`. Registration is manual in `main.jsx` and is skipped on
native (`Capacitor.isNativePlatform()`), where the app ships inside the binary.

## Native shells (Capacitor)

`capacitor.config.ts` + generated `ios/` and `android/` projects (committed).
`npm run sync` copies a fresh `dist/` into both. Native-only pieces:

- **Storage**: `@capacitor/preferences` via `lib/storage.js` (see above).
- **Safe areas**: `@capacitor-community/safe-area` polyfills
  `env(safe-area-inset-*)` on Android WebViews that misreport it and owns the
  system-bar styling (do **not** reinstall `@capacitor/status-bar` — it
  conflicts). Edge-to-edge is enabled in `MainActivity.java`.
- **Haptics / back button**: `lib/haptics.js`; Android back handling lives in
  `App.jsx` (non-Today tab → Today; Today → minimize).
- **Icons/splash**: `npm run icons` derives native source images into
  `assets/native/` (gitignored) and fans them out with `@capacitor/assets`.
- **CI**: `.github/workflows/android.yml` (debug APK; signed AAB on `v*`
  tags), `.github/workflows/ios.yml` (TestFlight from a macOS runner — there
  is no local Mac in this setup). Store checklist: `SUBMISSION.md`.

When adding native plugin calls, keep them behind a `lib/` wrapper that
no-ops on web, like `haptics.js` — screens/components must stay
platform-agnostic.

## Keeping in sync with the design

The source design lives in a Claude Design project (`Neon Tracker.dc.html`).
See `.claude/skills/design-sync` for how to re-pull it and reconcile changes.
The `.dc.html` uses a custom `{{ }}` / `<sc-if>` / `<sc-for>` template runtime;
its `<script data-dc-script>` class holds the reference logic that `src/lib`
and `src/hooks` port to React.
