# Real Purchase Flow — one "Buy" button, regulated providers underneath

Status: **design, not built.** Today the site simulates buying. This document
describes the architecture for real purchases, the open decisions, and the
things that must be true before the button can be turned on.

The naming in this doc follows the current repo: the token is **Hope Coin
(HOPE)**, and the operating entity is referred to here as **the company**
(named "CARD Technologies" in the original sketch — see *Open decision 4*).

## What the customer sees

1. Customer clicks **Buy HOPE**.
2. A regulated payment provider handles identity verification and the debit
   card / bank payment.
3. The provider delivers USDC into the customer's own noncustodial wallet.
4. The site shows the HOPE exchange rate, provider fees, the token's built-in
   2% transfer fee, the network fee, and the expected amount received.
5. The customer approves the swap.
6. A decentralized exchange converts USDC into HOPE.
7. HOPE appears in the customer's wallet.

## What actually happens

```
debit card / bank
      ↓
regulated on-ramp provider   ← KYC/AML, payment processing, state licensing
      ↓
USDC in the customer's noncustodial wallet
      ↓
DEX swap (fee-on-transfer path)
      ↓
HOPE in the customer's wallet
```

The company provides **the interface, the marketplace listing, receipts, and
support**. The company never holds the customer's money, identity documents,
seed phrase, or private keys. Every sensitive step is performed by a licensed
third party or by the customer's own wallet.

## Required before this can be switched on

- A legally approved token and sale structure
- A regulated on-ramp provider under contract
- A noncustodial wallet provider
- A HOPE/USDC liquidity pool (see *Open decision 1*)
- Audited smart contracts
- KYC/AML program and state-availability rules
- Production security and monitoring

## Open decisions

### 1. The pool pair: HOPE/USDC or HOPE/WETH?

`TOKEN_LAUNCH_STRATEGY.md` and the launch scripts currently create a
**HOPE/WETH** pool. This flow delivers **USDC**. Those don't meet without a
choice:

- **Create a HOPE/USDC pool** — one hop, one 2% token fee, simplest quote.
  Costs: the launch ETH has to become USDC, and WETH-pair buyers (the
  `how-to-buy.html` path) then route through two hops instead.
- **Keep HOPE/WETH and route USDC → WETH → HOPE** — two hops. Because HOPE
  charges 2% on *every* transfer, a two-hop route pays the token fee on the
  HOPE leg plus Uniswap's 0.3% on both legs. Worse pricing, more slippage.
- **Both pools** — splits already-thin liquidity across two pairs. Not
  advisable at a few thousand dollars of depth.

Recommendation: **one HOPE/USDC pool** if the on-ramp path is the primary way
people buy, since it matches the money people actually arrive with.

### 2. The quote must include the token's own 2% fee

HOPE is a fee-on-transfer token. The "expected amount received" in step 4 must
subtract, in this order: the on-ramp provider's fee, Uniswap's 0.3% pool fee,
price impact from the pool's depth, the **token's 2% transfer fee**, and the
network gas cost. Any swap must call the router's
`...SupportingFeeOnTransferTokens` variants; the standard swap functions revert
against a fee-on-transfer token.

Also note: most on-ramp providers will not route directly into a low-liquidity
token. They deliver a major asset (USDC/ETH) and the swap is a separate step
the interface orchestrates.

### 3. Where the swap is orchestrated

Two viable shapes, both keeping custody with the customer:

- **Embedded DEX widget / aggregator** in the page — the customer's wallet
  signs; the company writes no swap contract. Fastest, least new code, least
  new attack surface.
- **A thin router contract** the company deploys — better UX (one signature),
  but it is new unaudited code in the money path and must be audited.

Recommendation: start with the widget. A custom router is an optimization, not
a requirement, and it converts an interface into a piece of financial
infrastructure the company is responsible for.

### 4. The "interface only" posture is weaker here than for the Uniswap link

This is the part to take to counsel before building, not after. The current
shipped behavior — a link that opens Uniswap — is meaningfully different from
orchestrating an end-to-end purchase of a token that the same project issued
and profits from:

- The company **issued the token** and receives a **2% fee on every transfer**,
  so it takes economic value from each trade it facilitates.
- Presenting on-ramp + swap as one "Buy" button means the company is arranging
  the transaction, even though licensed parties execute the parts. Depending on
  structure and state, that can implicate broker-dealer, exchange, or money
  transmitter analysis, and the on-ramp's own terms may restrict routing into
  an issuer-affiliated token.
- `docs/LEGAL-BRIEFING.md` notes the current design "deliberately weakens
  several Howey prongs." A first-party purchase funnel plus a founder-issued
  fee strengthens the prongs it was built to weaken.

None of this means the flow can't be built. It means the sale structure and the
company's role must be reviewed by securities and money-transmission counsel
**before** any of it goes live, and the answer may shape the design (for
example: no first-party funnel, or a fee that flows only to a nonprofit
treasury, or geographic restrictions).

## What stays true regardless

The company never holds funds, keys, or ID documents. Every disclosure the
project already publishes — the 2% fee above the fold on cp17.org, the risk
disclosures in the app, the published treasury address — applies to this flow
too, and the fee arithmetic shown at step 4 must match what the pool actually
does.
