# cp17.org — the Cardinals Promise coin site

The official domain is `cp17.org` — the domain the founder already owns,
and a neutral name that keeps the token's address out of the book's search
results. (The token is CARD — the Hope name lives on
the physical-coin merch side, sold from the book's world, and never
names the on-chain token: HOP is Hop Protocol's established ticker.)

Three static pages. No build step, no dependencies, no JavaScript.

- `index.html` — the coin page (the promises, the fee, the disclaimer)
- `how-to-buy.html` — plain-English buying walkthrough
- `ledger.html` — addresses and gifts, filled in on launch day
- `style.css` — shared styling, light and dark
- `CNAME` — the custom domain for GitHub Pages

## On launch day

Replace the "not launched yet" cells in `ledger.html`, and add the
contract address to `index.html`. Point the Buy button on `index.html`
and the Uniswap link in `how-to-buy.html` at
`https://app.uniswap.org/swap?outputCurrency=<contract address>` so the
swap opens with CARD pre-selected (how-to-buy promises "two taps").
Nothing else changes.

## Hosting

Any static host works. For GitHub Pages, serve this folder from a branch
root and set the custom domain to match `CNAME`.
