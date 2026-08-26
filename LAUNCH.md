# Cardinals Promise (CARD) v2 — Pilot Runbook

> **Do not use the old Uniswap launch sequence on this branch.** CARD v2 is an earned-and-spent controlled pilot, not a public token sale or DEX launch.

## Production gates

Do not deploy CARD v2 to mainnet until all of these are complete:

- [ ] Contract build and full test suite pass.
- [ ] `npm run verify` reports every security claim green.
- [ ] Independent smart-contract review is complete.
- [ ] Legal/compliance review covers the actual earning, merchant acceptance, USD settlement, custody/key handling, consumer disclosures, and jurisdictions involved.
- [ ] Treasury wallet is dedicated to CARD.
- [ ] Administrator is a Safe multisig rather than an ordinary single-key wallet.
- [ ] AWS application has least-privilege credentials, audit logging, rate limiting, and no private keys exposed to browsers or source control.
- [ ] Sepolia pilot exercises every permitted and prohibited path.
- [ ] Emergency pause procedure has been tested.

## Contract parameters

Deployment requires two addresses:

| Parameter | Purpose |
| --- | --- |
| `treasury` | Receives the entire fixed 1,000,000,000 CARD supply |
| `admin` | Controls member/merchant approvals, pause/unpause, and ownership transfer |

The production admin should be a multisig.

## Sepolia first

Store RPC and signing credentials using the Hardhat keystore; do not commit them.

```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
npx hardhat keystore set ETHERSCAN_API_KEY
```

Deploy with explicit treasury and admin parameters:

```bash
npm run deploy:sepolia -- --parameters '{"CardinalsPromiseModule":{"treasury":"0xTREASURY","admin":"0xADMIN"}}'
```

Then verify the deployed contract with the exact constructor arguments used at deployment.

## Required Sepolia scenarios

1. Treasury distributes CARD to an approved member.
2. Treasury cannot distribute to an unapproved wallet.
3. Member spends CARD at an approved merchant.
4. Member cannot transfer CARD to another member.
5. Member cannot transfer CARD to an arbitrary wallet or DEX pair.
6. `transferFrom` cannot bypass destination restrictions.
7. Merchant can return CARD to treasury for reconciliation.
8. Merchant cannot transfer CARD to a member or arbitrary wallet.
9. Removing a member or merchant prevents new restricted-path transactions involving that wallet.
10. Pause stops token movement.
11. Unpause restores permitted movement.
12. Ownership can be transferred to a replacement multisig.
13. `renounceOwnership()` reverts.
14. Total supply remains exactly 1,000,000,000 CARD throughout.

## Mainnet

Mainnet deployment is a separate approval decision. It should repeat the tested Sepolia constructor and configuration, using production treasury/admin addresses.

There is **no CARD/ETH liquidity step, no LP-token step, no opening market price, and no swap rehearsal** in CARD v2.

## After deployment

- Publish the verified contract address.
- Publish the treasury and admin/multisig addresses.
- Record every participant approval/revocation through the application audit trail.
- Monitor pause events, ownership changes, role changes, failed transactions, and unusual volume.
- Keep business/settlement records separate from the on-chain token balance ledger.

## Important limitation

Transfer restrictions materially reduce the ability to create a conventional secondary market, but they do not by themselves decide whether the program is legally a security, money-transmission service, stored-value program, gift-card program, or another regulated product. The final legal analysis must be based on the real operating model, not the token's label.
