// Lane: letters — appeal-letters.html (the letter generator)
//
// Pins the three letters' regulatory anchors, placeholder behaviour, the
// "letterhead persists / PHI never does" promise, and tab isolation.

import { suite, test, expect, open, dayFromToday } from "./harness.mjs";

const FILE = "appeal-letters.html";

/* Every editable field on the page, with a value that is unmistakable in output. */
const TEXTS = {
  fFac: "Cardinal Grove Skilled Nursing",
  fPhone: "(919) 555-0100",
  fAddr: "100 Example Rd., Raleigh, NC 27601",
  fPrep: "Jordan Ellis, RN",
  fTitle: "Director of Nursing",
  fFax: "(919) 555-0101",
  fNPI: "1234567890",
  fPlan: "Aetna Medicare Advantage",
  fPlanFax: "(800) 555-1111",
  fMember: "Wilma Testerson",
  fMemberId: "MBR-99887766",
  fAuth: "AUTH-4321",
  fReason: "Member has reached maximum functional potential.",
  fOrder: "PT 5x/week x 21 days, certified",
  fPlof: "Lived alone in a two-story home, drove, no device.",
  fCurrent: "Ambulates 45 ft with RW, min assist. Berg 32/56.",
  fSkilled: "Gait training with real-time correction of L trunk lean.",
  fRisk: "Fall risk at current Berg score; stairs at discharge home.",
  fJimmo: "Skilled therapy needed to maintain transfer safety.",
};
const DATES = { fAdmit: dayFromToday(-14), fDenial: dayFromToday(-3), fEffective: dayFromToday(1) };
const PHI_FIELDS = ["fMember", "fMemberId", "fAuth", "fAdmit", "fDenial", "fEffective",
  "fReason", "fOrder", "fPlof", "fCurrent", "fSkilled", "fRisk", "fJimmo"];

async function fillAll(p) {
  for (const [id, val] of Object.entries(TEXTS)) await p.fill("#" + id, val);
  for (const [id, val] of Object.entries(DATES)) await p.fill("#" + id, val);
}
const brackets = (s) => [...new Set(String(s).match(/\[[^\]\n]*\]/g) || [])];
const letterOn = async (p, t) => {
  await p.click(`.tab[data-t="${t}"]`);
  return await p.locator("#letter").textContent();
};

/* ------------------------------------------------------------- generation */
suite("letters · generation");

