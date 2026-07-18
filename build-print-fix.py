#!/usr/bin/env python3
"""Post-process pandoc HTML for the print PDF (WeasyPrint).

- Tag chapter-number paragraphs so each chapter starts on a new page.
- Fix ordered-list numbering: WeasyPrint ignores the `start` attribute, so the
  hand-written Contents renumbers 1,2,3 in every Part. Re-seed a CSS counter.
- Wrap the title block (first <h1> through the blocks before the next <h1>) so
  it can be styled as a real title page.
"""
import re
import sys

path = sys.argv[1]
cover = sys.argv[2] if len(sys.argv) > 2 else None
html = open(path, encoding="utf-8").read()

# Chapter openers -> new page (styled via .chapno)
html = html.replace("<p><strong>CHAPTER", '<p class="chapno"><strong>CHAPTER')

# Part labels ("PART ONE" ... "PART SIX") -> part-title page (styled via .partno)
html = re.sub(
    r"<p>(PART (?:ONE|TWO|THREE|FOUR|FIVE|SIX))</p>",
    r'<p class="partno">\1</p>',
    html,
)

# Ordered lists: seed a counter from the real start value
def fix_ol(m):
    start = int(m.group(2)) if m.group(2) else 1
    return '<ol class="startfix" style="counter-reset: li %d;">' % (start - 1)

html = re.sub(r'<ol(\s+start="(\d+)")?[^>]*>', fix_ol, html)

# Wrap the title page (first h1 and everything up to the next h1)
html = re.sub(
    r"(<h1\b.*?</h1>.*?)(?=<h1\b)",
    r'<div class="titlepage">\1</div>',
    html,
    count=1,
    flags=re.S,
)

# Optional full-page front cover (screen PDF only, never the KDP interior)
if cover:
    html = html.replace(
        "<body>",
        '<body>\n<div class="bookcover"><img src="%s" alt="">'
        '<div class="coverauthor">ROB BRIZZI</div></div>' % cover,
        1,
    )

open(path, "w", encoding="utf-8").write(html)
