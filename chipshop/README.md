# Chipshop — making a physical chip

This directory is the first real step toward having a chip of our own design
manufactured in silicon. It contains **CARD-1**, a small ASIC design in
[Tiny Tapeout](https://tinytapeout.com) format: a hex counter driving a
7-segment display, with speed/pause controls and a breathing-LED PWM output.

It's deliberately simple — the point of a first tapeout is to get through the
whole pipeline (design → verify → submit → receive packaged silicon), not to
be clever.

## What's here

| File | Purpose |
|---|---|
| `src/tt_um_brizzi_card1.v` | The chip design (Verilog RTL) |
| `test/tb.v` | Self-checking simulation testbench |
| `info.yaml` | Tiny Tapeout project metadata and pinout |
| `docs/info.md` | Datasheet page required by Tiny Tapeout |

## Run the simulation

```sh
sudo apt-get install iverilog   # once
cd chipshop
iverilog -g2012 -o card1_tb src/tt_um_brizzi_card1.v test/tb.v
vvp card1_tb                    # prints ALL TESTS PASSED
```

The testbench checks reset behavior, counting, the pause input, the speed
doubling, the F→0 wrap, all sixteen 7-segment decode patterns, and that the
PWM output actually toggles.

## The path from this code to a physical chip

1. **Verify in simulation** — done, above.
2. **Optional dry run on an FPGA** (~$40-90 for an iCE40 or Tang Nano board)
   to see it drive a real display before committing to silicon.
3. **Submit to a Tiny Tapeout shuttle** (tinytapeout.com). Your design shares
   a wafer with a few hundred others; the standard flow is: fork their
   template repo, drop in `src/`, `info.yaml`, and `docs/info.md`, and their
   CI hardens the RTL to a physical layout (GDSII) automatically.
   Cost is roughly **$50-300** per slot depending on the shuttle.
4. **Wait for fabrication** — typically several months at a real foundry
   (SkyWorks/SkyWater-class 130 nm process).
5. **Receive your chip** mounted on their demo/dev board, pins wired exactly
   as declared in `info.yaml`.

## Can you make money on this?

Directly, no — a $50-300 shuttle slot for a hobby counter chip is tuition,
not inventory. The realistic monetization paths this unlocks:

- **Skills and credibility.** "I have taped out silicon" is a rare line on a
  resume and the chip industry pays accordingly.
- **Products, not chips.** Individuals make money selling *boards and
  devices* (badges, synthesizer modules, dev boards) that use chips — the
  custom-silicon version of that only pencils out at real volume via a
  proper ASIC run (tens of thousands of dollars NRE).
- **Content and teaching.** The journey from zero to packaged silicon is
  genuinely good material; few people have done it.

The cheap, immediate follow-up is step 2: an FPGA board runs this exact
Verilog tonight for under $100.
