# Sepolia Practice Run — copy-paste walkthrough

This is the practice round from the launch plan ("Part 1"), on Sepolia — a
copy of Ethereum where the money is fake and mistakes are free. You'll do
every dangerous launch step once, end to end, so nothing is new on the real
day. Budget 1–2 hours the first time.

Do the steps in order. Every command is copy-paste. When a step says
"record", paste the value into a notes file — you'll want it later.

**The whole practice run needs no accounts or signups anywhere** — no
MetaMask, no Alchemy, no Etherscan account. Everything is either generated
locally or uses a public, no-registration service.

---

## Step -1 — The zero-setup rehearsal (5 min, do this first)

Before touching any network at all, run the built-in dress rehearsal. It
deploys the token, a real Uniswap pool, a buyer swap, and the renounce — all
on a simulated blockchain on your own machine:

```bash
npm install
npm run rehearse
```

If that ends with "all green", you've already watched the entire launch
happen once. The rest of this guide repeats it on Sepolia, where real
(test) infrastructure is involved.

## Step 0 — One-time setup (15 min active, plus faucet wait)

**a. Generate practice wallets locally** — no wallet app needed:

```bash
node scripts/new-wallet.mjs deployer treasury buyer pool
```

Copy all four addresses and keys into your notes file. These are
practice-only wallets: the keys are printed in plain text, so never put real
money on them. The deployer is the founder wallet (it keeps the 400M hold);
the treasury is the fee destination and the wallet that seeds the pool; the
buyer is a stranger's wallet for the test swap; the pool wallet is only for
the balance simulation in step 4b.

