# Governance and Founder Economics — MAGR

How to choose a board, what the revised supply split does, whether to charge a 3% trade
fee, and whether to pay yourself a salary.

> **Not legal, tax, or financial advice.** This is analysis to make the conversation with
> counsel and an accountant faster. See `docs/LEGAL-BRIEFING.md` for the securities-law
> groundwork this document builds on.

---

## Thesis

**The only asset MAGR has is that its claims are checkable.** At a ~$20,000 fully diluted
valuation, the token has no liquidity moat, no user base, and no network effect. What it
has is a contract with nothing hidden in it, a locked pool, a renounced owner, and a page
that tells people not to buy. That verifiability *is* the product.

Three of the four proposals — 40% founder retention, a 3% trade fee, and a salary paid out
of trading activity — each spend that asset. And the arithmetic below shows they buy almost
nothing with it: a 3% fee at realistic volume for a token this size funds roughly **$2,000
to $11,000 a year**, which is not a salary. You would be trading the entire trust story for
less than the cost of the legal work you already need.

The board is the opposite case. A five-member board inside a separate LLC is the one
proposal that *adds* to the asset, because it converts "trust us with the treasury" into
"three other people have to agree," and it keeps a token dispute from ever reaching the
book.

**Form the new LLC and give it a boring name. Seat five, filling three before launch.
Disclose the unlocked 100M hold and put a written sell policy around it. Skip the fee. Get
paid — but from the book and the software, as owner's draws from an operating entity, while
CP17 LLC pays operating costs directly and leaves the treasury untouched.**

---

## The numbers, restated

Your message gave figures that need reconciling against what's in the repo. Here is the
reading this document uses:

| Your words | Interpretation | Source |
|---|---|---|
| "250,000 coins" | 250,000,000 MAGR total supply | `contracts/MagerCoin.sol` — `TOTAL_SUPPLY = 250_000_000e18` |
| "I invested 10k" | ~$10,000 of your own money: ETH for the pool plus launch costs | `TOKEN_LAUNCH_STRATEGY.md` budgets 2–5 ETH into the pool |
| "hold onto 100 mill" | 100,000,000 MAGR (40%) retained by you personally | New — supersedes the old split |
| "only 100 mill initially released" | 100,000,000 MAGR (40%) into the Uniswap pool at launch | New — was 200M (80%) |
| Remainder | 50,000,000 MAGR (20%) treasury | Unchanged from `TOKEN_LAUNCH_STRATEGY.md` |

**This is a material change from the shipped plan.** The launch strategy puts 80% in the
pool specifically because "screeners flag deployer-heavy tokens as rug risks," and warns
that holding back more than 20% "looks extractive." You are proposing to hold back 40%
personally *on top of* the 20% treasury — 60% of supply in team-controlled hands.

Assuming ~$8,000 of the $10,000 goes into the pool and ~$2,000 covers the lock, gas,
verification, and fees:

- Launch spot price: **$0.00008 per MAGR**
- Fully diluted valuation: **$20,000**
- Value of your 100M retained: **$8,000 on paper** — exactly equal to the entire pool, which
  is the problem in one line

### What $8,000 of liquidity actually feels like

| Buy size | MAGR received | Average price paid | Spot price move |
|---|---|---|---|
| $100 | 1.23M | $0.000081 | +2.5% |
| $500 | 5.88M | $0.000085 | +12.9% |
| $1,000 | 11.11M | $0.000090 | +26.6% |
| $5,000 | 38.46M | $0.000130 | +164% |

Halving the pool from 200M to 100M MAGR doubles the launch price but does not deepen the
book — a $1,000 buy still moves spot ~27%, and a $1,000 sell moves it down comparably. The
pool is thin in both directions. That is survivable and honest. It only becomes dangerous
when combined with the next section.

---

## Part I — The board

**Decision taken: five members.**

Five is odd, so nothing deadlocks, and it buys two things three cannot. It gives you four
independent voices against one founder, which is a far stronger signal than two against
one. And it makes the treasury survivable: on a three-key wallet, losing two keys locks the
money away permanently, while a five-key wallet can lose two and keep operating. For a
project whose entire pitch is that the money is safe from any single person, that
resilience is worth real money.

The cost is recruiting. Five people who are genuinely independent, genuinely qualified, and
genuinely willing to spend four hours a month on a twenty-thousand-dollar project is a hard
ask, and a seat filled by someone who will not show up is worse than an empty one — it
launders the appearance of oversight without the substance. So fill them in order rather
than all at once. See the staging note below.

### Before you can have a board, you need something for it to be a board *of*

A board with no entity is a mailing list. **Decision taken: a new, separate LLC** — not an
existing entity, not you personally.

That is the right call, and the "separate" part is doing most of the work:

- **Liability ring-fence.** The token is the riskiest thing in this repo. A securities
  complaint, an angry buyer, or a contract bug should reach the LLC's assets and stop
  there — not the book royalties, not the other software in this repo, not your house.
  Sharing an entity with the book would put the memoir's income inside the blast radius of
  a $20,000 token experiment. That trade is absurd, and it is exactly what a separate LLC
  prevents.
- **Clean books.** The board's credibility depends on the treasury being auditable. If
  gift money, book money, and personal money touch the same account, nothing on the ledger
  page is verifiable and the board cannot certify anything.
- **A clean handoff.** You can give the board real power over the LLC without giving them
  any say over the book or the rest of your work.
- **A clean exit.** If MAGR goes nowhere, you dissolve one LLC. Nothing else is affected.

**Structure: new LLC + a Safe multisig on the treasury** — 2-of-3 at launch, 3-of-5 once
all five seats are filled. Skip the nonprofit for now — do not file a 501(c)(3) for a
$20,000 project; the formation cost, exemption application, and annual filings would exceed
the treasury's entire value at spot. If the giving grows enough to need real charitable
standing, use **fiscal sponsorship** (an existing 501(c)(3) receives and disburses the gifts
for a percentage) rather than building your own.

The multisig is what makes the governance real. A corporate bylaw is a promise; a Safe with
a signing threshold is checkable on-chain by a stranger at 2am. Same design principle as the
renounced ownership and the locked LP.

### What the LLC should and should not hold

| Put it in the LLC | Keep it out |
|---|---|
| The 50M treasury (via the Safe) | The book, its royalties, and its IP |
| The `cp17.org` domain and the coin site | Your personal 100M MAGR position (see below) |
| Deployment ops, the lock, listings, audits | The other apps and businesses in this repo |
| The gift program and its records | Personal accounts of any kind |
| The board, the gift policy, your comp agreement | |

