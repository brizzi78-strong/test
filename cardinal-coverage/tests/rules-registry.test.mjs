// Lane: rules-registry — rules.html
//
// The registry's whole claim is freshness discipline: every rule carries a
// source, a human confirmation date, and a review interval, and the UI must
// tell the truth about which rules can no longer be trusted. These tests pin
// the freshness boundaries exactly, the summary/badge agreement, the ordering
// that surfaces stale rules, the change-history rules, and export/import.

import { suite, test, expect, open, scriptOf, sandbox, dayFromToday } from "./harness.mjs";

const KEY = "cc-rules-v1";

/* A minimal well-formed rule record, shaped exactly like what the page saves. */
const rule = (o) => ({
  id: o.id,
  plan: o.plan,
  state: o.state ?? "NC",
  product: o.product ?? "Medicare Advantage",
  type: o.type ?? "Contact",
  value: o.value ?? "placeholder value",
  source: o.source ?? "2026 Provider Manual, p.4",
  verified: o.verified,
  interval: o.interval ?? 90,
  by: o.by ?? "tt",
  effective: o.effective ?? "",
  note: o.note ?? "",
  history: o.history ?? [],
});

/* freshness levels relative to a 90-day interval */
const FRESH = dayFromToday(-1);
const DUE = dayFromToday(-95);
const STALE = dayFromToday(-200);

const store = (rules) => ({ [KEY]: rules });
const badges = (p) => p.locator("article.rule .badge").allTextContents();
const statValues = (p) => p.locator(".stat .v").allTextContents();
const ruleCount = (p) => p.locator("article.rule").count();

/* fmtD() in the page — reproduce the label the page will print for today. */
const todayLabel = (p) => p.evaluate(() => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
    .toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
});

async function saveDialog(p) {
  await p.click("#ruleForm button[type=submit]");
  await p.waitForTimeout(120);
}

async function storedRules(p) {
  return JSON.parse(await p.evaluate((k) => localStorage.getItem(k), KEY));
}

/* ------------------------------------------------------------------ logic */

suite("rules-registry · freshness math");

const L = sandbox(scriptOf("rules.html"), ["freshness", "SEED", "parseD"]);

test("confirmed today is fresh; the day before the review date is still fresh", () => {
  expect(L.freshness({ verified: dayFromToday(0), interval: 90 }).k).toBe("fresh");
  expect(L.freshness({ verified: dayFromToday(-89), interval: 90 }).k).toBe("fresh");
  // age is measured in whole days since confirmation
  expect(L.freshness({ verified: dayFromToday(-89), interval: 90 }).age).toBe(89);
});

test("at exactly N days the rule is due, and stays due through 2N-1", () => {
  expect(L.freshness({ verified: dayFromToday(-90), interval: 90 }).k).toBe("due");
  expect(L.freshness({ verified: dayFromToday(-179), interval: 90 }).k).toBe("due");
});

test("at exactly 2N days the rule is stale", () => {
  expect(L.freshness({ verified: dayFromToday(-180), interval: 90 }).k).toBe("stale");
  expect(L.freshness({ verified: dayFromToday(-400), interval: 90 }).k).toBe("stale");
});

test("boundaries move with the interval — a 30-day rule is due at 30, stale at 60", () => {
  const at = (n) => L.freshness({ verified: dayFromToday(-n), interval: 30 }).k;
  expect([at(29), at(30), at(59), at(60)]).toEqual(["fresh", "due", "due", "stale"]);
  // federal regulation gets a long leash
  const fed = (n) => L.freshness({ verified: dayFromToday(-n), interval: 365 }).k;
  expect([fed(364), fed(365), fed(729), fed(730)]).toEqual(["fresh", "due", "due", "stale"]);
});

test("a rule with no confirmation date is treated as stale, not fresh", () => {
  expect(L.freshness({ verified: "", interval: 90 }).k).toBe("stale");
  expect(L.freshness({ verified: "not-a-date", interval: 90 }).k).toBe("stale");
});

test("every seeded rule carries a source, a confirmation date and an interval", () => {
  expect(L.SEED.length).toBe(8);
  const bad = L.SEED.filter((r) => !r.source || !r.value || !L.parseD(r.verified) || !(+r.interval > 0));
  expect(bad.map((r) => r.type)).toEqual([]);
});

/* ---------------------------------------------------------------- browser */

suite("rules-registry · seeding");

