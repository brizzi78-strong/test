// Lane: a11y-print — accessibility, print output, small-viewport behaviour.
//
// Everything here drives the real pages in Chromium. Dates are always computed
// from dayFromToday() so the suite does not rot overnight.

import { suite, test, expect, open, dayFromToday } from "./harness.mjs";

/* ------------------------------------------------------------------ helpers */

const TOOLS = ["tracker.html", "outcomes.html", "rules.html", "appeal-letters.html"];

/** Accessible-name audit for every real form control inside a <dialog>. */
async function unlabelledControlsIn(p, dialogSel) {
  return p.evaluate((sel) => {
    const dlg = document.querySelector(sel);
    if (!dlg) return ["__no-dialog__"];
    const bad = [];
    for (const el of dlg.querySelectorAll("input, select, textarea")) {
      if (el.type === "hidden") continue;
      const id = el.id || "(no id)";
      const byFor = el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      const wrapping = el.closest("label");
      const aria = (el.getAttribute("aria-label") || "").trim();
      const labelledby = (el.getAttribute("aria-labelledby") || "")
        .split(/\s+/).filter(Boolean)
        .map((x) => document.getElementById(x))
        .filter(Boolean).length;
      const labelText = byFor ? byFor.textContent.trim() : wrapping ? wrapping.textContent.trim() : "";
      const named = (byFor && labelText) || (wrapping && labelText) || aria || labelledby;
      if (!named) bad.push(`${el.tagName.toLowerCase()}#${id}`);
    }
    return bad;
  }, dialogSel);
}

/** true when the element is actually painted (respects display/visibility). */
const shown = (p, sel) => p.locator(sel).first().isVisible();

/** Does the document itself scroll sideways? Inner scrollers are fine. */
async function docOverflow(p) {
  return p.evaluate(() => {
    const d = document.documentElement;
    const offenders = [];
    const vw = d.clientWidth;
    for (const el of document.body.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.right > vw + 1) {
        const cs = getComputedStyle(el);
        // An element wider than the viewport is only a problem when nothing
        // between it and <html> clips or scrolls it.
        let clipped = false;
        for (let a = el.parentElement; a && a !== d; a = a.parentElement) {
          const ov = getComputedStyle(a).overflowX;
          if (ov === "auto" || ov === "scroll" || ov === "hidden") { clipped = true; break; }
        }
        if (!clipped) offenders.push(`${el.tagName.toLowerCase()}.${(el.className || "").toString().split(/\s+/)[0]} right=${Math.round(r.right)} pos=${cs.position}`);
      }
    }
    return { scrollWidth: d.scrollWidth, clientWidth: d.clientWidth, offenders: offenders.slice(0, 6) };
  });
}

/* ---------------------------------------------------------------- fixtures */

// One tracker case that forces every severity band into the DOM at once:
// overdue recert (crit), a 2-day covered-through (warn), a note due in 6 (ok).
const trackerSeed = [{
  id: "seed-a11y-1",
  cid: "A11Y-1", plan: "Aetna MA",
  admit: dayFromToday(-20), cycle: 3, lead: 1,
  covered: dayFromToday(2), nomnc: "",
  note: dayFromToday(-1), cert: dayFromToday(-20),
  status: "NOMNC issued", exposure: 1200,
  order: "PT 5x/week × 21 days", notes: "Colour-coded clock fixture.",
}];

const outcomesSeed = [
  { id: "o1", date: dayFromToday(-3), case: "A11Y-1", plan: "Aetna MA", type: "Auth submitted — on time", days: 0, amt: 0, note: "" },
  { id: "o2", date: dayFromToday(-2), case: "A11Y-1", plan: "Aetna MA", type: "Denial received", days: 0, amt: 0, note: "" },
  { id: "o3", date: dayFromToday(-1), case: "A11Y-2", plan: "WellCare MA", type: "Appeal filed — QIO", days: 0, amt: 0, note: "" },
  { id: "o4", date: dayFromToday(-1), case: "A11Y-2", plan: "WellCare MA", type: "Appeal won", days: 6, amt: 3400, note: "Jimmo rebuttal accepted by the reviewer on the first pass." },
  { id: "o5", date: dayFromToday(-200), case: "A11Y-3", plan: "Humana MA", type: "Auth submitted — late", days: 0, amt: 0, note: "" },
];

/* ============================================================ ACCESSIBILITY */

suite("a11y — labels & accessible names");

await test("tracker dialog: every form control has an accessible name", async () => {
  const p = await open("tracker.html", { storage: { "ma-case-tracker-v1": trackerSeed } });
  await p.click("#addBtn");
  const bad = await unlabelledControlsIn(p, "#dlg");
  expect(bad.join(", ")).toBe("");
  // sanity: the audit actually saw controls
  expect(await p.locator("#dlg input, #dlg select, #dlg textarea").count()).toBeGreaterThan(10);
  await p.__ctx.close();
});

