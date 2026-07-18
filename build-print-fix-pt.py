#!/usr/bin/env python3
"""PT variant of build-print-fix.py — chapter/part page breaks for Portuguese,
interior only (no English cover blocks)."""
import re, sys
path = sys.argv[1]
html = open(path, encoding="utf-8").read()

# Chapter openers -> new page
html = html.replace("<p><strong>CAPÍTULO", '<p class="chapno"><strong>CAPÍTULO')

# Part labels PARTE UM..SEIS -> part-title page
html = re.sub(
    r"<p>(PARTE (?:UM|DOIS|TRÊS|QUATRO|CINCO|SEIS))</p>",
    r'<p class="partno">\1</p>',
    html,
)

# Ordered lists: seed counter from real start value (Sumário/Contents)
def fix_ol(m):
    start = int(m.group(2)) if m.group(2) else 1
    return '<ol class="startfix" style="counter-reset: li %d;">' % (start - 1)
html = re.sub(r'<ol(\s+start="(\d+)")?[^>]*>', fix_ol, html)

# Wrap the title page (first h1 up to next h1)
html = re.sub(r"(<h1\b.*?</h1>.*?)(?=<h1\b)",
              r'<div class="titlepage">\1</div>', html, count=1, flags=re.S)

open(path, "w", encoding="utf-8").write(html)
