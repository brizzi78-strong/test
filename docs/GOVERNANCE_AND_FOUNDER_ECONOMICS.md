# Governance and Founder Economics — HOP

How to choose a board, what the revised supply split does, whether to charge a 3% trade
fee, and whether to pay yourself a salary.

> **Not legal, tax, or financial advice.** This is analysis to make the conversation with
> counsel and an accountant faster. See `docs/LEGAL-BRIEFING.md` for the securities-law
> groundwork this document builds on.

---

## Thesis

**The only asset HOP has is that its claims are checkable.** At a ~$20,000 fully diluted
valuation, the token has no liquidity moat, no user base, and no network effect. What it
has is a contract with nothing hidden in it, a locked pool, a renounced owner, and a page
that tells people not to buy. That verifiability *is* the product.

Three of the four proposals — 40% founder retention, a 3% trade fee, and a salary paid out
of trading activity — each spend that asset. And the arithmetic below shows they buy almost
nothing with it: a 3% fee at realistic volume for a token this size funds roughly **$2,000
to $11,000 a year**, which is not a salary. You would be trading the entire trust story for
less than the cost of the legal work you already need.

The board is the opposite case. A small board inside a separate LLC is the one proposal
that *adds* to the asset, because it converts "trust us with the treasury" into "someone
else has to agree," and it keeps a token dispute from ever reaching the book.

**Form the new LLC and give it a boring name. Five seats, staged, with a 2-of-3 Safe that
grows to 3-of-5, and one disclosed coin grant to a single member. Disclose the unlocked
100M hold and put a written sell policy around it.
Skip the fee. Get paid — but from the book and the software, as owner's draws from an
operating entity, while CP17 LLC pays operating costs directly and leaves the treasury
untouched.**

---

## The numbers, restated

Your message gave figures that need reconciling against what's in the repo. Here is the
reading this document uses:

| Your words | Interpretation | Source |
|---|---|---|
| "250,000 coins" | 250,000,000 HOP total supply | `contracts/HopeCoin.sol` — `TOTAL_SUPPLY = 250_000_000e18` |
| "I invested 10k" | ~$10,000 of your own money: ETH for the pool plus launch costs | `TOKEN_LAUNCH_STRATEGY.md` budgets 2–5 ETH into the pool |
| "hold onto 100 mill" | 100,000,000 HOP (40%) retained by you personally | New — supersedes the old split |
| "only 100 mill initially released" | 100,000,000 HOP (40%) into the Uniswap pool at launch | New — was 200M (80%) |
| Remainder | 50,000,000 HOP (20%) treasury | Unchanged from `TOKEN_LAUNCH_STRATEGY.md` |

**This is a material change from the shipped plan.** The launch strategy puts 80% in the
pool specifically because "screeners flag deployer-heavy tokens as rug risks," and warns
that holding back more than 20% "looks extractive." You are proposing to hold back 40%
personally *on top of* the 20% treasury — 60% of supply in team-controlled hands.

Assuming ~$8,000 of the $10,000 goes into the pool and ~$2,000 covers the lock, gas,
verification, and fees:

- Launch spot price: **$0.00008 per HOP**
- Fully diluted valuation: **$20,000**
- Value of your 100M retained: **$8,000 on paper** — exactly equal to the entire pool, which
  is the problem in one line

### What $8,000 of liquidity actually feels like

| Buy size | HOP received | Average price paid | Spot price move |
|---|---|---|---|
| $100 | 1.23M | $0.000081 | +2.5% |
| $500 | 5.88M | $0.000085 | +12.9% |
| $1,000 | 11.11M | $0.000090 | +26.6% |
| $5,000 | 38.46M | $0.000130 | +164% |

Halving the pool from 200M to 100M HOP doubles the launch price but does not deepen the
book — a $1,000 buy still moves spot ~27%, and a $1,000 sell moves it down comparably. The
pool is thin in both directions. That is survivable and honest. It only becomes dangerous
when combined with the next section.

### Decision taken: supply stays fixed at 250M

Raised and closed: no mint function, no "opportunity for more," no burn function. The
reasoning, for the record — a mint needs an owner, which forecloses renouncing; the market
prices mintable small tokens as if the mint will be used; and the held 60% (founder 100M +
treasury 50M) already is the growth reserve, released in daylight if ever needed. Tether's
mint-and-burn model exists because USDT is redeemable against reserves; HOP redeems
nothing, so neither function has a job here. One capability survives without any code: any
holder can burn irreversibly by sending to the dead address — which remains the strongest
trust action available on the founder's unlocked position, should it ever be wanted.

---

## Part I — The board

**Decision taken: five — restored.** The board went five, then three when unpaid
recruiting looked impossible, and is now five again. Recorded, with the earlier reasoning
kept below rather than erased, because the recruiting constraint that forced three has not
disappeared — it has to be managed, and one lever has changed: **one of the five will
receive coins** (see the grant decision in the compensation section), which alters who can
sit where.

Five is odd, so nothing deadlocks, and it buys what three could not: four voices around the
founder instead of two, and a path to a 3-of-5 treasury that survives losing two keys. The
cost is the same as ever — five genuinely engaged people is a hard ask, and a seat filled by
someone who never attends launders the appearance of oversight without the substance. Fill
seats only with people who will actually show up; stage the rest.

**The two-body structure survives inside the five.** "Board member" and "key holder" remain
different roles:

- **The Giving Committee** — the Domain seat, the Recipient Voice, and you — decides which
  families receive money, funded from the founder's non-book money — software revenue or
  personal funds. **By decision, book profits never fund the coin or its giving.** Members
  with no coin grant keep the
  no-crypto shield: they never touch a wallet and their public description contains no
  token. The one member who takes the grant gives that shield up, knowingly.
- **The treasury Safe starts at 2-of-3** — you, the paid reviewer, one crypto-literate
  signer — and **migrates to 3-of-5 only when all five seats are genuinely filled.**
  Announce the migration and link the transaction. Never an even threshold, and never a
  threshold the current roster cannot meet.

When you recuse, four remain and can tie; the tie-fails rule below resolves it, adopted in
writing before the first meeting.

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
- **A clean exit.** If HOP goes nowhere, you dissolve one LLC. Nothing else is affected.

**Structure: new LLC + a 2-of-3 Safe multisig on the treasury.** Skip the nonprofit for
now — do not file a 501(c)(3) for a $20,000 project; the formation cost, exemption
application, and annual filings would exceed the treasury's entire value at spot. If the giving grows enough to need real charitable
standing, use **fiscal sponsorship** (an existing 501(c)(3) receives and disburses the gifts
for a percentage) rather than building your own.

The multisig is what makes the governance real. A corporate bylaw is a promise; a Safe with
a signing threshold is checkable on-chain by a stranger at 2am. Same design principle as the
renounced ownership and the locked LP.

### What the LLC should and should not hold

| Put it in the LLC | Keep it out |
|---|---|
| The 50M treasury (via the Safe) | The book, its royalties, and its IP |
| The `cp17.org` domain and the coin site | Your personal 100M HOP position (see below) |
| Deployment ops, the lock, listings, audits | The other apps and businesses in this repo |
| The gift program and its records | Personal accounts of any kind |
| The board, the gift policy, your comp agreement | |

On your personal 100M: **hold it personally** rather than contributing it to the LLC (and,
by decision, unlocked — see Part II). Keeping it out means the LLC — the entity a regulator
or plaintiff would call "the issuer" — discloses a clean 20% treasury rather than a 60%
position. Either choice is
defensible, but pick one *before* launch and publish which one it is. Silence on this
question is worse than either answer.

### The founder's public name — the alias "Chandler Grey"

Decision under consideration: the founder appears publicly as **Chandler Grey** (spelling
assumed corrected from "Chnadler"). Pseudonymous founders are common in crypto and a pen
name is not illegal — but for *this* project the alias interacts badly with almost every
trust mechanism already adopted, so the options need stating precisely.

**What an alias cannot do at all:**

- **It cannot exist in the legal layer.** The LLC filing, the EIN, the bank account, the
  exchange KYC, and the engagement letter with your father-in-law all require your legal
  name. "Chandler Grey" can front the website; he cannot sign anything, own anything, or
  withdraw anything. The alias is a publishing choice, not an identity.
- **It cannot shield you from liability.** The LLC does that. If anything goes wrong, an
  alias does not slow a subpoena by a day — but it *will* be characterized as concealment
  by anyone building a case or a headline.

