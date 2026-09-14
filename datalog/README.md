# LogWerks — ECU datalog analyzer

Drop in a datalog from a flashed BMW or Mercedes (or any car) and get a fast,
honest read on whether the tune is **safe**: knock/timing pulled, boost vs.
target, lean spots under load, and intake heat soak. It runs entirely in your
browser — the log is read locally and **never uploaded**.

This is the software a tuner actually uses after a flash. It **reads and
analyzes logs** — it does not flash, modify, or connect to any vehicle.

## What it does

1. **Load a CSV** — drag/drop or browse. Works with MHD, bootmod3, JB4, or any
   CSV with a header row. It auto-detects the delimiter (comma / semicolon /
   tab) and skips a units row if there is one.
2. **Auto-maps channels** — RPM, throttle/pedal, boost (actual & target),
   ignition timing, timing correction/knock, lambda/AFR, and intake air temp.
   Any mapping you disagree with is a dropdown you can fix; analysis updates live.
3. **Normalizes units** — boost in kPa-absolute or bar-absolute is converted to
   gauge **psi**; **AFR** (e.g. 12.6) is converted to **lambda** using gas
   stoichiometry. So logs from different tools read the same way.
4. **Finds the WOT pulls** — isolates each wide-open-throttle pull so you're
   judging the tune where it matters, not at idle.
5. **Flags problems** with conservative defaults you can tune:
   - **Knock** — timing pulled beyond a threshold during WOT (the single most
     important safety signal).
   - **Boost vs. target** — overshoot (boost control) or undershoot (leak / weak
     wastegate / fuel-cut).
   - **Lean under load** — lambda leaner than your target while on boost.
   - **Heat soak** — high intake air temps that raise knock risk.
6. **Charts each pull** — RPM, boost/target, timing, timing-correction, lambda,
   and IAT on one plot (x-axis = RPM). Toggle channels in the legend; hover for
   exact values.

Try **"Try a sample log"** to see it work with no file — it generates a
realistic two-pull log (one clean, one with knock and heat soak).

## Thresholds

The defaults (WOT ≥ 92%, knock flag at 1.5° pulled, lean flag at λ 0.90) are
starting points, editable at the top of the analysis. A single knock or lean
sample is a reason to *look at the data*, not to panic — the tool points you at
the moment in the log, it doesn't make the tuning decision for you.

## Honesty / limits

- It **does not connect to a car** and cannot flash or change anything.
- It does not estimate crank/wheel horsepower — that needs vehicle weight,
  drivetrain loss, and a known road/dyno load, and a faked number helps no one.
- It's an **analysis aid for a qualified tuner**, not a guarantee an engine is
  safe. Bad data in (mis-mapped channel, sparse log) means bad flags out — check
  the channel mapping if a finding looks wrong.

## Use it

Open `index.html` in any browser — no build, no dependencies, works offline.

## How it's built

One file: HTML + CSS design tokens (light/dark) + vanilla JavaScript. CSV
parsing, channel auto-mapping, unit normalization, WOT-pull detection, the
findings engine, and the canvas chart are all in-page. No frameworks, no
external assets, no network calls.