await test("empty storage seeds the eight verified rules and a reload does not duplicate them", async () => {
  const p = await open("rules.html");
  expect(p.__errors).toEqual([]);
  expect(await ruleCount(p)).toBe(8);
  expect((await statValues(p))[0]).toBe("8");
  const ids = (await storedRules(p)).map((r) => r.id);
  expect(ids.length).toBe(8);

  await p.reload();
  await p.waitForTimeout(250);
  expect(await ruleCount(p)).toBe(8);
  expect((await statValues(p))[0]).toBe("8");
  // same records, not a second copy
  expect((await storedRules(p)).map((r) => r.id)).toEqual(ids);
  await p.__ctx.close();
});

await test("deleting the last rule empties the registry and its storage", async () => {
  const p = await open("rules.html", {
    storage: store([rule({ id: "only-1", plan: "Aetna MA", verified: FRESH, value: "the one rule we keep" })]),
  });
  p.on("dialog", (d) => d.accept());
  expect(await ruleCount(p)).toBe(1);
  await p.click('[data-edit="only-1"]');
  await p.click("#delBtn");
  await p.waitForTimeout(150);
  expect(await ruleCount(p)).toBe(0);
  expect(await storedRules(p)).toEqual([]);
  expect(await p.locator(".empty").count()).toBe(1);
  await p.__ctx.close();
});

await test("a deliberately emptied registry stays empty when reopened", async () => {
  // Storage holds an explicit empty array — the state the delete button leaves
  // behind. Reopening must not resurrect the eight seeded rules: a rule that a
  // facility removed on purpose (wrong QIO number, plan they do not contract
  // with) coming back marked "confirmed by research" is exactly the kind of
  // untrustworthy entry this tool exists to prevent.
  const p = await open("rules.html", { storage: store([]) });
  expect(await ruleCount(p)).toBe(0);
  expect(await storedRules(p)).toEqual([]);
  await p.__ctx.close();
});

suite("rules-registry · freshness surfaced");

await test("summary counts match the rendered per-rule badges", async () => {
  const p = await open("rules.html", {
    storage: store([
      rule({ id: "a", plan: "Aetna MA", verified: FRESH }),
      rule({ id: "b", plan: "Bright MA", verified: dayFromToday(-89) }),
      rule({ id: "c", plan: "Cigna MA", verified: DUE }),
      rule({ id: "d", plan: "Devoted MA", verified: STALE }),
      rule({ id: "e", plan: "Elevance MA", verified: dayFromToday(-180) }),
    ]),
  });
  const b = await badges(p);
  const n = (kind) => b.filter((t) => t.trim() === kind).length;
  expect([n("fresh"), n("due for review"), n("STALE")]).toEqual([2, 1, 2]);
  // stats: tracked / fresh / due / stale
  expect(await statValues(p)).toEqual(["5", "2", "1", "2"]);
  expect(p.__errors).toEqual([]);
  await p.__ctx.close();
});

await test("stale rules sort to the top, ahead of due and fresh", async () => {
  // Alphabetical plan order is the opposite of freshness order, so this only
  // passes if freshness drives the sort.
  const p = await open("rules.html", {
    storage: store([
      rule({ id: "a", plan: "Alpha MA", verified: FRESH, value: "alpha is fresh" }),
      rule({ id: "b", plan: "Bravo MA", verified: DUE, value: "bravo is due" }),
      rule({ id: "c", plan: "Charlie MA", verified: STALE, value: "charlie is stale" }),
    ]),
  });
  expect(await badges(p)).toEqual(["STALE", "due for review", "fresh"]);
  expect(await p.locator("article.rule .rval").first().textContent()).toContain("charlie is stale");
  await p.__ctx.close();
});

await test("a stale rule is never pushed below a fresh one by plan grouping", async () => {
  // Alpha owns one stale + one fresh rule; Bravo owns a stale rule. Grouping by
  // plan must not bury Bravo's STALE entry underneath Alpha's fresh entry.
  const p = await open("rules.html", {
    storage: store([
      rule({ id: "a1", plan: "Alpha MA", type: "Contact", verified: STALE, value: "alpha stale" }),
      rule({ id: "a2", plan: "Alpha MA", type: "Appeal route", verified: FRESH, value: "alpha fresh" }),
      rule({ id: "b1", plan: "Bravo MA", type: "Contact", verified: STALE, value: "bravo stale" }),
    ]),
  });
  const order = await badges(p);
  // rendered order should be STALE, STALE, fresh — every stale entry above every fresh one
  expect(order.join(" | ")).toBe("STALE | STALE | fresh");
  await p.__ctx.close();
});

