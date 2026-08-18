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

## 2a. Taking an operating allocation

Short answer: **yes, 10% is lawful and conservative** — the Salvation Army runs roughly 18%
on overhead, so a 10% allocation would put this fund at an **87.4% program ratio, above the
benchmark it is measured against.** Three things qualify that, and the second is the one that
changes a decision.

**First, "taken on each donation" is the wrong mental model.** A charity does not skim a
percentage off incoming gifts; it has a budget and pays expenses out of it, and the ratio is
the *result* rather than the mechanism. Practically the money is similar. Legally and
reputationally the difference matters: a **published cap we hold ourselves to** is a
commitment, while a per-donation cut is a fee, and only one of those reads well on a page
asking people to remember someone.

**Second, the fees stack, and this decides the vehicle question.**

| Structure | Reaches the student | Program ratio |
|---|---|---|
| Fiscal sponsor 10% **+ our ops 10%** | $78,651 | **78.7%** — *below the Salvation Army benchmark* |
| Fiscal sponsor 10%, we take nothing | $87,390 | 87.4% |
| **Own 501(c)(3) + our ops 10%** | **$87,390** | **87.4%** |
| Own 501(c)(3), all volunteer | $97,100 | 97.1% |

A sponsor's fee and our own allocation are not alternatives — they compound, and together
they drop us beneath the benchmark we would be citing. So the two workable positions are
**take nothing and use a sponsor**, or **take 10% and hold our own exemption**. That reopens
§4 rather than settling it: our own entity is what makes an operating allocation defensible,
and it is also what triggers the private-foundation and §4945(g) questions. Counsel should be
asked to weigh those together, not separately.

**Third, if any of that allocation pays a person connected to the fund, a different regime
applies.** Under **IRC §4958**, founders and substantial contributors are *disqualified
persons*. Compensation beyond what is reasonable is an *excess benefit transaction*, taxed at
**25% of the excess to the recipient, rising to 200% if not corrected**, with a further **10%
(capped at $20,000)** on any organisation manager who knowingly approved it. The defence is
the **rebuttable presumption of reasonableness**: approval by an independent body without
conflict, reliance on comparability data, and contemporaneous documentation. Satisfy all
three and the burden shifts to the IRS. (§4958 governs public charities; private foundations
fall under the §4941 self-dealing rules instead, where reasonable compensation for personal
services is an exception — another reason the classification question in §4 comes first.)

**A scale check worth doing before any of this is designed:**

| Raised | 10% operating allocation |
|---|---|
| $5,000 | $500 |
| $25,000 | $2,500 |
| $100,000 | $10,000 |

Ten percent of a small number is a small number. At the scale this fund will plausibly reach
in its first year, an operating allocation funds a little software and some postage, not a
role. The realistic sequence is to **adopt the cap now and draw nothing against it**, so the
policy exists before there is any temptation attached to it.

**And one thing the arithmetic does not capture.** The first donors will largely be people
who knew Lou. If they later read on a Form 990 that a share went to salary — however lawful,
however reasonable, however properly documented — that is a relationship problem, and it is
not fixed by having been legal. The only real defence is having said it first, in a number,
before the first dollar arrived.

Which is the whole thesis of the companion study, pointed at the charity rather than the
token: **a cap published in advance and reported against annually is verifiable restraint.**
"We cap operations at 10% and publish the actual figure every year, including the years it
runs higher" is a stronger commitment than most charities make, it costs something real to
keep, and unlike a token sell policy it is checkable by anyone against a public Form 990. If
we are going to take an allocation, that is how to take it.

## 2b. Paying reps on commission

**This one should not be done, and the reasons are unusually clear-cut.** It is the first
proposal in this project that fails on all three of ethics, regulation, and arithmetic
simultaneously.

