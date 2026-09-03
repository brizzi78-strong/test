// Lane: e2e-handoff — the tracker → outcomes "Log outcome" handoff.
// This is the seam the whole measurement habit rides on: if the link loses the
// case ID, picks the wrong event, or leaves a stale query string behind, the
// outcomes log quietly fills with junk.

import { suite, test, expect, open, dayFromToday } from "./harness.mjs";

const TRACKER_KEY = "ma-case-tracker-v1";
const OUTCOMES_KEY = "cc-outcomes-v1";

/** A tracker case with sane, today-relative dates. */
function mkCase(cid, status, plan = "Aetna MA") {
  return {
    id: "id-" + cid.replace(/\W+/g, "-"),
    cid, plan, status,
    admit: dayFromToday(-6), cycle: 3, lead: 1,
    covered: dayFromToday(2), nomnc: "",
    note: dayFromToday(-2), cert: dayFromToday(-6),
    exposure: 0, order: "", notes: "",
  };
}

const ALL_STATUSES = [
  ["Authorized",           "Auth submitted — on time"],
  ["Awaiting initial auth","Auth submitted — on time"],
  ["Recert pending",       "Auth submitted — on time"],
  ["Denied — appeal open", "Appeal filed — plan"],
  ["NOMNC issued",         "Appeal filed — QIO"],
  ["Discharged",           "Auth submitted — on time"],
];

/** Every status, one case each, so one page load covers the whole mapping. */
const STATUS_CASES = ALL_STATUSES.map(([s], i) => mkCase(`S${i}`, s));

/** Case IDs a real SNF actually types: spaces, &, /, #, em dash. */
const NASTY_CID = "214-B & 301/A #2 — west";
const NASTY_PLAN = "Piedmont Senior Choice (HMO C-SNP)"; // deliberately NOT in the datalist

/** href of the "Log outcome" link on the card whose .cid text is `cid`. */
async function outcomeHref(p, cid) {
  return p.evaluate((want) => {
    for (const art of document.querySelectorAll("article.case")) {
      if (art.querySelector(".cid")?.textContent === want) {
        const a = art.querySelector('a[href*="outcomes.html"]');
        return a ? a.getAttribute("href") : null;
      }
    }
    return null;
  }, cid);
}

/** Click the handoff link for `cid` and wait for outcomes.html to settle. */
async function followHandoff(p, cid) {
  const link = p.locator("article.case", { has: p.locator(`.cid:text-is(${JSON.stringify(cid)})`) })
    .locator('a[href*="outcomes.html"]');
  await link.first().click();
  await p.waitForLoadState("domcontentloaded");
  await p.waitForFunction(() => !!document.getElementById("dlg"));
  await p.waitForTimeout(250);
}

const dlgOpen = (p) => p.evaluate(() => document.getElementById("dlg").open === true);
const fieldVals = (p) => p.evaluate(() => ({
  case: document.getElementById("fCase").value,
  plan: document.getElementById("fPlan").value,
  type: document.getElementById("fType").value,
  date: document.getElementById("fDate").value,
  daysDisabled: document.getElementById("fDays").disabled,
  amtDisabled: document.getElementById("fAmt").disabled,
}));

suite("e2e handoff: tracker → outcomes");

/* ------------------------------------------------------------ link markup */

