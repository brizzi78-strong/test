# CARD v2 Pilot Strategy

CARD v2 is an **earned-and-spent community token**, not a publicly traded token launch.
This document replaces the earlier Uniswap/fair-launch strategy for this branch.

## Core rules

- Fixed total supply: **1,000,000,000 CARD**.
- The full supply is minted once to a designated treasury wallet at deployment.
- There is no public mint function and no burn/rebase mechanism.
- CARD is **not seeded into a DEX liquidity pool** by this project.
- CARD is **not sold in an ICO, presale, or token sale** by this project.
- Ordinary member-to-member transfers are blocked on-chain.
- A member may spend CARD only to a wallet approved as a participating merchant.
- Approved members and merchants may return CARD to the treasury for reconciliation.
- The administrator can approve/remove member and merchant wallets and pause transfers in an emergency.
- The administrator role should be held by a Safe multisig before any production pilot.
- Ownership renunciation is disabled because the pilot requires ongoing participant controls and emergency response.

## Permitted on-chain paths

```text
Treasury -> approved member       distribution / earned allocation
Treasury -> approved merchant     pilot funding if required
Member   -> approved merchant     spend
Member   -> treasury              return / correction / reconciliation
Merchant -> treasury              settlement / reconciliation
```

Everything else is rejected by the token contract, including:

```text
Member -> member
Member -> arbitrary wallet
Merchant -> member
Merchant -> arbitrary wallet
Treasury -> unapproved wallet
```

`transferFrom` uses the same restrictions, so an ERC-20 allowance cannot bypass the destination rules.

## Pilot deployment sequence

1. **Legal/compliance review before production deployment.** The technical controls do not determine the legal characterization of CARD or the obligations of the operator, merchants, or settlement providers.
2. Create a dedicated **treasury wallet** and a separate **Safe multisig administrator**.
3. Deploy to **Sepolia** with those two addresses.
4. Verify the contract source on Etherscan.
5. Run `npm run verify` and require all machine-checkable claims to pass.
6. Add only test member and merchant wallets.
7. Exercise distribution, member spending, merchant reconciliation, revocation, pause, and unpause flows.
8. Connect the AWS application layer only after the testnet flow is stable.
9. Obtain final legal/security approval before any mainnet deployment or real-value settlement.

## Explicitly retired from CARD v2

The following belong to the earlier prototype and are **not part of CARD v2**:

- Uniswap CARD/ETH liquidity pool
- public swapping or trading
- LP-token locking
- opening market price engineering
- a tradeable founder float
- marketing to token buyers or speculators
- ownership renunciation as a launch signal

The v2 branch removes the Uniswap liquidity and swap rehearsal scripts to reduce the chance of accidentally deploying the obsolete model.

## AWS application boundary

Ethereum is only the token ledger. The application layer should handle:

- authenticated member and merchant accounts
- approval workflows
- earning records and supporting evidence
- merchant checkout requests
- daily pilot limits
- transaction metadata and audit history
- settlement/reconciliation records
- alerts and operational monitoring

Never store a mainnet private key in source code, a browser bundle, GitHub, or an ordinary environment file. Production signing should use an appropriately secured signer/key-management design and least-privilege AWS permissions.

---

This is an engineering design document, not a legal conclusion that CARD is or is not a security, money-transmission product, stored-value product, or other regulated instrument. Those questions depend on the actual program and should be reviewed by qualified counsel before launch.
