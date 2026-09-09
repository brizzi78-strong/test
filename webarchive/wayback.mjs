#!/usr/bin/env node
/**
 * Wayback snapshot collector — preserves archived copies of a public web page
 * over a date range, with enough provenance metadata that each capture can be
 * cited and independently re-verified.
 *
 * Why this exists: a marketing page changes constantly and silently. The claim
 * a page made on a given day is only demonstrable if you can point a third
 * party at the same bytes you read. This script does three things:
 *
 *   1. Enumerates the *distinct* captures via the Wayback CDX index. Archive.org
 *      may hold thousands of captures of a popular URL, but `collapse=digest`
 *      folds runs of byte-identical captures into one row, so what you get back
 *      is the list of moments the page actually changed.
 *   2. Downloads each distinct capture with the `id_` modifier, which returns
 *      the original archived bytes without Wayback's injected banner or its
 *      URL rewriting. What lands on disk is what the server sent.
 *   3. Records, per capture: the archive URL, the CDX digest archive.org
 *      computed at crawl time, and a SHA-256 this script computed over the
 *      bytes it received. Those two hashes agreeing across independent runs
 *      (or independent people) is what makes the copy checkable rather than
 *      merely asserted.
 *
 * It also runs a best-effort extraction pass over each capture, pulling out the
 * things an advertising record turns on: displayed prices, footnote and
 * disclaimer text, asterisked qualifiers, and range/savings/capability claims.
 * The extractors DESCRIBE, they do not judge — no output field says whether a
 * claim was misleading. That determination is the reader's, and a tool that
 * pre-labelled it would weaken the record it is trying to build.
 *
 * Extraction is genuinely best-effort: tesla.com and pages like it render much
 * of their content client-side, so an archived HTML file may carry only a shell
 * plus embedded JSON. That is why the raw bytes are always kept — the extract
 * is a convenience index into evidence, never a replacement for it.
 *
 * Usage:
 *   node webarchive/wayback.mjs --url tesla.com/modely --from 2024 --to 2025
 *   node webarchive/wayback.mjs --url tesla.com --from 20250901 --to 20250930
 *   node webarchive/wayback.mjs --url tesla.com/modely --from 2024 --list-only
 *
 * Exit codes: 0 on success, 1 on usage error or if every download failed.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const GREEN = "\x1b[32m", RED = "\x1b[31m", DIM = "\x1b[2m", BOLD = "\x1b[1m", RESET = "\x1b[0m";
const ok = (s) => `${GREEN}✔${RESET} ${s}`;
const bad = (s) => `${RED}✘ ${s}${RESET}`;
const note = (s) => `${DIM}${s}${RESET}`;

// --- Arguments ------------------------------------------------------------

const USAGE = `
Usage: node webarchive/wayback.mjs --url <url> [options]

Required:
  --url <url>          Page to collect, e.g. tesla.com/modely (no scheme needed)

Range:
  --from <ts>          Earliest capture. YYYY, YYYYMM, YYYYMMDD or 14 digits
  --to <ts>            Latest capture, same formats

Options:
  --out <dir>          Output root (default: webarchive/evidence)
  --limit <n>          Max distinct captures to take (default: 200)
  --match exact|prefix How to match the URL in the index (default: exact)
  --delay <ms>         Pause between downloads (default: 2000)
  --keyword <word>     Extra term to flag in extraction; repeatable
  --list-only          Query the index and print captures; download nothing
  --refetch            Re-download captures already cached on disk
  -h, --help           Show this message
`.trim();

function parseArgs(argv) {
  const opts = {
    url: null, from: null, to: null,
    out: path.join(root, "webarchive", "evidence"),
    limit: 200, match: "exact", delay: 2000,
    keywords: [], listOnly: false, refetch: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) fail(`${a} needs a value`);
      return v;
    };
    switch (a) {
      case "--url": opts.url = next(); break;
      case "--from": opts.from = next(); break;
      case "--to": opts.to = next(); break;
      case "--out": opts.out = path.resolve(next()); break;
      case "--limit": opts.limit = toInt(next(), "--limit"); break;
      case "--match": opts.match = next(); break;
      case "--delay": opts.delay = toInt(next(), "--delay"); break;
      case "--keyword": opts.keywords.push(next().toLowerCase()); break;
      case "--list-only": opts.listOnly = true; break;
      case "--refetch": opts.refetch = true; break;
      case "-h": case "--help": console.log(USAGE); process.exit(0);
      default: fail(`unknown argument: ${a}`);
    }
  }
  if (!opts.url) fail("--url is required");
  if (!["exact", "prefix"].includes(opts.match)) fail("--match must be exact or prefix");
  return opts;
}

function toInt(v, label) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) fail(`${label} must be a non-negative integer`);
  return n;
}

function fail(msg) {
  console.error(bad(msg));
  console.error(`\n${USAGE}`);
  process.exit(1);
}

// A Wayback timestamp is a 14-digit YYYYMMDDhhmmss. The API accepts shorter
// prefixes and widens them itself, so pass partial values straight through
// rather than guessing at the missing digits.
function normalizeStamp(v, label) {
  if (v === null) return null;
  if (!/^\d{4}(\d{2}){0,5}$/.test(v)) {
    fail(`${label} must be 4-14 digits (YYYY, YYYYMM, YYYYMMDD, ... ), got: ${v}`);
  }
  return v;
}

const opts = parseArgs(process.argv.slice(2));
opts.from = normalizeStamp(opts.from, "--from");
opts.to = normalizeStamp(opts.to, "--to");

const slug = opts.url.replace(/^https?:\/\//, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
const outDir = path.join(opts.out, slug);
const capturesDir = path.join(outDir, "captures");

// --- Network --------------------------------------------------------------

const UA = "wayback-snapshots/1.0 (archival research; contact via repository)";

// Overridable so the collector can be exercised end-to-end against a local
// stub. Left alone it always talks to the real archive.
const BASE = (process.env.WAYBACK_BASE ?? "https://web.archive.org").replace(/\/$/, "");

/**
 * archive.org rate-limits aggressively and answers 429/503 under load. Treat
 * those as retryable and back off; treat a 404 as a real answer.
 */
