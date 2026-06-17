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

## Connect the newsletter signup

The signup form is currently a front-end placeholder. To collect real emails,
replace the `<form>` in `index.html` with your provider's embed:

- **Kit (ConvertKit):** paste your form's HTML/action URL.
- **Mailchimp:** use the embedded form action + hidden fields.
- **Buttondown / MailerLite / etc.:** set `action` to the provider's POST URL
  and keep the `name="email_address"` (or rename to the provider's field).

Then remove the `onsubmit="return handleSignup(event)"` placeholder.

## Content notes

- All book text on the site (the Prelude and foreword line) is drawn from the
  manuscript and is **intended as a public marketing sample**. The rest of the
  book is not included here.
- The author bio is a draft generated from the manuscript — edit it to taste.
- Add real **buy links** (Amazon, Bookshop, etc.) to the call-to-action buttons
  once the book is published.
- Replace the CSS book-cover mockup and the author avatar with real artwork /
  a photo when you have them.
