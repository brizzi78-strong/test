#!/usr/bin/env bash
# Build reader-proof deliverables for "The Cardinal's Promise" from the
# assembled manuscript. Produces EPUB, DOCX, and a 6x9 proof PDF.
#
# Requires: pandoc, python3 + weasyprint (pip install weasyprint).
#
# NOTE: the PDF produced here is a READING PROOF, not the print-spec KDP
# interior. The locked 226-page KDP interior (which drives the 0.509" spine
# and cover-wrap math) is typeset separately at final lock, after Scott's
# proofread. Do not upload this proof PDF to KDP as the interior.

set -euo pipefail
SRC="The_Cardinals_Promise_sheff_pass.md"
BASE="The_Cardinals_Promise"

# EPUB (metadata-driven; interim front cover plugged in pending Grace's final)
pandoc "$SRC" \
  --metadata-file=build-metadata.yaml \
  --epub-cover-image=cover/memoir-front-v4-clean.jpg \
  --toc --toc-depth=1 \
  --split-level=1 \
  -o "$BASE.epub"

# DOCX (editorial/review)
pandoc "$SRC" \
  --metadata-file=build-metadata.yaml \
  --toc --toc-depth=1 \
  -o "$BASE.docx"

# Reading-proof PDF via HTML + WeasyPrint (6x9 trim, mirrored margins)
pandoc "$SRC" \
  --metadata-file=build-metadata.yaml \
  -t html5 -s \
  --css=build-print.css \
  -o "$BASE.tmp.html"
python3 -c "import weasyprint; weasyprint.HTML('$BASE.tmp.html').write_pdf('$BASE.pdf')"
rm -f "$BASE.tmp.html"

# Self-contained web-readable HTML (embedded CSS + cover image, one file)
pandoc "$SRC" \
  --metadata-file=build-metadata.yaml \
  -t html5 -s \
  --toc --toc-depth=1 \
  --embed-resources \
  --css=build-web.css \
  --metadata=title-prefix:"" \
  -o "$BASE.html"

# Speechify / text-to-speech copy: clean plain text, front-matter noise removed.
# Keep title block + dedications; drop the copyright/ISBN boilerplate and the
# table of contents (marker-based, so it survives front-matter edits).
pandoc "$SRC" -t plain --wrap=none -o "$BASE.speechify.full.txt"
awk '
  /^FOREWORD$/        { skip=0 }
  /^COPYRIGHT$/       { skip=1 }
  skip==1 {
    if ($0 ~ /^For / || $0 ~ /^In memory of / || $0 ~ /^[0-9][0-9][0-9][0-9]/) print
    next
  }
  { print }
' "$BASE.speechify.full.txt" > "${BASE}_speechify.txt"
rm -f "$BASE.speechify.full.txt"

echo "Built: $BASE.epub  $BASE.docx  $BASE.pdf  $BASE.html  ${BASE}_speechify.txt"
