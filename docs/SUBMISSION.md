# Getting Neon Tracker into the App Store & Google Play

Everything code-side is done: the native projects build, CI is wired, icons
and splash screens are generated. What remains is account setup, secrets,
and the store consoles — things that require the account owner (you).

Repo: `github.com/hanssonfredrik/alcometer`
Bundle id / package: `se.venueve.neontracker` (⚠️ see step 0)
Workflows: `.github/workflows/ios.yml` (TestFlight), `.github/workflows/android.yml` (APK/AAB)

---

## 0. Before anything: confirm the app id

`se.venueve.neontracker` is set in `capacitor.config.ts`, the Android
project, and the iOS project. **It becomes permanent the moment you first
upload to either store** — change it now or never. If you change it:
`npx cap sync` after editing `capacitor.config.ts`, plus update
`android/app/build.gradle` (`applicationId`, `namespace`), the Java package
folder under `android/app/src/main/java/`, and the iOS bundle id in
`ios/App/App.xcodeproj`.

Also: commit and push everything to GitHub first — CI builds from the repo,
not from your working tree.

---

## 1. iOS — one-time setup (~1–2 h, mostly waiting on Apple)

No Mac is needed at any point; the GitHub Actions macOS runner does the
building and signing.

1. **Enroll in the Apple Developer Program** — $99/year.
   https://developer.apple.com/programs/enroll/ . Enrollment approval can
   take up to 48 h. Decide whether it's a personal or organization account
   (organization needs a D-U-N-S number for Turbine Studios; personal is
   fine and faster, the seller name is then your own name).
2. **Register the bundle id**: developer.apple.com → Certificates,
   Identifiers & Profiles → Identifiers → **+** → App IDs → App →
   Bundle ID (explicit): `se.venueve.neontracker`. No capabilities
   needed.
3. **Create the app record**: App Store Connect → My Apps → **+** →
   New App → platform iOS, the bundle id from step 2, name "Neon Tracker"
   (if taken, pick a variant — this is the store display name only), SKU
   e.g. `neontracker`.
4. **Create an App Store Connect API key**: App Store Connect → Users and
   Access → Integrations → App Store Connect API → Team Keys → **+**.
   Role: **Admin** (required — see below). Download the `.p8` file — **you
   can only download it once**. Note the Key ID and the Issuer ID (shown at
   the top of the page).
   > ⚠️ **Must be Admin.** Cloud signing generates the *Distribution*
   > certificate at export time, and only an Admin-role key can create it
   > (an App Manager key can sign the archive but not export — you'll hit
   > `Cloud signing permission error` / `No signing certificate "iOS
   > Distribution" found`). There is no per-key "Access to Cloud Managed
   > Distribution Certificate" toggle in the web UI, so the role is the only
   > lever — and **a key's role can't be changed after creation**: if an
   > existing key is too low, create a new Admin key and update the secrets.
5. **Find your Team ID**: developer.apple.com → Membership details →
   Team ID (10 characters).
6. **Add four GitHub secrets**: repo → Settings → Secrets and variables →
   Actions → New repository secret:
   | Secret | Value |
   |---|---|
   | `APP_STORE_CONNECT_KEY_ID` | Key ID from step 4 |
   | `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID from step 4 |
   | `APP_STORE_CONNECT_PRIVATE_KEY` | full text contents of the `.p8` file |
   | `APPLE_TEAM_ID` | Team ID from step 5 |
7. **Run the workflow**: repo → Actions → "iOS (TestFlight)" → Run
   workflow. First run takes ~15 min. If it fails at the **export** step
   with `Cloud signing permission error` / `No signing certificate "iOS
   Distribution" found`, the API key role is too low — it must be **Admin**
   (see step 4); recreate the key as Admin and update the secrets. Also
   confirm the bundle id is registered (step 2) and that any pending Apple
   agreements (App Store Connect → Business) are accepted.
8. **Install via TestFlight**: App Store Connect → TestFlight → the build
   appears after ~10 min of processing. **Export compliance is handled
   automatically** — the iOS `Info.plist` sets
   `ITSAppUsesNonExemptEncryption = false` (the app uses only standard,
   exempt encryption: HTTPS provided by the OS), so no "Missing Compliance"
   prompt should appear. If you ever *do* see it (e.g. an older build made
   before that key existed), click **Manage** and answer:
   *"Does your app use encryption?"* → **Yes**, then *"Does your app qualify
   for any of the exemptions…?"* → **Yes**. Either way, no annual
   self-classification report is required.
   Then add yourself as an internal tester, install the TestFlight app on
   your iPhone, and install Neon Tracker.

