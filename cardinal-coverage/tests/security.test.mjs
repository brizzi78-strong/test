// Lane: security — output escaping in the real DOM.
//
// Every tool renders user-entered text through innerHTML, so this lane seeds
// hostile free text into storage, drives the real page in Chromium, and asserts
// three things at once:
//   (a) nothing executed        — window.__pwned stays undefined
//   (b) nothing was parsed      — no injected <img>/<svg>/<script> nodes exist
//   (c) nothing was mangled     — the text reads back byte-for-byte as entered
// (c) matters as much as (a): a resident note that loses its apostrophe, or
// gains a literal "&amp;", is a real (lower-severity) defect of its own.

import { suite, test, expect, open, iso, dayFromToday } from "./harness.mjs";
import { writeFileSync, mkdirSync } from "node:fs";

suite("security — output escaping");

/* ------------------------------------------------------------- payloads */

const IMG    = `<img src=x onerror="window.__pwned=1">`;
const SCRIPT = `<script>window.__pwned=1<\/script>`;
const SVG    = `"><svg onload="window.__pwned=1">`;
const ATTR   = `' onmouseover='window.__pwned=1`;
const PLAIN  = `A & B < C > D "quoted" 'apostrophe'`;

/** One field's worth of hostility, tagged so failures name the field. */
const px = (tag) => `${tag} ${IMG} ${SCRIPT} ${SVG} ${ATTR} ${PLAIN}`;

const pwned = (p) => p.evaluate(() => window.__pwned);

/** Count injected nodes that could only exist if escaping failed. */
const injected = (p, sel) =>
  p.evaluate((s) => {
    const root = document.querySelector(s);
    if (!root) return -1;
    return root.querySelectorAll("img,svg,script,iframe,object,embed").length;
  }, sel);

/** Any element carrying an inline handler the payloads try to smuggle in. */
const handlers = (p) =>
  p.evaluate(() =>
    [...document.querySelectorAll("*")].filter(
      (el) => el.hasAttribute("onerror") || el.hasAttribute("onload") || el.hasAttribute("onmouseover")
    ).length
  );

/* ---------------------------------------------------------------- tracker */

const trackerCases = () => [
  {
    id: "case-a", cid: px("CID"), plan: px("PLAN"), admit: dayFromToday(-10),
    cycle: 3, lead: 1, covered: dayFromToday(2), nomnc: dayFromToday(-1),
    note: dayFromToday(-3), cert: dayFromToday(-10),
    status: px("STATUS"), exposure: 1200, order: px("ORDER"), notes: px("NOTES"),
  },
  {
    id: "case-b", cid: "214-B", plan: "Aetna MA", admit: dayFromToday(-4),
    cycle: 3, lead: 1, covered: dayFromToday(5), note: dayFromToday(-1),
    cert: dayFromToday(-4), status: "Authorized", exposure: 0, order: "",
    notes: `Resident's daughter called — "PT 5x/week" & <no> stair access.`,
  },
];

