# Cardinal Projects Workspace

This repository holds several projects. Jump to the one you need:

| Project | Where | What |
|---|---|---|
| **The Cardinal's Toolkit — iPhone app** | `CardinalPress/` + `CardinalPress.xcodeproj` | Companion app to the NC Family Caregiver Handbook ([below](#the-cardinals-toolkit--iphone-app)) |
| **The Cardinal's Promise / Toolkit book** | `cardinals-promise/` | Manuscript, samples, and marketing for the book |
| **Cardinals Promise (CARD) token** | `contracts/`, `test/`, `verification/`, `cp17-site/` | Fixed-supply ERC-20 with a complete launch kit ([below](#cardinals-promise-card-token)) |
| **HireCheck — background screening service** | `hirecheck/` | Standalone service for running FCRA-aware pre-employment background checks on new hires (see `hirecheck/README.md`) |
| **Cardinal Verify — consent-based checks** | `verify/` | A working site for consent-first reference / employment / education verification: the candidate e-signs a disclosure, then each source confirms via a private link. No CRA vendor, no criminal/credit data. Employer console + candidate-consent + verifier pages (see `verify/README.md`) |
| **MyHR — new-hire paperwork service** | `myhr/` | Standalone onboarding service: e-signed new-hire forms (I-9, W-4, consent, etc.) with HR review and an audit trail (see `myhr/README.md`) |
| **Recruiting — job requisitions & applicant tracking** | `recruiting/` | Standalone ATS: post requisitions and move applications through a hiring pipeline; reaching `hired` hands off to screening + onboarding (see `recruiting/README.md`) |
| **Training — online training portal** | `training/` | Standalone LMS: customizable course catalog (e.g. Sexual Harassment Prevention), lesson tracking, and scored assessments (see `training/README.md`) |
| **Benefits — benefits election / enrollment** | `benefits/` | Standalone service: plan catalog with coverage tiers, dependents, elections/waivers, and computed monthly premiums (see `benefits/README.md`) |
| **Payroll — gross-to-net engine (Raleigh, NC)** | `payroll/` | Standalone withholding calculator: federal + NC-flat taxes, FICA, deductions, net pay, and employer taxes. Not filing-ready payroll (see `payroll/README.md`) |
| **Employee Directory — HRIS core** | `directory/` | Standalone system of record: employees, department tree, managers, employment status, and org-chart queries with cycle-safe invariants (see `directory/README.md`) |
| **Time Off (PTO)** | `timeoff/` | Standalone leave management: policies, accrual balances, and requests (pending → approved/denied/cancelled) with balance deduction and refund (see `timeoff/README.md`) |
| **Offboarding** | `offboarding/` | Standalone separation cases: a checklist (return equipment, revoke access, final pay, COBRA, exit interview…) with per-task done/N-A and derived status (see `offboarding/README.md`) |
| **Orchestrator — shared employee identity** | `orchestrator/` | The layer that makes "one employee record" real: a canonical company/person that cascades a hire into every service and records the id each assigned, so one record resolves everywhere (see `orchestrator/README.md`) |
| **Accounting — small-business bookkeeping** | `accounting/` | QuickBooks-style books: chart of accounts, customers, invoices (line items + tax) with a draft→open→paid/void lifecycle, payments, expenses, and P&L / A-R aging reports. Wired into the gateway and provisioned per company by the orchestrator (see `accounting/README.md`) |
| **TaxFile — simple online tax prep** | `taxfile/` | A TurboTax-style guided federal return without the sprawl: five plain-language steps, a live refund tracker, a tested 2025 Form 1040 engine (brackets, LTCG/qualified-dividend worksheet, SE tax + QBI, child tax credit, OBBBA standard deduction and SALT cap), and a mock e-file. Demo engine, not tax advice (see `taxfile/README.md`) |
| **Cardinal Rounds — leader rounding (Studer/Huron-style)** | `rounds/` | Self-hosted evidence-based leader rounding for healthcare teams: structured employee/patient rounding templates, a stoplight issue board where red requires a published "why", a recognition wall, and a per-unit dashboard (cadence vs. goal, avg scores, open issues). Zero-dependency Node + SQLite (see `rounds/README.md`) |
| **Cardinal Books — bookkeeping UI** | `books/` | A usable single-page bookkeeping app (dashboard, invoices, payments, expenses, customers, P&L / A-R aging) backed by a backend-for-frontend that proxies to the Accounting service and opens to one company's books — Blue Ridge Press LLC by default (see `books/README.md`) |
| **Cardinal Payroll — Run Payroll console (ADP-style)** | `runpay/` | An employer Run Payroll app: add employees, run a whole pay period in one click, and see every paycheck gross-to-net plus company totals — gross, employee withholding, net, employer taxes, and total cash to remit. Employee self-service links (own pay stubs + YTD), and hourly hours pulled from the timeclock. A backend-for-frontend over the Payroll engine (real federal + NC / FICA math); withholding calculator, not a tax filer (see `runpay/README.md`) |
| **Timeclock — time & attendance** | `timeclock/` | Hourly timesheet entries that total per pay period and feed straight into a Run Payroll batch. Record hours (manager or employee self-service), summarize a date range; hours stored as integer minutes (see `timeclock/README.md`) |
| **Booking — scheduling & references** | `booking/` | Appointment scheduling for a service business (e.g. massage): services, workers, a live schedule with worker double-booking prevention, employment references, and masked vetting credentials (see `booking/README.md`) |
| **HomeSafe — in-home visit safety** | `homesafe/` | A private, offline single-page app for in-home service safety: vet who comes to your home, or (as a worker) share your plan and check in. No people-search; data stays on the device (see `homesafe/README.md`) |
| **Admin Portal — the usable HR app** | `portal/` | Single-page HR console (register a company, hire employees, see one record resolve into every service) backed by a backend-for-frontend that proxies to the orchestrator server-side, keeping credentials off the browser (see `portal/README.md`) |
| **Live Schedule — day-view UI** | `schedule/` | A usable day-view scheduling app (book, assign a therapist, work the schedule) backed by a backend-for-frontend that proxies to the Booking service (see `schedule/README.md`) |
| **Client Booking Site — public self-book** | `book/` | A public page where customers self-book an appointment, backed by a narrow BFF that only lists services and creates *requested* appointments for one configured business — no schedule or admin access (see `book/README.md`) |
| **Trading — brokerage engine** | `trading/` | Standalone Robinhood-style trading engine: accounts with paper buying power, a deterministic mock market feed, market/limit orders, positions with average-cost basis, and a watchlist (see `trading/README.md`) |
| **Cardinal Trading — trading app** | `invest/` | A usable multi-user trading app: sign up / log in, then your own paper portfolio, watchlist, orders, and buy/sell — a backend-for-frontend over the Trading service with every call scoped server-side to the logged-in user's account (see `invest/README.md`) |
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

# Cardinals Promise (CARD) Token

[![verify-claims](https://github.com/brizzi78-strong/test/actions/workflows/verify.yml/badge.svg)](https://github.com/brizzi78-strong/test/actions/workflows/verify.yml)

**Cardinals Promise (CARD)** — a fixed-supply ERC-20 on Ethereum. The full
250,000,000 supply is minted to the deployer at construction. Transfers
between non-treasury addresses collect an immutable **2% fee** for the
immutable treasury; transfers to or from that treasury are exempt. There is
**no mint function, burn, blacklist, pause switch, fee setter, treasury
setter, or exemption setter**. `Ownable` is inherited solely so
`renounceOwnership()` can be executed as a public, verifiable launch step;
no function is owner-gated, so ownership grants no power even before it is
renounced.

**Launching for real? Follow the step-by-step [launch runbook](LAUNCH.md)**
(parameters and rationale in [TOKEN_LAUNCH_STRATEGY.md](TOKEN_LAUNCH_STRATEGY.md),
launch-day sequence in [LAUNCH_DAY_CHECKLIST.md](LAUNCH_DAY_CHECKLIST.md)).

## Layout

```
contracts/CardinalsPromise.sol             # the token (OpenZeppelin ERC20 + Ownable)
contracts/CardinalsPromise.t.sol           # Foundry-style Solidity tests (forge-std)
contracts/CardinalsPromiseInvariants.t.sol # stateful fuzz/invariant suite (handler-based)
test/CardinalsPromise.ts                   # TypeScript tests (node:test + viem)
verification/claims.json                   # launch-claims registry (claim → evidence)
scripts/verify-claims.mjs                  # claims verifier (run via `npm run verify`)
scripts/rehearse-launch.ts                 # full local launch rehearsal (real Uniswap V2 stack)
scripts/add-liquidity.ts                   # create/seed the Uniswap V2 CARD/ETH pool
scripts/test-swap-sepolia.ts               # separate-wallet fee-aware Sepolia buy and sell
ignition/modules/CardinalsPromise.ts       # Hardhat Ignition deployment module
docs/AUDIT-SCOPE.md                        # cold-start package for an auditor
docs/LEGAL-BRIEFING.md                     # cited research briefing for counsel (US + EU)
docs/AI_VERIFICATION_GAP.md                # why the claims ledger exists
cp17-site/index.html                       # canonical cp17.org token site
site/index.html                            # compatibility redirect to cp17.org
hardhat.config.ts                          # Hardhat 3 config (native solc; HARDHAT_BUNDLED_SOLC=1 for offline)
foundry.toml + remappings.txt              # Foundry config (deps resolved from node_modules)
```

## Getting started

```bash
npm install
npx hardhat test          # runs Solidity AND TypeScript tests
npx hardhat build         # compile
npm run verify            # verify every launch claim against executable evidence
npm run rehearse          # full local launch rehearsal: deploy → pool → swap → renounce
```

Every trust claim (fixed supply, immutable 2% fee and treasury exemption, no
blacklist, no pause, ownership grants no power, renounce works) is recorded in `verification/claims.json`
and mapped to ABI-level structural checks, example tests, and stateful fuzz
invariants. CI runs the verifier on every push. With
[Foundry](https://getfoundry.sh) installed, the same Solidity tests also run
natively via `forge test`.

On first build Hardhat downloads the native `solc` binary from
`binaries.soliditylang.org`. If that host is unreachable (restricted/offline
networks), compile with the WASM build bundled in the `solc` npm package
instead — same compiler version, identical bytecode:

```bash
HARDHAT_BUNDLED_SOLC=1 npx hardhat test
```

## Deployment

RPC URLs and keys are supplied through the encrypted Hardhat keystore —
nothing sensitive lives in the repo:

```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
npm run deploy:sepolia -- --parameters ignition/parameters.sepolia.json
npx hardhat verify --network sepolia <deployed-address> <treasury-address>
```

A `mainnet` network is pre-wired the same way (`MAINNET_RPC_URL`,
`MAINNET_PRIVATE_KEY`); `npm run deploy:mainnet` executes it when the launch
checklist is ready.

## Sepolia dry run

`SEPOLIA_DRY_RUN.md` is a copy-paste walkthrough of the whole launch sequence
on the Sepolia testnet — deploy, verify, fund the treasury, create a real V2
pool, execute a fee-aware buy and sell, and renounce — so the real launch day
has no first-time contract or swap steps in it. The production LP lock remains
a separate external gate.

## Launch-day scripts

Helpers for the transaction steps in `LAUNCH_DAY_CHECKLIST.md`. Fill in
`launch.json` (network, token address, treasury address; pool address once it
exists), then:

```bash
npx hardhat run scripts/launch-check.ts       # read-only: which step you're on + abort-criteria check
npx hardhat run scripts/transfer-treasury.ts  # step 3: stages exactly 150M in the treasury
npx hardhat run scripts/renounce.ts           # step 6: guarded renounce — verifies state, asks for confirmation
```

Each script verifies the on-chain state before doing anything and stops with
an explanation instead of proceeding when something doesn't match the plan.
`scripts/smoke-test-local.ts` runs the whole sequence against the in-process
network to prove the guardrails work — no real network or funds involved.

## Etherscan verification

Source verification (step 2 of `LAUNCH_DAY_CHECKLIST.md`) goes through
`hardhat-verify`, which ships with the toolbox. Store an
[Etherscan API key](https://etherscan.io/apis) the same way as the RPC
secrets, then verify the deployed address with its immutable treasury
constructor argument:

```bash
npx hardhat keystore set ETHERSCAN_API_KEY
npx hardhat verify --network sepolia <deployed-address> <treasury-address>
```

Deployments made with Ignition can be verified in one step from the recorded
deployment instead:

```bash
npx hardhat ignition verify chain-11155111   # sepolia deployment id
```

Verification submits the sources to `etherscan.io`; compilation beforehand
fetches the compiler from `binaries.soliditylang.org` (unless using the
bundled fallback above), so those are the two hosts the toolchain needs to
reach.

If the API route isn't available, `verification/` contains a ready-to-upload
standard JSON input and instructions for verifying manually through
Etherscan's web form — see [verification/README.md](verification/README.md).

## Disclaimer

This code is provided as-is. Have any contract audited by a professional
before deploying it to mainnet or accepting real value, and make sure any
token launch complies with the securities and consumer-protection laws of
the relevant jurisdictions (see `docs/LEGAL-BRIEFING.md`).
