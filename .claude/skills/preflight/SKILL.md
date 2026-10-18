---
name: preflight
description: The checks to run before committing a change to Alcometer — unit tests, lint, Prettier, a production build, native sync when plugins or the web bundle changed, and screenshots for anything visual. Use when about to commit, when asked "is this ready", or after finishing a feature or fix.
---

# Preflight before a commit

Run in this order; stop and fix at the first failure.

1. **Tests** — `npm run test:run`. New pure helpers in `src/lib/` need a test
   file next to them (`foo.test.js`); schema changes need `storage.test.js`
   cases for the migration (forward, idempotent, and via `mergeBackup`).
2. **Lint + format** — `npm run lint && npm run format:check`. Fix formatting
   with `npx prettier --write "src/**/*.{js,jsx,css}"` (Prettier also reflows
   imports, so re-check any exact-text edit you planned afterwards).
3. **Build** — `npm run build`. Catches import typos and CSS-module misses that
   the dev server tolerates.
4. **Visual check** (any change under `src/components`, `src/screens`,
   `src/styles`, or `index.html`) — follow the `run-app` skill: serve on 4317,
   run `node assets/screenshot.mjs`, Read the PNGs, and compare against the
   "what working looks like" list. Check 452×920 and 375×667.
5. **Native sync** (when a Capacitor plugin was added/removed, or you want the
   committed `android/` / `ios/` projects to carry the new web build) —
   `npx cap sync`. Commit the gradle/SPM/plist changes it makes; the copied
   `public/` bundles inside the shells are gitignored.
6. **Icons** (only if `assets/*.svg` changed) — `npm run icons`, then commit
   the regenerated images in their own commit (large binary diff).
7. **Docs** — if files, flows or verification steps changed, update
   `CLAUDE.md` and the relevant skill in `.claude/skills/` in the same change.

Commit messages: imperative subject, a body that says *why*, and the
Co-Authored-By line the session requires. Keep theme/visual, logic, and
generated-asset changes in separate commits when practical.

## Known gotchas

- Files in this repo may be CRLF on disk (git autocrlf). Exact-text edit
  scripts should normalise `\r\n` → `\n` before matching.
- The store's `now` only ticks every 20 s; anything time-dependent that must
  react to a mutation should rely on `mutate()` re-ticking, not on the timer.
- `bacAt()` only counts entries with `ts <= atTs` — a drink stamped "now" is
  invisible to a stale `now`.
- `prefers-reduced-motion` zeroes all animation durations globally; don't rely
  on an animation finishing.
- iOS lifts the page (window scroll, even with no overflow) to show a focused
  input above the keyboard and may not restore it in an installed PWA.
  `Sheet` resets ancestor/window scroll on field blur and on close; never
  `autoFocus` an input inside a sheet, and keep that reset if you touch Sheet.