## 2. Android — one-time setup (~1 h)

1. **Play Console developer account** — $25 one-time.
   https://play.google.com/console/signup . Identity verification can take
   a day or two.
2. **Create the app** in Play Console: All apps → Create app → name
   "Neon Tracker", app (not game), free.
3. **Generate the upload keystore** — run locally (any machine with Java,
   this PC has it):
   ```powershell
   keytool -genkey -v -keystore upload.jks -keyalg RSA -keysize 2048 `
     -validity 10000 -alias upload
   ```
   Answer the prompts; remember both passwords.
   **Back this file up somewhere safe (password manager / cloud drive).**
   If you lose it you lose the ability to update the app (Play App Signing
   softens this, but don't rely on it). Do **not** commit it.
4. **Add four GitHub secrets**:
   | Secret | Value |
   |---|---|
   | `ANDROID_KEYSTORE_BASE64` | `[Convert]::ToBase64String([IO.File]::ReadAllBytes("upload.jks"))` output |
   | `ANDROID_KEYSTORE_PASSWORD` | keystore password |
   | `ANDROID_KEY_ALIAS` | `upload` |
   | `ANDROID_KEY_PASSWORD` | key password |
5. **Produce a release build**: `git tag v1.0.0 && git push --tags` → the
   Android workflow uploads a `neon-tracker-release-aab` artifact →
   download and unzip it.
6. **Upload to Play**: Play Console → Testing → Internal testing → Create
   release → upload the `.aab` → add your Google account as a tester →
   install from the opt-in link on your phone.

## 3. Store listing content (both stores, ~2 h)

Required before public release; not required for TestFlight/internal testing.

- **Privacy policy URL** — ✅ done, deployed with the web app:
  `https://victorious-moss-0f60f0d10.7.azurestaticapps.net/privacy`
  (`public/privacy.html`; `public/staticwebapp.config.json` makes `/privacy`
  canonical — `/privacy.html` 301-redirects to it, so the URL survives a
  future custom domain unchanged).
  Use it for **both** stores' privacy-policy fields **and** as Apple's
  required **Support URL** (the page has a support section). If you later
  attach a custom domain to the Static Web App, update both store fields.
- **Privacy questionnaires** — truthful answers are "nothing collected":
  - Apple: App Privacy → **Data Not Collected**.
  - Play: App content → Data safety → no collection, no sharing.
