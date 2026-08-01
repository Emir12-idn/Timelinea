#!/usr/bin/env bash
# Pushes src/ to Apps Script with the real ARCHIVE_APP_SECRET swapped in for
# the deploy, then restores the git-tracked placeholder afterward — so the
# real secret is never left sitting in Archive.gs when you `git add`/commit.
#
# Usage:
#   ./scripts/deploy.sh                 # reuses secret from .secrets/archive-secret.txt
#   ./scripts/deploy.sh "new-secret"    # saves this as the new secret, then deploys
#
# .secrets/ is gitignored — the real secret is never committed.

set -euo pipefail
cd "$(dirname "$0")/.."

SECRET_FILE=".secrets/archive-secret.txt"
ARCHIVE_FILE="src/Archive.gs"
PLACEHOLDER="CHANGE-ME-BEFORE-SELLING-3f9Qz7Lm2Rk8VxT1"

if [ -n "${1:-}" ]; then
  mkdir -p .secrets
  printf '%s' "$1" > "$SECRET_FILE"
  echo "Saved new secret to $SECRET_FILE (gitignored)."
fi

if [ ! -f "$SECRET_FILE" ]; then
  echo "No secret on file yet. Run: ./scripts/deploy.sh \"<a-fresh-random-secret>\"" >&2
  exit 1
fi

SECRET="$(cat "$SECRET_FILE")"

if ! grep -q "$PLACEHOLDER" "$ARCHIVE_FILE"; then
  echo "ERROR: $ARCHIVE_FILE does not currently contain the expected placeholder." >&2
  echo "Refusing to proceed — check git status before touching this file manually." >&2
  exit 1
fi

cleanup() {
  git checkout -- "$ARCHIVE_FILE" 2>/dev/null || sed -i "s/ARCHIVE_APP_SECRET = '.*';/ARCHIVE_APP_SECRET = '$PLACEHOLDER';/" "$ARCHIVE_FILE"
}
trap cleanup EXIT

sed -i "s/ARCHIVE_APP_SECRET = '.*';/ARCHIVE_APP_SECRET = '$SECRET';/" "$ARCHIVE_FILE"
clasp push --force
echo "Deployed with the real secret. $ARCHIVE_FILE has been restored to the placeholder for git."
