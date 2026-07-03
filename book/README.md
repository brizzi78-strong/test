# The Brizzi House Books

Three connected picture books by Rob Brizzi. One core truth across all of
them: **love is a verb, and the promise is still being kept.**

| Book | Status | Files |
|---|---|---|
| **The Cardinal's Promise** | Written in Grok; two cover concepts saved here | `illustrations/cardinals-promise-cover-A/B.jpeg` |
| **The Promise: A Name to Grow Into** | Manuscript + mockup complete; most art final | `THE_PROMISE_manuscript.md`, `THE_PROMISE_mockup.html` |
| **Me and Dad: The Way It Should Have Been** | Manuscript + mockup complete; 5 pages need art | `ME_AND_DAD_manuscript.md`, `ME_AND_DAD_mockup.html` |

## How this folder works

- `*_manuscript.md` — the source of truth: page-by-page text, illustration
  notes, art inventory, KDP production checklist.
- `mockup-template*.html` — editable templates with `{{IMG:filename}}`
  tokens.
- `*_mockup.html` — generated, self-contained previews (images embedded);
  open in any browser. Regenerate after editing a template or swapping art:

  ```bash
  cd book && python3 -c "
  import base64, re
  for tpl, out in [('mockup-template.html','THE_PROMISE_mockup.html'),
                   ('mockup-template-dad.html','ME_AND_DAD_mockup.html')]:
      html = open(tpl).read()
      html = re.sub(r'\{\{IMG:([^}]+)\}\}',
          lambda m: 'data:image/jpeg;base64,' +
              base64.b64encode(open('illustrations/'+m.group(1),'rb').read()).decode(),
          html)
      open(out,'w').write(html)
  "
  ```

- `illustrations/` — the art. Files ending in `-lowres` are crops from chat
  screenshots: fine for previews, **must be replaced with full-resolution
  saves from Grok before print**.
