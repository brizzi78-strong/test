# Cardinals Promise (CARD) — canonical launch runbook

Status: code and rehearsal package only. No mainnet token or public pool exists until the
contract address is published at **cp17.org**.

## Fixed launch parameters

| Item | Canonical value |
|---|---|
| Token | Cardinals Promise (`CARD`) |
| Contract | `CardinalsPromise` |
| Supply | 250,000,000 CARD, minted once |
| Public pool | 100,000,000 CARD (40%) with 2–5 ETH |
| Founder allocation | 100,000,000 CARD (40%), unlocked and publicly disclosed |
| Treasury | 50,000,000 CARD (20%) after pool seeding |
| Transfer fee | 2% between non-treasury addresses, sent to the immutable treasury |
| Treasury transfers | Fee-exempt in both directions |
| Ownership | Renounced only after verification, two-way swap test, and LP lock |
| Official token site | `https://cp17.org` |

The 100M pool inventory is staged through the treasury so it arrives in the pair whole:

```text
deployer → treasury: 150M CARD  (100M pool inventory + 50M retained)
treasury → pair:      100M CARD  (fee-exempt)
final balances:       100M founder / 100M pool / 50M treasury
```

## 1. Prepare wallets and parameters

- Use a dedicated deployer wallet.
- Use a separate multisignature Safe as the treasury.
- Put the deployer, treasury, token, and eventual pair addresses in `launch.json`.
- Copy `ignition/parameters.example.json`, enter the Safe address, and keep the completed
  file out of public chat and screenshots.

## 2. Build and test

```bash
npm ci
npm run build
npm test
npm run verify
npm run rehearse
```

The rehearsal must exercise a separate treasury, fee-exempt pool seeding, a fee-aware buy,
a fee-aware sell, fee accumulation, supply conservation, and renouncement.

## 3. Sepolia

```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
npx hardhat keystore set ETHERSCAN_API_KEY
npx hardhat ignition deploy ignition/modules/CardinalsPromise.ts \
  --network sepolia --parameters ignition/parameters.sepolia.json
```

Then follow `SEPOLIA_DRY_RUN.md`. It creates a real Sepolia V2 pool through the official
router and runs a separate-wallet fee-aware buy and sell. Do not proceed unless the
contract source, constructor treasury, pool, fee behavior, and final balances all match
this file and the public transaction links are saved.

## 4. Required human gates

- Independent smart-contract review or audit.
- Securities, money-transmission, consumer-protection, and marketing review by qualified
  counsel in every jurisdiction where launch is contemplated.
- CPA review of treasury, founder, and any future board-grant accounting.
- Written confirmation of the LP-lock provider and duration.
- Final review of every statement on cp17.org against `verification/claims.json`.

## 5. Mainnet deployment

```bash
npx hardhat keystore set MAINNET_RPC_URL
npx hardhat keystore set MAINNET_PRIVATE_KEY
npx hardhat ignition deploy ignition/modules/CardinalsPromise.ts \
  --network mainnet --parameters ignition/parameters.mainnet.json
```

Immediately verify `project/contracts/CardinalsPromise.sol:CardinalsPromise` on Etherscan,
including the encoded treasury constructor argument.

## 6. Seed liquidity from the treasury

Run with the treasury signer:

```bash
CARD_NETWORK=mainnet \
CARD_TOKEN_ADDRESS=0x... \
CARD_TREASURY_ADDRESS=0x... \
CARD_AMOUNT=100000000 \
ETH_AMOUNT=... \
LP_RECIPIENT=0x... \
npx hardhat run scripts/add-liquidity.ts --network mainnet
```

Confirm the pair received exactly 100M CARD. Lock all LP tokens and publish the pair and
lock transaction links.

## 7. Test both directions and renounce

- Buy through a fee-on-transfer-supporting route.
- Sell through a fee-on-transfer-supporting route.
- Confirm ordinary transfers deliver 98% and credit 2% to the treasury.
- Confirm transfers to/from the treasury are exempt.
- Confirm 100M founder, approximately 100M pool, and at least 50M treasury balances.

Only then run `scripts/renounce.ts` and type the exact confirmation phrase. Renouncement is
irreversible and does not replace an audit or legal review.

## 8. Publish

Update `assets/token-metadata.json`, cp17.org, the ledger, and the announcement with the
same contract, pair, treasury, founder, LP-lock, verification, and renouncement addresses.
Never publish a contract address anywhere before cp17.org is ready to be the canonical
anti-phishing source.
