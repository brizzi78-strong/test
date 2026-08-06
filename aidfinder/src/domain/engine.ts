/**
 * The matching engine — pure functions, no I/O.
 *
 * Given a student profile and the opportunity catalog it decides which
 * opportunities the student plausibly qualifies for, estimates the annual
 * dollar value of each (including a simplified Pell Grant estimate), and
 * computes each opportunity's next real calendar deadline so the app can
 * build an automated, deadline-ordered action plan.
 */

import { CATALOG } from './catalog.ts';
import type { Deadline, Match, Opportunity, StudentProfile } from './types.ts';

// --- Pell Grant estimate ---------------------------------------------------

/**
 * 2025 federal poverty guideline (48 contiguous states): $15,650 for one
 * person plus $5,500 per additional household member.
 */
export function povertyGuideline(householdSize: number): number {
  const size = Math.max(1, Math.floor(householdSize));
  return 15650 + (size - 1) * 5500;
}

export const MAX_PELL = 7395;
export const MIN_PELL = 740;

/**
 * Simplified Pell estimate. The real award comes from the FAFSA's Student Aid
 * Index; the post-2024 rules key maximum Pell to income under 175%–225% of
 * the poverty line, tapering to nothing well above that. We model exactly
 * that shape: full award at or below 175% of poverty, linear taper to $0 at
 * 400% of poverty, rounded to $5. A rough planning number, not an award.
 */
export function estimatePell(householdIncome: number, householdSize: number): number {
  const ratio = householdIncome / povertyGuideline(householdSize);
  if (ratio <= 1.75) return MAX_PELL;
  if (ratio >= 4.0) return 0;
  const raw = MAX_PELL * ((4.0 - ratio) / (4.0 - 1.75));
  const rounded = Math.round(raw / 5) * 5;
  return rounded < MIN_PELL ? 0 : rounded;
}

// --- deadlines -------------------------------------------------------------

/** The next occurrence of a recurring month/day deadline on or after `today` (UTC). */
export function nextDeadline(deadline: Deadline, today: Date): string | null {
  if (deadline === 'rolling') return null;
  const year = today.getUTCFullYear();
  const thisYear = new Date(Date.UTC(year, deadline.month - 1, deadline.day));
  const next =
    thisYear >= startOfUtcDay(today)
      ? thisYear
      : new Date(Date.UTC(year + 1, deadline.month - 1, deadline.day));
  return next.toISOString().slice(0, 10);
}

export function daysUntil(isoDate: string, today: Date): number {
  const target = new Date(`${isoDate}T00:00:00Z`).getTime();
  return Math.round((target - startOfUtcDay(today).getTime()) / 86_400_000);
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// --- matching --------------------------------------------------------------

/**
 * Check one opportunity against the profile. Returns the reasons it fits, or
 * null if any hard criterion rules it out. Unknown GPA (null) is treated as
 * not meeting a GPA cutoff — better to under-promise.
 */
export function checkEligibility(profile: StudentProfile, opp: Opportunity): string[] | null {
  const c = opp.criteria;
  const why: string[] = [];

  if (c.degreeLevels) {
    if (!c.degreeLevels.includes(profile.degreeLevel)) return null;
  }
  if (c.states) {
    if (!c.states.includes(profile.state)) return null;
    why.push(`open to ${profile.state} residents`);
  }
  if (c.fields) {
    if (!c.fields.includes(profile.fieldOfStudy)) return null;
    why.push(`for ${profile.fieldOfStudy} students`);
  }
  if (c.minGpa !== undefined) {
    if (profile.gpa === null || profile.gpa < c.minGpa) return null;
    why.push(`your GPA meets the ${c.minGpa.toFixed(1)} minimum`);
  }
  if (c.maxHouseholdIncome !== undefined) {
    if (profile.householdIncome > c.maxHouseholdIncome) return null;
    why.push('your household income fits the need requirement');
  }
  if (c.requiresCitizenOrEligibleNoncitizen && !profile.usCitizenOrEligibleNoncitizen) return null;
  if (c.requiresHalfTimePlus && !profile.enrolledHalfTimePlus) return null;
  if (c.requiresCommunityService) {
    if (!profile.communityService) return null;
    why.push('your community service counts here');
  }
  if (c.requiresMilitaryAffiliation) {
    if (!profile.militaryAffiliation) return null;
    why.push('based on your military affiliation');
  }
  if (c.requiresEmployment) {
    if (!profile.employed) return null;
    why.push('ask the employer’s HR about tuition assistance');
  }

  if (why.length === 0) why.push('open eligibility — worth the application');
  return why;
}

/** Best-guess annual value: Pell is computed; anything else uses the range midpoint. */
export function estimateAmount(profile: StudentProfile, opp: Opportunity): number {
  if (opp.id === 'pell-grant') {
    return estimatePell(profile.householdIncome, profile.householdSize);
  }
  return Math.round((opp.amountMin + opp.amountMax) / 2);
}

/** All catalog matches for a profile, biggest estimated money first. */
export function matchProfile(
  profile: StudentProfile,
  today: Date,
  catalog: Opportunity[] = CATALOG,
): Match[] {
  const matches: Match[] = [];
  for (const opp of catalog) {
    const why = checkEligibility(profile, opp);
    if (!why) continue;
    const estimatedAmount = estimateAmount(profile, opp);
    if (estimatedAmount <= 0) continue; // e.g. Pell estimate of $0
    const deadline = nextDeadline(opp.deadline, today);
    matches.push({
      opportunity: opp,
      whyMatched: why,
      estimatedAmount,
      nextDeadline: deadline,
      daysLeft: deadline ? daysUntil(deadline, today) : null,
    });
  }
  return matches.sort((a, b) => b.estimatedAmount - a.estimatedAmount);
}

/** Total estimated annual value across a set of matches. */
export function totalEstimated(matches: Match[]): number {
  return matches.reduce((sum, m) => sum + m.estimatedAmount, 0);
}
