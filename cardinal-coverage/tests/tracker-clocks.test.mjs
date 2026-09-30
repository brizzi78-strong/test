// Lane: tracker-clocks — the tracker's deadline engine.
//
// Safety-critical surface: if these dates are wrong a resident loses an appeal.
// Pure date math is exercised through sandbox(); rendered behaviour through open().

import {
  suite, test, expect, open, scriptOf, sandbox, dayFromToday,
} from "./harness.mjs";

suite("tracker deadline clocks");

const SRC = scriptOf("tracker.html");
const PURE = ["parseD", "addD", "diffD", "toISO", "relText", "sev", "clocksFor", "today"];
const load = (extra) => sandbox(SRC, PURE, extra);

/** ISO helpers over a clocksFor() result. */
const byLab = (clocks, needle) => clocks.filter((x) => String(x.lab).includes(needle));
const one = (clocks, needle) => {
  const hits = byLab(clocks, needle);
  if (hits.length !== 1) throw new Error(`expected exactly 1 clock matching ${JSON.stringify(needle)}, got ${hits.length}: ${JSON.stringify(clocks.map(c => c.lab))}`);
  return hits[0];
};

/** Days ahead of today that land on the given weekday, at least a week out. */
function nextWeekday(dow) {
  const t = new Date().getDay();
  return 7 + ((dow - t + 7) % 7); // 7..13
}

/** A Date subclass pinned to a given hour today, for the noon-cutoff predicates. */
function clockAt(hour, minute = 0) {
  const base = new Date();
  base.setHours(hour, minute, 0, 0);
  const fixed = base.getTime();
  return class FakeDate extends Date {
    constructor(...a) { if (a.length === 0) super(fixed); else super(...a); }
    static now() { return fixed; }
  };
}

/* ------------------------------------------------------ CMS-10123 anchoring */

await test("NOMNC effective date is the LAST covered day: Friday cover-through ⇒ Wed deliver-by, Thu QIO", () => {
  const { parseD, toISO, clocksFor } = load();
  const nFri = nextWeekday(5);
  const covered = dayFromToday(nFri);
  expect(parseD(covered).getDay()).toBe(5); // sanity: really a Friday

  const cl = clocksFor({ covered, cycle: 3, lead: 1 });

  const deliver = one(cl, "NOMNC deliver by");
  const qio = one(cl, "QIO deadline");

  // deliver-by is 2 calendar days before the effective date (= last covered day)
  expect(toISO(deliver.date)).toBe(dayFromToday(nFri - 2));
  expect(deliver.date.getDay()).toBe(3); // Wednesday

  // the deadline printed on the notice is noon the day before the effective date
  expect(toISO(qio.date)).toBe(dayFromToday(nFri - 1));
  expect(qio.date.getDay()).toBe(4); // Thursday
  expect(qio.noon).toBeTruthy();

  // the off-by-one regression this pins: neither clock may be derived from
  // "first uncovered day" (which would give Thu deliver-by / Fri QIO)
  expect(toISO(deliver.date)).notToContain(dayFromToday(nFri - 1));
});

await test("covered-through itself is a clock, and next submission is lead days before it", () => {
  const { toISO, clocksFor } = load();
  const covered = dayFromToday(9);
  const cl = clocksFor({ covered, cycle: 3, lead: 2 });
  expect(toISO(one(cl, "Auth covered through").date)).toBe(covered);
  expect(one(cl, "Auth covered through").days).toBe(9);
  expect(toISO(one(cl, "Next submission due").date)).toBe(dayFromToday(7));
  // the +cycle window ends 3 days after the last covered day
  expect(toISO(one(cl, "Next window ends").date)).toBe(dayFromToday(12));
});

/* ------------------------------------------------------- dual 422.626 clock */

await test("delivery at the two-day minimum: both QIO clocks coincide, only one is shown", () => {
  const { toISO, clocksFor } = load();
  const covered = dayFromToday(10);              // effective date
  const cl = clocksFor({ covered, nomnc: dayFromToday(8), cycle: 3, lead: 1 });

  const noonClocks = cl.filter((x) => x.noon);
  expect(noonClocks.length).toBe(1);
  expect(toISO(noonClocks[0].date)).toBe(dayFromToday(9)); // effective-1 == delivery+1
  expect(noonClocks[0].lab).toContain("earlier of two");
});

