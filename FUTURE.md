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

The most pressing gap: all data lives in one storage key with no way out.
A lost phone or a cleared WebView means losing every streak.

- **Export / import backup.** A "Download backup" button in Setup that
  serialises the `neontrk_v1` object to a JSON file, and an import flow that
  validates + merges it (keep the newer entry on id collision). On native,
  use the share sheet. Small, pure `lib/backup.js` — high value, low effort.
- **Schema versioning + migrations.** The key is already named `_v1`; add a
  `version` field inside the object and a tiny migration ladder in
  `storage.js` so future model changes (see below) don't strand old installs.
- **CSV export** of entries for people who want their data in a spreadsheet.
- **Optional encrypted sync** (far future). End-to-end encrypted blob sync so
  a user can move phones. Only worth doing if there's real demand; a manual
  backup file covers 90% of the need.

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

Days are local-date keyed, so a night that runs past 00:00 splits across two
day buckets: the streak logic sees a "drinking day" on both dates, and
`bacAt`'s "hours since first drink" resets. A **session** concept — entries
group into a session if they're within ~6 h of the previous entry, regardless
of date — would fix:

- BAC continuity across midnight (the 02:00 beer decays from the 23:00 state).
- "Sober by" times that don't jump at midnight.
- Fairer streaks (Friday night ending at 01:00 shouldn't cost Saturday).
- A natural unit for history ("nights out" instead of calendar days).

This is the biggest *model* change proposed here and the main reason to do
schema versioning first. All of it belongs in `lib/` (pure session grouping
over the flat entry list).

## Insights & history

- **Calendar heatmap.** A month grid coloured by intensity (sober / within
  limit / over limit) — the classic "don't break the chain" view. Pairs
  naturally with the existing streak milestones.
- **Weekly pattern view.** Average by weekday ("your Fridays average 4.2
  drinks") — the single most actionable insight for cutting down.
- **Trends over time.** Rolling 4-week average of std drinks/week with a
  simple up/down indicator, framed against a user-set weekly target.
- **Spending tracker.** Optional price per preset; History gains "≈ 640 kr
  this month". Money is a stronger motivator than grams for many people.
- **More awards.** All current milestones are streak-based except "Home
  safe". Add e.g. "First month under target", "10 nights within limit",
  "Logged 100 drinks honestly". Awards for *moderation*, not just abstinence,
  match the app's harm-reduction tone.

## Goals & gentle nudges

- **Weekly target.** Today has a per-day limit; add a std-drinks-per-week
  target set in Setup, surfaced as a progress ring in History.
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
