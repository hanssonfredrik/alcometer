# Future ideas

Proposals for future versions of Neon Tracker. Nothing here is committed work —
it's a menu, roughly ordered by value-for-effort within each section. Guiding
constraints that any of these must respect:

- **Local-first stays the default.** "All data stays on this device" is a core
  promise (and the privacy policy says so). Anything network-flavoured must be
  opt-in and clearly labelled.
- **Logic lives in `lib/`** (pure, testable), state in `useTracker`, screens
  stay thin. Native APIs go behind a `lib/` wrapper that no-ops on web.
- **The BAC number is an estimate.** No feature should make it look like a
  measurement (no "safe to drive" verdicts).

---

## Data safety & portability

Data lives in one local storage key. Manual backup now closes the "no way
out" gap — a lost phone or cleared WebView no longer means losing every streak.

- ✓ **Shipped — Export / import backup.** `lib/backup.js` plus "Download
  backup" / "Import backup" in Setup: exports the whole persisted object as
  JSON (browser download on web, OS share sheet on native), and imports it
  through a validate-then-merge flow that unions entries per day and keeps the
  newer entry on `id` collision. Import migrates older files first, so a
  backup never strands the install.
- ✓ **Shipped — Schema versioning + migrations.** The object carries a
  `version` field; `SCHEMA_VERSION` + a `migrate()` ladder in `storage.js`
  upgrade both loaded state and imported backups (the v1→v2 logical-day
  re-bucket below is the first rung). Future model changes bolt on as new rungs.
- ✓ **Shipped — CSV export.** "Export entries (CSV)" in Setup writes one row
  per drink (date, time, type, cl, %, grams) for use in a spreadsheet.
- **Optional encrypted sync** (far future). End-to-end encrypted blob sync so
  a user can move phones. Only worth doing if there's real demand; the manual
  backup file above covers 90% of the need.

## Logging quality-of-life

- **More drink types / custom presets.** The four hard-coded types (wine,
  beer, cava, liquor) cover Sweden well but not everyone. Let users add,
  rename, and reorder their own quick-log presets (e.g. "IPA 44 cl", "G&T").
  Data model: turn `sizes` into an ordered list of presets; migrate the four
  defaults into it.
- **Log at a past time.** `addDrink` always stamps `Date.now()`; the edit
  modal can fix it afterwards, but a long-press on a quick-log button could
  offer "15 / 30 / 60 min ago" directly.
- **Repeat last drink.** One button that re-logs whatever was logged last —
  the most common action on a night out.
- **Zero-alcohol logging.** Let water/mocktails be logged (0% abv already
  works in the model). Pacing with water is a real harm-reduction technique,
  and it gives the Today log a fuller picture of the night.
- **Favourites on the widget/app-shortcut level** (see Native section).

## Sessions & the midnight problem

✓ **Shipped — logical days.** Day keys now roll at 05:00 (`DAY_START_HOUR`;
`dateKey` shifts the timestamp back), migrated in via the v1→v2 re-bucket. A
night running past 00:00 lands in one bucket, which already delivers most of
what a session concept promised:

- BAC continuity across midnight — `bacAt` sees the whole night, so the 02:00
  beer decays from the 23:00 state and "hours since first drink" no longer
  resets at midnight.
- "Sober by" times that don't jump at midnight.
- Fairer streaks — a Friday night ending at 01:00 stays on Friday's key.

Remaining (optional refinement): a true **session** model that groups entries
by an inactivity gap (~6 h) rather than a fixed 05:00 cut, handling the odd
night that runs to 07:00 or two distinct sittings in one logical day, and
giving history a natural "nights out" unit. Lower priority now that logical
days cover the common case; it stays pure in `lib/` over the flat entry list.

## Insights & history

The Insights tab (fourth in the bottom nav) collects the richer analytics, with
the aggregation kept pure in `lib/insights.js` over the flat `days` map.

- ✓ **Shipped — Calendar heatmap.** `heatmapGrid()` builds a GitHub-style
  12-week grid (week rows × Mon–Sun columns); each cell is coloured sober /
  within limit / over limit against that day's set limit — the classic "don't
  break the chain" view, next to the streak milestones on History.
