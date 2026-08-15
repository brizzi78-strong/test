# 2. Literature review

Four bodies of work bear on the question. The first three are mature and supply the mechanism; the
fourth is the sector-specific literature, which is empirically rich and theoretically thin in
precisely the place this dissertation intervenes.

## 2.1 Asymmetric information and market degradation

Akerlof (1970) established that when buyers cannot distinguish quality before purchase and sellers
can, the market price converges on the expected quality of the pool, driving high-quality sellers
out and degrading the pool further. The used-car formulation is incidental; the structure applies
wherever quality is private information and misrepresentation is cheap.

Digital-asset markets satisfy the conditions in an unusually pure form, and with an aggravating
feature Akerlof did not consider: settlement irreversibility. In a market for goods, a defrauded
buyer retains legal recourse and the transaction can often be unwound. Where settlement is final and
the counterparty may be pseudonymous or offshore, the buyer's recourse approaches zero, which raises
the payoff to misrepresentation and therefore the equilibrium share of low-quality sellers.

Gorton and Metrick (2012) supply the closest financial analogue: a run on repo occurs when
counterparties cannot verify collateral quality and respond by withdrawing indiscriminately from
good and bad borrowers alike. The mechanism — an information problem producing an
undifferentiated withdrawal — recurs throughout the sector's history and is visible in the
withdrawal cascades of November 2022.

## 2.2 Signaling and commitment

Spence (1973) showed that where quality is unobservable, agents may credibly convey it by
undertaking an action whose cost is inversely related to their quality: education signals ability
because it is cheaper for the able. Zahavi's (1975) handicap principle makes the same point in
biology and states the requirement most sharply — the signal must be *costly*, and costly in a way
that is differentially harder for low-quality signalers to bear, or it conveys nothing.

Schelling (1960) supplies the complementary construct: strategic advantage can be obtained by
irreversibly limiting one's own options, because a commitment that cannot be revoked changes what
others rationally expect. Schelling's commitments are political and reputational. This dissertation
argues that public-blockchain settlement makes available a class of commitment that is
*mechanically* rather than reputationally enforced, and that this class is stronger than anything
available to a conventional firm: a renounced contract owner is not a promise not to mint, it is the
removal of the capacity to mint.

The literature on this specific point is thin. Cong, Li and Wang (2021) model token adoption
dynamics and treat supply schedules as exogenous design parameters rather than as credibility
instruments. Howell, Niessner and Yermack (2020) come closest empirically, finding that ICOs
featuring voluntary disclosure and credible commitment mechanisms exhibited superior outcomes — a
result consistent with the framework advanced here but not theorised as signaling.

## 2.3 Agency, custody, and the economics of the run

Jensen and Meckling (1976) frame the divergence between managers' and claimants' interests and the
costs incurred to constrain it. Segregated custody is, in these terms, a bonding expenditure: the
firm surrenders access to assets it could otherwise deploy, in order to make a class of agency
failure structurally impossible rather than merely prohibited.

Diamond and Dybvig (1983) explain why the failure mode is discontinuous. Where liabilities are
demandable and assets are not immediately liquid, two equilibria exist, and the transition between
them is triggered by belief rather than by fundamentals. This accounts for the observation developed
in Chapter 5 that commingled-asset failures have no gradual version: the firm is fine until the
withdrawal request exceeds the liquid buffer, at which point it is not.

Williamson (1985) supplies the framing for why these commitments are made at the level of structure
rather than contract. Where opportunism is possible and verification is costly, governance
structures that remove discretion dominate contracts that merely prohibit its abuse.

## 2.4 The crypto-finance literature

The empirical literature is substantial. Makarov and Schoar (2022) survey the structure of
decentralised finance and document its dependence on centralised choke points. Aramonte, Huang and
Schrimpf (2021) advance the "decentralisation illusion" argument: governance concentrates even in
nominally decentralised systems, which implies that firm-level managerial choice remains the
relevant unit of analysis — an assumption this dissertation adopts.

On stablecoins specifically, Lyons and Viswanath-Natraj (2023) examine the mechanics of peg
stability and the role of reserve composition and redemption access. Griffin and Shams (2020) is the
most directly relevant precedent for Chapter 8, presenting evidence on unbacked issuance dynamics at
a major issuer; the debate it opened over attestation-versus-audit remains unresolved and is the
substance of the counter-case.

Peters (2019) is drawn on for a different purpose. The ergodicity argument — that time-average and
ensemble-average returns diverge in the presence of an absorbing barrier, so that a strategy with
positive expected value may still lead to ruin with probability approaching one — is the formal
statement of why the trade this dissertation identifies is rational. Taleb (2012) makes the
practitioner version of the same claim. Where ruin is absorbing, purchasing a floor is not
conservatism but a precondition for compounding at all.

## 2.5 Research design precedent

Eisenhardt (1989) and Yin (2018) establish the multiple-case design for theory building where the
phenomenon is contemporary, the boundaries with context are unclear, and the N is necessarily small.
Flyvbjerg (2006) defends the information content of purposively selected cases against the charge
that only random samples support inference.

Denrell (2003) is methodologically decisive for this study and is treated at length in Chapter 4.
Studying survivors and inferring the causes of survival systematically undersamples failure and
produces management folklore. His argument motivates the design choice adopted here: failure cases
are analysed for the *absence* of specified controls rather than survivors for the presence of
shared traits. Brown, Goetzmann, Ibbotson and Ross (1992) quantify the analogous bias in fund
performance studies.

## 2.6 The gap

The mature literatures supply a mechanism but were not written about this market: Akerlof and Spence
predate public-blockchain settlement, and neither anticipates a commitment technology that is
mechanically rather than socially enforced. The crypto-finance literature describes this market in
detail but treats governance and disclosure choices as compliance facts or exogenous design
parameters rather than as costly signals with separating properties.

Neither literature offers what a practitioner requires and what this dissertation attempts: a
construct that is defined ex ante, grounded in an identified mechanism, falsifiable against observed
cases, and operational enough to be applied to a specific firm from public information. Chapter 3
constructs it.
