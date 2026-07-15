# KDP Publishing Checklist — It's Not Your Fault

The two files KDP asks for are in this folder:

| KDP upload slot | File | Spec |
|---|---|---|
| Manuscript (interior) | `kdp-interior.pdf` | **229 pages** (228 interior after dropping the cover page; already even), 8.5 × 11 in, no bleed, mirrored margins (1.05" gutter / 0.55" outside), fonts embedded, page numbers + TOC + index match. **Needs re-export** — the master grew to 229pp (expanded Contents + new sections and Cardinal Moment reflections, July 2026) |
| Book cover | `kdp-cover-wrap.pdf` | One-piece wrap, **17.7851 × 11.25 in** with 0.125" bleed; **spine 0.5351"** (228 pages × 0.002347", **premium color** paper — recompute if ink choice changes); 2" × 1.2" white barcode zone, lower-right of back cover, left blank for KDP. **Needs re-export** at the new spine |

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
- [ ] **Bio verified** — Certified Dementia Practitioner credential current
- [ ] **Final human proofread** of `kdp-interior.pdf` (read it as a printed proof, not on screen)
- [ ] **Back-cover copy approved** — edit `back-cover-copy.md` and ask for a wrap regen if you change anything
- [ ] **Cover wrap pending print-resolution art** — the finished **cream** *It's Not Your Fault* design is adopted (see the design brief in `back-cover-copy.md`). The wrap template in this folder is rebuilt in that cream style. The delivered cover image (`cover-its-not-your-fault.jpeg`) is a ~155 DPI mockup, **not print-ready** — the designer must supply the front art at print resolution. Give the designer these exact dimensions: **full wrap 17.7851 × 11.25 in (0.125" bleed all around), spine 0.5351" centered (228pp, premium-color paper)** — and generate the template from KDP's cover calculator to be safe.
- [ ] **Publisher imprint confirmed** — copyright page now says Cardinal Promise Press (was Blue Ridge LLC); confirm which entity actually publishes

## At kdp.amazon.com (Bookshelf → Create → Paperback)

1. **Title:** It's Not Your Fault · **Subtitle:** A Practical Guide for Families Caring for an Aging Parent
2. **Series:** Cardinal's Promise (optional but set it — the memoir joins it later)
3. **Author:** Rob Brizzi (no contributor line needed — Hope retains "Project Consultant" credit on title page and back cover but did not complete pharmaceutical review)
4. **Description:** paste the ready HTML from `marketing/amazon-listing.md` (first 200 characters are the visible hook; no URLs allowed)
5. **ISBN:** use your own — **978-1-963342-03-1** (paperback, Bowker block slot 03; already on the copyright page). At KDP choose "Use my own ISBN" and enter it with imprint **Cardinal Promise Press** — the imprint must match your Bowker registration, so confirm the block is registered to you/Cardinal Promise Press at myidentifiers.com. **978-1-963342-04-8** is reserved for the audiobook edition. The `-02-7` printed on the earlier cover design was a miscomputed check digit — never print it; the cover must show 978-1-963342-03-1
6. **AI content question** (on the **Content** tab): KDP distinguishes **AI-generated** content (created by AI, even if you edited it — must disclose, with extent follow-ups) from **AI-assisted** (AI helped refine your own work — no disclosure required). Answer accurately per your records; the disclosure goes to Amazon only and is not shown publicly
7. **Categories** (verified storefront nodes — see `marketing/amazon-listing.md`): Parenting & Relationships → Aging Parents; Health, Fitness & Dieting → Aging; Medical Books → Medicine → Hospice Care
8. **Keywords (7 slots — final list in `marketing/amazon-listing.md`):** elder care planning workbook for families · sandwich generation help for adult children · hospital discharge planning for seniors · medicare medicaid long term care costs · end of life decisions and comfort care · dementia memory loss what to do next · power of attorney advance directive checklist
9. **Print options:** Black & white interior *(cheaper — but this book's color coding is its identity: choose* **premium color** *and check the printing cost against your target list price)*, white paper, 8.5 × 11, matte cover (matches the art), no bleed
10. **Pricing:** after choosing color option, KDP shows printing cost; royalty is **50% or 60% of list minus printing depending on list price** (60% above ~$9.99 US — a premium-color book will be well above it). Note: high-ink-coverage color interiors can be ineligible for Expanded Distribution; the IngramSpark route below covers bookstores anyway
11. **Order printed proofs** (Bookshelf → ⋯ → Request Printed Proofs, up to 5; watermarked "Not for Resale", you pay print cost + shipping) — for a color book order two: one to check matte/color fidelity, one to mark up. Check spine alignment and gutter comfort in hand

## After the paperback is live

- [ ] Copyright registration at copyright.gov (the application asks its own AI-generated-content question — same honest answer as KDP's)
- [ ] Ebook edition (EPUB) — **needs a full rebuild:** the existing `cardinals-toolkit.epub` still carries the OLD title (*The Caregiver's Cardinal Toolkit*), the old cover, and none of the July 2026 content (expanded Contents, new sections, Cardinal Moments). Rebuild from the current HTML when ready — say the word.
- [ ] Audiobook / text-to-speech — a narration-ready script is prepared at `publishing/its-not-your-fault-AUDIO.txt` (~52k words, ~5.8 hrs at 150 wpm). Worksheets, tables, the index, checkbox glyphs, and page references are stripped or summarized; 30-second boxes, Rob's Notes, and Cardinal Moments are announced by name. Drop it into Speechify (or any TTS/narration workflow); the reserved audiobook ISBN is 978-1-963342-04-8.
- [ ] IngramSpark for bookstore/library distribution (needs your own ISBN)
- [ ] Update thecardinalspromise.com with the buy link