- ✓ **Shipped — Weekly pattern view.** `weekdayAverages()` averages drinks and
  std glasses per weekday over the span since the first log, surfaced as
  "Your Fridays average 4.2 drinks" plus a per-weekday bar — the single most
  actionable insight for cutting down.
- ✓ **Shipped — Trends over time.** `weeklyTrend()` computes the rolling 4-week
  average of std drinks/week with an up/down/flat indicator versus the previous
  four weeks, framed against a user-set weekly target (`profile.weeklyTarget`,
  std glasses/week, edited in Setup and backfilled by `migrate()`).
- **Spending tracker.** Optional price per preset; History gains "≈ 640 kr
  this month". Money is a stronger motivator than grams for many people.
- **More awards.** All current milestones are streak-based except "Home
  safe". Add e.g. "First month under target", "10 nights within limit",
  "Logged 100 drinks honestly". Awards for *moderation*, not just abstinence,
  match the app's harm-reduction tone.

## Goals & gentle nudges

- ✓ **Shipped — Weekly target.** Today has a per-day limit; Setup now also
  takes a std-drinks-per-week target (`profile.weeklyTarget`), surfaced against
  the rolling 4-week average in the Insights Trend card. A dedicated progress
  ring on History could still follow.
- **Challenges.** Time-boxed goals ("Dry January", "3 sober weekdays this
  week") with their own award slots.
- **Morning check-in notification** (native, opt-in): the morning after a
  logged night, a local notification — "Last night: 5 drinks, peak ≈ 0.9 ‰.
  Log anything you missed?" Local notifications only; nothing leaves the
  device. Behind a `lib/notifications.js` wrapper that no-ops on web.
- **Pace warning.** If the projected peak BAC crosses a user-set ceiling
  while logging, show a gentle inline note ("this puts your peak ≈ 1.2 ‰") —
  informational, never blocking, never "safe/unsafe".

## Native & platform

- **Home-screen widgets** (iOS WidgetKit / Android Glance): current streak,
  or tonight's count + "sober by". Requires writing a small shared snapshot
  from the web layer into an app-group/shared-prefs location on `saveData`.
- **App shortcuts / quick actions.** Long-press the app icon → "Log beer".
- **iOS Live Activity** during an active session: live BAC decay and "sober
  by" on the lock screen. High wow-factor, meaningful native work.
- **Apple Health / Health Connect export** of "alcoholic beverages consumed"
  (both platforms have a standard type). Opt-in, export-only.
- **Better haptics vocabulary**: distinct patterns for log vs. undo vs.
  milestone earned (the wrapper in `lib/haptics.js` already isolates this).

## Personalisation & reach

- **Localisation.** UI strings are hard-coded English while the standards are
  Swedish. Extract strings, ship `sv` first. Also localise the *units
  system*: US/UK users think in oz and different std-drink grams (14 g US,
  8 g UK) — make `STD_GLASS_GRAMS` a profile setting with country presets.
- **Onboarding.** First launch goes straight to an empty Today screen. A
  three-card intro (what it does, set weight/sex, "it's an estimate"
  disclaimer) would set expectations and get the profile right from day one,
  instead of silently defaulting to 75 kg / M.
- **Themes.** The neon aesthetic is token-driven (`global.css`), so accent
  swaps (cyan, green, amber) are nearly free and users love them.

## Engineering foundations

Not features, but they make everything above cheaper and safer:

- **Unit tests for `lib/`.** The whole point of keeping `alcohol.js`,
  `datetime.js`, and `storage.js` pure is testability, and there's no test
  runner yet. Vitest fits Vite with zero config; the Widmark math, streak
  computation, and day-key/timezone edges (DST!) are the first targets.
- **Linting/formatting.** ESLint + Prettier, wired into CI next to the
  existing Android/iOS workflows.
- **Storage-error surfacing.** `saveData` failures are currently silent; at
  minimum, surface "couldn't save" so users don't lose entries unknowingly.