await test("outcomes dialog: every form control has an accessible name", async () => {
  const p = await open("outcomes.html", { storage: { "cc-outcomes-v1": outcomesSeed } });
  await p.click("#addBtn");
  const bad = await unlabelledControlsIn(p, "#dlg");
  expect(bad.join(", ")).toBe("");
  expect(await p.locator("#dlg input, #dlg select, #dlg textarea").count()).toBeGreaterThan(5);
  await p.__ctx.close();
});

await test("rules dialog: every form control has an accessible name", async () => {
  const p = await open("rules.html");
  await p.click("#addBtn");
  const bad = await unlabelledControlsIn(p, "#dlg");
  expect(bad.join(", ")).toBe("");
  expect(await p.locator("#dlg input, #dlg select, #dlg textarea").count()).toBeGreaterThan(8);
  await p.__ctx.close();
});

await test("icon-only theme toggle carries an accessible name on all four tools", async () => {
  const missing = [];
  for (const f of TOOLS) {
    const p = await open(f);
    const name = await p.evaluate(() => {
      const b = document.getElementById("themeBtn");
      if (!b) return "__missing__";
      const aria = (b.getAttribute("aria-label") || "").trim();
      const labelledby = (b.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean)
        .map((x) => document.getElementById(x)).filter(Boolean)
        .map((n) => n.textContent.trim()).join(" ");
      // "◐" is decorative — glyph-only text content is not an accessible name.
      const text = (b.textContent || "").replace(/[^\p{L}\p{N}]+/gu, "").trim();
      return aria || labelledby || text;
    });
    if (!name || name === "__missing__") missing.push(`${f}: ${name}`);
    await p.__ctx.close();
  }
  expect(missing.join(", ")).toBe("");
});

await test("rules.html filter controls above the fold are labelled too", async () => {
  // These are outside the dialog but are the primary way the registry is
  // driven — a screen-reader user gets four unnamed comboboxes otherwise.
  const p = await open("rules.html");
  const bad = await p.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll(".filters select, .filters input")) {
      const byFor = el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      const aria = (el.getAttribute("aria-label") || "").trim();
      const title = (el.getAttribute("title") || "").trim();
      if (!byFor && !aria && !title) out.push(`${el.tagName.toLowerCase()}#${el.id}`);
    }
    return out;
  });
  expect(bad.join(", ")).toBe("");
  await p.__ctx.close();
});

suite("a11y — navigation & keyboard");

await test("nav strip marks exactly one current page, and it is this page", async () => {
  const wrong = [];
  for (const f of TOOLS) {
    const p = await open(f);
    const got = await p.evaluate(() => {
      const links = [...document.querySelectorAll("nav.toolnav a")];
      const cur = links.filter((a) => a.hasAttribute("aria-current"));
      return {
        total: links.length,
        count: cur.length,
        href: cur[0] ? cur[0].getAttribute("href") : null,
        value: cur[0] ? cur[0].getAttribute("aria-current") : null,
      };
    });
    // 5 links: Home (the gated hub) + the four tools. Exactly one is current.
    if (got.total !== 5 || got.count !== 1 || got.href !== f || got.value !== "page")
      wrong.push(`${f} -> ${JSON.stringify(got)}`);
    await p.__ctx.close();
  }
  expect(wrong.join(" | ")).toBe("");
});

await test("Tab from the top of the document reaches the primary action button", async () => {
  const p = await open("tracker.html", { storage: { "ma-case-tracker-v1": trackerSeed } });
  await p.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  const seen = [];
  let found = false;
  for (let i = 0; i < 25 && !found; i++) {
    await p.keyboard.press("Tab");
    const id = await p.evaluate(() => {
      const a = document.activeElement;
      return a ? (a.id || a.tagName.toLowerCase() + ":" + (a.textContent || "").trim().slice(0, 14)) : "(none)";
    });
    seen.push(id);
    if (id === "addBtn") found = true;
  }
  expect(`${found} after ${seen.join(" > ")}`).toContain("true");
  await p.__ctx.close();
});

