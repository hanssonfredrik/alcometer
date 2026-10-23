# Getting Promilla into the App Store & Google Play

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
   New App → platform iOS, the bundle id from step 2, name "Promilla"
   (if taken, pick a variant — this is the store display name only), SKU
   e.g. `neontracker`.
4. **Create an App Store Connect API key**: App Store Connect → Users and
   Access → Integrations → App Store Connect API → Team Keys → **+**.
   Role: **App Manager** or higher. Download the `.p8` file. **You can only
   download it once.** Note the Key ID and the Issuer ID (shown at the top
   of the page). The key only uploads builds: signing uses the saved
   certificate in the next step.
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

   Then set up signing (the Venueve AB distribution certificate and a
   `Promilla AppStore` profile, four more secrets) by following
   `docs/IOS-SIGNING.md`.
7. **Run the workflow**: repo → Actions → "iOS (TestFlight)" → Run
   workflow. The first run takes about 15 min. Signing errors are covered in
   the table at the end of `docs/IOS-SIGNING.md`. Also confirm the bundle
   id is registered (step 2) and that any pending Apple agreements (App
   Store Connect → Business) are accepted.
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
   your iPhone, and install Promilla.

## 2. Android — one-time setup (~1 h)

1. **Play Console developer account** — $25 one-time.
   https://play.google.com/console/signup . Identity verification can take
   a day or two.
2. **Create the app** in Play Console: All apps → Create app → name
   "Promilla", app (not game), free.
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
   | `ANDROID_KEYSTORE_BASE64` | `[Convert]::ToBase64String([IO.File]::ReadAllBytes("$HOME\keys\promilla-upload.jks")) \| Set-Clipboard`, then paste. Use the full path: .NET doesn't resolve relative paths from your current folder. |
   | `ANDROID_KEYSTORE_PASSWORD` | keystore password |
   | `ANDROID_KEY_ALIAS` | `upload` |
   | `ANDROID_KEY_PASSWORD` | key password |
5. **Produce a release build**: `git tag v1.0.0 && git push --tags` → the
   Android workflow uploads a `promilla-release-aab` artifact →
   download and unzip it. Its `versionCode` is the workflow run number and
   its `versionName` is the tag without the `v`, so nothing is bumped by hand.
