#!/usr/bin/env bash
# Convert JPG/JPEG/PNG to AVIF (same settings used for project galleries).
#
# Usage:
#   bash scripts/convert-to-avif.sh <file-or-dir> [--force] [--delete] [--recursive]
#
# Examples:
#   bash scripts/convert-to-avif.sh images/projects/kim-chips
#   bash scripts/convert-to-avif.sh images/projects/kim-chips/foo.jpg --delete
#   bash scripts/convert-to-avif.sh images/projects --recursive --force
#
# Options:
#   --force       Overwrite existing .avif
#   --delete      Remove source image after successful convert
#   --recursive   Walk subfolders (default: only the given directory)
#   --crf <n>     Quality (default: 30; lower = better / larger)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CRF=30
FORCE=0
DELETE=0
RECURSIVE=0
TARGET=""

usage() {
  cat <<'EOF'
Convert JPG/JPEG/PNG to AVIF (same settings used for project galleries).

Usage:
  bash scripts/convert-to-avif.sh <file-or-dir> [--force] [--delete] [--recursive]

Examples:
  bash scripts/convert-to-avif.sh images/projects/kim-chips
  bash scripts/convert-to-avif.sh images/projects/kim-chips/foo.jpg --delete
  bash scripts/convert-to-avif.sh images/projects --recursive --force

Options:
  --force       Overwrite existing .avif
  --delete      Remove source image after successful convert
  --recursive   Walk subfolders (default: only the given directory)
  --crf <n>     Quality (default: 30; lower = better / larger)
EOF
  exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage 0 ;;
    --force) FORCE=1; shift ;;
    --delete) DELETE=1; shift ;;
    --recursive|-r) RECURSIVE=1; shift ;;
    --crf)
      CRF="${2:?missing value for --crf}"
      shift 2
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage 1
      ;;
    *)
      if [[ -n "$TARGET" ]]; then
        echo "Unexpected argument: $1" >&2
        usage 1
      fi
      TARGET="$1"
      shift
      ;;
  esac
done

if [[ -z "$TARGET" ]]; then
  echo "Error: pass a file or directory." >&2
  usage 1
fi

if [[ "$TARGET" != /* ]]; then
  TARGET="$ROOT/$TARGET"
fi

if [[ ! -e "$TARGET" ]]; then
  echo "Error: not found: $TARGET" >&2
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "Error: ffmpeg not found. Install it (e.g. brew install ffmpeg)." >&2
  exit 1
fi

convert_one() {
  local src="$1"
  local dest="${src%.*}.avif"
  local ext="${src##*.}"
  ext="$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')"

  case "$ext" in
    jpg|jpeg|png) ;;
    *) return 0 ;;
  esac

  if [[ -f "$dest" && "$FORCE" -ne 1 ]]; then
    echo "skip  (exists)  ${dest#"$ROOT"/}"
    SKIPPED=$((SKIPPED + 1))
    return 0
  fi

  echo "convert  ${src#"$ROOT"/}  →  ${dest#"$ROOT"/}"
  local err
  err="$(mktemp)"
  if ! ffmpeg -hide_banner -loglevel error -y \
    -i "$src" \
    -c:v libsvtav1 \
    -crf "$CRF" \
    -frames:v 1 \
    "$dest" 2>"$err"
  then
    echo "fail   ${src#"$ROOT"/}" >&2
    cat "$err" >&2 || true
    rm -f "$err"
    FAILED=$((FAILED + 1))
    return 0
  fi
  rm -f "$err"

  CONVERTED=$((CONVERTED + 1))

  if [[ "$DELETE" -eq 1 ]]; then
    rm -f "$src"
    echo "delete  ${src#"$ROOT"/}"
  fi
}

CONVERTED=0
SKIPPED=0
FAILED=0

if [[ -f "$TARGET" ]]; then
  convert_one "$TARGET"
elif [[ -d "$TARGET" ]]; then
  if [[ "$RECURSIVE" -eq 1 ]]; then
    while IFS= read -r -d '' file; do
      convert_one "$file"
    done < <(find "$TARGET" -type f \( \
      -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \
    \) -print0 | sort -z)
  else
    shopt -s nullglob nocaseglob
    for file in "$TARGET"/*.{jpg,jpeg,png,JPG,JPEG,PNG}; do
      [[ -f "$file" ]] || continue
      convert_one "$file"
    done
    shopt -u nullglob nocaseglob
  fi
else
  echo "Error: not a file or directory: $TARGET" >&2
  exit 1
fi

echo
echo "Done. converted=$CONVERTED skipped=$SKIPPED failed=$FAILED crf=$CRF"
if [[ "$FAILED" -gt 0 ]]; then
  exit 1
fi
