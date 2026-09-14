# Test suite — August 2026

Ten agents wrote 177 executable tests across the four tools, ran them, and found
**17 distinct product defects**. The report below is their verification pass.

**Status: all 17 fixed. The suite is green — 179 passed, 0 failed, 11 lanes.**
Re-run any time with `node cardinal-coverage/tests/run.mjs` (exits non-zero on
failure, so it can gate a commit).

The worst finding was a regression introduced while fixing the earlier audit's
cross-tab storage issue: the merge-on-write could not distinguish a locally
deleted case from one another tab had added, so **delete was a no-op and Demo
data appended instead of replacing**. Both are fixed with a tombstone set.

---

## Cardinal Coverage — Test Suite Verification

### Headline

**179 tests · 156 passed · 23 failed · 0 skipped · 11 lanes.**

All 23 failures are **genuine product defects** documenting **17 distinct bugs**. **Zero test bugs** — no lane failed to load, no failing test was wrong, so nothing under `tests/` was edited (`git status` on `cardinal-coverage/` is clean). All 19 claimed defects reproduce; one is a duplicate filing (the delete/demo bug was found independently by `tracker-state` and `e2e-tracker`), and the 23→17 gap is two defects each covered by multiple red tests.

Self-reports were accurate: the ten lanes' claimed totals (177 tests + 2 smoke = 179) and claimed failures (23) match the runner exactly. Two consecutive full runs produced identical results — the suite is deterministic.

### Verbatim runner output

```
[FAIL] a11y — labels & accessible names  —  4 passed, 1 FAILED
        ✗ rules.html filter controls above the fold are labelled too
          expected "", got "select#fPlanSel, select#fStateSel, select#fTypeSel, select#fFreshSel, input#fSearch"
[ ok ] a11y — navigation & keyboard  —  4 passed
[ ok ] a11y — colour is never the only signal  —  2 passed
[FAIL] print output  —  4 passed, 1 FAILED
        ✗ tracker.html print media hides nav, buttons and the PHI banner
          expected "still printed: ", got "still printed: header nav (nav.toolnav)"
[ ok ] responsive — 380px  —  5 passed
[FAIL] e2e handoff: tracker → outcomes  —  15 passed, 2 FAILED
        ✗ the default handoff for an open appeal does not log a decision with no filing
          expected NOT to contain "decision with no logged filing"
        ✗ the default handoff for an open appeal does not produce a self-contradicting sentence
          expected falsy, got true
[FAIL] e2e tracker  —  13 passed, 2 FAILED
        ✗ deleting a case removes it from the board and from storage
          expected NOT to contain "WARN-CASE"
        ✗ Demo data replaces the existing caseload instead of appending to it
          expected 5, got 9
[ ok ] letters · generation  —  5 passed
[ ok ] letters · placeholders  —  5 passed
[FAIL] letters · privacy promise  —  3 passed, 1 FAILED
        ✗ only the fields the UI labels 'Facility (saved)' are persisted
          expected "[]", got "[\"fPlan\",\"fPlanFax\"]"
[FAIL] letters · counsel warning  —  1 passed, 1 FAILED
        ✗ the counsel warning renders in its critical-alert styling
          expected to match /^--crit=#?\w+ --crit-bg=#?\w+$/ — got "--crit=(undefined) --crit-bg=(undefined)"
[ ok ] outcomes: streak  —  8 passed
[FAIL] outcomes: CSV export  —  10 passed, 1 FAILED
        ✗ rows the page flags as needing correction are reachable somewhere
          expected 3, got 1
[FAIL] outcomes metrics  —  14 passed, 2 FAILED
        ✗ a future-dated appeal filing does not inflate the pending count
          expected NOT to contain "pending"
        ✗ with adverse events logged the sentence shows real numbers, not the empty-state prompt
          expected NOT to contain "Log a few events"
[ ok ] rules-registry · freshness math  —  6 passed
[FAIL] rules-registry · seeding  —  2 passed, 1 FAILED
        ✗ a deliberately emptied registry stays empty when reopened
          expected 0, got 8
[FAIL] rules-registry · freshness surfaced  —  3 passed, 1 FAILED
        ✗ a stale rule is never pushed below a fresh one by plan grouping
          expected "STALE | STALE | fresh", got "STALE | fresh | STALE"
[ ok ] rules-registry · change history  —  2 passed
[ ok ] rules-registry · discipline & filters  —  2 passed
[ ok ] rules-registry · export / import  —  2 passed
[FAIL] security — output escaping  —  18 passed, 3 FAILED
        ✗ tracker: the auth-cycle field is interpolated into the card without escaping
          expected undefined, got 1
        ✗ outcomes: a record id breaks out of the Edit button attribute
          expected undefined, got 1
        ✗ rules: importing a crafted registry export must not execute script
          expected undefined, got 1
[ ok ] harness smoke  —  2 passed
[FAIL] tracker deadline clocks  —  16 passed, 3 FAILED
        ✗ when the two QIO clocks differ, both dates must be visible for cross-check
          expected to contain "2026-08-24" — got "2026-08-20,2026-08-20"
        ✗ a delivered NOMNC with no covered-through still yields a 422.626 deadline
          expected exactly 1 clock matching "QIO", got 0: ["Auth covered through","Weekly progress note due"]
        ✗ rendered page shows a QIO deadline when a NOMNC was delivered but cover-through is blank
          expected to contain "QIO" — got "NO-COVER\nWELLCARE MA\nNOMNC issued · 3-day cycle\nLog outcome\nEdit\nAUTH COVERED THROUGH\nnot set\nSTAY DAY\nDay 6 of stay\nPHYSICIAN RECERT DUE\nSun, Aug 23\nin 8 days\nWEEKLY PROGRESS NOTE DUE\nFri, Aug 21\nin 6 days"
[FAIL] tracker-state  —  10 passed, 4 FAILED
        ✗ Demo data replaces the caseload with exactly five cases
          expected ["105-B","118","214-B","227-C","301-A"], got ["105-B","118","214-B","227-C","301-A","Case 1","Case 2"]
        ✗ deleting a case removes it from the page and from storage
          expected ["seed-b"], got ["seed-b","seed-a"]
        ✗ a deleted case stays deleted after reload
          expected 1, got 2
        ✗ an array holding a null row does not blank the page
          expected 4, got 0

156 passed · 23 failed · 0 skipped · 11 lanes
```

