#!/usr/bin/env node
/**
 * End-to-end test for webarchive/wayback.mjs.
 *
 * The collector's whole value is that the bytes on disk are the bytes the
 * archive served and the hashes prove it, so the test drives the real script
 * as a subprocess against a local stub standing in for archive.org (via
 * WAYBACK_BASE) rather than mocking its internals. It asserts on what an
 * evidence consumer would check: that captures round-trip byte-for-byte, that
 * the recorded sha256 matches the file, that the change log notices a price
 * that moved, and that the fine print is pulled out alongside the number.
 *
 * Run: node --test webarchive/
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, rmSync, mkdtempSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(here, "wayback.mjs");

// Two captures of the same page. The second raises the headline number and
// moves the qualifier, which is exactly the kind of change the timeline exists
// to surface.
const CAPTURES = {
  "20240115000000": `<!doctype html><html><head>
    <title>Model Y | Tesla</title>
    <meta name="description" content="Model Y is a fully electric SUV.">
    </head><body>
    <h1>Model Y</h1>
    <p class="price">From $44,990 after estimated gas savings*</p>
    <p class="fine">*Price shown excludes destination and order fees. Estimated savings may vary.</p>
    <script>window.__CONFIG__ = {"basePrice": 47990, "estimatedSavings": 3000};</script>
    </body></html>`,
  "20250310000000": `<!doctype html><html><head>
    <title>Model Y | Tesla</title>
    <meta name="description" content="Model Y is a fully electric SUV with more range.">
    </head><body>
    <h1>Model Y</h1>
    <p class="price">From $59,990</p>
    <p class="fine">Excludes taxes and fees. Range is an EPA estimate and may vary.</p>
    <script>window.__CONFIG__ = {"basePrice": 59990};</script>
    </body></html>`,
};

const ORIGINAL = "https://www.tesla.com/modely";

function startStub() {
  const server = createServer((req, res) => {
    if (req.url.startsWith("/cdx/search/cdx")) {
      const rows = [
        ["timestamp", "original", "statuscode", "digest", "length"],
        ...Object.keys(CAPTURES).map((ts) => [ts, ORIGINAL, "200", `DIGEST${ts}`, "1000"]),
      ];
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }
    const m = req.url.match(/^\/web\/(\d{14})id_\//);
    if (m && CAPTURES[m[1]]) {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(CAPTURES[m[1]]);
      return;
    }
    res.writeHead(404).end("not found");
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

const execFileAsync = promisify(execFile);

/**
 * Must be async, not spawnSync: the stub server shares this process, so a
 * synchronous spawn would block the event loop and deadlock against the very
 * subprocess it is supposed to be serving.
 */
async function run(args, base) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [script, ...args], {
      encoding: "utf8",
      env: { ...process.env, WAYBACK_BASE: base },
    });
    return { status: 0, stdout, stderr };
  } catch (err) {
    return { status: err.code ?? 1, stdout: err.stdout ?? "", stderr: err.stderr ?? "" };
  }
}

const runCollector = (port, outRoot, extraArgs = []) =>
  run(
    ["--url", "tesla.com/modely", "--from", "2024", "--to", "2025",
     "--out", outRoot, "--delay", "0", ...extraArgs],
    `http://127.0.0.1:${port}`
  );

