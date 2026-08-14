# Chapter 7. Termination and the September 2025 natural experiment

## 7.1 The event

The One Big Beautiful Bill Act was signed on July 4, 2025 and terminated §30D, §25E, and §45W for vehicles acquired after September 30, 2025. Registration for new participants in the Energy Credits Online clean vehicle program closed the same day. IRS guidance issued after enactment took the position that a vehicle is acquired when a written binding contract is in place and a payment has been made, so a buyer who contracted and paid on or before September 30 could still claim the credit on placing the vehicle in service later.

For an empiricist this is close to an ideal design. The date is exogenous to any individual buyer or dealer, precisely known, and universally understood. The treatment is a discrete withdrawal of up to $7,500 from new purchases, $4,000 from used, and up to $7,500 of lease cash from the commercial channel. The outcome is measured monthly, at high quality, by multiple independent commercial sources, in a market with excellent VIN-level administrative records.

## 7.2 What happened to volumes

The monthly series around the cutoff:

| Period | Observation |
|---|---|
| September 2025 | Battery-electric share of U.S. new-vehicle sales reaches an all-time high of 11.3% |
| September 2025 | Unadjusted electric vehicle sales of 98,289 units |
| October 2025 | Battery-electric share falls to 5.9% |
| October 2025 | Unadjusted sales of 74,897 units, a 24% decline from September |
| October 2025 | NADA's measure shows battery-electric sales down 46.7% month over month |
| October 2025 | Average electric vehicle discounts rise to roughly $13,161 |
| Q1 2026 | New electric vehicle sales down roughly 28% year over year; used electric vehicle demand at record levels |
| Q2 2026 | 247,226 units, up 14.2% quarter over quarter, down 20.5% year over year |
| H1 2026 | 462,892 units, down 23.8% year over year (Cox Automotive); share around 6% |

The two October figures require comment rather than reconciliation. A 24% decline in unadjusted units and a 46.7% decline on NADA's measure are not the same statistic: they differ in seasonal adjustment, in the vehicle universe (all electrified versus battery-electric only), and in the treatment of September deliveries under contracts signed before the cutoff. Both are reported here because the gap between them is itself informative about how much of October's activity was tail-end fulfilment of pre-deadline acquisitions. An analyst working with the underlying data should date transactions by contract date rather than delivery date, which is exactly what the statutory acquisition rule requires and exactly what Form 15400 records.

## 7.3 Separating the pull-forward from the level effect

The September spike and the October trough are one phenomenon with two components, and the whole empirical challenge is separating them.

**Intertemporal substitution.** A buyer who would have purchased in November bought in September to beat the deadline. This shifts the timing of a purchase and does not change whether it happens. It inflates September and deflates October and November, and by construction it nets to zero over a long enough window.

**The level effect.** A buyer for whom the vehicle was worth buying at $40,000 net and not at $47,500 does not buy at all, or buys a hybrid or a gasoline vehicle. This is the parameter that matters for policy: the sustained reduction in adoption attributable to withdrawing the subsidy.

The 2026 data begin to identify the second, because a pull-forward of a few weeks cannot depress volumes nine months later. First-half 2026 volumes of about 463,000 units, down 23.8% year over year, are past the point where displaced September demand can explain the shortfall. That leaves an implied level effect in the region of a fifth to a quarter of the market, subject to four confounders that a serious estimate has to address: the base period was itself inflated by the pre-deadline rush in its own later months; manufacturer discounting replaced part of the subsidy, so the observed price change is materially smaller than $7,500 and the elasticity implied is correspondingly larger; manufacturers also responded on the content margin rather than the price margin, Tesla introducing a decontented Model Y "Standard" within a week of termination, so a constant-quality assumption fails and hedonic controls are required rather than optional; and 2026 saw model introductions and a general consumer shift toward conventional hybrids that would have moved the series regardless.

The Q2 2026 recovery, up 14.2% sequentially while still down 20.5% year over year, is consistent with a market re-equilibrating at a lower level rather than returning to trend. Read alongside the record used-electric-vehicle demand reported for Q1 2026, the pattern suggests substitution toward the segment where the price gap to a conventional vehicle is smallest, which is what the withdrawal of a new-vehicle subsidy should produce. That the used credit was withdrawn at the same time makes the used-market strength more striking, not less, and it is worth its own study.