await test("early NOMNC delivery pulls the QIO deadline forward to delivery+1", () => {
  const { toISO, clocksFor } = load();
  const covered = dayFromToday(10);
  const cl = clocksFor({ covered, nomnc: dayFromToday(4), cycle: 3, lead: 1 });

  const primary = one(cl, "QIO deadline");
  // delivery+1 (+5) is earlier than effective-1 (+9) — the real deadline is +5
  expect(toISO(primary.date)).toBe(dayFromToday(5));
  expect(primary.days).toBe(5);
  expect(primary.noon).toBeTruthy();
});

await test("late NOMNC delivery does not push the QIO deadline past the notice date", () => {
  const { toISO, clocksFor } = load();
  const covered = dayFromToday(10);
  // delivered only 1 day before the effective date: delivery+1 == effective, later
  const cl = clocksFor({ covered, nomnc: dayFromToday(9), cycle: 3, lead: 1 });
  const primary = one(cl, "QIO deadline");
  expect(toISO(primary.date)).toBe(dayFromToday(9)); // effective-1, the earlier one
});

await test("when the two QIO clocks differ, both dates must be visible for cross-check", () => {
  const { toISO, clocksFor } = load();
  const covered = dayFromToday(10);
  const cl = clocksFor({ covered, nomnc: dayFromToday(4), cycle: 3, lead: 1 });

  const noonClocks = cl.filter((x) => x.noon);
  expect(noonClocks.length).toBe(2);
  const dates = noonClocks.map((x) => toISO(x.date));
  // the from-delivery row exists precisely to be compared against the date
  // printed on the paper notice (effective-1); showing delivery+1 twice loses it
  expect(dates).toContain(dayFromToday(5)); // 422.626, from delivery
  expect(dates).toContain(dayFromToday(9)); // as printed on the NOMNC
});

await test("a delivered NOMNC with no covered-through still yields a 422.626 deadline", () => {
  const { toISO, clocksFor } = load();
  // 422.626 runs purely from delivery — it does not need the effective date.
  const cl = clocksFor({ nomnc: dayFromToday(0), cycle: 3, lead: 1 });
  const qio = one(cl, "QIO");
  expect(toISO(qio.date)).toBe(dayFromToday(1));
});

/* ----------------------------------------------------- recert + stay counter */

await test("first physician recert falls on the 14th day of care = admit+13", () => {
  const { toISO, clocksFor } = load();
  const admit = dayFromToday(-13); // today is the 14th day of care
  const cl = clocksFor({ admit, cert: admit });
  const recert = one(cl, "Physician recert due");
  expect(toISO(recert.date)).toBe(dayFromToday(0));
  expect(recert.days).toBe(0);
  // admit+14 would be tomorrow — that is the off-by-one being excluded
  expect(toISO(recert.date)).notToContain(dayFromToday(1));
});

await test("after the day-14 cert, recert recurs every 30 days from the last certification", () => {
  const { toISO, clocksFor } = load();
  const admit = dayFromToday(-20);
  const cert = dayFromToday(-7); // signed on day 14 (admit+13)
  const cl = clocksFor({ admit, cert });
  expect(toISO(one(cl, "Physician recert due").date)).toBe(dayFromToday(23)); // cert+30
});

await test("stay-day numbering counts admission as day 1 and never goes negative", () => {
  const { clocksFor } = load();
  expect(one(clocksFor({ admit: dayFromToday(0) }), "Stay day").plain).toBe("Day 1 of stay");
  expect(one(clocksFor({ admit: dayFromToday(-4) }), "Stay day").plain).toBe("Day 5 of stay");

  const future = one(clocksFor({ admit: dayFromToday(3) }), "Stay day");
  expect(future.plain).toBe("Admission date is in the future");
  expect(future.plain).notToContain("-");
  expect(future.plain).notToContain("Day 0");
});

