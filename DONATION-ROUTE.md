# The Donation Route

Decision document for funding the scholarship directly rather than through the CARD pool.
Supersedes the token as the funding mechanism; see
[`CARD-DISSERTATION.md` §3a.9](CARD-DISSERTATION.md) for the arithmetic that led here.

**Status: research and decision only. Nothing is live. No donation is being accepted, and no
payment page will be built until a qualified recipient exists** — for the same reason the
coins page was rewritten to sell nothing: we do not take money for something that does not
yet exist. Here the stakes are higher, because a donation page makes an implicit
representation about *tax treatment*, and that representation is false until there is a
501(c)(3) behind it.

---

## 1. The benchmark question: does any charity send 100%?

No. Not one, and it is worth knowing the real numbers before judging our own.

**The Salvation Army** directs roughly **82 cents of every dollar** to program services, with
sources ranging from about 77 cents (after standardising overhead treatment) to 87 cents
depending on accounting method — largely because thrift-store revenue and deferred
contributions are handled differently across analyses. Charity Navigator rates Salvation Army
Services Inc. at 3 out of 4 stars.

And to the specific question — **no, donations to the Salvation Army do not go to the
homeless**, or at least not mostly. Not through misconduct: homelessness is one program among
many. The organisation also runs disaster relief, adult rehabilitation centres, youth
programmes, and — this is the part most donors do not register — **it is a church**. The
Salvation Army is a Christian denomination, and religious ministry is part of the mission it
funds. A dollar given goes to *the organisation's purposes*, which are broader than any single
cause a donor may have had in mind.

**Goodwill** is a different model again, and the comparison is instructive. It is not one
charity but a federation of roughly **150 independently operated regional organisations**,
and most of its money does not come from cash donations at all — Missouri Goodwill, for
instance, reported $252M of 2024 revenue, of which $109M was store and salvage sales and
$107M was non-cash contributions. When you donate a sofa you are donating *inventory*, not
funding. Program ratios vary widely by affiliate (Goodwill of South Texas reports 94%), and
executive compensation has drawn sustained criticism: CEOs of the 12 largest affiliates were
paid **$405,215–$960,943 in 2024**, averaging about $670,000, with total CEO compensation
across all 150 organisations estimated above **$100 million**.

**The honest takeaway is not that these are bad charities.** It is that **80–90% is what good
looks like**, that overhead is what makes a programme exist at all, and that "where does my
money go" is a question with a legitimate and unflattering answer even at the most respected
institutions. A scholarship fund that reaches 90%+ and publishes the number is doing better
than the benchmark, not worse.

---

## 2. The routes, priced

The same $100,000 of goodwill, by mechanism:

| Route | Reaches the student | Donor deduction | Donor left holding |
|---|---|---|---|
| CARD pool liquidation | $97,438 | **none** | tokens worth −99.7% |
| Salvation Army benchmark | ~$82,000 | yes | nothing |
| Fiscal sponsor @ 15% (worst case) | $82,535 | yes | nothing |
| Fiscal sponsor @ 10% (most common) | $87,390 | yes | nothing |
| **Fiscal sponsor, scholarship rate @ 0–5%** | **$92,245** | yes | nothing |
| Community foundation @ ~2%/yr | $95,158 | yes | nothing |
| Own 501(c)(3), card processing only | $97,100 | yes | nothing |

Fiscal sponsorship fees generally run **5–15% of funds raised, most commonly 10%**. Notably,
**scholarship funds are often charged less than general fiscal sponsorship** — some sponsors
charge no administrative fee on scholarship funds at all, and community foundations
frequently charge around 2% annually, though those often carry minimums (sometimes $50,000)
to open a named fund.

**Two observations decide the matter.**

First, **every donation route beats the token route once the deduction is counted.** Even the
worst-case 15% fiscal sponsor delivers $82,535 to a student *and* returns $22,000–$37,000 of
tax relief to the donors, against the token route's $97,438 delivered by buyers who keep
nothing. Counting the deduction, the donation route moves more total value even where it
moves fewer dollars.

Second, **the token route funds a scholarship once.** Liquidating the treasury tranche takes
the price down 99.7%; there is no second year. A donation route funds a scholarship every
year that people give.

---

## 3. Recommendation

**Start with a fiscal sponsor or a community foundation. Do not form our own 501(c)(3) yet.**

