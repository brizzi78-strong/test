# For Counsel — Cardinal's Promise / CP17

**From:** Rob Brizzi · **Prepared:** August 2026 · **Status:** questions, not decisions

Nothing below has been executed. No token is deployed, no donation solicited, no grant made.
This packet exists to make your review efficient; it is written to be read on its own.

Companion packets: `PACKET-CPA.md` (tax), `PACKET-BOARD.md` (governance).
Supporting analysis: `DONATION-ROUTE.md`, `CARD-DISSERTATION.md` §3a.

---

## 1. What exists

**A memorial scholarship** intended in memory of Lou Brizzi. This is the purpose; everything
else is instrumentation.

**A token, CARD** — an unlaunched fixed-supply ERC-20, 250,000,000 units, minted once, no mint
function, ownership renounced at launch. Intended split: 100M liquidity pool / 100M founder,
held personally and unlocked / 50M treasury behind a 2-of-3 multisig. **Nothing is deployed.**
The launch is gated on a written demand test that has not been met.

**A prior decision, recorded in `docs/GOVERNANCE_AND_FOUNDER_ECONOMICS.md`:** form a new,
boringly-named LLC to hold the treasury and the operations; keep the founder's personal
token position outside it; do **not** file for 501(c)(3) status at this scale; use fiscal
sponsorship if charitable standing becomes necessary.

**A change of direction since:** we now intend the scholarship to be funded by **direct
donations rather than by selling token treasury**. The arithmetic is in §2.

---

## 2. Why the funding mechanism changed

Liquidating the 50,000,000 treasury tranche into the token's own liquidity pool to fund a
scholarship converts roughly 97% of *buyers'* money into funding — but the tranche marks at
$1,804,252 while actually delivering $97,438, and doing so takes the token price down 99.7%.
It funds one year, once. The buyers receive no deduction and are left holding a near-worthless
asset.

The same goodwill donated directly delivers comparable dollars to a student, returns an
estimated $22,000–$37,000 of deductions to the givers, leaves nobody holding a loss, and
repeats annually. That comparison, not a change of heart, is what moved us.

---

## 3. Questions — charitable structure

**Q1. Vehicle.** Fiscal sponsor, community foundation named fund, or our own 501(c)(3)? Our
reading, consistent with the earlier governance decision, favours a fiscal sponsor or
community foundation initially. Please confirm or correct.

**Q2. Private foundation classification and IRC §4945(g).** An organisation funded principally
by one family risks classification as a private foundation, which as we understand it requires
IRS approval of scholarship selection procedures *in advance* of any grant to an individual.
Is that right, and does an existing public-charity sponsor avoid it cleanly? **This is the
question that most affects the timetable.**

**Q3. Related parties.** May any family member of the founder or of a board member ever
receive an award? We intend a written exclusion adopted before the first award regardless;
tell us if that is the wrong instrument or the wrong scope.

**Q4. Selection and control.** Who may choose recipients, on what published criteria, and may
the founder sit on that committee?

**Q5. State solicitation registration.** A public donation page solicits in every state. What
must be registered, and where, before it goes live?

**Q6. Paid solicitors.** We have concluded that percentage-based fundraising compensation is
off the table — the AFP Code bars paying as well as receiving it, 44 states license paid
solicitors and 38 require bonds of $10,000–$25,000, and at any realistic commission the
program ratio falls below the benchmark we would be citing. Please confirm, and identify what
attaches if flat-fee help is engaged later.

**Q7. Operating costs.** We propose capping operations at 10% of contributions, published
annually. Two structures are possible and we would like your view on which is cleaner:
(a) the sponsor takes its fee and we take nothing, funding operations from the LLC; or (b) we
hold our own exemption and take the 10%. Note that stacking both puts the program ratio at
78.7%, below the ~82% benchmark. Our current preference is (a).

**Q8. IRC §4958.** If any allocation ever compensates the founder or a board member, we intend
to satisfy all three limbs of the rebuttable presumption — disinterested approval with
recusal, comparability data from Form 990 filings, contemporaneous minutes. Is that sufficient
for a board this small, and does the answer change under private foundation rules (§4941)?

