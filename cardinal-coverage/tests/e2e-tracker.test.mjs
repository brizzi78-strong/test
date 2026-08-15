// Lane: e2e-tracker — drive tracker.html in a real browser the way a user does.
import { existsSync } from "node:fs";
import { suite, test, expect, open, dayFromToday, DIR } from "./harness.mjs";

suite("e2e tracker");

const KEY = "ma-case-tracker-v1";

/* ---------------------------------------------------------------- helpers */

const cidsInOrder = (p) =>
  p.$$eval("article.case .cid", (els) => els.map((e) => e.textContent));

const cardFor = (p, cid) =>
  p.locator("article.case").filter({ has: p.locator(".cid", { hasText: new RegExp(`^${cid}$`) }) });

/** label -> {date, rel, cls} for every clock tile on the named case card. */
function clocksOf(p, cid) {
  return p.evaluate((want) => {
    const art = [...document.querySelectorAll("article.case")]
      .find((a) => a.querySelector(".cid")?.textContent === want);
    if (!art) return null;
    const out = {};
    for (const c of art.querySelectorAll(".clock")) {
      out[c.querySelector(".lab").textContent] = {
        date: c.querySelector(".date")?.textContent ?? "",
        rel: c.querySelector(".rel")?.textContent ?? "",
        cls: c.className,
      };
    }
    return out;
  }, cid);
}

function statsOf(p) {
  return p.evaluate(() => {
    const out = {};
    for (const s of document.querySelectorAll("#stats .stat"))
      out[s.querySelector(".k").textContent] = s.querySelector(".v").textContent;
    return out;
  });
}

const stored = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || "[]"), KEY);

/** Fill the open dialog. Only the keys given are touched. */
async function fillDialog(p, v) {
  const map = {
    cid: "#fId", plan: "#fPlan", admit: "#fAdmit", cycle: "#fCycle",
    covered: "#fCovered", lead: "#fLead", note: "#fNote", cert: "#fCert",
    nomnc: "#fNomnc", exposure: "#fExp", order: "#fOrder", notes: "#fNotes",
  };
  for (const [k, sel] of Object.entries(map))
    if (v[k] !== undefined) await p.fill(sel, String(v[k]));
  if (v.status !== undefined) await p.selectOption("#fStatus", v.status);
}

async function addCase(p, v) {
  await p.click("#addBtn");
  await p.waitForSelector("dialog[open]");
  await fillDialog(p, v);
  await p.click("#caseForm button[type=submit]");
  await p.waitForSelector("dialog[open]", { state: "detached" }).catch(() => {});
  await p.waitForTimeout(120);
}

/* A caseload whose urgency is fully determined by `covered`:
   no admit/note/cert means the only dated clocks are the covered-date family,
   and the minimum is always covered-2 (the "NOMNC deliver by" tile). */
const SEV_SEED = [
  { id: "s-ok",   cid: "OK-CASE",   plan: "Aetna MA",    cycle: 3, lead: 1, covered: dayFromToday(5),  status: "Authorized",            exposure: 4980 },
  { id: "s-warn", cid: "WARN-CASE", plan: "WellCare MA", cycle: 3, lead: 1, covered: dayFromToday(4),  status: "Recert pending",        exposure: 830 },
  { id: "s-crit", cid: "CRIT-CASE", plan: "Humana MA",   cycle: 3, lead: 1, covered: dayFromToday(2),  status: "NOMNC issued",          exposure: 0 },
  { id: "s-late", cid: "LATE-CASE", plan: "Cigna MA",    cycle: 3, lead: 1, covered: dayFromToday(-1), status: "Denied — appeal open",  exposure: 1240 },
];

/* ------------------------------------------------------------------ tests */

await test("loads clean and seeds two starter cases", async () => {
  const p = await open("tracker.html");
  expect(p.__errors.length).toBe(0);
  expect(await p.locator("article.case").count()).toBe(2);
  expect((await statsOf(p))["Active cases"]).toBe("2");
  expect(await p.locator("#dlg[open]").count()).toBe(0);
  await p.__ctx.close();
});

