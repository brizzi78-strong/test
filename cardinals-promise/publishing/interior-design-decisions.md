# Interior Design Decisions — It's Not Your Fault

> Decisions Rob settled in design discussions, August 2026. Recorded here
> so the interior designer and the cover spec stay consistent. The urgency
> color system itself lives in `../manuscript/color-map.md`.

## Color rules (decided)

- The three urgency colors are load-bearing, never decorative:
  - Red `#a51c30` — Act Today
  - Purple `#9333ea` — Watch Closely
  - Blue `#1d4e89` — Plan Ahead
- **No red pages as decoration.** A red page means "act today," nothing
  else. A page may be knocked out in an urgency color only when the page
  has earned that color (e.g., a Chapter 27 opener in red is honest,
  because Chapter 27 is red; a part divider in red is not).
- **Part dividers: navy** (`#1f3d7a`, the ink color) with white type.
  Navy is structural — body text and folios — so it collides with
  nothing. Dividers only; nowhere else.
- **No new colors anywhere.**

## Domains (decided)

- **thecardinalspromise.com is the only URL in print.**
- robertbrizzi.com redirects quietly to the same place — kept as a
  catch-all, never printed inside the book.

## OPEN — the byline question (decide before the cover is final)

A prior discussion assumed the book is bylined "RLB" (initials / pen
name), which is why robertbrizzi.com must stay out of print. But the
current approved cover says **ROB BRIZZI, CDP** with a front-cover
dedication to **Hope Brizzi, PharmD** — the full family name, twice, on
the cover itself. These cannot both be right:

- If the byline is a pen name (RLB or otherwise): the cover's author
  line and the dedication both need rework, and the openers' first-person
  family story needs a privacy re-read.
- If the byline is Rob Brizzi (as the cover mock says): the pen-name
  precautions are moot, and printing robertbrizzi.com would be harmless
  (though the single-URL-in-print rule is still good practice).

Rob decides; everything downstream (cover spec, front matter, domain
rules) follows.

## Workbook structure (Rob's direction, pending consultant report)

**Hybrid, with cross-references.** Thinking worksheets — where the
questions are themselves the teaching — stay inline in the chapter.
Record-keeping worksheets (medication and doctor lists, emergency
contacts and crisis plan, the documents inventory) consolidate into a
workbook section at the back of the book, where a family can find and
reuse them.

**The pointer.** Where a chapter's tool lives in the back, the chapter
carries a designed cross-reference marker — not a sentence buried in a
paragraph:

> ▣ Workbook, p. 243 — Medication & Doctor List

It should read as a tab/callout the eye catches while skimming. Each
workbook page carries a back-reference the other way ("From Chapter 25,
p. 148") so a reader filling it in months later can get back to the
teaching in one flip.

**Production rule — do not hardcode page numbers.** Mark every pointer
with a placeholder token (e.g. `{{WB:med-list}}`) and resolve them all
to real page numbers in a single pass at typeset, after the openers,
part dividers, and workbook have settled the pagination. A wrong page
number in a crisis book is worse than no page number.

**Crisis-reader rule.** RED (Act Today) chapters keep everything the
reader needs on the page in front of her — never send a reader in
crisis to the back of the book. BLUE (Plan Ahead) chapters may point
freely; that reader is at a kitchen table, not in a hallway.

**Ebook note.** Fill-in rules do not survive reflowable EPUB. The
digital edition needs the worksheets handled separately — most likely a
downloadable printable PDF companion.

## Printable workbook + the website funnel (Rob's direction)

**No perforation.** KDP print-on-demand cannot perforate, die-cut, or
spiral-bind — that would require leaving POD for an offset print run
(minimum quantities, cash upfront, inventory, fulfillment). Verify
current specs with KDP before revisiting. A perforated special edition
stays a "later, if volume justifies it" idea, not a launch plan.
Perforation is also one-time by nature, and the record worksheets
(medication list, crisis plan, contacts) are living documents that get
revised many times — so a reprintable file beats a tear-out.

**Instead:**
1. **A printable workbook PDF** at thecardinalspromise.com — she prints
   the medication list fresh whenever a dose changes, three copies for
   three siblings, one for the car.
2. **Design for scissors** in the print book: dashed cut lines, a small
   scissors mark, generous margins, and the back-of-book workbook set on
   right-hand pages with blank reverses so nothing is lost when a page is
   cut out or copied.

**The funnel.** The download draws readers to the website, where the
thank-you page introduces *The Cardinal's Promise* — the toolkit buyer
is exactly the memoir's reader. Rules that keep it honest:

- **Do not gate the workbook behind an email form.** She may be
  downloading at 11pm mid-crisis; a form in front of a crisis plan
  contradicts the whole book. Deliver the PDF instantly, then invite the
  email ("Want the story behind this book?"). Fewer addresses, better ones.
- **No sales pitch inside the print book** — just a clean URL and a QR
  code (she has a phone in her other hand). The memoir gets introduced on
  the website's thank-you page, led by the cardinal on January 9th.
- **Last page of the workbook PDF** carries a quiet page about the
  memoir — she reopens that file all year.
- **Nothing essential lives behind the URL.** A reader who never goes
  online must still hold a complete toolkit. The download is a bonus copy
  of what is already printed.
