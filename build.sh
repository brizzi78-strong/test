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
  --epub-cover-image=cover/cardinal-front-v5.jpg \
  --toc --toc-depth=1 \
  --split-level=1 \
  -o "$BASE.epub"

# DOCX (editorial/review) — with centered page numbers in the footer
pandoc "$SRC" \
  --metadata-file=build-metadata.yaml \
  -o "$BASE.docx"
python3 build-docx-pagenum.py "$BASE.docx"

# Reading-proof PDF via HTML + WeasyPrint (6x9 trim, mirrored margins).
# Custom template (no duplicate title block) + post-process (chapter page
# breaks, Contents numbering, title-page wrap).
pandoc "$SRC" \
  --metadata-file=build-metadata.yaml \
  -t html5 \
  --template=build-template.html \
  --css=build-print.css \
  -o "$BASE.tmp.html"
python3 build-print-fix.py "$BASE.tmp.html" cover/cardinal-front-v5.jpg
python3 -c "import weasyprint; weasyprint.HTML('$BASE.tmp.html', base_url='.').write_pdf('$BASE.pdf')"
rm -f "$BASE.tmp.html"

# KDP print interior: same layout, BLACK text for cheap B&W printing.
pandoc "$SRC" \
  --metadata-file=build-metadata.yaml \
  -t html5 \
  --template=build-template.html \
  --css=build-print-kdp.css \
  -o "${BASE}_KDP.tmp.html"
python3 build-print-fix.py "${BASE}_KDP.tmp.html"
python3 -c "import weasyprint; weasyprint.HTML('${BASE}_KDP.tmp.html').write_pdf('${BASE}_KDP_Interior.pdf')"
rm -f "${BASE}_KDP.tmp.html"

# Self-contained web-readable HTML (embedded CSS + cover image, one file)
pandoc "$SRC" \
  --metadata-file=build-metadata.yaml \
  -t html5 -s \
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

# TTS-only pronunciation fix: "Lews" (no apostrophe, print spelling) reads
# ambiguously aloud; swap in "Lou's" for narration only, print stays "Lews".
sed -i "s/Boardwalk Lews/Boardwalk Lou's/g" "${BASE}_speechify.txt"

echo "Built: $BASE.epub  $BASE.docx  $BASE.pdf  $BASE.html  ${BASE}_speechify.txt"
