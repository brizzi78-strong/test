# Cardinal Coverage — gap analysis

Honest assessment of the distance between what exists in this repository and
what a fundable, sellable company requires. Written August 2026.

Scope note: this reflects what is visible in the repo and the working session
that produced it. Where the answer depends on facts not in evidence — existing
customers, entity status, capital — those are marked as unknowns rather than
assumed to be zero.

---

## The headline

| Dimension | Where it stands |
| --- | --- |
| **The story** | ~80% — researched, sourced, structured, presentable |
| **The product** | ~15% — working prototypes, no product |
| **The business** | ~0% — no priced offer, no paying customer, no measured outcome |

The asymmetry is the point. The narrative is genuinely strong and grounded in
public data that holds up to scrutiny. Almost nothing behind it is real yet.
That is a normal place to be at this stage, but it must be named accurately —
especially in a room where someone will ask.

---

## What is genuinely solid

**The problem is documented, not asserted.** HHS OIG (2026) on near-total
overturn of appealed SNF denials, the AHCA/NCAL survey of 363 providers, and
the Acentra BFCC-QIO focused study are third-party sources an investor can
verify. Most pre-seed decks cannot say that.

**The timing argument is real.** CMS-4201-F established the coverage floor in
2024; CMS-0057-F operational requirements began January 2026; the Prior
Authorization FHIR API mandate lands January 1, 2027. That is a defensible
answer to "why now" that does not depend on opinion.

**The category insight is correct and non-obvious.** Incumbents work the claim
after denial; nothing works the stay during it. That distinction survives
contact with the competitive research.

**The prototypes prove competence, not product.** They demonstrate that the
domain is understood well enough to compute NOMNC and QIO deadlines correctly.
That is worth something in a demo. It is not worth anything in a facility.

---

## Gap 1 — Before presenting (days)

| Item | Status |
| --- | --- |
| Nine fill-in blocks across deck and one-pager | Open — deck cannot be shown until closed |
| An honest traction sentence | Open — decide it, do not improvise it |
| The ask, tied to milestones | Open |
| Entity, cap table, counsel | Unknown — required before taking money |
| Rehearsed live demo | Demo data ships; the rehearsal does not |

The traction slide is the one that decides the meeting. If the true answer is
"one facility, my own, two active cases, prototype in use," say exactly that
and pivot to the working tool. Padding it is checkable and unrecoverable.

## Gap 2 — Before charging anyone (months)

This is the real distance, and it is larger than it looks from a working demo.

**HIPAA is a gate, not a feature.** The moment a second facility's resident
data touches software, the vendor becomes a business associate — directly
liable under HITECH, not merely contractually. That requires, at minimum: a
signed BAA with every downstream vendor including hosting; encryption in
transit and at rest; audit controls; unique user identification and access
control; a documented security risk analysis; breach notification procedures;
and workforce training. A page storing cases in browser `localStorage` cannot
satisfy any of it, and no facility's compliance officer will sign for it.

**Architecture the prototypes do not have.** Server-backed persistence that
survives a laptop. Authentication with roles — nursing, therapy, MDS, and the
business office need different views of the same case. Multi-facility tenancy.
An audit trail of who changed what and when, which is both a HIPAA requirement
and, usefully, evidence in an appeal.

**The double-entry problem, which kills most SNF point solutions.** If staff
must enter a resident in PointClickCare and again in this tool, adoption dies
in week three. The realistic paths are a PCC/MatrixCare integration, a census
import, or — most plausibly first — accepting that the pilot facility tolerates
manual entry because the founder runs it, while knowing that does not
generalize.

**A priced offer.** No pricing model exists. It cannot be set credibly without
knowing what a recovered denial is worth at a real facility.

## Gap 3 — Before it is a business (quarters)

**The value proposition is entirely unmeasured.** The whole pitch is that the
product recovers reimbursement. Nobody has measured a single recovered dollar.
Until there is a number — denials overturned, days recovered, with a method a
CFO would accept — every claim in the deck is theory.

**The sale is unproven outside the founder's own network.** Selling to a
facility you run is not evidence. The second and third facilities are the
evidence.

**No team beyond the founder.** Named in the deck as a gap, which is the right
handling, but it remains a gap.

---

## The single highest-leverage move

**Instrument the founder's own facility and measure the outcome.**

Not more software. Not a better deck. Run the tracker and the appeal letters on
real cases for one quarter and count: authorizations submitted on time versus
late, denials received, appeals filed, appeals won, covered days recovered, and
dollars protected against the facility's own remittance data.

This is the highest-yield action available for four reasons:

1. It converts the deck's weakest slide into its strongest.
2. It sets pricing — the recovered-dollar figure is the anchor.
3. It requires no HIPAA build, because a covered entity using a tool on its own
   residents is a fundamentally different posture from becoming a business
   associate for someone else.
4. It is the only thing that distinguishes this from a well-researched idea.

A quarter of real numbers from one facility is worth more to a raise than
another quarter of engineering.

---

## Suggested sequence

1. **Now** — close the fill-in blocks; decide the honest traction sentence.
2. **This quarter** — run both tools on live cases at the home facility;
   instrument outcomes against remittances; derive pricing from the result.
3. **Next** — with a real number in hand, raise for the HIPAA-grade rebuild:
   server, auth, audit, tenancy, and the first integration.
4. **Then** — two to three paid pilots outside the founder's network, which is
   the actual proof of a business.

Reversing steps 2 and 3 — raising to build before measuring — is the common
failure mode. It funds an unvalidated product and burns the capital that the
measurement would have priced correctly.
