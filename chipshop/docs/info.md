# CARD-1

## How it works

CARD-1 is a hex counter with a display driver and a PWM channel:

- A tick generator divides the input clock down to a human-visible rate.
  The two speed-select inputs right-shift the divider, so each speed step
  doubles the count rate.
- A 4-bit counter steps 0-F on each tick (unless paused) and wraps.
- A combinational decoder drives a standard 7-segment digit (segments a-g,
  active high) from the counter value.
- A triangle-wave phase accumulator sets the duty cycle of an 8-bit PWM,
  producing a "breathing" LED on the eighth output pin. The breath rate
  tracks the speed setting.

## How to test

1. Hold both speed inputs low and pause low. After reset the display shows
   `0` and counts up about twice a second at the default 10 MHz clock.
2. Raise the pause input — the digit freezes; lower it and counting resumes.
3. Set speed to 1, 2, or 3 — the count rate doubles each step.
4. Watch the PWM pin with an LED: it fades up and down continuously.

## External hardware

A common-cathode 7-segment display on `uo[6:0]` (with current-limiting
resistors) and an LED on `uo[7]`.
