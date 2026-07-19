# Cardinal Projects Workspace

This repository holds several projects. Jump to the one you need:

| Project | Where | What |
|---|---|---|
| **The Cardinal's Toolkit — iPhone app** | `CardinalPress/` + `CardinalPress.xcodeproj` | Companion app to the NC Family Caregiver Handbook ([below](#the-cardinals-toolkit--iphone-app)) |
| **The Cardinal's Promise / Toolkit book** | `cardinals-promise/` | Manuscript, samples, and marketing for the book |
| **CARD Token — Foundry/Hardhat skeleton** | `contracts/`, `test/`, `verification/` | Fixed-supply ERC-20 skeleton ([below](#card-token--foundryhardhat-skeleton)) |
| **HireCheck — background screening service** | `hirecheck/` | Standalone service for running FCRA-aware pre-employment background checks on new hires (see `hirecheck/README.md`) |
| **MyHR — new-hire paperwork service** | `myhr/` | Standalone onboarding service: e-signed new-hire forms (I-9, W-4, consent, etc.) with HR review and an audit trail (see `myhr/README.md`) |
| **Recruiting — job requisitions & applicant tracking** | `recruiting/` | Standalone ATS: post requisitions and move applications through a hiring pipeline; reaching `hired` hands off to screening + onboarding (see `recruiting/README.md`) |
| **Training — online training portal** | `training/` | Standalone LMS: customizable course catalog (e.g. Sexual Harassment Prevention), lesson tracking, and scored assessments (see `training/README.md`) |
| **Benefits — benefits election / enrollment** | `benefits/` | Standalone service: plan catalog with coverage tiers, dependents, elections/waivers, and computed monthly premiums (see `benefits/README.md`) |
| **Payroll — gross-to-net engine (Raleigh, NC)** | `payroll/` | Standalone withholding calculator: federal + NC-flat taxes, FICA, deductions, net pay, and employer taxes. Not filing-ready payroll (see `payroll/README.md`) |
| **Employee Directory — HRIS core** | `directory/` | Standalone system of record: employees, department tree, managers, employment status, and org-chart queries with cycle-safe invariants (see `directory/README.md`) |
| **Time Off (PTO)** | `timeoff/` | Standalone leave management: policies, accrual balances, and requests (pending → approved/denied/cancelled) with balance deduction and refund (see `timeoff/README.md`) |
| **Offboarding** | `offboarding/` | Standalone separation cases: a checklist (return equipment, revoke access, final pay, COBRA, exit interview…) with per-task done/N-A and derived status (see `offboarding/README.md`) |
| **Orchestrator — shared employee identity** | `orchestrator/` | The layer that makes "one employee record" real: a canonical company/person that cascades a hire into every service and records the id each assigned, so one record resolves everywhere (see `orchestrator/README.md`) |
| **Booking — scheduling & references** | `booking/` | Appointment scheduling for a service business (e.g. massage): services, workers, a live schedule with worker double-booking prevention, employment references, and masked vetting credentials (see `booking/README.md`) |
| **HomeSafe — in-home visit safety** | `homesafe/` | A private, offline single-page app for in-home service safety: vet who comes to your home, or (as a worker) share your plan and check in. No people-search; data stays on the device (see `homesafe/README.md`) |
| **Admin Portal — the usable HR app** | `portal/` | Single-page HR console (register a company, hire employees, see one record resolve into every service) backed by a backend-for-frontend that proxies to the orchestrator server-side, keeping credentials off the browser (see `portal/README.md`) |
| **Cardinal HR — platform website** | `cardinal-hr/` | Self-contained, cross-linked marketing site: Home (`index.html`), Features (`features.html`), Pricing (`pricing.html`), and Security (`security.html`) |
| **API Gateway** | `gateway/` | Authenticated front door: API-key auth, per-key rate limiting, and reverse-proxy routing to the services with an injected trusted tenant. Each service enforces that tenant (`src/api/tenancy.ts`) for real multi-tenant data isolation (see `gateway/README.md`) |
| **Deployment scaffolding** | `deploy/` | Run the gateway + all services + website together: `docker compose -f deploy/docker-compose.yml up --build` (see `deploy/README.md`) |

---

# The Cardinal's Toolkit — iPhone App

The companion app to **_The Cardinal's Toolkit: The North Carolina Family Caregiver Handbook_** by Rob Brizzi — practical tools to help you stay organized and prepared while caring for an aging parent.

The cardinal is North Carolina's state bird: it stays through every winter. So do caregivers.

Everything is private and offline: no account, no network, no analytics. Journal entries, mood check-ins, and checklist progress never leave the device.

## The four pillars, as tabs

### Today
- A **daily reflection** written for caregivers — encouragement that changes each day.
- A **mood check-in** ("How is your heart today?") from *Struggling* to *Peaceful*, with a last-7-days strip.
- The living cardinal mascot (he breathes, blinks, and flicks his tail) and quick links to the tools.

### Checklists — *Planning & Checklists*
Interactive checklists with progress saved on-device:
- **The Essential Documents** — POA, health care POA, advance directive (with NC witness/notary notes), HIPAA, will, "where everything is" sheet
- **Home Safety Walkthrough** — the afternoon of fixes that prevents the big fall
- **Medical Information Kit** — the folder that travels to every appointment
- **Hospital Discharge Day** — taming health care's most dangerous handoff

### Tools — *Practical Tools*
For the caregiver's own heart:
- **Breathe** — guided breathing (in 4 · hold 4 · out 6) with an animated circle
- **Come Back to Now** — the 5-4-3-2-1 grounding exercise
- **Gentle Words** — 16 affirmations written for caregiving's hardest days

### Journal
Private entries with mood, optional title, and caregiver-specific starter prompts ("What do I need to ask for help with?"). Edit, swipe-to-delete; persisted via `UserDefaults`.

### Resources — *Support & Resources*
- **When you need help now**: Eldercare Locator, NC 211, Alzheimer's Association 24/7 Helpline, 988
- **North Carolina**: Division of Aging & Adult Services, SHIIP Medicare counseling, Project C.A.R.E., Adult Protective Services
- **National**: Family Caregiver Alliance, AARP Caregiving, VA Caregiver Support, Medicare.gov
- **Gentle reading**: five in-app articles — caregiver burnout, the essential paperwork, home safety, talking with your parent about help, and when it's time for more care
- **About** — the book, the bird, the privacy promise, and a clear "not medical/legal advice" note

## Requirements

- Xcode 16 or later
- iOS 17.0+ deployment target, iPhone only

## Running the app

1. Open `CardinalPress.xcodeproj` in Xcode.
2. Select an iPhone simulator (or a device with your signing team set on the target).
3. Build and run (⌘R). There are no external dependencies.

CI builds the app on a macOS runner on every push (`.github/workflows/ios-build.yml`) and uploads the simulator `.app` bundle as a workflow artifact.

## Architecture

```
CardinalPress/
├── CardinalPressApp.swift      # App entry point; injects the shared store
├── Models/
│   └── Models.swift            # Mood, JournalEntry, MoodCheckIn, Reflection, Article, SupportResource, Checklist
├── Data/
│   ├── CompanionStore.swift    # ObservableObject: journal, check-ins, checklist progress (all persisted)
│   └── SeedData.swift          # ALL content: reflections, affirmations, prompts, articles, checklists, resources
├── Support/
│   └── Theme.swift             # Cover palette: cardinal red, navy, gold, cream
└── Views/
    ├── ContentView.swift       # Root TabView (Today · Checklists · Tools · Journal · Resources)
    ├── TodayView.swift         # Reflection, mood check-in, week strip, quick tools
    ├── ChecklistsView.swift    # Progress rings, item toggles, per-list reset
    ├── ToolsView.swift         # Tool cards + care disclaimer
    ├── BreathingView.swift     # Animated guided breathing
    ├── GroundingView.swift     # 5-4-3-2-1 walkthrough
    ├── AffirmationsView.swift  # Swipeable affirmation deck
    ├── JournalView.swift       # Entry list + editor sheet with prompts
    ├── ResourcesView.swift     # Urgent / NC / national resources + articles
    ├── AboutView.swift         # The book, the bird, privacy, disclaimer
    └── CardinalMark.swift      # Code-drawn cardinal emblem + LivingCardinal animation
```

All content lives in `SeedData.swift` — reflections, checklists, articles, and resource links can be edited there without touching any view code, which makes syncing the app with new editions of the workbook a one-file change.

## A note of care

This app supports organization and caregiver self-care. It is not medical, legal, or financial advice. In an emergency call 911; for local aging services anywhere in the US call the Eldercare Locator at 1-800-677-1116, or dial 2-1-1 in North Carolina.

---

# CARD Token — Foundry/Hardhat Skeleton

[![verify-claims](https://github.com/brizzi78-strong/test/actions/workflows/verify.yml/badge.svg)](https://github.com/brizzi78-strong/test/actions/workflows/verify.yml)

A hybrid smart-contract project skeleton that works with **both** toolchains:

- **Hardhat 3** — TypeScript tests (`node:test` + viem) and Foundry-compatible
  Solidity tests, run together with a single command.
- **Foundry** — the same contracts and `.t.sol` tests run under `forge test`;
  `foundry.toml` and `remappings.txt` point forge at the npm dependency tree,
  so there is one set of dependencies for both tools.

The sample contract is `CardToken` (CARD), the fixed-supply ERC-20 described in
the token launch strategy (`TOKEN_LAUNCH_STRATEGY.md`): the full 250,000,000
supply is minted to the deployer at construction, with no mint function and no
pause/blocklist — supply can never change. `Ownable` is inherited solely so
that `renounceOwnership()` can be executed as a public, verifiable launch step
(see `LAUNCH_DAY_CHECKLIST.md`); no function is owner-gated, so ownership
grants no power even before it is renounced.

## Layout

```
contracts/CardToken.sol             # the token
contracts/CardToken.t.sol           # Foundry-style Solidity tests (forge-std)
contracts/CardTokenInvariants.t.sol # stateful fuzz/invariant suite (handler-based)
test/CardToken.ts                   # TypeScript tests (node:test + viem)
verification/claims.json            # launch-claims registry (claim → evidence)
scripts/verify-claims.mjs           # claims verifier (run via `npm run verify`)
docs/AI_VERIFICATION_GAP.md         # why the claims ledger exists, and the pattern behind it
ignition/modules/CardToken.ts       # Hardhat Ignition deployment module
hardhat.config.ts                   # Hardhat 3 config
foundry.toml + remappings.txt       # Foundry config (deps resolved from node_modules)
```

## Getting started

```bash
npm install
```

### Hardhat

```bash
npx hardhat test          # runs Solidity AND TypeScript tests
npx hardhat build         # compile
```

### Verify launch claims

Every trust claim made in `TOKEN_LAUNCH_STRATEGY.md` (no mint, no tax, no
blacklist, no pause, ownership grants no power, renounce works) is recorded in
`verification/claims.json` and mapped to executable evidence — ABI-level
structural checks, example tests, and stateful fuzz invariants:

```bash
npm run verify            # fails if any launch claim loses its backing
```

See `docs/AI_VERIFICATION_GAP.md` for the reasoning behind this setup.

### Foundry (optional)

With [Foundry](https://getfoundry.sh) installed, the same Solidity tests run
natively:

```bash
forge test
```

## Deployment

Deploy with Hardhat Ignition. RPC URLs and keys are supplied through the
[Hardhat keystore / configuration variables](https://hardhat.org/docs) —
nothing sensitive lives in the repo:

```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
npx hardhat ignition deploy ignition/modules/CardToken.ts --network sepolia
```

A `mainnet` network is pre-wired the same way (`MAINNET_RPC_URL`,
`MAINNET_PRIVATE_KEY`) for when the launch checklist in
`TOKEN_LAUNCH_STRATEGY.md` is ready to execute.
