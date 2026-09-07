// Lane: outcomes-metrics — the numbers on outcomes.html that set pricing and
// fill the traction slide. Every date is relative to today via dayFromToday().

import { suite, test, expect, open, scriptOf, sandbox, dayFromToday } from "./harness.mjs";

suite("outcomes metrics");

/* ------------------------------------------------------------- fixtures */

let seq = 0;
const ev = (o = {}) => ({
  id: "e" + (++seq),
  date: dayFromToday(-1),
  case: "C1",
  plan: "Aetna MA",
  type: "Auth submitted — on time",
  days: 0, amt: 0, note: "",
  ...o,
});

const seed = (list) => open("outcomes.html", { storage: { "cc-outcomes-v1": list } });

/** All metric cards as {k,v,d} triples, in DOM order. */
const cards = (p) => p.evaluate(() =>
  [...document.querySelectorAll("#cards .c")].map((c) => ({
    k: c.querySelector(".k").textContent.trim(),
    v: c.querySelector(".v").textContent.trim(),
    d: c.querySelector(".d").textContent.trim(),
  })));

const byKey = (list, k) => {
  const hit = list.find((c) => c.k.toLowerCase().startsWith(k.toLowerCase()));
  if (!hit) throw new Error(`no card starting with ${JSON.stringify(k)} — saw ${JSON.stringify(list.map(c => c.k))}`);
  return hit;
};
const digits = (s) => String(s).replace(/[^0-9]/g, "");
const setPeriod = async (p, d) => {
  await p.locator(`#period button[data-d="${d}"]`).click();
  await p.waitForTimeout(80);
};
const sentence = (p) => p.locator("#sentence p").first().innerText();
const rowCount = (p) => p.locator("#tableWrap tbody tr").count();

/* ------------------------------------------- 1. recovery-only totals (regression) */

