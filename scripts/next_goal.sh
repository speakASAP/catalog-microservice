#!/usr/bin/env sh
set -eu

ROOT="${1:-.}"
STATE="$ROOT/docs/IMPLEMENTATION_STATE.md"

if [ ! -f "$STATE" ]; then
  echo "Missing docs/IMPLEMENTATION_STATE.md"
  exit 1
fi

awk '
  /^## Current Status/ { in_status=1; print; next }
  /^## / && in_status { in_status=0 }
  in_status { print }
  /^## Next Action/ { in_next=1; print; next }
  /^## / && in_next { in_next=0 }
  in_next { print }
' "$STATE"