On your personal 100M: **hold it personally** rather than contributing it to the LLC (and,
by decision, unlocked — see Part II). Keeping it out means the LLC — the entity a regulator
or plaintiff would call "the issuer" — discloses a clean 20% treasury rather than a 60%
position. Either choice is
defensible, but pick one *before* launch and publish which one it is. Silence on this
question is worse than either answer.

### Two things to settle before anyone deploys anything

1. **Who deploys?** The deployer address is permanent, public, and is the first thing
   anyone uses to decide who "the issuer" is. If the LLC is the issuer, the LLC's wallet
   deploys the contract and seeds the pool. Deploying personally and transferring later
   leaves a permanent record that contradicts your own org chart.
2. **How does the $10,000 get in?** As a **documented capital contribution** to the LLC,
   into the LLC's own bank account, with its own EIN — not as you personally paying costs
   on the LLC's behalf. Commingling at the very first transaction is the single most common
   way an LLC's liability shield gets pierced, and it would make the separation you just
   paid for decorative.

### On the entity name

You'd considered "Cardinal" or "Cardinals Platform" for the LLC. The token rename to Mager
Coin resolves most of that question, but the entity still needs a name, and the
recommendation is unchanged: **make the LLC name boring.** The entity name is the one place
where distinctiveness buys you nothing, and a complaint about the token should not arrive
carrying a brand you care about.

Why not "Cardinal" for the entity:

- **Cardinal Health** — a Fortune 20 healthcare company. This was always the real collision,
  not the sports teams. The project is hospice- and care-adjacent, which is precisely their
  lane, and confusion risk is highest where services overlap.
- **Cardinal Financial, Cardinal Capital, and similar** — "Cardinal" is well-worn in
  financial services, which is where a token platform sits.
- **Cardinals (MLB / NFL)** — strong marks in sports entertainment and apparel. Lower risk
  for software and giving, but it climbs sharply the moment merchandise appears.

| Option | Assessment |
|---|---|
| **CP17 LLC** | **Recommended.** Already matches `cp17.org` and the `cp17-site` folder in this repo. Distinctive, uncrowded, and says nothing a plaintiff can quote |
| **Mager Coin LLC** | Workable, but it welds the entity to the token *and* to a private individual's surname. If the token fails, the entity's name fails with it |
| **Cardinal's Promise LLC / Cardinals Platform LLC** | No longer appropriate. The token is not Cardinal-branded any more, and this would re-entangle the book with the entity carrying the token's liability |

The rename has a clean side effect worth naming: with the token called Mager Coin and the
entity called CP17 LLC, **the book's brand appears nowhere in the token's legal or public
identity.** That is a stronger version of the separation the LLC was formed to create.

Use **CP17 LLC** as the legal entity and "the Cardinal's Promise" as the public name of the
project — a d/b/a if you want it registered. That keeps the story you care about and
removes the entity from the line of fire.

Before filing, do three cheap things in this order: a **state entity-name availability
search** (free, minutes), a **USPTO search** covering the classes that matter here —
software, financial services, and charitable or care services — and a **domain check**. A
trademark screen costs a small fraction of a rebrand after launch, and after launch the
name is on a contract address that cannot be edited.

### The five seats

Design the seats first, then find people for them. Choosing people first and inventing
roles afterward is how boards fill up with friends. Each seat below covers a way this
project can fail that no other seat can see.

**Seat 1 — The Constraint.** Someone with financial, legal, or fiduciary experience who
holds **no MAGR** and has no upside if the price rises. Their entire job is to be able to
say no to you and mean it. This is the seat that makes the board real; if you fill only one
seat, fill this one. Look for: a CPA, an estate or nonprofit attorney, a retired finance
officer, a credit-union or community-bank board veteran. *Guards against: money moving for
bad reasons.*

**Seat 2 — The Domain.** A hospice or palliative-care professional — a chaplain, a hospice
social worker, a bereavement coordinator, a volunteer director. Their job is to make the
giving real: to choose recipients, to say which gifts actually help a family and which are
performative, and to lend their professional reputation to the claim that this project
knows what it is talking about. Given the book and the mission, this seat is also your
strongest credibility signal to non-crypto audiences. *Guards against: giving that looks
good and helps nobody.*

**Seat 3 — The Verifier.** Someone who can read Solidity and independently confirm what the
contract actually does. This seat only becomes possible at five, and it closes the largest
hole in the current design: every trust claim you make — supply is fixed, ownership is
renounced, liquidity is locked, the founder's holding is exactly what it is said to be — currently rests on
*you* saying so. A technically competent board member who has checked the chain themselves,
and who would resign publicly if a claim stopped being true, is the difference between a
promise and an audit. Look for: a smart-contract developer, a security engineer, anyone who
has shipped or reviewed an ERC-20 in production. They must hold no MAGR either. *Guards
against: a claim on the website drifting out of line with the chain.*

**Seat 4 — The Recipient Voice.** Someone who has been through it — a bereaved family
member, a former caregiver, someone a gift like this would have reached. They are the only
person in the room representing the constituency the project exists for, and they are the
one who will notice when a decision starts optimizing for how it looks rather than who it
helps. This is also the seat where "no" is most likely to be the right answer and least
likely to be said by anyone else. *Guards against: the mission quietly becoming marketing.*

**Seat 5 — You.** Vision, execution, and the only person doing the daily work.

Note the structural consequence: on any question where you are conflicted — your own pay, a
spend that benefits you, selling treasury tokens — you recuse and the other four decide.
**That means you can be outvoted 4-1, or overruled 4-0 with you not voting at all, on your
own compensation.** If that sentence makes you want to redesign the board, the board is not
the thing you actually want, and it is better to know that before you ask anyone to serve.

### The even-number problem, and the rule that solves it

Five is odd, but the moment you recuse it is four — and four ties. A 2-2 split on your
compensation, or on any conflicted question, has to resolve somehow, and inventing the rule
in the moment is how boards break.

**Adopt this in writing before the first meeting: on any motion where a member is recused,
a tied vote fails.** The motion does not carry. Applied to your pay, that means a deadlocked
board leaves your compensation where it is — it cannot be raised without a real majority,
and it cannot be cut by a minority either. It is the conservative default in both
directions, it needs no tie-breaker with a casting vote, and it never puts one member in
the position of personally deciding what the founder earns.

### Staging the seats

Do not hold the launch hostage to five signatures, and do not seat five people quickly just
to have five.

- **Before launch, fill three:** the Constraint, the Domain, and you. This is the minimum
  that makes the multisig meaningful and the gift policy real.
- **Within 90 days, fill the Verifier and the Recipient Voice.** Name the seats publicly as
  vacant with a target date rather than leaving them undescribed. A published "two seats
  open, here is what they are for" reads as a plan; five names where two never attend reads
  as decoration.