await test("freshness follows the confirmation date, not the edit time", async () => {
  const p = await open("rules.html", {
    storage: store([rule({ id: "d1", plan: "Aetna MA", verified: DUE, value: "fax 888-000-0000", note: "old note" })]),
  });
  expect((await badges(p))[0]).toBe("due for review");
  await p.click('[data-edit="d1"]');
  await p.fill("#rNote", "checked the portal, note clarified");
  await saveDialog(p);

  expect((await badges(p))[0]).toBe("due for review");
  expect(await statValues(p)).toEqual(["1", "0", "1", "0"]);
  const [r] = await storedRules(p);
  expect(r.verified).toBe(DUE);
  expect(r.note).toBe("checked the portal, note clarified");
  await p.__ctx.close();
});

suite("rules-registry · change history");

await test("changing a rule's value files the old value in history with the date it lapsed", async () => {
  const p = await open("rules.html", {
    storage: store([rule({ id: "h1", plan: "Aetna MA", verified: FRESH, value: "Fax SNF authorizations to 866-111-2222." })]),
  });
  expect(await p.locator(".hist").count()).toBe(0);

  await p.click('[data-edit="h1"]');
  await p.fill("#rValue", "Submit SNF authorizations through the Availity portal.");
  await saveDialog(p);

  const [r] = await storedRules(p);
  expect(r.history.length).toBe(1);
  expect(r.history[0].value).toBe("Fax SNF authorizations to 866-111-2222.");
  expect(r.history[0].until).toBe(dayFromToday(0));
  expect(r.value).toBe("Submit SNF authorizations through the Availity portal.");

  const hist = await p.locator(".hist").first().textContent();
  expect(hist).toContain("Fax SNF authorizations to 866-111-2222.");
  expect(hist).toContain(`until ${await todayLabel(p)}`);
  await p.__ctx.close();
});

await test("editing only the note or the source files no spurious history entry", async () => {
  const p = await open("rules.html", {
    storage: store([rule({ id: "h2", plan: "Aetna MA", verified: FRESH, value: "Fax to 866-111-2222.", source: "provider manual p.4" })]),
  });
  await p.click('[data-edit="h2"]');
  await p.fill("#rNote", "NC only");
  await saveDialog(p);
  await p.click('[data-edit="h2"]');
  await p.fill("#rSource", "https://example.org/2026-provider-manual");
  await saveDialog(p);

  const [r] = await storedRules(p);
  expect(r.history).toEqual([]);
  expect(r.value).toBe("Fax to 866-111-2222.");
  expect(r.source).toBe("https://example.org/2026-provider-manual");
  expect(await p.locator(".hist").count()).toBe(0);
  await p.__ctx.close();
});

suite("rules-registry · discipline & filters");

await test("the form refuses to save a rule with no source", async () => {
  const p = await open("rules.html", {
    storage: store([rule({ id: "s1", plan: "Aetna MA", verified: FRESH, value: "original value", source: "provider manual p.4" })]),
  });
  await p.click('[data-edit="s1"]');
  await p.fill("#rSource", "");
  await p.fill("#rValue", "value we should not be allowed to save unsourced");
  await saveDialog(p);

  expect(await p.evaluate(() => document.getElementById("dlg").open)).toBe(true);
  expect(await p.evaluate(() => document.getElementById("rSource").checkValidity())).toBe(false);
  const [r] = await storedRules(p);
  expect(r.value).toBe("original value");
  expect(r.source).toBe("provider manual p.4");
  await p.__ctx.close();
});