await test("every tracker case renders exactly one Log outcome link carrying case+plan+suggest", async () => {
  const p = await open("tracker.html", { storage: { [TRACKER_KEY]: STATUS_CASES } });
  const cards = await p.locator("article.case").count();
  expect(cards).toBe(STATUS_CASES.length);

  const hrefs = await p.$$eval('article.case a[href*="outcomes.html"]', (as) =>
    as.map((a) => a.getAttribute("href")));
  expect(hrefs.length).toBe(STATUS_CASES.length);
  for (const h of hrefs) {
    const u = new URL(h, "file:///cardinal-coverage/tracker.html");
    expect(u.pathname.endsWith("/outcomes.html")).toBeTruthy();
    expect(u.searchParams.has("case")).toBeTruthy();
    expect(u.searchParams.has("plan")).toBeTruthy();
    expect(u.searchParams.has("suggest")).toBeTruthy();
  }
  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("suggested event is derived from case status for all six statuses", async () => {
  const p = await open("tracker.html", { storage: { [TRACKER_KEY]: STATUS_CASES } });
  const got = {};
  for (let i = 0; i < ALL_STATUSES.length; i++) {
    const href = await outcomeHref(p, `S${i}`);
    const u = new URL(href, "file:///x/tracker.html");
    got[ALL_STATUSES[i][0]] = u.searchParams.get("suggest");
  }
  expect(got).toEqual(Object.fromEntries(ALL_STATUSES));
  await p.__ctx.close();
});

await test("every suggested event is a real option in the outcomes dropdown", async () => {
  const t = await open("tracker.html", { storage: { [TRACKER_KEY]: STATUS_CASES } });
  const suggested = await t.$$eval('article.case a[href*="outcomes.html"]', (as) =>
    as.map((a) => new URL(a.getAttribute("href"), location.href).searchParams.get("suggest")));
  await t.__ctx.close();

  const o = await open("outcomes.html", { storage: { [OUTCOMES_KEY]: [] } });
  const options = await o.$$eval("#fType option", (os) => os.map((x) => x.value));
  for (const s of suggested) expect(options).toContain(s);
  await o.__ctx.close();
});

await test("case IDs with spaces, &, /, # and em dashes are URL-encoded, not injected raw", async () => {
  const p = await open("tracker.html", {
    storage: { [TRACKER_KEY]: [mkCase(NASTY_CID, "Denied — appeal open", NASTY_PLAN)] },
  });
  const href = await outcomeHref(p, NASTY_CID);
  expect(href).toBeTruthy();

  const query = href.slice(href.indexOf("?") + 1);
  // A raw # would truncate the query into a fragment; a raw & would split the param.
  expect(query).notToContain("#");
  expect(query).toContain("214-B%20%26%20301%2FA%20%232%20%E2%80%94%20west");

  const u = new URL(href, "file:///cardinal-coverage/tracker.html");
  expect(u.searchParams.get("case")).toBe(NASTY_CID);
  expect(u.searchParams.get("plan")).toBe(NASTY_PLAN);
  expect(u.searchParams.get("suggest")).toBe("Appeal filed — plan");
  expect(u.hash).toBe("");
  await p.__ctx.close();
});

/* --------------------------------------------------------- the navigation */

await test("following the link opens outcomes.html with the dialog already open and prefilled", async () => {
  const p = await open("tracker.html", {
    storage: { [TRACKER_KEY]: [mkCase("227-C", "NOMNC issued", "WellCare MA")], [OUTCOMES_KEY]: [] },
  });
  await followHandoff(p, "227-C");

  expect(p.url()).toContain("outcomes.html");
  expect(await dlgOpen(p)).toBe(true);
  const v = await fieldVals(p);
  expect(v.case).toBe("227-C");
  expect(v.plan).toBe("WellCare MA");
  expect(v.type).toBe("Appeal filed — QIO");
  expect(v.date).toBe(dayFromToday(0));
  // Appeal-filed is not a recovery event: days/dollars must stay locked.
  expect(v.daysDisabled).toBe(true);
  expect(v.amtDisabled).toBe(true);
  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("a nasty case ID survives the round trip into the outcomes form intact", async () => {
  const p = await open("tracker.html", {
    storage: {
      [TRACKER_KEY]: [mkCase(NASTY_CID, "Denied — appeal open", NASTY_PLAN)],
      [OUTCOMES_KEY]: [],
    },
  });
  await followHandoff(p, NASTY_CID);
  const v = await fieldVals(p);
  expect(v.case).toBe(NASTY_CID);
  expect(v.type).toBe("Appeal filed — plan");
  // A filing is NOT a recovery event — the days/dollars fields must be disabled.
  expect(v.daysDisabled).toBe(true);
  expect(v.amtDisabled).toBe(true);
  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("a plan that is not in the datalist still lands in the plan field", async () => {
  const p = await open("tracker.html", {
    storage: {
      [TRACKER_KEY]: [mkCase("904", "Recert pending", NASTY_PLAN)],
      [OUTCOMES_KEY]: [],
    },
  });
  await followHandoff(p, "904");
  const v = await fieldVals(p);
  expect(v.plan).toBe(NASTY_PLAN);
  const known = await p.$$eval("#planL option", (os) => os.map((o) => o.value));
  expect(known.includes(NASTY_PLAN)).toBeFalsy();   // proves the datalist is not the gate
  await p.__ctx.close();
});

await test("a case with no plan hands off cleanly and leaves the plan field blank", async () => {
  const p = await open("tracker.html", {
    storage: {
      [TRACKER_KEY]: [mkCase("no-plan", "Awaiting initial auth", "")],
      [OUTCOMES_KEY]: [],
    },
  });
  const href = await outcomeHref(p, "no-plan");
  expect(href).toContain("plan=&");
  await followHandoff(p, "no-plan");
  const v = await fieldVals(p);
  expect(v.case).toBe("no-plan");
  expect(v.plan).toBe("");
  expect(v.type).toBe("Auth submitted — on time");
  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

/* ------------------------------------------------------- query hygiene */

await test("the handoff query string is cleared from the URL once consumed", async () => {
  const p = await open("tracker.html", {
    storage: { [TRACKER_KEY]: [mkCase("214-B", "Denied — appeal open")], [OUTCOMES_KEY]: [] },
  });
  await followHandoff(p, "214-B");
  const search = await p.evaluate(() => location.search);
  expect(search).toBe("");
  expect(p.url()).notToContain("?case=");
  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("reloading after a handoff does not re-open the dialog with stale values", async () => {
  const p = await open("tracker.html", {
    storage: { [TRACKER_KEY]: [mkCase("214-B", "Denied — appeal open")], [OUTCOMES_KEY]: [] },
  });
  await followHandoff(p, "214-B");
  expect(await dlgOpen(p)).toBe(true);

  await p.reload();
  await p.waitForLoadState("domcontentloaded");
  await p.waitForTimeout(250);
  expect(await dlgOpen(p)).toBe(false);
  await p.__ctx.close();
});

await test("visiting outcomes.html with no query params leaves the dialog closed", async () => {
  const p = await open("outcomes.html", { storage: { [OUTCOMES_KEY]: [] } });
  expect(await dlgOpen(p)).toBe(false);
  expect(await p.locator(".empty").count()).toBe(1);
  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

/* --------------------------------------------------------- saving it */

await test("saving from the handoff writes the event into the table and moves the scorecard", async () => {
  const p = await open("tracker.html", {
    storage: {
      [TRACKER_KEY]: [mkCase(NASTY_CID, "Denied — appeal open", NASTY_PLAN)],
      [OUTCOMES_KEY]: [],
    },
  });
  await followHandoff(p, NASTY_CID);

  // Days/dollars are correctly disabled for a filing — assert that, don't fight it.
  expect(await p.locator("#fDays").isDisabled()).toBe(true);
  expect(await p.locator("#fAmt").isDisabled()).toBe(true);
  await p.locator("#evForm button[type=submit]").click();
  await p.waitForTimeout(250);

  expect(await dlgOpen(p)).toBe(false);

  const rows = await p.$$eval("#tableWrap tbody tr", (trs) => trs.map((t) => t.textContent));
  expect(rows.length).toBe(1);
  expect(rows[0]).toContain(NASTY_CID);
  expect(rows[0]).toContain("Appeal filed — plan");
  expect(rows[0]).toContain(NASTY_PLAN);

  const cards = await p.$$eval("#cards .c", (cs) =>
    cs.map((c) => ({ k: c.querySelector(".k").textContent, v: c.querySelector(".v").textContent })));
  const card = (k) => cards.find((c) => c.k.toLowerCase().startsWith(k))?.v;
  expect(card("cases touched")).toBe("1");
  // A filing contributes no recovery — an open appeal must not move these.
  expect(card("covered days")).toBe("0");
  expect(card("dollars protected")).toBe("$0");
  // ...and it registers as pending rather than as a decision.
  expect(cards.find((c) => c.k.toLowerCase().startsWith("appeal win")).v).toBe("—");

  // and it is durable, not just painted
  const stored = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)), OUTCOMES_KEY);
  expect(stored.length).toBe(1);
  expect(stored[0].case).toBe(NASTY_CID);
  expect(stored[0].type).toBe("Appeal filed — plan");
  expect(stored[0].days).toBe(0);
  expect(stored[0].amt).toBe(0);
  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("the handoff appends to an existing log rather than replacing it", async () => {
  const prior = [{
    id: "prior-1", date: dayFromToday(-3), case: "118", plan: "Aetna MA",
    type: "Auth submitted — on time", days: 0, amt: 0, note: "",
  }];
  const p = await open("tracker.html", {
    storage: {
      [TRACKER_KEY]: [mkCase("301-A", "Recert pending", "WellCare MA")],
      [OUTCOMES_KEY]: prior,
    },
  });
  await followHandoff(p, "301-A");
  await p.locator("#evForm button[type=submit]").click();
  await p.waitForTimeout(250);

  const stored = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)), OUTCOMES_KEY);
  expect(stored.length).toBe(2);
  expect(stored.map((e) => e.case).sort()).toEqual(["118", "301-A"]);
  expect(stored[1].id === "prior-1").toBeFalsy();   // new row got its own id
  const rows = await p.$$eval("#tableWrap tbody tr", (t) => t.length);
  expect(rows).toBe(2);
  await p.__ctx.close();
});

/* --------------------------------- does the suggestion produce clean data? */

// The outcomes page grades its own data: a won/lost appeal with no matching
// "Appeal filed" event is flagged as an orphan decision. Accepting the handoff's
// OWN default for a "Denied — appeal open" case should not trip that alarm.
await test("the default handoff for an open appeal does not log a decision with no filing", async () => {
  const p = await open("tracker.html", {
    storage: {
      [TRACKER_KEY]: [mkCase("214-B", "Denied — appeal open", "Aetna MA")],
      [OUTCOMES_KEY]: [],
    },
  });
  await followHandoff(p, "214-B");
  expect((await fieldVals(p)).type).toBe("Appeal filed — plan");   // the tool's own suggestion
  await p.locator("#evForm button[type=submit]").click(); // accepted verbatim
  await p.waitForTimeout(250);

  const detail = await p.$$eval("#cards .c", (cs) => {
    const c = cs.find((x) => x.querySelector(".k").textContent.startsWith("Appeal win rate"));
    return c ? c.querySelector(".d").textContent : "";
  });
  expect(detail).notToContain("decision with no logged filing");

  // The status says the appeal is OPEN, so it should land in the pending bucket.
  expect(detail).toContain("pending");
  await p.__ctx.close();
});

await test("the default handoff for an open appeal does not produce a self-contradicting sentence", async () => {
  const p = await open("tracker.html", {
    storage: {
      [TRACKER_KEY]: [mkCase("214-B", "Denied — appeal open", "Aetna MA")],
      [OUTCOMES_KEY]: [],
    },
  });
  await followHandoff(p, "214-B");
  await p.locator("#evForm button[type=submit]").click();
  await p.waitForTimeout(250);

  const sentence = await p.locator("#sentence p").first().textContent();
  // "filed 0 appeals and won 1 of 1 decided" is not a sentence anyone can show an investor.
  expect(/filed 0 appeals? and won 1 of 1/.test(sentence)).toBeFalsy();
  await p.__ctx.close();
});

await test("the NOMNC handoff default logs a pending appeal and raises no warning", async () => {
  const p = await open("tracker.html", {
    storage: {
      [TRACKER_KEY]: [mkCase("118", "NOMNC issued", "Aetna MA")],
      [OUTCOMES_KEY]: [],
    },
  });
  await followHandoff(p, "118");
  expect((await fieldVals(p)).type).toBe("Appeal filed — QIO");
  await p.locator("#evForm button[type=submit]").click();
  await p.waitForTimeout(250);

  const detail = await p.$$eval("#cards .c", (cs) => {
    const c = cs.find((x) => x.querySelector(".k").textContent.startsWith("Appeal win rate"));
    return c ? c.querySelector(".d").textContent : "";
  });
  expect(detail).toContain("1 pending");
  expect(detail).notToContain("no logged filing");
  await p.__ctx.close();
});

await test("two handoffs in a row do not leak the first case's values into the second", async () => {
  const p = await open("tracker.html", {
    storage: {
      [TRACKER_KEY]: [
        mkCase("AAA-1", "Denied — appeal open", "Humana MA"),
        mkCase("BBB-2", "Awaiting initial auth", "Cigna MA"),
      ],
      [OUTCOMES_KEY]: [],
    },
  });
  await followHandoff(p, "AAA-1");
  let v = await fieldVals(p);
  expect(v.case).toBe("AAA-1");
  expect(v.type).toBe("Appeal filed — plan");

  await p.goBack();
  await p.waitForLoadState("domcontentloaded");
  await p.waitForTimeout(250);
  await followHandoff(p, "BBB-2");
  v = await fieldVals(p);
  expect(v.case).toBe("BBB-2");
  expect(v.plan).toBe("Cigna MA");
  expect(v.type).toBe("Auth submitted — on time");
  expect(v.daysDisabled).toBe(true);
  await p.__ctx.close();
});
