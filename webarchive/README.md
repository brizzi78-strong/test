# webarchive — preserving what a page said, when it said it

`wayback.mjs` collects archived copies of a public web page across a date range
and writes them to disk with enough provenance that someone else can check your
copy against the archive themselves.

Marketing pages change constantly and silently. If you want to show what a page
claimed on a particular day — a price, a qualifier, a capability — a screenshot
proves very little and a link to a live URL proves nothing at all, because the
live page is no longer the page you read. This collects the archived bytes and
records where they came from.

## Quick start

```bash
# Every distinct version of the Model Y page across 2024 and 2025
node webarchive/wayback.mjs --url tesla.com/modely --from 2024 --to 2025

# The tesla.com homepage through September 2025
node webarchive/wayback.mjs --url tesla.com --from 20250901 --to 20250930

# See what captures exist before downloading anything
node webarchive/wayback.mjs --url tesla.com/modely --from 2024 --list-only
```

Run `--help` for the full option list. Useful ones:

| Option | Effect |
| --- | --- |
| `--from` / `--to` | Range bound, as `YYYY`, `YYYYMM`, `YYYYMMDD`, or a full 14-digit stamp |
| `--limit <n>` | Cap on distinct captures (default 200) |
| `--match prefix` | Collect every path under the URL, not just the URL itself |
| `--keyword <word>` | Extra term to flag during extraction; repeatable |
| `--delay <ms>` | Pause between downloads (default 2000 — archive.org rate-limits) |
| `--list-only` | Query the index, print captures, download nothing |
| `--refetch` | Re-download captures already cached on disk |

## What you get

```
webarchive/evidence/<slug>/
├── captures/
│   ├── 20240115000000.html    raw archived bytes, one file per capture
│   └── 20250310000000.html
├── manifest.json              hashes, URLs, and extracted fields per capture
└── timeline.md                readable change log
```

`timeline.md` is the one to read first. Per capture it gives the archive URL,
the hashes, the price as displayed *with the words around it*, the fine print,
and — the point of the exercise — what changed since the previous capture:

```
Changed since previous capture:
  - **displayedPrices**: `$44,990` → `$59,990`
  - **keywordsPresent**: `removed: savings, gas savings, estimated, after` → `added: range, epa`
```

## Why the output is checkable

Three things make a capture verifiable rather than merely asserted:

- **The bytes are unmodified.** Captures are fetched with Wayback's `id_`
  modifier, which returns the archived response as crawled — no injected
  banner, no rewritten links. What lands on disk is what the server sent.
- **Two independent hashes.** `manifest.json` records `cdxDigest` (archive.org's
  own digest, computed at crawl time) alongside `sha256` (computed here over the
  received bytes). Anyone can re-download the same archive URL and reproduce
  both.
- **The query is recorded.** The exact CDX index URL is written into the
  manifest and the timeline, so the selection of captures is reproducible too —
  not just the captures themselves.

The index query uses `collapse=digest`, which folds runs of byte-identical
captures into their first occurrence. A page crawled a thousand times that
changed four times yields four captures, and those are the dates that matter.

## Using this to document advertising claims

If the question is what a page advertised on a given date, collect the whole
range rather than the dates that look interesting — a record with gaps invites
the argument that you picked your captures. Then read `timeline.md` for the
dates a number or a qualifier moved, and read the raw captures for those dates.

The extractors pull out displayed prices with surrounding context, footnote and
asterisked text, and sentences containing conditioning terms (`estimated`,
`after`, `excludes`, `subject to`, `may vary`, and similar). A price is never
recorded bare: `$44,990` on its own establishes nothing, while
`$44,990 after estimated gas savings*` is the actual claim, and the qualifier is
usually within a few words of the number.

**The extractors describe; they do not judge.** No output field says whether a
claim was misleading, and that is deliberate. Whether a given presentation is
deceptive is a legal question that turns on the net impression on a reasonable
consumer, on what a disclosure said and how prominent it was — not on anything
a regex can decide. A tool that pre-labelled its findings would weaken the
record it exists to build. Draw the conclusions yourself, on the evidence.

### What this does not establish

Be clear-eyed about the limits before relying on any of it:

- **The Wayback Machine is not a notary.** A capture is good evidence of what a
  crawler received, not a self-authenticating record. Courts have admitted
  Wayback captures, generally with testimony or an affidavit from the Internet
  Archive. If the record is headed somewhere formal, ask about their
  [standard affidavit process](https://help.archive.org/) rather than relying on
  a downloaded file.
- **Archived pages are often incomplete.** Crawlers miss images, stylesheets,
  and scripts. A page that rendered its price client-side may archive as a shell
  with the numbers only in embedded JSON — which is why `embeddedPriceFields`
  exists, and why the raw bytes are always kept.
- **A capture is a snapshot, not the whole story.** Pages are personalised and
  A/B tested. What the crawler saw is not necessarily what any particular
  customer saw, and it says nothing about geography or logged-in state.
- **Absence of a capture proves nothing.** Gaps in the archive mean the crawler
  did not visit, not that the page did not exist or did not change.

## Network access

The script needs to reach `web.archive.org`. **Claude Code cloud sessions cannot
reach it under the default network policy**, which allows only package
registries, GitHub, and cloud SDKs — the collector will fail with
`could not reach the Wayback index` rather than write a partial record.

To allow it, edit the environment from the selector at
[claude.ai/code](https://claude.ai/code), set **Network access** to **Custom**,
and add to **Allowed domains**:

```text
web.archive.org
archive.org
```

Check **Also include default list of common package managers** to keep the
Trusted defaults alongside your additions. See
[Configure cloud environments](https://code.claude.com/docs/en/cloud-environments#allow-specific-domains)
for the full walkthrough. Running the script on your own machine needs none of
this.

Behind a corporate proxy, Node's `fetch` does not read `HTTPS_PROXY` unless you
ask it to: `NODE_USE_ENV_PROXY=1 node webarchive/wayback.mjs ...` on Node
versions that support it.

## Tests

```bash
node --test webarchive/wayback.test.mjs
```

The tests drive the real script against a local stub standing in for
archive.org, via the `WAYBACK_BASE` environment variable, and check what an
evidence consumer would check: that captures round-trip byte-for-byte, that the
recorded `sha256` matches the file on disk, that the timeline notices a price
that moved, and that a price is never recorded without its qualifier. Nothing in
the test suite touches the network.