**It is prohibited by the profession's own code, in terms.** The AFP Code of Ethical Standards
states that fundraising compensation *"may never be based on a percentage of funds raised,"*
and that members must decline **receiving or paying** finder's fees, commissions, or
percentage-based compensation. The prohibition runs in both directions — engaging commissioned
reps is itself the violation, not merely accepting such a role. AFP further urges members to
counsel organisations against paying any third party, including face-to-face street
solicitors, a fee calculated as a percentage of the contribution.

The reasoning behind the rule is the reason it matters here: a commission makes the solicitor's
income depend on the size of the gift rather than on its fit with the donor's intent, and it
converts a memorial gift into a sales transaction with a margin.

**It is heavily regulated, and the compliance is not trivial.** **44 states require paid
solicitors to be licensed and 38 require surety bonds, in face amounts from $10,000 to
$25,000.** Georgia requires a $10,000 bond where the solicitor has possession or control of
contributions; South Carolina requires $15,000 filed *before any solicitation activity
occurs*. Contracts must typically be filed in advance, and point-of-solicitation disclosure —
that the caller is paid, and on request what share reaches the charity — is commonly mandatory.

**And it destroys the number that made this route better than the token in the first place:**

| Structure | Reaches the student | Program ratio |
|---|---|---|
| Own 501(c)(3) + 10% ops, no reps | $87,390 | **87.4%** |
| Salvation Army benchmark | ~$82,000 | ~82% |
| + reps at 15% commission | $74,282 | 74.3% |
| + reps at 25% commission | $65,542 | **65.5%** |
| + reps at 40% commission | $52,434 | **52.4%** |

At any realistic commission the fund drops below the benchmark it would be citing, and at the
upper end barely half of a gift reaches a student. §3a.9 of the companion study chose donations
over the token *because* of the program ratio. Commissioned reps hand that advantage back and
then some — and unlike the token route, this version has to be disclosed to every donor who
asks.

**The salaried alternative is legitimate but premature.** Paying fundraising staff a salary or
a flat fee for defined deliverables is entirely proper; only percentage-based compensation is
barred. The problem is scale:

| Development salary + tax | Must raise to stay within a 10% operating cap |
|---|---|
| $45,000 | ~$450,000 |
| $60,000 | ~$600,000 |
| $80,000 | ~$800,000 |

A fund raising tens of thousands cannot carry a fundraiser of any kind. That is not a
temporary embarrassment; it is the ordinary condition of a new scholarship fund.

**What actually raises money at this size is the thing that cannot be outsourced.** The donors
for a scholarship in Lou's name are people who knew him, and people whom someone who knew him
tells. That asset is the story and the relationships behind it, and a commissioned stranger
cannot carry either — not because they lack skill, but because the credibility being drawn on
is personal and non-transferable. The board members are the fundraisers. So is the founder.
That is not a constraint imposed by the budget; it is what the fundraising *is* at this stage,
and it is also the cheapest and most effective form available.

**If reps are revisited later**, the terms are: salary or flat fee only, never a percentage;
paid-solicitor registration and bonding confirmed in every state solicited before any contact
is made; and the arrangement disclosed on the donation page whether or not a given state
compels it.

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
7. **Paid solicitors (see §2b).** Confirm our reading that percentage-based fundraising
   compensation should be off the table entirely, and identify the registration and bonding
   obligations that would attach in each state solicited if flat-fee help is ever engaged.