/* -------------------------------------------------- calendar-boundary safety */

await test("date arithmetic survives a DST spring-forward boundary", () => {
  const saved = process.env.TZ;
  process.env.TZ = "America/New_York";
  try {
    const { parseD, addD, diffD, toISO } = load();
    // 2024-03-10 02:00 EST -> 03:00 EDT; the day is only 23 hours long.
    const before = parseD("2024-03-09"), after = parseD("2024-03-11");
    // guard: the sandbox really is in a DST-observing zone, or this test proves nothing
    expect(before.getTimezoneOffset()).toBe(300); // EST
    expect(after.getTimezoneOffset()).toBe(240);  // EDT
    expect(before.getHours()).toBe(0);
    expect(after.getHours()).toBe(0);
    expect(toISO(addD(before, 1))).toBe("2024-03-10");
    expect(toISO(addD(before, 2))).toBe("2024-03-11");
    expect(diffD(after, before)).toBe(2);
    expect(diffD(parseD("2024-03-10"), before)).toBe(1); // the 23-hour day
    // and fall-back, the 25-hour day
    expect(diffD(parseD("2024-11-04"), parseD("2024-11-03"))).toBe(1);
    expect(toISO(addD(parseD("2024-11-02"), 3))).toBe("2024-11-05");
  } finally {
    if (saved === undefined) delete process.env.TZ; else process.env.TZ = saved;
  }
});

await test("date arithmetic survives a leap day and a non-leap February", () => {
  const { parseD, addD, diffD, toISO } = load();
  expect(toISO(addD(parseD("2024-02-28"), 1))).toBe("2024-02-29");
  expect(toISO(addD(parseD("2024-02-28"), 2))).toBe("2024-03-01");
  expect(diffD(parseD("2024-03-01"), parseD("2024-02-28"))).toBe(2);
  expect(toISO(parseD("2024-02-29"))).toBe("2024-02-29"); // round trip
  // a NOMNC whose effective date is the leap day
  expect(toISO(addD(parseD("2024-02-29"), -2))).toBe("2024-02-27");
  // 2023 has no Feb 29
  expect(toISO(addD(parseD("2023-02-28"), 1))).toBe("2023-03-01");
  expect(diffD(parseD("2025-03-01"), parseD("2025-02-28"))).toBe(1);
});

await test("date arithmetic survives a year boundary", () => {
  const { parseD, addD, diffD, toISO } = load();
  expect(toISO(addD(parseD("2024-12-30"), 3))).toBe("2025-01-02");
  expect(toISO(addD(parseD("2025-01-01"), -2))).toBe("2024-12-30");
  expect(diffD(parseD("2025-01-02"), parseD("2024-12-30"))).toBe(3);
  expect(diffD(parseD("2025-01-01"), parseD("2024-01-01"))).toBe(366); // 2024 is leap
});

/* ------------------------------------------------------------- noon cutoff */

await test("noon-cutoff clock reads TODAY before 12:00 and MISSED at/after 12:00", () => {
  const before = load({ Date: clockAt(11, 59) });
  expect(before.relText(0, true)).toBe("TODAY (by noon)");
  expect(before.sev(0, true)).toBe("crit");

  const atNoon = load({ Date: clockAt(12, 0) });
  expect(atNoon.relText(0, true)).toBe("MISSED — noon cutoff passed");
  expect(atNoon.sev(0, true)).toBe("crit");

  const after = load({ Date: clockAt(15, 30) });
  expect(after.relText(0, true)).toBe("MISSED — noon cutoff passed");
  expect(after.relText(1, true)).toBe("Tomorrow (by noon)");
  // a non-noon clock due today is never "missed" by the clock on the wall
  expect(after.relText(0, false)).toBe("TODAY");
});

await test("relText/sev grade past, imminent and comfortable deadlines", () => {
  const { relText, sev } = load({ Date: clockAt(9) });
  expect(relText(-3)).toBe("3 days overdue");
  expect(relText(-1)).toBe("Overdue — yesterday");
  expect(relText(2)).toBe("in 2 days");
  expect(sev(-1)).toBe("crit");
  expect(sev(0)).toBe("crit");
  expect(sev(1)).toBe("warn");
  expect(sev(2)).toBe("warn");
  expect(sev(3)).toBe("ok");
});

