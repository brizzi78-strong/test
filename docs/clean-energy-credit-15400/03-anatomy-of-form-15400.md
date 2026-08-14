# Chapter 3. Anatomy of Form 15400

## 3.1 The document

Form 15400, *Clean Vehicle Seller Report*, exists in two variants, one for new vehicles under §30D and one for previously-owned vehicles under §25E. The IRS published sample versions of both. In ordinary practice it is generated inside IRS Energy Credits Online rather than filled out on paper: the dealer enters the transaction, the portal validates it, and the accepted submission is rendered as the buyer's copy.

The reported data elements are, in substance:

| Element | Function |
|---|---|
| Seller name and taxpayer identification number | Identifies the registered dealer or seller; ties the submission to the registration record |
| Dealer registration identifier | Establishes authority to file and, where applicable, to receive advance payment |
| Buyer name and taxpayer identification number | Fixes the single taxpayer entitled to claim with respect to this vehicle |
| Vehicle identification number | The register key; the unit of anti-duplication |
| Make, model, model year | Model eligibility and, for §25E, the two-model-year age test |
| Battery capacity in kilowatt-hours | Legacy of the ARRA formula; supports credit computation and eligibility |
| Sale price | MSRP cap for §30D; the $25,000 ceiling and the 30% computation for §25E |
| Date of sale | Establishes the acquisition date, decisive after the September 30, 2025 cutoff |
| Date placed in service | Determines the taxable year in which the credit is claimed |
| Maximum credit allowable | The amount the buyer may claim or transfer |
| Attestations | Buyer's eligibility declarations, including AGI and, for transfer, the election |

The form is short because the verification is elsewhere. Model-level eligibility, sourcing compliance, and manufacturer certification are established upstream by the manufacturer's submissions; the dealer's registration status is established upstream by the ECO onboarding; the buyer's income eligibility is established by attestation and tested later against the return. Form 15400 is the point at which those separate streams are joined to one VIN and one person.

## 3.2 Four legal functions in one page

The analytic claim of this chapter is that Form 15400 performs four distinct functions, and that no provision of the Code describes more than a fragment of any of them.

**Function one: condition precedent to the credit.** Section 30D(d)(1)(H) makes a vehicle a "new clean vehicle" only if the seller furnishes a report containing prescribed information to the taxpayer and to the Secretary. This is drafted as an attribute of the vehicle, not as a procedural requirement on the taxpayer, which is why the consequence of non-filing is so severe. A vehicle for which no report was filed is not a qualifying vehicle at all. The buyer's compliance is irrelevant to the defect, and the buyer has no statutory means of curing it.

**Function two: national anti-duplication register.** Because the report is keyed to a VIN and names exactly one buyer, the IRS obtains a real-time register of which vehicles have been used to support a credit claim and by whom. The published guidance is explicit that the buyer listed on the report is the only buyer who may claim with respect to that VIN. Before 2024 the agency had no comparable capability, and duplicate and fraudulent claims on the same vehicle were a known exposure. This function is a genuine administrative gain and should be counted on the ledger when the regime is evaluated.

The exposure was not hypothetical. In *Moon v. Commissioner*, 165 T.C. No. 4 (2025), the taxpayers bought a Chevrolet Volt in 2013 and claimed the maximum $7,500 one-time credit for that single vehicle on every return from 2013 through 2019. The Service disallowed the seventh. Whatever became of the preceding six, the case shows a repeat claim on one VIN surviving six filing seasons undetected, which is the same detection gap TIGTA measured when it found 7,547 returns claiming roughly $23 million above the allowable threshold passing through the filters in processing years 2019 to 2022. A register that matches each VIN to one named buyer converts that from an anomaly a filter must happen to catch into a structural impossibility. Chapter 11 §11.2.1 develops the point.

**Function three: settlement instruction.** Where the buyer makes the transfer election under §30D(g) or §25E(f), the accepted report is what triggers the Treasury's advance payment to the dealer. The dealer has already reduced the price or handed over cash at the counter; the report is how it gets reimbursed, on a cycle contemporaneous reporting described as seventy-two hours. In this capacity the form is not a tax document at all. It is a claim against the government submitted by a private business on behalf of a customer, which is closer to a health insurance claim than to an information return.

