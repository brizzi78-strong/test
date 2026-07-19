# Back Cover Copy — It's Not Your Fault

> Source of truth for the cover wrap's back panel — edit here and the wrap
> regenerates to match. Front-panel design is now the author's finished
> **cream** cover (July 2026); see the design brief at the bottom.

## Endorsement (leads the back panel, above the headline) — ON HOLD (July 2026)
The physician endorsements (Ferrera, Huet) are pulled "for now" at the
author's request. The back panel currently leads with the headline; the
approved quotes are preserved in `marketing/endorsement-kit.md` and can be
restored above the headline when ready.

## Top hook (leads the back panel, red italic)
**You're not failing. You just haven't been shown how.**

## Headline
**Caring for an aging parent is overwhelming — nobody hands you a map.**

## Body
Color-coded by urgency — Act Today, Watch Closely, Plan Ahead — It's Not
Your Fault helps your family get organized, make informed decisions, and
face the healthcare system with confidence, even on your worst day.

## Inside you'll find how to:
- Know what to do first when a parent declines — organized by urgency
- Spot the Medicare "observation vs. admitted" trap that decides who pays for rehab
- Protect savings and the home before the Medicaid five-year look-back
- Compare every care option — home health to hospice — and how families actually pay
- Find prescription help that looks at income, not your house
- Protect yourself from burnout — and the mistakes that cost families the most

## Front cover subtitle (July 2026)
The cover subheading is now **"Helping Caregivers with Aging Loved Ones"** (was
"For Families Caring for an Aging Parent"). The title page inside matches. The
registered Amazon metadata subtitle still reads "A Practical Guide for Families
Caring for an Aging Parent" — decide whether to align it at upload.

> ⚠️ **Front crossout — do not reverse.** The title device is **IT'S ~~ALL~~
> YOUR FAULT** with "Not" written above the struck-out "ALL," so it reads *It's
> Not Your Fault.* A version that crosses out **NOT** reads *"It's Your Fault"* —
> never ship that one.

## Author block
**Rob Brizzi** is a Certified Dementia Practitioner with a career across
home health, hospice, and senior living. His work at the bedside of patients
and families has shaped his mission to bring comfort, grace, and dignity to
the end-of-life journey.

Rob lives in North Carolina with his wife, Hope Brizzi, PharmD.

## Footer band
COMPASSION · ORGANIZATION · CONFIDENCE · PEACE OF MIND

Publisher mark: Cardinal Promise Press

## Front panel — FINISHED COVER (CREAM, author-delivered, July 2026)

**DECISION (July 2026): the "correction" crossout cover (Option A) is chosen**
over the clean-title version (Option B). Hope's read settled it — *"life is
messy."* The cover tells the truth of caregiving rather than smoothing it over.
Option B is retired to `cover-clean-v1.jpeg` as a backup only. This book ships
**cream**; the retitle to *It's Not Your Fault* is final.

**SERIES NOTE:** cream is this book only. The rest of the Cardinal's Promise
series — including the memoir *A Cardinal's Promise* — stays **navy** (the
navy design language remains locked for the series: navy #1b2440 field, gold
#c9a45c, cream #f5f1e8 type, thin gold frame). *It's Not Your Fault* is the
deliberate cream outlier because its promise — "it's not your fault" — is a
warmer, lighter register than the series' spine.

Aesthetic (matches the delivered art — the **"correction" concept**): warm
cream field; thin **rust/red** double-rule frame; photorealistic red cardinal
on a rust-berry branch, upper third. The title is the hook: it reads as a
handwritten correction — **IT'S ~~ALL~~ YOUR FAULT** with "ALL" struck through
in red and **NOT** written above it in red marker, so the eye lands on *It's
Not Your Fault.* Title type is dark charcoal serif; red diamond ornaments;
author name in charcoal caps. Clean — no utility row or color-tab strip.

**Designer brief (print-resolution rebuild) — current adopted layout (July 2026):**
1. Thin **red/rust double-rule frame**; no top kicker. Large photorealistic red
   cardinal facing left on a **red-berry branch**, upper third, on a warm cream
   field (#faf1e4).
2. Title treatment: **IT'S ~~ALL~~ YOUR FAULT** — "ALL" struck out with a red X
   and **NOT** written above it in red, so the corrected reading is *It's Not
   Your Fault.* Deep-navy serif; the device owns the center. (⚠️ Keep it legible
   at 100px thumbnail; a red X through the WRONG word flips the meaning — an
   earlier draft crossed out "NOT" and read *"It's Your Fault."* Cross out
   **ALL**, never NOT.)
3. Subtitle (rust italic): **For Families Caring for an Aging Parent** (the
   cover uses this short form; the registered metadata subtitle stays the longer
   *A Practical Guide for Families Caring for an Aging Parent* unless changed).
4. Author line: **ROB BRIZZI** (navy caps), and beneath it in **blue italic**:
   *From the Author of **The Cardinal's Promise**.* CDP credential omitted on the
   front; it stays on the back bio.
5. Art: photorealistic red cardinal on a rust-berry branch — alert, a herald,
   not a mourner. Avoid the sympathy register; the buyer's parent is alive.
6. ISBN on the back-panel barcode area: **979-8-9966446-0-5**

> The registered **title stays "It's Not Your Fault"** — the ~~ALL~~/NOT
> crossout is a cover-art treatment only, not a title change.

**Art asset status (July 2026):** the crossout design is now **built to print spec
in HTML/CSS**, not just a mockup. The wrap front panel and the standalone front are
regenerated by `build-print-cover.mjs`:
- `kdp-cover-wrap-print.pdf` — full wrap, flattened, exactly **17.7804 × 11.25 in**,
  300 DPI (5334 × 3375 px). Upload this to KDP's "print-ready PDF cover" slot.
- `front-cover-print.pdf` / `.jpeg` — front only, **8.75 × 11.25 in** (trim + 0.125"
  bleed), 300 DPI (2625 × 3375 px). Use this for KDP Cover Creator's "upload your
  own front cover" path.

The type, red double-rule frame, and layout are vector-clean at 300 DPI. The **only**
element still below true print resolution is the **cardinal art** (`cardinal-art.png`,
884 × 445 px) — supply that one image at higher resolution and re-run the build for a
fully print-crisp file. (The prior clean-title cover is kept as `cover-clean-v1.jpeg`
if the crossout is ever reconsidered.)

Wrap geometry (premium color, 226pp interior): full wrap 17.7804 × 11.25 in,
0.125" bleed, spine 0.5304" centered. Spine: navy title text on the cream
field. (Recompute if the page count changes: spine = pages × 0.002347.)

## ISBN
Paperback: **979-8-9966446-0-5** — a real, checksum-valid ISBN from Rob's own
Bowker block (registrant 9966446, MyIdentifiers). The audiobook edition uses
979-8-9966446-2-9. Print the paperback number on the back-panel barcode area,
or let the print/POD service generate the scannable barcode in the white zone.
(Any earlier 978-1-963342-xx-x numbers were placeholders — do not use them.)
