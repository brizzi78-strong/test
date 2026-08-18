# Memo: Proposed Token Distributions — Questions for Counsel and CPA

**From:** Rob Brizzi, Cardinal's Promise / CP17
**Re:** Three proposed transfers from the founder token allocation
**Prepared:** August 2026

This memo asks specific questions. It is not a description of decisions already made —
nothing below has been executed, and nothing will be until we have your answers.

Please read alongside `docs/LEGAL-BRIEFING.md` and
`docs/GOVERNANCE_AND_FOUNDER_ECONOMICS.md`, which record the governance decisions this
memo would modify.

---

## 1. The asset

**CARD (Cardinals Promise)** — a fixed-supply ERC-20 token, 250,000,000 units, minted once.
No mint function exists after deployment; contract ownership is renounced at launch.

**Current allocation as documented:**

| Tranche | Amount | Share | Status |
|---|---|---|---|
| Liquidity pool | 100,000,000 | 40% | To be paired with ETH at launch, LP locked 12 months |
| Founder (me) | 100,000,000 | 40% | Held unlocked in a publicly disclosed wallet, governed by a written sell policy rather than a timelock — a deliberate, recorded decision |
| Treasury | 50,000,000 | 20% | Behind a 2-of-3 Safe multisig |

**Valuation.** The launch pool is now to be seeded with **$3,000**, which fixes the opening
price arithmetically at **$0.0000306 per token** and fully diluted valuation at **$7,653**.
A 20,000,000-token transfer therefore marks at **$612**, and would realise about **$500** if
sold immediately into the pool. (An earlier draft of this memo used $20,000 / $1,600 on a
larger assumed seed; those figures are superseded.) The token is not yet launched, not
listed, and has no trading market.

**Realisability, which differs sharply from the mark.** The pool is the only place these
tokens can be sold, and it pays the first seller best. Three 20,000,000 grants sold in
sequence realise $500, $357 and $268 respectively — **$1,125 in total against a combined
mark of $1,836**. Even on optimistic future prices the pattern holds: at a displayed price
of $1.00 per token, the first grantee to sell would extract roughly $527,000 and leave the
pool holding about $14,000 for everyone else. We want each recipient told this plainly. These
grants are recognition, not compensation, and we would rather say so than let anyone multiply
20,000,000 by a screener price.

---

## 2. What is proposed

Three transfers, each of 20,000,000 CARD, out of my personal 100,000,000 allocation
(60,000,000 total; my retained holding would fall to 40,000,000):

| # | Recipient | Relationship | Proposed terms |
|---|---|---|---|
| A | My brother | Family; no role in the project | Outright gift |
| B | Matt Campbell | Board member | Vesting over 3 years |
| C | Our CPA | Paid reviewer of the project's finances | Vesting over 3 years |

---

## 3. Questions for counsel

**Q1 — Characterization of each transfer.** Is (A) properly a gift, and are (B) and (C)
compensation for services? What documentation should exist for each at the time of transfer?

**Q2 — Securities exposure.** Do transfers of this kind, to this small a group, implicate
securities law? At what point does distributing from the founder allocation stop being a
private transfer and start requiring securities analysis — number of recipients, presence
of consideration, public solicitation, or something else? We are tracking the CLARITY Act
and would like the analysis written so it can be re-run when that resolves.

**Q3 — Entity of transfer.** Should these transfers be made personally, or should the
founder allocation first move to an operating LLC and be granted from there? What changes
about liability and reporting either way?

**Q4 — CPA independence.** Our governance document currently states that the paid CPA
reviewer is excluded from holding tokens and is never described as independent. Proposal
(C) contradicts that. **Our own reading is that (C) should not proceed** — an unvested
three-year stake gives the reviewer an ongoing financial interest in the outcome across
the entire review period, and independence is not partially preserved. Please confirm or
correct that reading, and advise whether additional compensation in cash raises any issue.

**Q5 — Recipient obligations.** My 100,000,000 is governed by a published written sell
policy. Recipients would be bound by nothing. Should transfer agreements bind recipients
to the same sell-policy terms, and is such a restriction enforceable?

---

## 4. Questions for the CPA

**Q6 — Section 83(b), and the 30-day clock.** For the vesting grants, absent an election
the recipient would recognize income as each tranche vests, at fair market value on each
vesting date. An 83(b) election filed **within 30 days of grant** would instead fix income
at today's value — approximately $1,600 per grant.

- Does 83(b) apply cleanly to a token grant of this kind?
- If yes, what must each recipient file, and what do we need to provide them?
- What is the risk if the token appreciates substantially and no election was made?

