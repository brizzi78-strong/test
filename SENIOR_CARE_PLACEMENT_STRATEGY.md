# Senior Care Placement Strategy

Strategy for entering the senior-care market: launch a Triangle-area placement
agency first, and treat it as the laboratory for a focused software product for
independent placement agents — rather than building a broad assisted-living
platform up front.

## The core danger: sensitive medical information

The danger in this space is handling sensitive medical information. Once users
store identifiable health and care information, privacy, security, access
controls, contracts, backups, and potentially HIPAA obligations become serious
design requirements — not features to bolt on later.

**Design rule for the earliest prototype: avoid collecting unnecessary clinical
information.** Track placements, referral sources, facility relationships,
follow-ups, and commissions. Do not store diagnoses, medication lists, or care
records until the product justifies the compliance investment (BAAs, encryption
at rest, audit logging, access controls, retention policies).

## Best way to enter software

Combine both businesses:

1. Launch the Triangle placement service.
2. Use a simple internal tool to run the agency.
3. Document every repetitive frustration.
4. Build the smallest software feature that saves meaningful time.
5. Let five other placement agents test it.
6. Charge the first customers before funding a major build.
7. Gradually shift from placement commissions to recurring software revenue if
   adoption grows.

This approach gives us something most software founders lack: real firsthand
experience using the product in the exact business it serves.

## Verdict

| Path | Assessment |
| --- | --- |
| Selling broad assisted-living software | Difficult and crowded |
| Selling a focused tool to independent placement agents | Promising |
| Building first and hoping customers arrive | High risk |
| Running the placement agency and turning the internal system into software | **Best approach** |

The senior-care software market is growing, but it already contains substantial
competition. Market estimates place broader long-term-care software growth
around 7.7% annually through 2033, which supports demand but does not guarantee
a new product will win.

## Recommendation

Build the placement business first and treat it as the laboratory for a focused
software product. Do not spend $50,000 building a full platform before
interviewing at least 20 independent placement agents and obtaining several
commitments to pay.