## 7.4 Four designs the data would support

The value of this event will be lost if it is analyzed only through trade-press aggregates. Four designs are available, in ascending order of what they demand of the data.

**Design 1: Event study on monthly national volumes.** Estimate deviations from a pre-period trend in the months around the cutoff, with hybrids and internal combustion vehicles as controls for aggregate market conditions. Uses only public data. Establishes the shape of the response and bounds the pull-forward window. Weak on causal identification because nothing else changed at the same date for the control group either.

**Design 2: Regression discontinuity in the acquisition date.** Because eligibility turns on a written binding contract and a payment by September 30, and Form 15400 records the sale date, the assignment variable is observed exactly. Compare transactions in the days immediately either side of the boundary. The threat to identification is severe and interesting: manipulation of the running variable was not merely possible but actively encouraged, since sellers advertised the contract-signing deadline directly. Tesla added "Order by September 30 to Qualify" to its homepage and published a clarification that orders placed that day qualified with no delivery required, which is the statutory acquisition rule turned into marketing copy at national scale. A density test at the threshold will fail spectacularly. That makes the standard design invalid and the manipulation itself the object worth measuring, since the mass of contracts piled against the boundary is a direct estimate of how many marginal buyers the subsidy was moving. Chapter 11 §11.4.6 documents the advertising that produced it.

**Design 3: Cross-sectional variation in dealer participation.** Some 12,200 sellers registered for advance payments while roughly 3,400 registered for reporting only. Buyers in markets served predominantly by the second group could not obtain point-of-sale value even before termination. If dealer participation is observable at the geographic level, the differential response to termination across markets identifies the incremental effect of *point-of-sale delivery* as distinct from the credit itself. This is the design that speaks directly to this dissertation's thesis, and it requires only the registration data the IRS already holds.

**Design 4: Synthetic control across states.** State-level incentives continued in some jurisdictions and not others after federal termination. States retaining substantial rebates form a comparison for what the federal withdrawal did where nothing replaced it. Requires careful handling of state programs that changed in the same window, and of cross-border purchasing.

Designs 1 and 4 can be run today with commercial data. Designs 2 and 3 require the administrative record: the Form 15400 population, dealer registration status, and matched return data. That record is the residue of the reporting system this dissertation has been describing, and its research value is now the main asset the program has left.

## 7.5 The political economy of a visible subsidy

There is an uncomfortable implication in the sequence of events, and it should be stated plainly rather than left as a suggestion.

The transfer election made the credit work by making it visible: a discount at the counter, itemized, attributed, immediate. Salience was the mechanism of its effectiveness. Salience is also what makes a subsidy an easy political target. A tax expenditure buried in a return is diffuse, hard to attribute, and hard to campaign against. A $7,500 discount handed to a car buyer at a dealership is concrete, nameable, and easy to characterize as a payment to one group of consumers financed by everyone else.

The credit was made conspicuous in January 2024 and repealed in July 2025. That is not proof of causation, and no counterfactual is available. But the general proposition has support in the political-economy literature on program visibility, and it presents a genuine design dilemma. Making a benefit salient increases its behavioral effect per dollar and simultaneously increases its exposure. A designer who wants durability might rationally choose a less effective but less visible instrument, and a designer who wants effect should expect to defend it politically. The clean vehicle credits took the effective option and did not survive the exposure.

There is a second-order point in the same direction. Building the delivery system around dealers created a large, organized, well-represented constituency with a direct commercial stake in the program: fifteen thousand registered sellers whose customers received an advance and whose associations lobbied vigorously, as the 2025 portal reopening demonstrates. That constituency was effective at protecting the *administrative* interests of its members. It did not prevent, and could not have been expected to prevent, the termination of the credit itself, since dealers sell whatever consumers buy and are close to indifferent to the powertrain.

## 7.6 Summary

The termination produced the sharpest identifiable shock in the history of U.S. energy tax expenditures: an eleven-point share collapsing to six, a fifth to a quarter of the market apparently gone a year later, and a partial re-equilibration at a lower level as manufacturers absorbed part of the withdrawn subsidy into margin. The public data support descriptive conclusions and bound the level effect loosely. Real identification requires the administrative record built by Form 15400, which is the best argument now available for preserving and releasing it.