6. **First upload to Play, by hand** (the API can't create the app): Play Console → Testing → Internal testing → Create
   release → upload the `.aab` → add your Google account as a tester →
   install from the opt-in link on your phone.
7. **Optional: automatic uploads after that.** Once this is set up, every
   `v*` tag lands in internal testing on its own (like TestFlight on iOS).
   Do it only after step 6: the API can't upload to an app with no builds.

   **a. Create a Google Cloud project and turn on the API.**
   Open https://console.cloud.google.com/ while signed in with the Google
   account that owns the Play developer account. Create a project (for
   example `promilla-play`). Then go to **APIs & Services → Library**,
   search for **Google Play Android Developer API** and click **Enable**.
   Uploads fail with "API has not been used in project" if you skip this.

   **b. Create the service account.** In the same project go to
   **IAM & Admin → Service accounts → Create service account**. Name it
   (for example `github-play-upload`) and click **Create and continue**.
   Skip the optional role and user-access steps and click **Done**. It
   needs no Cloud roles: its rights come from Play Console in step d. Copy
   its email, which looks like
   `github-play-upload@promilla-play.iam.gserviceaccount.com`.

   **c. Create a JSON key.** Click the service account → **Keys** tab →
   **Add key → Create new key → JSON → Create**. A `.json` file downloads.
   It is a password: never commit it. If key creation is blocked by the
   `iam.disableServiceAccountKeyCreation` policy (common on new Google
   Workspace organizations), an org admin has to lift it for this project.

   **d. Give it access in Play Console.** Open https://play.google.com/console
   → **Users and permissions** (in the left menu at the account level, not
   inside the app) → **Invite new users**. Paste the service account email.
   Under **App permissions** click **Add app**, choose Promilla, and tick:
   - **View app information (read-only)**
   - **Release apps to testing tracks**

   Leave everything under Account permissions unticked. Click
   **Invite user** and confirm. There is no invite email to accept: the
   account is active right away. There is no need to link the Cloud project
   anywhere in Play Console either (the old "API access" page is gone).

   **e. Add the GitHub secret.** GitHub → `alcometer` → **Settings →
   Secrets and variables → Actions → New repository secret**. Name it
   `PLAY_SERVICE_ACCOUNT_JSON` and paste the whole contents of the `.json`
   file, braces included. To copy it in PowerShell:
   `Get-Content $HOME\Downloads\<file>.json -Raw | Set-Clipboard`.
   Then move the file into your password manager and delete it from
   Downloads.

   **f. Test it.** Push the next tag (`git tag v1.0.1 && git push --tags`).
   In the Android run, **Upload to Play internal testing** should now run
   instead of being skipped. The new build shows up under **Testing →
   Internal testing** a few minutes later and rolls out to testers
   (the workflow uses `status: completed`).

   If the upload step fails:
   | Error | Fix |
   |---|---|
   | `The caller does not have permission` | Permissions from step d can take up to 24 h to apply. Wait, then re-run the job. Also check that Promilla is ticked under App permissions. |
   | `Package not found: se.venueve.neontracker` | Step 6 isn't done yet, or the service account isn't attached to this app. |
   | `Only releases with status draft may be created on draft app` | The app hasn't left draft yet. Finish the first internal release in step 6 (roll it out, not only save it). |
   | `APK specifies a version code that has already been used` | Re-running an old run reuses its number. Push a new tag instead. |
   | `Google Play Android Developer API has not been used in project` | Enable the API (step a), wait a few minutes, re-run. |
8. **Optional: sign release builds locally.** Put `upload.jks` in
   `android/` and create `android/keystore.properties` (both gitignored):
   ```properties
   storeFile=upload.jks
   storePassword=...
   keyAlias=upload
   keyPassword=...
   ```
   Then `cd android; ./gradlew bundleRelease -PversionCode=<n>`.

## 3. Store listing content (both stores, ~2 h)

Required before public release; not required for TestFlight/internal testing.

- **Privacy policy URL** — ✅ done, deployed with the web app:
  `https://app.promilla.se/privacy`
  (`public/privacy.html`; `public/staticwebapp.config.json` makes `/privacy`
  canonical — `/privacy.html` 301-redirects to it).
  Use it for **both** stores' privacy-policy fields **and** as Apple's
  required **Support URL** (the page has a support section).
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
  - App Store: iPhone medium display, 6.1"/6.3" (1206×2622 or 1179×2556).
    That is the slot App Store Connect leads with as of Oct 2026. Older
    layouts used 6.5" (1284×2778) and 6.9" (1320×2868); all three sets are in
    `store/out/appstore/`.
  - Play: ≥2 phone screenshots (16:9–9:16), 512×512 icon and a 1024×500
    feature graphic.
  - All of these are generated, spec-checked and committed under `store/out/`
    (`npm run store` rebuilds them from the real app with seeded demo data).
    See `store/README.md` for which file goes in which slot.
- **Store listing text and App Review notes** live in
  [`store/app-store-text.md`](../store/app-store-text.md): name, subtitle,
  promotional text, description, keywords, What's New, URLs, review notes,
  and the matching Play fields, every one checked against its character
  limit. It is written to avoid the Guideline 1.4 rejection that software-only
  BAC estimators keep getting (journal-first, estimate never in the
  name/subtitle, no "breathalyzer").

## 4. On-device verification checklist

Do these on real hardware once TestFlight / internal-testing builds are in
(CI proves it compiles; only a device proves it behaves):

- [ ] Log drinks → force-kill the app → relaunch → data still there
      (this exercises the native Preferences storage path).
- [ ] Status bar area: header padding looks right on a notched/punch-hole
      device; no content under the bars; bottom nav clears the gesture bar.
- [ ] Haptics fire when you log a drink and when you undo.
- [ ] Android back button: History/Settings → back → Today → back → app
      minimizes (doesn't exit or black-screen).
- [ ] Splash shows dark with the ring logo, no white flash on launch.
- [ ] Airplane mode: app fully works.
- [ ] `＋ Custom size` and the edit-drink modal: `time` input renders usably
      in the WebView (it uses the native time picker).
- [ ] Settings → "Privacy policy" link opens the hosted page in the system
      browser (not inside the app's WebView).

## 5. Ongoing releases

1. Bump `version` in `package.json` (cosmetic) and the iOS user-facing
   version, `MARKETING_VERSION` in `ios/App/App.xcodeproj/project.pbxproj`.
   The Android `versionName` comes from the tag. The iOS build number and
   the Android `versionCode` are both set from the CI run number.
2. Commit, `git tag vX.Y.Z && git push --tags`.
3. iOS: promote the TestFlight build to App Store review in App Store
   Connect. Android: promote the internal-testing release (or upload the
   AAB artifact by hand if `PLAY_SERVICE_ACCOUNT_JSON` isn't set).
4. The web app deploys as before via the Azure workflow — nothing changed.

## Known limitations / manual-only items

- **Android emulator on this dev PC**: only the SDK command-line tools are
  installed (enough to compile). For a local emulator install Android
  Studio; or just use a real device — `npm run android` picks up any
  adb-connected phone with USB debugging on.
- **First iOS workflow run is untested** until the Apple secrets exist; if
  it fails, the log lands in the Actions run (plus an artifact on failure).
- **Existing PWA users' data does not migrate** into the store apps —
  browser and app storage are separate sandboxes. To move data, export a
  backup in Settings on the web and import it in the app.
- **Android Auto Backup** keeps only the saved app data (the
  `CapacitorStorage` preferences, see `android/app/src/main/res/xml/`) in
  the user's own Google backup, the same way iOS device backups include it.
  That's the user's backup, not collection by us, so Data safety stays
  "nothing collected".
- **Guideline 4.2 risk** (Apple rejecting WebView-wrapped apps as "not
  app-like") is judgment-based. The polish work (offline, native storage,
  haptics, splash, no browser chrome) is the mitigation; the review notes
  above are the argument. If rejected: reply/appeal with those points, and
  consider adding a widget or local notifications ("sober by" reminder) as
  further native functionality.
