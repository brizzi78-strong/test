# Bookstore — the marketplace

Publishers, authors, and members list books; buyers pay in **USD** or in
**CARD** ([`../contracts/CardinalsPromise.sol`](../contracts/CardinalsPromise.sol)).

This is the buildable core of the platform brief. The reasoning behind what's
here — and what's deliberately not — is in
[`../BOOKSTORE_PLATFORM_PLAN.md`](../BOOKSTORE_PLATFORM_PLAN.md). Short version:

## Three design rules, and why they matter

1. **Prices are denominated in USD.** A book costs $24.00. The CARD amount is
   derived at checkout from a quote that expires (default 15 minutes). This
   keeps CARD the payment rail rather than the unit of speculation, and shields
   sellers from volatility between "add to cart" and "transaction confirmed."

2. **CARD payments are non-custodial.** The buyer sends CARD from their own
   wallet to the seller's address and submits the transaction hash. This service
   records that hash as a receipt reference; it never holds anyone's funds.
   Holding user funds is what makes a platform a money transmitter — so it
   doesn't.

3. **Paying in CARD earns a discount, not a dividend.** `CARD_DISCOUNT_BPS`
   (default 500 = 5%) takes money *off the price*. There is no profit-sharing,
   holder distribution, staking, or yield anywhere in this module. A discount is
   ordinary commerce; a profit share would make CARD a security.

**Recorded ≠ verified.** A submitted transaction hash moves nothing. The order
stays `pending_payment` with `cardPayment.verified: false` until
`verify-payment` confirms it was actually seen on-chain (an operator today; a
chain indexer later). The service never treats a buyer's claim as settled money.

## Run it

```bash
npm start                                   # PORT default 5000 (in-memory store)
BOOKSTORE_DB=/path/data.db npm start        # durable SQLite
BOOKSTORE_USER=admin BOOKSTORE_PASSWORD=… npm start   # gate seller/admin routes
CARD_DISCOUNT_BPS=750 npm start             # 7.5% CARD discount (capped at 50%)
npm test
npm run typecheck
```

Open `http://localhost:5000` for the storefront: browse, add to cart, choose USD
or CARD, and — for CARD — get a quote and submit a transaction hash.

## HTTP API

| Method & path | Purpose |
|---|---|
| `GET /health`, `GET /api/meta` | Liveness; discount rate, quote TTL, and the "not an investment" notice. |
| `POST /api/sellers` · `GET /api/sellers[?kind=]` · `GET /api/sellers/:id` | Publishers, authors, members. |
| `POST /api/books` · `GET /api/books?q=&genre=&format=` · `GET /api/books/:id` | Catalog. |
| `GET /api/books/:id/listings` | Every seller's offer of one book, cheapest first. |
| `POST /api/listings` · `GET /api/listings?bookId=&sellerId=` · `GET /api/listings/:id` | Offers. |
| `POST /api/listings/:id/update` | Change price, stock, or active flag. |
| `POST /api/orders` | Place an order (reserves stock). |
| `GET /api/orders[?status=&buyerEmail=]` · `GET /api/orders/:id` | Order history. |
| `POST /api/orders/:id/quote` | Quote the USD total in CARD at `centsPerCard`. Expires. |
| `POST /api/orders/:id/card-payment` | Record a `txHash` against a live quote. Does **not** mark paid. |
| `POST /api/orders/:id/verify-payment` | Confirm the payment on-chain → `paid`. |
| `POST /api/orders/:id/mark-usd-paid` | Settle a USD order. |
| `POST /api/orders/:id/fulfill` · `/cancel` · `/refund` | Fulfilment. Cancel returns stock. |

When `BOOKSTORE_USER`/`BOOKSTORE_PASSWORD` are set, seller and fulfilment routes
require the login; **browsing, ordering, and paying stay open** — buyers have no
account.

## Order lifecycle

```
pending_payment ──▶ paid ──▶ fulfilled
       │              │           │
       ▼              ▼           ▼
   cancelled       refunded    refunded
   (stock back)
```

Stock is reserved when the order is placed and returned only on cancel — a
fulfilled or refunded book has already left the shelf.

## Not built here, on purpose

- **No trading desk.** No order book, no swap UI, no custody. Link to the
  Uniswap pool from `../TOKEN_LAUNCH_STRATEGY.md` instead.
- **No profit-sharing or rewards ledger.** See the plan doc.
- **No on-chain verification.** `verify-payment` is the seam where a chain
  indexer plugs in; it needs an RPC endpoint and isn't wired up.
- **No USD payment rail.** `mark-usd-paid` records settlement; integrating
  Stripe or similar is a separate piece.

## Honest scope note

Working scaffolding, not a compliance program. Before taking real money in any
currency, get a securities attorney's read on CARD's classification and confirm
sales-tax handling for book sales. The design above exists to make those
conversations short — not to substitute for them.
