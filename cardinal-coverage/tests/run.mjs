// Test runner for the Cardinal Coverage prototypes.
//   node cardinal-coverage/tests/run.mjs            run everything
//   node cardinal-coverage/tests/run.mjs clocks     run lanes matching "clocks"
//
// Exit code is non-zero if anything failed, so this can gate a commit.

import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { getResults, closeBrowser } from "./harness.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const filter = process.argv[2] || "";

const files = readdirSync(here)
  .filter((f) => f.endsWith(".test.mjs"))
  .filter((f) => !filter || f.includes(filter))
  .sort();

if (!files.length) { console.log("no test files found"); process.exit(0); }

for (const f of files) {
  try { await import(resolve(here, f)); }
  catch (e) { console.error(`\n!! ${f} failed to load: ${e.message}\n`); process.exitCode = 1; }
}

await closeBrowser();

const res = getResults();
const bySuite = {};
for (const r of res) (bySuite[r.suite] = bySuite[r.suite] || []).push(r);

let pass = 0, fail = 0, skipped = 0;
for (const [suite, rs] of Object.entries(bySuite)) {
  const bad = rs.filter((r) => !r.ok && !r.skipped);
  const sk  = rs.filter((r) => r.skipped);
  const good = rs.filter((r) => r.ok);
  pass += good.length; fail += bad.length; skipped += sk.length;
  const mark = bad.length ? "FAIL" : sk.length ? "warn" : " ok ";
  console.log(`[${mark}] ${suite}  —  ${good.length} passed${bad.length ? `, ${bad.length} FAILED` : ""}${sk.length ? `, ${sk.length} skipped` : ""}`);
  for (const r of bad) console.log(`        ✗ ${r.name}\n          ${r.err}`);
  for (const r of sk)  console.log(`        – ${r.name} (skipped${r.why ? ": " + r.why : ""})`);
}

console.log(`\n${pass} passed · ${fail} failed · ${skipped} skipped · ${files.length} lane${files.length === 1 ? "" : "s"}`);
if (fail) process.exitCode = 1;
