#!/usr/bin/env python3
"""Build a reflowable EPUB 3 from the master book HTML.
- splits on the <!-- ============ NAME ============ --> section markers
- drops print furniture: cover div (replaced by a proper cover page),
  the page-number Index, TOC dotted leaders and page numbers
- Contents entries become links; nav.xhtml mirrors them
- every content file is serialized as well-formed XHTML via lxml
"""
import re, uuid, zipfile, os
from lxml import html as LH, etree

SRC = '/home/user/test/cardinals-promise/book/cardinals-toolkit-book.html'
OUT = '/home/user/test/cardinals-promise/publishing/its-not-your-fault.epub'
COVER = '/home/user/test/cardinals-promise/assets/book-cover.jpeg'

doc = open(SRC).read()
body = re.search(r'<body>(.*)</body>', doc, re.S).group(1)

# ---- split on section markers ----
parts = re.split(r'<!-- =+ ([A-Z0-9 \']+?) =+ -->', body)
# parts: [pre, NAME, chunk, NAME, chunk, ...]
chunks = {}
order = []
for i in range(1, len(parts), 2):
    name = parts[i].strip()
    if name.startswith('PART'):
        continue  # marker only; its chunk is empty (next marker follows)
    chunks[name] = parts[i + 1]
    order.append(name)

FILEMAP = [
    # (marker, filename, toc title or None)
    ('TITLE PAGE', 'titlepage', None),
    ('EPIGRAPH', 'epigraph', None),
    ('HOW TO READ THE COLORS', 'colors', 'How to Read the Colors'),
    ('CONTENTS', 'contents', 'Contents'),
    ('COPYRIGHT', 'copyright', None),
    ("AUTHOR'S NOTE", 'authors-note', 'Why I Wrote This Toolkit'),
    ('YOU ARE NOT ALONE', 'notalone', 'You Are Not Alone'),
    ('BEFORE YOU BEGIN', 'before', 'Before You Begin: Aging Whispers Before It Shouts'),
    ('HOW TO USE', 'howto', 'How to Use This Handbook'),
    ('START HERE', 'start', 'Start Here: What Are You Facing?'),
    ('FIND YOUR SITUATION', 'situations', 'Find Your Situation: Five Pathways'),
    ('FUTURE PLANNERS', 'future', 'For the Future Planners'),
] + [(f'CHAPTER {n}', f'ch{n:02d}', None) for n in range(1, 30)] + [
    ('ABOUT THE AUTHORS', 'about', 'About the Author'),
    ('YOUR STATE GUIDE', 'state', 'Your State Guide'),
    ('NUMBERS THAT MATTER', 'numbers', 'Numbers That Matter'),
    ('BACK PAGE', 'backpage', None),
]
assert all(m in chunks for m, _, _ in FILEMAP), [m for m, _, _ in FILEMAP if m not in chunks]

# chapter titles for nav
ch_titles = {}
for m in re.finditer(r'<h1><span class="chapnum">Chapter (\d+)</span>(.*?)</h1>', doc):
    ch_titles[int(m.group(1))] = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', m.group(2))).strip()

# ---- transform the Contents chunk: strip leaders/page numbers, add links ----
toc_href = {}
for mkr, fn, title in FILEMAP:
    mm = re.match(r'CHAPTER (\d+)', mkr)
    if mm:
        n = int(mm.group(1))
        toc_href[f'Chapter {n}: {ch_titles[n]}'] = fn
    elif title and mkr != 'CONTENTS':
        toc_href[title] = fn
toc_href['Start Here: What Are You Facing? — The First 24–72 Hours'] = 'start'

contents = chunks['CONTENTS']
contents = re.sub(r'<span class="lead"></span>', '', contents)
contents = re.sub(r'<span class="tocpg"[^>]*>[^<]*</span>', '', contents)
contents = re.sub(r'\s*<li>Index</li>', '', contents)  # no page-number index in the ebook