await test("Escape closes an open dialog and focus is restored, not dropped on <body>", async () => {
  const p = await open("tracker.html", { storage: { "ma-case-tracker-v1": trackerSeed } });
  await p.click("#addBtn");
  expect(await p.evaluate(() => document.getElementById("dlg").open)).toBe(true);
  // Focus should have moved into the dialog when it opened.
  expect(await p.evaluate(() => document.getElementById("dlg").contains(document.activeElement))).toBe(true);

  await p.keyboard.press("Escape");
  await p.waitForTimeout(120);
  expect(await p.evaluate(() => document.getElementById("dlg").open)).toBe(false);

  const after = await p.evaluate(() => {
    const a = document.activeElement;
    if (!a) return "(null)";
    if (a === document.body || a === document.documentElement) return "(void)";
    return a.id || a.tagName.toLowerCase();
  });
  expect(after).toBe("addBtn");
  await p.__ctx.close();
});

await test("outcomes period filter uses aria-pressed and it tracks the selection", async () => {
  const p = await open("outcomes.html", { storage: { "cc-outcomes-v1": outcomesSeed } });
  const state = () => p.evaluate(() =>
    [...document.querySelectorAll("#period button")].map((b) => `${b.dataset.d}:${b.getAttribute("aria-pressed")}`));

  // Default period is 90 days; exactly one button may be pressed.
  expect((await state()).join(",")).toBe("30:false,90:true,365:false,0:false");

  await p.click('#period button[data-d="30"]');
  await p.waitForTimeout(80);
  expect((await state()).join(",")).toBe("30:true,90:false,365:false,0:false");
  // …and the filter really applied: the 200-day-old event drops out.
  expect(await p.locator("#tableWrap table tbody tr").count()).toBe(4);

  await p.click('#period button[data-d="0"]');
  await p.waitForTimeout(80);
  expect((await state()).join(",")).toBe("30:false,90:false,365:false,0:true");
  expect(await p.locator("#tableWrap table tbody tr").count()).toBe(5);
  await p.__ctx.close();
});

suite("a11y — colour is never the only signal");

await test("every colour-coded tracker clock also carries a text urgency label", async () => {
  const p = await open("tracker.html", { storage: { "ma-case-tracker-v1": trackerSeed } });
  const report = await p.evaluate(() => {
    const out = { bands: {}, silent: [] };
    for (const el of document.querySelectorAll(".clock.ok, .clock.warn, .clock.crit")) {
      const band = ["ok", "warn", "crit"].find((b) => el.classList.contains(b));
      out.bands[band] = (out.bands[band] || 0) + 1;
      const rel = el.querySelector(".rel");
      const txt = rel ? rel.textContent.trim() : "";
      if (!txt) out.silent.push((el.querySelector(".lab") || {}).textContent || "?");
    }
    return out;
  });
  // The fixture is built so all three bands are on screen.
  expect(report.bands.crit > 0 && report.bands.warn > 0 && report.bands.ok > 0)
    .toBe(true);
  expect(report.silent.join(", ")).toBe("");

  // And the wording is a real urgency phrase, not just a repeated date.
  const rels = await p.locator(".clock.ok .rel, .clock.warn .rel, .clock.crit .rel").allTextContents();
  const bad = rels.filter((t) => !/TODAY|Tomorrow|overdue|Overdue|MISSED|in \d+ days/.test(t));
  expect(bad.join(" | ")).toBe("");
  await p.__ctx.close();
});

await test("rules freshness badges spell out the state, not just the border colour", async () => {
  const p = await open("rules.html", {
    storage: {
      "cc-rules-v1": [
        { id: "r-fresh", plan: "Aetna MA", state: "NC", product: "Medicare Advantage", type: "Contact",
          value: "Fresh rule.", source: "manual", verified: dayFromToday(-1), interval: 90, history: [] },
        { id: "r-due", plan: "Aetna MA", state: "NC", product: "Medicare Advantage", type: "Appeal route",
          value: "Due rule.", source: "manual", verified: dayFromToday(-100), interval: 90, history: [] },
        { id: "r-stale", plan: "WellCare MA", state: "NC", product: "Medicare Advantage", type: "Contact",
          value: "Stale rule.", source: "manual", verified: dayFromToday(-400), interval: 90, history: [] },
      ],
    },
  });
  const seen = await p.evaluate(() =>
    [...document.querySelectorAll("article.rule")].map((r) => {
      const band = ["fresh", "due", "stale"].find((b) => r.classList.contains(b)) || "none";
      const badge = r.querySelector(".badge");
      return `${band}=${badge ? badge.textContent.trim().toLowerCase() : "(no badge)"}`;
    }).sort());
  expect(seen.join(",")).toBe("due=due for review,fresh=fresh,stale=stale");
  await p.__ctx.close();
});

/* =================================================================== PRINT */

suite("print output");