- **Run the multisig as 2-of-3 until the board is five, then migrate to 3-of-5.** Announce
  the migration and link the transaction. Do not build a 3-of-5 wallet around three people —
  a threshold you cannot meet is a treasury you cannot use.

### The candidate slate

| Candidate | Seat | Status |
|---|---|---|
| Chris Brizzi | unassigned | **Not the Constraint seat — see below** |
| Matt Campbell | unassigned | Background needed |
| Charles Cole | unassigned | Background needed |
| *(founder)* | Seat 5 | Filled |
| *(vacant)* | one seat | **Recruit an outsider** |
| ~~Jeff Mager~~ | — | Off the board — namesake instead |

**Jeff Mager is off the board by decision, and that is the right resolution.** The token
carries his name, and a namesake cannot also be an independent director of the thing named
after him: his personal reputation is fused to the token's price and conduct, which is
exactly the entanglement an independent seat exists to prevent. Keeping the name and losing
the seat costs nothing structural. Keeping both would have cost the board its independence.

That leaves three named candidates plus you, and **one seat still open. Fill it with an
outsider** — someone with no personal or financial relationship to you at all. This is now
the most important recruiting task on the list, because of the next point.

Nothing else can be assigned yet, because seats are defined by what a person can do that
the others cannot, and that requires knowing each person's profession, their relationship
to you, and whether they hold or intend to hold MAGR. Run all three named candidates
through the scorecard above and the three conversations below before assigning anyone. The
slate still needs to answer:

- **Who can genuinely say no?** At least one member must have no personal or financial tie
  to you. If the whole board is friends and family, you have five people who like you rather
  than a board, and the multisig becomes a formality where everyone signs everything.
- **Who can read the contract?** The Verifier seat needs real technical capability. If
  nobody on the slate can read Solidity, recruit outside the slate for that seat or drop it
  and buy a third-party audit instead — do not fill it with someone who will nod.
- **Who brings hospice credibility?** Same test, and only if the person actually works in
  the field.
- **Does anyone hold MAGR, or expect to?** Disqualifying for the Constraint and Verifier
  seats. Ask before offering, not after.

**On Chris Brizzi specifically:** the shared surname suggests family. That is not a
disqualification for the board, and family often brings the most genuine commitment to a
mission like this one — but it is disqualifying for the **Constraint seat**, whose entire
function is independence from you. Someone who will be at Thanksgiving cannot be the person
whose job is to publicly refuse your compensation request. Seat family somewhere their
judgment is an asset rather than a conflict, disclose the relationship on the ledger page
alongside the other board members, and make sure the Constraint seat goes to someone with
no tie to you at all.

Disclosing relationships is not an embarrassment to manage — an undisclosed one discovered
later is. "Two of five are family, here is who and why" is a fact a reasonable person can
accept. Silence on it, followed by someone noticing the surname, is a credibility problem
you cannot undo.

### The name — what it costs and what it needs

The token is now **Mager Coin (MAGR)**, named for Jeff Mager and carrying the tagline
**"Built to hold,"** drawn from his finishing a 140.6-mile triathlon. The endurance framing
is genuinely well matched to the design — fixed supply, locked liquidity, renounced
ownership. A coin built to be held rather than flipped
is the honest description of what was actually built.

Four things this decision requires, none of them optional:

1. **Written permission from Jeff Mager, before deployment.** His surname goes onto an
   immutable contract at a permanent address. If the price goes to zero — the outcome the
   coin page itself tells people to expect — his name is attached to that forever and
   nobody can edit it. Get the consent in writing, and make sure he understands that
   specific scenario rather than the good one.
2. **Do not use the word "Ironman" in any branding.** IRONMAN is a registered trademark and
   the rights holder enforces it aggressively; a token, a website, and any merchandise are
   exactly the surfaces that draw a letter. Describing the accomplishment factually — "a
   140.6-mile triathlon," "swim, bike, marathon" — carries the whole story without using the
   mark, which is why the site copy is written that way. The same goes for race photography:
   event photos are usually the photographer's copyright, not the athlete's, so do not put
   one on the site without a licence.
3. **Keep "built to hold" about construction, not price.** As a claim about how the contract
   is made, it is accurate and checkable. As an instruction to buy and wait, it becomes the
   marketing risk `docs/LEGAL-BRIEFING.md` flags — the residual securities exposure in this
   design concentrates almost entirely in what the project *says*, not what it does. The
   coin page pairs the tagline with the souvenir framing in the same breath for that reason.
   Keep them together everywhere.
4. **Accept the pattern cost.** Tokens named after people are, as a category, associated
   with pump-and-dumps, and some readers will discount the project on the name alone. The
   defence is not an argument, it is the evidence: renounced ownership, locked liquidity, a
   a real board, a disclosed founder wallet, and a published ledger. That evidence is
   stronger here than the name is weak — but it has to actually exist before launch, not
   after.

A consequence worth noting: the coin no longer shares a name with the book, which
*strengthens* the separation the LLC was formed to create. The memoir keeps its own domain
and its own brand, and a dispute about the token no longer arrives wearing the book's name.
That was the recommendation for the entity name, and the rename extends it to the token.

### Who must not be on it

- **Anyone paid in MAGR.** A board member holding tokens is a trader with a vote. It
  destroys the independence of the only body whose independence matters.
- **Crypto influencers or "advisors" who want an allocation.** The ask itself is the
  disqualification.
- **Anyone who cannot say no to you.** Family, close friends, employees, anyone who owes
  you. Warmth is not the qualification here; friction is.
- **Anyone who wants the title but not the four hours a month.**

### Scoring candidates

Rate each 1–5. Anyone scoring below 3 on independence or willingness to dissent is a no,
regardless of the total.

| Criterion | Weight | What you are testing |
|---|---|---|
| Independence | ×3 | No token position, no financial dependence on you, no shared upside |
| Willingness to dissent on the record | ×3 | Will they put a "no" in published minutes with their name on it |
| Domain or fiduciary credibility | ×2 | Would a skeptical outsider find their presence reassuring |
| Reputational skin in the game | ×2 | Do they have a professional reputation that a bad outcome would damage |
| Availability (~4 hrs/month) | ×1 | Meetings, signing, reading before signing |
| Understands the mission | ×1 | Has read the book or worked in end-of-life care |

### The three conversations

1. **The mission conversation.** No ask. Just the book, the project, and why. You are
   testing whether they care.
