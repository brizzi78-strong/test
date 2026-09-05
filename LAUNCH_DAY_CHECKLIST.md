# CARD Launch Day Checklist

Companion to [TOKEN_LAUNCH_STRATEGY.md](TOKEN_LAUNCH_STRATEGY.md). Work top to bottom;
the order is deliberate — each step closes a door before buyers arrive. Don't skip ahead,
and don't announce anything until every box in sections 1–6 is checked.

## 0. Before launch day (do these days ahead)

Launch date: **Saturday, October 4, 2026.**

- [ ] Contract code finalized: OpenZeppelin ERC-20, fixed 1B supply, immutable 2% fee to an
      immutable treasury, no blacklist/mint/pause
- [ ] Contract deployed and tested on a testnet (Sepolia) end-to-end, including the
      fee-aware swap and the renounce — copy-paste walkthrough in `SEPOLIA_DRY_RUN.md`
- [ ] Deployer wallet (`0xe01e…ED2D`) is the founder wallet: it keeps the 400M hold, unlocked
- [ ] Treasury wallet (`0xDAE6…b300`) is a separate single-key wallet held by the founder —
      not a multisig — with its purpose written down for the announcement. Its address is the
      constructor argument and can never change: confirm it, and that you control its key,
      before deploying. If it ever moves behind a multisig, fees still flow to this address
- [ ] Enough ETH in the **treasury** wallet: ~1.6–1.67 ETH (about $4,000) for liquidity
      **plus** gas for the pool creation and the LP lock, plus the LP locker's fee. The
      deployer wallet needs only ~0.05–0.15 ETH of gas for deploy, verify, the treasury
      transfer, and the renounce. As of Jul 2026
      (re-check before launch): Team Finance = $150 flat in ETH + gas, keeps 100% of
      LP locked; UNCX = 0.1 ETH flat **+ 1% of the LP tokens** (so the lock shows 99%,
      not 100% — if using UNCX, soften the announcement's "100% locked" claim to match).
      Track records: UNCX lockers have no known exploit since 2020; Team Finance had
      one exploit (Oct 2022, ~$14.5M via its v2→v3 *migration* feature, not the basic
      time-lock; most funds returned, no repeat since). Cheapest + exact "100%" claim →
      Team Finance; cleanest security history → UNCX. Either is acceptable for a
      12-month lock of this size — decide, then make the announcement wording match.
- [x] Announcement post drafted with placeholders for the three proof links
      (renounce tx, LP lock, treasury address) — see `ANNOUNCEMENT.md`
- [ ] Pick a low-gas window (weekend/off-peak US hours; check a gas tracker)

## 1. Deploy

- [ ] Put the treasury address in `ignition/parameters.json`
      (`{"CardinalsPromiseModule":{"treasury":"0xDAE6…b300"}}`) and deploy:
      `npx hardhat ignition deploy ignition/modules/CardinalsPromise.ts --network mainnet --parameters ignition/parameters.json`
      — full 1B mints to deployer
- [ ] Record: contract address, deploy tx hash
- [ ] Fill `launch.json` (network, deployer, token address, treasury address) — the helper
      scripts below read it. Run `npx hardhat run scripts/launch-check.ts` between
      steps whenever you want a PASS/FAIL readout of where things stand.
- [ ] Sanity-check on Etherscan: total supply = 1,000,000,000, deployer balance =
      1,000,000,000, `treasury()` = the intended address, `FEE_BPS()` = 200

## 2. Verify source

- [ ] Verify contract source on Etherscan (exact compiler version + settings used to deploy):
      `npx hardhat verify --network mainnet <token-address> <treasury-address>` (needs
      `ETHERSCAN_API_KEY` in the keystore — see README "Etherscan verification")
- [ ] Confirm the "Contract" tab shows readable code with a green check

## 3. Treasury transfer

- [ ] Send 600,000,000 CARD to the treasury wallet in one transfer — 200M it keeps + 400M
      staged for the pool: `npx hardhat run scripts/transfer-treasury.ts` (sends exactly
      600M; refuses to run twice or if any balance is off). It goes through the treasury
      because a transfer *from* the treasury is fee-exempt — the treasury can seed the pool
      with the full 400M, the deployer could not
- [ ] Record the tx hash (this is a proof link)
- [ ] Confirm balances: deployer 400M (the founder hold — it stays here), treasury 600M

## 4. Create the Uniswap pool (from the TREASURY wallet)

- [ ] From the treasury wallet, create the pool with 400,000,000 CARD + about $4,000 of ETH
      (≈1.6–1.67 ETH — recompute from that day's ETH price):
      `CARD_NETWORK=mainnet CARD_TOKEN_ADDRESS=… CARD_TREASURY_ADDRESS=… CARD_AMOUNT=400000000 ETH_AMOUNT=… npx hardhat run scripts/add-liquidity.ts`
      with the treasury key as the signer. Because from == treasury, the pair receives the
      full 400M; LP tokens land in the treasury wallet
- [ ] Double-check both amounts **before** confirming — the ratio sets the launch price
      and cannot be un-set (e.g. 1.6 ETH ÷ 400M = 0.000000004 ETH/CARD starting price)
- [ ] Record: pool/pair address, LP token balance received
- [ ] Confirm balances: deployer 400M, treasury 200M, pool ~400M
- [ ] Do one tiny test swap (~0.01 ETH) from a different buyer wallet to confirm trading
      works both directions. Buys use `swapExactETHForTokensSupportingFeeOnTransferTokens`,
      sells use `swapExactTokensForETHSupportingFeeOnTransferTokens` — the Uniswap app does
      this automatically; set slippage to at least 3%. Confirm 2% of each leg reached the
      treasury and the buyer received 98%

## 5. Lock the LP tokens

- [ ] From the treasury wallet, lock 100% of LP tokens for 12 months on Team Finance or UNCX
- [ ] Verify the lock shows the full LP balance (not a partial amount) and the correct
      unlock date
- [ ] Record the public lock URL (this is a proof link)

## 6. Renounce ownership

⚠️ Point of no return. Before clicking, confirm: source verified, treasury funded,
pool live and trading, LP locked. After this, nothing about the contract can ever change.

- [ ] Add the pool address to `launch.json`, then, from the deployer, run
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
- [ ] State the 2% fee as a cost: 2% on the buy, 2% on the sell, plus Uniswap's 0.3% each
      way — about 4.5% round trip before gas — and the 3% minimum slippage
- [ ] State the treasury's purpose (it receives the 20% and every fee) and the "all spends
      announced" policy
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

- Test swap fails or behaves oddly (buyer gets something other than 98% of the swap
  output, the treasury gets something other than 2%, reverts with slippage ≥ 3%)
- `treasury()` on the deployed contract is not the intended address
- Etherscan verification won't go green
- LP lock shows the wrong amount or date
- Any balance doesn't match the plan (1B total / ~400M pool / 400M founder / 200M treasury
  plus whatever fees the test swaps produced)

Everything before the renounce is recoverable. After it, nothing is — that's the point,
but it means the renounce is the one step you never do while anything looks wrong.