async function getWithRetry(url, { attempts = 4, accept = "*/*" } = {}) {
  let waitMs = 2000;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    let res;
    try {
      res = await fetch(url, { headers: { "user-agent": UA, accept }, redirect: "follow" });
    } catch (err) {
      if (attempt === attempts) throw new Error(`network error after ${attempts} attempts: ${err.message}`);
      console.log(note(`  network error (${err.message}), retrying in ${waitMs / 1000}s`));
      await sleep(waitMs); waitMs *= 2; continue;
    }
    if (res.ok) return res;
    const retryable = res.status === 429 || res.status === 503 || res.status >= 500;
    if (!retryable || attempt === attempts) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    console.log(note(`  HTTP ${res.status}, retrying in ${waitMs / 1000}s`));
    await sleep(waitMs); waitMs *= 2;
  }
  throw new Error("unreachable");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Step 1: enumerate distinct captures from the CDX index ---------------

function cdxQueryUrl() {
  const p = new URLSearchParams({
    url: opts.url,
    output: "json",
    fl: "timestamp,original,statuscode,digest,length",
    filter: "statuscode:200",
    // Fold runs of byte-identical captures into their first occurrence, so the
    // result is "when did this page change", not "when was it crawled".
    collapse: "digest",
    limit: String(opts.limit),
  });
  if (opts.from) p.set("from", opts.from);
  if (opts.to) p.set("to", opts.to);
  if (opts.match === "prefix") p.set("matchType", "prefix");
  return `${BASE}/cdx/search/cdx?${p}`;
}

