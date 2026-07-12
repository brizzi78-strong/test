# KDP Publishing Checklist — The Caregiver's Cardinal Toolkit

The two files KDP asks for are in this folder:

| KDP upload slot | File | Spec |
|---|---|---|
| Manuscript (interior) | `kdp-interior.pdf` | 178 pages, 8.5 × 11 in, no bleed, mirrored margins (1.05" gutter / 0.55" outside), fonts embedded, page numbers + TOC + index match |
| Book cover | `kdp-cover-wrap.pdf` | One-piece wrap, 17.6678 × 11.25 in with 0.125" bleed; spine 0.4178" (178 pages × 0.002347", **premium color** paper — recompute if ink choice changes); 2" × 1.2" white barcode zone, lower-right of back cover, left blank for KDP |

## Before you upload

- [ ] **Hope's read-through is done** (Chapters 17, 25, 2, 3, 27–28) — the credit page claims a PharmD review
- [ ] **Bio verified** — Certified Dementia Practitioner credential current
- [ ] **Final human proofread** of `kdp-interior.pdf` (read it as a printed proof, not on screen)
- [ ] **Back-cover copy approved** — edit `back-cover-copy.md` and ask for a wrap regen if you change anything
- [ ] **Cover wrap regeneration pending** — the new navy design was adopted, but the wrap PDF still needs the designer's print-resolution front art (the shared preview is ~90dpi at wrap size; KDP needs 300dpi). Give the designer these exact dimensions in the same request: **full wrap 17.6678 × 11.25 in (0.125" bleed all around), spine 0.4178" centered, premium-color paper** — and generate the template from KDP's cover calculator to be safe.
- [ ] **Publisher imprint confirmed** — copyright page now says Cardinal Press (was Blue Ridge LLC); confirm which entity actually publishes

## At kdp.amazon.com (Bookshelf → Create → Paperback)

1. **Title:** The Caregiver's Cardinal Toolkit · **Subtitle:** A Hero's Guide to Caring for an Aging Parent
2. **Series:** Cardinal's Promise (optional but set it — the memoir joins it later)
3. **Author:** Rob Brizzi · **Contributor:** Hope Brizzi, PharmD — Consultant (optional)
4. **Description:** paste the ready HTML from `marketing/amazon-listing.md` (first 200 characters are the visible hook; no URLs allowed)
5. **ISBN — IMPORTANT:** the designed cover shows ISBN 978-1-963342-02-7, which is **invalid** (fails the ISBN-13 checksum) and must not be printed. Real options: take KDP's free ISBN (fastest), or use your own from Bowker if you want to own the record across printers (required if you later add IngramSpark). Either way, put the assigned number on the copyright page — the master HTML has an `ISBN: [to be assigned]` slot — and tell me: I'll set it and regenerate the interior
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
