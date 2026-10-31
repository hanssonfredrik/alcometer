# Marketing site (www.promilla.se)

The public homepage. The page is `web/marketing/`, the Azure resource is
`infra/marketing/main.bicep`, and `.github/workflows/marketing.yml` provisions
and deploys both on every push to `main` that touches them.

| What                | Where                                                        |
| ------------------- | ------------------------------------------------------------ |
| Main address        | `https://www.promilla.se`                                    |
| `promilla.se`       | Forwarded to www by Loopia (Loopia can't point the apex at Azure) |
| Azure resource      | `swa-promilla-marketing` in `rg-promilla-web`, SocialBetting subscription, Free tier |
| Default hostname    | `icy-island-027998203.4.azurestaticapps.net`                 |
| GitHub sign-in      | App registration `promilla-marketing-github`, OIDC, Contributor on `rg-promilla-web` only |
| Web app and privacy | Stay on `app.promilla.se` (a separate Static Web App)       |

## Run it locally

```bash
npm run marketing          # http://localhost:8742
npm run marketing -- 9000  # another port
```

No build step: edit `web/marketing/index.html` and reload. The `/privacy`
redirect in `staticwebapp.config.json` only works in Azure.

## One-time setup

### 1. GitHub can sign in to Azure

Run once from the repo root, signed in with `az` and `gh`:

```bash
bash infra/marketing/setup-github-oidc.sh
```

It creates the app registration and its federated credential, grants
Contributor on `rg-promilla-web`, and sets the GitHub secrets
`AZURE_CLIENT_ID`, `AZURE_TENANT_ID` and `AZURE_SUBSCRIPTION_ID`. There is
no client secret to rotate. Then run the workflow:

```bash
gh workflow run marketing.yml
```

### 2. DNS at Loopia

In Loopia Customer Zone, open DNS for `promilla.se`:

1. **www**: delete the existing A records and add a **CNAME** to
   `icy-island-027998203.4.azurestaticapps.net.`
2. **promilla.se** (the `@` host): set up forwarding (Loopia calls it
   "Vidarebefordran" or "Webbomdirigering") to `https://www.promilla.se`,
   permanent (301).
3. Leave `app`, `MX` and the SPF `TXT` records alone.

When the CNAME resolves (`nslookup www.promilla.se` shows the
azurestaticapps.net name), bind the domain once yourself. The workflow's
identity can't, because Azure reports the binding's progress at subscription
scope and that identity only has the resource group:

```bash
az staticwebapp hostname set -n swa-promilla-marketing -g rg-promilla-web --hostname www.promilla.se
```

Azure then issues the certificate, which can take up to an hour. From then on
the workflow sees the binding and leaves it alone. (`www.promilla.se` was
bound on 2026-10-31.)

## Store links

A badge with `href=""` shows as "Coming soon" and isn't clickable. When an app
goes public, put its store URL in the badge's `href` and update its
`aria-label`. Google Play:
`https://play.google.com/store/apps/details?id=se.venueve.neontracker`.
