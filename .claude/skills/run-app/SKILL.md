---
name: run-app
description: Launch the Neon Tracker PWA locally and, when a visual check is needed, capture screenshots of the Today/History/Setup screens with seeded data using headless Edge over the Chrome DevTools Protocol. Use when asked to run, preview, or screenshot the app, or to confirm a UI change works.
---

# Running & screenshotting Neon Tracker

## Just run it

- **Dev (hot reload):** `npm run dev` → http://localhost:5173. Service worker is
  disabled here by design.
- **Production / PWA / offline test:** `npm run build && npm run preview`. Only a
  build registers the service worker and precaches assets. Test "installable" and
  offline behaviour against `preview`, never `dev`.

Start a server in the background (PowerShell can't `Start-Process npm` — npm is a
`.cmd`), so invoke the JS entry directly:

```
node node_modules/vite/bin/vite.js preview --port 4317
```

## Visual verification (headless screenshots)

There is no browser test tool wired up; drive Edge directly. This app stores all
state in `localStorage['neontrk_v1']`, so screenshots need same-origin seeding —
you **cannot** seed from a `file://` page and redirect (different origin loses the
data). Use CDP: navigate to the app, `Runtime.evaluate` to set localStorage,
reload, click a nav tab by its text, then `Page.captureScreenshot`.

`assets/screenshot.mjs` is a ready-to-run driver (Node 24's global `WebSocket` +
`fetch`, no deps). It:
1. launches Edge headless with `--remote-debugging-port`,
2. seeds a realistic `days`/`profile`/`sizes` object,
3. captures `01-today.png`, `02-history.png`, `03-setup.png` at a 452×920 mobile
   viewport (`deviceScaleFactor: 2`),
4. prints any page error it captured.

Run it while a server is up on port 4317:

```
node assets/screenshot.mjs
```

Then Read the PNGs it writes (path printed on stdout). Edit the `seed` object in
the script to exercise other states (over-limit, empty night, long streaks).

Edge path used: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`.
Adjust if Edge is installed elsewhere.

## What "working" looks like

- Today: header streak chip, count/limit hero (turns danger-red when over),
  BAC + pure-alcohol stat cards, streak progress, limit stepper, quick-log grid,
  custom-size panel, today's log list.
- History: week/month totals, 12-day bar chart with peak-‰ markers, 6-month
  overview bars, awards grid.
- Setup: weight, sex toggle, editable drink sizes, reset link, Widmark disclaimer.

If the page is blank, check the server is on the expected port and re-run after a
longer settle delay (React + font load).
