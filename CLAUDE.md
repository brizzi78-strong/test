# CLAUDE.md

This repository is **not a software codebase**. It holds the working manuscript of a
book. Treat this as a **writing/editing project**: the deliverable is prose, and the
"build" step just assembles a Word document. Match the author's voice; don't refactor
his story.

## The book

**Title:** *The Cardinal's Promise — Lessons on Hospice and Living*
**Author / narrator:** Rob Brizzi (first-person memoir)
**Logline:** A man adopted out of Mexico City, who nearly died of addiction and got
sober, becomes a hospice liaison — and loses Lou, the adoptive father who chose him and
never stopped showing up. Framed by a red cardinal that lands on his car mirror on his
17th sober anniversary, 15 days after Lou's death.

## Canonical files

- **`The Cardinals Promise - draft <date>.docx`** — the **single source of truth** for
  the manuscript. The newest dated file is canonical. Read it with `python-docx`
  (see Workflow). When you finish a round of edits, save a new dated `.docx` and send it
  to the user.
- **`chapter-*.txt`** — plain-text drafts of chapters written/added in past sessions
  (condensed Ch. 4; new Ch. 10–12). Kept for provenance; the `.docx` is authoritative.
- **`scripts/build_manuscript.py`** — record of how the current draft was assembled from
  the original upload + the `chapter-*.txt` files. It is a **provenance record, not a
  re-runnable build** (it depended on an uploaded `.docx` that lives only in the
  ephemeral session). For new edits, edit the canonical `.docx` directly (see Workflow).

## Voice & style guide (match this — it matters more than anything)

- First-person memoir. Past tense with a reflective present-tense undertone.
- **Short, declarative sentences. Sentence fragments for emphasis.** ("He didn't have to.
  And he did anyway.")
- **Dialogue is rendered inline WITHOUT quotation marks.** e.g. `Lou said: we'll try it.`
  Keep this convention — do not add quote marks.
- Concrete, specific detail (brand names, places, exact numbers) over abstraction.
- Spiritual but never preachy. Honest about the ugliness; the narrator never lets himself
  off the hook.
- Recurring refrains — use sparingly, don't overuse: *"He didn't have to." "Love is a
  verb." "Presence is cumulative." "The disease does its math." "in the third row."*
- Chapters run ~1,500–2,500 words, often broken by **bold subsection headers**.
- **Do NOT route prose through AI-"humanizer" / detection-evasion services** (e.g.
  undetectable.ai). The author asked about this; the answer is to write in his authentic
  voice instead.
- Only write what the source material supports. When the user supplies a document
  (e.g. a screenshot), incorporate only what it actually shows — don't invent specifics.

## Facts bible (keep these consistent across chapters)

**Dates**
- Born 1978, Mexico City, as **Claudio Balderas**; adopted at 8 → **Robert Louis Brizzi**.
- **Sober: January 9, 2009.** 17th anniversary = **January 9, 2026** (the cardinal).
- County wrestling champion at **17**; HS record **81–18**.
- **Lou died Christmas Day, December 25, 2025**, age 83. Married Hope **April 9, 2019**.

**People**
- **Lou Brizzi** — adoptive father. Married mom ~1984, divorced 1996, later married
  **Lynda** (a nurse). Cancer dx spring 2015 (age 74), 8 yrs remission, stage-4 recurrence
  Jan 2024. Worked at Baptist Hospital until 83. The book's emotional center.
- **Becky / "Mom"** — birth mother; carried Rob and Chris out of Mexico; has Parkinson's.
- **Horacio** — birth father, Mexico City (charming, "slippery"); reunion in Ensenada.
- **Chris** — younger brother, best friend; wrestler (120–4); wife **Nisha**; daughter
  **Priya** (b. July 2025).
- **Hope** — wife; pharmacist; from Eclectic, Alabama (dad **Jeff** in Scottsboro, mom
  **Rhonda**, maiden name **Barger**). Dog: **Nola** (chihuahua).
- **Dave Meyer** — childhood best friend, NFL QB, missionary in China; **writing the
  foreword.**
- **"Diabetes Dave" = Dave Barger** — Novo Nordisk mentor in Panama City; distant Barger
  relative discovered via Rhonda's genealogy. (Ch. 26.)
- Recovery: sponsors **Andy**, **Jeff Major** (morning prayer call, every day),
  **Detroit Bob**, **Matt Campbell**; mentor **Quint Studer**.
- **Aunt Nancey** (late husband **Charlie**, died of addiction — Rob's first real loss);
  **Aunt Terry**; sister **Lisa** (keeps the Thanksgiving table); mom's partner **Gary**.

**Places/career**
- Woodridge → Ramsey, NJ (childhood); Miami University of Ohio (wrestling, Kappa Sigma).
- Abercrombie → Cintas → C.R. Bard (medical device); two DUIs (2002, 2006); first rehab
  Laguna Beach (court-ordered); bottom in **West Palm Beach**; Lou's **U-Haul** rescue.
- Home health at **Amedisys** (~10 yrs, President's Club ×4, manager **Brenda Jahn**) →
  **Novo Nordisk** → **hospice** in **Raleigh**. Condo nicknamed the **Salmon Palace**
  (Pensacola). Cardinal scene: Peak Resources SNF parking lot, Raleigh.

## Structure

Front matter → Prologue → **Chapters 1–27** (continuous) → closing essays
(*The Suit, The Table, What Grief Taught the Job, The Round Table*) → **Epilogue: The
Cardinal's Promise** → *What He Didn't Owe* / *Who Stays. Who Goes.*

Known open items a future session may be asked to address:
- Ch. 22 heading ("Wonderwoman") is a **placeholder title** — confirm/rename with the user.
- Watch for copy-paste duplicates when assembling (past drafts had a doubled Ch. 21 and a
  repeated paragraph in Ch. 5) and stray phone-clock artifacts (e.g. `11:28 AM`).

## Workflow

**Read the manuscript** (do this before editing — it's image-free, plain paragraphs):
```python
from docx import Document
d = Document("The Cardinals Promise - draft 4.13.2026.docx")
for p in d.paragraphs:
    print(p.text)
```

**Edit prose:** edit the specific paragraphs in the `.docx` via `python-docx`, or draft a
new chapter as a `.txt` and append/insert it with matching styles
(Title 26pt, H1 18pt bold + page break, H2 13pt bold, body Garamond 12pt, 1.15 spacing —
see `scripts/build_manuscript.py` for the exact styling used). **Always save to a new
dated filename** (`The Cardinals Promise - draft <M.D.YYYY>.docx`) and send it to the user.

**Reading image-based PDFs the user uploads** (genealogy/screenshots have no text layer):
render with PyMuPDF (`pip install pymupdf`), `page.get_pixmap(dpi=140).save(...)`, then
Read the PNG. If `cryptography`/`pdfminer` import errors appear, run
`pip install --force-reinstall cffi` first.

## Git / delivery conventions

- **Develop on branch `claude/book-writing-j8fb9v`.** Create it locally if missing.
- Commit each round with a clear message; **push with `git push -u origin <branch>`**
  (retry with backoff on network errors).
- **Do NOT open a pull request unless the user explicitly asks.**
- The user works in Microsoft Word — the `.docx` is the real deliverable. Send it with the
  file tool after each substantive round.