test("collects captures, proves their integrity, and logs what changed", async (t) => {
  const { server, port } = await startStub();
  const outRoot = mkdtempSync(path.join(tmpdir(), "wayback-test-"));
  t.after(() => { server.close(); rmSync(outRoot, { recursive: true, force: true }); });

  const first = await runCollector(port, outRoot);
  assert.equal(first.status, 0, `collector exited ${first.status}:\n${first.stdout}\n${first.stderr}`);

  const outDir = path.join(outRoot, "tesla-com-modely");
  const manifest = JSON.parse(readFileSync(path.join(outDir, "manifest.json"), "utf8"));

  await t.test("every distinct capture is preserved", () => {
    assert.equal(manifest.captures.length, 2);
    assert.deepEqual(manifest.captures.map((c) => c.timestamp), Object.keys(CAPTURES));
  });

  await t.test("stored bytes are the served bytes, and the hash proves it", () => {
    for (const c of manifest.captures) {
      const onDisk = readFileSync(c.file);
      assert.equal(onDisk.toString("utf8"), CAPTURES[c.timestamp], "capture was altered in transit");
      assert.equal(createHash("sha256").update(onDisk).digest("hex"), c.sha256, "sha256 does not match the file");
      assert.equal(c.bytes, onDisk.length);
    }
  });

  await t.test("provenance is recorded for each capture", () => {
    for (const c of manifest.captures) {
      assert.equal(c.cdxDigest, `DIGEST${c.timestamp}`);
      assert.ok(c.archiveUrl.includes(`${c.timestamp}id_/`), "raw URL must use the id_ modifier");
      assert.ok(c.viewUrl.includes(c.timestamp));
      assert.ok(Date.parse(c.fetchedAt), "fetchedAt must be a real timestamp");
    }
    assert.ok(manifest.query.cdxUrl.includes("collapse=digest"), "index query must collapse identical captures");
  });

  await t.test("the displayed price is captured with its qualifier attached", () => {
    const first = manifest.captures[0].extract;
    const priced = first.displayedPrices.find((p) => p.match.includes("44,990"));
    assert.ok(priced, "headline price not extracted");
    assert.match(priced.context, /after estimated gas savings/i,
      "price must be recorded with the surrounding claim, not bare");
    assert.ok(first.qualifierSentences.some((s) => /excludes destination and order fees/i.test(s)),
      "fine print not extracted");
    assert.ok(first.embeddedPriceFields.some((f) => /estimatedSavings/i.test(f)),
      "values embedded in page JSON not extracted");
  });

  await t.test("the timeline reports the change between captures", () => {
    const timeline = readFileSync(path.join(outDir, "timeline.md"), "utf8");
    assert.match(timeline, /2024-01-15/);
    assert.match(timeline, /2025-03-10/);
    assert.match(timeline, /Changed since previous capture/);
    assert.match(timeline, /displayedPrices/);
    assert.match(timeline, /\$44,990/);
    assert.match(timeline, /\$59,990/);
  });

  await t.test("extraction carries no verdict on the claims", () => {
    const serialized = JSON.stringify(manifest).toLowerCase();
    for (const word of ["deceptive", "misleading", "false", "violation", "illegal"]) {
      assert.ok(!serialized.includes(`"${word}`), `manifest should not label claims: ${word}`);
    }
  });

  await t.test("re-running serves from cache without refetching", async () => {
    const again = await runCollector(port, outRoot);
    assert.equal(again.status, 0);
    assert.match(again.stdout, /cached/, "second run should reuse the captures on disk");
  });
});

test("rejects a malformed range instead of guessing at it", async (t) => {
  const { server, port } = await startStub();
  const outRoot = mkdtempSync(path.join(tmpdir(), "wayback-test-"));
  t.after(() => { server.close(); rmSync(outRoot, { recursive: true, force: true }); });

  const bad = await run(
    ["--url", "tesla.com/modely", "--from", "Jan2024", "--out", outRoot],
    `http://127.0.0.1:${port}`
  );
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /--from must be 4-14 digits/);
});

test("reports an unreachable archive rather than writing an empty record", async () => {
  const outRoot = mkdtempSync(path.join(tmpdir(), "wayback-test-"));
  // Port 1 is reserved and refuses connections, standing in for a blocked host.
  const dead = await run(["--url", "tesla.com/modely", "--out", outRoot], "http://127.0.0.1:1");
  rmSync(outRoot, { recursive: true, force: true });
  assert.equal(dead.status, 1);
  assert.match(dead.stderr, /could not reach the Wayback index/);
});
