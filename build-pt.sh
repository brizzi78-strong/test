#!/usr/bin/env bash
set -euo pipefail
SRC="The_Cardinals_Promise_PT.md"
BASE="The_Cardinals_Promise_PT"

# Reading-proof PDF (6x9), Portuguese interior
pandoc "$SRC" -t html5 --template=build-template.html --css=build-print.css \
  -M title="A Promessa do Cardeal" -M author="Rob Brizzi" -M lang="pt-BR" \
  -o "$BASE.tmp.html"
python3 build-print-fix-pt.py "$BASE.tmp.html" cover/cardinal-front-pt.jpg
python3 -c "import weasyprint; weasyprint.HTML('$BASE.tmp.html', base_url='.').write_pdf('$BASE.pdf')"
rm -f "$BASE.tmp.html"

# EPUB
pandoc "$SRC" -M title="A Promessa do Cardeal" -M author="Rob Brizzi" -M lang="pt-BR" \
  --epub-cover-image=cover/cardinal-front-pt.jpg --toc --toc-depth=1 --split-level=1 \
  -o "$BASE.epub"

# DOCX
pandoc "$SRC" -M title="A Promessa do Cardeal" -M author="Rob Brizzi" -M lang="pt-BR" \
  -o "$BASE.docx"
python3 build-docx-pagenum.py "$BASE.docx" || true


# Speechify / TTS text: strip copyright block (DIREITOS AUTORAIS -> PREFÁCIO)
pandoc "$SRC" -t plain --wrap=none -o "$BASE.speech.full.txt"
awk '
  /^PREFÁCIO$/          { skip=0 }
  /^DIREITOS AUTORAIS$/ { skip=1 }
  skip==1 { if ($0 ~ /^Para / || $0 ~ /^Em memória de / || $0 ~ /^[0-9][0-9][0-9][0-9]/) print; next }
  { print }
' "$BASE.speech.full.txt" > "${BASE}_speechify.txt"
rm -f "$BASE.speech.full.txt"

echo "Built: $BASE.pdf  $BASE.epub  $BASE.docx"
