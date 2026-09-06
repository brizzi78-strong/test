// Lane: automation — the tracker's derived outputs.
//
// Covers the four things that now happen without retyping: the today's-work
// brief, the plan-route lookup against the rules registry, the calendar export,
// and the tracker → letters handoff.
//
// The brief and the calendar both read clocksFor(); these tests exist mainly to
// prove they stay derived from it rather than growing a second date engine.

import {
  suite, test, expect, open, scriptOf, sandbox, dayFromToday,
} from "./harness.mjs";

const SRC = scriptOf("tracker.html");

/** A minimal in-memory localStorage the sandbox can read and write. */
function storage(seed = {}) {
  const map = new Map(Object.entries(seed).map(([k, v]) => [k, JSON.stringify(v)]));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
  };
}

const NAMES = ["actionList", "planRoute", "buildICS", "appealHref", "cases", "clocksFor", "toISO", "today"];
const load = (seed) => sandbox(SRC, NAMES, { localStorage: storage(seed) });

/** One ordinary case: covered a few days out, so it has live clocks. */
const aCase = (over = {}) => ({
  id: "case-1", cid: "214-B", plan: "Aetna MA", status: "Authorized",
  admit: dayFromToday(-10), cycle: 3, lead: 1,
  covered: dayFromToday(3), note: dayFromToday(-5), cert: dayFromToday(-10),
  exposure: 1500, ...over,
});

const withCases = (list, extraSeed = {}) =>
  load({ "ma-case-tracker-v1": list, ...extraSeed });

/* ------------------------------------------------------------ action list */

suite("automation · today's work");

await test("flattens the caseload into actionable tasks only", () => {
  const { actionList } = withCases([aCase()]);
  const labs = actionList().map((a) => a.lab);
  // Context lines must not become to-dos.
  expect(labs.includes("Auth covered through")).toBeFalsy();
  expect(labs.includes("Stay day")).toBeFalsy();
  // Real actions must survive.
  expect(labs.includes("Next submission due")).toBeTruthy();
  expect(labs.includes("NOMNC deliver by")).toBeTruthy();
});

await test("drops the quiet cross-check clocks", () => {
  // The +cycle window and the secondary QIO date are cross-checks, not tasks.
  const { actionList } = withCases([aCase({ nomnc: dayFromToday(-1) })]);
  for (const a of actionList()) expect(String(a.lab).startsWith("—")).toBeFalsy();
  expect(actionList().filter((a) => a.lab.includes("Next window ends")).length).toBe(0);
});

await test("every QIO variant maps to one verb", () => {
  const { actionList } = withCases([aCase({ nomnc: dayFromToday(-1) })]);
  const qio = actionList().filter((a) => a.lab.indexOf("QIO deadline") === 0);
  expect(qio.length).toBeGreaterThan(0);
  for (const a of qio) expect(a.verb).toBe("File fast-track QIO appeal");
});

await test("sorts most urgent first and parks missing dates last", () => {
  const { actionList } = withCases([aCase({ note: "", cert: "" })]);
  const list = actionList();
  const dated = list.filter((a) => !a.missing);
  for (let i = 1; i < dated.length; i++) expect(dated[i].days >= dated[i - 1].days).toBeTruthy();
  // Anything undated sinks below everything dated.
  const firstMissing = list.findIndex((a) => a.missing);
  if (firstMissing >= 0) expect(list.slice(firstMissing).every((a) => a.missing)).toBeTruthy();
});

await test("a case with no dates recorded reports missing, not a fake deadline", () => {
  const { actionList } = withCases([aCase({ covered: "", note: "", cert: "", nomnc: "" })]);
  const list = actionList();
  expect(list.length).toBeGreaterThan(0);
  for (const a of list) expect(a.missing).toBeTruthy();
});

await test("carries the case through so the brief can name it", () => {
  const { actionList } = withCases([aCase()]);
  for (const a of actionList()) expect(a.c.cid).toBe("214-B");
});

await test("a broken case cannot take down the whole brief", () => {
  const { actionList } = withCases([aCase(), { id: "x", cid: "BAD", covered: "not-a-date" }]);
  // The good case still produces work.
  expect(actionList().some((a) => a.c.cid === "214-B")).toBeTruthy();
});

/* ----------------------------------------------------------- plan routes */

suite("automation · plan route lookup");

const RULE = (over = {}) => ({
  id: "r1", plan: "Aetna Medicare Advantage", state: "NC",
  type: "Authorization submission route", interval: 90,
  verified: dayFromToday(-10), value: "Submit through Availity.",
  source: "Aetna provider page", ...over,
});

await test("matches a shorthand case plan to the formal registry name", () => {
  const { planRoute } = load({ "cc-rules-v1": [RULE()] });
  const r = planRoute("Aetna MA");
  expect(r && r.value).toBe("Submit through Availity.");
});

await test("does not match an unrelated plan", () => {
  const { planRoute } = load({ "cc-rules-v1": [RULE()] });
  expect(planRoute("WellCare MA")).toBe(null);
});