def linkify(m):
    inner = m.group(1)
    vis = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', inner)).strip()
    fn = toc_href.get(vis)
    if not fn:  # e.g. dotted front entries with variant dashes
        for k, v in toc_href.items():
            if vis.startswith(k[:24]):
                fn = v; break
    if not fn:
        return m.group(0)
    return f'<li><a href="{fn}.xhtml">{inner}</a></li>'

contents = re.sub(r'<li>(.*?)</li>', linkify, contents)
chunks['CONTENTS'] = contents

# ---- css: adapt the print stylesheet ----
css = re.search(r'<style>(.*?)</style>', doc, re.S).group(1)
css = re.sub(r'@page[^}]*}', '', css)
css = css.replace('max-width: 6.9in; margin: 0 auto; padding: 0.4in 0.25in 1in;',
                  'margin: 0; padding: 0 4%;')
css = re.sub(r'\.coverpage[^}]*}', '', css)
css = css.replace('columns: 2; column-gap: 22px;', '')
css = css.replace('min-width: 2.2in;', 'min-width: 6em;')
css += """
  .toc a { text-decoration: none; color: inherit; }
  img.cover { width: 100%; height: auto; }
  .cb { margin-right: 0.4em; }
  /* literal-color fallbacks: Kindle drops var() declarations */
  section.red .colorbar, section.red .takeaway { background: #a51c30; }
  section.yellow .colorbar, section.yellow .takeaway { background: #6b21a8; }
  section.blue .colorbar, section.blue .takeaway { background: #1d4e89; }
  section.red .plain, section.red .week { background: #f7dfe2; border-left-color: #a51c30; }
  section.yellow .plain, section.yellow .week { background: #f3e8ff; border-left-color: #6b21a8; }
  section.blue .plain, section.blue .week { background: #eaf1f8; border-left-color: #1d4e89; }
  section.red .worksheet { border-color: #a51c30; }
  section.yellow .worksheet { border-color: #6b21a8; }
  section.blue .worksheet { border-color: #1d4e89; }
  .alert { background: #f7dfe2; border-left-color: #a51c30; }
"""

XHTML = """<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en" xml:lang="en">
<head><title>{title}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>{body}</body>
</html>"""

VOIDS = {'br', 'hr', 'img', 'meta', 'link', 'input', 'area', 'base', 'col', 'embed',
         'source', 'track', 'wbr'}

def ebook_tweaks(fragment):
    fragment = fragment.replace('<span class="cbox"></span>', '<span class="cb">\u2610</span>')
    fragment = fragment.replace('<p>ISBN: [to be assigned] (paperback)</p>',
        '<p>A paperback edition of this book is also available.</p>')
    fragment = fragment.replace(
        'Tear this page out, photograph it, or tape a copy to the refrigerator. Phone numbers change',
        'Screenshot this page or bookmark it. Phone numbers change')
    return fragment

def to_xhtml(fragment):
    fragment = ebook_tweaks(fragment)
    tree = LH.fragment_fromstring(fragment, create_parent='div')
    out = etree.tostring(tree, method='xml', encoding='unicode')
    # expand self-closed non-void elements (<span .../> -> <span ...></span>)
    def expand(m):
        tag, attrs = m.group(1), m.group(2)
        if tag.lower() in VOIDS:
            return m.group(0)
        return f'<{tag}{attrs}></{tag}>'
    return re.sub(r'<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^<>]*?)?)\s*/>', expand, out)

files = {}
nav_items = []
for mkr, fn, title in FILEMAP:
    mm = re.match(r'CHAPTER (\d+)', mkr)
    disp = f'Chapter {int(mm.group(1))}: {ch_titles[int(mm.group(1))]}' if mm else (title or mkr.title())
    files[f'{fn}.xhtml'] = XHTML.format(title=disp, body=to_xhtml(chunks[mkr]))
    if mm or title:
        nav_items.append((fn, disp))

files['cover.xhtml'] = XHTML.format(
    title='Cover', body='<div style="text-align:center"><img class="cover" src="images/cover.jpg" alt="It\'s Not Your Fault — book cover"/></div>')

