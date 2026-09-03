# CARD functional readiness

This assessment is regenerated for the canonical reconciliation branch. “Passing locally”
is not a launch approval; mainnet remains blocked until every external gate is complete.

| System | Repository status | Production status |
|---|---|---|
| Contract identity | Cardinals Promise / CARD only | Not deployed |
| Supply | 1B fixed; no transfer fee of any kind | Requires independent audit |
| Treasury | Funded by an explicit launch-step transfer (checklist step 3) | Safe and signers not recorded here |
| Distribution | 400M founder / 400M pool / 200M treasury | Not executed |
| Pool rehearsal | Separate treasury, buy and sell exercised | Sepolia evidence required |
| Verification ledger | Claims mapped to tests and ABI checks | Regenerate artifact for deployed commit |
| cp17.org | Static, no JavaScript, disclosure-first | Publish only with final proof links |
| Cardinal Trading | Paper accounts; live links explicitly disabled | Hosting/security/counsel gates remain |
| Governance | Current policy separated from historical archive | Entity, board, grants not represented as active |

## Launch blockers

1. Qualified legal review of issuance, marketing, founder holding, Uniswap
   links, jurisdictions, and any future integrated purchase flow.
2. CPA review of founder, treasury, compensation, vesting, and reporting.
3. Independent contract review or audit of the exact deployment commit.
4. Sepolia seed, buy, sell, source verification, balance checks, and renouncement
   rehearsal with public transaction links.
5. Treasury Safe, signer policy, LP-lock provider, incident plan, and final public copy.

## Evidence standard

- **Proven by repository tests:** deterministic contract and application behavior exercised
  in CI for the exact commit.
- **Proven on testnet:** public transaction evidence against deployed bytecode.
- **Reviewed:** a named qualified professional reviewed the final materials in writing.
- **Assumed:** everything else.

No document may upgrade an assumed item to proven merely because code exists.