async function fetchCaptureIndex() {
  const queryUrl = cdxQueryUrl();
  console.log(note(`Index query: ${queryUrl}`));
  const res = await getWithRetry(queryUrl, { accept: "application/json" });
  const body = await res.text();
  if (!body.trim()) return { queryUrl, rows: [] };

  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error(`index did not return JSON. First 200 chars:\n${body.slice(0, 200)}`);
  }
  // First row is the header; map by field name rather than by position so a
  // change to the API's column order cannot silently shift the data.
  const [header, ...rows] = parsed;
  if (!header) return { queryUrl, rows: [] };
  const col = Object.fromEntries(header.map((name, i) => [name, i]));
  return {
    queryUrl,
    rows: rows.map((r) => ({
      timestamp: r[col.timestamp],
      original: r[col.original],
      statuscode: r[col.statuscode],
      digest: r[col.digest],
      length: r[col.length],
    })),
  };
}

// --- Step 2: download each capture ---------------------------------------

// The `id_` modifier asks Wayback for the archived response as captured:
// no injected toolbar, no rewritten links. Anything else would mean hashing
// archive.org's presentation layer instead of the evidence.
const archiveUrlFor = (timestamp, original) =>
  `${BASE}/web/${timestamp}id_/${original}`;

const viewUrlFor = (timestamp, original) =>
  `${BASE}/web/${timestamp}/${original}`;

async function downloadCapture(row) {
  const file = path.join(capturesDir, `${row.timestamp}.html`);
  if (existsSync(file) && !opts.refetch) {
    const bytes = readFileSync(file);
    return { file, bytes, cached: true };
  }
  const res = await getWithRetry(archiveUrlFor(row.timestamp, row.original), { accept: "text/html,*/*" });
  const bytes = Buffer.from(await res.arrayBuffer());
  mkdirSync(capturesDir, { recursive: true });
  writeFileSync(file, bytes);
  return { file, bytes, cached: false };
}

// --- Step 3: extraction ---------------------------------------------------

// Terms whose presence or absence tends to be the whole question in an
// advertising record: what number was shown, what conditions were attached,
// and where the conditions were stated relative to the number.
const DEFAULT_KEYWORDS = [
  "savings", "gas savings", "fuel savings", "incentive", "tax credit", "rebate",
  "estimated", "potential", "after", "excludes", "excluding", "before",
  "lease", "financing", "apr", "destination", "order fee", "msrp",
  "full self-driving", "self-driving", "autopilot", "autonomous", "supervised",
  "range", "epa", "miles", "0-60", "top speed",
  "subject to", "terms", "may vary", "not all", "requires", "availability",
];

const stripTags = (html) =>
  html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/\s+/g, " ")
    .trim();

const firstMatch = (html, re) => {
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

const uniq = (arr) => [...new Set(arr)];

/**
 * Pull a window of text around each hit so a number is never recorded naked.
 * "$44,990" on its own proves nothing; "$44,990 after estimated gas savings"
 * is the actual claim, and the qualifier is usually within a few words.
 */
function contexts(text, re, window = 90) {
  const out = [];
  for (const m of text.matchAll(re)) {
    const start = Math.max(0, m.index - window);
    const end = Math.min(text.length, m.index + m[0].length + window);
    out.push({
      match: m[0],
      context: (start > 0 ? "…" : "") + text.slice(start, end).trim() + (end < text.length ? "…" : ""),
    });
  }
  return out;
}

function extract(html) {
  const text = stripTags(html);
  const keywords = uniq([...DEFAULT_KEYWORDS, ...opts.keywords]);
  const lower = text.toLowerCase();

  return {
    // Identity of the page as it described itself.
    title: firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    metaDescription: firstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i),
    ogTitle: firstMatch(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i),

    // Prices as displayed in rendered copy, each with surrounding words.
    displayedPrices: contexts(text, /\$\s?\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\$\s?\d{3,}(?:\.\d{2})?/g),

    // SPAs commonly ship their real numbers in embedded JSON even when the
    // visible HTML is an empty shell, so search the unstripped source too.
    embeddedPriceFields: uniq(
      [...html.matchAll(/"([a-zA-Z_]*(?:price|msrp|savings|discount|incentive)[a-zA-Z_]*)"\s*:\s*("?[\d.,]+"?)/gi)]
        .map((m) => `${m[1]}: ${m[2]}`)
    ).slice(0, 60),

    // Asterisks and footnote markers: where the qualifier usually hides.
    asteriskedText: contexts(text, /[^.!?]{0,80}\*[^.!?]{0,120}/g, 0).slice(0, 40),

    // Sentences carrying a conditioning term, which is the fine print itself.
    qualifierSentences: uniq(
      text.split(/(?<=[.!?])\s+/)
        .filter((s) => keywords.some((k) => s.toLowerCase().includes(k)))
        .map((s) => s.trim())
        .filter((s) => s.length > 12 && s.length < 400)
    ).slice(0, 60),

    keywordsPresent: keywords.filter((k) => lower.includes(k)),
    textLength: text.length,
  };
}