**b. Get free Sepolia ETH — no account needed.** Open the proof-of-work
faucet at `sepolia-faucet.pk910.de`, paste the **deployer** address, and
click start. Your browser "mines" test ETH while the tab stays open — no
signup, no login. Leave it running until you have ~0.1 Sepolia ETH (usually
under an hour; grab a snack). Stop it and claim. Then do the same for the
**treasury** (it pays for the pool creation, so aim for ~0.1 ETH there too)
and a little for the **buyer** (~0.02 ETH is plenty).
*(If you happen to already have a Google account, the faucet at
`cloud.google.com/application/web3/faucet` is instant — but it's optional.)*

**c. RPC URL — no account needed.** Use the public endpoint
`https://ethereum-sepolia-rpc.publicnode.com` — that's your connection to
the Sepolia network, free and registration-free.

**d. Check the project:**

```bash
npx hardhat test
```

All tests should pass. (If the compiler download fails on your network,
prefix commands with `HARDHAT_BUNDLED_SOLC=1`.)

**e. Store the two secrets.** Hardhat encrypts these on your machine — the
first `keystore set` asks you to create a keystore password; each command then
prompts for the value:

```bash
npx hardhat keystore set SEPOLIA_RPC_URL      # paste the URL from (c)
npx hardhat keystore set SEPOLIA_PRIVATE_KEY  # paste the DEPLOYER private key from (a)
```

---

## Step 1 — Deploy the token (5 min)

The contract takes one constructor argument — the treasury address — and it
can never be changed afterwards. Put the treasury address from step 0a into
`ignition/parameters.json` (copy `ignition/parameters.example.json`):

```json
{ "CardinalsPromiseModule": { "treasury": "0xYOUR_TREASURY_ADDRESS" } }
```

Then deploy:

```bash
npx hardhat ignition deploy ignition/modules/CardinalsPromise.ts --network sepolia --parameters ignition/parameters.json
```

It prints the deployed address, like
`CardinalsPromiseModule#CardinalsPromise - 0xAB12...`.
**Record that address.** (Deploying with a zero address, or with the
deployer's own address as the treasury, reverts — that is the contract
refusing a mistake, not a bug.)

Now tell the helper scripts about it — edit `launch.json`:

```json
{
  "network": "sepolia",
  "deployer": "0xYOUR_DEPLOYER_ADDRESS",
  "token": "0xYOUR_TOKEN_ADDRESS",
  "treasury": "0xYOUR_TREASURY_ADDRESS",
  "pool": ""
}
```

For `treasury`, use the same treasury address you passed to the deploy.

Sanity-check it worked:

```bash
npx hardhat run scripts/launch-check.ts
```

Expected: supply 1,000,000,000, deployer holds all of it, `treasury()`
matches launch.json, stage says "next: transfer-treasury", and
`✅ No problems detected`.

Also look at it like a buyer would: open
`https://sepolia.etherscan.io/token/0xYOUR_TOKEN_ADDRESS`.

## Step 2 — Verify the source code (5 min)

For practice, verify through Sourcify — free, keyless, no account. The
treasury address is the constructor argument, so it goes on the command line:

```bash
npx hardhat verify sourcify --network sepolia 0xYOUR_TOKEN_ADDRESS 0xYOUR_TREASURY_ADDRESS
```

Then check the result like a buyer would: open
`https://repo.sourcify.dev/select-contract/11155111/0xYOUR_TOKEN_ADDRESS`
(or look the address up on `sepolia.blockscout.com`, which shows Sourcify
verification with a green check).

On the real launch day you'll also want the green check on **etherscan.io**
specifically, since that's where buyers look — that route needs a free
Etherscan API key or their web upload form (`verification/README.md` has the
form walkthrough). That's a launch-day item; nothing about this practice run
needs it.

## Step 3 — Fund the treasury (2 min)

```bash
npx hardhat run scripts/transfer-treasury.ts
```

It sends exactly 600,000,000 CARD — the 200M the treasury keeps plus the
400M it will put into the pool — and prints the transaction link; open it,
this is what a "proof link" looks like. Notice the treasury received the
whole 600M: transfers *to* the treasury pay no fee. Then:

```bash
npx hardhat run scripts/launch-check.ts
```

Expected: deployer 400M (the founder hold — it never moves again), treasury
600M, stage "next: create the Uniswap pool".

Why 600M and not 200M: the pool has to receive exactly 400M, and only a
transfer *from* the treasury is fee-exempt. If the deployer seeded the pool
itself, 2% would be skimmed on the way in.

**Bonus lesson:** run `scripts/transfer-treasury.ts` a second time on
purpose. It should refuse with "treasury already holds…". That refusal is
the guardrail doing its job.

**Bonus lesson 2 — watch the fee work.** From the deployer, send 1,000 CARD
to the buyer wallet with any wallet app. The buyer receives 980 and the
treasury balance rises by 20. That is the entire fee mechanism; there is
nothing else to it.

## Step 4 — The pool, from the treasury wallet (15 min)

On the real day the **treasury** wallet creates the pool (400M CARD + the
ETH). Practice it for real on Sepolia's Uniswap V2 router. Point the
keystore at the treasury key for this step:

```bash
npx hardhat keystore set SEPOLIA_PRIVATE_KEY   # paste the TREASURY private key
CARD_NETWORK=sepolia CARD_TOKEN_ADDRESS=0xYOUR_TOKEN_ADDRESS \
  CARD_TREASURY_ADDRESS=0xYOUR_TREASURY_ADDRESS \
  CARD_AMOUNT=400000000 ETH_AMOUNT=0.05 \
  npx hardhat run scripts/add-liquidity.ts
```

(Sepolia ETH is scarce, so the ETH side is tiny here; on mainnet it's
≈1.6–1.67 ETH, about $4,000, recomputed on the day.) The script refuses to
run unless the connected wallet is the contract's `treasury()`. Because the
sender is the treasury, the pair receives the full 400M with no fee taken,
and the LP tokens land in the treasury wallet. **Record the pair address**
and put it into `launch.json` under `"pool"`.

Then the fee-aware test swap, from the buyer wallet — the one step here
that has never happened before on a real DEX with this fee:

```bash
npx hardhat keystore set SEPOLIA_PRIVATE_KEY   # paste the BUYER private key
CARD_BUY_ETH=0.001 npx hardhat run scripts/test-swap-sepolia.ts --network sepolia
```

It buys with `swapExactETHForTokensSupportingFeeOnTransferTokens`, sells
back with `swapExactTokensForETHSupportingFeeOnTransferTokens`, and checks
that the buyer received 98% of the pool's output and the treasury got 2% on
each leg. The Uniswap app picks these functions automatically; a buyer using
it only needs slippage set to at least 3%. Round trip cost: 2% + 2% + 0.3% +
0.3% ≈ 4.5% before gas, slippage and price impact. That is what every buyer
pays, and the announcement says so.

Switch the keystore back to the **deployer** key before step 5.

### Step 4b — Balance simulation (optional, 5 min)

If you only want to exercise the balance guards without the router, put the
**pool** wallet from step 0a into `launch.json` under `"pool"` and, with the
treasury key in the keystore, run:

```bash
npx hardhat run scripts/fund-pool-sim.ts
```

It sends the staged 400M from the treasury to the practice pool wallet so
the balances look like a funded pool to the other scripts. Practice only —
never on mainnet.

Either way, finish with:

```bash
npx hardhat run scripts/launch-check.ts
```

Expected: deployer 400M (the founder hold), treasury 200M plus any fees
from the test swap, pool ~400M, stage "test swap, lock LP, then renounce".

## Step 5 — Renounce (5 min) 🔒

On mainnet this is the one-way door. Here it's free, which is exactly why
you practice it:

```bash
npx hardhat run scripts/renounce.ts
```

It re-checks every balance on-chain, then asks you to type
`renounce forever`. Type it. When it finishes, confirm like a buyer would:
on `https://sepolia.etherscan.io/address/0xYOUR_TOKEN_ADDRESS#readContract`,
`owner` should read `0x0000000000000000000000000000000000000000`.

**Record the renounce transaction link** — on the real day that's proof
link #1 in the announcement.

## Step 6 — Debrief (5 min)

You're done when you can answer yes to all of these:

- [ ] I deployed, verified, funded the treasury, seeded the pool from the
      treasury, did a fee-aware buy and sell, and renounced, and I know what
      each step was *for*
- [ ] I saw the verified source with a green check (on Blockscout/Sourcify)
- [ ] I watched 2% of a transfer land in the treasury, and a transfer to the
      treasury arrive whole
- [ ] I saw the guardrails refuse a wrong action at least once
- [ ] I have a notes file with: token address, treasury address, every tx
      link, and the order I did things in
- [ ] Nothing surprised me badly enough that I'd panic if it happened with
      real money

Anything that *did* feel confusing — write it down and ask about it now,
while it's free.

## When you're done

The Sepolia token is disposable; you don't need to clean anything up. Before
the real launch, reset `launch.json` (network `"mainnet"`, the real deployer
and treasury addresses, blank token and pool), put the real treasury address
in `ignition/parameters.json`, and remember Ignition keeps its deployment
records per network, so the mainnet deploy starts fresh on its own.
