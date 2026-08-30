# DRAFT — Operating Agreement

> ## Do not sign this document.
>
> This is an unexecuted draft prepared to give North Carolina counsel a
> starting point instead of a blank page. It has not been reviewed by a
> lawyer. It may contain provisions that are unenforceable, unnecessary, or
> wrong for this situation, and it may omit provisions that matter.
>
> Bracketed `[ALL-CAPS]` text marks a decision or fact that must be filled in.
> Articles VII through X are the unusual ones — they encode the project's
> conduct rules into the entity's governing document. Counsel should be asked
> directly whether that is wise, because it cuts both ways: it demonstrates
> commitment, and it also creates a written standard the Company can be
> measured against.

---

**OPERATING AGREEMENT OF [COMPANY NAME], LLC**

A North Carolina limited liability company

Effective [DATE]

---

## Article I — Formation

**1.1 Formation.** The Company was formed as a limited liability company
under the North Carolina Limited Liability Company Act, Chapter 57D of the
North Carolina General Statutes, by the filing of Articles of Organization
with the North Carolina Secretary of State on [FILING DATE].

**1.2 Name.** The name of the Company is [COMPANY NAME], LLC.

**1.3 Principal office.** The principal office of the Company is
[ADDRESS], or such other place as the Member may designate.

**1.4 Registered agent.** The registered agent and registered office are as
stated in the Articles of Organization, as amended from time to time.
*[Counsel: confirm whether the Member intends to serve as registered agent
personally, which places a home address on the public record, or to engage a
commercial registered agent service.]*

**1.5 Term.** The Company shall continue perpetually unless dissolved under
Article XI.

## Article II — Purpose

**2.1 Purpose.** The Company is organized to develop, deploy, document, and
administer a fixed-supply ERC-20 token on the Ethereum blockchain bearing the
name "Cardinals Promise" and the symbol "CARD" (the "Token"), of which
1,000,000,000 units are minted once at deployment, together with all lawful
activities incidental to that purpose.

**2.2 Purposes expressly excluded.** For the avoidance of doubt, the Company
is **not** organized to, and shall not:

  (a) conduct a pre-sale, private sale, or private round of the Token;

  (b) raise capital from any person through the issuance or transfer of the
      Token;

  (c) hold, custody, transmit, or exchange digital assets on behalf of any
      other person;

  (d) provide investment, financial, or tax advice to any person.

*[Counsel: subsection (c) is drafted with N.C.G.S. Chapter 53, Article 16B
in mind. Please confirm it is both accurate to the intended operations and
adequate as a limitation, including as applied to the companion application
described in `docs/REAL-PURCHASE-FLOW.md`.]*

## Article III — Member

**3.1 Sole Member.** [MEMBER NAME] is the sole Member of the Company and owns
one hundred percent (100%) of the membership interests.

**3.2 No other members.** No additional member shall be admitted without the
written consent of the Member and, if then advisable, written advice of
counsel regarding the consequences of admission.

**3.3 Separate property.** All capital contributed to the Company under
Article IV has been and shall be contributed from the separate property of
the Member. No funds, accounts, or assets belonging to the Member's spouse or
to any other person have been or shall be contributed to the Company or used
in its operations.

*[Counsel: North Carolina is an equitable distribution state rather than a
community property state. Please advise whether § 3.3 achieves the intended
separation, and whether the acknowledgment at Exhibit B is advisable,
unnecessary, or counterproductive.]*

## Article IV — Capital

**4.1 Initial contribution.** The Member has contributed $[AMOUNT] in cash
and [DESCRIBE ANY NON-CASH CONTRIBUTION, INCLUDING ETH OR OTHER DIGITAL
ASSETS, WITH VALUATION AND DATE] to the capital of the Company.

**4.2 Additional contributions.** The Member is not obligated to make
additional contributions. Any additional contribution shall be recorded in
the books of the Company with its date, amount, and source.

**4.3 No borrowed funds.** The Company shall not fund its operations with
borrowed money, and the Member shall not borrow to make a contribution.

**4.4 No third-party funds.** The Company shall not accept funds from any
person other than the Member.

## Article V — Management

**5.1 Member-managed.** The Company is managed by its Member.

**5.2 Authority.** The Member has full authority to act for the Company,
subject to the limitations in Article II and Articles VII through X.

**5.3 Standard for irreversible acts.** Before the Company takes any action
that cannot be undone — including deploying a smart contract to a public
mainnet, renouncing contract ownership, seeding a liquidity pool, locking
liquidity provider tokens, or transferring Tokens to any person — the Member
shall record in the books of the Company the date, the action, the reason,
and any advice of counsel relied upon.

