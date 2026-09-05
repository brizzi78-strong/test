# cp17.org — the Cardinals Promise coin site

The official token domain is `cp17.org`. The on-chain token is Cardinals
Promise (`CARD`). No other name, ticker, or domain is authoritative.

Three static pages. No build step, no dependencies, no JavaScript.

- `index.html` — the coin page (the promises, the fee, the disclaimer)
- `how-to-buy.html` — plain-English buying walkthrough
- `ledger.html` — addresses and gifts, filled in on launch day
- `style.css` — shared styling, light and dark
- `CNAME` — the custom domain for GitHub Pages

## On launch day (Saturday, October 4, 2026)

Replace the "not launched yet" cells in `ledger.html`, and add the
contract address to `index.html` only after source verification, the
600M treasury transfer, the pool seeded from the treasury wallet, the
fee-aware two-way swap test, LP lock, and renouncement. Point the Buy button
and the Uniswap link in `how-to-buy.html` at
`https://app.uniswap.org/swap?outputCurrency=<contract address>` so the
swap opens with CARD pre-selected (how-to-buy promises "two taps").

The contract charges an immutable 2% transfer fee to the treasury wallet on
every buy and every sell (transfers to or from the treasury are exempt).
Before publishing, make sure every page states that cost plainly — 2% on the
buy, 2% on the sell, plus Uniswap's 0.3% each way, about 4.5% round trip
before gas — and tells buyers to set slippage to at least 3%. Nothing else
changes.

## Hosting

Any static host works. For GitHub Pages, serve this folder from a branch
root and set the custom domain to match `CNAME`.
