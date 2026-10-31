#!/usr/bin/env bash
# One-time setup so .github/workflows/marketing.yml can sign in to Azure.
# Creates (or reuses) an app registration with a federated credential for
# this repo's main branch, gives it Contributor on rg-promilla-web only, and
# stores the three ids as GitHub secrets. No client secret is created.
#
# Needs: az (signed in to the Venueve tenant) and gh (signed in to GitHub).
# Run from the repo root: bash infra/marketing/setup-github-oidc.sh
# Safe to re-run.
set -euo pipefail
export PYTHONWARNINGS=ignore

SUBSCRIPTION=9db99ae1-ca7f-4ff2-831a-0d591b884f49 # SocialBetting
RESOURCE_GROUP=rg-promilla-web
LOCATION=westeurope
APP_NAME=promilla-marketing-github
REPO=hanssonfredrik/alcometer

TENANT=$(az account show --subscription "$SUBSCRIPTION" --query tenantId -o tsv | tr -d '\r')
SCOPE="/subscriptions/$SUBSCRIPTION/resourceGroups/$RESOURCE_GROUP"

echo "Resource group $RESOURCE_GROUP"
az group create -n "$RESOURCE_GROUP" -l "$LOCATION" --subscription "$SUBSCRIPTION" \
  --tags app=promilla -o none

APP_ID=$(az ad app list --display-name "$APP_NAME" --query "[0].appId" -o tsv | tr -d '\r')
if [[ -z "$APP_ID" ]]; then
  echo "Creating app registration $APP_NAME"
  APP_ID=$(az ad app create --display-name "$APP_NAME" --query appId -o tsv | tr -d '\r')
fi
echo "App id $APP_ID"

# Avoid --filter "..." and other quoted arguments with spaces: on Windows,
# Git Bash hands them to az.cmd, which splits them.
if ! az ad sp show --id "$APP_ID" -o none 2>/dev/null; then
  echo "Creating service principal"
  for attempt in 1 2 3 4 5 6; do
    # A brand-new app registration can take a moment to replicate.
    az ad sp create --id "$APP_ID" -o none 2>/dev/null && break
    [[ $attempt == 6 ]] && { echo "Service principal creation failed"; exit 1; }
    sleep 10
  done
fi

if ! az ad app federated-credential list --id "$APP_ID" --query "[].name" -o tsv | tr -d '\r' | grep -qx github-main; then
  echo "Adding federated credential for $REPO main"
  tmp=$(mktemp)
  # az on Windows is a native program and can't read /tmp/... paths.
  tmp_arg=$tmp
  command -v cygpath >/dev/null && tmp_arg=$(cygpath -w "$tmp")
  cat > "$tmp" <<EOF
{
  "name": "github-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:$REPO:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"],
  "description": "Deploys the Promilla marketing site from main"
}
EOF
  az ad app federated-credential create --id "$APP_ID" --parameters "@$tmp_arg" -o none
  rm -f "$tmp"
fi

echo "Granting Contributor on $RESOURCE_GROUP"
SP_ID=$(az ad sp show --id "$APP_ID" --query id -o tsv | tr -d '\r')
for attempt in 1 2 3 4 5 6; do
  # MSYS_NO_PATHCONV stops Git Bash on Windows from turning the
  # /subscriptions/... scope into C:/Program Files/Git/subscriptions/...
  # The object id + principal type skip a Graph lookup that can lag behind a
  # brand-new service principal. Re-running is fine: an existing assignment
  # is reported as a conflict and treated as done.
  if out=$(MSYS_NO_PATHCONV=1 az role assignment create --assignee-object-id "$SP_ID" \
    --assignee-principal-type ServicePrincipal --role Contributor --scope "$SCOPE" -o none 2>&1) ||
    [[ "$out" == *RoleAssignmentExists* ]]; then
    break
  fi
  if [[ $attempt == 6 ]]; then
    echo "Role assignment failed:"
    echo "$out"
    exit 1
  fi
  sleep 10
done

echo "Setting GitHub secrets on $REPO"
gh secret set AZURE_CLIENT_ID --repo "$REPO" --body "$APP_ID"
gh secret set AZURE_TENANT_ID --repo "$REPO" --body "$TENANT"
gh secret set AZURE_SUBSCRIPTION_ID --repo "$REPO" --body "$SUBSCRIPTION"

echo "Done. Run the workflow: gh workflow run marketing.yml --repo $REPO"