---

## Confirmed defects

### 1. CRITICAL — Delete is a no-op and Demo data appends; `save()` resurrects every removed case
**`/home/user/test/cardinal-coverage/tracker.html:277-280`** · 4 red tests across 2 lanes

```js
const mine = new Set(cases.map(c => c.id));
const theirs = onDisk.filter(c => c && !mine.has(c.id));
if (theirs.length) cases = cases.concat(theirs);
```

**Repro (delete):** seed `ma-case-tracker-v1` with two cases (`seed-a`/ROOM-9A, `seed-b`/ROOM-9B), load tracker.html, Edit ROOM-9A → "Delete case" → accept confirm.
**Repro (demo):** load with the 2 starter rows, click "Demo data", accept "Replace the current caseload with demo data?".
**Expected:** storage `["seed-b"]`, 1 card, still 1 after reload / exactly the 5 demo cases.
**Actual:** storage `["seed-b","seed-a"]`, 2 cards, survives reload / 7 cases (9 with a 4-case seed).

A locally deleted id is by construction "on disk but not in `mine`", so the cross-tab merge cannot distinguish it from a row another tab added and always re-adopts it. The write-back makes it permanent, not cosmetic. The confirm text explicitly promises replacement and tells the user to export first.

**Fix:** give `save()` an intent. Add a module-level `const tombstones = new Set()`, push the id in the `delBtn` handler (`tracker.html:473`) and all pre-existing ids in `loadDemo()` (`:483`), then filter: `const theirs = onDisk.filter(c => c && !mine.has(c.id) && !tombstones.has(c.id));`. Equivalently, add a `save({merge:false})` variant and call it from both paths.

### 2. HIGH — Importing a shared registry export executes script (`rules.html`)
**`/home/user/test/cardinal-coverage/rules.html:334`** (with `:419`)

`<button class="btn ghost sm" data-edit="${r.id}">Edit</button>` — `r.id` is the only value in that template not passed through `esc()`.

