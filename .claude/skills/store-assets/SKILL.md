---
name: store-assets
description: Regenerate and check Promilla's App Store / Google Play graphics (screenshots, feature graphic, store icons) in store/. Use when preparing a release or store listing, when a screen shown in the store screenshots changed, when the icon changed, when asked for "store screenshots", or when adding a store language.
---

# Store assets

The kit lives in `store/` and its `README.md` is the full reference: what
goes in which store slot, how each script works, and the rules the copy
follows. It is a port of DiabetesNinja's `store/ronin/` kit
(`C:\Projects\diabetesninja-app\store\`). The listing text (App Store and
Play fields, review notes) is in `store/app-store-text.md`. When a feature
changes, update it and re-check the character counts it states.

## Re-shoot

```bash
npm run store     # build → icons → capture → render → finalize
```

1. It must end with `All assets match the store specs`. `finalize.mjs` exits
   1 on any size, alpha, byte or count problem.
2. **Read every PNG** in `store/out/googleplay/phone/`,
   `store/out/appstore/iphone-6.5/` and the feature graphic. The spec check
   cannot see a wrong picture. For each one, check that:
   - the headline matches what is on screen;
   - no sheet is half-open and no toast is showing;
   - Today shows the gauge in Tipsy and the curve with the dashed projection;
   - Insights shows the trend sparkline;
   - Settings is scrolled to the "Everything stays on this device" section.
3. Commit `store/captures` and `store/out` together, in their own commit
   (binary diff), separate from code.

Faster loops: `node store/tools/capture.mjs --only 01`, then
`node store/tools/render.mjs --only 01`, then `npm run store:finalize`. The
capture shoots `dist/`, so run `npm run build` after any source change.

## When something breaks

- **"target not found" / timed out waiting** means a UI label that a step in
  `store/tools/shots.json` clicks or waits for has changed. Update the step.
  Steps match visible text, because CSS Module class names are hashed.
  Waits use `textContent`, so CSS `text-transform` doesn't matter.
- **Blank or black PNGs:** try `STORE_HEADLESS=old`, or point
  `STORE_BROWSER` at Chrome.
- **Wrong day or empty Today:** the seed and the browser must agree on the
  timezone. `npm run store:capture` sets `TZ=Europe/Stockholm`, so don't run
  `capture.mjs` without it.
- **The demo story changed** (for example the trend now reads "up"): the
  data is a pure function of `NOW` and the PRNG seed in
  `store/tools/seed.mjs`. Tune it there, never by hand-editing captures.

## Copy rules (short form; full list in store/README.md)

- Present the app as a drink journal with alcohol-free streaks and an estimate.
  Follow the `copywriting` skill for every caption and listing field.
  Never call it a breathalyser, a test or a BAC calculator, and never lead
  with the ‰ number. Apple has rejected software-only BAC estimators under
  Guideline 1.4; see `docs/naming/app-name-report.md`.
- Never imply fitness to drive. No exclamation marks and no em-dashes.
- Only claim what the app visibly does.

## If the app is renamed

Change `featureGraphic.name` in `shots.json`, then re-shoot. If `index.html`,
the manifest or the native display name changed, run `npm run build` first,
because the app header text in the captures comes from the build. The bundle
id and storage key never change; see CLAUDE.md.
