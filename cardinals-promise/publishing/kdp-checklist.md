# KDP Publishing Checklist — It's Not Your Fault

The two files KDP asks for are in this folder:

| KDP upload slot | File | Spec |
|---|---|---|
| Manuscript (interior) | `kdp-interior.pdf` | **227 pages** master (226 content after dropping the cover page; already even), 8.5 × 11 in, no bleed, mirrored margins (1.05" gutter / 0.55" outside), fonts embedded, page numbers + TOC + index match. **Needs re-export** (July 2026) |
| Book cover | **`kdp-cover-wrap-print.pdf`** (upload this) | One-piece wrap, **exactly 17.7804 × 11.25 in** with 0.125" bleed; **spine 0.5304"** (226 pages × 0.002347", **premium color** paper — recompute if ink choice changes); 2" × 1.2" white barcode zone, lower-right of back cover, left blank for KDP. Flattened single page at 300 DPI (5334 × 3375 px) so KDP reads the size exactly. The editable vector version is `kdp-cover-wrap.pdf` (Chromium renders it 17.7767" wide — 0.0037" narrow, within tolerance but not exact; prefer the flattened `-print` file for upload). |
| Front cover only (Cover Creator path) | `front-cover-print.pdf` / `front-cover-print.jpeg` | If you use KDP's Cover Creator "upload your own front cover," use this: front trim 8.5 × 11 + 0.125" bleed all sides = **8.75 × 11.25 in**, 300 DPI (2625 × 3375 px). KDP adds the spine + back itself. |

## Before you upload
- [x] **RESOLVED (July 2026): dividers stay.** Beta panel voted keep-as-is 5-0; full results in `reviews/beta-panel-report.md`. Original question: **the five part-divider (Rob's call, July 2026): the five part-divider
  art pages** (before Chapters 1, 6, 13, 19, 27 — gold line art + cardinal,
  vector). Rob decided to "let the readers decide": ask Hope and early
  readers whether the dividers stay, go, or get replaced by commissioned
  art in the same five slots. The beta round is set up in
  `marketing/beta-reader-kit.md` — live feedback form:
  https://form.jotform.com/261936560720054 Removing them later = delete the five
  `.divider` blocks + trailing blank, then rebuild (page count and spine
  change back).

- [x] **SKIPPED (July 2026): Hope's pharmaceutical review not completed** — shipping without the full chapter read-through. Removed PharmD clinical-review attribution from copyright page; Hope retains "Project Consultant" credit for her role in the book's inception.
- [x] **Author photo placed (July 2026)** — professional navy-suit headshot (`author-headshot.jpeg`, 1023×1537 ≈ 890 DPI at the 1.15in slot) embedded in the back-cover wrap photo slot and the About the Author page.
- [x] **Printed page numbers added (July 2026)** — the interior now carries typeset folios, bottom-center, muted gray. Folio = sheet number (the cover is sheet 1 and is left unnumbered), so every folio matches the Contents by construction (e.g., Chapter 1 = 36). Applied as a PDF post-process (Chromium can't typeset CSS margin-box counters): render the book HTML, then stamp `pageIndex+1` on every page except the cover with pdf-lib. Re-run this step whenever the interior is re-exported.
- [ ] **Bio verified** — Certified Dementia Practitioner credential current
- [ ] **Final human proofread** of `kdp-interior.pdf` (read it as a printed proof, not on screen)
- [ ] **Back-cover copy approved** — edit `back-cover-copy.md` and ask for a wrap regen if you change anything
- [x] **Standard-spec cover built + flattened (July 2026)** — the wrap's front panel now carries the adopted crossout cream design (red cardinal, *IT'S ~~ALL~~ YOUR FAULT* with "Not" above, blue "From the Author of The Cardinal's Promise"), matching the standalone front. Two upload-ready files exist: `kdp-cover-wrap-print.pdf` (full wrap, exactly 17.7804 × 11.25 in, flattened) and `front-cover-print.pdf/.jpeg` (front-only, 8.75 × 11.25 in) for the Cover Creator path. Both are single-page, 300 DPI, dimension-exact.
      - ⚠️ **"Too big" on KDP = a spine/page-count mismatch, not file weight.** The cover width is computed from the interior page count (spine = pages × 0.002347"). This cover is sized for a **226-page** interior (spine 0.5304"). **`kdp-interior.pdf` in this folder is a stale 216-page export** — if you upload that interior with this cover, KDP expects a narrower cover and flags yours as too big. Fix: **re-export the interior from the current 227-page master HTML** (drop the cover page → 226 content pages, add folios) so the interior and cover agree, then upload both. Say the word and I'll re-export it.
      - The one remaining print-quality limiter is the **front cardinal art** (`cardinal-art.png`, 884 × 445 px) — it prints fine on screen/proof but is below true 300 DPI at cover scale. For a crisp final, supply that one element at higher resolution and re-run the build; everything else (type, frame, layout) is already vector-clean at 300 DPI.
- [ ] **Publisher imprint confirmed** — copyright page now says Cardinal Promise Press (was Blue Ridge LLC); confirm which entity actually publishes

## At kdp.amazon.com (Bookshelf → Create → Paperback)

1. **Title:** It's Not Your Fault · **Subtitle:** A Practical Guide for Families Caring for an Aging Parent
2. **Series:** Cardinal's Promise (optional but set it — the memoir joins it later)
3. **Author:** Rob Brizzi (no contributor line needed — Hope retains "Project Consultant" credit on title page and back cover but did not complete pharmaceutical review)
4. **Description:** paste the ready HTML from `marketing/amazon-listing.md` (first 200 characters are the visible hook; no URLs allowed)
5. **ISBN:** use your own — **979-8-9966446-0-5** (paperback), the first number from Rob's real Bowker block (registrant **9966446**, verified checksum-valid; already on the copyright page). At KDP choose "Use my own ISBN" and enter it with imprint **Cardinal Promise Press** — the imprint must match your Bowker registration, so confirm the block is registered to you/Cardinal Promise Press at myidentifiers.com. Assign one number per format: **979-8-9966446-2-9** for the audiobook, the next unused numbers for ebook/hardcover. (Earlier 978-1-963342-xx-x numbers were placeholders — never print them.)
6. **AI content question** (on the **Content** tab): KDP distinguishes **AI-generated** content (created by AI, even if you edited it — must disclose, with extent follow-ups) from **AI-assisted** (AI helped refine your own work — no disclosure required). Answer accurately per your records; the disclosure goes to Amazon only and is not shown publicly
7. **Categories** (verified storefront nodes — see `marketing/amazon-listing.md`): Parenting & Relationships → Aging Parents; Health, Fitness & Dieting → Aging; Medical Books → Medicine → Hospice Care
8. **Keywords (7 slots — final list in `marketing/amazon-listing.md`):** elder care planning workbook for families · sandwich generation help for adult children · hospital discharge planning for seniors · medicare medicaid long term care costs · end of life decisions and comfort care · dementia memory loss what to do next · power of attorney advance directive checklist
9. **Print options:** Black & white interior *(cheaper — but this book's color coding is its identity: choose* **premium color** *and check the printing cost against your target list price)*, white paper, 8.5 × 11, matte cover (matches the art), no bleed
10. **Pricing:** after choosing color option, KDP shows printing cost; royalty is **50% or 60% of list minus printing depending on list price** (60% above ~$9.99 US — a premium-color book will be well above it). Note: high-ink-coverage color interiors can be ineligible for Expanded Distribution; the IngramSpark route below covers bookstores anyway
11. **Order printed proofs** (Bookshelf → ⋯ → Request Printed Proofs, up to 5; watermarked "Not for Resale", you pay print cost + shipping) — for a color book order two: one to check matte/color fidelity, one to mark up. Check spine alignment and gutter comfort in hand

## After the paperback is live

- [ ] Copyright registration at copyright.gov (the application asks its own AI-generated-content question — same honest answer as KDP's)
- [ ] Ebook edition (EPUB) — **needs a full rebuild:** the existing `cardinals-toolkit.epub` still carries the OLD title (*The Caregiver's Cardinal Toolkit*), the old cover, and none of the July 2026 content (expanded Contents, new sections, Cardinal Moments). Rebuild from the current HTML when ready — say the word.
- [ ] Audiobook / text-to-speech — a narration-ready script is prepared at `publishing/its-not-your-fault-AUDIO.txt` (~52k words, ~5.8 hrs at 150 wpm). Worksheets, tables, the index, checkbox glyphs, and page references are stripped or summarized; 30-second boxes, Rob's Notes, and Cardinal Moments are announced by name. Drop it into Speechify (or any TTS/narration workflow); the reserved audiobook ISBN is 979-8-9966446-2-9.
- [ ] IngramSpark for bookstore/library distribution (needs your own ISBN)
- [ ] Update thecardinalspromise.com with the buy link
