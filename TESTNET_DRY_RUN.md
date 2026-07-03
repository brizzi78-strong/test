# Sepolia Testnet Dry Run

Beginner-proof walkthrough for rehearsing the CARD launch on Sepolia — Ethereum's test
network — before touching real money. Sepolia's ETH is free and worthless, but the
mechanics (deploying, verifying, renouncing) are identical to mainnet, so everything in
[LAUNCH_DAY_CHECKLIST.md](LAUNCH_DAY_CHECKLIST.md) section 0 gets rehearsed here.

**Cost of this entire exercise: $0.** If anything goes wrong, you lose nothing and just
try again.

## 1. What you need (one-time setup, ~20 minutes)

### A wallet with a test account

Install [MetaMask](https://metamask.io) if you don't have it. Then create a **new,
throwaway account** just for this dry run — don't reuse an account that holds real funds,
because you'll be exporting this account's private key into a developer tool.

Enable test networks in MetaMask (Settings → Advanced → "Show test networks") and switch
the network selector to **Sepolia**.

### Free Sepolia ETH

Get test ETH from a faucet — [Google's faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)
or [Alchemy's](https://www.alchemy.com/faucets/ethereum-sepolia) work. 0.1–0.5 Sepolia ETH
is plenty for many deploys.

### An RPC URL

An RPC URL is the "phone number" your computer uses to talk to the Ethereum network.
Sign up free at [Alchemy](https://www.alchemy.com) or [Infura](https://www.infura.io),
create an app for **Sepolia**, and copy the HTTPS URL (looks like
`https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY`).

### Your test account's private key

In MetaMask: account menu → Account details → Show private key. Copy it somewhere
temporary. **This is exactly why we made a throwaway account** — a private key that has
ever touched a clipboard or terminal should never guard real money.

## 2. Give the project your secrets (safely)

The project reads two values: `SEPOLIA_RPC_URL` and `SEPOLIA_PRIVATE_KEY`. Never paste
them into any file in this repo. Use Hardhat's encrypted keystore, which prompts for a
password and stores them encrypted on your machine:

```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```

(Alternative: plain environment variables `export SEPOLIA_RPC_URL=...` etc. work too,
but the keystore is safer because nothing lands in your shell history.)

## 3. Deploy CARD to Sepolia

```bash
npm install        # first time only
npm test           # confirm all tests pass before deploying anything
npx hardhat ignition deploy ignition/modules/CardToken.ts --network sepolia
```

Ignition prints the deployed contract address when it finishes. **Save it.**

Sanity checks on [sepolia.etherscan.io](https://sepolia.etherscan.io) (paste the address):

- Total supply shows 250,000,000 CARD
- Your deployer account holds all of it
- The "owner" is your deployer address

## 4. Verify the source code

```bash
npx hardhat ignition verify chain-11155111
```

(`chain-11155111` is the deployment ID Ignition created for Sepolia; `ignition deployments`
lists them if unsure.) Afterwards the Etherscan "Contract" tab should show readable
Solidity with a green check — rehearsing launch-day step 2.

## 5. Rehearse the launch motions

Do these from MetaMask or Etherscan's "Write Contract" tab, mirroring the checklist order:

1. **Treasury transfer** — create a second MetaMask account ("treasury rehearsal"),
   transfer 50,000,000 CARD to it, confirm balances read 200M / 50M.
2. **Renounce** — call `renounceOwnership()` from the deployer. Confirm on Etherscan that
   the owner is now `0x0000…0000`. On mainnet this is the irreversible step; here it's
   free practice.
3. **Confirm transfers still work after renouncing** — send some CARD between your two
   accounts. (The test suite proves this too, but seeing it live builds the right
   intuition: renouncing kills control, not the token.)

Optional extra credit: Uniswap works on Sepolia ([app.uniswap.org](https://app.uniswap.org)
with the network set to Sepolia), so you can rehearse creating the pool with test ETH as
well. LP locking services generally don't run on testnets, so that step stays theoretical
until mainnet.

## 6. What "passed" looks like

You're done when all of these are true:

- [ ] Deploy succeeded and the address is saved
- [ ] Etherscan shows verified source with a green check
- [ ] 250M total supply, split 200M/50M across your two accounts
- [ ] Owner is the zero address after renouncing
- [ ] Transfers work after the renounce

If all boxes tick, the exact same commands — with `--network mainnet` and mainnet
values for the RPC URL and key — perform the real launch. That's the point of the
rehearsal: launch day should contain zero new actions.

## Cleanup

Delete the throwaway private key from wherever you pasted it, and treat that MetaMask
account as compromised-by-convenience: fine for testnets forever, never for real funds.