for (const [file, storage] of [
  ["tracker.html", { "ma-case-tracker-v1": trackerSeed }],
  ["outcomes.html", { "cc-outcomes-v1": outcomesSeed }],
  ["rules.html", null],
]) {
  await test(`${file} print media hides nav, buttons and the PHI banner`, async () => {
    const p = await open(file, storage ? { storage } : {});
    await p.emulateMedia({ media: "print" });
    await p.waitForTimeout(80);

    // The actual content must survive the print stylesheet.
    const contentSel = file === "rules.html" ? "article.rule" : file === "outcomes.html" ? "#tableWrap" : "article.case";
    expect(await shown(p, contentSel)).toBe(true);

    const visible = [];
    for (const [what, sel] of [
      ["action button (#printBtn)", "#printBtn"],
      ["theme toggle (#themeBtn)", "#themeBtn"],
      ["PHI banner (p.phi)", "p.phi"],
      ["header nav (nav.toolnav)", "nav.toolnav"],
    ]) if (await shown(p, sel)) visible.push(what);
    expect(`still printed: ${visible.join(", ")}`).toBe("still printed: ");
    await p.__ctx.close();
  });
}

await test("appeal-letters print keeps the letter body and drops the form chrome", async () => {
  const p = await open("appeal-letters.html", { storage: { "ma-appeal-facility": { fac: "Example SNF" } } });
  await p.waitForTimeout(150);
  const before = (await p.locator("#letter").textContent()).trim();
  expect(before.length).toBeGreaterThan(200);

  await p.emulateMedia({ media: "print" });
  await p.waitForTimeout(80);

  expect(await shown(p, "nav.toolnav")).toBe(false);
  expect(await shown(p, ".outbar")).toBe(false);
  expect(await shown(p, ".panel")).toBe(false);
  expect(await shown(p, ".tabs")).toBe(false);
  expect(await shown(p, "p.phi")).toBe(false);

  expect(await shown(p, "#letter")).toBe(true);
  const box = await p.locator("#letter").boundingBox();
  expect(box.height).toBeGreaterThan(100);
  // Nothing clipped away: max-height/overflow are lifted for print.
  const css = await p.evaluate(() => {
    const cs = getComputedStyle(document.getElementById("letter"));
    return { maxHeight: cs.maxHeight, overflowY: cs.overflowY };
  });
  expect(css.maxHeight).toBe("none");
  expect(css.overflowY).toBe("visible");
  expect((await p.locator("#letter").textContent()).trim()).toBe(before);
  await p.__ctx.close();
});

await test("investors.html print puts each slide on its own page and hides the HUD", async () => {
  const p = await open("investors.html");
  await p.emulateMedia({ media: "print" });
  await p.waitForTimeout(80);

  expect(await shown(p, ".hud")).toBe(false);

  const slides = await p.evaluate(() =>
    [...document.querySelectorAll("section.slide")].map((s) => {
      const cs = getComputedStyle(s);
      return { id: s.id, breakAfter: cs.breakAfter, pageBreakAfter: cs.pageBreakAfter };
    }));
  expect(slides.length).toBeGreaterThan(10);
  const notBroken = slides.filter((s) =>
    !["page", "always"].includes(s.breakAfter) && !["page", "always"].includes(s.pageBreakAfter));
  expect(notBroken.map((s) => s.id).join(", ")).toBe("");
  await p.__ctx.close();
});

/* ============================================================== RESPONSIVE */

suite("responsive — 380px");

for (const file of TOOLS) {
  await test(`${file} does not scroll the document sideways at 380px`, async () => {
    const storage = file === "tracker.html" ? { "ma-case-tracker-v1": trackerSeed }
      : file === "outcomes.html" ? { "cc-outcomes-v1": outcomesSeed } : null;
    const p = await open(file, storage ? { storage } : {});
    await p.setViewportSize({ width: 380, height: 800 });
    await p.waitForTimeout(200);

    const r = await docOverflow(p);
    expect(`${r.scrollWidth}/${r.clientWidth} offenders=[${r.offenders.join(" ; ")}]`)
      .toBe(`${r.clientWidth}/${r.clientWidth} offenders=[]`);
    expect(p.__errors.join(" | ")).toBe("");
    await p.__ctx.close();
  });
}

await test("outcomes table stays readable at 380px by scrolling inside its own container", async () => {
  const p = await open("outcomes.html", { storage: { "cc-outcomes-v1": outcomesSeed } });
  await p.setViewportSize({ width: 380, height: 800 });
  await p.waitForTimeout(200);
  const r = await p.evaluate(() => {
    const tw = document.getElementById("tableWrap");
    const cs = getComputedStyle(tw);
    return { overflowX: cs.overflowX, wrapW: tw.clientWidth, scrollW: tw.scrollWidth, docOver: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  expect(["auto", "scroll"]).toContain(r.overflowX);
  expect(r.docOver).toBeLessThan(2);
  await p.__ctx.close();
});
