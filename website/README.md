# The Cardinal's Promise — Companion Website

A static companion site for the memoir *The Cardinal's Promise* by Rob Brizzi.
No build step, no dependencies — just open the files or deploy the folder.

## Files

| File | What it is |
|------|------------|
| `index.html` | Landing page: hero, about the book, prelude excerpt, who it's for, foreword quote, author bio, newsletter signup |
| `read.html` | Free sample — the full Prelude ("The Cardinal") |
| `styles.css` | All styling (warm, literary, cardinal-red theme; responsive) |
| `main.js` | Footer year + newsletter form handler |

## Preview locally

```bash
cd website
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy (free options)

- **GitHub Pages:** push the repo, then in repo Settings → Pages, serve from
  the branch and set the folder to `/website` (or move these files to the repo
  root / a `/docs` folder).
- **Netlify / Vercel / Cloudflare Pages:** drag-and-drop the `website/` folder,
  or connect the repo and set the publish directory to `website`.

## Newsletter signup — already wired to Kit

The signup form **posts directly to your Kit account**, to the form named
**"Cardinal's Promise-Homepage"** (form id `9344249`,
`https://app.kit.com/forms/9344249/subscriptions`). Submitting an email adds the
subscriber in Kit, which handles the confirmation email.

To point it at a different Kit form, change the form's `action`, `data-sv-form`,
and `data-uid` in `index.html` (get these from Kit → the form → Embed → HTML).
To switch providers entirely (Mailchimp, Buttondown, etc.), replace the
`action` URL and keep an `<input name="email_address">` (or the provider's field
name).

## Other files

- `favicon.svg` — browser tab icon (cardinal mark).
- `robots.txt`, `sitemap.xml` — SEO; update the domain in both when you have one.
- `assets/` — drop real cover art, author photo, and the `og-image.png` social
  preview here (see `assets/README.md`).
- SEO: `index.html` includes canonical, Open Graph/Twitter tags, and Book
  structured data (JSON-LD). Update the `thecardinalspromise.com` placeholder
  URLs once your domain is set.

## Content notes

- All book text on the site (the Prelude and foreword line) is drawn from the
  manuscript and is **intended as a public marketing sample**. The rest of the
  book is not included here.
- The author bio is a draft generated from the manuscript — edit it to taste.
- Add real **buy links** (Amazon, Bookshop, etc.) in the "Get the Book" section
  of `index.html` once the book is published (currently marked "coming soon").
- Replace the CSS book-cover mockup and the author avatar with real artwork /
  a photo when you have them.
