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
node scripts/new-wallet.mjs deployer treasury pool
```

Copy all three addresses and keys into your notes file. These are
practice-only wallets: the keys are printed in plain text, so never put real
money on them.

**b. Get free Sepolia ETH — no account needed.** Open the proof-of-work
faucet at `sepolia-faucet.pk910.de`, paste the **deployer** address, and
click start. Your browser "mines" test ETH while the tab stays open — no
signup, no login. Leave it running until you have ~0.1 Sepolia ETH (usually
under an hour; grab a snack). Stop it and claim.
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

```bash
npm run deploy:sepolia
```

It prints the deployed address, like
`CardinalsPromiseModule#CardinalsPromise - 0xAB12...`.
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

For `treasury`, use the treasury address you generated in step 0a.

Sanity-check it worked:

```bash
npx hardhat run scripts/launch-check.ts
```

Expected: supply 250,000,000, deployer holds all of it, stage says
"next: transfer-treasury", and `✅ No problems detected`.

Also look at it like a buyer would: open
`https://sepolia.etherscan.io/token/0xYOUR_TOKEN_ADDRESS`.

## Step 2 — Verify the source code (5 min)

For practice, verify through Sourcify — free, keyless, no account:

```bash
npx hardhat verify sourcify --network sepolia 0xYOUR_TOKEN_ADDRESS
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
your ETH). For practice, simulate it with the third wallet from step 0a:
put the **pool** address into `launch.json` under `"pool"`, then:

```bash
npx hardhat run scripts/fund-pool-sim.ts
```

It sends the remaining 200M to the practice pool wallet, so the balances
look exactly like a real funded pool to the other scripts. (You already
watched a *real* Uniswap pool get created and traded against in step -1's
rehearsal, so nothing is lost by simulating here.)

Finish with:

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
- [ ] I saw the verified source with a green check (on Blockscout/Sourcify)
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
