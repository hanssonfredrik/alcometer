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
   Role: **App Manager** (or Admin). Download the `.p8` file — **you can
   only download it once**. Note the Key ID and the Issuer ID (shown at the
   top of the page).
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
   workflow. First run takes ~15 min. If it fails on signing, the usual
   cause is the API key role being too low (needs App Manager+ for cloud
   signing) or the bundle id not registered.
8. **Install via TestFlight**: App Store Connect → TestFlight → the build
   appears after ~10 min of processing (answer the export-compliance
   question: uses only standard/exempt encryption → HTTPS only → **Yes,
   exempt**). Add yourself as an internal tester, install the TestFlight
   app on your iPhone, install Neon Tracker.

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

- **Privacy policy URL** — both stores require one, even for a
  no-data-collected app. A single static page is enough; it can live on the
  existing Azure Static Web App (e.g. `/privacy.html`: "Neon Tracker stores
  all data locally on your device. No data is collected, transmitted, or
  shared."). Tell me if you want it generated.
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
- **Descriptions** (short + full). Include the disclaimer: *BAC values are
  Widmark-formula estimates and must never be used to decide whether it is
  safe to drive.* This supports the "moderation utility, not drinking
  encouragement" framing for review.
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
