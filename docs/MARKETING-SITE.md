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

No build step: edit the HTML and reload. The local server mirrors Azure for
folders (`/sv` redirects to `/sv/`) and missing pages (`404.html`, status
404). The `/privacy` redirect in `staticwebapp.config.json` only works in
Azure.

## What's on the site

| Path                     | What                                                 |
| ------------------------ | ---------------------------------------------------- |
| `/`                      | English home, with the FAQ                           |
| `/how-it-works/`         | How the estimate works (Widmark, example, std drinks) |
| `/sv/`                   | Swedish home, with the FAQ                           |
| `/sv/sa-fungerar-det/`   | Så fungerar uppskattningen                           |
| `404.html`               | Bilingual, served with status 404                    |
| `site.css`               | Shared styles for every page                         |
| `robots.txt`             | Allows everyone, AI crawlers named on purpose        |
| `sitemap.xml`            | The four pages with hreflang pairs                   |
| `llms.txt`               | Key facts and links for AI assistants                |

The app domain has its own `public/robots.txt` and `public/sitemap.xml`
(`/` and `/privacy`).

There is no analytics script, on purpose: the site promises no tracking.
Search Console and Bing Webmaster Tools give search data without one.

### Adding or changing a page

- Give it a unique `<title>`, meta description and an absolute `canonical`
  with a trailing slash.
- Add the `hreflang` trio (`en`, `sv`, `x-default`) on both pages of the
  pair, and the language switch link in the header and footer.
- Add JSON-LD (`TechArticle` for guides). When you change a FAQ answer,
  change the visible text and the `FAQPage` JSON-LD together, word for word.
- Add the page to `sitemap.xml` and `llms.txt`. Bump `<lastmod>` in
  `sitemap.xml` (and `dateModified` and "Last updated" on guides) whenever a
  page changes.
- Keep facts identical everywhere: the pages, `llms.txt`, the store listings
  and the privacy page. The numbers come from `src/lib/constants.js`.
- Swedish copy follows the Swedish section of the `copywriting` skill.

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

## Search engines

Do this once, after the pages are live. Nothing goes on the page itself:
verification is a DNS record.

### Google Search Console

1. Open https://search.google.com/search-console with a Venueve Google
   account, so access doesn't depend on one person.
2. **Add property**, choose **Domain** and enter `promilla.se`. A Domain
   property covers `promilla.se`, `www` and `app` in one go.
3. Copy the `google-site-verification=...` value. In Loopia Customer Zone,
   open DNS for `promilla.se` and add a **TXT** record on the `@` host with
   that value. Leave the SPF `TXT` record alone: two TXT records on `@` are
   fine.
4. When `nslookup -type=TXT promilla.se` shows it, press **Verify**. Keep
   the record: removing it unverifies the property.
5. **Sitemaps**: submit `https://www.promilla.se/sitemap.xml` and
   `https://app.promilla.se/sitemap.xml`.
6. **URL inspection**: inspect each of the four pages and press **Request
   indexing**.
7. **Settings → Users and permissions**: add a second owner.
8. After a few days, check **Pages** for indexing problems and the
   structured data reports for errors. **Performance** shows the searches
   people found you with.

### Bing Webmaster Tools

Bing matters beyond Bing: ChatGPT search and Copilot use its index.

1. Open https://www.bing.com/webmasters and choose **Import from Google
   Search Console**. It copies the verified site and its sitemaps. Without
   GSC, add `https://www.promilla.se` and verify with the TXT or CNAME record
   Bing gives you, at Loopia.
2. Check both sitemaps are listed, and use **URL submission** for the four
   pages.
3. Planned, optional: IndexNow (a key file at the root and a ping from
   `marketing.yml`) gets changes into Bing within minutes.

### Store listings

Set the developer website to `https://www.promilla.se/` in Play Console
(**Store settings → Store listing contact details**) and as the
**Marketing URL** in App Store Connect. It ties the app to the site for
search engines and AI assistants.

### Checks after a deploy

- `curl -I https://www.promilla.se/nope` returns `404`.
- https://search.google.com/test/rich-results on `/` and `/how-it-works/`
  finds the structured data without errors.
- https://validator.schema.org for the full JSON-LD.
- Lighthouse SEO in Edge DevTools on all four pages.