2. **The failure conversation.** Walk them through the worst case out loud: the price goes
   to zero, someone calls it a scam publicly, a buyer says they were misled. Then ask the
   only screening question that reliably works: **"What would make you resign?"** A good
   answer is specific and comes quickly — "if you moved treasury funds without telling me,"
   "if the gift ledger stopped being published." No answer, or "I can't imagine that," means
   they have not taken the seat seriously and will not be a constraint when you need one.
3. **The powers conversation.** Show them the multisig, the gift policy, and the
   compensation clause. Ask if they would sign as-is. Their edits tell you more about them
   than their résumé.

### What the seat comes with

- **A key on the Safe multisig holding the 50M treasury** — 2-of-3 at launch, 3-of-5 once
  all five seats are filled. No treasury movement — no gift, no listing fee, no
  compensation — happens with one signature.
- **A written gift policy** adopted before the first gift, not after.
- **Sole authority over founder compensation**, with you recused and ties failing.
- **Quorum of three**, with a majority of those present carrying an ordinary motion. Below
  three, the meeting is a conversation, not a decision.
- **Quarterly minutes published** to `cp17-site/ledger.html`, including dissents by name.
- **Staggered terms.** One year, renewable — but stagger the initial terms so the whole
  board cannot turn over at once: give two members two-year first terms and the rest one
  year. Five seats make staggering possible; three did not.
- **A standing commitment that any resignation letter is published unedited.** That clause
  is what gives a board member real leverage and gives buyers a real signal.

### Compensation for board members

Cash or nothing — a small honorarium (a few hundred dollars a meeting) or expenses only,
paid from the treasury. **Never tokens.** At this scale, most of the right people will
serve for free because they believe in the mission; if someone needs an equity-like stake
to serve, they are the wrong person for the Constraint seat by definition.

### Why would anyone say yes?

There is no money in this seat and no upside in the token, so the ask has to rest on what
is actually being offered. It is more than it looks, but it is different for each seat, and
a generic pitch will fail.

**The real currency is power over the giving.** Most volunteer board seats are advisory
theater — you attend, you opine, someone else decides. This one comes with a key on a
multisig. A member can genuinely stop a spend. For the right person, "you will have a vote
on which grieving families get money, and you can block me" is a far better offer than a
few hundred dollars a meeting, and it is an offer almost nobody else is making.

What each seat is actually being sold:

- **The Constraint** — the job of being the adult in the room, with real authority rather
  than the appearance of it. People who have sat on credit-union or nonprofit boards know
  how rare that is. Frame it as oversight, not endorsement: they are not vouching for the
  token, they are the reason the treasury cannot move without a second signature.
- **The Domain** — a direct say in who receives gifts. For a hospice chaplain, social
  worker, or bereavement coordinator, this is the pitch, and it has nothing to do with
  crypto: money exists, it will go to families, and you get to decide which ones. Lead with
  that sentence and never with the token.
- **The Verifier** — a small, clean public credential. "I check this contract and I would
  resign publicly if a claim stopped being true" is a good thing for a security engineer to
  have their name on, and the work is a few hours a quarter.
- **The Recipient Voice** — being heard. Someone who went through it, given a formal say in
  how the next family is treated. For many people that is the whole reason to do it.
- **Anyone who knows you** — they want to help. Legitimate, and often the strongest motive
  of all. Just not for the Constraint seat.

**What makes it safe enough to say yes to.** Independent people decline because the
downside is unbounded, so bound it explicitly in the ask:

- **Four hours a month, one-year term.** Small and finite.
- **Resign at any time, and the resignation letter is published unedited.** This is the
  clause that does the most recruiting work. It means they can leave loudly, on their own
  terms, with their reasons intact — so joining is not a bet on you never disappointing
  them.
- **No tokens, so no conflict and no tax bill.** Say this up front; it reassures the
  cautious rather than disappointing them.
- **Expenses covered, honorarium if the LLC ever has cash.**

**Expect the Constraint seat to be hard, and expect some refusals.** You are asking someone
to attach a professional reputation to a token with an unlocked 40% founder position, for
free. That is a real ask, and the honest way to make it is to lead with the disclosure
rather than the pitch: send them the coin page — the one that says the position is unlocked
and tells people not to buy — before you send them anything else. A skeptic's first question
about any token is whether it is a scam, and handing them the document that already says the
weakest parts out loud answers it faster than any argument you could make.

Two consequences worth naming. First, the unlocked 100M **makes this recruitment harder**,
because the person best suited to the Constraint seat is exactly the person most likely to
balk at it. The written sell policy is therefore not only a signal to buyers — it is the
thing that makes the seat acceptable to the person you most need. Second, if nobody
independent will take the seat after a genuine search, that is information about the
package rather than about the labour market, and the answer is to change the package.

### The stigma problem, and the structural fix

Serious professionals do not want their names next to a cryptocurrency. A hospice chaplain,
a CPA, an estate attorney — each has a reputation built over decades in a field where "he's
involved in some crypto thing" is a cost with no offsetting benefit. Unpaid makes it worse,
because **an unpaid public affiliation reads as an endorsement**, while a paid engagement
reads as a service. That is not squeamishness on their part; it is a correct assessment.

Two responses. The first is structural and matters more than any wording.

**Split the two bodies. They are not the same job.**

Once the giving is funded from book and software revenue rather than the treasury (see
below), the body that decides which families receive money **has nothing to do with the
token at all**. So stop asking it to.

| Body | What it does | Funded by | Crypto exposure |
|---|---|---|---|
| **The Giving Committee** | Decides which families and organizations receive gifts; sets the gift policy | Book, speaking, and software revenue | **None.** Its members never touch a wallet, hold a token, or appear on the coin page |
| **The Treasury Signers** | Hold keys on the Safe; approve any movement of the 50M and any founder-compensation motion | The token treasury | Full. These people must be comfortable with crypto |

The Domain seat and the Recipient Voice belong to the **Giving Committee**. Their public
description is "helps decide grants to families facing end-of-life care" — accurate,
complete, and containing no coin. A chaplain can accept that with no professional exposure
whatsoever, and it is not a euphemism: it is what they actually do.

The Constraint and the Verifier belong to the **Treasury Signers**, and they should be
recruited from a pool where crypto carries no stigma in the first place — a security
engineer, a crypto-literate accountant, someone who already holds a wallet.

This costs something honest: the Giving Committee no longer constrains the treasury. But the
multisig was always what constrained the treasury; the committee's power over the giving is
real and separate. Two smaller bodies, each recruited from people for whom the ask is easy,
beats one body recruited from people for whom it is impossible.

**Second: for the Constraint seat, buy the function rather than begging for it.**