## Article VI — Liability, indemnification, and distributions

**6.1 Limited liability.** Except as required by Chapter 57D, the Member is
not personally liable for the debts, obligations, or liabilities of the
Company.

**6.2 Observance of formalities.** The Member shall maintain the Company's
separateness: a dedicated bank account, dedicated wallets, no commingling of
Company and personal funds or digital assets, contracts executed in the
Company's name, and books kept current. *[Counsel: please advise on what else
is required in North Carolina to reduce veil-piercing risk for a
single-member LLC.]*

**6.3 Indemnification.** The Company shall indemnify the Member to the
fullest extent permitted by Chapter 57D. *[Counsel: confirm scope and any
required limitations.]*

**6.4 Distributions.** Distributions are made at the discretion of the
Member, subject to Article VII and to the solvency limitations of
Chapter 57D.

## Article VII — The Token: allocation and sale

*[Counsel — read this article first. The allocation below gives the Member,
personally, 25% of total supply with no lock. That is the central fact of
this project and the one most likely to affect your analysis. The
restrictions in §§ 7.3–7.5 are policy adopted by the Member; nothing in the
Token's code enforces them. Please advise whether a contractual restriction,
an escrow, or an on-chain vesting arrangement should replace or supplement
them, and what disclosure must accompany any sale.]*

**7.1 Allocation.** Following deployment the Token supply is allocated:

  (a) 550,000,000 (55%) to a Uniswap V2 liquidity pool, the liquidity
      provider tokens for which are locked for not less than twelve months
      through an established locking service;

  (b) 250,000,000 (25%) to the Member personally, unlocked;

  (c) 200,000,000 (20%) to a treasury wallet, the address of which is
      published.

*[Counsel: the transfer at (b) moves Company property to the Member
personally. Please advise on its characterization — distribution,
compensation, or otherwise — and its tax treatment, and whether the Member
should instead hold that allocation through the Company.]*

**7.2 The treasury is never sold.** The Company shall not sell, offer to
sell, auction, swap for consideration, or otherwise dispose of treasury
Tokens for value, at any time, in any amount, in any venue, to any person.
This prohibition applies without exception, including to fund Company
operations or professional fees.

**7.3 No founder sales below the liquidity threshold.** Neither the Company
nor the Member shall sell Tokens while the liquidity of the public pool is
below one hundred thousand United States dollars ($100,000).

**7.4 Scheduled sales only.** Above that threshold, sales shall occur only
in accordance with a schedule fixing timing and a maximum quarterly volume,
adopted and published before the first sale. The schedule shall not be
amended except on written advice of counsel, and any amendment shall be
published with its effective date.

**7.5 Disclosure of sales.** Each sale shall be published within seven days
of settlement, stating its date, the quantity of Tokens, and the transaction
hash.

**7.6 No pre-sale or allocation for value.** The Company shall not conduct a
pre-sale, private sale, or private round, and shall not transfer Tokens in
exchange for services, promotion, advice, early access, or any other
consideration.

**7.7 No sales by others on the Member's behalf.** The restrictions in this
Article apply to any person holding Tokens received from the Company or the
Member, including family members.

## Article VIII — The Token: communications

**8.1 Verifiability standard.** The Company shall publish only statements
that a person unaffiliated with the Company can independently verify against
the public blockchain or the Company's public source repository.

**8.2 No statements of value.** The Company and the Member shall not state,
imply, predict, forecast, or speculate as to the price, value, or future
price or value of the Token, in any medium, whether public or private.

**8.3 No solicitation.** The Company and the Member shall not recommend,
encourage, or invite the purchase of the Token, and shall not state any
condition upon which a person should purchase it.

**8.4 No affinity marketing.** The Company and the Member shall not connect
the purchase of the Token to any book, author, mission, charitable cause,
bereavement, hospice care, or family legacy.

**8.5 Disclosure of the Member's holding.** Every public description of the
Token shall disclose the size of the Member's personal holding, that it is
unlocked, and that the restrictions in Article VII are policy rather than a
technical constraint.

**8.6 No description of mechanisms not implemented.** The Company shall not
describe the Token as having any feature its deployed code does not
implement. The Token has no transfer fee, no treasury routing, no staking,
and no governance.

**8.7 No forward-looking statements.** The Company shall not promise or
describe as planned any future development, feature, listing, partnership,
or undertaking with respect to the Token.

**8.8 Nothing described as real until it exists.** No board, grant,
charitable commitment, partner network, or affiliated entity shall be
described publicly until it exists and the necessary written, legal, and tax
work is complete.

## Article IX — The treasury

