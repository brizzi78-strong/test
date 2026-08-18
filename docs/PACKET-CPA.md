# For the CPA — Cardinal's Promise / CP17

**From:** Rob Brizzi · **Prepared:** August 2026 · **Status:** questions, not decisions

Nothing below has been executed. Companion packets: `PACKET-COUNSEL.md` (legal),
`PACKET-BOARD.md` (governance). Supporting arithmetic: `CARD-DISSERTATION.md` §3a,
`DONATION-ROUTE.md`.

**A note on your role.** Our governance record states that the paid CPA reviewer is excluded
from holding tokens and is never described as independent. We intend to keep that. A proposal
to grant you 20,000,000 CARD is described in §4 and **our own reading is that it should not
proceed** — it is listed because it was contemplated, not because we are asking you to accept.

---

## 1. The asset, and what it is actually worth

**CARD** — an unlaunched fixed-supply ERC-20, 250,000,000 units, minted once, no mint function.
Not deployed, not listed, no trading market.

The launch pool is to be seeded with **$3,000**. In a constant-product pool the price is fixed
arithmetically by the two balances the issuer deposits, so:

| | |
|---|---|
| Opening price | **$0.0000306 per token** |
| Fully diluted valuation | **$7,653** |
| A 20,000,000-token grant marks at | **$612** |
| The same grant, sold immediately, realises | **~$500** |

*(An earlier draft used $20,000 FDV / $1,600 per grant on a larger assumed seed. Superseded.)*

**Realisable value diverges sharply from the mark, and the divergence is structural.** The
pool is the only place these tokens can be sold and it pays the first seller best. Three
20,000,000 grants sold in sequence realise **$500, $357 and $268** — $1,125 combined against a
$1,836 mark. This is not a liquidity discount that resolves with patience; it is the shape of
the curve.

---

## 2. Section 83(b) — the most time-sensitive item here

For any vesting grant, absent an election the recipient recognises income as each tranche
vests, at fair market value on each vesting date. An **83(b) election filed within 30 days of
grant** would instead fix income at grant-date value — approximately **$612 per 20,000,000
grant**.

**Q1.** Does 83(b) apply cleanly to a token grant of this kind?
**Q2.** If yes, what must each recipient file, and what must we provide them?
**Q3.** What is the exposure if the token appreciates substantially and no election was made?

**The 30-day window has no extension.** It must be answered before any grant is executed.

---

## 3. A specific risk that makes §2 urgent rather than merely important

The token's price is set by a small liquidity pool, and **anyone may create an additional pool
at any price they choose for roughly $100 plus gas.** Pool creation is permissionless — it is
the same property that makes the ownership renounce credible. A displayed price is therefore
cheap for a stranger to move and is not evidence that anyone paid it.

If fair market value at a vesting date were taken from such a feed: at a displayed $1.00, a
20,000,000 grant would show as **$20,000,000**, while the pool could pay about **$527,000** to
whichever holder sold first and less to everyone after.

**Q4.** Is that exposure real, or would a manipulated thin-market print fail as FMV?
**Q5.** Does it change your recommendation on 83(b), given an election now fixes ~$612?
**Q6.** What contemporaneous documentation should we create at grant date to support the $612
figure if it is later questioned?

The risk also runs in the *successful* case, which is why we raise it rather than assume it
away. Under $100,000 of genuine buying with no selling, a 20,000,000 grant marks at $721,701
on a price real buyers actually paid — a defensible valuation. A vesting third would be
**$240,579 of income**; selling that tranche realises **$71,684** and moves the price −90.8%.
That is the classic illiquid-appreciated-property trap, and it arrives on success.

---

## 4. The proposed transfers

Three transfers of 20,000,000 CARD from the founder's personal 100,000,000:

| | Recipient | Relationship | Terms |
|---|---|---|---|
| A | Founder's brother | family, no role | outright gift |
| B | Matt Campbell | board member | vested 3 years |
| C | Our CPA reviewer | paid reviewer | vested 3 years — **we believe this should not proceed** |

**Q7. Valuation support.** What documentation should support the $7,653 FDV and the $612 per
grant at transfer date, given no trading market exists?
**Q8. Reporting.** For the board grant: what is reportable, by whom, and when — at grant, at
each vesting date, or both? Is a 1099 required, and does it change if the transfer comes from
an LLC rather than personally?
**Q9. Gift treatment.** For the transfer to the founder's brother, at roughly $612 the annual
exclusion appears to cover it comfortably. Please confirm, and advise on his basis and what
records to keep.

**Note a conflict in our own records:** the governance document allocates **5,000,000 per
board member over two years**. The proposal above is 20,000,000 over three years — four times
the amount on a different schedule. It will be conformed or the document amended with reasons
recorded; it will not be executed silently against our own policy.

---

## 5. The charitable side, which is now the priority

We have decided to fund the scholarship by **direct donations rather than by selling token
treasury** (reasoning in `DONATION-ROUTE.md`). Expected vehicle is a fiscal sponsor or
community foundation rather than our own 501(c)(3), at least initially.

**Q10. Personally-paid expenses.** Below roughly $30,000 raised per year, a 10% operating cap
will not cover compliance costs, and the founder expects to pay the shortfall personally. Are
those expenses deductible as charitable contributions, and what substantiation is required?

**Q11. Reasonable compensation.** If any operating allocation ever compensates the founder or
a board member, we intend to satisfy all three limbs of the §4958 rebuttable presumption —
disinterested approval with recusal, comparability data from Form 990 filings of similar
organisations, contemporaneous minutes. What comparability data would you want to see, and
does the analysis change under private-foundation rules?

**Q12. Fund accounting.** We intend to track **restricted (donor-designated) funds separately
from unrestricted**, so that a gift given for scholarships cannot be spent on anything else.
What is the minimum bookkeeping setup that makes this real rather than nominal, and would you
recommend it before or after a sponsor is selected?

**Q13. Filing thresholds.** Under a fiscal sponsor, what filings fall to us versus the sponsor?
If we later hold our own exemption, at what revenue do we move from Form 990-N to 990-EZ to
990?

**Q14. Expense classification.** We intend to publish program / administrative / fundraising
percentages annually. What classification standard should we apply so the figures are
comparable to published charity ratios?

---

## 6. What we intend regardless of the answers

- **No donation solicited** until a qualified recipient exists. We will not represent
  deductibility we cannot substantiate.
- **Restricted funds are segregated**, not merely labelled.
- **Any vesting is enforced by contract**, not by verbal agreement.
- **No departure from a published policy happens silently** — amend with reasons, or conform.

---

## 7. What we need back, in priority order

1. **Q1–Q6 — the 83(b) question**, because the 30-day window is unextendable and everything in
   §4 waits on it.
2. **Q10–Q12** — the charitable bookkeeping, which gates the donation page.
3. **Q7–Q9** — valuation and reporting for the transfers, which are not urgent.
4. **Q13–Q14** — filings and classification, once a vehicle is chosen.

---
*Prepared as a basis for professional advice. Nothing here is a tax conclusion.*