The stigma and the no-pay problem compound each other, and paying dissolves both at once. A
CPA who will not lend their name to a token for free will absolutely take a paid engagement
to review quarterly treasury statements and hold a signing key — because a professional
engagement is not an endorsement, and they can say so to anyone who asks. Budget a few
hundred dollars a quarter; it is an operating cost the LLC can pay a vendor directly (the
cleanest disclosure tier in Part IV), and it likely runs one to two thousand dollars a year.

That is real money against a treasury with none, so fund it from book revenue like
everything else. It buys the single hardest seat, and a paid independent reviewer is a
stronger signal than an unpaid friend regardless of stigma.

**Smaller things that lower the barrier:**

- **Publish a non-endorsement line beside every name.** "Serves on the Giving Committee.
  Does not hold MAGR, does not endorse it, and receives no compensation." One sentence they
  can point at forever.
- **Ask them to clear it with their firm first**, rather than discovering a conflict later.
  Many firms restrict outside financial affiliations, and being the one who raised it is far
  better than being the one who hid it.
- **Recruit where the cost is lowest**: retired professionals with no firm policy and no
  career runway to protect, clergy who are mission-motivated, people who already know the
  book, and crypto-native people for the technical seat.
- **Offer role-only listing.** Name the seat publicly and the person privately until they
  are comfortable. This genuinely weakens the trust signal — say so — but a real committee
  half-named beats a fake one fully named.
- **Make the gifts first.** Recruiting is transformed once the ledger shows real gifts to
  real families: the ask stops being "join my crypto project" and becomes "help me decide
  who gets the next one."

**And the honest fallback: five may not be achievable, and forcing it is worse than not.**
A board of people who joined reluctantly and never attend is oversight theater — the thing
this whole structure exists to avoid. If independent people decline after a genuine search,
the answer is a smaller real body plus a paid professional reviewer, disclosed exactly as
that. "Two committee members and a paid independent accountant" is a true sentence that
earns more trust than five names that do not mean anything.

### Where does the money the committee decides on actually come from?

This question exposes a real gap between the recruiting pitch above and the treasury
arithmetic in Part IV, and it has to be closed before anyone is asked to serve. The Domain
seat is being sold on deciding who receives gifts. **So there has to be something to give.**

The honest position today:

| Possible source | Real? |
|---|---|
| The 50M treasury | **Not yet.** It is coins, not cash — about $4,000 at spot, and selling it into an $8,000 pool wrecks the price and raises the sale-by-the-issuer problem |
| Money from people buying MAGR | **No, and this matters.** Buyers' ETH goes into the liquidity pool, not to the project. The coin page says so explicitly. Buying the coin does not fund the giving |
| Book, speaking, and app revenue | **Yes.** This is the one source that exists |
| Soliciting donations | **No.** Taking charitable donations without a charitable vehicle brings solicitation-registration and tax questions that a $20,000 project should not go near. Keep pointing people at the charities directly, as the site already does |
| Gifting MAGR to families instead of cash | **No.** That hands a struggling family an illiquid asset that may go to zero. The same objection as paying board members in tokens, only worse |

**So: fund the giving from the book and the software, not from the coin.** The committee's
job is real either way — deciding where money goes is the substance of the seat, and the
budget's origin does not change that. What changes is what you are allowed to promise.

**Tell the committee the actual number before they join.** "It is five hundred dollars a
quarter right now, and it may stay that way" is a fine thing to say, and someone who works
in hospice knows exactly how much good a few hundred dollars does for a family behind on a
utility bill. What destroys the relationship is implying a budget that does not exist and
then convening a meeting with nothing to allocate.

**The stronger move: start the giving before the token launches.** Nothing about the gifts
depends on MAGR existing. Fund a small quarterly amount out of book revenue, convene the
committee, make the first gifts, and post them to the ledger page — all of it before launch
day. Three consequences, each worth more than it costs:

1. **The committee becomes real immediately**, with a track record, rather than a list of
   names waiting on a token that may never trade.
2. **The ledger page launches with actual gifts on it** instead of promises. For a project
   whose entire argument is "check the receipts," arriving on day one with receipts is worth
   more than any amount of copy.
3. **The giving stops being contingent on the coin succeeding.** If MAGR goes nowhere,
   families were still helped — which is the outcome the project says it cares about, and
   the strongest possible answer to anyone who calls the whole thing a pretext.

If the giving later outgrows what you can fund personally, that is the point to revisit
**fiscal sponsorship** (Part I) so gifts become tax-deductible and sit inside a real
charitable vehicle. Not before.

### Can board members be gifted tokens?

Nothing prevents the transfer. The question is what it costs, and here the answer is worse
than the general case for one specific reason of your own making.

**The sell policy hands the board advance knowledge of price-moving events.** The founder
notifies the board before selling; the board approves gifts and treasury spends before they
happen; the board knows about listings and locks first. That is exactly the design intent —
advance notice is the friction substituting for the timelock you declined. But it means
**every board member is, by construction, someone who knows what is about to move the price
before the market does.** Give that person tokens and you have manufactured a textbook
insider fact pattern: a holder with material non-public information, on a public ledger,
where every trade they make is visible and timestamped forever. One board member selling
three days before an announcement ends the project, whether or not the timing was innocent.

The general objections stack on top:

- **The Constraint and Verifier seats are disqualified outright.** The Constraint's entire
  function is having no financial upside; a member who profits when the price rises is a
  trader with a vote. The Verifier's job is to publicly confirm or deny the trust claims,
  and a Verifier with a position has a motive not to find problems. These two are not
  negotiable — they are the seats that make the board worth having.
- **It weakens the disclosure you just committed to.** You already carry an unlocked 40%.
  Adding board holdings raises team-controlled supply and undercuts the independence claim
  at precisely the point where it is doing the most work.
- **It is taxable income to them.** Tokens received for services are income at fair market
  value on receipt. You would be handing a volunteer a tax bill on an illiquid asset they
  probably cannot sell without moving the price — a genuinely bad gift.
- **It is a distribution for services**, which is the kind of transfer counsel will want to
  look at under the analysis in `docs/LEGAL-BRIEFING.md`. Do not create the question for a
  benefit this small.

**Buying on the open market is a different question** and a slightly cleaner one — their own
money, no gift, no income event. Still disqualifying for the Constraint and Verifier seats;
for the others, permit it only with disclosure of the wallet and a blackout rule around
board knowledge.

**What to give instead.** Recognition and things with no market: name them on the ledger
page, give them a signed copy of the book, cover their expenses, pay a cash honorarium if
the LLC ever has cash. All of it carries the thanks without carrying a position.

**If you decide to do it anyway,** the guardrails are: a small fixed amount agreed before
they join rather than granted later; the Constraint and Verifier seats still excluded with
no exceptions; the wallet and amount published on the ledger page; the tokens locked for
their full term plus six to twelve months; and a written blackout policy covering the
periods when the board knows something the market does not.

