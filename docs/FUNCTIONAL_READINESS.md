# CARD functional readiness

This assessment is regenerated for the canonical reconciliation branch. “Passing locally”
is not a launch approval; mainnet remains blocked until every external gate is complete.

| System | Repository status | Production status |
|---|---|---|
| Contract identity | Cardinals Promise / CARD only | Not deployed |
| Supply | 1B fixed; immutable 2% transfer fee to an immutable treasury (treasury-exempt) | Requires independent audit |
| Treasury | Single founder-held wallet, set as the constructor argument; funded by an explicit 600M launch-step transfer (checklist step 3), then seeds the pool fee-free | Address published on cp17.org; key custody not recorded here |
| Distribution | 400M founder (deployer wallet, unlocked) / 400M pool (seeded from the treasury) / 200M treasury | Not executed |
| Pool rehearsal | Pool seeded from the treasury signer; fee-aware buy and sell exercised from a separate buyer wallet | Sepolia evidence required |
| Verification ledger | Claims mapped to tests and ABI checks | Regenerate artifact for deployed commit |
| cp17.org | Static, no JavaScript, disclosure-first | Publish only with final proof links |
| Cardinal Trading | Paper accounts; live links explicitly disabled | Hosting/security/counsel gates remain |
| Governance | Current policy separated from historical archive | Entity, board, grants not represented as active |

## Launch blockers

1. Qualified legal review of issuance, marketing, founder holding, Uniswap
   links, jurisdictions, and any future integrated purchase flow.
2. CPA review of founder, treasury, fee income, compensation, and reporting.
3. Independent contract review or audit of the exact deployment commit.
4. Sepolia seed from the treasury, fee-aware buy and sell, source verification, balance
   checks, and renouncement rehearsal with public transaction links.
5. Treasury key custody, LP-lock provider, incident plan, and final public copy that states
   the 2% fee and the ~4.5% round-trip cost plainly.

## Evidence standard

- **Proven by repository tests:** deterministic contract and application behavior exercised
  in CI for the exact commit.
- **Proven on testnet:** public transaction evidence against deployed bytecode.
- **Reviewed:** a named qualified professional reviewed the final materials in writing.
- **Assumed:** everything else.

No document may upgrade an assumed item to proven merely because code exists.
