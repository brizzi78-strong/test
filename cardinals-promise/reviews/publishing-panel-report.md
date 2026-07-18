# Publishing Panel Report — *The Caregiver's Cardinal Toolkit*

Four expert seats reviewed the complete publishing kit (print interior, cover
wrap, EPUB, marketing package, KDP checklist) against KDP's current published
specifications. A fifth seat (cover design) is deferred until the designer's
print-resolution navy art arrives.

## Verdicts

| Seat | Verdict | Headline finding |
|---|---|---|
| **Print production** | Ready-with-fixes | Folios sat 0.229" from the bottom trim — inside KDP's 0.25" no-print zone, flagged on every page. **Fixed:** raised to 0.354". |
| **KDP process audit** | Accurate-with-one-error | Spine computed with the B&W paper multiplier; premium color paper is thicker (0.002347"/page). **Fixed:** spine 0.4178", wrap 17.6678 × 11.25". |
| **EPUB QA** | Ready-with-fixes | Kindle drops CSS custom properties — takeaway boxes and chapter color bars rendered **white-on-white in all 29 chapters**. **Fixed:** literal color fallbacks. |
| **Marketing** | Ready-with-fixes | Back cover undersold the book; 4 of 7 keywords wasted; one category was a BISAC code, not an Amazon node. **Fixed:** all applied. |

## Everything applied in this pass

**Print interior (`kdp-interior.pdf`):**
- Folio baseline raised from 0.229" to 0.354" from bottom trim (KDP min 0.25")
- Verified correct by the panel: 178 pages at exactly 8.5×11, mirrored margins
  1.05"/0.55" (min 0.5"/0.25"), all 25 fonts subset-embedded, folios centered
  and matching physical pages, genuine color content throughout

**Cover wrap (`kdp-cover-wrap.pdf`):**
- Rebuilt at premium-color geometry: 17.6678 × 11.25 in, spine 0.4178"
  (if ink choice changes to standard color, spine reverts to 0.4009" — recompute)
- Barcode zone moved to exactly 0.25" from the trim corner; placeholder text
  removed (KDP prints its own barcode there)
- Spine text clearance verified (~0.10" vs 0.0625" required; 178pp clears the
  79-page minimum for spine text)

**EPUB (`cardinals-toolkit.epub`):**
- Literal per-color CSS fallbacks for every var()-styled element (Kindle)
- 479 CSS-drawn checkboxes replaced with real ☐ characters
- Ebook copyright page drops the paperback ISBN placeholder; "tear this page
  out" reworded for screens; two-column checklists single-column; fill-in
  blanks shortened; cover upscaled to 1600px (Apple's 1400px floor);
  publisher metadata corrected to Cardinal Press; accessibility metadata added

**Marketing:**
- Back cover: sharper hook, color-system-first body, outcome bullets, bio
  leads with Certified Dementia Practitioner ("recovery advocate" cut)
- New `marketing/amazon-listing.md`: KDP-ready HTML description, verified
  category trio (Parenting & Relationships → Aging Parents; Health, Fitness &
  Dieting → Aging; Medical Books → Hospice Care), 7 zero-waste long-tail keywords
- Query letter: one line reconciling the "hero" subtitle with Chapter 4

**Checklist corrections:**
- AI question precision: KDP asks about **AI-generated** content (disclose)
  vs **AI-assisted** (no disclosure), on the Content tab
- Royalty rule current as of June 2025: 50%/60% by list price (this book will
  be in 60% territory)
- Expanded Distribution caveat: high-ink-coverage color interiors can be
  ineligible — IngramSpark route covers bookstores
- Proof ordering specifics (up to 5, watermarked, order two for a color book)

## Still open (author/designer)

1. **High-res navy front art** — the shared preview is ~160 DPI at print size;
   KDP wants 300. Designer gets the exact wrap dimensions above.
2. **The fabricated ISBN (978-1-963342-02-7) must come off the cover art** —
   fails the ISBN-13 checksum; unsellable if printed.
3. **Ink choice locks the spine** — premium vs standard color changes wrap
   width; decide before the designer builds the final wrap.
4. Hope's chapter read-through; bio verification; physical proof order.
5. Cosmetic notes: fonts render as Liberation/DejaVu substitutes for
  Georgia/Helvetica (embedded and print-fine; specify exact faces at a
  design pass if it matters); folio prints on the interior title page
  (unusual for trade, not a defect).
