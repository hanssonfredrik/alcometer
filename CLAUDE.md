# Promilla

A mobile-first PWA for tracking drinks, estimating blood-alcohol level, and
building alcohol-free streaks. Dark "neon" aesthetic. All data is local:
nothing leaves the device. Every word a user reads follows the `copywriting`
skill (no em-dashes, a fixed glossary, never imply fitness to drive).

Originally ported from a Claude Design mockup (`Neon Tracker.dc.html`, the
design project still carries the old name) into React + Vite. Ships as three
targets from this one codebase: the web PWA, plus native iOS and Android apps
via **Capacitor** (the `ios/` and `android/` shells wrap the same `dist/`
build — there is no separate mobile UI). Display name is "Promilla"
everywhere (renamed from "Alcometer" on 2026-10-20; before that "Neon
Tracker"); the bundle id `se.venueve.neontracker`, the storage key
`neontrk_v1` and the GitHub repo / local folder name `alcometer` are legacy
and must not change (store identity / user data / remotes).

## Commands

```bash
npm run dev       # dev server (http://localhost:5173)
npm run build     # production build to dist/ (also generates the service worker)
npm run preview   # serve the built dist/ (use this to test PWA/offline behaviour)
npm test          # unit tests (Vitest, watch mode); npm run test:run for a single pass
npm run lint      # ESLint; npm run lint:fix to autofix
npm run format    # Prettier write; npm run format:check to verify
npm run icons     # regenerate PWA + native icons/splash from assets/*.svg
npm run sync      # build + npx cap sync (copies dist/ into ios/ and android/)
npm run android   # sync, then build & run on an Android emulator/device
npm run store     # rebuild + regenerate every store screenshot/icon/banner (store/)
```

Unit tests cover the pure `lib/` logic (Vitest, pinned to `Europe/Stockholm`
for deterministic date/DST assertions); lint + tests run in CI
(`.github/workflows/ci.yml`). For UI changes, also verify by running the app
and reading screenshots — see the `run-app` skill — and run the `preflight`
skill before committing.

## Architecture

Single-page app, four tabs switched by local state in `App.jsx` (no router).

```
src/
  main.jsx              Entry: font imports, global CSS, mounts <App>.
  App.jsx               Shell: header + scroll body + bottom nav. Owns the
                        active screen, the undo toast (+ its timer), haptics,
                        the theme attribute, and Android back handling.
  styles/global.css     Design tokens (CSS custom properties) + resets + fonts.

  lib/                  Pure, framework-free logic (unit-test friendly):
    constants.js        Drink types/labels/icons, default sizes, size presets,
                        BAC zones, themes, milestones, Widmark params.
    storage.js          Async load/save adapter + defaults/migration ladder:
                        localStorage on web, Capacitor Preferences on native
                        (WebView localStorage is evictable — never rely on it
                        in the native shells).
    datetime.js         Logical-day keys (roll at 05:00), day indices, time.
    alcohol.js          Widmark BAC, peak BAC, grams, bacZone(), soberAt(),
                        alcohol-free streaks.
    charts.js           Chart geometry (pure, SVG units): gauge scale/bands/
                        arcs, the BAC curve window + series (sampled through
                        bacAt so it never disagrees with the hero), sparkline.
    drinks.js           sizeChips() (presets + the user's default), last-used
                        type, describeDrink().
    backStack.js        Stack of "close me first" handlers for the Android
                        back button (sheets push on mount).
    backup.js           JSON backup export/import + CSV; file I/O behind a
                        web/native sink. Import is a full restore (the file
                        replaces everything on the device, never a merge).
    haptics.js          Impact feedback on log/undo; no-op on web.

  hooks/
    useTracker.js       The single store: persisted `data`, a ticking `now`,
                        and all mutation actions. Every mutation clones →
                        applies → saves → re-renders → re-ticks `now`.
                        Hydrates async on mount; mutations made before
                        hydration are queued and replayed on the loaded state.

  components/
    Header, BottomNav   Presentational shell pieces.
    Sheet               Shared modal shell: bottom sheet (default) or centred
                        dialog. Escape / overlay tap / Android back close it.
    LogDrinkSheet       The log flow: 2×2 type tiles, size chips, custom cl/%,
                        one confirm button. Emits UI units (cl, percent).
    BacHero             The Today hero: speedometer dial (BacGauge) around the
                        ‰ number, zone pill, sober-by, count.
    BacGauge            SVG dial, one equal band per zone (piecewise scale),
                        lit up to the value; pointer sweeps on change.
    BacCurve            Today's "Tonight's curve" card: BAC over the evening,
                        solid so far + dashed no-more-drinks projection to
                        sober, now dot, drink ticks, zone guides.
    Sparkline           8-week std/wk line + target in the Insights trend card.
    DrinkRow            One logged drink (shared by Today + DayDetailModal).
    UndoToast           Floating "Logged beer, 33 cl · Undo" snackbar
                        (raised above Today's docked button).
    EditDrinkModal      Edit type/size/time of an entry (centred Sheet).
    DayDetailModal      Read-only log for a heatmap day (centred Sheet).
    ImportBackupModal   "Everything will be replaced" confirmation shown
                        before the backup file picker opens (centred Sheet).
    NumberField         Number input with an erasable draft; commits on blur,
                        falls back to a default when left empty.
  screens/              TodayScreen, HistoryScreen, InsightsScreen,
                        SettingsScreen. Each derives its display values with a
                        single useMemo over data+now and renders that object.
```

### State & data model

One object, persisted under the key `neontrk_v1` (localStorage on web,
Capacitor Preferences on native — `lib/storage.js` is the only place that
knows the difference). Schema version 3:

```js
{
  version: 3,
  profile: { weight: 75, sex: 'M', weeklyTarget: 10, theme: 'blue' },
  sizes:   { wine|beer|cava|liquor: { ml, abv } },  // abv is a FRACTION (0.12)
  days:    { 'YYYY-MM-DD': { limit, entries: [{ id, type, ml, abv, ts }] } }
}
```

- Day keys are **logical days** that roll at 05:00 local (`datetime.js`), so a
  night that runs past midnight stays in one bucket.
- `abv` is stored as a fraction (0.12), shown as a percent (12) — convert at
  the UI edge, never in storage. Sizes are `ml` in storage, `cl` in the UI.
- `now` re-ticks every 20s in `useTracker` *and* on every mutation, so BAC
  decay, "zero around", day rollover, and a just-logged drink all show at once.
- Schema changes go through `migrate()` in `storage.js` (version-gated,
  idempotent, also run on backup import) with tests in `storage.test.js`.

### The estimate (Widmark)

`bacAt()` in `lib/alcohol.js`: each drink adds `A / (r · weight)`, where `A`
is its grams of pure alcohol and `r` the body-water ratio (0.68 M / 0.55 F).
Between drinks the level falls by `β` = 0.15 ‰/h and stops at zero. The drinks
are walked in time order, so hours spent at zero never cancel out a later
drink (a closed-form `A / (r · weight) − β · t` from the first drink did, and
a beer at 12:30 made a beer at 15:30 read 0.00). Absorption is
treated as instant (a logged drink counts in full immediately). It's an
estimate — the UI says so, and so should you. `bacZone()` maps a ‰ value to the
plain-language bands in `BAC_ZONES` (sober / light / tipsy / drunk / heavy);
never phrase any band as fitness to drive. If you touch this math, keep it in
`lib/` and keep it pure.

### The log flow

Today = day pager → BacHero (with the gauge) → summary line (count, std,
dim grams, limit stepper) → BacCurve (only when the day has entries) →
DrinkRow list, with one big "Log a drink" button **docked above the bottom
nav** (`.dock` in `TodayScreen.module.css`: sticky at the bottom of the
scroll area, which is a flex column so the dock sits on the nav even on an
empty day). Keep it docked, full width and ≥ 64px; it is the screen's one
primary action. Charts are hand-rolled inline SVG (no chart library); their
maths lives in `lib/charts.js`, and every visual stays labelled as an
estimate. The button opens
`LogDrinkSheet`; confirming calls `App.logDrink` → `actions.addCustomDrink`
(always, since the sheet has an explicit size) → undo toast. On a past day
(day pager) the entry is backfilled at `BACKFILL_HOUR`. There is no quick-log
grid any more; don't reintroduce one-tap logging without a size.

## Conventions

- **Function components + hooks only.** No classes.
- **CSS Modules** per component (`Foo.jsx` + `Foo.module.css`). Colours,
  fonts, and spacing come from the tokens in `global.css` — reference
  `var(--accent)` etc., don't hard-code the accent. Blue is the default
  accent; the other themes (pink, cyan, green, amber) are `[data-theme]`
  blocks that swap `--accent`/`--accent-hover`, and the `--accent-NN` alpha
  tints derive from it via `color-mix`. BAC zone colours (`--zone-*`) and
  danger red are semantic and never themed. The pre-paint script in
  `index.html` reads the saved theme before React loads (web).
- **Mobile-first.** The app fills the viewport; above `480px × 940px` it
  presents as a centred phone frame (see `App.module.css`). Respect safe-area
  insets (`env(safe-area-inset-*)`) — already wired in the header, nav, and
  Sheet. Design for use after a few drinks: tap targets ≥ 44px, body text
  ≥ 15px, dim text no fainter than `--w-50` for anything that must be read.
- **Keep logic out of components.** Derivations belong in `lib/` (pure) or a
  hook; screens should mostly render a memoized value object. New pure
  helpers get a Vitest file next to them.
- **Modals use `Sheet`.** Don't hand-roll overlays; `Sheet` owns Escape,
  overlay tap, focus, safe areas and back-button handling. Pass a stable
  `onClose` (useCallback).
- **Number inputs use `NumberField`** so a value can be erased while editing.
- **Fonts are self-hosted** via `@fontsource` so the PWA works offline — don't
  reintroduce a Google Fonts `<link>`.
- Design accent/danger colours are OKLCH, matching the source mockup.
- Keep this file and `.claude/skills/*` current when the structure, flows or
  verification steps change — they are the onboarding for the next session.

## PWA

Configured in `vite.config.js` via `vite-plugin-pwa` (`generateSW`,
`autoUpdate`). The manifest, icons, theme colour, and offline precache (app
shell + hashed JS/CSS/fonts) are all set up. Icons are generated from
`assets/icon.svg` / `assets/maskable.svg` by `scripts/generate-icons.mjs`
(`public/favicon.svg` is a generated copy — edit the `assets/` sources).

Service worker only runs in a **build** (`npm run build && npm run preview`),
not in `npm run dev`. Registration is manual in `main.jsx` and is skipped on
native (`Capacitor.isNativePlatform()`), where the app ships inside the binary.

## Native shells (Capacitor)

`capacitor.config.ts` + generated `ios/` and `android/` projects (committed).
`npm run sync` copies a fresh `dist/` into both and registers installed
plugins — run it after adding a Capacitor plugin or the native builds won't
link it. Native-only pieces:

- **Storage**: `@capacitor/preferences` via `lib/storage.js` (see above).
- **Safe areas**: `@capacitor-community/safe-area` polyfills
  `env(safe-area-inset-*)` on Android WebViews that misreport it and owns the
  system-bar styling (do **not** reinstall `@capacitor/status-bar` — it
  conflicts). Edge-to-edge is enabled in `MainActivity.java`.
- **iPhone only on iOS**: `TARGETED_DEVICE_FAMILY = 1` and no `~ipad`
  orientations. Enabling iPad makes App Store Connect demand a 13" iPad
  screenshot set (see `store/README.md`).
- **Haptics / back button**: `lib/haptics.js`; Android back handling lives in
  `App.jsx`: an open sheet/modal closes first (`lib/backStack.js`), then
  non-Today tab → Today, then Today → minimize.
- **Backup/share**: `@capacitor/filesystem` + `@capacitor/share` behind
  `lib/backup.js`.
- **Icons/splash**: `npm run icons` derives native source images into
  `assets/native/` (gitignored) and fans them out with `@capacitor/assets`.
- **CI**: `.github/workflows/android.yml` (debug APK; on `v*` tags a signed
  AAB with `versionCode` = run number, uploaded to Play internal testing when
  `PLAY_SERVICE_ACCOUNT_JSON` is set), `.github/workflows/ios.yml` (TestFlight from a macOS runner; there
  is no local Mac in this setup). iOS signing is manual, with the shared
  Venueve AB distribution certificate and a `Promilla AppStore` profile in
  secrets (`docs/IOS-SIGNING.md`). Don't switch back to automatic signing:
  on a fresh runner it creates a new certificate every run until Apple's
  limit is hit. Store checklist: `docs/SUBMISSION.md`.
- **Store assets**: `store/` (modelled on DiabetesNinja's `store/ronin/`)
  holds the finished screenshots, feature graphic and store icons under
  `store/out/` plus the no-dependency scripts that rebuild them from the real
  app (`npm run store`: capture over CDP with a pinned clock + seeded demo
  data, frame, spec-check). Copy rules and the upload table are in
  `store/README.md`; the paste-ready listing text (App Store + Play fields,
  review notes, limit-checked) is `store/app-store-text.md`; the workflow is
  the `store-assets` skill. Name research
  (rename candidates, App Review risk for BAC estimators) is in
  `docs/naming/`.

When adding native plugin calls, keep them behind a `lib/` wrapper that
no-ops on web, like `haptics.js` — screens/components must stay
platform-agnostic.

## Keeping in sync with the design

The source design lives in a Claude Design project (`Neon Tracker.dc.html`).
See `.claude/skills/design-sync` for how to re-pull it and reconcile changes.
The `.dc.html` uses a custom `{{ }}` / `<sc-if>` / `<sc-for>` template runtime;
its `<script data-dc-script>` class holds the reference logic that `src/lib`
and `src/hooks` port to React. The Today tab has since diverged from the
mockup on purpose (log-first redesign, BAC hero); reconcile the other tabs,
don't restore the old Today layout.
