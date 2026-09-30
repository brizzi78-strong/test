# Cardinal Expenses — landing page

The public marketing page for the expense app in [`expenses/`](../expenses).
One static HTML file: no build step, no dependencies, no server.

## Preview it

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server -d cardinal-expenses 8080   # http://localhost:8080
```

## Deploy

`render.yaml` publishes this folder as the `cardinal-expenses` static service —
free on Render, no plan required. Blueprint → connect the repo → Apply, and it
comes up at `https://cardinal-expenses-*.onrender.com`.

### Going live on expenses.thecardinalspromise.com

The blueprint already claims that subdomain. Two steps have to happen in
accounts this repo cannot reach, so they are yours to do:

1. **Apply the blueprint on Render** (New + → Blueprint → connect this repo →
   Apply). Render provisions the service and shows the DNS record it wants.
2. **Add the DNS record at your registrar** — a `CNAME` on the `expenses` host
   pointing at the `.onrender.com` hostname Render displays. HTTPS is issued
   automatically once the record resolves; it usually takes a few minutes.

**Why a subdomain.** `thecardinalspromise.com` is the book's established domain
— `LAUNCH.md` treats it as the trust signal for *The Cardinal's Promise*, and
the token page is already planned for `/card`. Putting expense software on the
apex would land visitors looking for the memoir on a B2B product page. If you
want the apex anyway, swap the `domains:` entry in `render.yaml` for
`thecardinalspromise.com` (plus `www.`) and give Render an `A` record instead
of the CNAME.

## Before pointing real traffic at it

- **Add a link to the running app.** The hero's primary button currently points
  at the "Run it" section, because there is no public instance yet. Once the
  `cardinal-expenses-app` service is deployed, swap that `href="#run"` for its
  URL and change the label to "Open the live demo".
- **Check the claims still hold.** The policy numbers on the page (receipts from
  $25, the $75/$350/$150/$100 caps, the $200 auto-approval ceiling, 70¢/mile)
  mirror `expenses/src/domain/policy.ts`. If you change the defaults there,
  change them here — or reword to "configurable" and drop the figures.
- **The test count is a fact, not a slogan.** "58 tests" comes from
  `npm test` in `expenses/`. Keep it honest as the suite grows.

## Notes

- Light and dark themes are both designed; the page follows the reader's
  system setting.
- Type is Archivo + IBM Plex Mono from Google Fonts, with system fallbacks, so
  the page still sets correctly if the font request is blocked.
- The hero animation (a report clearing its policy checks) is skipped for
  readers with `prefers-reduced-motion`, who see the settled result instead.
