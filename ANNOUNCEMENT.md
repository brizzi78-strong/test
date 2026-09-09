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
| `{{TREASURY_TX_URL}}` | Etherscan link to the 600M treasury transfer (200M kept + 400M staged for the pool) | 3 |
| `{{PAIR_URL}}` | DexScreener/Uniswap link to the CARD/ETH pool | 4 |

Before posting, search each file for `{{` to make sure no blank was missed.

---

## Short version (X/Twitter thread)

**Post 1**

> Cardinals Promise (CARD) is live.
>
> Fixed supply: 1,000,000,000. No mint. No blacklist. No pause. A fixed 2% transfer fee to the treasury that can never be changed. Ownership renounced — nobody, including us, can ever change the contract.
>
> Contract: `{{TOKEN_ADDRESS}}`
>
> Trade only this address. Anything else with our name is fake.

**Post 2**

> The cost, plainly: 2% of every buy and 2% of every sell goes to the treasury wallet, plus Uniswap's 0.3% each way. A simple round trip costs about 4.5% before gas, slippage and price impact. Set slippage to at least 3% or the trade will fail.
>
> The rate and the destination are baked into the contract. No setter, no exemption list, no owner.

**Post 3**

> Don't take our word for it — verify:
>
> 🔒 Ownership renounced: {{RENOUNCE_TX_URL}}
> 💧 100% of liquidity locked 12 months: {{LOCK_URL}}
> 🏦 Treasury (20% + every fee, disclosed): {{TREASURY_ADDRESS}}
>
> Source code is verified on Etherscan. Check everything yourself.

**Post 4**

> Supply breakdown:
>
> • 40% (400M) → Uniswap pool, LP locked 12 months
> • 40% (400M) → founder, unlocked, in a disclosed wallet
> • 20% (200M) → treasury, a single founder-held wallet, for fixed costs, listings, and liquidity top-ups; it also receives every fee
>
> Every treasury spend will be announced before or as it happens.
>
> Pool: {{PAIR_URL}}

---

## Long version (Telegram / Discord / blog)

> # Cardinals Promise (CARD) is live
>
> **Contract address: `{{TOKEN_ADDRESS}}`**
>
> ⚠️ This is the only real CARD. Scammers deploy lookalike tokens within
> minutes of any launch — trust nothing but this exact address, posted here.
>
> ## What CARD is
>
> A fixed-supply ERC-20 on Ethereum with a fixed 2% transfer fee.
> 1,000,000,000 tokens were minted once at deployment. There is no mint
> function, no blacklist, no pause switch. The contract is built on
> OpenZeppelin's audited ERC-20 and the full source is verified on Etherscan
> for anyone to read.
>
> ## What it costs to trade
>
> On every transfer between two ordinary wallets — which includes every buy
> and every sell on Uniswap — 2% of the CARD goes to the treasury wallet and
> the recipient gets 98%. Uniswap charges its own 0.3% each way on top. A
> simple round trip therefore costs **about 4.5%** before gas, slippage and
> price impact. Set slippage to at least 3% or the trade will fail.
>
> The rate and the destination are written into the contract and cannot be
> changed: there is no setter, no exemption list, and ownership is renounced.
> Transfers to or from the treasury itself are exempt, which is how the pool
> was seeded with the full 400M. The fee moves coins; it never creates or
> destroys them. It is the project's only built-in revenue: at 2% it covers
> small fixed costs (LLC, website) if there is trading, and does not come
> close to funding professionals.
>
> ## Don't trust us — verify
>
> Every claim below has an on-chain proof link:
>
> 1. **Nobody can ever mint more, change the fee, or change the contract.**
>    Ownership has been renounced to the zero address:
>    {{RENOUNCE_TX_URL}}
>
> 2. **The liquidity cannot be pulled.**
>    100% of the LP tokens are locked for 12 months:
>    {{LOCK_URL}}
>
> 3. **The team allocation is public, not hidden.**
>    20% (200,000,000 CARD) sits in a disclosed treasury wallet, which is
>    also where every fee goes:
>    `{{TREASURY_ADDRESS}}`
>    (funded during setup, before the pool existed — 600M in one transfer,
>    200M it keeps plus the 400M it then put into the pool: {{TREASURY_TX_URL}})
>
> ## Supply breakdown
>
> | Where | Amount | Share |
> |---|---|---|
> | Uniswap pool (LP locked 12 months) | 400,000,000 | 40% |
> | Founder (disclosed, unlocked) | 400,000,000 | 40% |
> | Treasury (disclosed; also receives every fee) | 200,000,000 | 20% |
> | Team wallets, hidden allocations | 0 | 0% |
>
> ## Treasury policy
>
> The treasury is a single wallet held by the founder — one key, not a
> multisig — and its address is published on cp17.org. It exists for the
> project's fixed costs, exchange/listing costs, and liquidity top-ups. Two
> standing commitments:
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
> trades, and size accordingly. Some wallet swap features and aggregators
> fail on sells of fee-on-transfer tokens; the Uniswap app itself handles
> the fee correctly.
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