---

## 4. Questions — the token

**Q9. Does it launch at all?** The demand gate has not passed. If it does launch, we need a
written opinion on this specific structure — fixed supply, renounced ownership, no yield, no
promises of appreciation, a 40% unlocked founder hold — with a stated jurisdiction and a
decision about who may buy. Groundwork is in `docs/LEGAL-BRIEFING.md`. We would like the
analysis written so it can be re-run when the CLARITY Act resolves.

**Q10. May the treasury ever fund the scholarship?** If CARD launches, may the 50M treasury be
sold or granted to the charitable vehicle, and what does that do to Q2 and Q3?

**Q11. A pending contract change.** A parallel workstream proposes adding an immutable 2%
transfer fee to the token, with the treasury exempt. Beyond the technical objections we have
raised internally, does a transfer fee accruing to a treasury the founder controls change the
securities analysis in Q9?

**Q12. Issuer identity.** The governance record says the LLC should deploy the contract and
seed the pool, so that the deployer address does not contradict our own org chart. Confirm,
and tell us what else follows from the LLC being the issuer.

---

## 5. Questions — proposed personal transfers

Three transfers of 20,000,000 CARD each were contemplated from the founder's personal 100M:
(A) his brother, outright gift, no role in the project; (B) board member Matt Campbell, vested
over 3 years; (C) the paid CPA reviewer, vested over 3 years.

**Q13. Characterisation and documentation.** Is (A) a gift and are (B) and (C) compensation
for services? What should exist in writing at the time of transfer?

**Q14. Securities exposure.** At what point does distributing from a founder allocation stop
being a private transfer and start requiring securities analysis — number of recipients,
consideration, solicitation, or something else?

**Q15. The CPA grant.** Our governance document states the paid CPA reviewer is excluded from
holding tokens and is never described as independent. Proposal (C) contradicts it. **Our own
reading is that (C) should not proceed** — an unvested three-year stake gives the reviewer a
financial interest across the entire review period, and independence is not partially
preserved. Please confirm or correct.

**Q16. Entity of transfer.** Personally, or from the LLC? What changes on liability and
reporting?

**Q17. Recipient obligations.** The founder's holding is governed by a published sell policy;
recipients would be bound by nothing. Should transfer agreements bind them to the same terms,
and is such a restriction enforceable?

---

## 6. Three conflicts in our own records, unresolved

We would rather show you these than let you find them.

1. **Board size.** The governance record states "Decision taken: three." A parallel workstream
   describes five members. Not reconciled.
2. **Board grant size.** The governance record allocates **5,000,000 per member over two
   years**. §5 above contemplates **20,000,000 over three years** — four times the amount on a
   different schedule. Not reconciled.
3. **Scale figures.** Earlier documents assume a ~$20,000 project and a $10,000 capital
   contribution. The current decision is a **$3,000** liquidity seed, implying a $7,653 fully
   diluted valuation and a 20,000,000 grant marking at **$612**. Earlier figures are
   superseded wherever they conflict.

---

## 7. What we intend regardless of the answers

Stated so you can flag any problem with them.

- **No donation page is built and no funds are solicited** until a qualified recipient exists.
  We will not make a representation about deductibility we cannot substantiate.
- **Any vesting is enforced by contract, not by agreement.** A promise to vest is
  indistinguishable from an unlocked wallet to anyone examining the project.
- **No departure from a published policy happens silently.** Either the document is amended
  with the reasoning recorded, or the action conforms to it.

---

## 8. What we need back, in priority order

1. **Q1–Q2.** The vehicle and the §4945(g) exposure. Everything else waits on these.
2. **Q3–Q5.** What must be adopted and registered before a page goes live.
3. **Q15.** Confirmation that the CPA grant should not proceed.
4. **Q9–Q12.** Whether the token launches, and on what opinion.
5. **Q13–Q17.** The personal transfers, which are not urgent and should not be executed first.

---
*Prepared as a basis for professional advice. Nothing here is a legal conclusion.*