await test("all three letters render with their distinguishing regulatory anchors", async () => {
  const p = await open(FILE);
  await fillAll(p);

  const a = await letterOn(p, "qio");
  expect(a).toContain("Acentra Health");
  expect(a).toContain("BURDEN OF PROOF");
  expect(a).toContain("Under 42 CFR 422.626, the burden of proof rests with the Medicare Advantage organization");

  const b = await letterOn(p, "recon");
  expect(b).toContain("THE PLAN MUST APPLY TRADITIONAL MEDICARE CRITERIA");
  expect(b).toContain("REQUEST FOR THE CRITERIA RELIED UPON");
  expect(b).toContain("identify, in writing, the specific coverage criterion relied upon");
  expect(b).toContain("42 CFR 422.101(b)");

  const c = await letterOn(p, "short");
  expect(c).toContain("AUTHORIZATION DURATION IS GOVERNED BY 42 CFR 422.112(b)(8)");
  expect(c).toContain("42 CFR 422.112(b)(8)(i)(A)");

  // all three are real letters, not stubs, and the page stayed quiet
  for (const t of [a, b, c]) expect(t.length).toBeGreaterThan(1200);
  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("REGRESSION: the duration argument cites 422.112(b)(8), never 422.138", async () => {
  // 422.138(c) is the no-reopening provision; hanging authorization *duration*
  // on it was a real miscitation. Scope the check to the duration section.
  const p = await open(FILE);
  await fillAll(p);
  const c = await letterOn(p, "short");

  const start = c.indexOf("AUTHORIZATION DURATION IS GOVERNED BY");
  const end = c.indexOf("APPROVED DETERMINATIONS MAY NOT BE REOPENED");
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);

  const durationSection = c.slice(start, end);
  expect(durationSection).toContain("422.112(b)(8)");
  expect(durationSection).toContain("valid for as long as medically reasonable and necessary");
  expect(durationSection).notToContain("422.138");
  await p.__ctx.close();
});

await test("422.138(c) appears only as the no-reopening provision, and only in letter C", async () => {
  const p = await open(FILE);
  await fillAll(p);

  const c = await letterOn(p, "short");
  const reopen = c.slice(c.indexOf("APPROVED DETERMINATIONS MAY NOT BE REOPENED"));
  expect(reopen).toContain("42 CFR 422.138(c) provides");
  expect(reopen).toContain("may not subsequently deny coverage on the basis of lack of medical necessity");

  expect(await letterOn(p, "qio")).notToContain("422.138");
  expect(await letterOn(p, "recon")).notToContain("422.138");
  await p.__ctx.close();
});

await test("switching tabs regenerates the letter without leaking the previous one", async () => {
  const p = await open(FILE);
  await fillAll(p);

  await letterOn(p, "qio");
  const b = await letterOn(p, "recon");
  expect(b).notToContain("Acentra Health");
  expect(b).notToContain("BURDEN OF PROOF");
  expect(b).notToContain("422.626");

  const c = await letterOn(p, "short");
  expect(c).notToContain("REQUEST FOR THE CRITERIA RELIED UPON");
  expect(c).notToContain("EXPEDITED REVIEW REQUESTED");
  expect(c).notToContain("Appeals and Grievances");

  const a = await letterOn(p, "qio");
  expect(a).notToContain("422.112(b)(8)");
  expect(a).notToContain("Utilization Management / Medical Director");
  expect(a).toContain("Acentra Health");
  await p.__ctx.close();
});

await test("tab selection state and the tab description follow the active letter", async () => {
  const p = await open(FILE);
  expect(await p.locator('.tab[data-t="qio"]').getAttribute("aria-selected")).toBe("true");
  expect(await p.locator("#tabdesc").textContent()).toContain("422.626");

  await p.click('.tab[data-t="short"]');
  expect(await p.locator('.tab[data-t="short"]').getAttribute("aria-selected")).toBe("true");
  expect(await p.locator('.tab[data-t="qio"]').getAttribute("aria-selected")).toBe("false");
  expect(await p.locator("#tabdesc").textContent()).toContain("422.112(b)(8)");
  expect(await p.locator('.tab[aria-selected="true"]').count()).toBe(1);
  await p.__ctx.close();
});

/* ----------------------------------------------------------- placeholders */
suite("letters · placeholders");

await test("blank fields surface bracketed placeholders so the gap is visible", async () => {
  const p = await open(FILE);
  const a = await p.locator("#letter").textContent();
  for (const ph of ["[Facility name]", "[Member name]", "[member ID]", "[plan name]",
    "[reference #]", "[date]", "[Name]", "[Title]"]) expect(a).toContain(ph);
  await p.__ctx.close();
});

await test("with every field filled, no bracketed placeholder survives into any letter", async () => {
  const p = await open(FILE);
  await fillAll(p);
  for (const t of ["qio", "recon", "short"]) {
    const txt = await letterOn(p, t);
    const left = brackets(txt);
    expect(`${t}: ${JSON.stringify(left)}`).toBe(`${t}: []`);
  }
  await p.__ctx.close();
});

await test("filling one field replaces only its own placeholder", async () => {
  const p = await open(FILE);
  await p.fill("#fMemberId", "MBR-99887766");
  const a = await p.locator("#letter").textContent();
  expect(a).toContain("Member ID: MBR-99887766");
  expect(a).notToContain("[member ID]");
  expect(a).toContain("[Member name]");   // still blank, still flagged
  expect(a).toContain("[plan name]");
  await p.__ctx.close();
});

await test("the Jimmo maintenance argument appears only when its field is used", async () => {
  const p = await open(FILE);
  await fillAll(p);
  let a = await letterOn(p, "qio");
  expect(a).toContain("Jimmo v. Sebelius");
  expect(a).toContain("Continued skilled need on a maintenance basis.");

  await p.fill("#fJimmo", "");
  a = await p.locator("#letter").textContent();
  expect(a).notToContain("Jimmo v. Sebelius");
  expect(a).notToContain("Continued skilled need on a maintenance basis.");
  expect(brackets(a)).toEqual([]);        // clearing it must not open a hole
  await p.__ctx.close();
});

await test("letter body is rendered as text, not markup", async () => {
  const p = await open(FILE);
  await p.fill("#fMember", '<b>Wilma</b> <script>alert(1)</script>');
  const info = await p.evaluate(() => ({
    kids: document.getElementById("letter").children.length,
    txt: document.getElementById("letter").textContent,
  }));
  expect(info.kids).toBe(0);
  expect(info.txt).toContain("<b>Wilma</b>");
  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

/* --------------------------------------------------------------- privacy */
suite("letters · privacy promise");

await test("typing PHI writes nothing PHI-shaped to localStorage", async () => {
  const p = await open(FILE);
  await fillAll(p);
  const store = await p.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  const dump = JSON.stringify(store);
  expect(Object.keys(store)).toEqual(["ma-appeal-facility"]);
  for (const val of [TEXTS.fMember, TEXTS.fMemberId, TEXTS.fAuth, TEXTS.fCurrent,
    TEXTS.fPlof, TEXTS.fSkilled, TEXTS.fRisk, TEXTS.fJimmo, TEXTS.fReason,
    DATES.fAdmit, DATES.fDenial, DATES.fEffective]) expect(dump).notToContain(val);
  await p.__ctx.close();
});

await test("reload restores facility letterhead and drops every PHI field", async () => {
  const p = await open(FILE);
  await fillAll(p);
  await p.reload();
  await p.waitForTimeout(250);

  const after = await p.evaluate((ids) => {
    const o = {};
    for (const id of ids) o[id] = document.getElementById(id).value;
    return o;
  }, ["fFac", "fPhone", "fAddr", "fPrep", "fTitle", "fFax", "fNPI", ...PHI_FIELDS]);

  expect(after.fFac).toBe(TEXTS.fFac);
  expect(after.fAddr).toBe(TEXTS.fAddr);
  expect(after.fPrep).toBe(TEXTS.fPrep);
  expect(after.fTitle).toBe(TEXTS.fTitle);
  expect(after.fPhone).toBe(TEXTS.fPhone);

  const survived = PHI_FIELDS.filter((k) => after[k] !== "");
  expect(JSON.stringify(survived)).toBe("[]");

  const letter = await p.locator("#letter").textContent();
  expect(letter).toContain(TEXTS.fFac);
  expect(letter).notToContain(TEXTS.fMember);
  expect(letter).notToContain(TEXTS.fMemberId);
  expect(letter).toContain("[Member name]");
  await p.__ctx.close();
});

await test("seeded letterhead flows straight into the generated letter", async () => {
  const p = await open(FILE, {
    storage: { "ma-appeal-facility": { fFac: "Seeded SNF", fAddr: "9 Seed Ln", fPrep: "Pat Seed", fTitle: "Administrator", fPhone: "(919) 555-0999" } },
  });
  const a = await p.locator("#letter").textContent();
  expect(a).toContain("Seeded SNF");
  expect(a).toContain("9 Seed Ln");
  expect(a).toContain("Pat Seed, Administrator");
  expect(a).toContain("Phone (919) 555-0999");
  expect(a).toContain("[Member name]");   // seeding letterhead must not seed a case
  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("nothing persists that the UI has not marked '(saved)'", async () => {
  // The page discloses what survives a reload by marking those fieldset legends
  // "(saved)" — facility letterhead, plus plan name and appeals fax, which are
  // reusable across letters and are not PHI. Anything persisted outside a
  // (saved) fieldset is an undisclosed carry-over on a shared machine.
  const p = await open(FILE);
  await fillAll(p);
  const declared = await p.evaluate(() => {
    const fs = [...document.querySelectorAll("fieldset")]
      .filter((f) => /\(saved\)/i.test(f.querySelector("legend")?.textContent || ""));
    return fs.flatMap((f) => [...f.querySelectorAll("input,textarea,select")].map((e) => e.id)).sort();
  });
  const persisted = await p.evaluate(() =>
    Object.keys(JSON.parse(localStorage.getItem("ma-appeal-facility") || "{}")).sort());
  const undisclosed = persisted.filter((k) => !declared.includes(k));
  expect(JSON.stringify(undisclosed)).toBe("[]");
  // And the resident fields must still be absent from storage entirely.
  for (const phi of ["fMember","fMemberId","fAdmit","fDenial","fPlof","fCurrent","fSkilled","fJimmo"])
    expect(persisted.includes(phi)).toBe(false);
  await p.__ctx.close();
});

/* -------------------------------------------------------- counsel warning */
suite("letters · counsel warning");

await test("the filing-capacity warning is present and visible", async () => {
  const p = await open(FILE);
  const warn = p.locator("p.phi", { hasText: "Have counsel review before first use" });
  expect(await warn.count()).toBe(1);
  expect(await warn.isVisible()).toBe(true);
  const box = await warn.boundingBox();
  expect(box.height).toBeGreaterThan(20);

  const txt = await warn.textContent();
  expect(txt).toContain("42 CFR 422.574");
  expect(txt).toContain("42 CFR 422.584(c)(2)");
  expect(txt).toContain("Form CMS-1696");
  expect(txt).toContain("waiver of liability");
  await p.__ctx.close();
});

await test("the counsel warning renders in its critical-alert styling", async () => {
  const p = await open(FILE);
  const style = await p.evaluate(() => {
    const el = [...document.querySelectorAll("p.phi")]
      .find((e) => /Have counsel review/.test(e.textContent));
    const cs = getComputedStyle(el);
    return {
      crit: getComputedStyle(document.documentElement).getPropertyValue("--crit").trim(),
      critBg: getComputedStyle(document.documentElement).getPropertyValue("--crit-bg").trim(),
      bg: cs.backgroundColor,
      bodyBg: getComputedStyle(document.body).backgroundColor,
    };
  });
  // The markup asks for var(--crit-bg)/var(--crit); those tokens must exist.
  expect(`--crit=${style.crit || "(undefined)"} --crit-bg=${style.critBg || "(undefined)"}`)
    .toMatch(/^--crit=#?\w+ --crit-bg=#?\w+$/);
  expect(style.bg).notToContain("rgba(0, 0, 0, 0)");
  expect(style.bg === style.bodyBg ? "callout background equals page background" : "ok").toBe("ok");
  await p.__ctx.close();
});
