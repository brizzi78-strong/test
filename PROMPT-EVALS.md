# PROMPT-EVALS.md

Evaluation suite for a **light-proofreading** prompt run against the working
manuscript *The Cardinal's Promise*.

The goal of the prompt under test is to catch genuine mechanical errors and
internal-continuity slips **without** rewriting the author's voice or flagging
deliberate stylistic choices. These evals encode both behaviors:

- **CATCH cases** — defects the prompt is expected to surface.
- **HOLD cases** — intentional style the prompt must leave alone (false-positive guards).

---

## How to run

For each case, give the model the manuscript (or the cited excerpts) plus the
proofreading prompt, then grade its output against the rubric below.

### Grading rubric (per case)

| Score | Meaning |
|-------|---------|
| **PASS** | CATCH: the specific defect is identified with correct location and a correct fix. HOLD: the passage is left untouched (not flagged). |
| **PARTIAL** | CATCH: defect noticed but wrong fix, wrong location, or buried/vague. HOLD: flagged but explicitly deferred to author as optional. |
| **FAIL** | CATCH: defect missed entirely. HOLD: passage rewritten or asserted as an error. |

### Suite-level pass criteria

- All **Severity: high** CATCH cases must PASS.
- No HOLD case may FAIL (zero rewrites of intentional style).
- ≥ 80% of all cases at PASS.

---

## CATCH cases (must surface)

### C1 — Name-change contradiction (first name vs last name)
- **Severity:** high (continuity)
- **Location:** Ch. 17 (The Basement) vs Ch. 31 (Top Bunk)
- **Defect:** Ch. 17 has Grandpa offer $100 to change the **first** name
  ("change your first name to mine. Robert"). Ch. 31 describes the same
  Tide-hat/basement moment as an offer to change the **last** name to Brizzi.
  Same event, contradictory detail. (Grandpa is Mama's father, so "Brizzi"
  could not be his name to give — the surname comes from Lou.)
- **Expected output:** flag the two passages as contradictory; note Ch. 17 reads
  as the intended version.

### C2 — Sober-count mismatch across one weekend
- **Severity:** high (continuity)
- **Location:** Ch. 38 (Global Grill) vs Ch. 39 (We?)
- **Defect:** Ch. 38 says "**Nine** years sober" (March 7, 2017); Ch. 39, the
  next morning, says "I was **eight** years sober."
- **Ground truth:** sober date Jan 9 2009 (one-year on Jan 9 2010; 17th
  anniversary Jan 9 2026; "ten years and three months" at the April 2019
  wedding) ⇒ **eight** is correct for 2017. Ch. 38's "Nine" is the slip.
- **Expected output:** flag "Nine years sober" as the error; state eight is correct.

### C3 — Age figures don't reconcile
- **Severity:** medium (continuity)
- **Location:** Ch. 33 ("thirty-two" at one-year, Jan 2010); Ch. 39 ("thirty-eight",
  March 2017); Ch. 30 ("forty-seven... in 2026").
- **Defect:** "32 in 2010" implies a 1977 birth; "38 in 2017" and "47 in 2026"
  imply ~1978–79. The Ch. 33 "thirty-two" is the outlier.
- **Expected output:** note the ages don't reconcile to one birth year and point
  at Ch. 33; defer the resolution to the author (these are real-life facts).

### C4 — "Awe" should be "Aww"
- **Severity:** high (spelling)
- **Location:** Ch. 39 (We?)
- **Defect:** Hope's line `"Awe. Look at that puppy."` — interjection should be
  **"Aww"** (cf. "awwww" in Ch. 9). "Awe" is the noun.
- **Expected output:** correct to "Aww".

### C5 — grey / gray inconsistency
- **Severity:** medium (spelling consistency)
- **Location:** Ch. 5 ("grey with a black collar") vs Prologue ("January gray")
  and Ch. 37 ("gray January sky").
- **Defect:** mixed British/American spelling of the same word.
- **Expected output:** flag the inconsistency; recommend standardizing (the
  single "grey" in Ch. 5 is the outlier).

### C6 — Chapter numbering gap
- **Severity:** medium (structure)
- **Location:** chapter headings — TWENTY (Charlie) → TWENTY-THREE (Ivory).
- **Defect:** chapters 21 and 22 are absent.
- **Expected output:** flag the missing numbers (note it may be intentional in a
  working draft, but should be confirmed).

### C7 — Coach name switch (Jonesy / Ronnie)
- **Severity:** medium (continuity / clarity)
- **Location:** Ch. 35 (Jonesy) vs Ch. 36 (Robby, No)
- **Defect:** the coach is "Jonesy" throughout Ch. 35, then "Ronnie" in Ch. 36,
  with no signpost they're the same man (Pinball Wizard / three-years-as-coach
  details confirm they are).
- **Expected output:** flag the unbridged name switch; suggest a signpost.

### C8 — "nonalcohol" phrasing
- **Severity:** low (usage)
- **Location:** Ch. 41 (Live Oak) — "nonalcohol drinks".
- **Defect:** nonstandard; "nonalcoholic" is the usual form.
- **Expected output:** suggest "nonalcoholic" as optional.

### C9 — "Sangria" capitalization
- **Severity:** low (style/usage)
- **Location:** Ch. 30 (Spanish Tavern) — "Sangria" capitalized twice.
- **Defect:** "sangria" is conventionally lowercase (though internally consistent).
- **Expected output:** raise as optional; acknowledge it's consistent within the chapter.

---

## HOLD cases (must NOT flag)

### H1 — "Cloudio" (intentional mispronunciation)
- **Location:** Ch. 7 — Grandpa says "Cloudio"; narration: "He cannot say my name
  the right way."
- **Why hold:** deliberate characterization, not a typo.

### H2 — Spanish dialogue with accents and inverted punctuation
- **Location:** Chs. 1, 11, 12, 13 — e.g. "¿Cuándo te voy a ver otra vez?",
  "Te extrañé, Papá.", "Sí, mi amor. Es como pijamas."
- **Why hold:** Spanish is correct (accents, inverted ¿). No "fix" warranted.

### H3 — "hiiii" / "Three i's worth of breath"
- **Location:** Chs. 38–39.
- **Why hold:** intentional phonetic rendering of Hope's voice.

### H4 — Wrestling slang ("duce is wild", "tip up")
- **Location:** Chs. 35–36.
- **Why hold:** in-world coach vocabulary, explicitly framed as "Jonesy words".

### H5 — Sentence fragments and `.  .  .` scene breaks
- **Location:** throughout.
- **Why hold:** the manuscript's deliberate prose rhythm and section-break device.

### H6 — "awwww" lowercase crowd sound
- **Location:** Ch. 9 — "The students go awwww."
- **Why hold:** intentional onomatopoeia (distinct from the C4 "Awe"/"Aww" fix).

### H7 — RAW MATERIAL / seed-content section
- **Location:** "RAW MATERIAL FOR TOMORROW — NOT YET A CHAPTER".
- **Why hold:** author's working notes, not finished prose; not subject to proofreading.

### H8 — Unusual but consistent proper names
- **Location:** "Aunt Nancey" (consistent throughout), "Mag", "Cozamano".
- **Why hold:** consistently spelled; not errors.

---

## Notes

- Severity tiers map to the suite-level criteria: **high** cases gate the suite;
  **medium/low** contribute to the 80% threshold.
- When the manuscript changes, re-anchor each case's quoted text and chapter
  reference before re-running.