**Repro:** import a JSON array containing `{"id":"x\"><img src=x onerror=\"window.__pwned=1\">","plan":"Shared Registry","state":"NC","product":"Medicare Advantage","type":"Appeal route","interval":90,"verified":"<recent date>","value":"Imported rule.","source":"Partner export","history":[]}`. The import guard at `:419` is only `if (!r || !r.id || !r.value) continue;`, so the object is pushed wholesale.
**Expected:** `window.__pwned === undefined`, zero `<img>` under `#list`.
**Actual:** `window.__pwned === 1`.

Import is a first-class feature of this tool — a registry export emailed between facilities is exactly the delivery mechanism the feature invites. This is the highest-reachability of the three escaping holes.

**Fix:** `data-edit="${esc(r.id)}"` at `:334`, plus an id whitelist at `:419`: `if (!r || !r.value || typeof r.id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(r.id)) continue;` (the whitelist also stops a crafted id colliding with an existing rule through the `Object.assign` branch).

### 3. HIGH — No QIO fast-track deadline when a NOMNC is delivered but "Covered through" is blank
**`/home/user/test/cardinal-coverage/tracker.html:326-341`** · 2 red tests

The entire QIO block sits inside `if (covered){ … }`.

**Repro:** `clocksFor({ nomnc: <today>, cycle:3, lead:1 })` → `["Auth covered through" (none), "Weekly progress note due"]`, zero QIO clocks. In-browser, a case `{covered:"", nomnc:<today>, admit:<today-5>}` renders AUTH COVERED THROUGH / not set, STAY DAY, PHYSICIAN RECERT DUE, WEEKLY PROGRESS NOTE DUE and nothing mentioning QIO.
**Expected:** 42 CFR 422.626 runs from the date the notice was *delivered*, so delivery+1 (noon) is fully determined by `c.nomnc` alone — a QIO clock at `<today+1>`.
**Actual:** the single most time-critical deadline in the tool disappears silently. The case also sorts as low-urgency and the "Due within 2 days" / "Overdue" stats ignore it.

**Fix:** hoist the delivery clock out of the `if (covered)` branch. Compute `const delivered = parseD(c.nomnc); const byDelivery = delivered ? addD(delivered,1) : null;` above line 326; keep the earlier-of-two logic inside `if (covered)`; add `else if (byDelivery) out.push({lab:"QIO deadline (422.626, from delivery)", date:byDelivery, days:diffD(byDelivery,t), noon:true});`.

### 4. HIGH — One malformed row inside the stored array blanks the whole page
**`/home/user/test/cardinal-coverage/tracker.html:271`** and **`:533`**

**Repro:** `localStorage.setItem("ma-case-tracker-v1", JSON.stringify([{id:"a",cid:"ROOM-9A"}, null]))`, load tracker.html.
**Expected:** 4 stat tiles, ROOM-9A visible — the same resilience the page already gives a non-array or unparseable payload (both of those tests pass).
**Actual:** 0 stat tiles, empty `#cases`. `load()` checks only `Array.isArray`, not element shape, so `clocksFor(null)` throws at `:315` (`parseD(c.covered)`); `render()` at `:533` is **outside** the bootstrap `try/catch` on the same line, so the exception escapes before `$("stats").innerHTML` is assigned. The valid case is invisible and unrecoverable through the UI — no cards to edit, and Export writes the corrupt array back.

**Fix:** after the `Array.isArray` guard at `:271` add `cases = cases.filter(c => c && typeof c === "object" && !Array.isArray(c));`, and move `render()` inside the try/catch at `:533` with an empty-state fallback.

### 5. HIGH — Tracker suggests "Appeal won" for a case whose status is "Denied — appeal open"
**`/home/user/test/cardinal-coverage/tracker.html:370`** · 2 red tests

`case "Denied — appeal open": return "Appeal won";`

**Repro:** seed one case `{cid:"214-B", plan:"Aetna MA", status:"Denied — appeal open"}` and an empty outcomes log. Click that card's "Log outcome", accept the pre-selected event, Save.
**Expected:** `"Appeal filed — plan"` — an open appeal has been filed and is undecided, so the default should increment pending.
**Actual:** the outcomes page immediately renders its own data-integrity alarm — `1W · 0L · too few to rate · ⚠ 1 decision with no logged filing` — and the traction sentence reads "filed 0 appeals and won 1 of 1 decided". Pending stays 0 while the case status literally says the appeal is open. The sibling `"NOMNC issued" → "Appeal filed — QIO"` branch already follows the correct pattern (that test passes).

