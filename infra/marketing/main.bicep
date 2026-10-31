// The Azure Static Web App behind the marketing page (www.promilla.se).
// Deployed by .github/workflows/marketing.yml into rg-promilla-web
// (SocialBetting subscription). The page content is uploaded separately with
// the app's deployment token; this file only owns the resource itself.

@description('Azure region. Static Web Apps are only offered in a few regions.')
param location string = 'westeurope'

@description('Name of the Static Web App.')
param name string = 'swa-promilla-marketing'

@description('Custom domain to bind. Its CNAME must already point at the default hostname.')
param customDomain string = 'www.promilla.se'

@description('Bind the custom domain. The workflow sets this once the CNAME resolves.')
param bindCustomDomain bool = false

resource site 'Microsoft.Web/staticSites@2023-12-01' = {
  name: name
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    stagingEnvironmentPolicy: 'Disabled'
    allowConfigFileUpdates: true
  }
  tags: {
    app: 'promilla'
    part: 'marketing'
  }
}

resource domain 'Microsoft.Web/staticSites/customDomains@2023-12-01' = if (bindCustomDomain) {
  parent: site
  name: customDomain
  properties: {
    validationMethod: 'cname-delegation'
  }
}

output name string = site.name
output defaultHostname string = site.properties.defaultHostname
