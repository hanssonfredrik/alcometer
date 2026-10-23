# iOS signing with a saved certificate

These steps stop the iOS build from creating a new Apple Development
certificate on every run, the cause of "Your account has reached the maximum
number of certificates". The workflow will sign with one saved Apple
Distribution certificate and one provisioning profile, the same way
DiabetesNinja and Ronin do.

You do steps 1–4. Step 5 is the workflow change, which Claude makes.

## What you reuse

Promilla is on the same Apple team as DiabetesNinja: **Venueve AB
(`J859ZS5D33`)**. Its Apple Distribution certificate is already on your
machine:

- `C:\Projects\diabetesninja-app\app\diabetesninja\cert\ios\dist.p12`
- Valid until **2 Aug 2027**
- Password: the one saved as `APPLE_CERT_PASSWORD` for DiabetesNinja (from
  your password manager)

You don't create a new certificate. You only make a profile for Promilla.

## 1. Clear the certificate limit

1. Open https://developer.apple.com/account/resources/certificates/list.
2. Check that the team at the top right reads **Venueve AB**.
3. Revoke every **Apple Development** certificate the CI runs created. They
   show "Created via API" or a runner name like `Mac-1234…`.
4. Do **not** revoke **Apple Distribution: Venueve AB**. DiabetesNinja, Ronin
   and Promilla all use it.

## 2. Create the provisioning profile

1. Same site → **Profiles** → **+**.
2. Under Distribution, choose **App Store Connect** → **Continue**.
3. App ID: **`se.venueve.neontracker`** → **Continue**.
4. Certificate: **Apple Distribution: Venueve AB**, the one that expires
   2027/08/02 → **Continue**.
5. Name it exactly **`Promilla AppStore`** → **Generate** → **Download**.
6. Move the file to
   `C:\Users\fredr\keys\Promilla_AppStore.mobileprovision` (next to your
   Android keystore, outside the repo).

## 3. Add four GitHub secrets

Run these in PowerShell from `C:\Projects\Venueve\alcometer`, so `gh` sets
them on the `alcometer` repo:

```powershell
gh secret set APPLE_CERT_P12_BASE64 --body ([Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Projects\diabetesninja-app\app\diabetesninja\cert\ios\dist.p12")))
gh secret set APPLE_CERT_PASSWORD --body (Read-Host "p12 password" -MaskInput)
gh secret set APPLE_PROVISIONING_PROFILE_BASE64 --body ([Convert]::ToBase64String([IO.File]::ReadAllBytes("$HOME\keys\Promilla_AppStore.mobileprovision")))
gh secret set APPLE_CODESIGN_PROVISION --body "Promilla AppStore"
```

`APPLE_CODESIGN_PROVISION` must match the profile name from step 2 exactly.

Check that they're all there:

```powershell
gh secret list
```

Keep the existing `APP_STORE_CONNECT_*` and `APPLE_TEAM_ID` secrets. The
upload to TestFlight still uses them.

## 4. Tell Claude it's done

Say "iOS secrets are in" in the session.

## 5. Workflow change and test (Claude, done)

`.github/workflows/ios.yml` now does this:

- import `dist.p12` into a temporary keychain on the runner
- install the `Promilla AppStore` profile
- archive with manual signing (`CODE_SIGN_STYLE=Manual`, that identity and
  profile), so no certificate is ever created
- export and upload to TestFlight with the API key, as today

Then Claude starts a manual iOS run (`gh workflow run ios.yml`). When it's
green, re-run the `v1.0.2` iOS build, or tag the next version, to get the BAC
fix onto TestFlight.

## When the certificate expires (2 Aug 2027)

Renew it once, following "Distribution certificate" in
`C:\Projects\diabetesninja-app\docs\completed\ReleaseSetup.md`. Then:

1. Update `APPLE_CERT_P12_BASE64` and `APPLE_CERT_PASSWORD` in all three
   repos' secrets (DiabetesNinja, Ronin, Promilla).
2. Regenerate every profile against the new certificate, including
   `Promilla AppStore`. Then update `APPLE_PROVISIONING_PROFILE_BASE64`.

## If the iOS build fails

| Error | Fix |
|---|---|
| `No signing certificate "iOS Distribution" found` or no identity in the keychain | `APPLE_CERT_P12_BASE64` or `APPLE_CERT_PASSWORD` is wrong. Set both again from step 3. |
| `No profile for team … matching 'Promilla AppStore'` | The name in `APPLE_CODESIGN_PROVISION` doesn't match the profile, or the profile is for another App ID. |
| `Provisioning profile … doesn't include signing certificate` | The profile was made with a different certificate. Redo step 2 with **Apple Distribution: Venueve AB**. |
| Still `maximum number of certificates` | The workflow change in step 5 isn't in yet, or a step still uses automatic signing. |
