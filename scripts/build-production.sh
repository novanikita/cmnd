#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE_DIR="${1:-$ROOT/_site}"

mkdir -p "$SITE_DIR"

rsync -a \
  --exclude '.git' \
  --exclude '.github' \
  --exclude 'deploy' \
  --exclude 'scripts' \
  --exclude '_site' \
  --exclude 'robots.production.txt' \
  --exclude 'robots.preview.txt' \
  --exclude '.cursor' \
  --exclude '/about.html' \
  --exclude '/audit.html' \
  --exclude '/dodo.html' \
  --exclude '/lavatop.html' \
  --exclude '/portfolio.html' \
  --exclude '/rangos.html' \
  --exclude '/sber500.html' \
  --exclude '/sporos.html' \
  --exclude '/yandex.html' \
  "$ROOT/" "$SITE_DIR/"

cp "$ROOT/robots.production.txt" "$SITE_DIR/robots.txt"

echo "Production build ready in: $SITE_DIR"
echo "Draft pages are served only under /preview/<token>/ (excluded from site root)."
