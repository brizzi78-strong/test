// Lane: outcomes-io — streak logic + CSV export for outcomes.html
//
// CSV is captured by intercepting URL.createObjectURL before the page boots
// (addInitScript + reload), so the real #csvBtn handler runs untouched and we
// read the actual Blob it produced.

import { suite, test, expect, open, dayFromToday } from "./harness.mjs";

const KEY = "cc-outcomes-v1";

let seq = 0;
const ev = (offset, over = {}) => ({
  id: "e" + ++seq,
  date: dayFromToday(offset),
  case: "C-1",
  plan: "Aetna MA",
  type: "Auth submitted — on time",
  days: 0,
  amt: 0,
  note: "",
  ...over,
});

/* --------------------------------------------------------------- browser */

async function openLog(events) {
  return open("outcomes.html", { storage: { [KEY]: events } });
}

/** Open with URL.createObjectURL intercepted so we can read the export Blob. */
async function openCapturing(events) {
  const p = await openLog(events);
  await p.addInitScript(() => {
    window.__blobs = [];
    URL.createObjectURL = function (b) { window.__blobs.push(b); return "blob:capture-stub"; };
    URL.revokeObjectURL = function () {};
  });
  await p.reload();
  await p.waitForTimeout(250);
  return p;
}

/** Click a period pill (30/90/365/0) then Export CSV; return the Blob text. */
async function exportCsv(p, days) {
  if (days !== undefined) await p.click(`#period button[data-d="${days}"]`);
  await p.click("#csvBtn");
  await p.waitForTimeout(80);
  return p.evaluate(async () => {
    const b = window.__blobs[window.__blobs.length - 1];
    return b ? await b.text() : null;
  });
}

async function streakOf(p) {
  return p.evaluate(() => ({
    big: document.querySelector("#streak .big").textContent.trim(),
    sub: document.querySelector("#streak .sub").textContent.trim(),
    dots: [...document.querySelectorAll("#streak .dots i")].map((i) => ({
      on: i.classList.contains("on"),
      today: i.classList.contains("today"),
    })),
  }));
}

/* ------------------------------------------------------------ csv parser */
// RFC4180-ish, so we can assert real round-tripping rather than substrings.
function parseCSV(text) {
  let s = text;
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  const rows = [];
  let row = [], field = "", i = 0, inQ = false;
  while (i < s.length) {
    const c = s[i];
    if (inQ) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQ = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\r" && s[i + 1] === "\n") { row.push(field); rows.push(row); row = []; field = ""; i += 2; continue; }
    if (c === "\n" || c === "\r") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += c; i++;
  }
  row.push(field); rows.push(row);
  return rows;
}

/* =============================================================== streak */

suite("outcomes: streak");

await test("five consecutive days ending today reads 5 and says logged today", async () => {
  const p = await openLog([0, -1, -2, -3, -4].map((o) => ev(o)));
  const s = await streakOf(p);
  expect(s.big).toBe("5");
  expect(s.sub).toContain("Logged today");
  expect(p.__errors.length).toBe(0);
  await p.__ctx.close();
});

await test("streak running through yesterday survives an unlogged today", async () => {
  const p = await openLog([-1, -2, -3].map((o) => ev(o)));
  const s = await streakOf(p);
  expect(s.big).toBe("3");
  expect(s.sub).toContain("Nothing logged today yet");
  await p.__ctx.close();
});

await test("a one-day gap breaks the streak at the gap", async () => {
  // logged: -1, -2, (gap at -3), -4, -5, -6  → current run is 2
  const p = await openLog([-1, -2, -4, -5, -6].map((o) => ev(o)));
  expect((await streakOf(p)).big).toBe("2");
  await p.__ctx.close();
});

await test("a run that ended two days ago is not a current streak", async () => {
  const p = await openLog([-2, -3, -4].map((o) => ev(o)));
  expect((await streakOf(p)).big).toBe("0");
  await p.__ctx.close();
});

await test("several events on one day count as one day of streak", async () => {
  const p = await openLog([
    ev(0, { case: "A" }), ev(0, { case: "B" }), ev(0, { case: "C" }), ev(-1, { case: "A" }),
  ]);
  expect((await streakOf(p)).big).toBe("2");
  await p.__ctx.close();
});

await test("a future-dated event alone does not manufacture a streak", async () => {
  const p = await openLog([ev(1), ev(3)]);
  const s = await streakOf(p);
  expect(s.big).toBe("0");
  expect(s.dots.filter((d) => d.on).length).toBe(0);
  await p.__ctx.close();
});