---

## Part II — Holding 100M personally

The concept is fine. The *mechanism* is what decides whether it helps or hurts.

**A bare hold in your own wallet is the worst version.** On-chain it is indistinguishable
from a pending dump: 40% of supply in a deployer-adjacent wallet, movable at any second,
against a pool holding $8,000. If you sold even 10% of your position into that pool, the
price would collapse. Every scanner will surface this. Every skeptical buyer checks it
first. And it directly contradicts the reasoning already published in
`TOKEN_LAUNCH_STRATEGY.md`.

A timelock was the recommended fix — 24 to 48 months, linear release, publicly verifiable —
on the reasoning that if you never intended to sell soon, a lock takes away nothing and
converts the largest liability into the second-strongest trust signal after renouncement.

### Decision taken: no timelock

**The 100M is held unlocked, in a disclosed wallet.** The recommendation is recorded above
and was not adopted; this section documents what that means rather than re-arguing it.

Consequences, stated plainly so they are not discovered later:

- **This is now the weakest point in the design**, and it is the only item on the launch
  strategy's "what this deliberately avoids" list that is no longer avoided. The launch
  materials say so in those words.
- **Scanners will flag it, and they will be right to.** Do not treat the flag as unfair or
  try to argue it down. A project whose entire pitch is verifiability cannot dispute a true
  on-chain observation about itself.
- **The float is 40% and your position equals the entire pool's MAGR side.** Thin float
  amplifies both directions — it is why the price will look exciting early and why a single
  seller can erase it. Do not read an early price rise as validation of the model. It is a
  measure of how little liquidity there is.
- **You now carry the risk personally.** With a lock, "I can't sell" is enforced by code and
  nobody has to trust you. Without one, every accusation of an impending dump is answerable
  only by your conduct over time, and a single large sale — even a justified one — ends the
  project's credibility permanently.

### What to do instead, since code is no longer doing the work

None of these is as strong as a lock. Together they are the best available substitute, and
they cost almost nothing:

1. **Publish the wallet address before launch**, on the ledger page, labelled as the
   founder's holding and labelled as unlocked. A watchable risk is enormously better than a
   hidden one, and it is the difference between "he disclosed it" and "someone found it."
2. **Adopt a written sell policy, approved by the board, published on the site.** Something
   like: no sales in the first N months; any sale announced at least 14 days in advance;
   no more than X% of the position in any 90-day window; every sale posted to the ledger
   with a transaction link. It is a promise rather than a constraint — say so — but it is a
   promise the board can hold you to and the ledger can audit.
3. **Require board notification before any sale**, with the notice minuted and published.
   This is the one place the board can partially substitute for the missing lock: four other
   people knowing in advance, on the record, is real friction.
4. **Say it first, in your own words, on the coin page.** The disclosure is already written
   there. Leading with your own weakest fact is the single most credible thing a project in
   this position can do, and it is much cheaper than being caught with it.
5. **Keep the option open.** A timelock can be deployed at any time, including after launch.
   "The founder locked his position in month three" is a genuinely strong announcement, and
   nothing about today's decision forecloses it.

---

## Part III — The 3% trade fee

**Recommendation: don't.** Not on moral grounds — on arithmetic.

### What it would earn

| Daily volume | 3% fee/day | Annualized |
|---|---|---|
| $200 (realistic for a micro-cap most days) | $6 | **$2,190** |
| $1,000 (a good day) | $30 | **$10,950** |
| $3,650 (sustained, implausible here) | $110 | $39,968 |
| $10,000 (would require a real user base) | $300 | $109,500 |

To pay yourself even $40,000 a year from a 3% fee you need **$1.33 million of annual trading
volume** — about $3,650 every single day, roughly 45% of the pool's entire depth turning
over daily, forever. Tokens with $8,000 of liquidity do not do that. Realistically, the fee
earns somewhere between **$2,000 and $11,000 a year**, before the cost of building and
auditing the mechanism that collects it.

### What it would cost

1. **It breaks a published claim.** `cp17-site/index.html` currently reads: *"Every trade
   costs 0.3%. That's a fee, and we're not going to call it anything softer. It's charged by
   Uniswap... not something we added to this one, and it stays in the locked pool rather
   than going to a wallet we can reach into."* A 3% fee routed to you makes that paragraph
   false. Rewriting it before launch is honest; shipping it as-is is not, and the tone of
   the whole site rests on that paragraph being true.

2. **It breaks the contract's core promise.** `MagerCoin.sol` has no tax hook, and
   `TOKEN_LAUNCH_STRATEGY.md` lists "tax/fee/blacklist mechanics" under *What This Setup
   Deliberately Avoids*, noting exotic mechanics are "the second thing scanners flag after
   unlocked liquidity." A fee-on-transfer token needs different, more complex, unaudited
   code — the opposite direction from a plain OpenZeppelin ERC-20.

3. **It cannot coexist with renouncing ownership.** A fee needs a recipient address, an
   exclusion list for the pool, and the ability to fix it when it breaks. Renouncing locks
   the fee in forever; not renouncing forfeits the single strongest trust signal you have.
   You cannot have both, and the fee is worth far less than the renouncement.

4. **It worsens the securities analysis.** `docs/LEGAL-BRIEFING.md` notes the design
   "deliberately weakens several Howey prongs — no capital is raised by the issuer,
   ownership renouncement removes ongoing 'efforts of others.'" A 3% rake paid to the
   founder from every trade re-establishes an issuer taking economic value from trading,
   and a founder whose income depends on price and volume is a founder with an obvious
   motive to promote. That is exactly the "efforts of others" fact pattern the current
   design avoids. Combine it with a 40% unlocked founder position and you have assembled a
   substantial part of the plaintiff's argument yourself.

5. **It costs the buyer more than it looks.** 3% in, 3% out, plus 0.3% each way to Uniswap,
   plus gas — a round trip on a $200 purchase loses ~7% to fees before the network charge,
   against a page that says it doesn't want people trapped.

### If you charge one anyway

Then do it properly: cap it at **1%**, apply it symmetrically to buys and sells, route it
to the **multisig treasury** rather than a personal wallet, disclose the exact rate and
destination on the coin page above the fold, and get the contract audited. A 1% fee routed
to a board-controlled treasury is a defensible design. A 3% fee routed to the founder is
the thing your own launch document was written to avoid.

---

## Part IV — Paying yourself a salary

**Short answer: yes, you should be paid for real work — and no, not out of trading fees,
and not yet.**

