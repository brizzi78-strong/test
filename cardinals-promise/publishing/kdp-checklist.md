# KDP Publishing Checklist — The Caregiver's Cardinal Toolkit

The two files KDP asks for are in this folder:

| KDP upload slot | File | Spec |
|---|---|---|
| Manuscript (interior) | `kdp-interior.pdf` | 208 pages, 8.5 × 11 in, no bleed, mirrored margins (1.05" gutter / 0.55" outside), fonts embedded, page numbers + TOC + index match |
| Book cover | `kdp-cover-wrap.pdf` | One-piece wrap, 17.7382 × 11.25 in with 0.125" bleed; spine 0.4882" (208 pages × 0.002347", **premium color** paper — recompute if ink choice changes); 2" × 1.2" white barcode zone, lower-right of back cover, left blank for KDP |

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

- [ ] **Hope's read-through is done** (Chapters 17, 25, 2, 3, 27–28) — the credit page claims a PharmD review
- [ ] **Bio verified** — Certified Dementia Practitioner credential current
- [ ] **Final human proofread** of `kdp-interior.pdf` (read it as a printed proof, not on screen)
- [ ] **Back-cover copy approved** — edit `back-cover-copy.md` and ask for a wrap regen if you change anything
- [ ] **Cover wrap pending final art** — the WHITE/minimal design is now the approved direction (see the designer brief in `back-cover-copy.md`: full title, CDP credential, gold utility row, corrected subtitle). The wrap template in this folder is rebuilt in that style; it needs the designer's print-resolution cardinal art. Give the designer these exact dimensions in the same request: **full wrap 17.7382 × 11.25 in (0.125" bleed all around), spine 0.4882" centered, premium-color paper** — and generate the template from KDP's cover calculator to be safe.
- [ ] **Publisher imprint confirmed** — copyright page now says Cardinal Press (was Blue Ridge LLC); confirm which entity actually publishes

## At kdp.amazon.com (Bookshelf → Create → Paperback)

1. **Title:** The Caregiver's Cardinal Toolkit · **Subtitle:** A Hero's Guide to Caring for an Aging Parent
2. **Series:** Cardinal's Promise (optional but set it — the memoir joins it later)
3. **Author:** Rob Brizzi · **Contributor:** Hope Brizzi, PharmD — Consultant (optional)
4. **Description:** paste the ready HTML from `marketing/amazon-listing.md` (first 200 characters are the visible hook; no URLs allowed)
5. **ISBN:** use your own — **978-1-963342-03-1** (paperback, Bowker block slot 03; already on the copyright page). At KDP choose "Use my own ISBN" and enter it with imprint **Cardinal Press** — the imprint must match your Bowker registration, so confirm the block is registered to you/Cardinal Press at myidentifiers.com. **978-1-963342-04-8** is reserved for the audiobook edition. The `-02-7` printed on the earlier cover design was a miscomputed check digit — never print it; the cover must show 978-1-963342-03-1
6. **AI content question** (on the **Content** tab): KDP distinguishes **AI-generated** content (created by AI, even if you edited it — must disclose, with extent follow-ups) from **AI-assisted** (AI helped refine your own work — no disclosure required). Answer accurately per your records; the disclosure goes to Amazon only and is not shown publicly
7. **Categories** (verified storefront nodes — see `marketing/amazon-listing.md`): Parenting & Relationships → Aging Parents; Health, Fitness & Dieting → Aging; Medical Books → Medicine → Hospice Care
8. **Keywords (7 slots — final list in `marketing/amazon-listing.md`):** elder care planning workbook for families · sandwich generation help for adult children · hospital discharge planning for seniors · medicare medicaid long term care costs · end of life decisions and comfort care · dementia memory loss what to do next · power of attorney advance directive checklist
9. **Print options:** Black & white interior *(cheaper — but this book's color coding is its identity: choose* **premium color** *and check the printing cost against your target list price)*, white paper, 8.5 × 11, matte cover (matches the art), no bleed
10. **Pricing:** after choosing color option, KDP shows printing cost; royalty is **50% or 60% of list minus printing depending on list price** (60% above ~$9.99 US — a premium-color book will be well above it). Note: high-ink-coverage color interiors can be ineligible for Expanded Distribution; the IngramSpark route below covers bookstores anyway
11. **Order printed proofs** (Bookshelf → ⋯ → Request Printed Proofs, up to 5; watermarked "Not for Resale", you pay print cost + shipping) — for a color book order two: one to check matte/color fidelity, one to mark up. Check spine alignment and gutter comfort in hand

## After the paperback is live

- [ ] Copyright registration at copyright.gov (the application asks its own AI-generated-content question — same honest answer as KDP's)
- [ ] Ebook edition (EPUB) — say the word and I'll build it from the same HTML
- [ ] IngramSpark for bookstore/library distribution (needs your own ISBN)
- [ ] Update thecardinalspromise.com with the buy link