await test("recovered days/dollars count ONLY won appeals and recovery events", async () => {
  const p = await seed([
    ev({ case: "A", type: "Appeal won", days: 8, amt: 20000, date: dayFromToday(-3) }),
    ev({ case: "B", type: "Appeal lost", days: 12, amt: 40000, date: dayFromToday(-4) }),
    ev({ case: "C", type: "Denial received", days: 5, amt: 9000, date: dayFromToday(-5) }),
    ev({ case: "D", type: "NOMNC issued", days: 7, amt: 7000, date: dayFromToday(-6) }),
    ev({ case: "E", type: "Auth submitted — late", days: 3, amt: 3000, date: dayFromToday(-7) }),
  ]);
  const c = await cards(p);
  expect(byKey(c, "Covered days recovered").v).toBe("8");
  expect(digits(byKey(c, "Dollars protected").v)).toBe("20000");
  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("a lone Covered days recovered event still counts toward both totals", async () => {
  const p = await seed([
    ev({ case: "A", type: "Covered days recovered", days: 4, amt: 5200, date: dayFromToday(-2) }),
    ev({ case: "B", type: "Appeal lost", days: 99, amt: 999999, date: dayFromToday(-2) }),
  ]);
  const c = await cards(p);
  expect(byKey(c, "Covered days recovered").v).toBe("4");
  expect(digits(byKey(c, "Dollars protected").v)).toBe("5200");
  await p.__ctx.close();
});

/* --------------------------------------------------- 2. win rate: decided only */

await test("win rate counts decided appeals only — pending filings do not dilute it", async () => {
  const list = [];
  // six decided appeals, each with its own filing: 4 won / 2 lost = 67%
  for (let i = 1; i <= 4; i++) {
    list.push(ev({ case: "W" + i, type: "Appeal filed — plan", date: dayFromToday(-20) }));
    list.push(ev({ case: "W" + i, type: "Appeal won", date: dayFromToday(-10), days: 1, amt: 1000 }));
  }
  for (let i = 1; i <= 2; i++) {
    list.push(ev({ case: "L" + i, type: "Appeal filed — QIO", date: dayFromToday(-20) }));
    list.push(ev({ case: "L" + i, type: "Appeal lost", date: dayFromToday(-10) }));
  }
  // three still-open filings — must not enter numerator or denominator
  for (let i = 1; i <= 3; i++) list.push(ev({ case: "P" + i, type: "Appeal filed — QIO", date: dayFromToday(-5) }));

  const p = await seed(list);
  const c = await cards(p);
  const wr = byKey(c, "Appeal win rate");
  expect(wr.v).toBe("67%");                 // 4/6, not 4/9 (44%)
  expect(wr.v).notToContain("44");
  expect(wr.d).toContain("4W · 2L");
  expect(wr.d).toContain("3 pending");
  await p.__ctx.close();
});

/* ------------------------------------------- 3. rate withheld under five decided */

await test("one won appeal shows a raw fraction, never 100%", async () => {
  const p = await seed([
    ev({ case: "A", type: "Appeal filed — QIO", date: dayFromToday(-9) }),
    ev({ case: "A", type: "Appeal won", days: 6, amt: 12000, date: dayFromToday(-2) }),
  ]);
  const c = await cards(p);
  const wr = byKey(c, "Appeal win rate");
  expect(wr.v).notToContain("100%");
  expect(wr.v).toBe("1/1");
  expect(wr.d).toContain("too few to rate");
  const s = await sentence(p);
  expect(s).notToContain("100%");
  await p.__ctx.close();
});

await test("the fifth decided appeal is the first to earn a percentage", async () => {
  const four = [];
  for (let i = 1; i <= 4; i++) {
    four.push(ev({ case: "D" + i, type: "Appeal filed — plan", date: dayFromToday(-15) }));
    four.push(ev({ case: "D" + i, type: i === 4 ? "Appeal lost" : "Appeal won", date: dayFromToday(-6) }));
  }
  const p4 = await seed(four);
  expect(byKey(await cards(p4), "Appeal win rate").v).toBe("3/4");
  await p4.__ctx.close();

  const five = four.concat([
    ev({ case: "D5", type: "Appeal filed — plan", date: dayFromToday(-15) }),
    ev({ case: "D5", type: "Appeal won", date: dayFromToday(-6) }),
  ]);
  const p5 = await seed(five);
  expect(byKey(await cards(p5), "Appeal win rate").v).toBe("80%");   // 4 of 5
  await p5.__ctx.close();
});

/* ------------------------------------------------ 4. pending spans all periods */

await test("an appeal filed 100 days ago and still open is pending in the 30-day view", async () => {
  const p = await seed([
    ev({ case: "OLD", type: "Appeal filed — QIO", date: dayFromToday(-100) }),
    ev({ case: "NEW", type: "Auth submitted — on time", date: dayFromToday(-2) }),
  ]);
  await setPeriod(p, 30);
  const c = await cards(p);
  expect(byKey(c, "Appeal win rate").d).toContain("1 pending");
  expect(await rowCount(p)).toBe(1);            // the old filing is outside the window
  await setPeriod(p, 0);
  expect(byKey(await cards(p), "Appeal win rate").d).toContain("1 pending");
  await p.__ctx.close();
});

await test("a decision closes out its filing so pending drops back to zero", async () => {
  const p = await seed([
    ev({ case: "OLD", type: "Appeal filed — QIO", date: dayFromToday(-100) }),
    ev({ case: "OLD", type: "Appeal won", days: 9, amt: 15000, date: dayFromToday(-80) }),
  ]);
  await setPeriod(p, 30);
  const wr = byKey(await cards(p), "Appeal win rate");
  expect(wr.d).notToContain("pending");
  expect(wr.v).toBe("—");                        // nothing decided inside the window
  await p.__ctx.close();
});

/* ------------------------------------------------- 5. orphan decisions surfaced */

await test("a decision with no logged filing is flagged, not silently clamped", async () => {
  const p = await seed([
    ev({ case: "ORPH", type: "Appeal won", days: 5, amt: 8000, date: dayFromToday(-3) }),
  ]);
  const wr = byKey(await cards(p), "Appeal win rate");
  expect(wr.d).toContain("no logged filing");
  expect(wr.d).toContain("1 decision");
  expect(wr.d).notToContain("pending");
  await p.__ctx.close();
});

/* ---------------------------------------- 6. future-dated events excluded + flagged */

await test("future-dated events are excluded from all-time totals and flagged", async () => {
  const p = await seed([
    ev({ case: "REAL", type: "Appeal won", days: 3, amt: 6000, date: dayFromToday(-400) }),
    ev({ case: "TYPO", type: "Appeal won", days: 50, amt: 99000, date: dayFromToday(+10) }),
  ]);
  await setPeriod(p, 0);                         // all time
  const c = await cards(p);
  expect(byKey(c, "Covered days recovered").v).toBe("3");
  expect(digits(byKey(c, "Dollars protected").v)).toBe("6000");
  expect(byKey(c, "Excluded from every total").v).toBe("1");
  // The excluded row is pinned into the table so it can actually be corrected —
  // the banner tells the user to open it, so it needs a reachable Edit button.
  expect(await rowCount(p)).toBe(2);
  expect(await p.locator("#tableWrap").textContent()).toContain("needs fixing");
  expect(await p.locator("#tableWrap [data-edit]").count()).toBe(2);
  const s = await sentence(p);
  expect(s).notToContain("99,000");
  await p.__ctx.close();
});

await test("a future-dated appeal filing does not inflate the pending count", async () => {
  // Footer contract: "Future-dated or unreadable entries are excluded from every
  // total and flagged." A 2027-instead-of-2026 typo should only be flagged.
  const p = await seed([
    ev({ case: "TYPO", type: "Appeal filed — QIO", date: dayFromToday(+365) }),
  ]);
  await setPeriod(p, 0);
  const c = await cards(p);
  expect(byKey(c, "Excluded from every total").v).toBe("1");
  expect(byKey(c, "Appeal win rate").d).notToContain("pending");
  await p.__ctx.close();
});

/* ------------------------------------------------ 7. period boundary partition */

await test("period filters partition events at 30/90/365 boundaries", async () => {
  const ages = [1, 29, 30, 89, 90, 364, 365];
  const p = await seed(ages.map((a, i) => ev({
    case: "C" + i, type: "Auth submitted — on time", date: dayFromToday(-a),
  })));
  await setPeriod(p, 30);
  expect(await rowCount(p)).toBe(2);             // ages 1, 29
  await setPeriod(p, 90);
  expect(await rowCount(p)).toBe(4);             // + 30, 89
  await setPeriod(p, 365);
  expect(await rowCount(p)).toBe(6);             // + 90, 364
  await setPeriod(p, 0);
  expect(await rowCount(p)).toBe(7);             // + 365
  expect(byKey(await cards(p), "Cases touched").v).toBe("7");
  await p.__ctx.close();
});

await test("on-time rate counts submissions only — approvals are not submissions", async () => {
  const p = await seed([
    ev({ case: "A", type: "Auth submitted — on time", date: dayFromToday(-2) }),
    ev({ case: "B", type: "Auth submitted — on time", date: dayFromToday(-3) }),
    ev({ case: "C", type: "Auth submitted — on time", date: dayFromToday(-4) }),
    ev({ case: "D", type: "Auth submitted — late", date: dayFromToday(-5) }),
    ev({ case: "E", type: "Auth approved", date: dayFromToday(-6) }),
    ev({ case: "F", type: "Auth approved", date: dayFromToday(-7) }),
  ]);
  const c = await cards(p);
  const ot = byKey(c, "On-time submission");
  expect(ot.v).toBe("75%");                      // 3 of 4, not 5 of 6
  expect(ot.d).toContain("3 on time · 1 late");
  await p.__ctx.close();
});

/* --------------------------------------------- 8. traction sentence vs the cards */

await test("traction sentence reproduces the card numbers exactly", async () => {
  const list = [];
  for (let i = 1; i <= 4; i++) {
    list.push(ev({ case: "W" + i, type: "Appeal filed — plan", date: dayFromToday(-20) }));
    list.push(ev({ case: "W" + i, type: "Appeal won", date: dayFromToday(-10), days: 2, amt: 2500 }));
  }
  for (let i = 1; i <= 2; i++) {
    list.push(ev({ case: "L" + i, type: "Appeal filed — QIO", date: dayFromToday(-20) }));
    list.push(ev({ case: "L" + i, type: "Appeal lost", date: dayFromToday(-10) }));
  }
  list.push(ev({ case: "W1", type: "Denial received", date: dayFromToday(-25) }));

  const p = await seed(list);
  const c = await cards(p);
  const s = await sentence(p);
  expect(s).notToContain("Log a few events");
  expect(s).toContain("4 of 6");
  expect(s).toContain("(67%)");
  expect(byKey(c, "Appeal win rate").v).toBe("67%");
  expect(s).toContain("8 covered days");
  expect(byKey(c, "Covered days recovered").v).toBe("8");
  expect(s).toContain("10,000");
  expect(digits(byKey(c, "Dollars protected").v)).toBe("10000");
  await p.__ctx.close();
});

await test("with adverse events logged the sentence shows real numbers, not the empty-state prompt", async () => {
  const p = await seed([
    ev({ case: "A", type: "Denial received", date: dayFromToday(-2) }),
    ev({ case: "B", type: "Denial received", date: dayFromToday(-3) }),
    ev({ case: "C", type: "NOMNC issued", date: dayFromToday(-4) }),
    ev({ case: "D", type: "Auth approved", date: dayFromToday(-5) }),
  ]);
  const c = await cards(p);
  expect(byKey(c, "Denials").v).toBe("3");       // the cards show real activity
  expect(byKey(c, "Cases touched").v).toBe("4");
  const s = await sentence(p);
  expect(s).notToContain("Log a few events");    // …so the sentence must not claim there is none
  expect(s).toContain("3 denial");
  await p.__ctx.close();
});

/* ------------------------------------------------------- 9. pure metrics() unit */

test("metrics() ignores days/amt carried by non-recovery event types", () => {
  const { metrics } = sandbox(scriptOf("outcomes.html"), ["metrics"]);
  const m = metrics([
    { case: "A", type: "Appeal lost", days: 30, amt: 50000 },
    { case: "B", type: "Denial received", days: 10, amt: 10000 },
    { case: "C", type: "Appeal won", days: 7, amt: 14000 },
  ]);
  expect(m.days).toBe(7);
  expect(m.amt).toBe(14000);
  expect(m.decided).toBe(2);
  expect(m.winRate).toBe(50);
});

test("metrics() reports a null win rate when nothing has been decided", () => {
  const { metrics } = sandbox(scriptOf("outcomes.html"), ["metrics"]);
  const m = metrics([
    { case: "A", type: "Appeal filed — QIO", days: 0, amt: 0 },
    { case: "B", type: "Appeal filed — plan", days: 0, amt: 0 },
  ]);
  expect(m.winRate).toBe(null);
  expect(m.filed).toBe(2);
  expect(m.days).toBe(0);
});
