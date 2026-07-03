# tools/

Build scripts for the site's generated assets. All are pure-Python (reportlab +
Pillow, no system libraries) so they run anywhere:

```bash
python3 -m pip install --user reportlab pillow
python3 tools/build_pdfs.py     # → assets/pdf/*.pdf   (Letter + A4)
python3 tools/build_og.py       # → assets/og/*.png    + assets/img/cardinal-medallion.svg
python3 tools/inject_seo.py     # → SEO/social meta in every page + sitemap.xml + robots.txt
```

`brand.py` holds the shared palette and the stylized cardinal (drawn for both the
PNG cards and the on-page SVG medallion), so the PDFs, social cards, and site all
match.

## build_pdfs.py — downloadable PDF guides
Branded, cover-paged PDFs for each lead magnet, in **US Letter** and **A4**
(`-a4.pdf`). Content lives in the `MAGNETS` list; edit and re-run. These are the
"deepened" canonical version of the printable pages under `free-guide/`.

## build_og.py — social-share cards + medallion
1200×630 Open Graph / Twitter cards (`assets/og/*.png`) matching the PDF covers,
plus the shared `assets/img/cardinal-medallion.svg` used in the page heroes and
the delivery page. Edit copy in `CARDS` and re-run.

## inject_seo.py — meta, sitemap, robots
Idempotently injects canonical + Open Graph + Twitter tags (and JSON-LD on the
home and book pages) into every `*.html`, between `seo:meta` markers, and
regenerates `sitemap.xml` + `robots.txt`. Safe to re-run after adding pages or
editing titles/descriptions.

> **Before deploying:** set `BASE` in `inject_seo.py` (and re-run it), and the
> `tag` domain in `build_og.py`, to the real production domain. Open Graph image
> URLs must be absolute, so the domain must be correct for social previews to work.