**This decision has swung twice and now rests re-tied.** The coin was first stripped of
Lou and the family entirely; that was then reversed — the dedication, the story, and the
family charities are back on the coin pages, and the book and coin are joined through the
coin-per-book program (see "The book bundle"). With an identifiable family story on the
site again, **full pseudonymity (version 2 below) is once more incoherent** — a pseudonym
standing in front of a named family is pierced in one search. Only the disclosed pen name
(version 1) remains workable, and it buys little.

What has not changed: the conduct-based trust structure in Part II depends on a real
reputation being at stake. The unlocked 100M was survivable *because* a named founder's
conduct backed it. **A pseudonymous founder holding an unlocked 40% against a thin pool is
the textbook profile of a rug pull**, and scanners and buyers will read it exactly that
way. With the family story restored to the page, name and conduct are joined again — which
strengthens the trust story exactly as much as it exposes the family to the coin's fate.
That trade was made knowingly in the re-tie decision; the alias cannot undo it.

**The two coherent versions, and the one that is not:**

1. **Disclosed pen name.** The site says, in its own plain voice: "The founder writes under
   the name Chandler Grey; the LLC's records carry his legal name, which the board, the
   accountant, and the bank all know." Honest, modestly private, costs a real but bounded
   trust discount. If the family dedication stays on the page, expect the connection to be
   made anyway — the pen name then buys distance from casual searches, nothing more.
2. **Full pseudonymity.** Now coherent, since the dedication, family story, and named
   family charities are gone from the coin pages. The cost is what was removed: the coin
   no longer carries the mission framing that made it different, and the giving survives
   only as a committee and a ledger rather than a story. It is a different, plainer
   project — deliberately.
3. **Undisclosed alias presented as a real person** — a bio, a face, a history for
   "Chandler Grey" as if he existed. **Do not do this.** It is the one version that is not
   a privacy choice but a misrepresentation, it converts every future dispute into a fraud
   narrative, and its discovery is a matter of when.

**Recommendation:** the separation you actually wanted is already built — the LLC carries
the liability, the book's domain and brand are fully severed, and the token no longer says
"Cardinal" anywhere. Those walls protect the family better than a pen name does. If the
alias still feels necessary, use version 1, disclosed, and accept what it costs. And
recognize the tension you would be carrying: a project whose product is checkability, run
by someone whose name cannot be checked, holding 40% of the supply unlocked. Each of those
three was survivable alone. All three together is a heavy load for a $20,000 experiment.

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

You'd considered "Cardinal" or "Cardinals Platform" for the LLC. The recommendation is
unchanged, and matters more now that the token has reverted to Hope Coin: **make the
LLC name boring.** The entity name is the one place
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
| **Hope Coin LLC** | Workable, but it welds the entity to the token *and* to a private individual's surname. If the token fails, the entity's name fails with it |
| **Cardinal's Promise LLC / Cardinals Platform LLC** | No longer appropriate. The token is not Cardinal-branded any more, and this would re-entangle the book with the entity carrying the token's liability |

The rename has a clean side effect worth naming: with the token called Hope Coin and the
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

### The seats

Design the seats first, then find people for them. Choosing people first and inventing
roles afterward is how boards fill up with friends. Each seat below covers a way this
project can fail that no other seat can see.

**Seat 1 — The Constraint.** Someone with financial, legal, or fiduciary experience who
holds **no HOP** and has no upside if the price rises. Their entire job is to be able to
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
contract actually does. This seat can double as the crypto-literate Safe signer, and it
closes the largest
hole in the current design: every trust claim you make — supply is fixed, ownership is
renounced, liquidity is locked, the founder's holding is exactly what it is said to be — currently rests on
*you* saying so. A technically competent board member who has checked the chain themselves,
and who would resign publicly if a claim stopped being true, is the difference between a
promise and an audit. Look for: a smart-contract developer, a security engineer, anyone who
has shipped or reviewed an ERC-20 in production. They must hold no HOP either. *Guards
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

Three is odd, but the moment you recuse it is two — and two ties. A deadlock on your
compensation, or on any conflicted question, has to resolve somehow, and inventing the rule
in the moment is how boards break.

**Adopt this in writing before the first meeting: on any motion where a member is recused,
a tied vote fails.** The motion does not carry. Applied to your pay, that means a deadlocked
board leaves your compensation where it is — it cannot be raised without a real majority,
and it cannot be cut by a minority either. It is the conservative default in both
directions, it needs no tie-breaker with a casting vote, and it never puts one member in
the position of personally deciding what the founder earns.

### Staging the seats

Do not hold the launch hostage to a full roster, and do not fill a seat quickly just to
have it filled.

- **Before launch, fill three:** the Constraint, the Domain, and you. This is the minimum
  that makes the multisig meaningful and the gift policy real.
- **Within 90 days, fill the Verifier and the Recipient Voice.** Name the seats publicly as
  vacant with a target date rather than leaving them undescribed. A published "two seats
  open, here is what they are for" reads as a plan; five names where two never attend reads
  as decoration.
- **Keep the Safe at 2-of-3.** Never 2-of-2: an even threshold deadlocks, and losing either
  key locks the treasury forever. If the group ever grows, migrate to 3-of-5 and link the
  transaction — but never build a threshold you cannot actually meet.

### The candidate slate

| Candidate | Seat | Status |
|---|---|---|
| *(founder)* | Giving Committee + Safe key | Filled |
| Chris Brizzi | Giving Committee | Family — not the independent role |
| Matt Campbell | Giving Committee | Background needed |
| Charles Cole | Giving Committee | Background needed |
| Jeff Middleton, CPA | Paid accountant + Safe key | **Father-in-law — not the independent role.** See the paid-reviewer section |
| Jeff Mager | eligible again | The namesake conflict disappeared with the rename |
| *(vacant)* | third Safe key | **Needs one genuine outsider** — or buy a third-party audit instead |

Note this is more names than seats. Three sit on the Giving Committee; the Safe has three
keys; the two rosters overlap only in you. Some of these people will not be placed, and
that is fine — a shortlist longer than the structure is the healthy direction to be wrong in.

Nothing else can be assigned yet, because seats are defined by what a person can do that
the others cannot, and that requires knowing each person's profession, their relationship
to you, and whether they hold or intend to hold HOP. Run all three named candidates
through the scorecard above and the three conversations below before assigning anyone. The
slate still needs to answer:

- **Who can genuinely say no?** At least one member must have no personal or financial tie
  to you. If the whole board is friends and family, you have a group of people who like you rather
  than a board, and the multisig becomes a formality where everyone signs everything.
- **Who can read the contract?** The Verifier seat needs real technical capability. If
  nobody on the slate can read Solidity, recruit outside the slate for that seat or drop it
  and buy a third-party audit instead — do not fill it with someone who will nod.
- **Who brings hospice credibility?** Same test, and only if the person actually works in
  the field.
- **Does anyone hold HOP, or expect to?** Disqualifying for the Constraint and Verifier
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
later is. "One of the three is my brother, here is why" is a fact a reasonable person can
accept. Silence on it, followed by someone noticing the surname, is a credibility problem
you cannot undo.

### The name — final: Hope Coin (HOP)

The full naming history, kept honestly: **Cardinals Promise (CARD)** → briefly **Mager
Coin (MAGR)** → back → **Card Platform 17 (CP17)** → Brizz Coin and Lubrizzi considered →
**Card (CARD)** → settled on **Hope Coin (HOP)**. The name carries a deliberate double
meaning: publicly the coin is about *having hope* — the virtue, fitting the giving
mission — and privately it honors Hope, the founder's wife, who sacrificed so the book
about his father could be written. By decision the public copy leads with the virtue; the
dedication line, "In honor of Hope," reads both ways on purpose and explains itself to
no one. Fittingly, Hope Coin (HOP) already existed in this repository once — added in PR
#100 and removed in PR #101 when Cardinals Promise became the only token — so this is a
restoration, not an invention: the same 250M fixed-supply design under its original
name. Nothing was ever deployed under any of these names, so every change was free. After
deployment none would have been — **the naming conversation ends at the contract
address.**