await test("tracker: hostile free text renders inert (no execution, no injected nodes)", async () => {
  const p = await open("tracker.html", { storage: { "ma-case-tracker-v1": trackerCases() } });
  await p.waitForTimeout(400);
  expect(await pwned(p)).toBe(undefined);
  expect(await injected(p, "#cases")).toBe(0);
  expect(await handlers(p)).toBe(0);
  expect(await p.locator("article.case").count()).toBe(2);   // structure not broken out of
  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("tracker: payload text reads back verbatim in the rendered card", async () => {
  const p = await open("tracker.html", { storage: { "ma-case-tracker-v1": trackerCases() } });
  const card = p.locator("article.case").filter({ hasText: "CID" }).first();
  expect(await card.locator(".cid").textContent()).toBe(px("CID"));
  expect(await card.locator(".plan").textContent()).toBe(px("PLAN"));
  expect(await card.locator(".cnotes").textContent()).toBe(px("NOTES"));
  const meta = await card.locator(".cmeta").textContent();
  expect(meta).toContain(px("STATUS"));
  expect(meta).toContain(px("ORDER"));
  // over-escaping check: no HTML entity ever reaches the visible layer
  expect(await card.locator(".cnotes").textContent()).notToContain("&amp;");
  expect(await card.locator(".cnotes").textContent()).notToContain("&#39;");
  await p.__ctx.close();
});

await test("tracker: a legitimate apostrophe/ampersand note survives round-trip through the editor", async () => {
  const p = await open("tracker.html", { storage: { "ma-case-tracker-v1": trackerCases() } });
  const benign = trackerCases()[1].notes;
  const card = p.locator("article.case").filter({ hasText: "214-B" }).first();
  expect(await card.locator(".cnotes").textContent()).toBe(benign);

  await card.locator("[data-edit]").click();
  expect(await p.inputValue("#fNotes")).toBe(benign);      // editor shows the original, not entities
  await p.click("#caseForm button[type=submit]");
  await p.waitForTimeout(300);

  const after = p.locator("article.case").filter({ hasText: "214-B" }).first();
  expect(await after.locator(".cnotes").textContent()).toBe(benign);
  expect(await pwned(p)).toBe(undefined);
  await p.__ctx.close();
});

await test("tracker: edit round-trip of a hostile case stays inert and byte-identical", async () => {
  const p = await open("tracker.html", { storage: { "ma-case-tracker-v1": trackerCases() } });
  const card = p.locator("article.case").filter({ hasText: "CID" }).first();
  await card.locator("[data-edit]").click();

  expect(await p.inputValue("#fId")).toBe(px("CID"));
  expect(await p.inputValue("#fNotes")).toBe(px("NOTES"));
  expect(await p.inputValue("#fOrder")).toBe(px("ORDER"));

  await p.click("#caseForm button[type=submit]");
  await p.waitForTimeout(400);

  expect(await pwned(p)).toBe(undefined);
  expect(await injected(p, "#cases")).toBe(0);
  const re = p.locator("article.case").filter({ hasText: "CID" }).first();
  expect(await re.locator(".cnotes").textContent()).toBe(px("NOTES"));
  await p.__ctx.close();
});

await test("tracker: the auth-cycle field is interpolated into the card without escaping", async () => {
  // render() emits `${c.cycle||3}-day cycle` raw while every neighbouring field
  // goes through esc(). A record whose cycle is a string executes on render.
  const rec = trackerCases();
  rec[0].cycle = `3<img src=x onerror="window.__pwned=1">`;
  const p = await open("tracker.html", { storage: { "ma-case-tracker-v1": rec } });
  await p.waitForTimeout(500);
  expect(await pwned(p)).toBe(undefined);
  expect(await injected(p, "#cases")).toBe(0);
  await p.__ctx.close();
});

/* --------------------------------------------------------------- outcomes */

const outcomeEvents = () => [
  {
    id: "ev-a", date: dayFromToday(-2), case: px("CASE"), plan: px("PLAN"),
    type: px("TYPE"), days: `5${IMG}`, amt: 0, note: px("NOTE"),
  },
  {
    id: "ev-b", date: dayFromToday(-1), case: "214-B", plan: "Aetna MA",
    type: "Appeal won", days: 6, amt: 4980,
    note: `Plan cited "plateau" & the resident's Jimmo rationale <held>.`,
  },
  {
    id: "ev-c", date: dayFromToday(-200), case: px("OLD"), plan: "WellCare MA",
    type: "Appeal filed — QIO", days: 0, amt: 0, note: px("OLDNOTE"),
  },
];

await test("outcomes: hostile events render inert in the log table", async () => {
  const p = await open("outcomes.html", { storage: { "cc-outcomes-v1": outcomeEvents() } });
  await p.waitForTimeout(400);
  expect(await pwned(p)).toBe(undefined);
  expect(await injected(p, "#tableWrap")).toBe(0);
  expect(await injected(p, "#cards")).toBe(0);
  expect(await injected(p, "#sentence")).toBe(0);
  expect(await handlers(p)).toBe(0);
  expect(await p.locator("#tableWrap tbody tr").count()).toBe(2);   // 90-day window
  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("outcomes: table cells read back exactly as entered", async () => {
  const p = await open("outcomes.html", { storage: { "cc-outcomes-v1": outcomeEvents() } });
  const row = p.locator("#tableWrap tbody tr").filter({ hasText: "CASE" }).first();
  const cells = row.locator("td");
  expect(await cells.nth(1).textContent()).toBe(px("CASE"));
  expect(await cells.nth(2).textContent()).toBe(px("PLAN"));
  expect(await cells.nth(3).textContent()).toBe(px("TYPE"));
  expect(await cells.nth(6).textContent()).toBe(px("NOTE"));
  // non-numeric "days" must be dropped, not emitted raw
  expect(await cells.nth(4).textContent()).toBe("");

  const benign = p.locator("#tableWrap tbody tr").filter({ hasText: "214-B" }).first();
  expect(await benign.locator("td").nth(6).textContent())
    .toBe(`Plan cited "plateau" & the resident's Jimmo rationale <held>.`);
  await p.__ctx.close();
});

await test("outcomes: every period filter re-render stays inert", async () => {
  const p = await open("outcomes.html", { storage: { "cc-outcomes-v1": outcomeEvents() } });
  for (const d of ["30", "365", "0", "90"]) {
    await p.click(`#period button[data-d="${d}"]`);
    await p.waitForTimeout(200);
    expect(await pwned(p)).toBe(undefined);
    expect(await injected(p, "#tableWrap")).toBe(0);
    expect(await injected(p, "#sentence")).toBe(0);
  }
  // "all time" pulls in the 200-day-old hostile row too
  await p.click(`#period button[data-d="0"]`);
  await p.waitForTimeout(250);
  expect(await p.locator("#tableWrap tbody tr").count()).toBe(3);
  expect(await pwned(p)).toBe(undefined);
  await p.__ctx.close();
});

await test("outcomes: edit round-trip of a hostile event stays inert", async () => {
  const p = await open("outcomes.html", { storage: { "cc-outcomes-v1": outcomeEvents() } });
  const row = p.locator("#tableWrap tbody tr").filter({ hasText: "CASE" }).first();
  await row.locator("[data-edit]").click();
  expect(await p.inputValue("#fCase")).toBe(px("CASE"));
  expect(await p.inputValue("#fNote")).toBe(px("NOTE"));
  await p.click("#evForm button[type=submit]");
  await p.waitForTimeout(400);
  expect(await pwned(p)).toBe(undefined);
  expect(await injected(p, "#tableWrap")).toBe(0);
  const again = p.locator("#tableWrap tbody tr").filter({ hasText: "CASE" }).first();
  expect(await again.locator("td").nth(6).textContent()).toBe(px("NOTE"));
  await p.__ctx.close();
});

await test("outcomes: a record id breaks out of the Edit button attribute", async () => {
  // render() emits data-edit="${e.id}" without esc(); e.id is the only field in
  // the row template that is not escaped.
  const evs = outcomeEvents();
  evs[1].id = `x"><img src=x onerror="window.__pwned=1">`;
  const p = await open("outcomes.html", { storage: { "cc-outcomes-v1": evs } });
  await p.waitForTimeout(500);
  expect(await pwned(p)).toBe(undefined);
  expect(await injected(p, "#tableWrap")).toBe(0);
  await p.__ctx.close();
});

/* ------------------------------------------------------------------ rules */

const hostileRules = () => [
  {
    id: "r-a", plan: px("PLAN"), state: px("STATE"), product: px("PRODUCT"),
    type: px("TYPE"), value: px("VALUE"), source: px("SOURCE"), by: px("BY"),
    verified: dayFromToday(-5), interval: 90, effective: dayFromToday(-40),
    note: px("NOTE"),
    history: [{ value: px("HISTORY"), until: dayFromToday(-20), source: px("HSOURCE") }],
  },
  {
    id: "r-b", plan: "Aetna Medicare Advantage", state: "NC", product: "Medicare Advantage",
    type: "Appeal route", interval: 90, verified: dayFromToday(-5), by: "RB",
    value: `Route via the plan's portal — "Care Management" tab & <not> by fax.`,
    source: "javascript:window.__pwned=1", note: "", history: [],
  },
  {
    id: "r-c", plan: "WellCare Medicare Advantage", state: "NC", product: "Medicare Advantage",
    type: "Contact", interval: 90, verified: dayFromToday(-5), by: "RB",
    value: "Provider line 888-632-3862.",
    source: `https://example.test/manual?a=1&b=2"><img src=x onerror="window.__pwned=1">`,
    note: "", history: [],
  },
  {
    id: "r-d", plan: "Acentra Health (BFCC-QIO)", state: "NC", product: "All",
    type: "Contact", interval: 90, verified: dayFromToday(-5), by: "RB",
    value: "Beneficiary helpline 1-888-317-0751.",
    source: `data:text/html,<script>window.__pwned=1<\/script>`, note: "", history: [],
  },
];

await test("rules: hostile registry entries render inert", async () => {
  const p = await open("rules.html", { storage: { "cc-rules-v1": hostileRules() } });
  await p.waitForTimeout(400);
  expect(await pwned(p)).toBe(undefined);
  expect(await injected(p, "#list")).toBe(0);
  expect(await injected(p, "#stats")).toBe(0);
  expect(await handlers(p)).toBe(0);
  expect(await p.locator("article.rule").count()).toBe(4);
  // filter dropdowns are built from the same strings
  expect(await p.evaluate(() => document.querySelectorAll("#fPlanSel option").length)).toBe(5);
  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("rules: rule value, note and history read back verbatim", async () => {
  const p = await open("rules.html", { storage: { "cc-rules-v1": hostileRules() } });
  const art = p.locator("article.rule").filter({ hasText: "VALUE" }).first();
  expect(await art.locator("p.rval").first().textContent()).toBe(px("VALUE"));
  expect(await art.locator("p.rval").nth(1).textContent()).toBe(px("NOTE"));
  expect(await art.locator(".rmeta").textContent()).toContain(px("SOURCE"));
  expect(await art.locator(".rmeta").textContent()).toContain(px("BY"));
  expect(await art.locator(".hist").textContent()).toContain(px("HISTORY").slice(0, 60));
  expect(await art.locator("p.rval").first().textContent()).notToContain("&quot;");

  const benign = p.locator("article.rule").filter({ hasText: "Care Management" }).first();
  expect(await benign.locator("p.rval").first().textContent())
    .toBe(`Route via the plan's portal — "Care Management" tab & <not> by fax.`);
  await p.__ctx.close();
});

await test("rules: a javascript:/data: source is never rendered as a clickable link", async () => {
  const p = await open("rules.html", { storage: { "cc-rules-v1": hostileRules() } });
  const js = p.locator("article.rule").filter({ hasText: "Care Management" }).first();
  expect(await js.locator("a").count()).toBe(0);
  expect(await js.locator(".rmeta").textContent()).toContain("javascript:window.__pwned=1");

  const data = p.locator("article.rule").filter({ hasText: "888-317-0751" }).first();
  expect(await data.locator("a").count()).toBe(0);

  // no anchor anywhere in the list may carry a non-http scheme
  const bad = await p.evaluate(() =>
    [...document.querySelectorAll("#list a")]
      .map((a) => a.getAttribute("href") || "")
      .filter((h) => !/^https?:\/\//i.test(h))
  );
  expect(bad.length).toBe(0);
  await p.__ctx.close();
});

await test("rules: an http source is a link, with the payload escaped inside the href", async () => {
  const p = await open("rules.html", { storage: { "cc-rules-v1": hostileRules() } });
  const ok = p.locator("article.rule").filter({ hasText: "888-632-3862" }).first();
  expect(await ok.locator("a").count()).toBe(1);
  expect(await ok.locator("a").getAttribute("href"))
    .toBe(`https://example.test/manual?a=1&b=2"><img src=x onerror="window.__pwned=1">`);
  expect(await ok.locator("a").getAttribute("rel")).toBe("noopener noreferrer");
  expect(await injected(p, "#list")).toBe(0);
  expect(await pwned(p)).toBe(undefined);
  await p.__ctx.close();
});

await test("rules: search and select filters stay inert across re-renders", async () => {
  const p = await open("rules.html", { storage: { "cc-rules-v1": hostileRules() } });
  for (const q of ["<img", "onerror", "'", '"', "VALUE", ""]) {
    await p.fill("#fSearch", q);
    await p.waitForTimeout(150);
    expect(await pwned(p)).toBe(undefined);
    expect(await injected(p, "#list")).toBe(0);
  }
  await p.selectOption("#fPlanSel", px("PLAN"));
  await p.waitForTimeout(200);
  expect(await p.locator("article.rule").count()).toBe(1);
  expect(await pwned(p)).toBe(undefined);
  expect(await injected(p, "#list")).toBe(0);

  await p.selectOption("#fFreshSel", "fresh");
  await p.waitForTimeout(200);
  expect(await pwned(p)).toBe(undefined);
  await p.__ctx.close();
});

await test("rules: edit round-trip of a hostile rule stays inert", async () => {
  const p = await open("rules.html", { storage: { "cc-rules-v1": hostileRules() } });
  const art = p.locator("article.rule").filter({ hasText: "VALUE" }).first();
  await art.locator("[data-edit]").click();
  expect(await p.inputValue("#rValue")).toBe(px("VALUE"));
  expect(await p.inputValue("#rSource")).toBe(px("SOURCE"));
  await p.fill("#rValue", px("VALUE2"));
  await p.click("#ruleForm button[type=submit]");
  await p.waitForTimeout(400);
  expect(await pwned(p)).toBe(undefined);
  expect(await injected(p, "#list")).toBe(0);
  const again = p.locator("article.rule").filter({ hasText: "VALUE2" }).first();
  expect(await again.locator("p.rval").first().textContent()).toBe(px("VALUE2"));
  // the superseded value lands in history — also unescaped-hostile
  expect(await again.locator(".hist").textContent()).toContain("VALUE");
  await p.__ctx.close();
});

await test("rules: importing a crafted registry export must not execute script", async () => {
  // rules.html ships Export/Import so facilities can share a registry file.
  // Import pushes incoming objects wholesale, and render() emits
  // data-edit="${r.id}" unescaped — so the id field is an injection point in a
  // file that arrives by email.
  const dir = "/tmp/claude-0/-home-user-test/0645010b-594a-593a-80e3-fc9476a4a141/scratchpad";
  mkdirSync(dir, { recursive: true });
  const file = `${dir}/hostile-rules-export.json`;
  writeFileSync(file, JSON.stringify([{
    id: `x"><img src=x onerror="window.__pwned=1">`,
    plan: "Shared Registry", state: "NC", product: "Medicare Advantage",
    type: "Appeal route", interval: 90, verified: dayFromToday(-3), by: "peer",
    value: "Imported rule from a partner facility.", source: "Partner export",
    note: "", history: [],
  }]));

  const p = await open("rules.html", { storage: { "cc-rules-v1": hostileRules() } });
  p.on("dialog", (d) => d.accept());
  await p.setInputFiles("#fileIn", file);
  await p.waitForTimeout(700);

  expect(await p.locator("article.rule").count()).toBe(5);   // import landed
  expect(await pwned(p)).toBe(undefined);
  expect(await injected(p, "#list")).toBe(0);
  await p.__ctx.close();
});

/* ---------------------------------------------------------------- letters */

const LETTER_FIELDS = {
  fReason: px("REASON"),
  fOrder: px("ORDER"),
  fPlof: px("PLOF"),
  fCurrent: px("CURRENT"),
  fSkilled: px("SKILLED"),
  fRisk: px("RISK"),
  fJimmo: px("JIMMO"),
  fMember: px("MEMBER"),
  fMemberId: px("MEMBERID"),
  fAuth: px("AUTH"),
};

await test("letters: clinical payloads appear literally in the generated letter", async () => {
  const p = await open("appeal-letters.html");
  for (const [id, val] of Object.entries(LETTER_FIELDS)) await p.fill("#" + id, val);
  await p.waitForTimeout(400);

  const text = await p.locator("#letter").textContent();
  for (const val of Object.values(LETTER_FIELDS)) expect(text).toContain(val);

  // the letter body is a single text node — nothing was parsed as markup
  expect(await p.evaluate(() => document.querySelector("#letter").children.length)).toBe(0);
  expect(await pwned(p)).toBe(undefined);
  expect(await injected(p, "#letter")).toBe(0);
  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("letters: payloads survive every letter tab without execution", async () => {
  const p = await open("appeal-letters.html");
  await p.fill("#fReason", px("REASON"));
  await p.fill("#fOrder", px("ORDER"));
  // Letter C (short-auth challenge) quotes the ordered POC, not the denial reason.
  for (const [t, field] of [["recon", "REASON"], ["short", "ORDER"], ["qio", "REASON"]]) {
    await p.click(`.tab[data-t="${t}"]`);
    await p.waitForTimeout(200);
    const text = await p.locator("#letter").textContent();
    expect(text).toContain(px(field));
    expect(await pwned(p)).toBe(undefined);
    expect(await p.evaluate(() => document.querySelector("#letter").children.length)).toBe(0);
  }
  await p.__ctx.close();
});

await test("letters: persisted facility letterhead loads as text, not markup", async () => {
  const p = await open("appeal-letters.html", {
    storage: {
      "ma-appeal-facility": {
        fFac: px("FACILITY"), fPhone: px("PHONE"), fAddr: px("ADDR"),
        fPrep: px("PREP"), fTitle: px("TITLE"), fFax: px("FAX"),
        fNPI: px("NPI"), fPlan: px("PLAN"), fPlanFax: px("PLANFAX"),
      },
    },
  });
  await p.waitForTimeout(300);
  expect(await p.inputValue("#fFac")).toBe(px("FACILITY"));
  const text = await p.locator("#letter").textContent();
  expect(text).toContain(px("FACILITY"));
  expect(text).toContain(px("PREP"));
  expect(await pwned(p)).toBe(undefined);
  expect(await p.evaluate(() => document.querySelector("#letter").children.length)).toBe(0);
  await p.__ctx.close();
});

await test("letters: apostrophes, ampersands and angle brackets are not entity-mangled", async () => {
  const clinical = `Ambulates 45 ft with RW; resident's daughter reports <2 stairs> & "no rail".`;
  const p = await open("appeal-letters.html");
  await p.fill("#fCurrent", clinical);
  await p.fill("#fFac", `Example Skilled Nursing & Rehabilitation`);
  await p.waitForTimeout(300);
  const text = await p.locator("#letter").textContent();
  expect(text).toContain(clinical);
  expect(text).toContain(`Example Skilled Nursing & Rehabilitation`);
  expect(text).notToContain("&amp;");
  expect(text).notToContain("&#39;");
  expect(text).notToContain("&lt;");
  await p.__ctx.close();
});
