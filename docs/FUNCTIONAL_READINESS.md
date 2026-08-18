# CARD functional readiness

This assessment is regenerated for the canonical reconciliation branch. “Passing locally”
is not a launch approval; mainnet remains blocked until every external gate is complete.

| System | Repository status | Production status |
|---|---|---|
| Contract identity | Cardinals Promise / CARD only | Not deployed |
| Supply and fee | 250M fixed; immutable 2% non-treasury fee | Requires independent audit |
| Treasury | Constructor-enforced, nonzero, immutable | Safe and signers not recorded here |
| Distribution | 100M founder / 100M pool / 50M treasury | Not executed |
| Pool rehearsal | Separate treasury, fee-aware buy and sell | Sepolia evidence required |
| Verification ledger | Claims mapped to tests and ABI checks | Regenerate artifact for deployed commit |
| cp17.org | Static, no JavaScript, disclosure-first | Publish only with final proof links |
| Cardinal Trading | Paper accounts; live links explicitly disabled | Hosting/security/counsel gates remain |
| Governance | Current policy separated from historical archive | Entity, board, grants not represented as active |

## Launch blockers

1. Qualified legal review of issuance, marketing, treasury fee, founder holding, Uniswap
   links, jurisdictions, and any future integrated purchase flow.
2. CPA review of founder, treasury, compensation, vesting, and reporting.
3. Independent contract review or audit of the exact deployment commit.
4. Fee-aware Sepolia seed, buy, sell, source verification, balance checks, and renouncement
   rehearsal with public transaction links.
5. Treasury Safe, signer policy, LP-lock provider, incident plan, and final public copy.

## Evidence standard

- **Proven by repository tests:** deterministic contract and application behavior exercised
  in CI for the exact commit.
- **Proven on testnet:** public transaction evidence against deployed bytecode.
- **Reviewed:** a named qualified professional reviewed the final materials in writing.
- **Assumed:** everything else.

No document may upgrade an assumed item to proven merely because code exists.
