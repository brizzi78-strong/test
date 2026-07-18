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

echo "Built: $BASE.pdf  $BASE.epub  $BASE.docx"
