#!/usr/bin/env bash
# Regenerates public/data/*.json from the canonical source:
# Mathilde Rouxel's PhD thesis PDF on HAL (tel-03425456).
# Requires: curl, pdftotext (poppler-utils), python3.
set -euo pipefail
cd "$(dirname "$0")/.."
PDF_URL="https://theses.hal.science/tel-03425456v1/file/These_ROUXEL_Mathilde_2020.pdf"
mkdir -p public/data .cache
if [ ! -f .cache/full.txt ]; then
  echo "Downloading thesis PDF from HAL…"
  curl -L --fail --retry 3 -o .cache/thesis.pdf "$PDF_URL"
  echo "Extracting text (pdftotext)…"
  pdftotext .cache/thesis.pdf .cache/full.txt
fi
echo "Parsing datasets…"
python3 scripts/parser.py .cache/full.txt public/data
echo "Done. Files in public/data/:"
ls -la public/data/
