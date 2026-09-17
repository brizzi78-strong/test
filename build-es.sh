#!/usr/bin/env bash
set -euo pipefail
SRC="The_Cardinals_Promise_ES.md"; BASE="The_Cardinals_Promise_ES"
pandoc "$SRC" -t html5 --template=build-template.html --css=build-print.css \
  -M title="La Promesa del Cardenal" -M author="Rob Brizzi" -M lang="es" -o "$BASE.tmp.html"
python3 build-print-fix-es.py "$BASE.tmp.html" cover/cardinal-front-es.jpg
python3 -c "import weasyprint; weasyprint.HTML('$BASE.tmp.html', base_url='.').write_pdf('$BASE.pdf')"
rm -f "$BASE.tmp.html"
pandoc "$SRC" -M title="La Promesa del Cardenal" -M author="Rob Brizzi" -M lang="es" \
  --epub-cover-image=cover/cardinal-front-es.jpg --toc --toc-depth=1 --split-level=1 -o "$BASE.epub"
pandoc "$SRC" -M title="La Promesa del Cardenal" -M author="Rob Brizzi" -M lang="es" -o "$BASE.docx"
python3 build-docx-pagenum.py "$BASE.docx" || true
echo "Built: $BASE.pdf  $BASE.epub  $BASE.docx"
