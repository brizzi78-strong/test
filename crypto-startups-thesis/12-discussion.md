# 12. Discussion: the maximal-score firm

Every chapter so far has been diagnostic. This one draws the positive picture: what a firm that
scores 100 on [Chapter 9](09-instrument.md) actually looks like, whether it can exist, and whether
you would want to build it.

## Nobody scores 100

The highest score in the study is Coinbase at 88, against a $6.9 billion revenue base and fifteen
years of building. Circle is 82. The best financial outcome in the entire sample — Bridge, 5.5x on
$58 million in three years — scores 67.

So the perfect company is not an observed thing. It is a composite, assembled from parts of six
different firms, and the assembly is the interesting part: each of the ten questions has a real
company that has solved it, and no company has solved more than eight.

## The composite, item by item

| # | Question | Copy from | The move |
|---|---|---|---|
| 1 | Revenue independence | Chainalysis, Bridge | Sell to a buyer whose need is a legal obligation or an operational necessity, not a price expectation. A bank's duty to screen transactions does not soften when bitcoin falls |
| 2 | Asset segregation | Coinbase, Anchorage | Bankruptcy-remote structure, qualified custodian, no rehypothecation, ever, at any price |
| 3 | Reserves vs worst loss | Bybit | Excess capital sized to a total loss, held idle, in place before the event. Bybit's $1.5B night was survivable because the answer already existed |
| 4 | Disclosure beyond required | Circle | Recurring third-party attestation on a fixed schedule, started before anyone asks |
| 5 | States its weakest line | Circle | Quantify the number that most damages you, in recurring public reporting. Circle prints its 59% distribution cost every quarter |
| 6 | Signing path | The inverse of Bybit | Inventory every component in the signing path including vendor front-ends; verify on a device that did not fetch the transaction |
| 7 | Machine-enforced constraints | The small-launch playbook | Renounce what does not need an owner, lock what does not need to move, timelock what does |
| 8 | Licensure | Kalshi | Build inside the regime and litigate for your category, rather than routing around it and hoping |
| 9 | Optionality | Kraken | Be able to say no to a financing or a listing window. Kraken paused a $20B IPO in March 2026 because it could |
| 10 | Token | Bridge | None, or one that is genuinely required by the product with disclosed economics. Both score full marks |

## The three tensions that make 100 hard

Expense is not the interesting obstacle. These are.

**Question 7 fights question 8.** Machine-enforced restraint means no owner, no freeze, no upgrade
path. Regulated financial instruments require the opposite: USDC has an upgradeable contract with a
freeze function precisely because the regime Circle chose demands the issuer be able to act. This is
why Circle scores only 5 of 10 on question 7 — not sloppiness, but a genuine conflict between two
things the rubric rewards.

The resolution, and it is the sharpest design principle in this document: **machine-enforce
everything the law does not require you to control; for the discretion you must keep, make it
visible and slow.** Publish exactly which powers are retained, put each behind a timelock and a
multisig, and announce every use before it happens. Discretion that is enumerated, delayed, and
announced is a different object from discretion that merely exists.

**Question 3 is only affordable if question 9 is already true.** Reserves held against a total loss
are dead capital that shows up as worse growth in every good year. A company that needs to raise
cannot defend that line item to investors who are comparing it to a competitor deploying the same
capital. So the reserve is a luxury purchased by profitability, which means the ordering is fixed:
revenue first, then optionality, then the buffer. You cannot start at the buffer.

**Question 4 is structurally hostile to private companies.** Attestation on a fixed schedule is what
public companies do because they must. A private company adopting it voluntarily pays real money for
a signal with no immediate buyer. Bridge lost 15 points across questions 4, 5, and 6 largely for
being private, and still produced the best outcome in the study. A perfect score effectively
requires being public or behaving as if you were, years before there is any reason to.

## The portrait

Stripped of the scoring apparatus, the firm that scores 100 is unglamorous and specific:

- **One product.** Not a portfolio. Bridge built one API. Kalshi litigated over one category. Tether
  does one thing with a hundred people.
- **A customer who is nameable**, whose need survives an 80% drawdown, and who pays in dollars on an
  invoice.
- **A small team** — small enough that revenue per head buys the optionality in question 9 rather
  than consuming it.
- **Licensed before it was required**, in its primary market, with a written analysis of its own
  structure that gets re-run when the law moves.
- **Customer assets it cannot touch**, structurally rather than by policy.
- **Idle capital** sized to the worst night, that looks like mismanagement every year it is not
  needed.
- **A quarterly attestation nobody asked for**, including the number that hurts.
- **Keys split** across devices and people, with every component in the signing path written down,
  including the vendor code.
- **No token**, unless the product genuinely requires one, in which case its constraints are on-chain
  and its economics were disclosed before launch.

Notice how little of that is about crypto. Eight of the ten items would read identically in a study
of well-run custody banks. That is the thesis arriving at its destination: the best-run crypto
startups are the ones that treat crypto as an input to a business, and the closer a firm gets to a
perfect score, the more it resembles a boring financial institution that happens to settle on public
infrastructure.

## Would you want to build it?

Honestly: only if durability is your objective function.

The rubric measures how likely a firm is to still exist in five years with its markets open. It does
not measure return, and the study's own data makes that uncomfortably clear — Bridge scored 67 and
returned 5.5x in three years; Tether scored 60 and earns $100 million of profit per employee; the
88-scoring company took fifteen years to get there.

So "perfect" here means maximally durable, not maximally valuable. Those are different companies.
The case for chasing durability anyway is the one from [Chapter 7](07-propositions.md): in a
sector where the left tail is absorbing rather than merely bad, the compounding only happens to firms
that are still present to do it. A 67 that survives beats a 90 that does not exist, and every
principle here is a way of buying presence.

The practical reading, for anyone below the scale of the firms in this study: do not aim at 100. Aim
at question 1 — one customer, paying dollars, for something they need regardless of price — and take
questions 6 and 7 because they are nearly free. That is roughly a 60, achievable inside a year, and
it is the entire distance between a project and a company.
