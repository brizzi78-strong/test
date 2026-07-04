# Sepolia Practice Run — copy-paste walkthrough

This is the practice round from the launch plan ("Part 1"), on Sepolia — a
copy of Ethereum where the money is fake and mistakes are free. You'll do
every dangerous launch step once, end to end, so nothing is new on the real
day. Budget 1–2 hours the first time.

Do the steps in order. Every command is copy-paste. When a step says
"record", paste the value into a notes file — you'll want it later.

---

## Step 0 — One-time setup (15 min)

**a. Make a practice wallet.** In MetaMask (or any wallet), create a *new*
account. Never use a wallet that holds real money for this — you're going to
export its private key, and practicing that hygiene is part of the exercise.

**b. Get free Sepolia ETH.** Copy the practice wallet's address and request
test ETH from a faucet (search "Sepolia faucet" — the Google Cloud one at
`cloud.google.com/application/web3/faucet` is reliable and free). You need
maybe 0.2 Sepolia ETH; a single faucet claim is plenty.

**c. Get an RPC URL** (your connection to the network). Easiest free option:
sign up at alchemy.com or infura.io, create an app, copy its Sepolia HTTPS
URL. Zero-signup alternative that usually works:
`https://ethereum-sepolia-rpc.publicnode.com`

**d. Get a free Etherscan API key** (for source verification). Create an
account on etherscan.io → your profile → "API Keys" → add one. One key works
for both Sepolia and mainnet.

**e. Install and check the project:**

```bash
npm install
npx hardhat test
```

All 14 tests should pass. (If the compiler download fails on your network,
prefix commands with `HARDHAT_BUNDLED_SOLC=1`.)

**f. Store the three secrets.** Hardhat encrypts these on your machine — the
first `keystore set` asks you to create a keystore password; each command then
prompts for the value:

```bash
npx hardhat keystore set SEPOLIA_RPC_URL      # paste the RPC URL from (c)
npx hardhat keystore set SEPOLIA_PRIVATE_KEY  # paste the practice wallet's private key
npx hardhat keystore set ETHERSCAN_API_KEY    # paste the API key from (d)
```

To get the private key from MetaMask: account menu → Account details → Show
private key. (This is exactly why it's a practice wallet.)

---

## Step 1 — Deploy the token (5 min)

```bash
npx hardhat ignition deploy ignition/modules/CardToken.ts --network sepolia
```

It prints the deployed address, like `CardTokenModule#CardToken - 0xAB12...`.
**Record that address.**

Now tell the helper scripts about it — edit `launch.json`:

```json
{
  "network": "sepolia",
  "token": "0xYOUR_TOKEN_ADDRESS",
  "treasury": "0xYOUR_SECOND_ADDRESS",
  "pool": ""
}
```

For `treasury`, create a second account in MetaMask and use its address —
it plays the treasury wallet.

Sanity-check it worked:

```bash
npx hardhat run scripts/launch-check.ts
```

Expected: supply 250,000,000, deployer holds all of it, stage says
"next: transfer-treasury", and `✅ No problems detected`.

Also look at it like a buyer would: open
`https://sepolia.etherscan.io/token/0xYOUR_TOKEN_ADDRESS`.

## Step 2 — Verify the source code (5 min)

```bash
npx hardhat verify --network sepolia 0xYOUR_TOKEN_ADDRESS
```

Then open `https://sepolia.etherscan.io/address/0xYOUR_TOKEN_ADDRESS#code` —
you should see readable Solidity and a green check.

If the command fails, practice plan B instead: follow
`verification/README.md` and upload the JSON through the web form. Knowing
both routes is the point of the dry run.

## Step 3 — Fund the treasury (2 min)

```bash
npx hardhat run scripts/transfer-treasury.ts
```

It sends exactly 50,000,000 CARD and prints the transaction link — open it,
this is what a "proof link" looks like. Then:

```bash
npx hardhat run scripts/launch-check.ts
```

Expected: deployer 200M, treasury 50M, stage "next: create the Uniswap pool".

**Bonus lesson:** run `scripts/transfer-treasury.ts` a second time on
purpose. It should refuse with "treasury already holds…". That refusal is
the guardrail doing its job.

## Step 4 — The pool (10 min, simulated)

On the real day you'll do this in the Uniswap website (pair 200M CARD with
your ETH). Uniswap does run on Sepolia, so if you want the full experience:
open app.uniswap.org, switch the network to Sepolia, and create a position
with 200M CARD + ~0.05 test ETH. **Record the pool address** (it's in the
transaction details) and put it in `launch.json` under `"pool"`.

If you'd rather keep the dry run simple, fake it: create a third MetaMask
account to play the "pool", send it all 200M from the deployer (MetaMask →
send → the CARD token), and put that third address in `launch.json` as
`"pool"`. The balances then look exactly like a real pool to the scripts.

Either way, finish with:

```bash
npx hardhat run scripts/launch-check.ts
```

Expected: deployer 0, treasury 50M, pool ~200M, stage "test swap, lock LP,
then renounce".

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

- [ ] I deployed, verified, funded the treasury, and renounced, and I know
      what each step was *for*
- [ ] I saw the green check on the Contract tab
- [ ] I saw the guardrails refuse a wrong action at least once
- [ ] I have a notes file with: token address, treasury address, every tx
      link, and the order I did things in
- [ ] Nothing surprised me badly enough that I'd panic if it happened with
      real money

Anything that *did* feel confusing — write it down and ask about it now,
while it's free.

## When you're done

The Sepolia token is disposable; you don't need to clean anything up. Before
the real launch, reset `launch.json` (network `"mainnet"`, blank the
addresses) and remember Ignition keeps its deployment records per network,
so the mainnet deploy starts fresh on its own.