There is nothing wrong with a founder being compensated. Unpaid founders burn out and then
make worse decisions with the treasury than a salaried founder ever would. `cp17-site` already
says part of the treasury covers "legal, accounting, **the work itself**" — the disclosure
is in place. The questions are source, amount, and sequence.

### From where — the money has to exist first

A salary is dollars leaving a bank account on a specific day. Before anything else, look at
what CP17 LLC would actually have to pay from:

| Asset | Amount | Can it pay a salary? |
|---|---|---|
| Your $10,000 capital contribution | $10,000 cash | **No.** It is earmarked for the pool and launch costs, and paying yourself from your own contributed capital is moving money between your pockets while creating a taxable-looking event and a bad ledger line |
| 50M MAGR treasury | ~$4,000 at spot | **No.** Illiquid. Selling it into an $8,000 pool crashes the price, and `LEGAL-BRIEFING.md` flags treasury sales as the asset most exposed to a "sale by the issuer" characterization |
| Trade fee revenue | $2,190–$10,950/yr, if you add a fee | **No** — and see Part III for why the fee shouldn't exist |
| Book, speaking, app revenue | Whatever it actually is | **Yes.** This is the only real source |

So the answer to "from where" for at least the next year is: **from the book and the
software, not from MAGR.** The token has no cash and cannot generate any without doing the
one thing the whole design was built to make impossible.

### The structural catch: the entity that pays you shouldn't be the token entity

There's a tension between two things already decided. CP17 LLC exists to isolate token
risk. But the only money that can actually pay you is book and app revenue — and routing
that revenue *through* CP17 LLC in order to pay yourself from it would drag those earnings
back inside the entity carrying the token's liability. That undoes the separation you
formed the LLC to get.

So:

- **Book royalties stay out of CP17 LLC.** They flow to you personally, or to a separate
  operating entity. Not through the token LLC.
- **The apps in this repo, if they earn**, belong in an operating entity too — either your
  existing arrangement or a second LLC. CP17 LLC holds the token, the treasury, the domain,
  and the gift program. Nothing else.
- **CP17 LLC pays you nothing for now.** It reimburses documented expenses (below) and
  holds a board-approved comp agreement that activates if and when it ever has non-token
  cash. That agreement being on the shelf, unused and disclosed, is itself a good signal.

The practical read: you get paid from the book and the software, in the ordinary way, and
MAGR stays a thing you fund rather than a thing that funds you.

### The step that works right now: an accountable plan

Before there is profit to draw, the correct and immediate move is **expense
reimbursement**, not salary. Under an accountable plan, CP17 LLC reimburses you for
documented business costs you paid personally — the liquidity lock, gas, the audit,
formation fees, the domain, legal and accounting. Substantiated reimbursements are not
income to you and are deductible to the LLC.

Requirements are simple and non-negotiable: a business purpose for each item, receipts, and
submission within a reasonable time. Keep the receipts in the same place as the board
minutes. This is how you stop personally absorbing the cost of the project without touching
the salary question at all.

### Operational costs — the cleanest category, and the one already disclosed

Better still: **have CP17 LLC pay its vendors directly** rather than reimbursing you. The
lock fee, the audit, the gas, formation, the domain, legal, accounting — paid from the LLC
account to the vendor, no money passing through your hands at all. Cleanest audit trail,
no reimbursement paperwork, and nothing that looks like founder extraction because nothing
reaches the founder.

This is also the only spending category already covered by what you've published.
`cp17-site/index.html` says the treasury covers "the liquidity lock, network fees, legal,
accounting, the work itself." Operational spend is squarely inside that sentence. A salary
is arguably inside "the work itself," but it is the part a skeptic will read hardest — so
operational costs need no new disclosure, while a salary needs an explicit one.

Three tiers, in order of how much explaining they require:

| Tier | What it is | Disclosure needed |
|---|---|---|
| **Direct vendor payment** | LLC pays the audit firm, the lock service, the registered agent | Ledger line item. No further explanation |
| **Expense reimbursement** | LLC repays you for costs you fronted, with receipts | Ledger line item, accountable-plan records on file |
| **Salary or draw** | LLC pays you for your time | Board resolution with you recused, written scope, hours, explicit ledger disclosure |

Work down that list, not up. Most of what you need money for in year one is tier one.

### The constraint that governs all three — and the gifts

Every one of these — vendor payments, reimbursements, salary, **and the gifts themselves** —
needs *dollars*. The treasury holds 50M MAGR, not cash. So each of them implies the same
prior act: converting MAGR into money, which means selling into a pool that cannot absorb
it, or an off-market sale that is unambiguously a sale by the issuer.

**The treasury is not a budget. It is a claim on a budget that doesn't exist yet.** That
single fact should shape what you promise:

- Fund year-one operations from the remaining capital contribution and from revenue, and
  treat the 50M as untouched reserve.
- Do not commit to a gift schedule, a spending plan, or a salary that assumes the treasury
  is spendable — it isn't, at current liquidity, in any amount that matters.
- If the treasury ever does get sold, that is a board decision with counsel involved, made
  in daylight and announced before it happens, not a routine funding step.

The page already gets this right by refusing to name a charity percentage. Apply the same
discipline to your own compensation and to operating spend: describe intentions, commit to
disclosure, promise no numbers you'd have to walk back.

### If it comes from the treasury, constrain it

- **Set it by the two non-founder members, with you recused and the recusal in the minutes.**
- **Cash, not MAGR.** Paying yourself in tokens makes you a seller later, which is the one
  thing your holders will be watching for.
- **Modest and defensible against the actual work** — hours logged, a written scope. If the
  entity ever becomes a nonprofit, "reasonable compensation" stops being good practice and
  becomes a legal standard with penalties attached.
- **Disclosed on the ledger page** as a line item with amounts and dates, the same as gifts.
  A published, board-approved, modest salary is a *trust-positive* fact. An undisclosed
  outflow from a known team wallet is, in your own launch document's words, "a slow rug."
- **Not before the first gift.** Whatever the order of operations actually is, if the ledger
  shows you paid yourself before you gave anything away, that is the story — permanently,
  and fairly.

### The mechanics — "salary" is the wrong word for what you'd be doing

For a **single-member LLC**, there is no salary. The IRS treats it as a disregarded entity
by default: you cannot put yourself on payroll, there is no W-2, and there is no paycheck.
What you take is an **owner's draw** — a transfer from the business account to your personal
account. Three consequences people get wrong:

1. **A draw is not a deductible expense.** It doesn't reduce the LLC's taxable income. It's
   just you moving your own money.
2. **You're taxed on profit, not on what you draw.** Net profit flows to Schedule C on your
   personal return whether you take it out or leave it in the account. Drawing $0 does not
   mean owing $0.
