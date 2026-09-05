// Lane: tracker-state — the tracker's data lifecycle in a real browser.
// Seeding, persistence, edit/delete, demo load, and hostile storage.

import { suite, test, expect, open, browser, page, dayFromToday } from "./harness.mjs";

const KEY = "ma-case-tracker-v1";

/** open() with a custom init script (harness open() only supports JSON seeding). */
async function openWith(file, init, arg) {
  const b = await browser();
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  p.__errors = [];
  p.on("pageerror", (e) => p.__errors.push(String(e.message)));
  p.on("console", (m) => { if (m.type() === "error") p.__errors.push("console: " + m.text()); });
  if (init) await p.addInitScript(init, arg);
  await p.goto(page(file));
  await p.waitForLoadState("domcontentloaded");
  await p.waitForTimeout(250);
  p.__ctx = ctx;
  return p;
}

/** Raw (possibly malformed) string straight into the tracker's storage key. */
const seedRaw = (raw) => openWith("tracker.html", (a) => {
  localStorage.setItem(a.k, a.v);
}, { k: KEY, v: raw });

/**
 * Seed once, on first navigation only — unlike harness open({storage}), this
 * lets a test reload the page and see what the page itself persisted.
 */
const seedOnce = (rows) => openWith("tracker.html", (a) => {
  if (localStorage.getItem(a.k) === null) localStorage.setItem(a.k, a.v);
}, { k: KEY, v: JSON.stringify(rows) });

const stored = (p) => p.evaluate((k) => {
  const raw = localStorage.getItem(k);
  try { return JSON.parse(raw); } catch { return { __unparseable: raw }; }
}, KEY);

const caseCount = (p) => p.locator("article.case").count();

/** A fully-specified case record, dated relative to today so the suite never rots. */
function mkCase(id, cid, over = {}) {
  return {
    id, cid, plan: "Humana MA", admit: dayFromToday(-5), cycle: 3, lead: 1,
    covered: dayFromToday(4), note: dayFromToday(-1), cert: dayFromToday(-5),
    nomnc: "", status: "Authorized", exposure: 0, order: "", notes: "", ...over,
  };
}

suite("tracker-state");

/* ------------------------------------------------------------------ seeding */

await test("empty storage seeds exactly two starter cases", async () => {
  const p = await open("tracker.html");
  expect(p.__errors.length).toBe(0);
  const rows = await stored(p);
  expect(Array.isArray(rows)).toBeTruthy();
  expect(rows.length).toBe(2);
  expect(rows.map((r) => r.cid)).toEqual(["Case 1", "Case 2"]);
  expect(rows.every((r) => typeof r.id === "string" && r.id.length > 0)).toBeTruthy();
  expect(await caseCount(p)).toBe(2);
  await p.__ctx.close();
});

await test("a second load does not duplicate the starter cases", async () => {
  const p = await open("tracker.html");
  const first = await stored(p);
  expect(first.length).toBe(2);
  await p.reload();
  await p.waitForTimeout(250);
  const second = await stored(p);
  expect(second.length).toBe(2);
  // Same identities, not a fresh pair written over the top.
  expect(second.map((r) => r.id)).toEqual(first.map((r) => r.id));
  expect(await caseCount(p)).toBe(2);
  await p.__ctx.close();
});

await test("pre-seeded storage renders and is not seeded over", async () => {
  const seed = [mkCase("seed-a", "ROOM-9A"), mkCase("seed-b", "ROOM-9B", { plan: "Aetna MA" })];
  const p = await open("tracker.html", { storage: { [KEY]: seed } });
  expect(p.__errors.length).toBe(0);
  expect(await caseCount(p)).toBe(2);
  const body = await p.locator("#cases").innerText();
  expect(body).toContain("ROOM-9A");
  expect(body).toContain("ROOM-9B");
  expect(body).notToContain("Case 1");
  expect(body).notToContain("Starter row");
  const rows = await stored(p);
  expect(rows.length).toBe(2);
  expect(rows.map((r) => r.id).sort()).toEqual(["seed-a", "seed-b"]);
  await p.__ctx.close();
});

