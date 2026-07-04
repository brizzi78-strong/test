# CARD Launch Day Checklist

Companion to [TOKEN_LAUNCH_STRATEGY.md](TOKEN_LAUNCH_STRATEGY.md). Work top to bottom;
the order is deliberate — each step closes a door before buyers arrive. Don't skip ahead,
and don't announce anything until every box in sections 1–6 is checked.

## 0. Before launch day (do these days ahead)

- [ ] Contract code finalized: OpenZeppelin ERC-20, fixed 250M supply, no tax/blacklist/mint
- [ ] Contract deployed and tested on a testnet (Sepolia) end-to-end, including the renounce
      — copy-paste walkthrough in `SEPOLIA_DRY_RUN.md`
- [ ] Deployer wallet is a fresh address with no unrelated history
- [ ] Treasury wallet created (separate address; ideally a Safe multisig) and its purpose
      written down for the announcement
- [ ] Enough ETH in the deployer wallet: 2–5 ETH for liquidity **plus** ~0.05–0.15 ETH
      buffer for gas across all steps, plus the LP locker's fee (check Team Finance/UNCX
      current pricing — some charge a flat fee, some a %)
- [x] Announcement post drafted with placeholders for the three proof links
      (renounce tx, LP lock, treasury address) — see `ANNOUNCEMENT.md`
- [ ] Pick a low-gas window (weekend/off-peak US hours; check a gas tracker)

## 1. Deploy

- [ ] Deploy the token contract; full 250M mints to deployer
- [ ] Record: contract address, deploy tx hash
- [ ] Fill `launch.json` (network, token address, treasury address) — the helper
      scripts below read it. Run `npx hardhat run scripts/launch-check.ts` between
      steps whenever you want a PASS/FAIL readout of where things stand.
- [ ] Sanity-check on Etherscan: total supply = 250,000,000, deployer balance = 250,000,000

## 2. Verify source

- [ ] Verify contract source on Etherscan (exact compiler version + settings used to deploy):
      `npx hardhat verify --network mainnet <token-address>` (needs `ETHERSCAN_API_KEY`
      in the keystore — see README "Etherscan verification")
- [ ] Confirm the "Contract" tab shows readable code with a green check

## 3. Treasury transfer

- [ ] Send 50,000,000 CARD to the treasury wallet:
      `npx hardhat run scripts/transfer-treasury.ts` (sends exactly 50M; refuses to
      run twice or if any balance is off)
- [ ] Record the tx hash (this is a proof link)
- [ ] Confirm balances: deployer 200M, treasury 50M

## 4. Create the Uniswap pool

- [ ] Create the pool with 200,000,000 CARD + your chosen ETH amount (2–5 ETH)
- [ ] Double-check both amounts **before** confirming — the ratio sets the launch price
      and cannot be un-set (e.g. 3 ETH ÷ 200M = 0.000000015 ETH/CARD starting price)
- [ ] Record: pool/pair address, LP token balance received
- [ ] Do one tiny test swap (~0.01 ETH) from a different wallet to confirm trading works
      both directions

## 5. Lock the LP tokens

- [ ] Lock 100% of LP tokens for 12 months on Team Finance or UNCX
- [ ] Verify the lock shows the full LP balance (not a partial amount) and the correct
      unlock date
- [ ] Record the public lock URL (this is a proof link)

## 6. Renounce ownership

⚠️ Point of no return. Before clicking, confirm: source verified, treasury funded,
pool live and trading, LP locked. After this, nothing about the contract can ever change.

- [ ] Add the pool address to `launch.json`, then run
      `npx hardhat run scripts/renounce.ts` — it re-checks the abort criteria
      on-chain, makes you type "renounce forever", and only then sends
- [ ] Confirm on Etherscan that owner is now the zero address (0x000…000)
- [ ] Record the tx hash (this is a proof link)

## 7. Announce

- [ ] Fill the six `{{...}}` placeholders in `ANNOUNCEMENT.md` (renounce tx, LP lock URL,
      treasury address + funding tx, token address, pool link); search for `{{` to
      confirm none were missed
- [ ] State the token address prominently (scammers deploy fake lookalikes — tell people
      to trust only this address)
- [ ] State the treasury's purpose and the "all spends announced" policy
- [ ] Submit the token to scanners/listing sites so the green checks show up where buyers
      look (DEXTools, DexScreener update automatically; token-info submissions where offered)
- [ ] Request an Etherscan name tag for the treasury wallet

## 8. First 48 hours

- [ ] Watch the pair page (DexScreener) for trading activity and price
- [ ] Watch for copycat/scam tokens using the CARD name; warn in your channels if any appear
- [ ] Don't touch the treasury wallet at all in the first days — early outflows from the
      team wallet are the worst possible signal
- [ ] Save a permanent record of all addresses, tx hashes, and the lock URL somewhere safe
      (they're your proof forever)

## Abort criteria

Stop and reassess — do **not** proceed to renounce (step 6) — if any of these happen:

- Test swap fails or behaves oddly (wrong amounts, reverts)
- Etherscan verification won't go green
- LP lock shows the wrong amount or date
- Any balance doesn't match the plan (250M total / 200M pool / 50M treasury)

Everything before the renounce is recoverable. After it, nothing is — that's the point,
but it means the renounce is the one step you never do while anything looks wrong.
