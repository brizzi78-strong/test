// Minimal zero-dependency test harness for the Cardinal Coverage prototypes.
// Every tool is a single self-contained HTML file, so tests come in two flavours:
//   * logic tests  — pull the <script> out of the page and exercise it in a sandbox
//   * browser tests — drive the real file:// page in Chromium via Playwright
//
// Run everything:  node cardinal-coverage/tests/run.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import vm from "node:vm";

export const DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// The tools live under app/ (gated deploy root); the public marketing page is
// under site/ and is served separately.
export const APP = `${DIR}/app`;
export const page = (name) => `file://${APP}/${name}`;
export const html = (name) => readFileSync(`${APP}/${name}`, "utf8");

/* ---------------------------------------------------------------- results */

const results = [];
let current = "(unnamed)";

export function suite(name) { current = name; }

export function test(name, fn) {
  const rec = { suite: current, name, ok: false, err: null, skipped: false };
  results.push(rec);
  const done = (p) => p
    .then(() => { rec.ok = true; })
    .catch((e) => { rec.err = e && e.message ? e.message : String(e); });
  try {
    const out = fn();
    return out && typeof out.then === "function" ? done(out) : (rec.ok = true, Promise.resolve());
  } catch (e) {
    rec.err = e && e.message ? e.message : String(e);
    return Promise.resolve();
  }
}

export function skip(name, why) {
  results.push({ suite: current, name, ok: false, err: null, skipped: true, why });
}

export function getResults() { return results; }

/* ------------------------------------------------------------- assertions */

export function expect(actual) {
  return {
    toBe(want) {
      if (!Object.is(actual, want))
        throw new Error(`expected ${JSON.stringify(want)}, got ${JSON.stringify(actual)}`);
    },
    toEqual(want) {
      const a = JSON.stringify(actual), b = JSON.stringify(want);
      if (a !== b) throw new Error(`expected ${b}, got ${a}`);
    },
    toContain(sub) {
      if (!String(actual).includes(sub))
        throw new Error(`expected to contain ${JSON.stringify(sub)} — got ${JSON.stringify(String(actual).slice(0, 300))}`);
    },
    notToContain(sub) {
      if (String(actual).includes(sub))
        throw new Error(`expected NOT to contain ${JSON.stringify(sub)}`);
    },
    toMatch(re) {
      if (!re.test(String(actual)))
        throw new Error(`expected to match ${re} — got ${JSON.stringify(String(actual).slice(0, 300))}`);
    },
    toBeTruthy() { if (!actual) throw new Error(`expected truthy, got ${JSON.stringify(actual)}`); },
    toBeFalsy()  { if (actual) throw new Error(`expected falsy, got ${JSON.stringify(actual)}`); },
    toBeGreaterThan(n) { if (!(actual > n)) throw new Error(`expected > ${n}, got ${actual}`); },
    toBeLessThan(n)    { if (!(actual < n)) throw new Error(`expected < ${n}, got ${actual}`); },
  };
}

/* ---------------------------------------------------- logic-level sandbox */

/** Extract the inline <script> body from a tool page. */
export function scriptOf(file) {
  const m = html(file).match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error(`no inline <script> found in ${file}`);
  return m[1];
}

/**
 * Evaluate selected top-level declarations from a page's script in a sandbox,
 * without needing a DOM. Pass the source and the names you want back.
 * Only pure helpers (date math, metric math) survive this — anything touching
 * document/localStorage should be tested in the browser instead.
 */
export function sandbox(src, names, extra = {}) {
  const ctx = vm.createContext({ console, Date, Math, JSON, Intl, URLSearchParams, ...extra });
  // Stop DOM/storage wiring from throwing during evaluation.
  const shim = `
    var __noop = function(){ return __proxy; };
    var __proxy = new Proxy(function(){}, {
      get: (t,k) => (k === Symbol.toPrimitive ? () => "" : __proxy),
      set: () => true, apply: () => __proxy, construct: () => __proxy,
    });
    var document = __proxy, window = __proxy, localStorage = __proxy,
        location = { search: "", pathname: "/" }, history = __proxy,
        self = { crypto: undefined }, alert = __noop, confirm = () => true,
        navigator = __proxy, IntersectionObserver = function(){ return __proxy; },
        setTimeout = function(){ return 0; }, URL = { createObjectURL: () => "", revokeObjectURL: () => {} },
        Blob = function(){}, crypto = { randomUUID: () => "test-uuid" };
  `;
  vm.runInContext(shim + "\n" + src, ctx, { timeout: 5000 });
  const out = {};
  for (const n of names) {
    const v = vm.runInContext(`typeof ${n} !== "undefined" ? ${n} : undefined`, ctx);
    if (v === undefined) throw new Error(`sandbox: "${n}" not found in script`);
    out[n] = v;
  }
  return out;
}

/* --------------------------------------------------------- browser driver */

const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const PW_DIR = "/tmp/claude-0/-home-user-test/0645010b-594a-593a-80e3-fc9476a4a141/scratchpad/testenv/node_modules/playwright";

let _browser = null;

export async function browser() {
  if (_browser) return _browser;
  const { chromium } = await import(PW_DIR + "/index.mjs");
  _browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  return _browser;
}

export async function closeBrowser() { if (_browser) { await _browser.close(); _browser = null; } }

/**
 * Open a tool page with a clean origin state. Collects console errors and
 * page exceptions onto `p.__errors` so tests can assert the page is quiet.
 */
export async function open(file, { storage = null } = {}) {
  const b = await browser();
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  p.__errors = [];
  p.on("pageerror", (e) => p.__errors.push(String(e.message)));
  p.on("console", (m) => { if (m.type() === "error") p.__errors.push("console: " + m.text()); });
  if (storage) {
    await p.addInitScript((s) => {
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v));
    }, storage);
  }
  await p.goto(page(file));
  await p.waitForLoadState("domcontentloaded");
  await p.waitForTimeout(250);       // let bootstrap render
  p.__ctx = ctx;
  return p;
}

export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const dayFromToday = (n) => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + n); return iso(d); };