Pre-selecting a win also biases the appeal win rate — the headline metric the tool says "sets your price" — upward for every operator who accepts the default.

**Fix:** `case "Denied — appeal open": return "Appeal filed — plan";`

### 6. HIGH — Events the page flags as "open and correct them" are unreachable
**`/home/user/test/cardinal-coverage/outcomes.html:278`** and **`:377`** (both key off `inPeriod`, `:212`)

**Repro:** seed `cc-outcomes-v1` with a normal event dated yesterday, one dated +3 days (`FUTURE-TYPO`, "Appeal won", 9 days / $900), and one with `date:"not-a-date"` (`BAD-DATE`). Open outcomes.html; select "All time"; Export CSV.
**Expected:** 3 `[data-edit]` buttons; both flagged ids reachable in the table or the all-time export.
**Actual:** the red card correctly reads "Excluded from every total — 2 — open and correct them", but the table renders 1 row and 1 Edit button, `#tableWrap.textContent` contains neither id, and the all-time CSV contains neither. The $900 and 9 recovered days vanish from the cards, the sentence and the export, with no in-app route to the record — the card's instruction is impossible to follow without devtools.

**Fix:** keep `inPeriod` for the metric totals, but build the table and the all-time export from a superset: `const shown = [...events.filter(inPeriod), ...events.filter(isExcluded)]`, each row keeping its `data-edit` button (pin the excluded ones at top with a warning pill).

### 7. HIGH — Traction sentence shows the empty-state prompt while the cards show real activity
**`/home/user/test/cardinal-coverage/outcomes.html:301`**

`(m.subs || m.filed || m.days || m.amt || m.decided)` omits `m.denials`, `m.nomnc` and `m.cases`.

**Repro:** seed four events in the last week with no submissions/appeals/recovery — two "Denial received", one "NOMNC issued", one "Auth approved".
**Expected:** the sentence renders the real numbers it shares with the cards ("…we tracked 4 Medicare Advantage cases … absorbed 3 denials or termination notices…").
**Actual:** cards read "Cases touched = 4" and "Denials & NOMNCs = 3", the table renders 4 rows, and `#sentence` renders the placeholder verbatim: "Log a few events and this becomes the sentence you put on the traction slide…". A log made entirely of adverse events or approvals reads as empty.

**Fix:** gate on `list.length` (or add `|| m.denials || m.nomnc || m.cases`) so the sentence and the cards can never disagree about whether the log is empty.

### 8. MEDIUM — Unescaped record id in the Edit button attribute (outcomes + tracker)
**`/home/user/test/cardinal-coverage/outcomes.html:321`** and **`/home/user/test/cardinal-coverage/tracker.html:423`**

**Repro:** seed `cc-outcomes-v1` with an event whose `id` is `x"><img src=x onerror="window.__pwned=1">`, all other fields ordinary. Load outcomes.html.
**Expected:** `window.__pwned` undefined, no `<img>` inside `#tableWrap`.
**Actual:** `window.__pwned === 1`. `tracker.html:423` has the identical `data-edit="${c.id}"` (confirmed by inspection; not separately exercised by a test).

Lower reachability than defect 2 — neither tool has a JSON import, so the vector is a crafted localStorage value or any other same-origin write.

**Fix:** `data-edit="${esc(e.id)}"` and `data-edit="${esc(c.id)}"`.

### 9. MEDIUM — Auth-cycle value interpolated into the case card without escaping
**`/home/user/test/cardinal-coverage/tracker.html:419`**

`<span class="cmeta">${esc(c.status||"")} · ${c.cycle||3}-day cycle${exp}${ord}</span>` — status, order and notes go through `esc()`; `c.cycle` does not.

**Repro:** seed a case whose `cycle` is the string `3<img src=x onerror="window.__pwned=1">`. Load tracker.html.
**Expected:** `window.__pwned` undefined, 0 injected nodes under `#cases`.
**Actual:** `window.__pwned === 1`.

**Fix:** normalise on read the way `clocksFor()` already does at `:337` — `const cyc = Number.isFinite(+c.cycle) && +c.cycle > 0 ? +c.cycle : 3;` — and interpolate `cyc`. The render path is simply inconsistent with the clock path.