3. **Nothing is withheld.** Draws carry no withholding, and self-employment tax runs 15.3%
   (Social Security up to the annual wage base, plus Medicare on everything) on top of
   income tax. You handle it with **quarterly estimated payments** — Form 1040-ES, roughly
   April 15, June 15, September 15, and January 15. Set aside 25–35% of profit as it comes
   in. Missing these is the most common and most expensive first-year mistake.

**An actual W-2 salary requires an S-corp election** (Form 2553). Then you *must* pay
yourself "reasonable compensation" as a W-2 employee, and remaining profit can be
distributed without self-employment tax — which is the whole point of doing it. But it
brings a payroll provider, quarterly 941s, a year-end W-2, a separate 1120-S return, and
often extra state fees. The rule of thumb is that it starts paying for itself somewhere
around **$50,000 of consistent net profit**. CP17 LLC will not be near that. Revisit it
when the book and the software are, and note that the election would sit with whichever
entity actually earns — not the token LLC.

So the practical answer: **draws from the operating side, quarterly estimates, and an
S-corp conversation later.**

### The setup, in order

1. Form the LLC, get the **EIN**, open a **dedicated business bank account**. Never pay a
   personal expense from it.
2. Record the **$10,000 as a capital contribution**, in writing, into that account.
3. Adopt the **accountable plan** and start paying vendors directly.
4. Get **bookkeeping running from transaction one** — chart of accounts with `Owner's Draw`
   and `Owner's Contribution` as equity accounts, distinct from expense accounts. Draws
   miscoded as wages is the error that makes a first tax return expensive.
5. When there is profit to draw: **board resolution** setting the amount, you recused,
   dated and minuted, with a written scope and an hours log behind it.
6. Pay it as a **scheduled recurring transfer** — same date each month, consistent amount,
   memo'd. Irregular ad-hoc transfers of round numbers are what an auditor notices and what
   a skeptical holder screenshots.
7. **Quarterly estimates** from day one of profitability.
8. **Post it to the ledger page** with amount and date, alongside gifts and operating spend.

### The honest framing

At a $20,000 FDV, there is no salary in this token. The treasury is worth $4,000 at spot and
cannot be sold into an $8,000 pool without destroying it. Any real compensation for the next
year comes from the book and the businesses in this repo, not from MAGR. Plan accordingly,
and let the token be what the site already says it is — not an investment, and not a
fundraising campaign.

---

## Risk register

| Risk | Driver | Mitigation |
|---|---|---|
| Rug-pull perception | 60% of supply team-controlled, founder's 40% unlocked | **Not mitigated by code — decision taken.** Publish the wallet pre-launch, adopt a board-approved sell policy, disclose it first on the coin page |
| Scanner red flags | Fee-on-transfer mechanics | Ship the plain ERC-20; skip the fee |
| Securities exposure worsens | Founder rake + promotion incentive + unlocked position | No fee; lock the founder position; no price talk in marketing — see `docs/LEGAL-BRIEFING.md` |
| Published claims become false | 3% fee contradicts `cp17-site/index.html` | Either don't add the fee, or rewrite the page *before* launch |
| Treasury discretion | Single-signer wallet | Safe multisig (2-of-3, then 3-of-5), written gift policy, published minutes |
| Board capture | Members hold tokens or depend on you | No token comp; independence weighted ×3 in scoring |
| Board insider trading | The sell policy gives the board advance notice of price-moving events | No tokens to board members; blackout policy if any member ever holds |
| Board of friends and family | A slate drawn entirely from one circle | At least one member with no tie to you; relationships disclosed on the ledger page |
| Namesake without consent | Jeff Mager's surname on an immutable contract | Written permission before deployment, covering the go-to-zero case |
| Trademark letter | "Ironman" used in branding | Describe the distance factually; never use the mark; licence any race photo |
| "Built to hold" read as price advice | Tagline detached from the souvenir framing | Keep the two paired in every use; see `docs/LEGAL-BRIEFING.md` on marketing risk |
| Deadlock on conflicted votes | Recusal leaves an even four | Written rule adopted up front: a tied vote fails |
| Empty seats read as oversight | Five named, two never attend | Stage the seats; publish vacancies with target dates |
| Cannot recruit — crypto stigma | Unpaid public affiliation reads as endorsement | Split the Giving Committee from the Treasury Signers; pay for the Constraint function; publish a non-endorsement line per name |
| Liability reaching the book | Token and memoir sharing one entity | Separate LLC; book IP and royalties stay out of it |
| LLC shield pierced | Commingled funds from day one | Own EIN and bank account; the $10k in as a documented capital contribution |
| Trademark collision | "Cardinal" is crowded in healthcare and finance | Boring legal name (CP17 LLC); clear it before filing, not after launch |
| Tax surprise | No withholding on draws; SE tax and quarterly estimates | Set aside 25–35% of profit; Form 1040-ES quarterly; accountant before launch |
| Book income pulled into token risk | Routing royalties through CP17 LLC to fund a salary | Keep book and app revenue in a separate operating entity |

---

## Sequence

1. Clear the name (state search, USPTO, domain), form the new LLC, get an EIN, open its
   bank account, and document the $10,000 as a capital contribution. *Before* launch —
   retrofitting an issuer onto a live token is visibly a patch.
2. Open the Safe (2-of-3 to start) and decide who deploys.
3. Get Jeff Mager's written permission for the name, before anything is deployed.
4. Screen the slate — Chris Brizzi, Matt Campbell, Charles Cole — against the scorecard and
   the three conversations, and recruit an outsider for the open fifth seat. Fill the
   Constraint seat first, with someone who has no tie to you; everything else is easier once
   one person can say no. Then the Domain seat. Adopt the tie-fails rule before the first
   meeting.
5. Decide the fee question. The recommendation is no fee, plain ERC-20, ownership renounced.
6. Publish the founder's wallet address and adopt the written sell policy — board-approved,
   on the site — before launch, not after.
7. Update `cp17-site` — new name, supply split, founder lock, board members, treasury
   policy — so the page matches reality on day one. Commission a MAGR mark; the cardinal
   crest belongs to the book.
8. Adopt the gift policy and the compensation clause in writing, before either is needed.
9. Launch per `TOKEN_LAUNCH_STRATEGY.md`, with the amended split.
10. Publish quarterly: gifts, spends, minutes, compensation.

---

*Prepared as internal strategy analysis. Nothing here is legal, tax, or financial advice.
Review the securities questions in `docs/LEGAL-BRIEFING.md` with qualified counsel, and the
compensation and entity questions with a CPA, before acting on any of it.*
