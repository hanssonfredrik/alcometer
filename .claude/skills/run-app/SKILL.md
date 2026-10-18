---
name: run-app
description: Launch the Alcometer PWA locally and, when a visual check is needed, capture screenshots of every screen and the log sheet with seeded data using headless Edge over the Chrome DevTools Protocol. Use when asked to run, preview, or screenshot the app, or to confirm a UI change works.
---

# Running & screenshotting Alcometer

## Just run it

- **Dev (hot reload):** `npm run dev` → http://localhost:5173. Service worker is
  disabled here by design.
- **Production / PWA / offline test:** `npm run build && npm run preview`. Only a
  build registers the service worker and precaches assets. Test "installable" and
  offline behaviour against `preview`, never `dev`.

Start a server in the background (PowerShell can't `Start-Process npm` — npm is a
`.cmd`), so invoke the JS entry directly. Both of these serve on the port the
screenshot driver expects (4317):

```
node node_modules/vite/bin/vite.js --port 4317 --strictPort     # dev, current source
node node_modules/vite/bin/vite.js preview --port 4317          # built dist/
```

Dev is fine for screenshots of source changes and needs no build. Note the
first page load on a cold dev server compiles everything and the first
screenshot run can come back **blank** — just run the driver a second time.

Kill it afterwards: `netstat -ano | findstr :4317` → `taskkill /PID <pid> /F`.

## Visual verification (headless screenshots)

There is no browser test tool wired up; drive Edge directly. This app stores all
state in `localStorage['neontrk_v1']`, so screenshots need same-origin seeding —
you **cannot** seed from a `file://` page and redirect (different origin loses the
data). Use CDP: navigate to the app, `Runtime.evaluate` to set localStorage,
reload, click a nav tab by its text, then `Page.captureScreenshot`.

`assets/screenshot.mjs` is a ready-to-run driver (Node 24's global `WebSocket` +
`fetch`, no deps). It:
1. launches Edge headless with `--remote-debugging-port`,
2. seeds a realistic `days`/`profile`/`sizes` object (no `theme`/`version`, so it
   also exercises the storage migration ladder and shows the default theme),
3. captures, at a 452×920 mobile viewport (`deviceScaleFactor: 2`):
   `01-today.png`, `01b-prev-day.png`, `01c-log-sheet.png` (the sheet open),
   `02-history.png`, `04-insights.png`, `03-setup.png`,
4. prints any page error it captured.

Run it while a server is up on port 4317:

```
node assets/screenshot.mjs
```

Then Read the PNGs it writes (path printed on stdout; `screenshots/` is
gitignored). Edit the `seed` object to exercise other states — over-limit,
empty night, light BAC, a past day, `profile.theme = 'pink'` (set
`version: 3` too, or the migration flips pink back to blue).

CSS Module class names are hashed, so in `Runtime.evaluate` find elements by
**text or aria-label**, e.g.
`[...document.querySelectorAll('button')].find(b => b.textContent.includes('Log a drink')).click()`,
`document.querySelector('[aria-label="Previous day"]').click()`. Close a sheet
by clicking its overlay: `document.querySelector('[role=dialog]').parentElement.click()`.

Also check a small phone: set `Emulation.setDeviceMetricsOverride` to 375×667
and confirm the BAC hero, the log button and the summary line all sit above the
bottom nav without scrolling.

Edge path used: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`.
Adjust if Edge is installed elsewhere.

## What "working" looks like

- Today: day pager; BAC hero with a big ‰ number, a coloured zone pill
  (Sober / Light / Tipsy / Drunk / Very drunk), "Sober by ~HH:MM", and
  "N / limit drinks" (red with "· N over limit" when over); full-width accent
  "Log a drink" button; summary line "N drinks · X std · Y g" with the limit
  stepper; drink rows (icon, type, size, time, ×). Past day: "PEAK THAT
  EVENING", button reads "Add a drink to Yesterday".
- Log sheet: 2×2 tiles (last-used type selected), size chips with the
  configured pour marked "usual", Custom reveals cl/% inputs, "Add Beer · 33 cl"
  confirm. After confirming, a "Logged … · Undo" toast floats above the nav
  and the hero updates immediately.
- History: week/month totals, 12-day bar chart with peak-‰ markers, 6-month
  overview bars, awards grid.
- Insights: trend vs weekly target, weekday bars, 12-week heatmap; tapping a
  drinking day opens the centred day-detail modal.
- Setup: weight, sex toggle, five theme swatches (Blue selected by default),
  weekly target, editable drink sizes (erasable fields), backup buttons,
  Widmark disclaimer.

If the page is blank, check the server is on the expected port and re-run after a
longer settle delay (React + font load).
