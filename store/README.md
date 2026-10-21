# Promilla store assets

Everything Google Play and App Store Connect ask for in the way of graphics,
plus the scripts that rebuild it, so the next release is a re-run rather than a
rediscovery. Modelled on DiabetesNinja's `store/ronin/` kit
(`C:\Projects\diabetesninja-app\store\`); a fix in one usually belongs in the
other.

Nothing here is part of the app build. No workflow reads it and Vite never
bundles it. Listing **text** (name, subtitle, description, keywords, review
notes, and the Play fields) is in [`app-store-text.md`](app-store-text.md),
ready to paste and checked against every limit. Account setup and the rest of
the release checklist are in [`docs/SUBMISSION.md`](../docs/SUBMISSION.md).

## What to upload

English only for now (see [Adding a language](#adding-a-language)).

| Store slot                                   | File                                    | Size        | Format                           |
| -------------------------------------------- | --------------------------------------- | ----------- | -------------------------------- |
| Play app icon                                | `out/googleplay/icon-512.png`           | 512 × 512   | 32-bit PNG with alpha, ≤ 1024 KB |
| Play feature graphic                         | `out/googleplay/feature-graphic.png`    | 1024 × 500  | 24-bit PNG, no alpha             |
| Play phone screenshots                       | `out/googleplay/phone/*.png` (5)        | 1080 × 1920 | 24-bit PNG, no alpha             |
| App Store iPhone, medium display (6.1"/6.3") | `out/appstore/iphone-6.3/*.png` (5)     | 1206 × 2622 | PNG, no alpha                    |
| App Store iPhone 6.5" (older layout)         | `out/appstore/iphone-6.5/*.png` (5)     | 1284 × 2778 | PNG, no alpha                    |
| App Store iPhone 6.9"                        | `out/appstore/iphone-6.9/*.png` (5)     | 1320 × 2868 | PNG, no alpha                    |
| (reference only) App Store marketing icon    | `out/appstore/icon-1024.png`            | 1024 × 1024 | PNG, no alpha                    |

- **Which App Store set:** use whichever slot App Store Connect shows. Each
  slot lists the sizes it takes under the drop zone, so match that text. As
  of October 2026 the version page leads with **"iPhone with Dynamic Island
  (medium display)"** (6.1"/6.3"). That slot takes 1179 × 2556 or 1206 × 2622,
  so upload `iphone-6.3`. Older layouts showed a 6.5" or 6.9" slot instead;
  `iphone-6.5` and `iphone-6.9` cover those. If Apple adds a new size, add a
  canvas to `render.mjs` and a rule to `finalize.mjs`.
- **Other tabs on that page:** "iPad 13" display" means the attached build
  still supports iPad (see below). "Apple Watch" can stay empty, because the
  app has no watch app. Any other device tab (for example "iPhone Duo") lists
  its own sizes. This kit doesn't make those yet.
- **Play** wants at least 2 phone screenshots and takes 8; it asks for 4
  before it will consider an app for promotion. Apple takes 1 to 10 per size.
- **`icon-1024.png` is not an upload.** Since Xcode 14 the marketing icon is
  read from the asset catalog inside the binary (`npm run icons` generates
  it). Keep it for press and for anyone who asks for "the icon".
- **No iPad set, on purpose.** The iOS target is iPhone-only
  (`TARGETED_DEVICE_FAMILY = 1` in `ios/App/App.xcodeproj/project.pbxproj`,
  and no `UISupportedInterfaceOrientations~ipad` in `Info.plist`). It used to
  be `1,2`. Then any attached build made App Store Connect require a 13" iPad
  set, and iPhone files dropped in that slot fail with "File dimensions are
  invalid". If you ever enable iPad, add a 2064 × 2752 canvas to
  `render.mjs` and a rule to `finalize.mjs`.

**"File dimensions are invalid" in App Store Connect** means a set went into
the wrong slot. The pixel sizes are right (`finalize.mjs` proves it):

- `iphone-6.3/` (1206 × 2622) goes in **iPhone with Dynamic Island
  (medium display)** only;
- `iphone-6.5/` (1284 × 2778) goes in **iPhone 6.5" Display** only;
- `iphone-6.9/` (1320 × 2868) goes in **iPhone 6.9" Display** only;
- `googleplay/phone/` (1080 × 1920) is for Play and fits no Apple slot;
- an **iPad** slot means the attached build still supports iPad. Attach a
  build made after the iPhone-only change.

The five shots, in order: Today mid-evening (gauge + tonight's curve), the
log sheet, History, Insights (trend sparkline + heatmap), and Settings' data
section ("everything stays on this device").

## Regenerating

```bash
npm run store            # all of the below, in order
```

or step by step:

```bash
npm run build            # capture.mjs photographs dist/, not the dev server
npm run store:icons      # out/*/icon-*.png from assets/icon.svg
npm run store:capture    # captures/<id>-<page>.png from the real app
npm run store:render     # frames every capture onto every canvas + feature graphic
npm run store:finalize   # ALWAYS LAST: strips alpha, checks every file, exits 1 if off spec
```

`render.mjs --only 03` re-frames one shot; `--only feature` just the banner.
`capture.mjs --only 01` re-captures one screen.

Then **look at every PNG in `out/`** before uploading. The spec check only
proves sizes and formats, not that the picture is right.

### How it works

- **`tools/capture.mjs`** serves `dist/` with `vite preview` on :4318 and
  opens it in headless Edge at 430 × 932 @3x (1290 × 2796, an iPhone 16 Pro
  Max). Before any app script runs it pins `Date` to `seed.mjs`'s `NOW` and
  the timezone to Europe/Stockholm, emulates `prefers-reduced-motion` (so the
  needle and sheet never get caught mid-animation), seeds
  `localStorage['neontrk_v1']`, then reloads per shot and walks the `steps`
  in `shots.json`. It uses a throwaway browser profile, so no stale service
  worker can serve an old build.
  - There are no system bars to crop, unlike DiabetesNinja's emulator
    captures: a bare web viewport is exactly the app's pixels.
- **`tools/seed.mjs`** is the demo data: six months of fixed-seed history
  (mostly weekends, long dry stretches, weekly total trending down) and
  tonight, Friday 16 Oct 2026 at 22:50, three drinks in and still "Tipsy".
  A re-shoot always produces the same pictures. Change `NOW` or the PRNG
  seed and every screenshot changes with it.
- **`tools/render.mjs`** opens `templates/screenshot.html` at each canvas
  size (1 CSS px = 1 output px) with the capture, headline and sub line, and
  `templates/feature-graphic.html` at 1024 × 500. The templates wait for
  fonts and images and then set `window.__ready`.
- **`tools/finalize.mjs`** is a `sharp` port of Ronin's `finalize.py`: it
  removes the alpha channel where a store forbids one, then checks exact
  size, alpha, bytes, Play's 320–3840 px side range and 2:1 limit, and
  minimum counts.
- **`tools/cdp.mjs`** is the no-dependency DevTools client (Node 22+'s global
  `WebSocket`). It finds Edge, then Chrome; set `STORE_BROWSER` to override,
  and `STORE_HEADLESS=old` if a browser writes blank PNGs with
  `--headless=new`.
- **`templates/fonts/`** are copies of the app's Space Grotesk faces from
  `@fontsource`, so the frames match the app's type.

### Gotchas

- **Rebuild first.** `capture.mjs` shoots `dist/`. A stale build means stale
  screenshots, and nothing will flag it.
- **The captures need the `steps` targets to exist.** Steps find buttons and
  text by their visible label (CSS Module class names are hashed). If a UI
  label changes, update `shots.json` or capture fails with "target not
  found".
- **A UI change to any shot's screen means a re-shoot.** The preflight skill
  reminds you; the store-assets skill has the checklist.

## Adding a language

Follow the Ronin kit: add an `sv` key to every `title`/`sub` in `shots.json`
and to `featureGraphic.tagline`, add `sv: '-sv'` to `LANGS` in
`render.mjs`, add `-sv` rules to `finalize.mjs`, and capture Swedish
screenshots (the app itself would need a Swedish UI first; the picture must
match the headline over it).

## Rules the copy and the pictures follow

`shots.json` holds every headline. These rules follow from the app's own
(CLAUDE.md) and from App Review history, and apply to the listing exactly as
to the UI:

- **It is a drink journal with alcohol-free streaks and an estimate.** Never call
  it a breathalyser, a test, a measurement or a "BAC calculator", and never
  lead with the ‰ number. Apple has repeatedly rejected software-only BAC
  estimators under Guideline 1.4 (Physical Harm); see
  `docs/naming/app-name-report.md`. The feature graphic carries no number at
  all.
- **Never imply fitness to drive**, and never grade a level as good or safe.
- **Only claim what the app visibly does.** "No account and no sync" is true
  because nothing leaves the device; keep it true.
- Plain and factual, second person, no exclamation marks, no em-dashes.
- The demo data is invented and deliberately unremarkable: moderate nights,
  mostly under the limit, a trend going down.
