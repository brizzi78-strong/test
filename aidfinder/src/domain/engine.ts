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

export interface Blocker {
  code:
    | 'degree-level'
    | 'state'
    | 'field'
    | 'gpa'
    | 'income'
    | 'citizenship'
    | 'half-time'
    | 'community-service'
    | 'military'
    | 'employment';
  message: string;
  /** True when the student could realistically clear this themselves. */
  fixable: boolean;
}

export interface EligibilityReport {
  /** Criteria the student satisfies, in plain language. */
  why: string[];
  /** Criteria that rule the student out; empty means eligible. */
  blockers: Blocker[];
}

/** How far under a GPA cutoff still counts as "within reach". */
const GPA_REACH = 0.5;

/**
 * Check one opportunity against the profile, recording both what fits and
 * every criterion that doesn't (with whether it's realistically fixable).
 * Unknown GPA (null) is treated as not meeting a GPA cutoff — better to
 * under-promise — but flagged fixable, since entering it may unlock money.
 */
export function explainEligibility(profile: StudentProfile, opp: Opportunity): EligibilityReport {
  const c = opp.criteria;
  const why: string[] = [];
  const blockers: Blocker[] = [];

  if (c.degreeLevels && !c.degreeLevels.includes(profile.degreeLevel)) {
    blockers.push({
      code: 'degree-level',
      message: `only for ${c.degreeLevels.join(' / ')} students`,
      fixable: false,
    });
  }
  if (c.states) {
    if (!c.states.includes(profile.state)) {
      blockers.push({
        code: 'state',
        message: `only for residents of ${c.states.join(', ')}`,
        fixable: false,
      });
    } else why.push(`open to ${profile.state} residents`);
  }
  if (c.fields) {
    if (!c.fields.includes(profile.fieldOfStudy)) {
      blockers.push({
        code: 'field',
        message: `only for ${c.fields.join(' / ')} majors`,
        fixable: false,
      });
    } else why.push(`for ${profile.fieldOfStudy} students`);
  }
  if (c.minGpa !== undefined) {
    if (profile.gpa === null) {
      blockers.push({
        code: 'gpa',
        message: `requires a ${c.minGpa.toFixed(1)} GPA — enter yours to find out`,
        fixable: true,
      });
    } else if (profile.gpa < c.minGpa) {
      blockers.push({
        code: 'gpa',
        message: `requires a ${c.minGpa.toFixed(1)} GPA (you're at ${profile.gpa.toFixed(2)})`,
        fixable: c.minGpa - profile.gpa <= GPA_REACH,
      });
    } else why.push(`your GPA meets the ${c.minGpa.toFixed(1)} minimum`);
  }
  if (c.maxHouseholdIncome !== undefined) {
    if (profile.householdIncome > c.maxHouseholdIncome) {
      blockers.push({
        code: 'income',
        message: `need-based: household income above ~$${c.maxHouseholdIncome.toLocaleString('en-US')}`,
        fixable: false,
      });
    } else why.push('your household income fits the need requirement');
  }
  if (c.requiresCitizenOrEligibleNoncitizen && !profile.usCitizenOrEligibleNoncitizen) {
    blockers.push({
      code: 'citizenship',
      message: 'requires US citizenship or FAFSA-eligible noncitizen status',
      fixable: false,
    });
  }
  if (c.requiresHalfTimePlus && !profile.enrolledHalfTimePlus) {
    blockers.push({
      code: 'half-time',
      message: 'requires at least half-time enrollment',
      fixable: true,
    });
  }
  if (c.requiresCommunityService) {
    if (!profile.communityService) {
      blockers.push({
        code: 'community-service',
        message: 'wants a community-service record — start volunteering now',
        fixable: true,
      });
    } else why.push('your community service counts here');
  }
  if (c.requiresMilitaryAffiliation) {
    if (!profile.militaryAffiliation) {
      blockers.push({
        code: 'military',
        message: 'requires military service or a service-member family',
        fixable: false,
      });
    } else why.push('based on your military affiliation');
  }
  if (c.requiresEmployment) {
    if (!profile.employed) {
      blockers.push({
        code: 'employment',
        message: 'needs an employer offering tuition assistance (many entry-level jobs do)',
        fixable: true,
      });
    } else why.push('ask the employer’s HR about tuition assistance');
  }

  if (blockers.length === 0 && why.length === 0) {
    why.push('open eligibility — worth the application');
  }
  return { why, blockers };
}

/** Reasons the opportunity fits, or null if anything rules the student out. */
export function checkEligibility(profile: StudentProfile, opp: Opportunity): string[] | null {
  const report = explainEligibility(profile, opp);
  return report.blockers.length === 0 ? report.why : null;
}

export interface NearMiss {
  opportunity: Opportunity;
  /** Everything standing in the way (all fixable, by construction). */
  blockers: Blocker[];
  /** What it would be worth once unlocked. */
  potentialAmount: number;
}

/**
 * Opportunities the student does NOT currently match but could realistically
 * unlock: every blocker is fixable (raise a near-cutoff GPA, log community
 * service, enroll half-time, use an employer benefit, or just enter a GPA).
 * Sorted by money at stake.
 */
export function nearMisses(
  profile: StudentProfile,
  catalog: Opportunity[] = CATALOG,
): NearMiss[] {
  const misses: NearMiss[] = [];
  for (const opp of catalog) {
    const report = explainEligibility(profile, opp);
    if (report.blockers.length === 0) continue;
    if (!report.blockers.every((b) => b.fixable)) continue;
    const potentialAmount = estimateAmount(profile, opp);
    if (potentialAmount <= 0) continue;
    misses.push({ opportunity: opp, blockers: report.blockers, potentialAmount });
  }
  return misses.sort((a, b) => b.potentialAmount - a.potentialAmount);
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