**9.1 Disposition under published policy only.** Treasury Tokens shall be
disposed of only in accordance with a written policy adopted and published
before the first disposition, and never by sale (§ 7.2).

**9.2 Records.** The Company shall record and publish, for each treasury
disposition: date, recipient, quantity of Tokens, transaction hash, and the
fair market value of the Tokens at the time of transfer.

*[Counsel: the Member's intention has been that the treasury be donated to
tax-exempt organizations rather than retained. That intention is not yet
committed and no recipient has been engaged. Please advise on the
substantiation requirements for non-cash charitable contributions of digital
assets, whether such a commitment should be made binding here or left as
policy, and whether the intended recipients can accept digital assets at
all.]*

## Article X — Keys, custody, and succession

**10.1 Custody.** Private keys controlling Company wallets shall be held on
dedicated hardware wallets. Keys shall not be stored in browser extensions,
on machines used for daily personal or business activity, in cloud storage,
in photographs, or in any location accessible over a network.

**10.2 Recovery material.** Seed phrases and recovery material shall be
recorded offline and stored securely.

**10.3 Succession.** The Member shall document the existence and location of
all recovery material in the Member's estate planning instruments, and shall
identify the person or persons authorized to access it upon the Member's
death or incapacity. This obligation is a continuing one and shall be
reviewed at least annually.

**10.4 Consequence of failure.** The Member acknowledges that recovery
material that cannot be located by a successor renders the affected holdings
permanently inaccessible, and that no third party can remedy this after the
fact.

*[Counsel: please coordinate Article X with the Member's existing estate
planning documents, and advise on whether a separate written instruction,
held with the will, is preferable to reciting the location in the will
itself.]*

## Article XI — Dissolution

**11.1 Events of dissolution.** The Company dissolves upon the written
election of the Member, or as otherwise required by Chapter 57D.

**11.2 Winding up.** On dissolution, the Company shall pay or provide for its
liabilities, dispose of any remaining treasury in accordance with Article IX,
and distribute any remaining cash assets to the Member.

**11.3 Survival.** The prohibition on treasury sales in § 7.2 survives
dissolution and binds any successor in interest to the treasury.

*[Counsel: § 11.3 is intended to prevent dissolution from becoming a route to
liquidating the treasury. Please advise whether it is enforceable as drafted,
and if not, what mechanism would achieve the intent — a charitable pledge, a
restricted trust, or another structure.]*

## Article XII — General

**12.1 Governing law.** This Agreement is governed by the laws of the State
of North Carolina.

**12.2 Amendment.** This Agreement may be amended only in a writing signed by
the Member. Any amendment to Articles VII, VIII, IX, or X shall be made only
after written advice of counsel, and the amendment shall be published with
its effective date.

**12.3 Severability.** If any provision is held unenforceable, the remainder
continues in effect.

**12.4 Entire agreement.** This Agreement constitutes the entire agreement of
the Member concerning the Company.

---

**IN WITNESS WHEREOF**, the sole Member has executed this Agreement effective
as of the date first written above.

<br>

`_______________________________`
[MEMBER NAME], Sole Member

<br>

---

## Exhibit A — Conduct rules incorporated by reference

The document `docs/CONDUCT-RULES.md` in the Company's public source
repository, as of the effective date of this Agreement, is incorporated by
reference. Where that document and this Agreement conflict, this Agreement
controls.

*[Counsel: incorporating a repository file by reference is unusual, because
the file can change. An alternative is to attach a dated copy as a static
exhibit. Please advise which is preferable.]*

## Exhibit B — Spousal acknowledgment *(optional — for counsel's judgment)*

> *[Counsel: include, revise, or delete. The intent is to record that Company
> capital came from separate property and that the Member's spouse neither
> contributed funds nor participates in the Company's operations, so that the
> spouse is not exposed to liability arising from the Company's activities.
> Please advise whether this is effective in North Carolina, whether it
> requires independent counsel for the spouse to be meaningful, and whether
> it creates any unintended effect on marital property.]*

The undersigned, spouse of [MEMBER NAME], acknowledges that:

1. [COMPANY NAME], LLC was capitalized solely from the separate property of
   [MEMBER NAME];

2. the undersigned has not contributed funds, accounts, digital assets, or
   other property to the Company;

3. the undersigned is not a member, manager, employee, or agent of the
   Company, and does not participate in its management or operations; and

4. the undersigned makes no claim to the membership interests of the Company.

<br>

`_______________________________`
[SPOUSE NAME]

<br>

Date: `_______________`

---

*Prepared as a drafting aid. Not legal advice. Not to be executed without
review by a licensed North Carolina attorney.*