### 10. MEDIUM — When the two QIO clocks differ, the notice-printed date is replaced by a duplicate
**`/home/user/test/cardinal-coverage/tracker.html:332-341`**

**Repro:** `clocksFor({ covered: <today+10>, nomnc: <today+4>, cycle:3, lead:1 })` — NOMNC delivered 6 days before the effective date.
**Expected:** two distinct noon clocks — delivery+1 (`today+5`) driving urgency, and effective-1 (`today+9`, the date printed on the paper notice) shown quietly for cross-check.
**Actual:** both noon clocks read `today+5`. `qio` at `:334` already resolves to `byDelivery` when it is earlier, and the secondary push at `:339` emits `byDelivery` again. The effective-1 date appears nowhere on the card.

The page's own Reference section says "The tracker computes this, and cross-checks it against the 42 CFR 422.626 clock" — in exactly the early-delivery case where the discrepancy matters, the cross-check is lost and the same date prints twice, reading like a rendering glitch.

**Fix:** make the secondary row show whichever clock was *not* chosen: emit `{ lab: qio === byDelivery ? "— as printed on NOMNC" : "— 422.626, from delivery", date: qio === byDelivery ? byEffective : byDelivery, days: diffD(...), noon:true, quiet:true }`.

### 11. MEDIUM — Counsel-review warning loses its critical styling; `--crit`/`--crit-bg` undefined
**`/home/user/test/cardinal-coverage/appeal-letters.html:93`** (tokens missing from `:11-18`)

**Repro:** open appeal-letters.html in Chromium. The second `p.phi` sets `style="background:var(--crit-bg);border-color:var(--crit)"` with an inner `<b style="color:var(--crit)">`, but neither token is defined anywhere in this file — it is the only page that uses them and the only page that omits them (`index.html:13`, `outcomes.html:12`, `rules.html:12`, `tracker.html:12` all define them).
**Expected:** critical red palette — `--crit:#B23A3A` / `--crit-bg:#F6E1DE` light, `#E07B6E` / `#3a1d1a` dark.
**Actual:** `getComputedStyle(documentElement).getPropertyValue('--crit') === ''`; the callout computes to `backgroundColor rgba(0,0,0,0)`, `borderTopColor rgb(23,35,63)` (= `--ink`) and bold `--ink` text. The routine PHI notice directly above it does get its amber `--warn-bg`, so the most legally consequential warning on the page (standing under 42 CFR 422.574, expedited handling under 422.584(c)(2)) is the least prominent block on it.

**Fix:** add `--crit:#B23A3A;--crit-bg:#F6E1DE;` to `:root` and `--crit:#E07B6E;--crit-bg:#3a1d1a;` to both the `@media (prefers-color-scheme:dark)` block and `:root[data-theme="dark"]`, copying the palette from the sibling pages. Note `#saveWarn` in tracker.html uses the same tokens and *is* defined there — only this file is missing them.

### 12. MEDIUM — `rules.html` filter bar: five controls with no accessible name
**`/home/user/test/cardinal-coverage/rules.html:120-133`**

**Repro:** inspect the `.filters` block — four `<select>` (`#fPlanSel`, `#fStateSel`, `#fTypeSel`, `#fFreshSel`) and one `<input type="search">` (`#fSearch`). None has `label[for]`, `aria-label` or `title`; the only naming is a decorative `<span class="lbl">Filter</span>` associated with nothing.
**Expected:** a screen reader announces "Plan, combobox" / "Freshness, combobox" / "Search rules, search".
**Actual:** five anonymous comboboxes in a row. The dialog form in the same file is fully labelled (`:149-182`), so this reads as an oversight, not a design choice — and the filter bar is the primary way the registry is driven.

**Fix:** `aria-label="Filter by plan"` / `"Filter by state"` / `"Filter by rule type"` / `"Filter by freshness"` / `"Search rules"`. (`aria-label` preserves the current pill layout; a visually-hidden `<label for>` also works.)

### 13. MEDIUM — An emptied registry resurrects the eight seeded rules on reload
**`/home/user/test/cardinal-coverage/rules.html:263`**

`if (!rules.length) { rules = SEED.map(...); save(); }`