await test("14-day strip marks exactly the logged days and flags today last", async () => {
  // in-window: -13, -7, -1, 0 ; out of window: -14 (too old) and +1 (future)
  const p = await openLog([-14, -13, -7, -1, 0, 1].map((o) => ev(o)));
  const { dots } = await streakOf(p);
  expect(dots.length).toBe(14);
  expect(dots.map((d, i) => (d.on ? i : null)).filter((x) => x !== null)).toEqual([0, 6, 12, 13]);
  expect(dots.filter((d) => d.today).length).toBe(1);
  expect(dots[13].today).toBe(true);
  await p.__ctx.close();
});

await test("streak is independent of the selected period", async () => {
  // a 4-day run ending today, exported/period-filtered to 30d vs all-time
  const p = await openLog([0, -1, -2, -3].map((o) => ev(o)).concat([ev(-200)]));
  expect((await streakOf(p)).big).toBe("4");
  await p.click('#period button[data-d="30"]');
  await p.waitForTimeout(60);
  expect((await streakOf(p)).big).toBe("4");
  await p.__ctx.close();
});

/* ================================================================== csv */

suite("outcomes: CSV export");

await test("export carries only the selected period, not every event", async () => {
  const p = await openCapturing([
    ev(-5, { case: "RECENT" }),
    ev(-100, { case: "ANCIENT" }),
  ]);
  const csv = await exportCsv(p, 30);
  expect(csv).toBeTruthy();
  expect(csv).toContain("RECENT");
  expect(csv).notToContain("ANCIENT");
  expect(csv).notToContain(dayFromToday(-100));
  expect(parseCSV(csv).filter((r) => r.length > 1).length).toBe(2); // header + 1 row
  await p.__ctx.close();
});

await test("30-day window boundary: day -29 is in, day -30 is out", async () => {
  const p = await openCapturing([
    ev(-29, { case: "EDGE-IN" }),
    ev(-30, { case: "EDGE-OUT" }),
  ]);
  const csv = await exportCsv(p, 30);
  expect(csv).toContain("EDGE-IN");
  expect(csv).notToContain("EDGE-OUT");
  await p.__ctx.close();
});

await test("all-time export brings the old rows back", async () => {
  const p = await openCapturing([ev(-5, { case: "RECENT" }), ev(-400, { case: "ANCIENT" })]);
  const csv = await exportCsv(p, 0);
  expect(csv).toContain("RECENT");
  expect(csv).toContain("ANCIENT");
  await p.__ctx.close();
});

await test("formula-injection characters are neutralised with a leading apostrophe", async () => {
  const p = await openCapturing([
    ev(-1, { case: "=cmd|'/c calc'!A1", plan: "+SUM(1+1)", note: "-2+3" }),
    ev(-2, { case: "@import", plan: "\tTabbed", note: "\rCarriage" }),
  ]);
  const csv = await exportCsv(p, 90);
  const cells = parseCSV(csv).slice(1).flat();
  for (const dangerous of ["=cmd|'/c calc'!A1", "+SUM(1+1)", "-2+3", "@import", "\tTabbed", "\rCarriage"]) {
    // the escaped form is present…
    expect(cells.includes("'" + dangerous)).toBe(true);
    // …and the raw, Excel-executable form is not
    expect(cells.includes(dangerous)).toBe(false);
  }
  // no parsed cell may begin with a character Excel treats as a formula start
  for (const c of cells) expect(/^[=+\-@\t\r]/.test(c)).toBe(false);
  await p.__ctx.close();
});

await test("quotes, commas and newlines round-trip through the CSV", async () => {
  const note = 'He said "denial", then "no thanks"\nSecond line, with a comma';
  const p = await openCapturing([
    ev(-1, { case: "214,B", plan: 'Blue "Cross" NC MA', note }),
  ]);
  const csv = await exportCsv(p, 90);
  const rows = parseCSV(csv).filter((r) => r.length > 1);
  expect(rows.length).toBe(2);
  const [head, row] = rows;
  expect(row.length).toBe(head.length);
  expect(row[head.indexOf("Case")]).toBe("214,B");
  expect(row[head.indexOf("Plan")]).toBe('Blue "Cross" NC MA');
  expect(row[head.indexOf("Note")]).toBe(note);
  await p.__ctx.close();
});

await test("output starts with a UTF-8 BOM and uses CRLF line endings", async () => {
  const p = await openCapturing([ev(-1, { case: "A-1" }), ev(-2, { case: "A-2" })]);
  await exportCsv(p, 90);
  // Blob.text() strips a leading BOM per spec, so assert on the raw bytes, and
  // re-decode with ignoreBOM to see exactly what lands on disk.
  const { bytes, raw } = await p.evaluate(async () => {
    const buf = await window.__blobs[window.__blobs.length - 1].arrayBuffer();
    const u = new Uint8Array(buf);
    return {
      bytes: [u[0], u[1], u[2]],
      raw: new TextDecoder("utf-8", { ignoreBOM: true }).decode(buf),
    };
  });
  expect(bytes).toEqual([0xef, 0xbb, 0xbf]);
  expect(raw.charCodeAt(0)).toBe(0xfeff);
  const body = raw.slice(1);
  expect(body.split("\r\n").length).toBe(3);            // header + 2 rows
  expect(body.replace(/\r\n/g, "")).notToContain("\n"); // no bare LF terminators
  expect(body.replace(/\r\n/g, "")).notToContain("\r");
  await p.__ctx.close();
});