**This is the most time-sensitive question in this memo.** The 30-day window has no
extension, so it must be answered before any grant is executed, not after.

**Q6a — a specific risk that makes Q6 urgent rather than merely important.** The token's
price is set by a small liquidity pool, and anyone may create an additional pool at any
price they choose for roughly $100 in cost. A displayed price is therefore cheap for a
stranger to move and is not evidence that anyone paid it. If fair market value at a vesting
date were taken from such a feed, a recipient could face tax computed on a number nobody
paid, against a position the pool could not liquidate at anything close to it — at a
displayed $1.00, a 20,000,000 grant would show as $20,000,000 while the pool could pay about
$527,000 to whichever holder sold first, and less to everyone after.

- Is that exposure real, or would a manipulated thin-market print fail as fair market value?
- Does it change your recommendation on 83(b), given that an election made now would fix the
  amount at approximately $612 per grant?
- What contemporaneous documentation should we create at grant date to support the $612
  figure if it is later questioned?

**Q7 — Valuation support.** What documentation should support the ~$20,000 fully diluted
valuation at transfer date, given no trading market exists yet?

**Q8 — Reporting.** For the board grant: what is reportable, by whom, and when — at grant,
at each vesting date, or both? Is a 1099 required, and does the answer change if the
transfer comes from an LLC rather than from me personally?

**Q9 — Gift treatment.** For the transfer to my brother, at roughly $1,600 the annual
exclusion appears to cover it comfortably. Please confirm, and advise on his cost basis
and what records we should keep.

---

## 5. Two things we intend to do regardless of the answers

Stated so you can flag any problem with them:

**Vesting will be enforced by an on-chain vesting contract, not by agreement.** A standard
audited implementation, with the contract address published. The distinction matters to us:
a promise to vest is indistinguishable from an unlocked wallet to anyone examining the
project, whereas a vesting contract can be verified by anyone without trusting us.

**Any departure from the governance document will be written into it before execution.**
That document currently allocates 5,000,000 tokens per board member over two years. The
proposed grant to Matt Campbell is 20,000,000 over three years — four times the documented
amount on a different schedule. Either the document is amended with the reasoning recorded,
or the grant conforms to it. We will not execute a grant that silently contradicts our own
published policy.

---

## 5a. A change of direction that reorders these questions

Since this memo was drafted we have concluded that **the scholarship should be funded by
direct donations rather than by the token**, and that conclusion may make parts of the above
moot. The arithmetic is in `CARD-DISSERTATION.md` §3a.9; the short version is that liquidating
the treasury tranche to fund a scholarship converts roughly 97% of buyers' money into funding
but takes the token price down 99.7% doing it, funds one year only, gives the buyers no
deduction, and leaves them holding a near-worthless asset. The same money donated directly
delivers comparable dollars to a student, returns $22,000–$37,000 of deductions to the givers,
and can repeat annually.

**We would rather ask you about the donation structure first.** `DONATION-ROUTE.md` sets out
the options and the compliance questions in full; the ones we most need answered are:

**Q10 — Vehicle.** Fiscal sponsor, community foundation named fund, or our own 501(c)(3)? Our
own reading favours a fiscal sponsor or community foundation initially, principally to avoid
Q11.

**Q11 — Private foundation classification and §4945(g).** An organisation funded principally
by one family risks classification as a private foundation, which as we understand it would
require advance IRS approval of our scholarship selection procedures before any award to an
individual. Is that correct, and does using an existing public charity as sponsor avoid it
cleanly?

**Q12 — Related parties.** May any family member ever receive an award? We intend to adopt a
written exclusion before the first award regardless; please tell us if that is the wrong
instrument or the wrong scope.

**Q13 — Solicitation registration.** A public donation page solicits in every state. What
registration is required before it goes live?

**Q14 — Interaction with the token.** If CARD launches at all, may the treasury tranche ever
be granted or sold to fund the scholarship, and what does that do to Q11 and Q12?

Until these are answered, **no donation page will be built and no funds solicited.** We are
not accepting money against a tax treatment we cannot yet substantiate.

## 6. What we need back

1. **The donation vehicle (Q10–Q13) — this is now the priority.** It gates the mission and
   everything else can wait on it.
2. Whether (A) and (B) may proceed, and on what documentation.
3. Confirmation that (C) should not proceed, or your reasoning if you disagree.
4. A clear answer on 83(b) before any grant is executed, given the 30-day window.
5. Whether transfers should run through an entity rather than personally.

Happy to provide the token contract, the governance document, the legal briefing, or
anything else useful.

---

*Prepared as a basis for professional advice. Nothing here is a legal or tax conclusion.*