**Repro:** open rules.html with `cc-rules-v1 = []` — the exact state Delete leaves after the last rule is removed. Equivalent user flow: delete every rule, refresh.
**Expected:** an explicitly stored empty array is a user decision; the registry stays empty.
**Actual:** 8 `article.rule` elements and 8 records written back to storage, including any seeded rule the facility deleted on purpose — re-badged "fresh" and "confirmed by research".

**Fix:** distinguish a missing key from an empty array — `const raw = localStorage.getItem(KEY); if (raw === null) { rules = SEED.map(r => ({id:uid(), history:[], ...r})); save(); } else { try { rules = JSON.parse(raw) || []; } catch { rules = []; } }` — i.e. drop `!rules.length` as the seeding trigger.

### 14. LOW — Future-dated / unreadable filings are flagged as excluded yet still inflate pending
**`/home/user/test/cardinal-coverage/outcomes.html:241`**

**Repro:** seed a single event `{type:"Appeal filed — QIO", date: today+365}`, select "All time".
**Expected:** pending reads 0 — the footer says "Future-dated or unreadable entries are excluded from every total and flagged", and the `inPeriod` comment calls a future date "a typo, not data".
**Actual:** the page simultaneously renders "Excluded from every total = 1" and "Appeal win rate — · 0W · 0L · 1 pending". The per-case loop at `:241` iterates the raw `events` array with no date validity check, unlike every other total which goes through `inPeriod()`/`parseD()`. The same hole lets `"not-a-date"` count toward pending and `orphanDecisions`.

**Fix:** `for (const e of events){ const d = parseD(e.date); if (!d || diffD(today(), d) < 0) continue; … }` — still spanning all periods, but excluding the rows the banner already flags.

### 15. LOW — Plan grouping can render a STALE rule below a fresh one
**`/home/user/test/cardinal-coverage/rules.html:319`**

**Repro:** seed Alpha MA (stale) + Alpha MA (fresh) + Bravo MA (stale). The global sort at `:309-313` correctly yields `[Alpha-stale, Bravo-stale, Alpha-fresh]`, then `:319` re-groups by plan into `Alpha:[stale,fresh]`, `Bravo:[stale]`.
**Expected:** `STALE | STALE | fresh` — no rule badged STALE below one badged fresh or due.
**Actual:** `STALE | fresh | STALE`. Any plan holding a mix pushes its fresh entries above another plan's stale one. Reachable with the shipped seed as soon as one of the five "All Medicare Advantage" federal rules is re-confirmed while the others lapse, since that plan sorts alphabetically ahead of "WellCare Medicare Advantage".

**Fix:** order the groups by the worst rank they contain — `Object.entries(groups).sort((a,b) => Math.min(...a[1].map(r=>rank[freshness(r).k])) - Math.min(...b[1].map(r=>rank[freshness(r).k])))` — or drop per-plan grouping when a freshness filter/ordering is in force.

### 16. LOW — Plan name and plan appeals fax persist despite the "only facility letterhead" disclosure
**`/home/user/test/cardinal-coverage/appeal-letters.html:175`**

`const FACKEYS = ["fFac","fPhone","fAddr","fPrep","fTitle","fFax","fNPI","fPlan","fPlanFax"];`

**Repro:** fill every field including "Plan name" and "Plan fax / appeals address" (both under `<legend>Plan &amp; case</legend>`), then read `localStorage['ma-appeal-facility']`.
**Expected:** only the fields inside the `<legend>Facility (saved)</legend>` fieldset — per `:91` ("Only your facility letterhead details persist") and README.md:228-229.
**Actual:** the stored object contains `fPlan` and `fPlanFax`; reload prefills the plan name from the previous case. On a shared workstation the next user opens the tool with the prior resident's payer and appeals fax already filled in. No individually identifying data leaks — hence low — but the persistence disclosure is inaccurate, and the privacy lane confirms all 13 genuine PHI fields *are* correctly cleared.

**Fix:** drop `"fPlan","fPlanFax"` from FACKEYS, or move those two inputs into the "Facility (saved)" fieldset if durable payer contacts are intended.

### 17. LOW — `tracker.html` prints the tool nav strip; outcomes and rules hide theirs
**`/home/user/test/cardinal-coverage/tracker.html:99`**

