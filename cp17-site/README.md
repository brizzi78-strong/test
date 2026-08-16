# cp17.org — the Cardinals Promise coin site

Three static pages. No build step, no dependencies, no JavaScript.

- `index.html` — the coin page (the promises, the fee, the disclaimer)
- `how-to-buy.html` — plain-English buying walkthrough
- `ledger.html` — addresses and gifts, filled in on launch day
- `style.css` — shared styling, light and dark
- `CNAME` — the custom domain for GitHub Pages

## On launch day

Replace the five "not launched yet" cells in `ledger.html`, and add the
contract address to `index.html`. Nothing else changes.

## Hosting

Any static host works. For GitHub Pages, serve this folder from a branch
root and set the custom domain to match `CNAME`.
