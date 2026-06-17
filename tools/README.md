# tools/

## build_pdfs.py — branded PDF lead magnets

Generates the downloadable PDFs in `assets/pdf/` from the content defined inside
the script. Pure-Python (no system libraries), so it runs anywhere:

```bash
python3 -m pip install --user reportlab
python3 tools/build_pdfs.py
```

Each PDF has a branded cover page (cardinal mark + title) and formatted content
with checkboxes, fill-in lines, and a closing quote. To edit a guide, change its
entry in the `MAGNETS` list and re-run; commit the regenerated `assets/pdf/*.pdf`.

The PDFs are the "deepened" canonical version of the printable web guides under
`free-guide/`. Keep the two roughly in sync when you edit content.