`header.top{position:static;} .btn,.phi,details.ref,.chead .spacer{display:none!important;}` — `header.top` is never hidden, so `nav.toolnav` survives. `outcomes.html:96` and `rules.html:93` both start their print block with `header.top{display:none!important;}`.

**Repro:** `emulateMedia({media:"print"})` on tracker.html — `nav.toolnav` visible; `#printBtn`, `#themeBtn`, `p.phi` correctly hidden.
**Expected:** no dead navigation on a printed caseload.
**Actual:** four useless links, with the `aria-current` link rendering as a solid brand-red block (`.toolnav a[aria-current]{background:var(--brand);color:#fff}`) — a wasted ink slab atop every printout.

**Fix:** add `.toolnav{display:none!important;}` to the existing list on `:99`. Do *not* hide `header.top` wholesale here — the tracker's `h1` is a useful printed title, which is why the other two pages' approach would be a regression on this one.

---

## Claimed defects not reproduced

**None.** All 19 claims reproduce against the current code at the line numbers cited. One clarification:

- **"Delete is a no-op" appears twice** — filed independently by `tracker-state` (as two defects: delete + demo) and by `e2e-tracker` (as one combined defect). Same root cause, same fix, counted once above as defect 1. The independent rediscovery is corroborating evidence that it is a product bug rather than a test artifact.

Three claims that lanes explicitly *declined* to file were also checked and are correctly not defects: the `rules.html` source-link guard `/^https?:\/\//i` is properly anchored (`javascript:` and `data:` sources render as escaped text, verified by 18 passing escaping tests); `esc()` is a correct five-character escape with no double-escaping; and the synchronous `URL.revokeObjectURL` after `a.click()` does not abort downloads in Chromium.

---

## Coverage gaps

**Untested pages.** `index.html` and `one-pager.html` have zero tests of any kind. `investors.html` appears only in the print lane (2 assertions). Three of the seven shipped HTML files are effectively unverified.

**The cross-tab merge itself.** No lane opens two browser contexts against the same origin. The `save()` merge exists solely to reconcile concurrent tabs, and nobody tested that it works for its intended purpose — only that it breaks delete. Its actual correctness (last-write-wins on a conflicting edit, ordering, id collisions) is unknown.

**Import/export round-trips beyond the happy path.** `rules.html` import is covered for one clean round-trip and one XSS payload; untested are partial/malformed records, records missing `history`, and the `Object.assign` id-collision overwrite. `tracker.html` has Export but **no Import at all** — exported caseloads cannot be restored through the UI, which is itself a product gap no lane flagged.

**Event mutation on outcomes.** Only the add path is exercised. Editing and deleting a logged event — including whether outcomes' `save()` has the same merge hazard as tracker's (it does not; it writes directly, so delete there presumably works) — is unverified.

**Single browser, single engine.** Everything runs in Chromium at `/opt/pw-browsers/chromium-1194`. No Firefox or WebKit, so `<dialog>` behaviour, `history.replaceState` over `file://`, focus restoration on Escape, and download interception are all validated on exactly one engine.

**A11y depth.** The lane checks accessible names, one-hot `aria-pressed`, `aria-current`, initial dialog focus and Escape. It does not measure contrast ratios, test focus *trapping* inside open dialogs, verify `prefers-reduced-motion`, or run a real screen reader / axe-core sweep.

**Deliberately skipped interactions.** The Copy button (clipboard permissions), `window.print()` itself, and `appeal-letters` Download .txt were all verified manually but excluded from the suite as environment-dependent.

**Known-but-unwritten.** Two lanes documented reachable issues without red tests: `Object.prototype` pollution via a case id of `__proto__` or `constructor` corrupting the outcomes pending tally (bare object literal at `outcomes.html:242`), and non-padded ISO dates (`"2026-8-15"`) rendering in the table but missing the streak set. Also unasserted: the outcomes table prints Days/Dollars for rows the totals deliberately exclude (`:318-319`), so rows visibly do not sum to the cards; and the "Due within 2 days" tracker stat (`min <= 2`) double-counts cases the "Overdue" tile counts separately.

**Time and scale.** The midnight/noon `scheduleRollover()` timer is never exercised. No storage-quota or large-caseload performance testing — the DST/leap-year arithmetic is well covered, but nothing checks behaviour at 500 cases or against a full localStorage.