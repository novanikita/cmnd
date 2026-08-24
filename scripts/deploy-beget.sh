#!/usr/bin/env bash
# Manual deploy to Beget (same rsync as GitHub Actions).
# Usage:
#   export BEGET_HOST=login.beget.tech
#   export BEGET_USER=your_login
#   export BEGET_PATH=/home/u/your_login/flowerdog.studio/public_html/
#   bash scripts/deploy-beget.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE_DIR="${1:-$ROOT/_site}"

: "${BEGET_HOST:?Set BEGET_HOST}"
: "${BEGET_USER:?Set BEGET_USER}"
: "${BEGET_PATH:?Set BEGET_PATH}"

bash "$ROOT/scripts/build-production.sh" "$SITE_DIR"

rsync -avz --delete --progress \
  "$SITE_DIR/" "${BEGET_USER}@${BEGET_HOST}:${BEGET_PATH}"

echo "Deployed to Beget: ${BEGET_USER}@${BEGET_HOST}:${BEGET_PATH}"
