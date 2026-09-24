# KDP upload guide — The Promise: A Name to Grow Into

## Files

| File | Use |
|---|---|
| `the-promise-interior-8.5x8.5.pdf` | Paperback **interior** (manuscript file) |
| `the-promise-paperback-cover-wrap.pdf` | Paperback **cover** (full wrap: back + spine + front) |
| `the-promise-cover-ebook.jpg` | Kindle **ebook cover** (1600 × 2560) |

## Paperback setup (kdp.amazon.com → Create → Paperback)

- **Trim size:** 8.5 × 8.5 in
- **Bleed:** select **Bleed (PDF)** — the interior is sized 8.625 × 8.75 in with bleed
- **Paper:** premium color (the spine width in the wrap assumes premium color at 24 pages)
- **Pages:** 24 (KDP's minimum — half title, title, copyright, dedication, then ten
  text-and-art spreads)
- **Cover:** choose "Upload a cover you already have" and use the wrap PDF.
  The white box on the lower-right of the back cover is the barcode zone — KDP
  prints the ISBN barcode there.

## Kindle ebook

Use `the-promise-cover-ebook.jpg` as the cover. For the interior, KDP's Kindle
Kids' Book Creator (or Kindle Create) can import the ten art JPEGs from `../art/`
with the text laid over each page.

## Before you hit publish

- **Art resolution:** the illustrations are ~800–1,300 px wide, upscaled to fill
  an 8.5-inch page (~150 DPI effective). KDP will flag a print-quality warning;
  it will still print, but softer than ideal. For crisp print, re-export or
  upscale each image to ~2,400 px wide and rebuild.
- **Proof it:** order an author proof copy before going live — colors on cream
  stock read differently than on screen.
- The title page, copyright page, and back-cover blurb are editable in the
  build script if you want different wording.
