# Assets

Drop real artwork here to upgrade the site from its CSS placeholders:

- **`og-image.png`** (1200×630) — social-share preview image. Already referenced
  in `index.html`'s Open Graph / Twitter tags. Until you add it, social
  previews simply won't show an image.
- **`cover.jpg`** — the real book cover. To use it, replace the `.cover` mockup
  `<div>` in `index.html` with:
  `<img class="cover" src="assets/cover.jpg" alt="The Cardinal's Promise cover" />`
- **`author.jpg`** — a photo of Rob. To use it, replace the `.avatar` `<div>` in
  `index.html` with an `<img class="avatar" src="assets/author.jpg" alt="Rob Brizzi" />`.

PNG/JPG/WebP all work. Keep file sizes reasonable (< 300 KB each) for fast loads.
