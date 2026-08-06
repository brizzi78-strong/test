# Drug Discovery — a cheminformatics workbench

A self-contained tool for the front of the small-molecule drug discovery
pipeline: register the biological **target** you want to hit, **design**
candidate molecules as physicochemical property profiles, score their
**drug-likeness** live against the published medicinal-chemistry rules, record
**screening** potencies, and **rank** the survivors so you advance the best
ones first.

This is the software a computational chemistry team uses to triage designs —
the equivalent of a descriptor calculator (RDKit) plus a rule-filter panel
(SwissADME-style) plus a lightweight project tracker — wrapped in one console.

## Scope, honestly

This matters, so it's stated plainly:

- **It reasons about molecules as numbers, not recipes.** A compound here is a
  name, an optional SMILES *label* (stored verbatim, never parsed into a
  structure), and a descriptor profile: molecular weight, logP, hydrogen-bond
  donors/acceptors, rotatable bonds, topological polar surface area, aromatic
  rings. Those are the standard, openly published descriptors every
  cheminformatics toolkit computes.
- **It is not a synthesis planner and holds no lab procedures.** Nothing in
  this tool tells you how to *make* a molecule — no reagents, no routes, no
  conditions. It answers a different question: *does this proposed molecule
  look like a viable oral drug candidate, and how does it stack up against the
  others?* "Create" here means registering a candidate design as data.
- **The rules are the textbook ones.** Lipinski's Rule of Five (MW ≤ 500,
  logP ≤ 5, HBD ≤ 5, HBA ≤ 10, one violation tolerated), Veber (rotatable
  bonds ≤ 10, TPSA ≤ 140), and a tighter lead-likeness filter. The
  developability score is a simple, monotonic heuristic over those windows, so
  a chemist can predict how a proposed tweak moves the number.

## What it does

- **Targets.** Register the enzyme / receptor / channel / other biomolecule a
  program is trying to modulate, with a free-text mechanism note.
- **Design a candidate.** Enter a descriptor profile and watch the
  drug-likeness verdict update live as you change the numbers — the "what if I
  shave 40 g/mol and a logP unit off?" loop. Register the design when you like
  it; new candidates enter the pipeline at the `hit` stage.
- **Drug-likeness scoring.** `drugLikeness` returns each rule's pass/fail with
  the specific breaches, a 0–100 developability score, and a one-word verdict
  (`excellent` / `good` / `marginal` / `poor`).
- **Screening.** Record how potent a compound was against a target
  (`IC50` / `EC50` / `Ki` / `Kd`, in nM — lower is more potent). `pPotency`
  converts nM to the familiar −log10 molar scale (1 nM → 9.0).
- **Ranking.** `rankForTarget` fuses the best recorded potency with
  drug-likeness into one ordered "advance these first" list for a target;
  validated hits sort ahead of untested designs, and discontinued candidates
  drop out.
- **Pipeline.** Advance a candidate one stage at a time —
  `hit → lead → candidate → preclinical → phase 1 → phase 2 → phase 3 →
  approved` — or discontinue it. The state machine rejects skips.

## A worked example: Parkinson's disease

To see the whole loop with real molecules, load the built-in **Parkinson's
disease** program — a target of **MAO-B** (the enzyme whose inhibition
preserves dopamine in the Parkinsonian brain) seeded with the marketed MAO-B
inhibitors **rasagiline**, **selegiline**, and **safinamide** (each with an
illustrative potency), plus **levodopa**. Descriptor values are the standard
published figures.

Rasagiline — small, clean, and the most potent seeded screen (14 nM) — tops
the ranking against MAO-B. Levodopa is the instructive one: it *passes* the
Rule of Five and scores respectably, yet is famously poorly absorbed passively
(it crosses the gut and blood–brain barrier on an active amino-acid
transporter and is co-dosed with carbidopa) — a reminder that drug-likeness
filters don't catch everything.

Load it from the setup screen's **"Load the Parkinson's disease demo"** button,
or over the API:

```bash
curl -X POST http://localhost:4970/api/demo/parkinsons
```

## Run it

```bash
npm start                                          # PORT default 4970 (in-memory store)
DRUGDISCOVERY_DB=/path/data.db npm start           # durable SQLite
DRUGDISCOVERY_USER=admin DRUGDISCOVERY_PASSWORD=… npm start   # gate the console
npm test
npm run typecheck
```

Open `http://localhost:4970`. Name a program, add a target, design a candidate
(the live score updates as you type), then record a screen and open the
Ranking tab.

## HTTP API

| Method & path | Purpose |
|---|---|
| `GET /health`, `GET /api/meta` | Liveness; status. |
| `POST /api/demo/parkinsons` | Seed the Parkinson's / MAO-B worked example (program + target + molecules + screens). |
| `POST /api/programs` · `GET /api/programs` · `GET /api/programs/:id` | Discovery programs. |
| `POST /api/targets` · `GET /api/targets?programId=` · `GET /api/targets/:id` | Biological targets. |
| `GET /api/targets/:id/ranking?limit=` | Candidates ranked against this target (potency + drug-likeness). |
| `POST /api/compounds` · `GET /api/compounds?programId=&targetId=&stage=` · `GET /api/compounds/:id` | Candidate molecules; each carries a live `drugLikeness` view. |
| `POST /api/compounds/:id/advance` | Move a candidate to the next pipeline `stage` (or `discontinued`). |
| `POST /api/evaluate` | Score a descriptor profile without persisting it (the "what if" tool). |
| `POST /api/screens` · `GET /api/screens?compoundId=&targetId=` | Screening potencies. |

## A note on data

This is demonstration scaffolding, not a validated informatics system. A
program's target list and candidate structures are proprietary IP, so gate the
console (`DRUGDISCOVERY_USER` / `DRUGDISCOVERY_PASSWORD`) in any real
deployment. The descriptor-to-drug-likeness scoring is a teaching-grade
heuristic over published rules — it is a triage aid, not a substitute for a
validated ADMET model or a medicinal chemist's judgment.
