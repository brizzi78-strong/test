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
