#!/usr/bin/env bash
# Restores binary brand assets (PNGs, favicon) from their base64 forms in assets-b64/.
# Run once after checkout (CI does this automatically).
set -euo pipefail
cd "$(dirname "$0")/.."
for f in assets-b64/*.b64; do
  base="$(basename "$f" .b64)"
  base64 -d "$f" > "public/$base"
  echo "restored public/$base"
done