await test("header row and column order are exactly as documented", async () => {
  const p = await openCapturing([ev(-1, { type: "Appeal won", days: 7, amt: 4200, note: "n" })]);
  const csv = await exportCsv(p, 90);
  const rows = parseCSV(csv).filter((r) => r.length > 1);
  expect(rows[0]).toEqual(["Date", "Case", "Plan", "Event", "DaysRecovered", "DollarsProtected", "Note"]);
  expect(rows[1]).toEqual([dayFromToday(-1), "C-1", "Aetna MA", "Appeal won", "7", "4200", "n"]);
  await p.__ctx.close();
});

await test("em dashes in event type names survive the export intact", async () => {
  const p = await openCapturing([
    ev(-1, { type: "Appeal filed — QIO" }),
    ev(-2, { type: "Auth submitted — late" }),
  ]);
  const csv = await exportCsv(p, 90);
  expect(csv).toContain("Appeal filed — QIO");
  expect(csv).toContain("Auth submitted — late");
  expect(csv).notToContain("â€"); // mojibake from double-encoding
  const type = await p.evaluate(() => window.__blobs[window.__blobs.length - 1].type);
  expect(type).toContain("charset=utf-8");
  await p.__ctx.close();
});

await test("rows are ordered oldest-first inside the export", async () => {
  const p = await openCapturing([
    ev(-2, { case: "MID" }), ev(-9, { case: "OLD" }), ev(0, { case: "NEW" }),
  ]);
  const csv = await exportCsv(p, 90);
  const rows = parseCSV(csv).filter((r) => r.length > 1).slice(1);
  expect(rows.map((r) => r[1])).toEqual(["OLD", "MID", "NEW"]);
  await p.__ctx.close();
});

await test("the download itself fires and the filename encodes the selected period", async () => {
  // No interception here — this exercises the real anchor/Blob/revoke path.
  const p = await openLog([ev(-1, { case: "REAL" })]);
  await p.click('#period button[data-d="30"]');
  const [dl] = await Promise.all([
    p.waitForEvent("download", { timeout: 5000 }),
    p.click("#csvBtn"),
  ]);
  expect(dl.suggestedFilename()).toBe(`cc-outcomes-30d-${dayFromToday(0)}.csv`);
  const [dl2] = await Promise.all([
    p.waitForEvent("download", { timeout: 5000 }),
    (async () => { await p.click('#period button[data-d="0"]'); await p.click("#csvBtn"); })(),
  ]);
  expect(dl2.suggestedFilename()).toBe(`cc-outcomes-all-${dayFromToday(0)}.csv`);
  await p.__ctx.close();
});

await test("rows the page flags as needing correction are reachable somewhere", async () => {
  // DEFECT: the "Excluded from every total" card counts future-dated and
  // unreadable-date events and tells the user to "open and correct them", but
  // inPeriod() drops those same rows from the table (no Edit button) AND from
  // the all-time CSV export. There is no in-app path to the rows the app is
  // telling you to fix — only devtools on localStorage.
  const p = await openCapturing([
    ev(-1, { case: "REAL" }),
    ev(3, { case: "FUTURE-TYPO" }),
    { id: "bad", date: "not-a-date", case: "BAD-DATE", plan: "", type: "Appeal won", days: 0, amt: 0, note: "" },
  ]);
  const flagged = await p.evaluate(() => {
    const c = [...document.querySelectorAll("#cards .c")].find((x) => x.textContent.includes("Excluded"));
    return c ? c.querySelector(".v").textContent.trim() : null;
  });
  expect(flagged).toBe("2"); // the page does flag them

  const editable = await p.evaluate(() =>
    [...document.querySelectorAll("#tableWrap [data-edit]")].length);
  const csv = await exportCsv(p, 0); // "All time" — the widest view available
  const reachable = [];
  for (const id of ["FUTURE-TYPO", "BAD-DATE"]) {
    const inTable = await p.evaluate((s) => document.getElementById("tableWrap").textContent.includes(s), id);
    if (inTable || csv.includes(id)) reachable.push(id);
  }
  expect(editable).toBe(3);            // every stored event should be openable
  expect(reachable).toEqual(["FUTURE-TYPO", "BAD-DATE"]);
  await p.__ctx.close();
});