await test("add case: dialog opens, saves, card appears and stats update", async () => {
  const p = await open("tracker.html");
  await p.click("#addBtn");
  expect(await p.locator("dialog[open]").count()).toBe(1);
  expect(await p.locator("#dlgTitle").textContent()).toBe("Add case");
  // Delete is hidden when adding a brand-new case.
  expect(await p.locator("#delBtn").isVisible()).toBe(false);

  await fillDialog(p, {
    cid: "E2E-1", plan: "Aetna MA", admit: dayFromToday(-3), cycle: 3,
    covered: dayFromToday(5), lead: 1, note: dayFromToday(-1), cert: dayFromToday(-3),
    status: "Recert pending", exposure: 2500, order: "PT 5x/week × 21 days",
    notes: "Added through the real dialog.",
  });
  await p.click("#caseForm button[type=submit]");
  await p.waitForTimeout(150);

  expect(await p.locator("dialog[open]").count()).toBe(0);
  expect(await p.locator("article.case").count()).toBe(3);
  expect(await cidsInOrder(p)).toContain("E2E-1");

  const card = cardFor(p, "E2E-1");
  expect(await card.locator(".plan").textContent()).toBe("Aetna MA");
  expect(await card.locator(".cmeta").textContent())
    .toContain("Recert pending · 3-day cycle · exposure $2,500 · ordered: PT 5x/week × 21 days");
  expect(await card.locator(".cnotes").textContent()).toBe("Added through the real dialog.");

  const s = await statsOf(p);
  expect(s["Active cases"]).toBe("3");
  expect(s["Exposure at risk"]).toBe("$2,500");

  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("clocks on the new case are computed from the entered dates", async () => {
  const p = await open("tracker.html");
  await addCase(p, {
    cid: "E2E-CLK", plan: "Aetna MA", admit: dayFromToday(-3), cycle: 3,
    covered: dayFromToday(5), lead: 1, note: dayFromToday(-1), cert: dayFromToday(-3),
    status: "Authorized", exposure: 0,
  });

  const cl = await clocksOf(p, "E2E-CLK");
  expect(Boolean(cl)).toBe(true);
  // covered = +5, lead = 1
  expect(cl["Auth covered through"].rel).toBe("in 5 days");
  expect(cl["Next submission due"].rel).toBe("in 4 days");
  expect(cl["NOMNC deliver by"].rel).toBe("in 3 days");        // effective - 2
  expect(cl["QIO deadline (per NOMNC)"].rel).toBe("in 4 days"); // effective - 1
  expect(cl["Next window ends (+3d cycle)"].rel).toBe("in 8 days");
  // admit = -3 -> day 4 of stay; first recert on the 14th day of care = admit+13
  expect(cl["Stay day"].date).toBe("Day 4 of stay");
  expect(cl["Physician recert due"].rel).toBe("in 10 days");
  // last note -1 -> due in 6 days
  expect(cl["Weekly progress note due"].rel).toBe("in 6 days");
  // No NOMNC delivery date entered, so the 422.626 companion clock is absent.
  expect(Object.keys(cl).join("|")).notToContain("422.626");

  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("NOMNC delivered early pulls the QIO deadline forward", async () => {
  const p = await open("tracker.html");
  await addCase(p, {
    cid: "E2E-NOM", plan: "WellCare MA", admit: dayFromToday(-5), cycle: 3,
    covered: dayFromToday(6), lead: 1, nomnc: dayFromToday(0), status: "NOMNC issued",
  });
  const cl = await clocksOf(p, "E2E-NOM");
  // delivered today -> 422.626 deadline = tomorrow noon, earlier than covered-1 (+5)
  expect(cl["QIO deadline (earlier of two)"].rel).toBe("Tomorrow (by noon)");
  expect(cl["— per NOMNC (effective−1)"]).toBeTruthy();
  expect(cl["— per NOMNC (effective−1)"].rel).notToContain("Tomorrow");
  expect(cl["QIO deadline (earlier of two)"].cls).toContain("warn");
  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("edit round-trip: every field comes back exactly as saved", async () => {
  const p = await open("tracker.html");
  const v = {
    cid: "E2E-RT", plan: "Blue Cross NC MA", admit: dayFromToday(-8), cycle: 7,
    covered: dayFromToday(9), lead: 2, note: dayFromToday(-2), cert: dayFromToday(-8),
    nomnc: dayFromToday(-1), status: "Denied — appeal open", exposure: 12345,
    order: "OT 3x/week × 14 days", notes: "Line one\nLine two",
  };
  await addCase(p, v);

  await cardFor(p, "E2E-RT").locator("[data-edit]").click();
  await p.waitForSelector("dialog[open]");
  expect(await p.locator("#dlgTitle").textContent()).toBe("Edit case");
  expect(await p.locator("#delBtn").isVisible()).toBe(true);

  const got = await p.evaluate(() => ({
    cid: fId.value, plan: fPlan.value, admit: fAdmit.value, cycle: fCycle.value,
    covered: fCovered.value, lead: fLead.value, note: fNote.value, cert: fCert.value,
    nomnc: fNomnc.value, status: fStatus.value, exposure: fExp.value,
    order: fOrder.value, notes: fNotes.value,
  }));
  expect(got).toEqual({
    cid: v.cid, plan: v.plan, admit: v.admit, cycle: "7", covered: v.covered,
    lead: "2", note: v.note, cert: v.cert, nomnc: v.nomnc, status: v.status,
    exposure: "12345", order: v.order, notes: v.notes,
  });

  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("editing a case updates it in place rather than duplicating it", async () => {
  const p = await open("tracker.html");
  await addCase(p, { cid: "E2E-EDIT", plan: "Aetna MA", covered: dayFromToday(6), lead: 1, exposure: 100 });
  const before = await p.locator("article.case").count();

  await cardFor(p, "E2E-EDIT").locator("[data-edit]").click();
  await p.waitForSelector("dialog[open]");
  await fillDialog(p, { covered: dayFromToday(3), exposure: 900 });
  await p.click("#caseForm button[type=submit]");
  await p.waitForTimeout(150);

  expect(await p.locator("article.case").count()).toBe(before);
  const cl = await clocksOf(p, "E2E-EDIT");
  expect(cl["Auth covered through"].rel).toBe("in 3 days");
  expect(await cardFor(p, "E2E-EDIT").locator(".cmeta").textContent()).toContain("exposure $900");

  const rows = (await stored(p)).filter((c) => c.cid === "E2E-EDIT");
  expect(rows.length).toBe(1);
  expect(rows[0].covered).toBe(dayFromToday(3));

  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("cases sort most-urgent-first", async () => {
  const p = await open("tracker.html");
  await addCase(p, { cid: "Z-RELAXED", plan: "Humana MA", covered: dayFromToday(20), lead: 1 });
  await addCase(p, { cid: "A-URGENT", plan: "Aetna MA", covered: dayFromToday(-1), lead: 1 });

  const order = await cidsInOrder(p);
  // Alphabetically Z-RELAXED would win a naive sort; urgency must win instead.
  expect(order.indexOf("A-URGENT")).toBe(0);
  expect(order.indexOf("A-URGENT")).toBeLessThan(order.indexOf("Z-RELAXED"));
  expect(order.indexOf("Z-RELAXED")).toBe(order.length - 1);

  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("severity border class matches the minimum clock on the card", async () => {
  const p = await open("tracker.html", { storage: { [KEY]: SEV_SEED } });
  expect(p.__errors.length).toBe(0);

  const cls = async (cid) => (await cardFor(p, cid).getAttribute("class"));
  // min clock = covered - 2  ->  ok when >2, warn when 1..2, crit when <=0
  expect(await cls("OK-CASE")).toContain("sev-ok");
  expect(await cls("WARN-CASE")).toContain("sev-warn");
  expect(await cls("CRIT-CASE")).toContain("sev-crit");
  expect(await cls("LATE-CASE")).toContain("sev-crit");
  // and the driving tile carries the same severity
  expect((await clocksOf(p, "OK-CASE"))["NOMNC deliver by"].cls).toContain("ok");
  expect((await clocksOf(p, "WARN-CASE"))["NOMNC deliver by"].cls).toContain("warn");
  expect((await clocksOf(p, "CRIT-CASE"))["NOMNC deliver by"].cls).toContain("crit");
  expect((await clocksOf(p, "LATE-CASE"))["NOMNC deliver by"].rel).toBe("3 days overdue");

  await p.__ctx.close();
});

await test("summary stats count due-soon, overdue and total exposure", async () => {
  const p = await open("tracker.html", { storage: { [KEY]: SEV_SEED } });
  const s = await statsOf(p);
  expect(s["Active cases"]).toBe("4");
  // "Due within 2 days" is min <= 2, so it deliberately includes the overdue ones:
  // WARN (min 2), CRIT (min 0), LATE (min -3). OK (min 3) is excluded.
  expect(s["Due within 2 days"]).toBe("3");
  expect(s["Overdue"]).toBe("1");           // LATE only
  expect(s["Exposure at risk"]).toBe("$7,050");
  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("cross-tool nav links point at files that exist on disk", async () => {
  const p = await open("tracker.html");
  const links = await p.$$eval(".toolnav a", (as) =>
    as.map((a) => ({ text: a.textContent.trim(), href: a.getAttribute("href"), cur: a.hasAttribute("aria-current") })));
  const byText = Object.fromEntries(links.map((l) => [l.text, l]));
  expect(byText["Letters"].href).toBe("appeal-letters.html");
  expect(byText["Outcomes"].href).toBe("outcomes.html");
  expect(byText["Rules"].href).toBe("rules.html");
  expect(byText["Tracker"].cur).toBe(true);
  for (const l of links) expect(existsSync(`${DIR}/${l.href}`)).toBe(true);

  // the per-case "Log outcome" deep link must also resolve to a real file
  const deep = await p.locator("article.case a.btn").first().getAttribute("href");
  expect(existsSync(`${DIR}/${deep.split("?")[0]}`)).toBe(true);
  expect(deep).toContain("suggest=");

  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("theme toggle cycles dark -> light -> system and repaints the body", async () => {
  const p = await open("tracker.html");
  const attr = () => p.evaluate(() => document.documentElement.getAttribute("data-theme"));
  const bg = () => p.evaluate(() => getComputedStyle(document.body).backgroundColor);

  const bg0 = await bg();
  expect(await attr()).toBe(null);

  await p.click("#themeBtn");
  expect(await attr()).toBe("dark");
  const bgDark = await bg();
  expect(bgDark === bg0).toBe(false);

  await p.click("#themeBtn");
  expect(await attr()).toBe("light");
  expect(await bg()).toBe(bg0);

  await p.click("#themeBtn");
  expect(await attr()).toBe(null);
  expect(await bg()).toBe(bg0);

  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("reference panel opens and carries the QIO number and CMS-4205-F guidance", async () => {
  const p = await open("tracker.html");
  const ref = p.locator("details.ref");
  expect(await ref.evaluate((d) => d.open)).toBe(false);
  // Content must not be visible before the disclosure is opened.
  expect(await ref.locator("h3", { hasText: "Fast-track appeal" }).isVisible()).toBe(false);

  await ref.locator("summary").click();
  expect(await ref.evaluate((d) => d.open)).toBe(true);

  const txt = await ref.innerText();
  expect(txt).toContain("Acentra Health");
  expect(txt).toContain("1-888-317-0751");
  expect(txt).toContain("CMS-4205-F");
  expect(txt).toContain("must accept and decide an untimely fast-track request");
  expect(txt).toContain("If the deadline is missed, still call.");

  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("an added case survives a page reload", async () => {
  const p = await open("tracker.html");
  await addCase(p, { cid: "E2E-PERSIST", plan: "Cigna MA", covered: dayFromToday(4), lead: 1, exposure: 700 });
  await p.reload();
  await p.waitForTimeout(250);
  expect(await cidsInOrder(p)).toContain("E2E-PERSIST");
  const cl = await clocksOf(p, "E2E-PERSIST");
  expect(cl["Auth covered through"].rel).toBe("in 4 days");
  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("deleting a case removes it from the board and from storage", async () => {
  const p = await open("tracker.html", { storage: { [KEY]: SEV_SEED } });
  p.on("dialog", (d) => d.accept());
  expect(await p.locator("article.case").count()).toBe(4);

  await cardFor(p, "WARN-CASE").locator("[data-edit]").click();
  await p.waitForSelector("dialog[open]");
  await p.click("#delBtn");
  await p.waitForTimeout(200);

  expect(await cidsInOrder(p)).notToContain("WARN-CASE");
  expect(await p.locator("article.case").count()).toBe(3);
  expect((await stored(p)).map((c) => c.cid).join(",")).notToContain("WARN-CASE");
  expect((await statsOf(p))["Active cases"]).toBe("3");

  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("Demo data replaces the existing caseload instead of appending to it", async () => {
  const p = await open("tracker.html", { storage: { [KEY]: SEV_SEED } });
  p.on("dialog", (d) => d.accept());
  expect(await p.locator("article.case").count()).toBe(4);

  await p.click("#demoBtn");
  await p.waitForTimeout(250);

  const cids = await cidsInOrder(p);
  expect(cids.length).toBe(5);
  expect(cids.join(",")).toContain("214-B");
  expect(cids.join(",")).notToContain("OK-CASE");

  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});
