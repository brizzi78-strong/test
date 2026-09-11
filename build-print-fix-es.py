#!/usr/bin/env python3
import re, sys
path=sys.argv[1]; cover=sys.argv[2] if len(sys.argv)>2 else None
html=open(path,encoding="utf-8").read()
html=html.replace("<p><strong>CAPÍTULO", '<p class="chapno"><strong>CAPÍTULO')
html=re.sub(r"<p>((?:PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA) PARTE)</p>",
            r'<p class="partno">\1</p>', html)
def fix_ol(m):
    start=int(m.group(2)) if m.group(2) else 1
    return '<ol class="startfix" style="counter-reset: li %d;">'%(start-1)
html=re.sub(r'<ol(\s+start="(\d+)")?[^>]*>', fix_ol, html)
html=re.sub(r"(<h1\b.*?</h1>.*?)(?=<h1\b)", r'<div class="titlepage">\1</div>', html, count=1, flags=re.S)
if cover:
    html=html.replace("<body>", '<body>\n<div class="bookcover"><img src="%s" alt=""></div>'%cover, 1)
open(path,"w",encoding="utf-8").write(html)