- **Age rating questionnaires** — answer the alcohol questions honestly
  (the app's whole subject is alcohol):
  - Apple: "Alcohol, Tobacco, or Drug Use or References" → Frequent/Intense
    → expect 17+/18+. Rating only — approval is unaffected; Guideline 1.4.3
    bans apps *encouraging* excess, which this isn't.
  - Play: IARC questionnaire → alcohol references → typically PEGI 16/18.
- **Screenshots**:
  - App Store: 6.9" (1320×2868) and 6.5" (1284×2778 or 1242×2688) iPhone.
  - Play: ≥2 phone screenshots (16:9–9:16), 512×512 icon
    (`public/pwa-512x512.png` works), and a 1024×500 feature graphic.
  - I can generate all of these from the app with seeded demo data — ask.
- **Store listing text** — every field below is ready to paste. Character
  limits are noted so nothing gets truncated. The BAC-estimate disclaimer is
  baked into the full description (supports the "moderation utility, not
  drinking encouragement" framing for review).

  **App name** — Apple (≤30) & Play (≤30):
  ```
  Neon Tracker
  ```

  **Subtitle** — Apple only (≤30):
  ```
  Drinks, BAC & sober streaks
  ```

  **Short description** — Play only (≤80):
  ```
  Track drinks, estimate your BAC, and build sober-day streaks — all on-device.
  ```

  **Promotional text** — Apple only (≤170, editable anytime without review):
  ```
  Log a drink in one tap and watch your estimated promille rise and fall in real time. Rack up sober days. Everything stays on your phone — no account, works offline.
  ```

  **Keywords** — Apple only (≤100, commas, no spaces):
  ```
  bac,blood alcohol,promille,drink tracker,alcohol,sober,streak,widmark,breathalyzer,drinks,units
  ```

  **Full description** — Apple "Description" & Play "Full description" (paste
  the same text in both):
  ```
  Neon Tracker helps you stay aware of how much you drink — with a bold neon interface that's fast to use and completely private.

  Tap once to log a drink and watch your estimated blood-alcohol level (promille) rise and fall in real time. Build streaks of sober days, set a weekly goal, and follow your trends. Everything stays on your device — no account, no sign-up, no tracking.

  WHAT YOU CAN DO
  • One-tap logging for wine, beer, cava and liquor — or a custom pour
  • Live BAC / promille estimate that decays over time
  • "Sober by" time so you know when you're clear
  • Sober-day streaks with milestone badges
  • Weekly goal and an Insights trend
  • Full, editable history
  • Pick your accent theme: pink, cyan, green or amber
  • Backup and restore your data (JSON), export to CSV

  PRIVATE BY DESIGN
  All your data lives only on this device. The app collects nothing, sends nothing, and works fully offline.

  HOW THE ESTIMATE WORKS
  BAC is estimated with the Widmark formula from your weight, sex (body-water ratio) and the time since your first drink, with alcohol burning off at about 0.15 ‰/h.

  IMPORTANT
  BAC values are estimates only. They must never be used to decide whether it is safe to drive or operate machinery. This app is a tool for awareness and moderation — not a breathalyzer.
  ```

  **Support URL** (Apple, required) & **Privacy policy URL** (both stores):
  ```
  https://victorious-moss-0f60f0d10.7.azurestaticapps.net/privacy
  ```

  > ASO note: Apple has no keyword/subtitle equivalent on Play, so Play's
  > 80-char short description carries the descriptive keywords instead. If you
  > later want more search weight, the name field can become
  > "Neon: Drink Tracker" (still ≤30) on either store — display name only.

- **App Store review notes** (App Review Information field):
  > Fully offline utility, not a website wrapper: all functionality is
  > local (native storage, haptics, no web navigation, works in airplane
  > mode). No account needed. All data stays on the device.

## 4. On-device verification checklist

Do these on real hardware once TestFlight / internal-testing builds are in
(CI proves it compiles; only a device proves it behaves):

- [ ] Log drinks → force-kill the app → relaunch → data still there
      (this exercises the native Preferences storage path).
- [ ] Status bar area: header padding looks right on a notched/punch-hole
      device; no content under the bars; bottom nav clears the gesture bar.
- [ ] Haptics fire on quick-log and undo.
- [ ] Android back button: History/Setup → back → Today → back → app
      minimizes (doesn't exit or black-screen).
- [ ] Splash shows dark with the ring logo, no white flash on launch.
- [ ] Airplane mode: app fully works.
- [ ] `＋ Custom size` and the edit-drink modal: `time` input renders usably
      in the WebView (it uses the native time picker).
- [ ] Setup → "privacy policy" link opens the hosted page in the system
      browser (not inside the app's WebView).

## 5. Ongoing releases

1. Bump `version` in `package.json` (cosmetic) and the user-facing version:
   `MARKETING_VERSION` in `ios/App/App.xcodeproj/project.pbxproj` and
   `versionName` in `android/app/build.gradle` (+ increment `versionCode`).
   The iOS *build number* is auto-set from the CI run number.
2. Commit, `git tag vX.Y.Z && git push --tags`.
3. iOS: promote the TestFlight build to App Store review in App Store
   Connect. Android: upload the new AAB artifact / promote the release track.
4. The web app deploys as before via the Azure workflow — nothing changed.

## Known limitations / manual-only items

- **Android emulator on this dev PC**: only the SDK command-line tools are
  installed (enough to compile). For a local emulator install Android
  Studio; or just use a real device — `npm run android` picks up any
  adb-connected phone with USB debugging on.
- **First iOS workflow run is untested** until the Apple secrets exist; if
  it fails, the log lands in the Actions run (plus an artifact on failure).
- **Existing PWA users' data does not migrate** into the store apps —
  browser and app storage are separate sandboxes. A JSON export/import
  feature would bridge it; not built yet.
- **Guideline 4.2 risk** (Apple rejecting WebView-wrapped apps as "not
  app-like") is judgment-based. The polish work (offline, native storage,
  haptics, splash, no browser chrome) is the mitigation; the review notes
  above are the argument. If rejected: reply/appeal with those points, and
  consider adding a widget or local notifications ("sober by" reminder) as
  further native functionality.
