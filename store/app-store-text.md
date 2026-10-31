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

This block answers App Review's Guideline 2.1 "Information Needed" request
(first submission, 23 Oct 2026). Paste it both into the reply in App Store
Connect and into this Notes field, and attach the screen recording to the
reply (shot list below).

```
1. SCREEN RECORDING
Attached. It was recorded on a physical iPhone running the latest iOS, starting from the Home Screen. Promilla has no account registration, no login, no account deletion (there are no accounts), no user-generated content and no paid content or in-app purchases.

2. PURPOSE AND AUDIENCE
Promilla is a private drink journal for adults who want to keep track of how much they drink. You log each drink, set a limit for the night and a weekly target, and build alcohol-free streaks. History and Insights show your week, your month and your 8-week trend, so you can see your habits and cut down if you want to.

The app also shows an educational estimate of how an evening's drinks add up (the Widmark formula), labeled "Estimate" wherever it appears. It doesn't measure anything and isn't presented as a measuring device. It never tells anyone they are fit to drive. The app and the listing both say the estimate must never be used to decide that.

3. SETUP AND MAIN FEATURES
No setup, no login and no sample files. Launch the app and it is ready.
- Today: tap "Log a drink", pick a type and a size, and confirm. An undo bar appears. Tap a drink to edit it, or remove it. Use the arrows at the top to go to an earlier day and add a drink you forgot.
- History: totals for this week and this month, the last 12 days, drinks by month, and your alcohol-free streaks.
- Insights: the 8-week trend against your weekly target, your busiest day of the week, and a 12-week calendar (tap a day to see its drinks).
- Settings: weight and sex (used for the estimate), weekly target, your usual sizes, accent color, back up to a file, restore from a file, export as CSV, and the privacy policy.

4. EXTERNAL SERVICES
None. The app works fully offline. All data is stored on the device only. There is no server, no account system, no analytics, no ads, no tracking, no third-party SDKs, no AI services and no payment processor. Fonts are bundled in the app. The only link out is the privacy policy (https://app.promilla.se/privacy), which opens in Safari.

5. REGIONAL DIFFERENCES
None. The app works the same in every region. It is in English only.

6. REGULATED INDUSTRY OR THIRD-PARTY MATERIAL
Not applicable. Promilla is not a medical device and makes no medical claims, it doesn't sell or deliver alcohol, and it contains no protected third-party material. All artwork and text are our own.
```

**Screen recording shot list** (about 1 to 2 minutes, on a physical iPhone
with the latest iOS). Turn on Screen Recording in Control Center, start it on
the Home Screen, then tap the Promilla icon:

1. Launch: Today on an empty day (estimate dial, "Log a drink").
2. Log a drink: type, size, confirm. Show the undo bar. Log a second drink so
   the dial, the curve and the drink list update.
3. Tap a drink, change its size or time, save.
4. Go back one day and add a drink there.
5. History: scroll through the totals and the alcohol-free streaks.
6. Insights: scroll to the 12-week calendar and tap a day to open its drinks.
7. Settings: weight and sex, weekly target, accent color, back up now (the
   share sheet opens), then tap "Privacy policy" (Safari opens) and return.
8. Optional: turn on Airplane mode and log a drink to show it works offline.

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
