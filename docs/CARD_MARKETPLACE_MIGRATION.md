# From simulated marketplace to the CARD buy flow

The decision (August 2026) is to keep the existing simulated marketplace as
the foundation for the customer-facing CARD website rather than rebuild it,
replacing each simulated component with an approved provider connection, and
keeping it clearly labeled **Test Mode** until counsel, providers,
liquidity, and security are ready.

The app in question is the hosted prototype at
`card-community-marketplace.brizzi78.chatgpt.site`. This repo also contains
`invest/` ("Cardinal Trading"), a separate Robinhood-style demo with the same
simulated-account shape; both are covered by the warning below, and `invest/`
now carries a persistent Test Mode bar for the same reason.

This document is the seam map. It exists because one part of that plan does
not survive contact with either codebase, and that needs to be visible
before anyone starts wiring providers in.

## The one thing that cannot be swapped: the account model

The target product is explicitly **non-custodial** — "would not hold the
customer's money, identification documents, seed phrase, or private keys."

A simulated marketplace's core abstraction is usually the opposite of that:
a user account carrying a balance the platform holds and spends on their
behalf. In `invest/` this is literally `cashCents`
(`invest/src/api/server.ts`, `trading/src/service/`); in the hosted
prototype it is whatever backs "Demo balances" and "Demo Add funds" —
**this is the first thing to check there.** Holding
customer cash balances and executing orders against them is custody, and
custody is what triggers FinCEN registration, state money-transmitter
licensing, bonding, and audits. It is the single most expensive line a
project like this can cross, and it would be crossed by accident here — by
keeping the shell and swapping the pieces underneath it.

**So the migration is not six swaps. It is five swaps and one amputation:**
the platform-held balance model is removed, not connected to a provider.
What is genuinely worth keeping is the interface craft — the layout, the
flows, the polish, the one-button feel — and a backend-for-frontend pattern
that keeps browser JavaScript talking only to same-origin routes.

## Seam map

| Demo component | Replaced by | Must not |
|---|---|---|
| Demo wallet | Non-custodial wallet provider (connect, sign) | Ever hold or see the seed phrase or private key |
| Demo balances (`cashCents`) | On-chain balances read from the wallet address | Persist a platform-side spendable balance |
| Demo "Add funds" | Regulated card/bank on-ramp, delivering USDC **direct to the customer's wallet** | Route customer funds through any account we control |
| Demo trade (order engine) | Quote + swap against the CARD/USDC pool on a DEX | Match, hold, or net customer orders internally |
| Demo activity | Verified on-chain transaction history for the address | Present platform records as if they were chain records |
| Demo security (session cookie) | Real authentication, monitoring, alerting | Gate access to funds — there are no funds to gate |
| **Account + buying power + positions + P&L** | **Nothing — removed** | Survive the migration in any form |

## The customer-facing flow, once real

1. Customer clicks **Buy CARD**.
2. Regulated on-ramp provider handles identity verification and the card or
   bank payment.
3. Provider delivers USDC into the customer's own non-custodial wallet.
4. This site shows the CARD rate, provider fee, network fee, and expected
   amount received — including the token's own 2% transfer fee, and the
   fact that slippage tolerance must exceed it.
5. Customer approves the swap in their wallet.
6. A DEX converts USDC to CARD.
7. CARD appears in the customer's wallet.

The site provides interface, receipts, and support. It never touches the
money, the ID documents, or the keys.

## Before Test Mode can be switched off

Every one of these is a blocker, not a nice-to-have:

- [ ] A legally approved token and sale structure (counsel — the first call)
- [ ] A regulated on-ramp provider, contracted, with its own KYC/AML program
- [ ] A non-custodial wallet provider / connection standard
- [ ] A funded CARD/USDC liquidity pool (note: today's plan seeds CARD/ETH —
      a USDC pair is a separate pool and a separate seeding decision)
- [ ] Audited smart contracts (static analysis is done; an audit is not)
- [ ] KYC/AML posture and state-availability rules, written down
- [ ] Production security: real auth, monitoring, alerting, incident plan
- [ ] Fee-on-transfer swap paths verified against a live pool, not assumed

## Standing rules while in Test Mode

1. **The banner stays.** A persistent bar at the top of every screen says
   nothing here is real. It is removed in the same commit that switches the
   last provider from simulated to live, and not before.
2. **cardinalspromise.org does not change.** The proof page stays static,
   JavaScript-free, and separate. The marketplace is a different property on
   a different address — `app.cardinalspromise.org` is the natural home — and
   the page that makes verifiable claims must not become the page that takes
   money.
3. **A prototype host is not a production host.** A `*.chatgpt.site` address
   is fine for Test Mode and unfit for a real on-ramp: production needs a
   domain the company controls, certificates and headers it controls,
   logging, monitoring, and an incident path. Moving hosts is a blocker on
   the same list as the providers.
4. **No live claims in test copy.** Nothing in this app may state a price,
   a return, an availability date, or a partner relationship that does not
   exist yet.

## Test Mode copy review (August 2026, from screenshots)

The prototype's labeling discipline is strong and should be preserved
verbatim through the migration: TEST MODE on every card, "Demonstration
balance · No cash value," "Illustrative amount," "Test rate," "User
approval required before anything moves," "CARD never sees or stores a
seed phrase," and the block statement that no wallet, payment, identity,
exchange, or blockchain service is active. Four things still need to
change.

### 1. The illustrative rate implies a valuation ~500x the plan

The trade card shows **1 USDC = 25 CARD** — a $0.04 token. Against the
fixed 250,000,000 supply that is a **$10,000,000 implied market cap**.
The actual launch plan is roughly $8,000 of liquidity against the
100,000,000 CARD pool: about **$0.00008 per CARD**, a ~$20,000 implied
cap, and about **12,500 CARD per USDC**.

"Test rate" does not neutralise this. A screenshot of that number is a
price anchor, and the gap between it and launch reality is the kind of
thing that reads as a promise made and broken. Use numbers in the right
order of magnitude, or use obviously non-numeric placeholders.

### 2. The quote omits the token's own 2% fee

"Estimated costs — shown before approval" is not enough for a page that
promises a "complete test quote." The real breakdown must show, as
separate lines: the provider's on-ramp fee, the network fee, the DEX fee
(0.3%), **CARD's own 2% transfer fee**, and the resulting minimum
received. It must also surface the slippage requirement — a default
0.5% tolerance cannot clear a 2% fee, which is the single most likely
cause of a failed first purchase.

### 3. Embedded wallets contradict the other site, and raise a recovery question

The wallet flow offers sign-in by email or phone with an embedded
non-custodial wallet, "without asking most users to manage twelve
recovery words." That is a legitimate and much friendlier pattern — but
`cardinalspromise.org/how-to-buy` currently tells readers to write their
twelve words on paper and never share them. Two official properties
giving opposite wallet advice is a support problem and a trust problem;
one of them has to change.

The diligence question for the provider contract, which decides whether
this is non-custodial in substance and not just in form:

- Can the customer **export** their key and leave?
- If the customer loses access, who can recover the funds — and can that
  party move funds without the customer?
- Can CARD, alone or with the provider, ever move a customer's tokens?

If the answer to the last one is anything but a flat no, the custody
analysis changes and counsel needs to know before signing.

### 4. "Use CARD" and "Participating partners — real utility"

Both describe a merchant network that does not exist. Promised future
utility delivered by the issuer's efforts is the classic shape
regulators look for. Until partners exist and are named, this reads as
an aspiration and must be written as one.
