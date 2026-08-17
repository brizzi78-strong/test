# hopecoin.org — the Hope coin site

The official domain is `hopecoin.org`, registered and owned by the
founder. `hopecoin.com` was still unregistered at last check — buying it
as a defensive forward is cheap insurance against look-alike sites.
`cp17.org`, the LLC's own name, should also forward here.

Three static pages. No build step, no dependencies, no JavaScript.

- `index.html` — the coin page (the promises, the fee, the disclaimer)
- `how-to-buy.html` — plain-English buying walkthrough
- `ledger.html` — addresses and gifts, filled in on launch day
- `style.css` — shared styling, light and dark
- `CNAME` — the custom domain for GitHub Pages

## Before launch

Add the dedication photo at `assets/hope.jpg` — `index.html` references
it (with Hope's consent, on record). Until the file exists the coin page
shows a broken image at the dedication.

## On launch day

Replace the "not launched yet" cells in `ledger.html`, and add the
contract address to `index.html`. Point the Buy button on `index.html`
and the Uniswap link in `how-to-buy.html` at
`https://app.uniswap.org/swap?outputCurrency=<contract address>` so the
swap opens with HOP pre-selected (how-to-buy promises "two taps").
Nothing else changes.

## Hosting

Any static host works. For GitHub Pages, serve this folder from a branch
root and set the custom domain to match `CNAME`.
