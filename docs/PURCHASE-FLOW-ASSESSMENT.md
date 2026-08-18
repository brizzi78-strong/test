# Assessment — the proposed CARD purchase flow

**Status:** assessment of a proposal. Nothing here is built; the website's Buy button is
currently a simulation. This document exists to price the proposal before anyone integrates
a provider.

---

## 1. The proposal, as stated

1. Customer clicks **Buy CARD**
2. A regulated payment provider handles identity verification and the card/bank payment
3. The provider delivers **USDC** into the customer's non-custodial wallet
4. The site shows exchange rate, provider fees, network fee, and expected amount received
5. The customer approves the swap
6. A decentralised exchange converts USDC → CARD
7. CARD appears in the customer's wallet

`Debit card/bank → regulated on-ramp → USDC → CARD liquidity pool → customer wallet`

CARD Technologies supplies interface, marketplace, receipts and support, and holds no
customer money, identity documents, seed phrase or private keys.

---

## 2. What is right about it

**The non-custodial posture is the correct call and should be preserved in any revision.**
Not touching customer funds, documents, or keys is what keeps this out of money-transmitter
licensing, and delegating KYC/AML to a licensed on-ramp puts that obligation where the
licence already is. Step 4 — disclosing rate, fees and expected receipt *before* approval —
is the right instinct and is what most token front-ends omit.

Nothing below argues against the architecture. It argues that the pool the architecture
points at cannot serve it.

---

## 3. The finding that governs everything else

In a constant-product pool, **slippage is exactly the buy size divided by the pooled quote
asset**: `slippage = X / E`. Not an approximation. Pool depth is therefore not an
implementation detail — **it is the product specification.**

Against the decided $3,000 seed (98,000,000 CARD):

| Customer buys | CARD received | Slippage | All-in cost (+2% fee, +0.3% DEX, +3% on-ramp) |
|---|---|---|---|
| $50 | 1,606,557 | 1.7% | 7.1% |
| $100 | 3,161,290 | 3.3% | 8.9% |
| $500 | 14,000,000 | 16.7% | 22.9% |
| **$1,000** | 24,500,000 | **33.3%** | **40.5%** |
| $3,000 | 49,000,000 | 100.0% | 110.8% |

**Step 4 is what makes this fatal rather than merely bad.** Disclosing honestly on a $1,000
purchase means displaying that the customer pays roughly 40% above the quoted rate. That
screen does not convert. A screen that hides it is not a conversion improvement, it is a
disclosure failure.

### 3.1 There is no buy size that works at $3,000

Small purchases are destroyed by the on-ramp's *fixed* minimum fee (~$3.99); large ones by
slippage. The two curves cross, and the crossing point is the best a customer can possibly do:

| Pool | Best-case purchase | On-ramp | Fees | Slippage | **Cost floor** |
|---|---|---|---|---|---|
| **$3,000** | $109 | 3.6% | 2.3% | 3.6% | **9.6%** |
| $25,000 | $316 | 3.5% | 2.3% | 1.3% | 7.1% |
| $100,000 | $632 | 3.5% | 2.3% | 0.6% | 6.4% |

**At the decided seed, the best experience available to any customer, at the single optimal
purchase size, is a 9.6% haircut.** Every other amount is worse.

### 3.2 The transfer fee sets a floor no liquidity can lift

The 2% fee in the pending contract revision is a constant, so it survives any amount of
pool depth:

| Pool | Cost floor **with** the 2% fee | **without** it |
|---|---|---|
| $3,000 | 9.6% | 7.6% |
| $25,000 | 7.1% | 5.1% |
| $100,000 | 6.4% | **4.4%** |

Adding liquidity has sharply diminishing returns because the fee and the on-ramp dominate
once slippage is small. **The fee costs every retail customer two points, permanently.**

### 3.3 If the flow ships anyway, the purchase cap is not optional

`max honest purchase = slippage tolerance × pool`:

| Pool | 1% slippage | 2% | 5% |
|---|---|---|---|
| **$3,000** | **$30** | **$60** | $150 |
| $25,000 | $250 | $500 | $1,250 |
| $100,000 | $1,000 | $2,000 | $5,000 |