8. **Operating allocation (see §2a).** Whether a 10% cap is defensible, whether it may ever
   compensate the founder, and what the §4958 rebuttable-presumption procedure requires of a
   board this small. Please weigh this together with items 1–2 rather than separately: our own
   entity is what makes an allocation workable and is also what triggers the classification
   question.

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
6. Adopt Appendix A (operating policy) at the first board meeting, before soliciting.
7. Publish what reached a student each year, including the years the number is small. Once a
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
- [IRS — Intermediate sanctions: excess benefit transactions](https://www.irs.gov/charities-non-profits/charitable-organizations/intermediate-sanctions-excess-benefit-transactions)
- [26 CFR §53.4958-6 — Rebuttable presumption that a transaction is not an excess benefit transaction](https://www.law.cornell.edu/cfr/text/26/53.4958-6)
- [Nonprofit Law Blog — Rebuttable Presumption of Reasonableness Procedures](https://nonprofitlawblog.com/rebuttable-presumption-of-reasonableness-procedures/)
- [AFP Code of Ethical Standards](https://afpglobal.org/ethics/code-ethical-standards)
- [AFP — Frequently Asked Questions About Fundraising Ethics](https://afpglobal.org/sites/default/files/attachments/2018-11/EthicsFAQ.pdf)
- [Perlman & Perlman — Paid to Solicit Charitable Contributions? You May Need to Register](https://perlmanandperlman.com/are-you-paid-to-solicit-charitable-contributions-for-a-charity-you-may-need-to-register-as-a-professional-fundraiser/)
- [Georgia Secretary of State — How-To Guide: Paid Solicitor](https://sos.ga.gov/how-to-guide/how-guide-paid-solicitor)
- [SC Secretary of State — Professional Fundraisers and Solicitors](https://www.sos.sc.gov/online-filings/charities-pfrs-and-raffles/professional-fundraisers-and-solicitors)
- [Foundant Compass — Scholarship Fund Minimums and Admin Fees](https://community.foundant.com/funders_community_foundations/discussion/1110/scholarship-fund-minimums-and-admin-fees)

---
*Research and decision document. Not legal, tax, or financial advice — §4 is a list of
questions for counsel, not a set of answers.*
---

## Appendix A — Draft operating policy

Not adopted. Cannot be adopted until a vehicle exists (§3–§5). Drafted now so the policy is
written before there is any money attached to it, which is the only time a cap costs nothing
to set.

### A.1 The cap

Operating costs shall not exceed **10% of contributions received in a fiscal year**. The
actual figure shall be published annually whether it is above or below the cap, and if it is
ever exceeded, the amount and the reason shall be published rather than smoothed.

### A.2 What "operations" means here

The cap covers the cost of being a lawful charity, which at this size is almost entirely
compliance rather than people:

| Line | Realistic annual cost |
|---|---|
| Payment processing (discounted nonprofit rates are available from major processors — confirm current terms) | 2.2–2.9% + per-transaction |
| Accounting and Form 990 preparation | $500–$2,000 |
| State charitable solicitation registration and renewals | $25–$400 per state |
| Directors & officers insurance | $500–$1,500 |
| Domain, email, website, donor records | $200–$1,100 |
| **Realistic floor before anyone is paid anything** | **~$1,500–$4,000** |

Which produces the number that should govern expectations: **at a 10% cap, roughly $30,000
must be raised in a year before the cap covers compliance alone.** Below that level the
shortfall is met personally, and the operating allocation is not a source of income to
anybody — it is the cost of the fund being real. *(Worth a CPA question: expenses paid
personally on the charity's behalf may themselves be deductible as charitable contributions.)*

### A.3 Compensation, if it ever arises

No connected person is compensated until the fund can carry it without breaching §A.1. If
that point is reached, every one of the following happens before a dollar is paid — this is
the **§4958 rebuttable presumption**, and doing two of the three is worth nothing:

1. Approved by board members with no financial interest in the outcome, with the person
   concerned recused from the discussion and the vote.
2. Decided against **comparability data** — Form 990 compensation figures from organisations
   of similar size, budget, and mission.
3. **Documented contemporaneously** in the minutes: the figure, the data relied on, who voted,
   and when.

Satisfy all three and the burden of proving unreasonableness shifts to the IRS. Satisfy fewer
and it rests on us.

### A.4 What is excluded outright

- Compensation to any person calculated as a percentage of funds raised (§2b).
- Awards to any member of the founder's family, or to any board member's family.
- Any payment to a party that also provides the fund with paid independent review.

### A.5 Reporting

One page, published annually, carrying four numbers: raised, operating costs, operating costs
as a percentage, and awarded. Published in a bad year too. **Beginning to report on a schedule
and then stopping is itself the disclosure** — so this does not start until we are willing to
publish a year we would rather not.