What this name has that the others did not: it is warm without naming a person (a
dedication is not a namesake — nobody's surname is welded to the contract), it fits the
giving mission, it collides with no major mark, and the dedication gives the coin back a
human center after the Card interlude stripped it plain. The entity (CP17 LLC) and domain
(cp17.org) keep their names; "the Hope coin, at cp17.org" reads fine, and the site being
the single official source of the contract address still does the anti-fake work — HOP is
a common ticker (Hop Protocol, among others), so the address, not the ticker, is the
identity.

### Who must not be on it

- **Anyone paid in HOP.** A board member holding tokens is a trader with a vote. It
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

- **For signers, a key on the 2-of-3 Safe holding the 50M treasury.** No treasury movement —
  no gift, no listing fee, no compensation — happens with one signature.
- **A written gift policy** adopted before the first gift, not after.
- **Sole authority over founder compensation**, with you recused and ties failing.
- **Quorum of two on the Giving Committee**, with a tie failing where anyone is recused.
  Below two, the meeting is a conversation, not a decision.
- **Quarterly minutes published** to `cp17-site/ledger.html`, including dissents by name.
- **Staggered terms.** One year, renewable — but give one member a two-year first term so
  the whole committee cannot turn over at once.
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

That is real money against a treasury with none, so fund it from non-book money — software
revenue or personal funds — like
everything else. It buys the single hardest seat, and a paid independent reviewer is a
stronger signal than an unpaid friend regardless of stigma.

**Smaller things that lower the barrier:**

- **Publish a non-endorsement line beside every name.** "Serves on the Giving Committee.
  Does not hold HOP, does not endorse it, and receives no compensation." One sentence they
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

**And the honest fallback: even three may not be achievable, and forcing it is worse than
not.** People who joined reluctantly and never attend are oversight theater — the thing this
whole structure exists to avoid. If independent people decline after a genuine search, the
answer is a smaller real body plus a paid professional reviewer, disclosed exactly as that.
"Two committee members and a paid independent accountant" is a true sentence that earns more
trust than a longer list of names that do not mean anything.

### Where does the money the committee decides on actually come from?

This question exposes a real gap between the recruiting pitch above and the treasury
arithmetic in Part IV, and it has to be closed before anyone is asked to serve. The Domain
seat is being sold on deciding who receives gifts. **So there has to be something to give.**

The honest position today:

| Possible source | Real? |
|---|---|
| The 50M treasury | **Not yet.** It is coins, not cash — about $4,000 at spot, and selling it into an $8,000 pool wrecks the price and raises the sale-by-the-issuer problem |
| Money from people buying HOP | **No, and this matters.** Buyers' ETH goes into the liquidity pool, not to the project. The coin page says so explicitly. Buying the coin does not fund the giving |
| Software and app revenue, personal non-book funds | **Yes.** The one source that exists |
| Book profits | **Excluded by decision.** The book's money never funds the coin, its giving, or its costs |
| Soliciting donations | **No.** Taking charitable donations without a charitable vehicle brings solicitation-registration and tax questions that a $20,000 project should not go near. Keep pointing people at the charities directly, as the site already does |
| Gifting HOP to families instead of cash | **No.** That hands a struggling family an illiquid asset that may go to zero. The same objection as paying board members in tokens, only worse |

**So: fund the giving from the software and personal non-book funds — never the coin, and
by decision never book profits.** The committee's
job is real either way — deciding where money goes is the substance of the seat, and the
budget's origin does not change that. What changes is what you are allowed to promise.

**Tell the committee the actual number before they join.** "It is five hundred dollars a
quarter right now, and it may stay that way" is a fine thing to say, and someone who works
in hospice knows exactly how much good a few hundred dollars does for a family behind on a
utility bill. What destroys the relationship is implying a budget that does not exist and
then convening a meeting with nothing to allocate.

**The stronger move: start the giving before the token launches.** Nothing about the gifts
depends on HOP existing. Fund a small quarterly amount out of software revenue or personal funds, convene the
committee, make the first gifts, and post them to the ledger page — all of it before launch
day. Three consequences, each worth more than it costs:

1. **The committee becomes real immediately**, with a track record, rather than a list of
   names waiting on a token that may never trade.
2. **The ledger page launches with actual gifts on it** instead of promises. For a project
   whose entire argument is "check the receipts," arriving on day one with receipts is worth
   more than any amount of copy.
3. **The giving stops being contingent on the coin succeeding.** If HOP goes nowhere,
   families were still helped — which is the outcome the project says it cares about, and
   the strongest possible answer to anyone who calls the whole thing a pretext.

If the giving later outgrows what you can fund personally, that is the point to revisit
**fiscal sponsorship** (Part I) so gifts become tax-deductible and sit inside a real
charitable vehicle. Not before.

### The paid reviewer — and why paying family does not buy independence

The named candidate is **Jeff Middleton, CPA — the founder's father-in-law**, at roughly
**$1,500 a year**. The relationship changes the analysis, and it changes it in a way money
cannot fix.

**Paying a stranger solves a different problem than paying family.** The fee works on an
outsider because it converts an endorsement into an engagement — it removes the reputational
cost that makes professionals decline. A father-in-law was never going to decline for
reputational reasons, so the fee buys none of that. What it cannot buy at any price is the
thing the role exists for: **someone whose judgment does not sit inside your family.**

So be exact about what he is and is not:

| Role | Jeff Middleton | Why |
|---|---|---|
| Paid accountant / bookkeeper | **Yes — genuinely valuable** | A real CPA doing real work on the LLC's books. Competence is competence, and family will actually show up |
| Safe key holder | **Yes, with a caveat below** | A second signature stops a compromised key, a phishing attack, and a single person moving money alone |
| The independent constraint | **No.** Not at $1,500, not at $15,000 | Independence is a fact about the relationship, not a price point. It cannot be purchased from a relative |

**The distinction that matters: a family signer buys security, not governance.** A second key
held by your father-in-law genuinely protects the treasury against theft, a lost device, and
a hacked wallet — those are real risks and this is a real mitigation. What it does not do is
protect against a decision you and he both think is fine. Governance friction requires
someone willing to be unpopular at Thanksgiving. Do not let a filled seat create the feeling
that the independence problem is solved. It is not; it is still open.

**Then say so publicly rather than being caught.** "Our accountant is my father-in-law, he
is paid $1,500 a year, and he holds one of three keys" is a sentence a reasonable person
accepts. The same fact discovered by a stranger reads as concealment. Disclose the
relationship on the ledger page beside his name, disclose the fee, and **never describe him
as independent oversight** — that is the claim that would actually damage the project.

**Related-party payment, so document it.** A payment from the LLC to a family member is a
related-party transaction. Keep the written scope, the quarterly invoices, and the ledger
line. Bill it **$375 a quarter rather than one annual lump**, so there is a record each time
the work happened. Pay it from the LLC directly to him or his firm.

Two cautions carry over unchanged: **do not call his work an "audit" or a "review"** — those
are defined terms in accounting with independence requirements attached, and he will not
meet them here, so call it *bookkeeping* and *treasury oversight* and describe the actual
work. And **ask him to clear the multisig key with his firm**: custody of a client's assets
is a recognised professional issue, and being the one who raised it beats discovering it
later.

### What $1,500 buys at $200 an hour

At his rate, **$1,500 is 7.5 hours a year** — roughly two hours a quarter. That is a real
engagement, not a token gesture, but it is small enough that the scope has to be written
down or it will drift into unbilled work and quiet resentment.

Two hours a quarter buys about this much, and no more:

- Reconcile the quarter's treasury movements against the published ledger
- Confirm the founder's wallet balance against the sell policy
- Check the gift records and the accountable-plan receipts
- Sign a one-paragraph statement published with the minutes

It does **not** buy a full bookkeeping engagement, tax preparation, entity formation advice,
or an audit. If you want those, they are separate line items at his rate — budget them
honestly rather than letting them arrive as favours, which is how family working
relationships go wrong.

### On finding a CPA who would do it for free

I cannot name one. I do not know any accountant's willingness to work unpaid on this, and
inventing a name — or guessing at a real person's availability — would be worse than
useless. What can be named is where this help actually exists:

- **SCORE** (score.org) — free mentoring for small businesses, SBA-affiliated, with a large
  bench of retired CPAs and finance executives. The best fit here, because it serves
  for-profit small businesses rather than only nonprofits.
- **Your state CPA society's volunteer or pro bono program.** Most states run one. Ask
  specifically for a retired member — retirees have the judgment, the time, no firm policy
  to clear, and no career runway to protect.
- **The local Small Business Development Center**, usually hosted at a university, free
  counselling.
- **A university accounting department.** Faculty and graduate clinics sometimes take small
  engagements, and a professor is genuinely independent.
- **Your own community.** A congregation or a service club of any size contains retired
  finance people. This is the highest-yield channel and the one most often overlooked.

Two honest limits. Most **pro bono** programs are scoped to nonprofits and low-income
individuals, so an LLC with a token will not qualify for many of them — SCORE and the SBDC
are the exceptions. And a volunteer mentor will advise; **almost none will hold a multisig
key or accept a named oversight role**, because that is a liability question rather than a
generosity question. Expect free advice and paid responsibility to be different people.

### If you do not want strangers in this

Bringing in an outsider means inviting someone you do not know to check you, and being
uneasy about that is a reasonable reaction rather than a failure of nerve. The discomfort
*is* the mechanism — an overseer who never makes you uncomfortable is not overseeing
anything. So it is worth being precise about how much power the seat actually carries,
because "they will triangulate me" describes something larger than what is on offer.

**What one outside signer can actually do:**

- Refuse to co-sign a treasury movement — of a treasury worth about $4,000, in illiquid
  tokens, that mostly cannot be spent anyway
- Publish a quarterly opinion
- Resign, loudly, with the letter published

**What they cannot do:** touch your 100M, touch the book or its royalties, stop you selling,
remove you from anything, spend a dollar of your money, direct the project, or bind you to
anything. They hold one key of three and an opinion.

Set that against the actual asymmetry: **you hold 40% of supply, unlocked, worth roughly the
entire pool.** They hold a third of a signature on the smallest pot in the structure. Calling
that arrangement "them triangulating you" inverts who has the leverage — and the reason an
outsider's word carries weight is precisely that everyone can see the imbalance.

**But if the answer is still no, that is a legitimate structure — with one condition.**

Plenty of small projects are run by one person and their family. It is honest as long as it
is stated. What breaks is claiming oversight you do not have.

The no-outsiders path, done properly:

1. **Say it in plain words on the coin page.** "This project is run by me, with my family.
   Nobody independent oversees it. Here is who everyone is and how they are related to me."
   That sentence costs less than most people fear and it is unfalsifiable, which is the
   whole currency of this project.
2. **Buy independence instead of recruiting it.** A published third-party contract audit is
   independence as a one-time purchase: no stranger enters your life, no ongoing
   relationship, no meetings. A real firm with no tie to you examines the code and you
   publish whatever they find, including anything unflattering. For a plain fixed-supply
   ERC-20 this is a small engagement, and it is the single highest-value thing available to
   a project in this position.
3. **Let the chain do the oversight a person would have done.** Renounced ownership, locked
   liquidity, a multisig, a published founder wallet, and a ledger of every movement are all
   checkable by strangers who never have to be invited anywhere. That is oversight without
   overseers, and it is most of what an outside signer would have provided.
4. **Keep the family signature anyway.** It still stops a hacked key, and it is worth having
   for that alone.

Between an outside director and nothing, there is a middle that most people miss: **buy the
audit, publish the disclosure, skip the stranger.** It is coherent, it is honest, and it
does not require anyone new in your life.

### The bigger problem this exposes

Count the slate. Chris Brizzi is family. Jeff Middleton is family. That leaves Matt Campbell
and Charles Cole, and if either is a close friend, **there is no independent person anywhere
in this structure.** That is the exact failure mode flagged earlier: a group of people who
like you rather than a board, and a multisig where everyone signs everything.

Two honest ways forward, and they are not mutually exclusive:

1. **Recruit one genuine outsider for one key**, and accept a smaller role for them than a
   full seat — a single signature and a quarterly look is enough. One stranger is worth more
   than three relatives for this specific purpose.
2. **Buy verification instead of trust.** If independence cannot be recruited, purchase what
   it would have provided: a **third-party contract audit** from a firm with no relationship
   to you, published in full including anything it finds. An audit is a one-time cost, it is
   genuinely independent, and it is checkable by strangers — which is the project's whole
   thesis. For a plain fixed-supply ERC-20 this is a small engagement.

The second option deserves emphasis: it converts an unfillable governance seat into a
purchasable artifact, and a published audit from a real firm outranks a board seat filled by
someone's relative. If you do only one thing about independence, do that.

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

### Decision taken: one member receives coins

One of the five — and exactly one — will receive a coin grant. The recommendation above was
no; the decision is recorded, and every guardrail becomes mandatory rather than advisory:

1. **Who is eligible.** Not the Constraint, not the Verifier, and not the paid reviewer —
   those roles exist to have no upside, and Jeff Middleton is already family and paid,
   which is enough conflict for one person. Realistically the grant goes to the Domain
   seat or the Recipient Voice, and whoever takes it gives up the no-crypto shield the
   Giving Committee otherwise provides. Say that to them before they accept.
2. **Fixed and named up front.** A specific number of HOP, agreed before they join,
   granted once. Not a stream, not discretionary top-ups, never renegotiated while they
   serve.
3. **Source decided and disclosed.** From your personal 100M it is a personal transfer;
   from the treasury it is LLC compensation and needs two Safe signatures. Either way it
   is posted to the ledger — holder, amount, source, and date.
4. **Locked for their term plus six to twelve months.** The grant must not be sellable
   while they sit. This is the difference between a keepsake and a trader with a vote.
5. **Blackout policy in writing.** The sell policy gives the board advance notice of
   price-moving events; the recipient signs a policy that they do not trade in the window
   between any board notice and its publication — and their wallet being published makes
   this checkable by anyone.
6. **Tell them about the tax.** Tokens for services are ordinary income at fair market
   value on receipt. At today's prices the number is small; put it in writing so it is
   never a surprise.
7. **Recusal on token-price matters.** The holder recuses from any vote whose outcome
   plausibly moves the price — listings, liquidity changes, treasury sales — the same way
   you recuse on compensation.

One grant, disclosed and locked, is survivable. What the design cannot survive is drift —
a second grant, then a third, until the board is paid in exactly the currency this document
spent its middle third refusing. The line to hold is not "small grants are fine"; it is
**"there is one, here it is, and there will not be another."**

### Superseded: every member now receives a vested grant

**Decision taken: each board member receives 5,000,000 HOP, vested over two years.** The
one-grant line above lasted a day; the drift it warned about arrived as a deliberate
decision rather than a slide, which is at least the honest version. Recorded, with the
mechanics that keep it survivable:

- **Source, by decision: the founder's personal 100M — the treasury stays untouched at
  50M.** The four non-founder seats each receive 5M (the founder takes no grant from
  himself): 20,000,000 HOP out of his stack, leaving the founder's unlocked position at
  **80M**. A quiet improvement hiding in this: the 20M carved out becomes the first part
  of the founder's holding under any lock at all — the members' two-year vesting.
- **What it is worth, said out loud to every candidate: about $400 at launch prices.** The
  grant is real upside only if the coin becomes real. Recruit with that sentence, not with
  a dream — anyone who joins for the 5M has misunderstood the project or is the wrong
  person.
- **Vesting is on-chain, not a promise.** One OpenZeppelin `VestingWallet` per member: 5M
  deposited from the founder's wallet, releasing linearly over 24 months, address published on the
  ledger beside their name. Anyone can verify what has vested and what remains. Leaving
  the board forfeits nothing already vested and (by written agreement) waives the
  unvested remainder back to the treasury.
- **Funded personally by the founder** — four VestingWallets loaded in one published
  transaction set, each a ledger row. No treasury movement, so no Safe approval is
  required; disclosure does the work. One accountant question to settle before the first
  vest: the founder personally paying the LLC's board in coins is a related-party
  compensation arrangement, and how it books matters.
- **The paid reviewer still receives nothing.** Jeff Middleton holds a key and reviews the
  treasury; a reviewer holding the asset he attests to is the one conflict this structure
  cannot absorb. His compensation stays cash.
- **The insider rules become board-wide and mandatory:** published wallets, the written
  blackout policy (no trading between board notice of a price-moving event and its
  publication), and recusal on votes that move the price. The sell policy's advance
  notices make every member an insider; the vesting schedule and published wallets make
  their compliance checkable.
- **Tax, in writing, to each member:** vested tokens are ordinary income at fair market
  value as they vest — small dollars at today's prices, their problem to plan for if the
  price moves.
- **The new line, and the last one:** 5M each, once, at joining. No top-ups, no refresh
  grants, no exceptions. This section is what the next "everyone gets a bit more" proposal
  has to be read against.

What this decision does to earlier sections: the recruiting pitch changes — seats now
carry standard crypto compensation (token grants with vesting, the industry's pattern #3),
which eases recruiting among the crypto-comfortable and *hardens* it for the
stigma-averse: a hospice chaplain offered token compensation is being asked to hold the
thing they were promised they would never touch. Offer every candidate the explicit choice
to **decline the grant** and serve unpaid; some of the best ones will, and their refusal,
published, is worth more than their holding.

### On "Tether does it"

Tether was raised as the model for insiders holding the coin. Looked at closely, Tether is
a strong argument for the *other* parts of this design, and no argument at all for the
grant — because the one thing being borrowed is the one thing that does not transfer.

- **USDT cannot go up.** It is a stablecoin pegged to the dollar. Tether's insiders holding
  USDT hold something with no price to profit from — the equivalent of a board member
  holding cash. It proves nothing about granting an *appreciating* token to people who get
  advance notice of price-moving decisions, which is the exact problem the guardrails above
  exist to contain.
- **Tether's insiders profit through the company, not the token.** The owners of Tether
  Holdings earn billions a year from yield on the reserves — the token is plumbing; the
  equity is the asset. Translated to HOP, that model says: get paid through the LLC and
  operating revenue, not through coins. Which is precisely what Part IV already concluded.
- **Tether's governance is the opposite of this project's thesis.** No full audit has ever
  been published — quarterly attestations only — and the company paid an $18.5M settlement
  to the New York Attorney General and a ~$41M CFTC fine over misstatements about its
  reserves. Tether survives that history because it is systemically enormous and immensely
  profitable. A $20,000 token attached to a memoir does not survive one such headline. The
  project whose entire product is checkability cannot take its governance cues from the
  most prominent unaudited balance sheet in crypto.
- **What is genuinely worth borrowing:** the quarterly third-party attestation — which is
  already here as the paid reviewer's published statement — and profit-via-entity rather
  than via token, which is already here too.

So "Tether does it" is true only in the sense that does not apply. The one-grant decision
above stands or falls on its own guardrails; it cannot borrow legitimacy from a stablecoin
issuer whose insiders hold a token that cannot move.

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
- **The float is 40% and your position equals the entire pool's HOP side.** Thin float
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

## Part II-B — Utility: value outside the brand

**The design problem, stated cleanly:** every mechanism that "creates value" either shuffles
money between holders (burns, staking, reflections — zero-sum) or needs value to flow in
from outside. Backing with ETH fails because the vault would be filled with the founder's
own money, and ETH needs no wrapper. What is needed is a warehouse that is **free to stock
and worth something to withdraw from.**

**The answer this project already owns: software access.** The repo contains working
products. Granting access to software costs approximately nothing per user; strangers still
pay for it. That is the same asymmetry behind airline miles (backed by seats that would fly
empty) and arcade tokens (backed by machine time). A coin redeemable for software access
has value to someone who has never heard the story — which is the definition of value
outside a brand.

### The design: HOP as a software key

1. **Pick one product first — the one with real demand.** Utility is anchored by the thing
   it unlocks; a key to software nobody wants is worth nothing. Start with a single app
   where there is any evidence of actual users, and expand the catalog later. Do not gate
   anything care-critical or safety-related, ever.
2. **Two tiers, no contract changes:**
   - **Hold to use** — a wallet holding ≥ N HOP unlocks the product while it holds. The
     coin works like a transferable subscription; sell the coins, lose the access.
   - **Burn to own** — send M HOP to the dead address, show the transaction, receive a
     lifetime license. Every redemption is an on-chain receipt, and every one permanently
     shrinks the float. This fits the project's receipts thesis exactly: usage itself
     becomes checkable.
3. **Mechanics are a weekend, not a protocol.** The user connects a wallet and signs a
   message; the server verifies the signature and checks the balance (or the burn
   transaction) via any RPC. No changes to the token, no new Solidity, renounce intact.
4. **Publish a price list in HOP, as policy.** "Lifetime license: 500,000 HOP" — posted
   on the site, repriced periodically as market price moves, explicitly a policy the LLC
   can change with notice rather than a promise welded into anything. This is the honor
   policy of a gift card, and it should say what gift cards say: honored while the LLC
   operates, terms can change prospectively, already-burned redemptions stay honored.
5. **What this anchors, honestly.** If a license is worth $50 and costs 500k HOP, the coin
   has a use-value reference near $0.0001 — *for as long as people actually want the
   license*. The anchor is demand-limited: it is a floor made of customers, not of cash.
   Say that plainly rather than advertising a "price floor."

### The rules that keep it survivable

- **It must exist at launch or stay unmentioned.** Promising future utility is selling an
  expectation of the founder's efforts — the exact securities fact pattern this design
  avoids. Build the gate, wire one product, *then* put a single sentence on the site.
- **Market the use, never the upside.** "500k HOP unlocks X" is a product page. "Utility
  will drive the price" is the sentence a plaintiff quotes. The coin page's souvenir
  framing stays; the utility is listed the way a menu lists prices.
- **Run it through counsel with the rest.** Consumptive, exists-at-launch utility generally
  *improves* the Howey posture — people buying to use, not to profit — but this is
  precisely the question the legal briefing exists to put to a lawyer, not to decide here.
- **Tax and books:** redemptions are revenue to the LLC at fair market value, and the
  LLC honoring licenses is a service obligation — both go through the accountant.
- **The giving stays ungated and unpriced.** The committee, the gifts, and the ledger are
  never behind a paywall. Utility funds nothing and gates nothing on that side.

### Why this is the right shape and the others were not

| Mechanism | Where value comes from | Verdict |
|---|---|---|
| Burns, staking, reflections | Other holders | Zero-sum shuffle — no |
| Revenue share, buybacks | The LLC's cash flows | A security — closed door |
| ETH backing | The founder's own pocket | Stores value, creates none — no |
| **Software key** | **Strangers who want the product** | **Real, consumptive, buildable now** |
| The ledger of gifts | Verified acts over time | The meaning engine — keep, it compounds |

The two engines are complementary and neither is a brand: the ledger gives the coin a
reason to be *held*, and the software key gives it a reason to be *used*. Everything else
on the menu was either someone else's money moving in a circle, or yours.

### The book bundle — coins with every direct copy

**Decision taken: every copy of the book bought directly from the book's site comes with a
fixed number of HOP.** Direct sales only — confirmed — since retail and Amazon copies
cannot carry a claim code. The coin page describes the program as a keepsake, tells buyers
the coins are worth almost nothing, and says plainly not to buy the book for the coins.

**What this costs, stated once and not softened:** it re-couples the book and the coin at
the cash register, and it weakens the cleanest fact in `docs/LEGAL-BRIEFING.md` — that the
issuer never takes money in any transaction that delivers tokens. Money for a book that
comes with coins is money adjacent to coins, and courts look through wrapping. **This is
now the first question for counsel, ahead of everything else in the briefing.**

The guardrails that keep it defensible:

1. **Keepsake framing everywhere, value language nowhere.** A fixed, small number of coins
   per copy; never marketed as a rebate, a bonus "worth $X," or a reason to buy the book.
2. **The amount is announced at launch, not promised before it** — the site's
   no-numbers-you-might-walk-back discipline applies.
3. **A dedicated program wallet, funded once.** One treasury allocation, approved by the
   Safe signers in a single minuted decision, published as its own ledger row. Claims are
   paid from it; when it is empty the program ends or is refilled by another minuted
   decision. No ad-hoc sends from the founder's 100M.
4. **Claim flow, not airdrop.** The purchase issues a code; the buyer redeems it on
   cp17.org with a wallet address; sends are batched weekly because mainnet gas per claim
   is real money. Unclaimed codes expire after a stated period.
5. **Tax and books.** Distributed coins are a marketing expense of the LLC at fair market
   value; the book side does not double-count them — the accountant sets this up before
   the first claim.

### Merch — Hope on the front, cp17 on the back

Decided in passing and worth capturing: t-shirts with **Hope** on the front and **cp17**
on the back. Sold by the LLC for dollars, this is quietly useful beyond the fun of it —
merch revenue is **non-book revenue**, which under the funding boundary can pay for the
giving, the CPA, and operating costs. Keep it print-on-demand (no inventory risk), keep
any token language off the shirt itself, and book the sales as ordinary LLC revenue.

## Part III — The trade fee

### Decision taken and confirmed: a flat 2% fee, immutable, to the treasury

The fee question closed at **2%**, built the only way that preserves the rest of the
design: **hardcoded rate, hardcoded treasury recipient, no owner functions** — so
renouncing ownership survives intact, and "no one can change the fee, including us" is a
checkable claim rather than a promise. Treasury-side transfers are exempt so gifts and the
book program arrive whole. The contract, tests, invariants, claims file, and both site
pages were rewritten together so no published sentence is false.

Honest numbers at 2%: $200/day of volume yields about **$1,460/year**; $1,000/day about
**$7,300/year** — accruing to the treasury *in HOP*, which still converts to dollars only
through the same thin pool. The fee funds the treasury, not the founder; that distinction
is what keeps the founder-rake concern below from applying, and counsel still reviews the
whole mechanism. Known costs, accepted by decision: scanners flag fee-on-transfer tokens,
trades must route through Uniswap's fee-on-transfer functions, and the pool seed itself
pays the 2% skim unless seeded from the treasury.

The original analysis of the 3% proposal follows, kept for the record — its arithmetic is
why the fee is 2%-to-treasury-immutable rather than 3%-to-founder-adjustable.



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

2. **It breaks the contract's core promise.** `HopeCoin.sol` has no tax hook, and
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
| 50M HOP treasury | ~$4,000 at spot | **No.** Illiquid. Selling it into an $8,000 pool crashes the price, and `LEGAL-BRIEFING.md` flags treasury sales as the asset most exposed to a "sale by the issuer" characterization |
| Trade fee revenue | $2,190–$10,950/yr, if you add a fee | **No** — and see Part III for why the fee shouldn't exist |
| Book, speaking, app revenue | Whatever it actually is | **Yes.** This is the only real source |

So the answer to "from where" for at least the next year is: **from the book and the
software, not from HOP.** The token has no cash and cannot generate any without doing the
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
HOP stays a thing you fund rather than a thing that funds you.

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
needs *dollars*. The treasury holds 50M HOP, not cash. So each of them implies the same
prior act: converting HOP into money, which means selling into a pool that cannot absorb
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
- **Cash, not HOP.** Paying yourself in tokens makes you a seller later, which is the one
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
year comes from the book and the businesses in this repo, not from HOP. Plan accordingly,
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
| Board insider trading | The sell policy gives the board advance notice of price-moving events | One grant only, locked for term +6–12mo, published wallet, written blackout, recusal on price-moving votes |
| Grant drift | The one-grant line was already superseded once | The new line in writing: 5M each at joining, once — no top-ups, no refresh grants |
| Board of friends and family | Slate is family plus friends; no outsider anywhere | Recruit one outsider for one key, or buy a published third-party audit as the substitute; disclose every relationship on the ledger |
| Family signer mistaken for oversight | A relative's key reads as independence | A family key buys security, not governance — say so, and never describe him as independent |
| Alias read as concealment | Pseudonymous founder + unlocked 40% + thin pool is the rug-pull profile | If used at all: a disclosed pen name with legal identity intact in the LLC layer; never a fabricated persona |
| Issuer-sale pillar weakened | Coins bundled with paid book copies | Direct sales only, keepsake framing, no value language, program wallet funded once and published — counsel reviews before launch |
| Book re-coupled to token risk | Coin-per-book joins them at the cash register | Accepted by decision; the LLC ring-fence and the single-source address rule remain |
| Deadlock on conflicted votes | Recusal leaves an even four | Written rule adopted up front: a tied vote fails |
| Empty seats read as oversight | Names listed who never attend | Three real people, not a longer list; publish any vacancy with a target date |
| Cannot recruit — crypto stigma | Unpaid public affiliation reads as endorsement | Split the Giving Committee from the Treasury Signers; pay for the Constraint function; publish a non-endorsement line per name |
| Liability reaching the book | Token and memoir sharing one entity | Separate LLC; book IP and royalties stay out of it |
| LLC shield pierced | Commingled funds from day one | Own EIN and bank account; the $10k in as a documented capital contribution |
| Trademark collision | "Cardinal" is crowded in healthcare and finance | Boring legal name (CP17 LLC); clear it before filing, not after launch |
| Tax surprise | No withholding on draws; SE tax and quarterly estimates | Set aside 25–35% of profit; Form 1040-ES quarterly; accountant before launch |
| Book income pulled into token risk | Routing royalties through CP17 LLC to fund a salary | Keep book and app revenue in a separate operating entity |

---

## Sequence

1. Clear the entity name (state search, USPTO, domain), form the new LLC, get an EIN, open
   its bank account, and document the $10,000 as a capital contribution. *Before* launch —
   retrofitting an issuer onto a live token is visibly a patch.
2. Seat the Giving Committee — three people, no crypto in the ask — and make the first
   gifts from non-book funds before launch, so the ledger opens with receipts rather than
   promises.
3. Engage the paid reviewer and open the 2-of-3 Safe. Decide who deploys.
4. Adopt, in writing and before they are needed: the tie-fails rule, the gift policy, the
   founder sell policy, and the compensation clause.
5. Decide the fee question. The recommendation is no fee, plain ERC-20, ownership renounced.
6. Publish the founder's wallet address, labelled unlocked, alongside the sell policy.
7. Update `cp17-site` so the page matches reality on day one — supply split, unlocked
   founder position, multisig, committee members.
8. Build the book-bundle claim flow (code at purchase, redeem on cp17.org, batched sends)
   and fund the program wallet by one minuted Safe decision — after counsel clears the
   bundle, before launch.
9. Launch per `TOKEN_LAUNCH_STRATEGY.md`, with the amended split.
10. Publish quarterly: gifts, spends, minutes, compensation.

---

*Prepared as internal strategy analysis. Nothing here is legal, tax, or financial advice.
Review the securities questions in `docs/LEGAL-BRIEFING.md` with qualified counsel, and the
compensation and entity questions with a CPA, before acting on any of it.*

---

## Decision record: the book bundle is removed entirely (August 16, 2026)

**Decision.** There is no coin-per-book program, and no free-claim program either.
The coin trades on Uniswap and nowhere else; the book is sold on its own site with
no coins attached. Nothing connects the two but the story and a link.

**How it happened.** The bundle ("You get some Hope when you buy a book," direct
sales only) was Hope's veto: too confusing for older readers — precisely the people
the book reaches. A free-claim replacement (a small gift of HOP from the site, one
to a person, no purchase) was considered for about a minute and rejected the same
way: "No claim." Every program that hands out coins needs a wallet on the receiving
end, an anti-abuse rule, and an explanation — which is the confusion, just relocated.

**What this simplifies.**

- *For readers:* the pitch is now one sentence. The book is a book. The coin is a
  souvenir some people buy. Nobody has to understand a redemption flow.
- *Legally:* the strongest version of the Howey posture is restored — the issuer
  never takes money in any transaction that delivers tokens, and never delivers
  tokens at all. The book-bundle question prepared for counsel is withdrawn; the
  remaining counsel questions stand.
- *Operationally:* no claim codes, no batched sends, no gift-wallet row on the
  ledger, no Sybil policing, no gas budget for giveaways.

**What it supersedes.** The bundle decision ("we bring it back to tie it together
and coin offered for every book," direct sales only) and its tagline "You get some
Hope when you buy a book." The tagline is retired from the site and from launch
copy. T-shirts (Hope on the front, cp17 on the back) are unaffected. The
book-program wallet is deleted from the ledger page; the 50M treasury allocation
is untouched by this change.

**Site effect.** The coin page's book section now reads "The book is the book, and
the coin is the coin" and says plainly that neither is required for the other and
that money from one never funds the other — which also restates the standing
funding boundary (book profits never enter the LLC).

---

## Decision record: the physical HOPE coin (August 17, 2026)

**Decision.** A real, minted keepsake coin — Hope's portrait on the front, HOPE
on the back, matching the mockup — proceeds as merchandise, alongside the
T-shirts (Hope on the front, cp17 on the back).

**The plan, as agreed.**

1. **Prototype first.** One single coin from a one-off maker (~$25), put in
   Hope's hands before anything is committed.
2. **Then a run of 100** from a proper coin maker (antique-silver finish;
   roughly $400–700 all-in at $4–8 per piece).
3. **Two tiers, real metal: $200 silver and $750 gold** (decision of
   August 17, superseding the same-day $25 and $50/$100 finish plans;
   the gold price moved $500 → $750 the same day to put real margin
   over the metal).
   - **$200 — real 1 oz .999 silver.** Metal ~$66 at the August 17 spot
     (~$65.60/oz), all-in cost ~$80–90 with minting and die share. Healthy
     margin; full 39mm size carries the portrait.
   - **$750 — solid gold, 1/10 troy oz.** Metal ~$439 at the August 17 spot
     (~$4,380/oz); with small-run minting premiums the all-in cost runs
     roughly $460–500, leaving ~$250–290 of margin at $750. Two standing cautions:
     gold spot moves, so confirm cost against spot before each batch (and
     reprice or pause the tier if spot rises); and at 16–18mm the coin is
     nickel-sized — the die maker must confirm the portrait reads at that
     size, or the gold tier carries the HOPE text side alone.
   Both tiers are exactly what they say — real .999 silver, real solid
   gold — so the finishes-not-metal caveat from the prior plan no longer
   applies; the truth got simpler. Boxes, cards, and numbering should make
   the prices feel deserved.

**Production model: pre-orders, not inventory (added August 17, 2026).**
A full 100-coin silver run costs roughly $8,400–9,600 all-in (about $6,600
of that is the metal itself at the August 17 spot; the rest is minting
premium, one-time portrait dies, boxes and cards, insured shipping) — so
the run is funded by pre-orders instead of upfront capital:

1. **Prototype first** (~$25, unchanged): one coin into Hope's hands for
   the final say before anything else is spent.
2. **Announce and take paid pre-orders** for a 3–4 week window, shipping
   quoted at about six weeks. Upfront exposure shrinks to the dies and
   prototype (~$600); the buyers' money buys the silver.
3. **Mint exactly what sold**, plus a small buffer. The final run size
   becomes a published fact afterward — "this many were ever made" — in
   the project's spirit of receipts over pledges.
4. Gold coins (1/10 oz solid, $750) are pre-order only, always: at
   ~$460–500 of cost each, no gold is bought before it is sold.

Funding boundary restated for the avoidance of doubt: all of this is
merch-side money — personal/book-world funds in, merch revenue out. None
of it flows through the LLC or touches the crypto treasury.

**Where the coins are sold (August 17, 2026): the Cardinal's site.** "If
it's on the site, it's the Cardinal" — the pre-order page and any future
merch live on thecardinalspromise.com, the book's own home. hopecoin.org
never sells anything: no store, no pre-orders, no checkout, ever. The
token site stays what it is — a page of promises anyone can check — and
the separation of the two worlds is something a visitor can see, not
just something we say.

**Two coin designs, one public face (August 17, 2026).** "If it's on the
site, it's the cardinal" resolved into a design rule once the second
mockup arrived:

- **The cardinal coin** — a cardinal on a branch over "CP17" on the
  front; "CARD · SUPPORT TEAM · Courage · Recovery · Legacy" on the
  reverse, copper/bronze in the mockup. This is the *public* design: any
  coin pictured on any website, pre-order page, or promotion is this one.
  The support-team framing also makes it the natural recognition coin —
  a challenge coin in the recovery tradition, which suits the book's
  Lakeview thread.
- **The Hope coin** — her portrait and HOPE. Private by rule: it is never
  pictured on a site, a listing, or an ad. It exists as the gift and the
  family keepsake, which is what it was always for.

Decided the same day ("back to this just for coin" / "specialty
addition Hope" / "ok yes"): **the cardinal is the coin's identity.** The
cardinal design carries the sold tiers — $200 silver and $750 gold — and
the cardinal mark replaces the sunrise on hopecoin.org (the token logo in
assets/logo.svg was already the cardinal, so the identity now matches
end to end). **The Hope-portrait coin is the specialty edition**: small,
numbered, released at the founder's discretion, and still never pictured
on any site or listing. Whether the copper "support team" version is
sold cheaply or given as recognition remains open.

*Open proposal, not yet decided:* pledging 2% of each physical-coin sale
to the giving-list organizations, echoing the on-chain 2% fee. Decide
before the pre-order page is written.


**Boundaries, so the clean lines survive.**

- The metal coin is **merchandise** — its money lives on the book/merch side
  and never enters the LLC or the crypto treasury, per the standing funding
  boundary. It is never bundled with HOP tokens and never marketed as the
  cryptocurrency; it is a T-shirt that happens to be round.
- **Hope's face** appears on the physical coin and (with her consent, already
  given for the site) may appear on hopecoin.org. Any wider use — especially
  the on-chain token logo that would appear in every wallet and on Etherscan
  permanently — requires her explicit, specific yes. The official token logo
  remains the sunrise mark.

---

## Decision record: the token reverts to Cardinals Promise (CARD) (August 17, 2026)

**Decision.** The on-chain token is **Cardinals Promise (CARD)** — contract
`CardinalsPromise`, name "Cardinals Promise", symbol CARD, proof page at
cardinalspromise.org. The Hope Coin (HOP) identity is retired on-chain.
Confirmed by the founder in this session after the direction arrived from
the companion session via PR #111.

**Why.** The token namespace research: **HOP is Hop Protocol's established
ticker** (Ethereum L2 bridge, listed on the major screeners), and the
HOPE name is already used by third-party tokens on other chains. A small
new token sharing a ticker with an established project pools with it in
every search, screener, and wallet list — the opposite of the
single-official-source anti-fake strategy.

**What survives unchanged.** Everything substantive: the immutable 2% fee
and its claims/invariants/tests, fixed 250M supply, the board economics,
the blunt-disclosure site (navy/gold, cardinal mark, green buy button,
four-step Robinhood walkthrough), and the funding boundaries.

**Where Hope lives now.** The Hope name and portrait move entirely to the
physical merch side — the specialty-edition coin, sold or given from the
book's world, never pictured on a site. The colophon line "In honor of
Hope · and of Lou Brizzi, 9 January" stays on every page of the token
site: the honor stands; the ticker changes.

**Open questions from the founder, not yet decided (asked as "could we
do two coins" / "only 100 mill"):** whether a second on-chain token
should exist at all, and what its supply would be. Recommendation
recorded against it — two tokens split the same small liquidity, double
the legal and fake-token surface, and re-enter the crowded HOPE
namespace — but the decision is the founder's and nothing is built
until it is made.

---

## Decision record: demand and the waiting lists (August 17, 2026)

**Two lists, mirroring the money wall.** Both live in the founder's Kit
account (the-cardinal-s-promise.kit.com), each as its own form so the
audiences never mix:

1. **The launch list** (linked from cardinalspromise.org): one email on
   launch day carrying the only official contract address. Framed and
   operated as a safety measure, not marketing — no price talk, no
   countdowns, no reasons to buy, ever. This framing is a legal
   constraint, not a style choice: promoting demand for the token is
   what would turn a souvenir into an investment pitch.
2. **The coin pre-order list** (for thecardinalspromise.com): early
   notice of the physical-coin pre-order window. Ordinary merch
   marketing — full throttle allowed. List size also sizes the mint run
   before any silver is bought.

**Demand drivers adopted:** the book carries it (option 4 — a
back-of-book page and an insert card in every direct-shipped copy,
pointing to the coins and the book's site); honest scarcity on the merch
("minted once, count published"); the story itself as press material.
Explicitly rejected: any paid promotion, influencer marketing, or
scarcity framing for the token.

---

## Decision record: the entity is Cardinals Platform LLC (August 17, 2026)

**Decision.** The operating entity's name is **Cardinals Platform LLC**,
superseding the working name CP17 LLC used throughout the earlier sections of
this document. Every earlier reference to "CP17 LLC" — the funding boundaries,
the accountable-plan reimbursement structure, the S-corp threshold analysis,
the risk table — describes this same entity and remains in force unchanged.
Only the name moved.

**Scope of the change.** Nothing else follows from it. The token stays
Cardinals Promise (CARD). The proof page stays cardinalspromise.org. The
`cp17-site` folder keeps its path (a directory name is not a brand), and
cp17.org remains a forward the founder controls. The T-shirts keep their
cp17 back print unless the founder says otherwise.

**Two cautions to carry into formation.**

1. **"Cardinal" is a crowded trademark space** — heavily used in healthcare
   (Cardinal Health) and finance. The earlier recommendation of a boring,
   uncrowded legal name existed precisely to keep the entity's name out of
   any plaintiff's reach; naming the LLC "Cardinals Platform" gives that up
   deliberately. Have counsel run a name-availability and mark search before
   filing with the state, not after.
2. **"Platform" describes something that does not exist yet.** The entity
   holds a token, a treasury, a domain, and a merch line — not a platform in
   the software sense. That is fine as a name, but it should never appear in
   copy that implies functionality the project does not have.

---

## The meaning of the mark (August 17, 2026)

Recorded because it is the reason the bird is on the page, and because copy
written later should not drift from it. In the founder's words: *"The cardinal
offers people Hope. Not in the sense of the coin but in life."*

A cardinal appearing is, for many families, taken as a sign — a visit, a
reason to keep going. This family watched for one. The site now says so
plainly in a section titled "Why a cardinal," and it draws the distinction
the founder drew: the hope on offer is the ordinary kind that carries a
person through a hard week, explicitly **not** an expectation that the coin
appreciates. The section ends by saying the bird will go on doing that
whether or not the coin is ever worth anything.

This is the one place on the token site where the writing reaches for meaning
rather than proof. It stays short, and it stays free of any suggestion that
buying something is how a person gets hope.

---

## Decision record: the linking policy (August 17, 2026)

**Decision.** The token keeps the name **Cardinals Promise (CARD)** and its
cardinalspromise.org proof page. The link between the coin and the book runs
**one direction only**.

**The coin may point at the book.** Attribution is honest and it is where the
mark's meaning comes from — the cardinal, the promise, Lou. It also lives on a
web page, which means it can be undone in minutes if that ever becomes the
right call.

**The book must not point at the token in print.** A printed page ships in
every copy, sits on shelves for years, and cannot be edited if the coin has a
bad chapter. A memoir about a father's death with a cryptocurrency URL bound
into it is the one link that can never be taken back. Therefore:

- **No back-of-book page pointing to cardinalspromise.org.** (A draft of one
  was written on August 17 and is withdrawn — it should not go to print.)
- **The loose insert card may point to the book's own site and the physical
  coins only** — reprintable, and merchandise rather than a ticker.
- Author bio, acknowledgments, and jacket copy stay free of the token.

**Standing guardrails.**

1. The book's cover art and exact title never appear on token assets, exchange
   listings, or token-list submissions.
2. Hospice and charitable work stays in the book's channels, never in coin
   promotion.
3. If asked whether book buyers funded a crypto scheme, the answer is already
   documented: the money never mixed.

**The condition that would reopen this.** If the founder pursues hospice
partnerships, care-conference speaking, or nonprofit collaboration around the
book's mission, those audiences are materially crypto-averse and a token
sharing the book's name can close doors silently. In that case the
recommendation is to de-name the token — keep the bird, drop the
title-derived name and domain — even at the cost of another rename.

---

## The founder's 100M: what it is actually worth, and the rules for using it

**The arithmetic first, because it changes the question.** At the planned
seed — 100,000,000 CARD against roughly $8,000 of liquidity — spot is
$0.00008 per CARD. The founder's 100,000,000 therefore shows a paper value
of about $8,000. That number cannot be realised. Selling into the same
small pool moves the price down as you go:

| Sold | Cash actually received | Price after | Drop |
|---|---|---|---|
| 1,000,000 (1%) | ~$78 | $0.0000785 | −2% |
| 10,000,000 (10%) | ~$714 | $0.0000664 | −17% |
| 25,000,000 (25%) | ~$1,574 | $0.0000516 | −35% |
| 50,000,000 (50%) | ~$2,631 | $0.0000360 | −55% |
| 100,000,000 (100%) | **~$3,960** | $0.0000204 | −74% |

Selling the entire holding yields under four thousand dollars — less than
the pool was seeded with — and takes the price down roughly three quarters
on the way. The position is not a store of value that can be tapped; it is
mostly an accounting artifact. Anyone who models it as $8,000 of personal
wealth is modelling it wrong.

Two consequences worth stating plainly:

1. **There is no version of this where selling the stack is worth doing.**
   The proceeds are trivial and the reputational cost is total — the
   founder's own site publishes the wallet and the promise to announce.
2. **The honest reason to hold it is that it does not matter financially.**
   That is a stronger position than a lock-up, and it should be said in
   those terms rather than dressed up as restraint.

### The rules

1. **Announce before selling.** Already published on cp17.org. Any sale is
   posted before it happens, with the amount, and linked on the ledger
   afterwards. No exceptions, including small ones.
2. **Nothing in the first 90 days.** No sale, no transfer out, no gift to
   anyone who could plausibly sell, for ninety days after launch.
3. **A cap, not a promise of restraint.** In any rolling 30-day period, no
   more than 1,000,000 CARD (1% of the holding, ~2% price impact) moves
   for value. Above that, it stops being a sale and becomes an exit.
4. **20,000,000 is already committed** to the four board grants, vested over
   two years, leaving 80,000,000 genuinely discretionary. Grants are not
   sales and are not subject to the cap, but they are announced the same way.
5. **Never sell on private information.** If the founder knows something
   material that the public does not — winding the project down, a failed
   audit, a legal problem — selling is fraud in substance whatever the
   regulatory status of the token. Disclose first, then the rules above apply.
6. **Every disposal is taxable, and the basis is probably near zero.** Coins
   the founder created are not purchased inventory; nearly all proceeds are
   likely gain. Gifts (to family, including Hope) are transfers: the 2% fee
   applies, and gift-tax reporting thresholds may too. Jeff confirms the
   treatment before the first sale, not after.

### Amendment: sales are scheduled, not discretionary — and dormant for now

The founder proposed quarterly sales on a fixed day and time. The principle
is right and is adopted: a schedule fixed and published in advance removes
discretion, which is what defeats any suggestion of selling on information
buyers did not have. It is the same logic as an executive's pre-arranged
stock plan.

Two adjustments came with it.

**The plan is dormant below real liquidity.** Under the 1,000,000 cap, a
quarterly sale returns roughly $78. A formal selling program that extracts
$78 a quarter costs more credibility than it returns in money. So:

> **No sales of any size while pool liquidity is under $100,000.** The
> public position is simply "the founder is not selling." If liquidity
> ever exceeds $100,000, the schedule below activates and is announced
> before its first use.

**When active: quarterly, published, capped by pool depth rather than by a
fixed token count.**

- A fixed calendar date each quarter, published in advance on the ledger page.
- No more than **1% of the pool's CARD depth** in any quarter — a cap that
  scales with the pool instead of going stale.
- Announced **30 days ahead** of each execution, and linked afterwards.
- Execution broken into several smaller transactions across the day rather
  than one, because a perfectly predictable single sale invites bots to
  trade in front of it — predictability buys credibility and costs
  execution, and this splits the difference.
- The plan is set while no material non-public information exists, and is
  suspended (not accelerated) if any arises.

---

## Decision record: the 2% fee is removed (August 18, 2026)

**Decision.** The transfer fee is eliminated. CARD is a plain fixed-supply
ERC-20 with no `_update` override, no treasury role in the contract, and no
mechanism that could add a fee later. This **supersedes** the earlier
decision recorded in this document ("2% fee decided and confirmed," and the
instruction to stop re-litigating it), which stood for two days and was
implemented in full before being reversed.

**Why it was reversed.** Three findings, in the order that mattered.

1. **A fee-on-transfer token and a one-button retail buy flow are close to
   mutually exclusive.** Standard Uniswap V2 router paths revert
   (`UniswapV2: K`) unless the `SupportingFeeOnTransferTokens` variants are
   used; the default 0.5% slippage tolerance fails on every trade; and
   on-ramp providers and aggregators that auto-swap call standard routers.
   The founder has asked for exactly that one-button flow on the marketplace.
   The alternative — custom swap routing operated by the issuer — puts the
   company deeper into the transaction and worsens the issuer analysis. This
   was decisive.
2. **It cost every ordinary buyer about two points, permanently.** Modelled
   as a retail purchase (on-ramp → USDC → DEX → wallet), the achievable cost
   floor was 9.6% with the fee against 7.6% without at a $3,000 pool, and
   6.4% against 4.4% at $100,000. The gap does not close as liquidity grows,
   because a constant rate survives any depth.
3. **It bought almost nothing.** Price impact is governed by sale size
   relative to pool depth, not by a tax on the input. Shaving a few percent
   off a large sale barely moves that ratio — the modelled difference between
   an untaxed sale and a 5%-taxed one was about a point of price impact. **A
   transfer tax cannot fix a depth problem.**

**The honest cost of removing it.** Price manipulation gets cheaper: a
wash-pump round trip falls from roughly 4.6% of notional to roughly 0.6%.
That is real and is recorded here rather than glossed. It is judged worth
paying, since the fee bought barely a point of genuine protection while
taxing every ordinary buyer far more.

**What this changes elsewhere.**

- **The treasury has no income.** The fee was the only thing that fed it.
  The 50,000,000 CARD allocated at launch is now the entire treasury,
  permanently — there is no top-up mechanism and no way to add one. Every
  statement about the treasury "growing on its own" is removed from the site.
  Operating costs are funded by the founder personally, as they already were
  in practice, since the treasury is coins rather than dollars.
- **Pool seeding is simple again.** The two-step deployer → treasury → pair
  route existed only to dodge the fee on the seed. A direct seed now
  delivers the full 100,000,000.
- **The slippage instruction comes off the site.** Default tolerance works.
- **The round-trip disclosure comes off the site.** There is no round trip
  cost beyond Uniswap's own 0.3% and gas.
- **The claims file** replaces `flat-2pct-fee` with `no-transfer-fee`, backed
  by three Solidity tests, a Node test, an ABI-absence check over
  fee/tax/treasury patterns, and the conservation invariant.

**A note on how this decision was made.** The fee was defended in-session,
implemented, locked at the founder's explicit instruction, and then reversed
two days later on new analysis. That sequence is not a failure of the
process — it is the process working. The record keeps both decisions, and
the reasoning for each, so a reader can see that the reversal was earned
rather than arbitrary.
