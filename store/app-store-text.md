# Promilla store listing text

The text to paste into App Store Connect, with the matching Google Play fields
at the end. This file is the only place the listing text lives. The pictures
are in `out/`, and [README.md](README.md) says which file goes in which slot.

Each value is in its own code block, so copy the block contents exactly. The
counts next to each field were checked by script (characters, not bytes).
Wording follows the `copywriting` skill (`.claude/skills/copywriting`).

## How this text is written

Apple has repeatedly rejected apps that only estimate blood alcohol in
software, even with disclaimers (Guideline 1.4, Physical Harm; see
`docs/naming/app-name-report.md`). So this listing:

- presents the app as a drink journal with alcohol-free streaks;
- mentions the estimate only inside the description, never in the name, the
  subtitle or the first lines;
- never says "breathalyzer", "test" or "measure", and never suggests anyone
  is fit to drive;
- claims only what the app does today;
- has no exclamation marks and no em-dashes.

When a feature changes, update this file in the same change and re-check the
counts.

---

## App Store Connect

### App Information (applies to every version)

**Name** (max 30), 8/30:

```
Promilla
```

For more search weight you can use this instead (23/30). Only the display
name changes; the bundle id stays.

```
Promilla: Drink Journal
```

**Subtitle** (max 30), 29/30:

```
Drink log & alcohol-free days
```

**Category:** Health & Fitness first, Lifestyle second.

**Content rights:** no third-party content.

**Age rating:** under "Alcohol, Tobacco, or Drug Use or References" answer
**Frequent/Intense**. Expect 17+ or 18+. It sets the rating and doesn't affect
approval. Answer None to everything else.

**App Privacy:** **Data Not Collected.** The app collects and shares nothing,
has no tracking and no third-party SDKs.

### Version page (1.0)

**Promotional text** (max 170, you can change it any time without a review),
155/170:

```
Log tonight's drinks in a couple of taps, follow an estimate of your evening and build alcohol-free streaks. It all stays on your phone. No account needed.
```

**Description** (max 4000), 1678/4000:

```
Promilla is a private drink journal. Log what you drink, see roughly how your evening adds up, and build streaks of alcohol-free days. The bold neon look stays easy to read, even late in the evening.

Nothing leaves your phone. There is no account and no tracking, and the app works offline.

TONIGHT
• Log a drink in a couple of taps. Pick wine, beer, cava or liquor, then the size. Your usual pour is already picked, or enter your own size and strength.
• A dial and a curve show an estimate of your evening, and roughly when it gets back to zero.
• Set a limit for the night and see when you go over it.
• Forgot one? Add or change drinks on earlier days.

ALCOHOL-FREE DAYS
• Count your alcohol-free days in a row and collect milestones along the way.
• Set a weekly target in standard drinks and follow your trend against it.

LOOK BACK
• Totals for this week and this month, the last 12 days, and drinks by month.
• Insights: your 8-week trend, your busiest day of the week and a 12-week calendar.

YOUR DATA
• Everything is stored only on this device. The app collects nothing and sends nothing.
• Save a backup file and restore it on a new phone, or export your drinks as CSV.
• Pick an accent color: blue, pink, cyan, green or amber.

ABOUT THE ESTIMATE
The level is a rough estimate from the Widmark formula. It uses your weight, your sex and the time since your first drink, and assumes about 0.15 ‰ burns off per hour. Your real level can be quite different, depending on food, health and medication.

It is not a measurement. Never use it to decide whether you can drive, cycle, operate machinery or do anything else where alcohol matters. If in doubt, don't drive.
```

**Keywords** (max 100, commas, no spaces after commas), 89/100.
Apple already indexes the words in the name and subtitle, so they aren't
repeated here.

```
alcohol,tracker,promille,diary,journal,units,moderation,mindful,habit,counter,widmark,bac
```

"bac" is the only keyword that names the estimate. Users never see keywords,
but App Review does. If a review cites Guideline 1.4, remove it first.

**What's New in This Version** (max 4000), 208/4000:

```
First release of Promilla.
Log a drink in a few taps and see your estimated blood alcohol level. Follow your week against your own weekly target and build alcohol-free streaks.
Everything stays on your phone.
```

**Support URL** and **Privacy Policy URL** (one page covers both):

```
https://app.promilla.se/privacy
```

**Marketing URL:** `https://www.promilla.se` once the marketing page is live (see "Marketing site" in `CLAUDE.md`). Leave it empty until then.

**Copyright:**

```
2026 Venueve
```

### App Review Information

**Sign-in required:** No.

**Notes:**

```
Promilla is a drink journal for people who want to keep track of how much they drink. It works fully offline with no account. No data leaves the device: it uses on-device storage only, with no network calls and no analytics.

The core of the app is the journal: logging drinks, a limit for the night, a weekly target, history, insights and alcohol-free streaks. It also shows an educational estimate of how an evening's drinks add up (the Widmark formula), labelled "Estimate" wherever it appears. The app doesn't measure anything, isn't presented as a measuring device, and never tells anyone they are fit to drive. The app and this listing both say the estimate must never be used for that.

To try it, tap "Log a drink", pick a type and a size, and confirm. History, Insights and Settings need no setup.
```

**Screenshots:** in the **"iPhone with Dynamic Island (medium display)"** tab,
upload `out/appstore/iphone-6.3/` (files 01 to 05, in order). That tab accepts
1206 × 2622. If your page shows a 6.5" or 6.9" slot instead, use
`iphone-6.5/` or `iphone-6.9/`. Never drop a set into another slot, or the
Play files into any:
App Store Connect rejects them with "File dimensions are invalid". If it asks
for iPad screenshots, the attached build is an old one that still supports
iPad (see `README.md`).

---

## Google Play

**App name** (max 30):

```
Promilla
```

**Short description** (max 80), 67/80:

```
A private drink journal. Log drinks and build alcohol-free streaks.
```

**Full description** (max 4000): paste the App Store **Description** above as
it is.

**Graphics:** `out/googleplay/icon-512.png`,
`out/googleplay/feature-graphic.png` and `out/googleplay/phone/` (01 to 05).

**Category:** Health & Fitness. **Data safety:** no data collected, none
shared. **Content rating (IARC):** answer the alcohol questions honestly. It
usually comes out as PEGI 16 or 18.

**Release notes** (max 500), 208/500. Play Console wraps them in
`<en-US>` tags; keep those if you paste into the tagged box.

```
First release of Promilla.
Log a drink in a few taps and see your estimated blood alcohol level. Follow your week against your own weekly target and build alcohol-free streaks.
Everything stays on your phone.
```