await test("plan / state / type / freshness filters and the search box narrow and combine", async () => {
  const p = await open("rules.html", {
    storage: store([
      rule({ id: "f1", plan: "Aetna MA", state: "NC", type: "Appeal route", verified: FRESH, value: "Fax the QIO appeal packet." }),
      rule({ id: "f2", plan: "Aetna MA", state: "Federal", type: "Contact", verified: DUE, value: "Provider line 888-632-3862." }),
      rule({ id: "f3", plan: "Humana MA", state: "NC", type: "Appeal route", verified: STALE, value: "Upload the appeal via the portal." }),
    ]),
  });
  expect(await ruleCount(p)).toBe(3);

  await p.selectOption("#fPlanSel", "Aetna MA");
  expect(await ruleCount(p)).toBe(2);
  await p.selectOption("#fStateSel", "NC");
  expect(await ruleCount(p)).toBe(1);
  expect(await p.locator("article.rule .rval").first().textContent()).toContain("QIO appeal packet");

  await p.selectOption("#fPlanSel", "");
  await p.selectOption("#fStateSel", "");
  await p.selectOption("#fTypeSel", "Appeal route");
  expect(await ruleCount(p)).toBe(2);

  await p.selectOption("#fTypeSel", "");
  await p.selectOption("#fFreshSel", "stale");
  expect(await ruleCount(p)).toBe(1);
  expect(await p.locator("article.rule .rval").first().textContent()).toContain("Upload the appeal via the portal");

  await p.selectOption("#fFreshSel", "");
  await p.fill("#fSearch", "portal");
  expect(await ruleCount(p)).toBe(1);

  // filters combine: Aetna has no rule mentioning "portal"
  await p.selectOption("#fPlanSel", "Aetna MA");
  expect(await ruleCount(p)).toBe(0);
  expect(await p.locator(".empty").count()).toBe(1);

  await p.fill("#fSearch", "888-632-3862");
  expect(await ruleCount(p)).toBe(1);
  expect(p.__errors).toEqual([]);
  await p.__ctx.close();
});

suite("rules-registry · export / import");

await test("export → import round-trips with no duplicates and history intact", async () => {
  const seeded = [
    rule({
      id: "x1", plan: "Aetna MA", verified: FRESH, value: "Submit via Availity.",
      history: [{ value: "Fax to 866-111-2222.", until: dayFromToday(-40), source: "2025 manual" }],
    }),
    rule({ id: "x2", plan: "Humana MA", verified: STALE, value: "Call the plan." }),
  ];
  const p = await open("rules.html", { storage: store(seeded) });
  p.on("dialog", (d) => d.accept());

  // capture exactly the bytes the Export button hands to the browser
  await p.evaluate(() => {
    const orig = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (b) => { window.__blob = b; return orig(b); };
  });
  await p.click("#exportBtn");
  const json = await p.evaluate(() => window.__blob.text());
  const parsed = JSON.parse(json);
  expect(parsed.length).toBe(2);
  expect(parsed.map((r) => r.id)).toEqual(["x1", "x2"]);
  expect(parsed[0].history[0].value).toBe("Fax to 866-111-2222.");

  await p.setInputFiles("#fileIn", {
    name: "cc-plan-rules.json", mimeType: "application/json", buffer: Buffer.from(json),
  });
  await p.waitForTimeout(300);

  const after = await storedRules(p);
  expect(after.map((r) => r.id)).toEqual(["x1", "x2"]);
  expect(await ruleCount(p)).toBe(2);
  expect(after[0].history.length).toBe(1);
  expect(after[0].history[0].until).toBe(dayFromToday(-40));
  expect(await p.locator(".hist").count()).toBe(1);
  await p.__ctx.close();
});

await test("importing a rule that shares an id updates it in place instead of duplicating", async () => {
  const p = await open("rules.html", {
    storage: store([
      rule({ id: "m1", plan: "Aetna MA", verified: STALE, value: "Fax to 866-111-2222.", history: [{ value: "older", until: dayFromToday(-90), source: "s" }] }),
    ]),
  });
  p.on("dialog", (d) => d.accept());

  const incoming = [
    rule({ id: "m1", plan: "Aetna MA", verified: FRESH, value: "Submit via Availity." }),
    rule({ id: "m2", plan: "Humana MA", verified: FRESH, value: "Call the plan." }),
  ];
  // the colleague's file carries no history for m1
  delete incoming[0].history;

  await p.setInputFiles("#fileIn", {
    name: "colleague.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(incoming)),
  });
  await p.waitForTimeout(300);

  const after = await storedRules(p);
  expect(after.length).toBe(2);
  expect(after.map((r) => r.id)).toEqual(["m1", "m2"]);
  const m1 = after.find((r) => r.id === "m1");
  expect(m1.value).toBe("Submit via Availity.");
  expect(m1.verified).toBe(FRESH);
  expect(m1.history.length).toBe(1);      // merge must not drop the change history
  expect(await ruleCount(p)).toBe(2);
  await p.__ctx.close();
});
