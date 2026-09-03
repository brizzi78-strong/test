# Plan Rules Registry — what a real one requires

`rules.html` is a working prototype of the registry. This document is about what
it would take to make it the thing the business actually rests on, because that
is a bigger commitment than it looks.

## Why this is the moat

Everything else in this product is copyable. The deadline engine is a weekend of
work for a competent developer. The letter templates are public regulation
assembled with care. An EHR vendor could ship both.

What compounds is a **maintained, dated, sourced record of what every Medicare
Advantage plan actually requires** — per state, per product line, per contract
year, with the history of what it used to require. That asset:

- gets more valuable the longer it runs, because the history is what proves a
  plan changed its own rule mid-stay;
- cannot be back-filled by a competitor entering later;
- is the natural place a facility looks first, every day, which makes it the
  wedge that pulls the rest of the product in;
- directly answers the "no moat" finding in [`gap-analysis.md`](gap-analysis.md).

## Why it is also the biggest liability

**A stale rule is worse than no rule.** If the registry says "fax appeals to
X" and X changed in January, the facility does not merely lack information — it
actively misfiles an appeal against a deadline and loses coverage for a real
resident. Confidence in an unmaintained registry is the failure mode.

That inverts the usual build priority. The valuable part is not the data model;
it is the **operational discipline that keeps entries true**, and the honesty of
the interface when it cannot promise that.

The prototype encodes three rules that any production version must keep:

1. **Every entry carries its source.** A rule without a citation is a rumour and
   the form refuses to save one.
2. **Every entry carries a human confirmation date and an expiry.** Freshness
   reflects the last time a person checked the source, not the last time anyone
   edited the record. Correcting a typo does not reset the clock.
3. **Superseded values are retained, not overwritten.** The change log is the
   product.

## What production needs beyond the prototype

**A shared backend.** Browser `localStorage` cannot be the system of record for
something several facilities rely on. Rules are not PHI, which makes this the
one component that can ship before the HIPAA build — a useful sequencing fact.

**A named owner per plan.** Not a scraper. Someone whose job includes re-reading
Aetna's precertification list each quarter and stamping the date. Budget this as
a role, because it is one.

**Source monitoring where it is possible.** Provider manuals and precertification
lists are usually public PDFs at stable URLs. Hashing those on a schedule and
alerting on change catches a meaningful share of updates without pretending to
parse them. Portal-only rules cannot be monitored this way and must be re-checked
by hand.

**Per-rule review intervals, not one global setting.** Fax numbers and portal
routes move without notice and deserve 60–90 days. Codified federal regulation
can sit at a year. The prototype already models this; production should tune the
defaults from observed change rates once there is history to learn from.

**Provenance strong enough to cite in an appeal.** If the registry is going to
support a letter saying "the plan's own manual states X," the entry needs the
document title, page or section, and retrieval date — not just a link that may
404 by the time anyone checks.

**A correction path from the field.** The people who discover a rule has changed
are staff who just got told "that's not how we do it anymore" on a phone call.
Capturing that as a flag against the entry, routed to the owner, is worth more
than any automated monitor.

## What it should not do

**Do not infer or generalise rules across plans or states.** Every entry should
trace to a document someone read. Where a rule is genuinely unknown, the honest
value is "unknown — confirm with the plan," and the registry should show that
rather than a plausible guess.

**Do not present it as legal advice.** It is an operational reference. The
disclaimer in the footer is not decoration.

**Do not let the 2027 FHIR APIs be mistaken for a replacement.** CMS-0057-F
requires payers to expose prior-authorization *status* by 1 January 2027. It does
not standardise submission routes, appeal fax numbers, peer-to-peer scheduling,
delegated-vendor assignments, or which clinical criteria a plan applies — which
is most of what this registry holds. The API changes how status is read, not what
the rules are.

## Sequencing suggestion

1. Run the prototype against the two plans in front of you and keep it accurate
   for one quarter. If that discipline does not hold for two plans, it will not
   hold for two hundred, and better to learn that now.
2. Add plans only as real cases require them. A registry of eight true rules
   beats one of four hundred unverified ones.
3. Move to a shared backend when a second person needs to write to it — that is
   the actual trigger, not a headcount or funding milestone.
4. Add source-hash monitoring once the manual routine is established, so the
   automation supplements a working habit rather than substituting for one that
   never existed.