await test("only submission-route rules answer the question", () => {
  const { planRoute } = load({ "cc-rules-v1": [RULE({ type: "Appeal rights" })] });
  expect(planRoute("Aetna MA")).toBe(null);
});

await test("flags a rule that is due for re-verification", () => {
  const { planRoute } = load({ "cc-rules-v1": [RULE({ verified: dayFromToday(-100) })] });
  const r = planRoute("Aetna MA");
  expect(r.due).toBeTruthy();
  expect(r.stale).toBeFalsy();
});

await test("flags a rule that is outright stale", () => {
  const { planRoute } = load({ "cc-rules-v1": [RULE({ verified: dayFromToday(-200) })] });
  expect(planRoute("Aetna MA").stale).toBeTruthy();
});

await test("survives an empty or corrupt registry", () => {
  expect(load({}).planRoute("Aetna MA")).toBe(null);
  const { planRoute } = sandbox(SRC, ["planRoute"], {
    localStorage: { getItem: () => "{ not json", setItem: () => {} },
  });
  expect(planRoute("Aetna MA")).toBe(null);
});

await test("a blank plan asks nothing of the registry", () => {
  const { planRoute } = load({ "cc-rules-v1": [RULE()] });
  expect(planRoute("")).toBe(null);
  expect(planRoute(null)).toBe(null);
});

/* --------------------------------------------------------------- calendar */

suite("automation · calendar export");

const lines = (ics) => ics.split("\r\n");

await test("emits a well-formed calendar", () => {
  const { buildICS } = withCases([aCase()]);
  const ics = buildICS();
  expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBeTruthy();
  expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBeTruthy();
  expect(ics).toContain("VERSION:2.0");
  // RFC 5545 requires CRLF, and no stray bare newlines.
  expect(ics.replace(/\r\n/g, "")).notToContain("\n");
});

await test("every event carries the required properties", () => {
  const { buildICS } = withCases([aCase()]);
  const ics = buildICS();
  const starts = (ics.match(/BEGIN:VEVENT/g) || []).length;
  const ends = (ics.match(/END:VEVENT/g) || []).length;
  expect(starts).toBe(ends);
  expect(starts).toBeGreaterThan(0);
  for (const p of ["UID:", "DTSTAMP:", "DTSTART", "SUMMARY:"]) expect(ics).toContain(p);
});

await test("a noon cutoff becomes a timed event, other deadlines all-day", () => {
  const { buildICS } = withCases([aCase({ nomnc: dayFromToday(-1) })]);
  const ics = buildICS();
  expect(ics).toContain("T120000");          // QIO noon deadline
  expect(ics).toContain("DTSTART;VALUE=DATE:"); // ordinary deadlines
});

await test("noon deadlines get an extra same-day alarm", () => {
  const { buildICS } = withCases([aCase({ nomnc: dayFromToday(-1) })]);
  const ics = buildICS();
  expect(ics).toContain("TRIGGER:-PT4H");
  expect(ics).toContain("TRIGGER:-P1D");
});

await test("UIDs are stable, so re-importing moves an event instead of duplicating it", () => {
  const uidsOf = (ics) => lines(ics).filter((l) => l.startsWith("UID:")).sort();
  const a = withCases([aCase()]).buildICS();
  // Same case, a later covered-through date: the deadlines move.
  const b = withCases([aCase({ covered: dayFromToday(6) })]).buildICS();
  expect(uidsOf(a).length).toBeGreaterThan(0);
  expect(uidsOf(b)).toEqual(uidsOf(a));
});

await test("UIDs are unique within one calendar", () => {
  const { buildICS } = withCases([aCase(), aCase({ id: "case-2", cid: "118" })]);
  const uids = lines(buildICS()).filter((l) => l.startsWith("UID:"));
  expect(new Set(uids).size).toBe(uids.length);
});

await test("escapes text that would otherwise break the format", () => {
  const { buildICS } = withCases([aCase({ cid: "A,B;C", plan: "Plan\\X" })]);
  const ics = buildICS();
  expect(ics).toContain("A\\,B\\;C");
  // A raw comma or semicolon inside SUMMARY would split the property.
  const summary = lines(ics).find((l) => l.startsWith("SUMMARY:"));
  expect(summary).toContain("\\,");
});

await test("folds long lines to the 75-octet limit", () => {
  const { buildICS } = withCases([aCase({ cid: "X".repeat(200) })]);
  for (const l of lines(buildICS())) expect(l.length).toBeLessThan(76);
});

await test("an undated case contributes no phantom events", () => {
  const { buildICS } = withCases([aCase({ covered: "", note: "", cert: "", nomnc: "" })]);
  expect((buildICS().match(/BEGIN:VEVENT/g) || []).length).toBe(0);
});

/* -------------------------------------------------------- letters handoff */

suite("automation · letters handoff");

await test("a NOMNC case is routed to the fast-track letter", () => {
  const { appealHref } = withCases([aCase()]);
  const h = appealHref(aCase({ status: "NOMNC issued" }));
  expect(h).toContain("letter=qio");
  expect(h).toContain("Draft QIO appeal");
});

