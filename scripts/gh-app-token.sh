#!/usr/bin/env bash
# Prints a short-lived (1 hour) installation access token for the
# truepeptidesource-bot GitHub App, so pushes and releases come from the bot.
# Holds no secrets: the App ID and the private key path come from the environment.
#
#   export GH_APP_TOKEN="$(APP_ID=5909922 APP_KEY=~/tps-bot.pem scripts/gh-app-token.sh)"
#   git -c credential.helper= -c "http.extraHeader=Authorization: Basic $(printf 'x-access-token:%s' "$GH_APP_TOKEN" | base64 -w0)" push origin master
#   GH_TOKEN="$GH_APP_TOKEN" gh release create v1.0.1 --repo TruePeptideSource/peptide-calculator --notes "..."
set -euo pipefail

: "${APP_ID:?Set APP_ID to the GitHub App ID}"
: "${APP_KEY:?Set APP_KEY to the path of the App private key (.pem)}"
REPO="${REPO:-TruePeptideSource/peptide-calculator}"
API="https://api.github.com"

b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }
json_field() { python3 -I -c "import json,sys; print(json.load(sys.stdin)['$1'])"; }

now=$(date +%s)
header=$(printf '{"alg":"RS256","typ":"JWT"}' | b64url)
payload=$(printf '{"iat":%d,"exp":%d,"iss":"%s"}' $((now - 60)) $((now + 540)) "$APP_ID" | b64url)
signature=$(printf '%s.%s' "$header" "$payload" | openssl dgst -sha256 -sign "$APP_KEY" -binary | b64url)
jwt="$header.$payload.$signature"

installation=$(curl -fsS -H "Authorization: Bearer $jwt" -H "Accept: application/vnd.github+json" \
  "$API/repos/$REPO/installation" | json_field id)

curl -fsS -X POST -H "Authorization: Bearer $jwt" -H "Accept: application/vnd.github+json" \
  "$API/app/installations/$installation/access_tokens" | json_field token
