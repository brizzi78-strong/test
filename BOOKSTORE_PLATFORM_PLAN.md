# Book Marketplace + CARD — platform plan

Architecture and build order for the book marketplace described in the platform
brief, with CARD ([`contracts/CardinalsPromise.sol`](contracts/CardinalsPromise.sol))
accepted as a payment method.

This plan splits the brief into three buckets: what is safe to build now, what
needs restructuring first, and what needs a securities lawyer before a line of
code. That split is the whole point of the document.

## The compliance line, stated once

Two features in the original brief change CARD's legal character. Everything
else in the brief is ordinary e-commerce.

### Build now — ordinary commerce

| Feature from the brief | Status |
| --- | --- |
| Marketplace of books across genres and authors | Safe. This is a store. |
| Authors/publishers connecting directly with readers | Safe. |
| Buying titles from publishers or other members | Safe (marketplace/consignment). |
| CARD accepted **as payment** for books | Low risk — see "Token as payment" below. |
| Community events, contests, challenges | Safe, if prizes aren't investment returns. |
| Discounts and perks for CARD holders | Safe. A discount is not a dividend. |

### Restructure before building

**"A user-friendly interface for buying, selling, and trading our cryptocurrency."**

Operating the venue where users trade — and particularly custodying their funds
to do it — is money transmission. Federally that means FinCEN MSB registration;
at state level it means money transmitter licenses, which in practice is a
~49-state, multi-year, multi-million-dollar bonding exercise. If the token is
also deemed a security, add broker-dealer/ATS registration on top.

**The restructure:** don't be the exchange. Link out to the existing Uniswap
pool that `TOKEN_LAUNCH_STRATEGY.md` already plans. Users trade in their own
wallet, on infrastructure you don't operate and funds you never hold. You get
the same user outcome ("I can get CARD") with none of the licensing surface.

**Non-custodial is the load-bearing rule:** the platform never holds a user's
CARD or ETH. Payments arrive wallet → merchant address directly; the platform
records the transaction hash as a receipt. This one decision keeps the
marketplace out of money-transmitter territory.

### Needs a securities lawyer before building

**"A rewards system that distributes a portion of our profits back to the community."**

Under *SEC v. Howey*, an investment contract is (1) an investment of money,
(2) in a common enterprise, (3) with an expectation of profits, (4) derived from
the efforts of others. A token that pays holders a share of company profits hits
all four. That makes CARD a security, and selling it without registration or a
valid exemption is the exposure that ends crypto projects.

Today's contract has **no profit-sharing mechanism**, which is exactly why it
reads as a utility token. Adding one is not a feature change; it is a change of
regulatory category.

**The alternative that delivers the same thing:** community benefit as a
*discount*, not a *distribution*.

| Profit-share (avoid) | Discount (safe) |
| --- | --- |
| "Hold CARD, receive X% of our profits" | "Pay in CARD, get X% off your order" |
| Value flows from company earnings | Value flows from a lower price |
| Expectation of profit → security | Merchant discount → ordinary commerce |
| Needs SEC registration or exemption | Needs no securities filing |

Buyers feel the same benefit. The legal character is entirely different. The
marketplace module implements the discount version.

### "No limits on the amount we're willing to contribute"

This should not ship as written, for two independent reasons:

1. **It is unsustainable.** An uncapped commitment against unknown revenue has
   no floor.
2. **It is a promise you may not be able to keep.** Public, unbounded financial
   commitments that later go unmet are the raw material for fraud and
   misrepresentation claims — the gap between what was promised and what was
   delivered *is* the case.

**Replace with a bounded, published formula**, e.g. "15% of net marketplace
revenue, reviewed quarterly, published on-chain or in a public ledger." Bounded
and verifiable builds more trust than unlimited and vague — and you can raise a
published number later, which reads as generosity. You cannot quietly lower an
unlimited one.

## Token as payment — how it works here

Design constraints that keep CARD a payment method rather than an investment:

- **Prices are denominated in USD.** A book costs $18.00. It does not cost
  "1,200,000 CARD." This matters: USD pricing makes CARD the payment rail, not
  the unit of speculation, and it protects the seller from volatility.
- **A quote converts USD → CARD at checkout and expires** (default 15 minutes).
  Outside the window, the buyer re-quotes. This is how every crypto payment
  processor handles volatility.
- **Payment is non-custodial.** The buyer sends CARD from their own wallet to
  the seller's (or platform's merchant) address and submits the transaction
  hash. The platform records the reference; it never holds the funds.
- **Recorded ≠ verified.** An order moves to `paid` only after the on-chain
  transaction is confirmed. The service records the hash immediately and marks
  it `verified: false` until an operator or chain indexer confirms it — the
  module is explicit about which of those two states an order is in, rather than
  pretending a submitted hash is settled money.

## Build order

1. **Marketplace core** — sellers, books, listings, orders, USD checkout.
   *(Built: [`bookstore/`](bookstore/).)*
2. **CARD as payment** — quotes, non-custodial payment records, the CARD
   discount. *(Built, same module.)*
3. **On-chain verification** — a small indexer that watches the merchant
   address and flips `verified` when a transaction confirms. Needs an RPC
   endpoint; not built here.
4. **Author/publisher onboarding** — self-serve listing creation, payout
   details. Extends the seller model.
5. **Community events/contests** — separate module. Keep prizes as books,
   discounts, or CARD-as-currency; not as a share of revenue.
6. **Anything involving profit distribution** — only after written advice from
   a securities attorney.

## What is deliberately not built

- **No trading desk.** No order book, no swap interface, no custody of user
  funds. Link to Uniswap.
- **No profit-sharing ledger.** No holder distributions, no yield, no staking
  rewards.
- **No price prediction or return language** anywhere in the UI copy.

These are omissions by design. Each one is a licensing or registration
requirement avoided.

## Honest scope note

This is working scaffolding, not a compliance program. Before taking real money
in any currency: talk to a securities attorney about CARD's classification,
confirm sales-tax handling for book sales, and have someone review the merchant
payment flow. The design above is built to make those conversations short and
cheap — but it does not replace them.