await test("an open denial is routed to the reconsideration letter", () => {
  const { appealHref } = withCases([aCase()]);
  expect(appealHref(aCase({ status: "Denied — appeal open" }))).toContain("letter=recon");
});

await test("a short authorization cycle offers the duration challenge", () => {
  const { appealHref } = withCases([aCase()]);
  expect(appealHref(aCase({ cycle: 3 }))).toContain("letter=short");
});

await test("a long cycle with nothing wrong offers no letter", () => {
  const { appealHref } = withCases([aCase()]);
  expect(appealHref(aCase({ cycle: 30 }))).toBe("");
});

await test("carries the covered-through date as the NOMNC effective date", () => {
  // The effective date is the LAST covered day. Handing over the wrong one
  // would push both notice deadlines a day late.
  const { appealHref } = withCases([aCase()]);
  const c = aCase({ status: "NOMNC issued", covered: "2026-09-18" });
  expect(appealHref(c)).toContain("effective=2026-09-18");
});

await test("case and plan travel url-encoded", () => {
  const { appealHref } = withCases([aCase()]);
  const h = appealHref(aCase({ status: "NOMNC issued", cid: "A B&C", plan: "P/Q" }));
  expect(h).notToContain("case=A B&C");
  expect(h).toContain("case=A+B%26C");
});

/* -------------------------------------------------------------- in-browser */

suite("automation · in the page");

const CASELOAD = [
  { id: "c1", cid: "214-B", plan: "Aetna MA", status: "NOMNC issued", admit: dayFromToday(-12),
    cycle: 3, lead: 1, covered: dayFromToday(1), nomnc: dayFromToday(-1),
    note: dayFromToday(-6), cert: dayFromToday(-12), exposure: 1500 },
];
const REGISTRY = [{
  id: "r1", plan: "Aetna Medicare Advantage", state: "NC", type: "Authorization submission route",
  interval: 90, verified: dayFromToday(-5), value: "Submit through the Availity provider portal.",
  source: "Aetna provider page",
}];

await test("the brief lists today's work and names where to file", async () => {
  const p = await open("tracker.html", {
    storage: { "ma-case-tracker-v1": CASELOAD, "cc-rules-v1": REGISTRY },
  });
  await p.click("#vBrief");
  const text = await p.textContent("#briefView");
  expect(text).toContain("214-B");
  expect(text).toContain("File fast-track QIO appeal");
  expect(text).toContain("Availity");                   // route pulled from the registry
  expect(await p.isVisible("#cases")).toBeFalsy();      // one view at a time
  expect(p.__errors).toEqual([]);
  await p.__ctx.close();
});

await test("the chosen view survives a reload", async () => {
  const p = await open("tracker.html", { storage: { "ma-case-tracker-v1": CASELOAD } });
  await p.click("#vBrief");
  await p.reload();
  await p.waitForTimeout(250);
  expect(await p.isVisible("#briefView")).toBeTruthy();
  expect(await p.getAttribute("#vBrief", "aria-pressed")).toBe("true");
  await p.__ctx.close();
});

await test("the caseload view is the default", async () => {
  const p = await open("tracker.html", { storage: { "ma-case-tracker-v1": CASELOAD } });
  expect(await p.isVisible("#cases")).toBeTruthy();
  expect(await p.isVisible("#briefView")).toBeFalsy();
  await p.__ctx.close();
});

await test("the letter builder fills itself in from a handed-over case", async () => {
  const p = await open(
    "appeal-letters.html?letter=qio&case=214-B&plan=Aetna+MA&admit=2026-09-01&effective=2026-09-18",
  );
  expect(await p.inputValue("#fMember")).toBe("214-B");
  expect(await p.inputValue("#fPlan")).toBe("Aetna MA");
  expect(await p.inputValue("#fEffective")).toBe("2026-09-18");
  // The requested letter is the one on screen, and the body reflects the case.
  expect(await p.getAttribute('.tab[data-t="qio"]', "aria-selected")).toBe("true");
  expect(await p.textContent("#letter")).toContain("214-B");
  expect(p.__errors).toEqual([]);
  await p.__ctx.close();
});

await test("a handed-over case is never written to storage", async () => {
  const p = await open("appeal-letters.html?case=214-B&plan=Aetna+MA");
  const saved = await p.evaluate(() => localStorage.getItem("ma-appeal-facility"));
  expect(String(saved || "")).notToContain("214-B");
  await p.__ctx.close();
});

await test("junk in the query string cannot inject markup", async () => {
  const p = await open("appeal-letters.html?case=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E");
  // Escaped text may legitimately contain the payload as characters; what must
  // never exist is a live element carrying the handler.
  expect(await p.$("[onerror]")).toBe(null);
  expect(await p.$$eval("img", (els) => els.length)).toBe(0);
  expect(p.__errors).toEqual([]);
  await p.__ctx.close();
});

await test("the calendar button produces a downloadable file", async () => {
  const p = await open("tracker.html", { storage: { "ma-case-tracker-v1": CASELOAD } });
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#icsBtn")]);
  expect(dl.suggestedFilename()).toMatch(/^cardinal-deadlines-\d{4}-\d{2}-\d{2}\.ics$/);
  await p.__ctx.close();
});
