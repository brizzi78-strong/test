# Hardline Rules — CARD

Bright-line rules for the conduct of the Cardinals Promise token project.

These are written as absolutes on purpose. A rule that requires judgment in
the moment is a rule that fails in the moment, because the moment you are
tempted to reason around one of these is exactly the moment it is protecting
you. If a situation seems to call for an exception, that is the signal to
call counsel — not to make the call yourself.

Nothing here is legal advice. These rules encode conservative positions
taken deliberately; counsel should review them and may tighten them further.

> **Where the real protection sits.** These rules once opened with an
> absolute — the issuer never sells, ever — which a later draft softened into
> a written sell policy when a personal founder allocation appeared. A
> promise is the weakest form of either, and for a period the founder
> allocation was moved into a vesting contract so that code, not a promise,
> did the work.
>
> That contract is gone. The decision taken is a 40% founder allocation,
> held unlocked in the deployer wallet, with no lock contract in the
> repository. So Section I is back to doing real work: the discipline has to
> come from the person, and these rules are the only thing standing between
> the founder and the market. Treat them accordingly.

---

## I. The allocation

**1. The founder allocation stays in the deployer wallet.**

All 400,000,000 CARD stay where they were minted. Not moved to an exchange,
not split across wallets, not "temporarily" parked anywhere. Any movement is
a disclosure event under rule 3.

**2. The sell policy is never worked around.**

No loan against the position, no derivative, no forward sale, no sale of a
claim on the tokens. Borrowing against it is selling it with extra steps.

**3. Every sale, transfer, or pledge of founder tokens is disclosed within seven days.**

Date, amount, transaction hash. This includes every spend from the treasury
wallet, which also holds the fee income.

**4. No pre-sale, no private round, no allocation in exchange for anything of value.**

No early access, no discounted purchase, no tokens exchanged for services,
promotion, or advice.

**5. Nobody sells on the issuer's behalf.**

This includes family, friends, and anyone given tokens by the issuer.

---

## II. Speech

Nothing constrains what gets said, which is why these are the rules most
likely to be broken and the ones that decide the outcome.

**6. Never state, imply, predict, or speculate about price or value.**

Not up, not down, not "undervalued," not "still early," not a chart, not an
emoji standing in for any of these. No exceptions for private messages.

**7. Never tell anyone to buy, and never give a condition under which they should.**

"Only buy if…" is a recommendation with extra steps. The answer to "should I
buy this?" is no, permanently, in every channel, to every person, including
after launch when it feels rude.

**8. Never connect buying CARD to the book, the mission, hospice, grief, or family legacy.**

The audience that trusts the author emotionally is the audience that must
never be sold to. This rule protects them first and the issuer second.
Buying the book does not provide CARD; buying CARD is not a donation.

**9. Disclose the 40% founder allocation and the 2% fee everywhere the token is described.**

The allocation's size, the fact that it is unlocked and held personally,
the treasury address, and the fee stated as a cost: 2% on the buy, 2% on the
sell, plus Uniswap's 0.3% each way — about 4.5% round trip before gas. Never
softened, never rounded down, never called anything other than a fee. A
reader who learns about a founder position this large, or a fee this size,
later and from someone else, was misled by omission.

**10. Publish only what is independently verifiable.**

The contract address, supply, transaction hashes, the treasury address, the
fee rate, LP lock expiry, risk warnings, source code. If a statement cannot
be checked by a stranger against the blockchain or the repository, it does
not get published.

**11. Never describe a mechanism the contract does not implement.**

CARD has exactly one mechanism beyond a plain ERC-20: an immutable 2%
transfer fee to an immutable treasury address, with transfers to or from
the treasury exempt. It has no adjustable fee, no exemption list, no
staking, no governance, no lock on the founder hold. Documents describing
anything else are wrong and get corrected, not published. Check every claim
against `contracts/CardinalsPromise.sol`, which is the only authority.

**12. Never promise future work, features, listings, partnerships, or plans.**

The token is finished at deployment. Saying otherwise re-creates the
"efforts of others" the renouncement was designed to remove.

**13. Nothing is described as real until it exists.**

No board, grant, charity percentage, partner network, or legal entity is
mentioned publicly until it exists and has the written, legal, and tax work
behind it.

---

## III. Giving

**14. The treasury is one wallet, one key, one published address — and every spend from it is announced.**

It holds 20% of supply plus every fee the contract collects. It is held by
the founder, not a multisig, and its address is on cp17.org. It exists for
the project's fixed costs, listings, and liquidity top-ups. Silent outflows
from it are a rule 3 violation.

**15. Charitable giving is personal, discretionary, and never promised.**

Any giving is made at the founder's discretion and is not committed,
scheduled, or quantified to anyone in advance. Published after the fact with
its transaction hash, never promised before it. The fee is not a charity
mechanism and is never described as one.

**16. Never say that buying CARD supports a cause.**

It does not. Saying so would be both an inducement to buy and a
representation nobody could rely on.

---

## IV. Structure and keys

**17. Deployment happens through an entity, not a personal name.**

Formed before anything touches mainnet.

**18. No personal funds of anyone other than the issuer touch the launch.**

Specifically: no spouse's account, no family money, no borrowed funds.
Shared funding creates shared liability regardless of anyone's good faith.

**19. Launch keys live on a hardware wallet.**

Never in a browser extension, never on a daily-use machine, never
photographed, never typed into any website.

**20. The seed phrases are recorded offline and their location is documented with the issuer's estate paperwork.**

Two wallets, two keys: the deployer (founder hold) and the treasury. The
treasury address is baked into the contract and will receive fees for as
long as the token trades, so its key is the one someone must always be able
to reach. Lose it and the fees are gone forever; nobody can redirect them.

**21. LP tokens are locked through an established locker before launch is announced, and the lock is published.**

---

## V. Records

**22. Keep everything, dated.**

Communications about the token, every "don't buy" exchange, every transfer,
tax events, and decisions taken. Good faith is not assumed by anyone. It is
demonstrated from records or it is not demonstrated.

**23. Report every taxable event honestly and on time, using a CPA experienced with digital assets.**

Two questions get settled with the CPA *before* launch: whether the 600M
treasury transfer is itself a taxable transfer, and how the 2% fee income is
recognised as it arrives in the treasury.

---

## VI. Changing these rules

**24. These rules are not amended without written advice from counsel, and the amendment is published with its date.**

**25. When a situation is not covered here, the answer is "not yet" until counsel says otherwise.**

Doing nothing is always available and is never the thing that creates
liability.

---

## The one-line version

The founder tokens are unlocked, so do not touch them. Disclose the 40% and
the 2% everywhere. Never talk about what it is worth. Never invite anyone
in. Publish everything that can be checked, including the parts that make
you look worse. Write down what you did.
