# CARD governance and founder economics — current policy

This file is the current policy. `GOVERNANCE_DECISION_ARCHIVE.md` preserves the longer
decision history, including retired names and proposals; it is not a second source of
current truth.

## Current identity

- Token: **Cardinals Promise**
- Ticker: **CARD**
- Contract: `CardinalsPromise`
- Official token domain: **cp17.org**
- Book: separate property; no token bundle, giveaway, or book-funded token activity
- Operating entity: not represented here as formed or approved until formation and counsel
  review are complete

## On-chain economics

| Allocation | Amount | Status |
|---|---:|---|
| Public CARD/WETH pool | 100,000,000 CARD | Seeded through the treasury so it arrives whole |
| Founder | 100,000,000 CARD | Unlocked; wallet published; no sale below $100,000 pool liquidity |
| Treasury | 50,000,000 CARD | Separate multisignature Safe; address published |
| Total | 250,000,000 CARD | Fixed; no mint, burn, pause, or blacklist |

The contract charges 2% on transfers between non-treasury addresses and sends it to the
immutable treasury. Transfers to or from the treasury are exempt. No function can change
the fee, treasury, or exemption rule.

The founder holding is the largest risk. It is disclosed rather than softened: it is
unlocked, similar in size to the pool's CARD side, and capable of moving the market.

## Founder sale policy

1. No founder sale while total pool liquidity is below $100,000.
2. If the threshold is ever met, publish a schedule before the first sale.
3. No more than 1% of the pool's CARD depth in a quarter.
4. Announce the wallet, amount, date window, and completed transaction.
5. No sale or transfer based on nonpublic, price-moving information.
6. Transfers for future compensation or grants require the same public ledger treatment.

This is a published policy, not an on-chain lock. Buyers must distinguish the two.

## Treasury policy

- Use a multisignature Safe with independent signers.
- Publish every signer role and the signature threshold without publishing private contact
  or security information.
- Announce material outflows and link the completed transaction.
- Do not describe treasury tokens as cash. Converting them to cash means selling into the
  same thin market as everyone else.
- Do not promise charity percentages, recipients, schedules, or amounts before they exist.
- Buying CARD is never described as a donation.
- Transfers to or from the treasury are fee-exempt; this exemption must remain disclosed
  wherever the 2% fee is described.

## Board and grants

No board member, grant, or vesting allocation is represented as active until all of the
following exist:

- formed entity and written governing documents;
- written acceptance by the named member;
- CPA treatment for compensation, basis, vesting, withholding, and reporting;
- counsel approval of conflicts and disclosures;
- deployed vesting contract and public wallet address.

The archived proposal for four grants of 5,000,000 CARD each remains a proposal. If adopted,
the 20M comes from the founder's 100M, not the treasury, and the public allocation changes
to 80M founder plus 20M disclosed vesting contracts. Until then, the canonical allocation
remains 100M founder / 100M pool / 50M treasury.

## Product and book boundary

- The token may truthfully state that its name and cardinal mark come from the story.
- The book does not bundle, award, promise, or require CARD.
- Book revenue does not fund token liquidity, operations, treasury activity, or giving.
- Physical merchandise is not an on-chain token and must not be described as redeemable for
  CARD unless a separately reviewed program is created.
- Cardinal Trading is paper trading. Optional real-CARD links open Uniswap and remain behind
  an explicit post-launch switch.

## Required launch approvals

The contract, website, marketplace links, entity, founder policy, treasury, and any grants
must be reviewed by qualified legal and tax professionals before mainnet. Repository tests
prove software behavior; they do not establish regulatory compliance, tax treatment, or
commercial viability.