At $3,000 the honest maximum purchase is **$60**, which sits at or below the practical
minimum for a card transaction once the fixed on-ramp fee is counted. **The window of valid
purchase sizes is effectively empty.** A cap must be enforced in the interface at whatever
depth is chosen; without one the interface will quote prices the pool cannot honour.

---

## 4. The 2% fee may make the flow impossible, not merely expensive

Independently of cost: a fee-on-transfer token breaks the standard Uniswap V2 sell and swap
paths, which revert with `UniswapV2: K` unless the `SupportingFeeOnTransferTokens` variants
are used, and default slippage tolerances (0.5%) fail on every trade. On-ramp providers that
auto-swap, and aggregators generally, call standard routers.

**The transfer fee and the Buy button are close to mutually exclusive** unless custom swap
routing is built — which puts CARD Technologies further into the transaction, worsening §5.
This should be settled before either is committed to.

---

## 5. "Seamless" and the legal posture pull in opposite directions

The non-custodial design defends against money-transmission exposure. It does **not** speak
to who the issuer and seller are.

On these facts CARD Technologies created the token, holds 100,000,000 of it, operates the
website, runs the marketing, and supplies "the marketplace, receipts and support." Which
server the USDC passed through is not the question that gets asked. **The more completely the
interface presents seven regulated steps as one button, the more clearly the operator of that
button is selling the token.** The engineering goal and the legal goal are in direct tension,
and that tension should be named rather than designed around.

Two specifics:

- **"Marketplace" is a word to strike** unless counsel is comfortable with it. A venue
  bringing buyers and sellers together implicates exchange and broker-dealer analysis. If the
  site is a storefront for the operator's own token, describing it as one is both more
  accurate and safer.
- **"A legally approved token and sale structure"** is listed as one prerequisite among seven.
  No such approval exists. What exists is an opinion of counsel about risk, on precisely the
  fact pattern above, and obtaining one is the majority of the work on the list.

---

## 6. The prerequisite list, re-costed

| Stated prerequisite | Real state |
|---|---|
| Legally approved token and sale structure | No such approval exists; needs an opinion on §5. **The gating item.** |
| Regulated on-ramp provider | Available (MoonPay, Transak, Stripe, Coinbase). Will impose its own listing review. |
| Non-custodial wallet provider | Available (Privy, Dynamic, Turnkey). Confirm embedded wallets remain non-custodial as configured. |
| CARD/USDC liquidity pool | **Exists only at $3,000. Needs $25,000–$100,000 to be usable.** |
| Audited smart contracts | Static analysis only so far. An audit is weeks and thousands of dollars. |
| KYC/AML and state availability | Mostly the provider's, but state availability constrains who may buy. |
| Production security and monitoring | Real but ordinary. |
| **Missing from the list** | **Purchase cap enforcement (§3.3), and resolving the fee/router conflict (§4).** |

---

## 7. The question underneath

`DONATION-ROUTE.md` concluded that the scholarship is funded by direct donations rather than
by the token, because the token delivers less, once, at the cost of the people who bought it.
This flow is a retail acquisition funnel for that same token.

If the token is now a product in its own right rather than the mission's funding mechanism,
that is a legitimate change — but it is a harder position, not an easier one, because the
charitable framing was carrying weight and is gone. What remains is a company selling a
self-issued token to retail through a KYC'd funnel, needing $25,000–$100,000 of its own
capital in a pool to make the experience tolerable, with the launch gate in
`TOKEN_LAUNCH_STRATEGY.md` still unmet.

**That question should be answered before any provider is integrated**, because the answer
changes which prerequisites in §6 matter.

---

## 8. Recommendation

1. **Answer §7 first.** What the token is now for.
2. **Settle the fee (§4) before anything else technical.** It is close to a build/no-build
   flag for this flow, and it costs every customer two points forever.
3. **Do not integrate an on-ramp against a $3,000 pool.** The honest maximum purchase is $60
   and the cost floor is 9.6%. Either the seed rises to $25,000+ — a materially different
   capital decision from the one taken — or the buy button waits.
4. **Whatever depth is chosen, enforce the purchase cap in the interface** and keep step 4's
   disclosure exactly as proposed. It is the best thing in the design.
5. **Take §5 to counsel as a described fact pattern**, not as a question about custody.

---
*Engineering and structural assessment. Not legal, tax, or financial advice.*