// Fields whose change between consecutive captures is worth calling out in the
// timeline. Long free-text blocks are compared by content, not shown inline.
const TRACKED = ["title", "metaDescription", "ogTitle"];

function changedFields(prev, curr) {
  if (!prev) return [];
  const changes = [];
  for (const f of TRACKED) {
    if (prev[f] !== curr[f]) changes.push({ field: f, from: prev[f], to: curr[f] });
  }
  const priceList = (e) => e.displayedPrices.map((p) => p.match).join(" ");
  if (priceList(prev) !== priceList(curr)) {
    changes.push({ field: "displayedPrices", from: priceList(prev) || "(none)", to: priceList(curr) || "(none)" });
  }
  const kw = (e) => e.keywordsPresent.join(",");
  if (kw(prev) !== kw(curr)) {
    const gone = prev.keywordsPresent.filter((k) => !curr.keywordsPresent.includes(k));
    const added = curr.keywordsPresent.filter((k) => !prev.keywordsPresent.includes(k));
    changes.push({
      field: "keywordsPresent",
      from: gone.length ? `removed: ${gone.join(", ")}` : "(none removed)",
      to: added.length ? `added: ${added.join(", ")}` : "(none added)",
    });
  }
  return changes;
}

// --- Reporting ------------------------------------------------------------

const readable = (ts) =>
  `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)} ${ts.slice(8, 10)}:${ts.slice(10, 12)}:${ts.slice(12, 14)} UTC`;

function writeTimeline(manifest) {
  const lines = [];
  lines.push(`# Capture timeline — ${manifest.query.url}`);
  lines.push("");
  lines.push(`Collected ${manifest.collectedAt} by \`webarchive/wayback.mjs\`.`);
  lines.push("");
  lines.push(`- Index query: \`${manifest.query.cdxUrl}\``);
  lines.push(`- Range: ${manifest.query.from ?? "(open)"} to ${manifest.query.to ?? "(open)"}`);
  lines.push(`- Distinct captures downloaded: ${manifest.captures.length}`);
  lines.push("");
  lines.push("Each capture below is the archived response as captured (`id_` modifier),");
  lines.push("stored verbatim under `captures/`. `sha256` is computed over those bytes;");
  lines.push("`cdxDigest` is archive.org's own digest recorded at crawl time. Re-running");
  lines.push("this script, or downloading the archive URL by hand, should reproduce both.");
  lines.push("");
  lines.push("Extracted fields are a best-effort index into the captures, not a substitute");
  lines.push("for reading them, and carry no assessment of the claims they contain.");
  lines.push("");

  let prev = null;
  for (const c of manifest.captures) {
    lines.push(`## ${readable(c.timestamp)}`);
    lines.push("");
    lines.push(`- View: ${c.viewUrl}`);
    lines.push(`- Raw: ${c.archiveUrl}`);
    lines.push(`- File: \`${path.relative(outDir, c.file)}\` (${c.bytes} bytes)`);
    lines.push(`- sha256: \`${c.sha256}\``);
    lines.push(`- cdxDigest: \`${c.cdxDigest}\``);
    if (c.extract?.title) lines.push(`- Title: ${c.extract.title}`);
    if (c.extract?.displayedPrices?.length) {
      lines.push(`- Prices shown: ${uniq(c.extract.displayedPrices.map((p) => p.match)).join(", ")}`);
    }

    // A price without the words around it proves nothing, so quote the number
    // in situ. This is the part of the record that actually carries the claim.
    if (c.extract?.displayedPrices?.length) {
      lines.push("");
      lines.push("As shown on the page:");
      for (const p of c.extract.displayedPrices.slice(0, 8)) {
        lines.push(`  > ${p.context}`);
      }
    }
    if (c.extract?.qualifierSentences?.length) {
      lines.push("");
      lines.push("Conditions and fine print:");
      for (const s of c.extract.qualifierSentences.slice(0, 8)) {
        lines.push(`  > ${s}`);
      }
    }

    const changes = changedFields(prev, c.extract);
    if (changes.length) {
      lines.push("");
      lines.push("Changed since previous capture:");
      for (const ch of changes) {
        lines.push(`  - **${ch.field}**: \`${ch.from ?? "(none)"}\` → \`${ch.to ?? "(none)"}\``);
      }
    }
    lines.push("");
    prev = c.extract;
  }

  const file = path.join(outDir, "timeline.md");
  writeFileSync(file, lines.join("\n"));
  return file;
}