/* ------------------------------------------------------------ rendered page */

await test("rendered page prints Wed deliver-by / Thu QIO for a Friday cover-through", async () => {
  const nFri = nextWeekday(5);
  const p = await open("tracker.html", {
    storage: {
      "ma-case-tracker-v1": [{
        id: "t1", cid: "FRI-1", plan: "Aetna MA", admit: dayFromToday(-13), cycle: 3, lead: 1,
        covered: dayFromToday(nFri), nomnc: dayFromToday(nFri - 2),
        note: dayFromToday(-1), cert: dayFromToday(-13),
        status: "NOMNC issued", exposure: 0, order: "", notes: "",
      }],
    },
  });
  try {
    expect(p.__errors.length).toBe(0);
    const clock = async (lab) => (await p.locator(".clock", { hasText: lab }).first().innerText());

    expect(await clock("NOMNC deliver by")).toMatch(/Wed/);
    expect(await clock("QIO deadline")).toMatch(/Thu/);
    // delivery was at the two-day minimum, so no second 422.626 row
    expect(await p.locator(".clock", { hasText: "422.626" }).count()).toBe(0);
    // day 14 of care is today ⇒ recert due today
    expect(await clock("Physician recert due")).toContain("TODAY");
    expect(await clock("Stay day")).toContain("Day 14 of stay");
  } finally {
    await p.__ctx.close();
  }
});

await test("rendered page shows a QIO deadline when a NOMNC was delivered but cover-through is blank", async () => {
  const p = await open("tracker.html", {
    storage: {
      "ma-case-tracker-v1": [{
        id: "t2", cid: "NO-COVER", plan: "WellCare MA", admit: dayFromToday(-5), cycle: 3, lead: 1,
        covered: "", nomnc: dayFromToday(0), note: dayFromToday(-1), cert: dayFromToday(-5),
        status: "NOMNC issued", exposure: 0, order: "", notes: "",
      }],
    },
  });
  try {
    expect(p.__errors.length).toBe(0);
    const body = await p.locator("#cases").innerText();
    expect(body).toContain("NO-COVER");
    expect(body).toContain("QIO");
  } finally {
    await p.__ctx.close();
  }
});

await test("rendered page never shows a negative stay day for a future admission", async () => {
  const p = await open("tracker.html", {
    storage: {
      "ma-case-tracker-v1": [{
        id: "t3", cid: "PRE-ADMIT", plan: "Humana MA", admit: dayFromToday(3), cycle: 3, lead: 1,
        covered: dayFromToday(9), note: "", cert: "", nomnc: "",
        status: "Awaiting initial auth", exposure: 0, order: "", notes: "",
      }],
    },
  });
  try {
    expect(p.__errors.length).toBe(0);
    const stay = await p.locator(".clock", { hasText: "Stay day" }).first().innerText();
    expect(stay).toContain("Admission date is in the future");
    expect(stay).notToContain("Day -");
    expect(stay).notToContain("Day 0");
    // no admit-derived recert either way, but the page must not crash
    expect(await p.locator("article.case").count()).toBe(1);
  } finally {
    await p.__ctx.close();
  }
});

await test("malformed and empty stored dates degrade to 'not set' without errors", async () => {
  const p = await open("tracker.html", {
    storage: {
      "ma-case-tracker-v1": [{
        id: "t4", cid: "JUNK", plan: "", admit: "", cycle: 3, lead: 1,
        covered: "not-a-date", note: "2025-1x-09", cert: "", nomnc: "",
        status: "Authorized", exposure: 0, order: "", notes: "",
      }],
    },
  });
  try {
    expect(p.__errors.length).toBe(0);
    const body = await p.locator("#cases").innerText();
    expect(body).toContain("JUNK");
    expect(body).toContain("not set");
    expect(body).notToContain("Invalid Date");
    expect(body).notToContain("NaN");
  } finally {
    await p.__ctx.close();
  }
});
