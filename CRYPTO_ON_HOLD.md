# CARD token — on hold

**Status: PAUSED. Do not execute the launch runbooks.** (Decision made August 2026.)

This is the authoritative note on the CARD token's status. The launch documents
in this repo are step-by-step runbooks that work if followed — which is exactly
why this note exists. Read this before acting on any of them.

## Current state — nothing is live

Verified at the time of this decision:

| Thing | State |
| --- | --- |
| Token deployed to mainnet | **No.** No contract address exists anywhere in this repo. |
| Uniswap pool created | **No.** |
| Liquidity committed | **No.** No ETH at risk. |
| Real-money links in the trading app | **Off.** `ENABLE_REAL_CARD_LINKS` defaults to off and `render.yaml` pins it to `"0"`. |
| Announcement published | **No.** `ANNOUNCEMENT.md` is an unpublished draft. |

Nothing needs to be unwound. The pause costs nothing because nothing was spent.

## Why it's paused

Two reasons, and the second is the one that decided it.

**1. The utility math doesn't close.** For the token to be worth anything,
someone has to want to buy it. The utility on offer is a discount on books —
roughly $1.20 on a $24 book. That cannot generate meaningful demand. Which
means value would have to come from speculation instead of use, and speculation
is precisely what turns a utility token into a security (see
[`BOOKSTORE_PLATFORM_PLAN.md`](BOOKSTORE_PLATFORM_PLAN.md) for the Howey
analysis).

**2. It is negatively correlated with the business that actually earns.** The
placement business (see [`SENIOR_CARE_PLACEMENT_STRATEGY.md`](SENIOR_CARE_PLACEMENT_STRATEGY.md)
and [`LEAD_GENERATION_STRATEGY.md`](LEAD_GENERATION_STRATEGY.md)) runs entirely
on trust with three conservative audiences:

- hospital discharge planners and case managers — institutional, risk-averse;
- adult children in crisis — frightened, protective of a vulnerable parent;
- licensed facility operators — compliance-minded.

"Senior placement advisor who also runs a cryptocurrency" is a negative signal
with all three. Elder-care referral services already draw regulatory scrutiny
as a category; attaching a token to an elder-adjacent business invites the
wrong kind of attention to the part of the business that pays.

The token is not badly built — the contract is genuinely clean (fixed supply,
no mint, no tax, no blacklist, ownership renounced at launch). It is paused on
**business** grounds, not technical ones.

## What is safe to leave alone

Everything. Nothing here is dangerous while unlaunched:

- `contracts/CardinalsPromise.sol` and its tests — an unused, undeployed ERC-20.
- `ignition/modules/CardinalsPromise.ts` — a deployment script nobody has run.
- The CARD page in the trading app — informational only while
  `ENABLE_REAL_CARD_LINKS` is off. **Leave it at `0`.**
- `bookstore/` — the marketplace works fine on USD alone; the CARD payment path
  is inert without a deployed token.

## Do not execute these without revisiting this decision

These files are runbooks. Following them launches a token.

- [`LAUNCH.md`](LAUNCH.md) — the launch runbook
- [`LAUNCH_DAY_CHECKLIST.md`](LAUNCH_DAY_CHECKLIST.md) — day-of checklist
- [`TOKEN_LAUNCH_STRATEGY.md`](TOKEN_LAUNCH_STRATEGY.md) — supply/liquidity plan
- [`SEPOLIA_DRY_RUN.md`](SEPOLIA_DRY_RUN.md) — testnet rehearsal
- [`ANNOUNCEMENT.md`](ANNOUNCEMENT.md) — draft announcement copy

The Sepolia dry run is testnet-only and risks no real money, but it is the
first step of the launch sequence and shouldn't be treated as idle practice.

## What would have to be true to revisit

Not a permanent no — a "not now, and not for these reasons." Revisit only if
**all** of the following hold:

1. **The placement business is established** — steady referral flow, a
   reputation that a side venture can't dent.
2. **There is real utility demand** — a use for the token that people would
   pay for even if its price never moved. Book discounts are not that.
3. **A securities attorney has reviewed it in writing** — specifically on
   classification, and on whether any distribution or reward mechanism is
   contemplated (as of this pause, none is, and that's what keeps it clean).
4. **It can be kept visibly separate from the care business** — different
   entity, different brand, no cross-promotion to families or referral
   partners.

If those conditions aren't all met, the answer stays no, and the reasoning
above is why.