**Function four: the buyer's evidence.** The copy furnished to the buyer is what the buyer's preparer uses to complete Form 8936 and its Schedule A, and what substantiates the claim on audit. It is the only piece of the apparatus the buyer ever holds.

Four functions, four different bodies of law behind them, one document. The confusion this creates is not academic. A dealer that understands Form 15400 as function three, the reimbursement claim, has an incentive to file promptly for transferred credits and no comparable incentive for non-transferred ones, because in the latter case nothing is owed to the dealer. That is precisely the pattern of failure that appeared in 2024.

## 3.3 Timing

The reporting deadline is three calendar days from the date the buyer takes possession, with the copy to be furnished to the buyer within a further short period. "Calendar days" rather than business days is a demanding standard in an industry that does most of its volume on weekends. A Saturday delivery must be reported by Tuesday, and the person who knows the transaction happened is a salesperson, not a compliance officer.

Registration is a separate prerequisite with its own clock. A dealer had to be registered in ECO to file at all, and had to have been registered for a period reported as fifteen days before it could receive advance payments. New user registration for the program closed on September 30, 2025.

The rigidity of the three-day rule is defensible in the abstract. Real-time registers only work in real time, and a report filed in April cannot prevent a duplicate claim in February. But the rule was enforced against a population of small businesses in the first year of an unfamiliar portal, with the sanction falling on their customers, and that combination is what produced the 2025 filing season crisis.

## 3.4 What the form replaced

Before 2024, the §30D seller report was a written statement furnished to the buyer under procedures set out in Rev. Proc. 2022-42. It was not transmitted contemporaneously, it created no register, and it settled no payment. Its evidentiary function was the whole of its function.

The move from that regime to Form 15400 is a textbook instance of the general trend in tax administration toward third-party information reporting. Kleven and coauthors, working with Danish audit data, established the now-standard result that compliance is near-total for third-party reported income and poor for self-reported income. The clean vehicle credits took the same insight and applied it to a credit rather than to income: rather than asking the taxpayer to assert eligibility and auditing the assertion, the government asked the counterparty to certify the transaction and made the certification a condition of the benefit.

The insight is sound. The implementation added something the income-reporting analogy does not contain. When a bank fails to file a Form 1099-INT, the taxpayer's interest income remains taxable and the taxpayer remains able to report it. When a dealer failed to file Form 15400, the buyer's credit vanished. The analogy was drawn from a regime where third-party reporting is evidentiary, and applied in a regime where it was made constitutive, without the consequences of that shift being addressed.

## 3.5 The taxpayer side: Form 8936 and reconciliation

The buyer's own filing continued. Form 8936, *Clean Vehicle Credits*, with Schedule A per vehicle, is where the credit is computed and, where a transfer election was made, reconciled. The reconciliation is where the design shows its most interesting feature.

If the buyer elected transfer and received the full $7,500 at the counter, and the buyer's tax liability for the year turned out to be $1,200, the buyer does not repay the difference. The regulations provide that the advance payment is not recaptured on account of insufficient liability. This is a refundability rule achieved by administrative construction rather than by statutory design, and it is the single most consequential distributional feature of the entire regime. It is also almost entirely absent from the public discussion of the credits, which continued to describe them as non-refundable long after the transfer election had made that description misleading for anyone who elected.

Recapture does apply in other circumstances: where the buyer's AGI exceeds the applicable limit, where the attestations were false, and where the vehicle's use or the transaction is unwound. Where the buyer's income disqualified them, the buyer repays. Where the dealer's conduct was at fault, the guidance places the exposure on the dealer, including suspension or revocation of registration.

## 3.6 The form after the credit

Termination did not retire the document. Vehicles acquired on or before September 30, 2025 under a written binding contract with a payment may be placed in service afterwards, and the credit is claimed in the year of placement in service, which for some buyers is 2026. Those transactions still require a valid Form 15400, and the buyer still needs the copy.

The consequence is a compliance tail extending well past the repeal: a live obligation, a portal that must remain open to service it, and an audit exposure running for the ordinary limitations period on 2025 and 2026 returns. Buyers who acquired in the September 2025 rush and take delivery in 2026 are the most exposed group in the entire history of the program, because they depend on documentation for a credit that no longer exists, filed by dealers who have no continuing commercial relationship with the program and no advance payment at stake. Practitioners should treat that population as a priority.
