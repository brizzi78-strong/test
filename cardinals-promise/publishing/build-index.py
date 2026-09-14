#!/usr/bin/env python3
"""Rebuild the book Index from the rendered interior PDF.

The Index is the one apparatus that cannot use live xref spans (its entries are
topics, not headings), so it must be regenerated from real page content whenever
pagination changes. Run AFTER derive-interior.mjs, then rebuild once more and
re-run until the page count is stable.
"""
import re, json, sys, subprocess, pathlib

BOOK = '/home/user/test/cardinals-promise/book/cardinals-toolkit-book.html'
PDF  = '/home/user/test/cardinals-promise/publishing/kdp-interior.pdf'
SCR  = '/tmp/claude-0/-home-user-test/f033ae22-6343-5f45-bb02-1ac0346c5634/scratchpad'
# headwords are stable; page numbers are always recomputed
HEADWORDS = json.load(open(f'{SCR}/index-headwords.json'))
OVERRIDE  = {"Alzheimer's disease":3,'SHIP (State Health Insurance Assistance Program)':13,
             'skilled nursing':10,'three-day inpatient rule':13,
             'appeals, Medicare denial':10,'Jimmo v. Sebelius (maintenance coverage)':10}

pages = json.load(open(f'{SCR}/pagetext.json'))
pm    = json.load(open(f'{SCR}/pagemap.json'))
folio = lambda i: i + 2                       # interior index -> printed folio

starts = sorted((pm[f'c{n}'], n) for n in range(1, 30) if f'c{n}' in pm)
span   = {n: (p, (starts[k+1][0]-1) if k+1 < len(starts) else pm.get('bm:author', 195)-1)
          for k, (p, n) in enumerate(starts)}
LO, HI = pm['c1'], pm.get('bm:author', 195) - 1

def hits(term):
    t = term.lower(); out = {}
    for i, txt in enumerate(pages):
        f = folio(i)
        if LO <= f <= HI:
            c = txt.lower().count(t)
            if c: out[f] = c
    return out

def ranges(ps):
    out = []
    for p in sorted(ps):
        if out and p <= out[-1][1] + 1: out[-1][1] = p
        else: out.append([p, p])
    return [tuple(r) for r in out]

fmt = lambda r: f'{r[0]}' if r[0] == r[1] else f'{r[0]}&#8211;{r[1]}'

entries = []
for h in HEADWORDS:
    ch = OVERRIDE.get(h)
    probe = re.split(r',', re.sub(r'\s*\([^)]*\)', '', h))[0].strip()
    H = hits(probe) or (hits(probe.split()[-1]) if ' ' in probe else {})
    if ch is None:
        best, bw = None, 0
        for n, (a, b) in span.items():
            w = sum(c for f, c in H.items() if a <= f <= b)
            if w > bw: bw, best = w, n
        ch = best if bw >= 2 else None
    if ch:
        a, b = span[ch]
        others = sorted(f for f in H if not (a <= f <= b))
        txt = f'{h}, <strong>{a}&#8211;{b}</strong>'
        if others: txt += ', ' + ', '.join(fmt(r) for r in ranges(others)[:5])
    elif H:
        txt = h + ', ' + ', '.join(fmt(r) for r in ranges(H.keys())[:6])
    else:
        continue
    entries.append((h, txt))

out, cur = ['<!-- INDEX-BODY-START -->'], None
for h, txt in entries:
    L = h[0].upper(); L = '0&#8211;9' if L.isdigit() else L
    if L != cur: out.append(f'<h3>{L}</h3>'); cur = L
    out.append(f'<p>{txt}</p>')

s = open(BOOK).read()
i = s.find('<!-- INDEX-BODY-START -->')
j = s.find('</div>', s.find('<h2 class="fm">Index</h2>'))
open(BOOK, 'w').write(s[:i] + '\n'.join(out) + '\n' + s[j:])
print(f'index rebuilt: {len(entries)} entries from {len(pages)} pages')
