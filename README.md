# Cardinal Projects Workspace

This repository holds several projects. Jump to the one you need:

| Project | Where | What |
|---|---|---|
| **The Cardinal's Toolkit — iPhone app** | `CardinalPress/` + `CardinalPress.xcodeproj` | Companion app to the NC Family Caregiver Handbook ([below](#the-cardinals-toolkit--iphone-app)) |
| **The Cardinal's Promise / Toolkit book** | `cardinals-promise/` | Manuscript, samples, and marketing for the book |
| **Cardinals Promise (CARD) token** | `contracts/`, `test/`, `verification/`, `site/` | Fixed-supply ERC-20 with a complete launch kit ([below](#cardinals-promise-card-token)) |

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
250,000,000 supply is minted to the deployer at construction; there is **no
mint function, no burn, no transfer tax, no blacklist, and no pausing** —
the supply can never change. `Ownable` is inherited solely so
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
ignition/modules/CardinalsPromise.ts       # Hardhat Ignition deployment module
docs/AUDIT-SCOPE.md                        # cold-start package for an auditor
docs/LEGAL-BRIEFING.md                     # cited research briefing for counsel (US + EU)
docs/AI_VERIFICATION_GAP.md                # why the claims ledger exists
site/index.html                            # one-page launch site; assets/ has the logo
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

Every trust claim (fixed supply, no tax, no blacklist, no pause, ownership
grants no power, renounce works) is recorded in `verification/claims.json`
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
npm run deploy:sepolia
npx hardhat verify --network sepolia <deployed-address>
```

A `mainnet` network is pre-wired the same way (`MAINNET_RPC_URL`,
`MAINNET_PRIVATE_KEY`); `npm run deploy:mainnet` executes it when the launch
checklist is ready.

## Sepolia dry run

`SEPOLIA_DRY_RUN.md` is a copy-paste walkthrough of the whole launch sequence
on the Sepolia testnet — deploy, verify, fund the treasury, simulate the
pool, renounce — so the real launch day has no first-time steps in it.

## Launch-day scripts

Helpers for the transaction steps in `LAUNCH_DAY_CHECKLIST.md`. Fill in
`launch.json` (network, token address, treasury address; pool address once it
exists), then:

```bash
npx hardhat run scripts/launch-check.ts       # read-only: which step you're on + abort-criteria check
npx hardhat run scripts/transfer-treasury.ts  # step 3: sends exactly 50M to the treasury, once
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
secrets, then verify the deployed address — `CardinalsPromise` takes no
constructor arguments:

```bash
npx hardhat keystore set ETHERSCAN_API_KEY
npx hardhat verify --network sepolia <deployed-address>
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