// --- Main -----------------------------------------------------------------

async function main() {
  console.log(`${BOLD}Collecting captures of ${opts.url}${RESET}`);

  let index;
  try {
    index = await fetchCaptureIndex();
  } catch (err) {
    console.error(bad(`could not reach the Wayback index: ${err.message}`));
    console.error(note("If this is a network policy rather than an outage, web.archive.org"));
    console.error(note("must be reachable from wherever you run this — see webarchive/README.md."));
    process.exit(1);
  }

  if (index.rows.length === 0) {
    console.log(bad("no captures matched — widen --from/--to, or try --match prefix"));
    return;
  }
  console.log(ok(`${index.rows.length} distinct capture(s) in range`));

  if (opts.listOnly) {
    for (const r of index.rows) {
      console.log(`  ${readable(r.timestamp)}  ${note(r.digest)}  ${viewUrlFor(r.timestamp, r.original)}`);
    }
    return;
  }

  mkdirSync(capturesDir, { recursive: true });

  const captures = [];
  let failures = 0;
  for (const [i, row] of index.rows.entries()) {
    const label = `[${i + 1}/${index.rows.length}] ${readable(row.timestamp)}`;
    try {
      const { file, bytes, cached } = await downloadCapture(row);
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      const html = bytes.toString("utf8");
      captures.push({
        timestamp: row.timestamp,
        originalUrl: row.original,
        statuscode: row.statuscode,
        cdxDigest: row.digest,
        sha256,
        bytes: bytes.length,
        file,
        archiveUrl: archiveUrlFor(row.timestamp, row.original),
        viewUrl: viewUrlFor(row.timestamp, row.original),
        fetchedAt: new Date().toISOString(),
        cached,
        extract: extract(html),
      });
      console.log(ok(`${label} ${note(`${bytes.length} bytes${cached ? ", cached" : ""}`)}`));
      if (!cached) await sleep(opts.delay);
    } catch (err) {
      failures++;
      console.log(bad(`${label} ${err.message}`));
    }
  }

  if (captures.length === 0) {
    console.error(bad("every download failed — nothing written"));
    process.exit(1);
  }

  const manifest = {
    tool: "webarchive/wayback.mjs",
    collectedAt: new Date().toISOString(),
    query: { url: opts.url, from: opts.from, to: opts.to, match: opts.match, cdxUrl: index.queryUrl },
    captures,
  };
  const manifestFile = path.join(outDir, "manifest.json");
  writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
  const timelineFile = writeTimeline(manifest);

  console.log();
  console.log(ok(`${BOLD}${captures.length} capture(s) preserved${RESET}${failures ? note(`, ${failures} failed`) : ""}`));
  console.log(`  ${note(path.relative(process.cwd(), capturesDir))}  raw archived bytes`);
  console.log(`  ${note(path.relative(process.cwd(), manifestFile))}  hashes, URLs, extracted fields`);
  console.log(`  ${note(path.relative(process.cwd(), timelineFile))}  readable change log`);
}

main().catch((err) => {
  console.error(bad(err.stack ?? err.message));
  process.exit(1);
});