| | Fiscal sponsor / community foundation | Own 501(c)(3) |
|---|---|---|
| Time to first dollar | weeks | 2–4 weeks (Form 1023-EZ, $275) to 3–12 months (Form 1023, $600) |
| Cost | 0–15% of funds | filing fee + annual Form 990 compliance, indefinitely |
| Who carries IRS risk | the sponsor | us |
| Scholarship-grant compliance | already solved by them | our problem (see §4) |

The decisive factor is not cost, it is §4. A sponsor that already runs scholarship programmes
has already solved a problem we would otherwise have to solve from scratch, and it means the
first award can happen in the next academic cycle rather than the one after.

Revisit forming our own entity once annual giving is large enough that the sponsor's fee
exceeds the cost of compliance — not before.

---

## 4. Compliance issues that must go to counsel before anything is accepted

These are flagged as questions, not conclusions. None of them is answered here.

1. **Private foundation classification.** An organisation funded principally by one family is
   liable to be classified a private foundation rather than a public charity. That
   classification carries materially different rules, and it is the single most consequential
   structural question in this plan.
2. **IRC §4945(g) — advance approval of scholarship procedures.** A private foundation making
   grants to individuals generally requires the IRS to approve its selection procedures *in
   advance*. Making awards before that approval is not a paperwork problem. Using a fiscal
   sponsor that is already a public charity is the standard way to avoid this entirely, and
   is a large part of why §3 recommends it.
3. **Related parties.** Whether any family member may ever receive an award, and what
   self-dealing exposure arises if one could. The safe answer is a written exclusion, adopted
   before the first award rather than after the first awkward application.
4. **Selection criteria and control.** Who chooses recipients, on what published criteria, and
   whether the founder may sit on that committee.
5. **Interaction with the token.** If CARD launches at all, whether the treasury tranche may
   ever be granted or sold to fund the scholarship, and what that does to items 1–4.
6. **Solicitation registration.** Most states require registration before soliciting
   charitable donations from their residents. A public webpage solicits everywhere.

---

## 5. Sequence

Nothing below is started until the step above it is finished.

1. Take §4 to counsel. Decide fiscal sponsor vs community foundation vs own entity.
2. Select and sign with the chosen vehicle. Obtain in writing: the fee, what it covers, who
   holds legal control of the funds, and the scholarship-grant procedure.
3. Adopt the award criteria and the related-party exclusion in writing, before any money is
   solicited.
4. Confirm state solicitation registration requirements for a public page.
5. **Only then** build the donation page, with the recipient entity, its EIN, the fee
   disclosed as a number, and the deduction language reviewed by counsel.
6. Publish what reached a student each year, including the years the number is small. Once a
   figure is published on a schedule, not publishing it becomes the signal — so do not start
   until we are prepared to publish a bad year.

Step 6 is the same discipline the dissertation asks of the token, pointed at the mission
instead: a commitment is only worth what it costs to keep in a bad quarter.

---

## Sources

- [Charity Navigator — Salvation Army Services Inc.](https://www.charitynavigator.org/ein/363805307)
- [Charity Intelligence — Salvation Army](https://www.charityintelligence.ca/charity-details/58-salvation-army)
- [Factually — Salvation Army program vs administration and fundraising expenses](https://factually.co/fact-checks/charity/salvation-army-expense-program-services-vs-administration-fundraising-6308fc)
- [Paddock Post — Executive Compensation at Goodwill (2024)](https://paddockpost.com/2026/02/24/executive-compensation-at-goodwill-2024/)
- [ProPublica Nonprofit Explorer](https://projects.propublica.org/nonprofits/organizations/256015097)
- [National Council of Nonprofits — Fiscal Sponsorship](https://www.councilofnonprofits.org/running-nonprofit/administration-and-financial-management/fiscal-sponsorship-nonprofits)
- [National Network of Fiscal Sponsors — 10 Questions Projects Should Ask](https://www.fiscalsponsors.org/10-questions-projects-should-ask)
- [AlignMint — Fiscal Sponsorship Fee Structures](https://www.getalignmint.org/blog/fiscal-sponsorship-fee-structures)
- [Foundant Compass — Scholarship Fund Minimums and Admin Fees](https://community.foundant.com/funders_community_foundations/discussion/1110/scholarship-fund-minimums-and-admin-fees)

---
*Research and decision document. Not legal, tax, or financial advice — §4 is a list of
questions for counsel, not a set of answers.*
