# CARD real-purchase flow

Status: **design only; not authorized for production.** Cardinal Trading is a paper-trading
application. Its optional real-CARD buttons merely open Uniswap and are disabled unless
`ENABLE_REAL_CARD_LINKS=1` and the verified `CARD_TOKEN_ADDRESS` are both present.

## Current safe boundary

1. The customer controls their own wallet and keys.
2. Cardinal Trading never receives customer funds, identity documents, or seed phrases.
3. A CARD link opens Uniswap; Cardinal Trading does not quote, execute, custody, reverse,
   or refund the transaction.
4. The contract address must first be published at `cp17.org`.
5. The interface discloses the Uniswap fee, gas, slippage, price impact, founder
   holding, and project conflict of interest.

## Possible future on-ramp flow

```text
card or bank
    ↓
regulated on-ramp provider (KYC/AML and payment processing)
    ↓
ETH or USDC in the customer's own wallet
    ↓
customer-approved DEX swap
    ↓
CARD in the customer's own wallet
```

The project must not hold a platform-side cash balance, private key, seed phrase,
government ID, or spendable customer asset. A simulated `cashCents` balance is a paper
trading abstraction and must never be converted into a real custodial balance.

## Cost disclosure

CARD charges no transfer fee. A transfer of any amount moves exactly that amount, so the
only costs in a round trip are the two 0.3% Uniswap fees — roughly 0.6% — before network
gas, price impact, routing, and provider charges.

Every quote must show each cost separately and calculate the expected net amount received.
Because the token is not fee-on-transfer, routing does not need the
fee-on-transfer-supporting swap functions; ordinary Uniswap routing is correct. This should
still be proven against a real testnet pool before any live use.

## Pool-pair decision

The canonical launch plan uses one CARD/WETH pool. A future card/bank on-ramp may deliver
USDC, creating three choices: route USDC through WETH, replace the launch pair with
CARD/USDC before deployment, or create a second pool. Do not split thin liquidity across
two pools. Counsel, the liquidity plan, and the selected provider must resolve this before
an integrated on-ramp is built.

## Production blockers

- Written legal approval of the token, sale structure, geographic availability, marketing,
  and the project's role in arranging transactions.
- Contract audit and fee-aware Sepolia buy-and-sell evidence.
- Regulated on-ramp and noncustodial wallet providers under signed agreements.
- Security review, monitoring, incident response, rate limiting, backups, and recovery.
- Accurate terms, privacy policy, risk disclosure, and consent records reviewed by counsel.
- A production domain and explicit launch switch; no live functionality on a prototype URL.

No “one-click buy” work begins before those blockers are closed. Linking to Uniswap and
orchestrating an issuer-affiliated purchase funnel are materially different products and
must not be treated as the same compliance posture.
