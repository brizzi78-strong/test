# CarSync — vehicle software updates in a few taps

A single, self-contained web page that walks through the **over-the-air (OTA)
software update** experience for a car: pick your vehicle, check for updates,
review what's new, and install it — all in a few button clicks.

> ⚠️ **This is a demo / simulation.** CarSync does **not** connect to a real
> vehicle, VIN, or manufacturer server. It uses sample fleet data to show what
> the update flow *looks and feels* like, including the safety checks a genuine
> OTA system enforces. It cannot flash, modify, or interact with any real car.

## What you do

1. **Pick your vehicle** from the fleet dropdown. CarSync shows the currently
   installed version of each software module (infotainment, driver assistance,
   battery management, powertrain, climate).
2. **Check for updates** — one button. CarSync compares installed versions to
   the latest catalog and lists what's available, each with release notes, a
   download size, and a severity tag (**Safety**, **Recommended**, **Optional**).
3. **Pass the safety gate.** Before it lets you install, CarSync verifies the
   same preconditions a real OTA updater requires:
   - transmission **in Park**,
   - **battery ≥ 50%**,
   - a **Wi-Fi** connection,
   - enough **storage** for the download.
   If anything fails, install is blocked until it's resolved (re-check to
   resimulate the vehicle's state).
4. **Download & install all** — one button. A staged progress view runs through
   *Downloading → Verifying signature → Installing to ECU → Restarting modules*,
   with a reminder to keep the vehicle parked and powered.
5. Done. Installed versions advance, and the update is added to your **history**.

## Why the safety gate matters

Real vehicle updates aren't just a download. Flashing an ECU (electronic control
unit) mid-drive, on a low battery, or with an interrupted transfer can leave a
module in a bad state. So real systems refuse to start unless the car is parked,
has enough charge, and can complete the transfer — and they verify a
cryptographic **signature** before writing anything. CarSync mirrors that flow so
the demo is honest about what a "few buttons" update actually involves.

## Privacy

Everything runs in your browser. Your selected vehicle, advanced versions, and
update history live in `localStorage` **on this device** — no account, no server,
no network calls. Clearing your browser data resets it.

## Use it

Open `index.html` in any browser — no build, no dependencies, works offline.

## How it's built

One file: HTML + CSS custom-property design tokens (light/dark, matching the
Cardinal HR palette family) + vanilla JavaScript. A small in-page `CATALOG`
holds the "latest" versions and release notes; `FLEET` holds sample vehicles and
their installed versions. The real-world vehicles carry a `names` map that
overrides the generic module labels with each brand's actual system names
(e.g. the Nissan Sentra shows *NissanConnect Infotainment* and *Safety Shield
360 / ProPILOT Assist*; the Toyota RAV4 shows *Toyota Safety Sense 2.0*; the
Lexus RX shows *Lexus Safety System+ 2.0*). Preconditions are randomised per
check to make the safety gate feel real. No frameworks, no external assets.

The version numbers themselves remain illustrative sample data — manufacturers
don't publish per-module OTA version strings — so the demo reads true-to-life
without claiming to be a real vehicle connection.
