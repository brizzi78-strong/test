#!/usr/bin/env bash
# Retrieve archived captures of Tesla pages cited in Chapter 11 section 11.4.6.
#
# Run this on a machine with normal internet access. It does not work inside a
# sandboxed agent environment where outbound hosts are blocked by policy.
#
#   chmod +x fetch-captures.sh && ./fetch-captures.sh
#
# Output: ./captures/<label>/ containing the archived HTML, the resolved
# archive URL, and the capture timestamp. The timestamp is what makes a
# capture citable, so it is written to a sidecar file for every download.

set -uo pipefail
OUT="${1:-./captures}"
mkdir -p "$OUT"

# label|url|target timestamp (YYYYMMDDhhmmss)
TARGETS=(
  "modely-2022-10|tesla.com/modely|20221015000000"
  "modely-2023-02-pre|tesla.com/modely|20230201000000"
  "modely-2023-02-post|tesla.com/modely|20230210000000"
  "modely-2023-06-07|tesla.com/modely|20230607000000"
  "modely-2023-06-09|tesla.com/modely|20230609000000"
  "modely-2023-07|tesla.com/modely|20230715000000"
  "model3-2023-07|tesla.com/model3|20230715000000"
  "modely-design-2024|tesla.com/modely/design|20240615000000"
  "modely-2024-01|tesla.com/modely|20240115000000"
  "modely-2024-11|tesla.com/modely|20241115000000"
  "inventory-2024-11|tesla.com/inventory/new/my|20241115000000"
  "modely-2025-09|tesla.com/modely|20250925000000"
  "homepage-2025-09|tesla.com|20250928000000"
  "homepage-2025-09-30|tesla.com|20250930120000"
  "modely-2025-10|tesla.com/modely|20251010000000"
  "modely-2026-02|tesla.com/modely|20260215000000"
  "modely-2026-03|tesla.com/modely|20260325000000"
  "homepage-2018-10|tesla.com|20181012000000"
  "model3-2018-10|tesla.com/model3|20181012000000"
)

echo "Writing to $OUT"
for t in "${TARGETS[@]}"; do
  IFS='|' read -r label url ts <<< "$t"
  dir="$OUT/$label"; mkdir -p "$dir"

  # Ask the Wayback availability API for the capture nearest the target date.
  meta=$(curl -sS --max-time 30 \
    "https://archive.org/wayback/available?url=${url}&timestamp=${ts}") || {
      echo "  $label: availability lookup failed"; continue; }

  snap=$(printf '%s' "$meta" | grep -o '"url": *"[^"]*"' | head -1 | cut -d'"' -f4)
  stamp=$(printf '%s' "$meta" | grep -o '"timestamp": *"[^"]*"' | head -1 | cut -d'"' -f4)

  if [ -z "$snap" ]; then
    echo "  $label: no capture near $ts"
    continue
  fi

  # id_ suffix returns the original page without the archive toolbar injection.
  raw="${snap/\/http/id_/http}"
  curl -sSL --max-time 90 -o "$dir/page.html" "$snap"
  curl -sSL --max-time 90 -o "$dir/page.raw.html" "$raw" 2>/dev/null

  {
    echo "label:      $label"
    echo "source:     $url"
    echo "requested:  $ts"
    echo "capture:    $stamp"
    echo "archive_url: $snap"
    echo "retrieved:  $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } > "$dir/CAPTURE.txt"

  echo "  $label: captured $stamp"
done

cat <<'NOTE'

Done. Next steps:
  1. Open each captures/<label>/page.html in a browser.
  2. Screenshot with the archive URL and capture timestamp visible in frame.
  3. Search the HTML for the advertised strings, e.g.:
       grep -oiE 'qualified buyers|qualifying buyers|meet all federal requirements|probable savings|potential savings|order by (september|october)' captures/*/page.raw.html
  4. Record what you find against the checklist in RETRIEVAL.md.
NOTE
