# CARD Launch Announcement (draft)

Two ready-to-post versions: a short thread for X/Twitter and a long-form post
for Telegram/Discord/blog. Nothing goes out until every box in sections 1–6 of
`LAUNCH_DAY_CHECKLIST.md` is checked.

**Fill these six blanks on launch day, then post:**

| Placeholder | What goes there | Checklist step |
|---|---|---|
| `{{TOKEN_ADDRESS}}` | The token contract address | 1 |
| `{{RENOUNCE_TX_URL}}` | Etherscan link to the renounce transaction | 6 |
| `{{LOCK_URL}}` | Public Team Finance / UNCX lock page | 5 |
| `{{TREASURY_ADDRESS}}` | The treasury wallet address | 3 |
| `{{TREASURY_TX_URL}}` | Etherscan link to the 50M treasury transfer | 3 |
| `{{PAIR_URL}}` | DexScreener/Uniswap link to the CARD/ETH pool | 4 |

Before posting, search each file for `{{` to make sure no blank was missed.

---

## Short version (X/Twitter thread)

**Post 1**

> CARD is live.
>
> Fixed supply: 250,000,000. No mint. No tax. No blacklist. Ownership renounced — nobody, including us, can ever change the contract.
>
> Contract: `{{TOKEN_ADDRESS}}`
>
> Trade only this address. Anything else with our name is fake.

**Post 2**

> Don't take our word for it — verify:
>
> 🔒 Ownership renounced: {{RENOUNCE_TX_URL}}
> 💧 100% of liquidity locked 12 months: {{LOCK_URL}}
> 🏦 Treasury (20%, disclosed): {{TREASURY_ADDRESS}}
>
> Source code is verified on Etherscan. Check everything yourself.

**Post 3**

> Supply breakdown:
>
> • 80% (200M) → Uniswap pool, LP locked 12 months
> • 20% (50M) → treasury for development, listings, and liquidity top-ups
>
> Every treasury spend will be announced before or as it happens.
>
> Pool: {{PAIR_URL}}

---

## Long version (Telegram / Discord / blog)

> # CARD is live
>
> **Contract address: `{{TOKEN_ADDRESS}}`**
>
> ⚠️ This is the only real CARD. Scammers deploy lookalike tokens within
> minutes of any launch — trust nothing but this exact address, posted here.
>
> ## What CARD is
>
> A fixed-supply ERC-20 on Ethereum. 250,000,000 tokens were minted once at
> deployment. There is no mint function, no transfer tax, no fee, no
> blacklist, no pause switch. The contract is built on OpenZeppelin's audited
> ERC-20 and the full source is verified on Etherscan for anyone to read.
>
> ## Don't trust us — verify
>
> Every claim below has an on-chain proof link:
>
> 1. **Nobody can ever mint more or change the contract.**
>    Ownership has been renounced to the zero address:
>    {{RENOUNCE_TX_URL}}
>
> 2. **The liquidity cannot be pulled.**
>    100% of the LP tokens are locked for 12 months:
>    {{LOCK_URL}}
>
> 3. **The team allocation is public, not hidden.**
>    20% (50,000,000 CARD) sits in a disclosed treasury wallet:
>    `{{TREASURY_ADDRESS}}`
>    (funded during setup, before the pool existed: {{TREASURY_TX_URL}})
>
> ## Supply breakdown
>
> | Where | Amount | Share |
> |---|---|---|
> | Uniswap pool (LP locked 12 months) | 200,000,000 | 80% |
> | Treasury (disclosed) | 50,000,000 | 20% |
> | Team wallets, hidden allocations | 0 | 0% |
>
> ## Treasury policy
>
> The treasury exists for development, exchange/listing costs, and liquidity
> top-ups. Two standing commitments:
>
> - Every spend from the treasury will be announced **before or as it
>   happens**. If you see an unannounced outflow, treat it as a red flag and
>   call it out.
> - We have requested an Etherscan name tag for the address so it is publicly
>   labeled.
>
> ## Where to trade
>
> Uniswap pool: {{PAIR_URL}}
>
> Starting liquidity is intentionally modest — expect price impact on larger
> trades, and size accordingly.
>
> ---
>
> Nothing here is financial advice. CARD is an experiment; only spend what
> you can afford to lose.

---

## Posting notes (for launch day)

- Post only **after** the renounce (checklist step 6) — every claim above
  must already be true and provable when it goes out.
- Pin the announcement wherever it's posted, so the real contract address is
  always one click away when copycats appear.
- After posting: submit the token info to DEXTools/DexScreener where offered,
  and request the Etherscan name tag for the treasury (checklist step 7).