nav_lis = '\n'.join(f'<li><a href="{fn}.xhtml">{t}</a></li>' for fn, t in nav_items)
files['nav.xhtml'] = f"""<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en" xml:lang="en">
<head><title>Contents</title></head>
<body>
<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>
<li><a href="cover.xhtml">Cover</a></li>
<li><a href="titlepage.xhtml">Title Page</a></li>
{nav_lis}
</ol></nav>
<nav epub:type="landmarks" hidden=""><ol>
<li><a epub:type="cover" href="cover.xhtml">Cover</a></li>
<li><a epub:type="toc" href="contents.xhtml">Table of Contents</a></li>
<li><a epub:type="bodymatter" href="start.xhtml">Start Here</a></li>
</ol></nav>
</body></html>"""

spine_files = ['cover.xhtml'] + [f'{fn}.xhtml' for fn, _, __ in
               [(f, None, None) for _, f, _ in FILEMAP]]
manifest_items = ['<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
                  '<item id="coverimg" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>',
                  '<item id="css" href="style.css" media-type="text/css"/>']
spine_refs = []
for f in spine_files:
    fid = f.replace('.xhtml', '')
    manifest_items.append(f'<item id="{fid}" href="{f}" media-type="application/xhtml+xml"/>')
    spine_refs.append(f'<itemref idref="{fid}"/>')

BOOK_ID = 'urn:uuid:8c9f4a72-3b1d-4e06-9d2a-5f7c81e40b23'
opf = f"""<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="en">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="bookid">{BOOK_ID}</dc:identifier>
<dc:title>It's Not Your Fault: A Practical Guide for Families Caring for an Aging Parent</dc:title>
<dc:creator id="author">Rob Brizzi</dc:creator>
<dc:contributor id="consultant">Hope Brizzi</dc:contributor>
<dc:language>en</dc:language>
<dc:publisher>Cardinal Promise Press</dc:publisher>
<dc:date>2026-07-17</dc:date>
<meta property="dcterms:modified">2026-07-17T00:00:00Z</meta>
<meta name="cover" content="coverimg"/>
<meta property="schema:accessMode">textual</meta>
<meta property="schema:accessMode">visual</meta>
<meta property="schema:accessModeSufficient">textual</meta>
<meta property="schema:accessibilityFeature">tableOfContents</meta>
<meta property="schema:accessibilityFeature">readingOrder</meta>
<meta property="schema:accessibilityHazard">none</meta>
<meta property="schema:accessibilitySummary">Reflowable text with a linked table of contents; color coding is always accompanied by text labels.</meta>
</metadata>
<manifest>
{chr(10).join(manifest_items)}
</manifest>
<spine>
{chr(10).join(spine_refs)}
</spine>
</package>"""

container = """<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>"""

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with zipfile.ZipFile(OUT, 'w') as z:
    z.writestr('mimetype', 'application/epub+zip', compress_type=zipfile.ZIP_STORED)
    z.writestr('META-INF/container.xml', container, compress_type=zipfile.ZIP_DEFLATED)
    z.writestr('OEBPS/content.opf', opf, compress_type=zipfile.ZIP_DEFLATED)
    z.writestr('OEBPS/style.css', css, compress_type=zipfile.ZIP_DEFLATED)
    from PIL import Image
    import io
    im = Image.open(COVER)
    if im.width < 1600:
        im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'JPEG', quality=90)
    z.writestr('OEBPS/images/cover.jpg', buf.getvalue(), compress_type=zipfile.ZIP_DEFLATED)
    for name, content in files.items():
        z.writestr(f'OEBPS/{name}', content, compress_type=zipfile.ZIP_DEFLATED)

print('epub written:', OUT, os.path.getsize(OUT), 'bytes,', len(files), 'xhtml files')

# ---- self-check: every xhtml parses as XML ----
for name, content in files.items():
    etree.fromstring(content.encode())
etree.fromstring(opf.encode())
print('all xhtml + opf parse as well-formed XML')