/* --------------------------------------------------------------- demo data */

await test("Demo data replaces the caseload with exactly five cases", async () => {
  const p = await open("tracker.html");
  p.on("dialog", (d) => d.accept());
  expect((await stored(p)).length).toBe(2);            // starters present
  await p.click("#demoBtn");
  await p.waitForTimeout(200);
  const rows = await stored(p);
  expect(rows.map((r) => r.cid).sort()).toEqual(["105-B", "118", "214-B", "227-C", "301-A"]);
  expect(rows.length).toBe(5);
  expect(await caseCount(p)).toBe(5);
  await p.__ctx.close();
});

await test("Demo caseload spans severities (one red, one green)", async () => {
  const p = await open("tracker.html");
  p.on("dialog", (d) => d.accept());
  await p.click("#demoBtn");
  await p.waitForTimeout(200);
  // 214-B: NOMNC deliver-by already passed → critical.
  const crit = await p.locator("article.case", { hasText: "214-B" }).getAttribute("class");
  expect(crit).toContain("sev-crit");
  // 105-B: nothing due for five days → healthy.
  const ok = await p.locator("article.case", { hasText: "105-B" }).getAttribute("class");
  expect(ok).toContain("sev-ok");
  expect(await p.locator("article.case.sev-crit").count()).toBeGreaterThan(0);
  expect(await p.locator("article.case.sev-ok").count()).toBeGreaterThan(0);
  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

/* ------------------------------------------------------------ add / edit / delete */

await test("adding a case through the dialog persists and survives reload", async () => {
  const p = await seedOnce([mkCase("seed-a", "ROOM-9A")]);
  await p.click("#addBtn");
  await p.waitForTimeout(100);
  await p.fill("#fId", "NEW-77");
  await p.fill("#fPlan", "Cigna MA");
  await p.fill("#fCovered", dayFromToday(6));
  await p.fill("#fExp", "1500");
  await p.fill("#fNotes", "created by test");
  await p.click("#caseForm button[type=submit]");
  await p.waitForTimeout(200);

  let rows = await stored(p);
  expect(rows.length).toBe(2);
  const added = rows.find((r) => r.cid === "NEW-77");
  expect(added).toBeTruthy();
  expect(added.plan).toBe("Cigna MA");
  expect(added.covered).toBe(dayFromToday(6));
  expect(added.exposure).toBe(1500);
  expect(await caseCount(p)).toBe(2);

  await p.reload();
  await p.waitForTimeout(250);
  rows = await stored(p);
  expect(rows.length).toBe(2);
  expect(await caseCount(p)).toBe(2);
  expect(await p.locator("#cases").innerText()).toContain("NEW-77");
  await p.__ctx.close();
});

await test("editing a case updates it in place rather than duplicating", async () => {
  const seed = [mkCase("seed-a", "ROOM-9A"), mkCase("seed-b", "ROOM-9B")];
  const p = await open("tracker.html", { storage: { [KEY]: seed } });
  await p.locator("article.case", { hasText: "ROOM-9A" }).locator("[data-edit]").click();
  await p.waitForTimeout(100);
  expect(await p.locator("#dlgTitle").innerText()).toBe("Edit case");
  expect(await p.inputValue("#fId")).toBe("ROOM-9A");
  await p.fill("#fPlan", "WellCare MA");
  await p.fill("#fNotes", "edited by test");
  await p.click("#caseForm button[type=submit]");
  await p.waitForTimeout(200);

  const rows = await stored(p);
  expect(rows.length).toBe(2);
  expect(rows.filter((r) => r.cid === "ROOM-9A").length).toBe(1);
  expect(rows.find((r) => r.id === "seed-a").plan).toBe("WellCare MA");
  expect(rows.find((r) => r.id === "seed-a").notes).toBe("edited by test");
  expect(rows.find((r) => r.id === "seed-b").plan).toBe("Humana MA");
  expect(await caseCount(p)).toBe(2);
  await p.__ctx.close();
});

await test("deleting a case removes it from the page and from storage", async () => {
  const seed = [mkCase("seed-a", "ROOM-9A"), mkCase("seed-b", "ROOM-9B")];
  const p = await open("tracker.html", { storage: { [KEY]: seed } });
  p.on("dialog", (d) => d.accept());
  await p.locator("article.case", { hasText: "ROOM-9A" }).locator("[data-edit]").click();
  await p.waitForTimeout(100);
  await p.click("#delBtn");
  await p.waitForTimeout(200);

  const rows = await stored(p);
  expect(rows.map((r) => r.id)).toEqual(["seed-b"]);
  expect(await caseCount(p)).toBe(1);
  expect(await p.locator("#cases").innerText()).notToContain("ROOM-9A");
  await p.__ctx.close();
});

await test("a deleted case stays deleted after reload", async () => {
  const p = await seedOnce([mkCase("seed-a", "ROOM-9A"), mkCase("seed-b", "ROOM-9B")]);
  p.on("dialog", (d) => d.accept());
  await p.locator("article.case", { hasText: "ROOM-9A" }).locator("[data-edit]").click();
  await p.waitForTimeout(100);
  await p.click("#delBtn");
  await p.waitForTimeout(200);
  await p.reload();
  await p.waitForTimeout(250);
  expect(await caseCount(p)).toBe(1);
  expect(await p.locator("#cases").innerText()).notToContain("ROOM-9A");
  await p.__ctx.close();
});

/* --------------------------------------------------------- hostile storage */

await test("non-array storage does not blank the page", async () => {
  const p = await seedRaw(JSON.stringify({ cases: "oops" }));
  expect(await p.locator("#stats .stat").count()).toBe(4);
  // Bootstrap falls back to an empty list, so the starter seed runs.
  expect(await caseCount(p)).toBe(2);
  const rows = await stored(p);
  expect(Array.isArray(rows)).toBeTruthy();
  expect(rows.length).toBe(2);
  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("invalid JSON in storage does not blank the page", async () => {
  const p = await seedRaw("{ this is not json ");
  expect(await p.locator("#stats .stat").count()).toBe(4);
  expect(await caseCount(p)).toBe(2);
  const rows = await stored(p);
  expect(Array.isArray(rows)).toBeTruthy();
  expect(rows.length).toBe(2);
  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("an array holding a null row does not blank the page", async () => {
  const p = await seedRaw(JSON.stringify([mkCase("seed-a", "ROOM-9A"), null]));
  // Whatever the page does with the junk row, the stats strip must still render.
  expect(await p.locator("#stats .stat").count()).toBe(4);
  expect(await p.locator("#cases").innerText()).toContain("ROOM-9A");
  await p.__ctx.close();
});

await test("unusable localStorage still renders and warns the user", async () => {
  const p = await openWith("tracker.html", () => {
    Storage.prototype.setItem = function () { throw new Error("storage denied"); };
  });
  // The caseload only lives in memory now, but the page must still be usable.
  expect(await p.locator("#stats .stat").count()).toBe(4);
  expect(await caseCount(p)).toBe(2);
  const warn = p.locator("#saveWarn");
  expect(await warn.count()).toBe(1);
  expect(await warn.innerText()).toContain("Not saving");
  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("a case added while storage is unusable still appears and keeps the warning", async () => {
  const p = await openWith("tracker.html", () => {
    Storage.prototype.setItem = function () { throw new Error("storage denied"); };
  });
  await p.click("#addBtn");
  await p.waitForTimeout(100);
  await p.fill("#fId", "NOSAVE-1");
  await p.click("#caseForm button[type=submit]");
  await p.waitForTimeout(200);
  expect(await caseCount(p)).toBe(3);
  expect(await p.locator("#cases").innerText()).toContain("NOSAVE-1");
  expect(await p.locator("#saveWarn").count()).toBe(1);
  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});
