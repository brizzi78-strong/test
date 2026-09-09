/**
 * Scope screening: decide whether a return is one this engine can actually
 * compute, and warn when a supported return is likely off in a known
 * direction.
 *
 * This exists because a missing feature is not a neutral gap. If a retiree has
 * nowhere to enter a pension, the engine happily returns a confident, wrong
 * refund. Screening converts that silent error into an explicit refusal.
 *
 * Two sources of findings:
 *   1. Declared situations — what the filer tells us about their year.
 *   2. Derived signals — what the entered numbers imply about the limits of
 *      the engine (see taxfile/README.md for the full list of simplifications).
 *
 * Nothing here computes tax. Thresholds are deliberately rounded screening
 * bounds, not authoritative figures — they are tuned to over-trigger, because
 * a false "check this" is cheap and a false "you're fine" is not.
 */

import type { FilingStatus, Situation, TaxComputation, TaxReturn } from './types.ts';

export type Severity = 'blocking' | 'caution';

/** Which way the estimate is likely wrong, when that is knowable. */
export type Effect = 'understates-tax' | 'overstates-tax' | 'understates-refund' | 'unknown';

export interface ScopeFinding {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  effect?: Effect;
}

export interface ScopeReport {
  /**
   * supported   — compute and show the estimate.
   * review      — show the estimate, with caveats attached.
   * unsupported — refuse: this return needs software (or a preparer) we are not.
   */
  status: 'supported' | 'review' | 'unsupported';
  findings: ScopeFinding[];
}

/** Declared situations the engine cannot handle at all. */
const BLOCKING_SITUATIONS: Record<Situation, { title: string; detail: string }> = {
  'retirement-income': {
    title: 'Retirement or pension income',
    detail:
      'Distributions reported on Form 1099-R (pension, annuity, IRA, or 401(k)) need taxable-amount rules, early-withdrawal penalties, and rollover handling this estimator does not implement.',
  },
  'social-security': {
    title: 'Social Security benefits',
    detail:
      'How much of an SSA-1099 benefit is taxable depends on a separate worksheet driven by your other income. Without it, any number here would be wrong.',
  },
  'marketplace-insurance': {
    title: 'Marketplace (ACA) health insurance',
    detail:
      'A Form 1095-A requires reconciling the premium tax credit on Form 8962, which can move your refund by thousands in either direction.',
  },
  'rental-or-royalty': {
    title: 'Rental or royalty income',
    detail:
      'Schedule E income brings depreciation, passive-activity loss limits, and basis tracking — none of which are implemented.',
  },
  'k1-partnership-s-corp': {
    title: 'Partnership, S-corp, estate, or trust income',
    detail:
      'Schedule K-1 income carries its own character (ordinary, capital, QBI components) that this engine cannot interpret.',
  },
  'farm-income': {
    title: 'Farm income',
    detail: 'Schedule F, income averaging, and farm-specific deductions are not implemented.',
  },
  'education-expenses': {
    title: 'Tuition or student expenses',
    detail:
      'The American Opportunity and Lifetime Learning credits are worth up to $2,500 and $2,000. We do not compute them, so your real refund would be higher than anything shown here.',
  },
  'child-care-expenses': {
    title: 'Child or dependent care costs',
    detail:
      'The Form 2441 credit is not implemented, so this estimate would understate your refund.',
  },
  'digital-assets': {
    title: 'Crypto or other digital asset sales',
    detail:
      'Digital asset dispositions need cost-basis tracking and their own reporting; enter only ordinary brokerage sales here.',
  },
  'foreign-income-or-accounts': {
    title: 'Foreign income or financial accounts',
    detail:
      'Foreign earned income exclusion, foreign tax credit, and FBAR/FATCA reporting are out of scope entirely.',
  },
  'household-employer': {
    title: 'Household employee (nanny tax)',
    detail: 'Schedule H household employment taxes are not implemented.',
  },
  'prior-year-carryover': {
    title: 'Carryover from a prior year',
    detail:
      'Capital loss carryforwards, net operating losses, and suspended credits from last year are not carried in.',
  },
  'multi-state': {
    title: 'Moved between states, or worked in several',
    detail:
      'This is a federal-only estimate. Part-year and multi-state allocation changes your state liability, which is not modeled at all.',
  },
};

/**
 * Screening bounds for likely EITC eligibility (tax year 2025), rounded up so
 * the check over-triggers. This flags the possibility; it never computes the
 * credit.
 */
const EITC_SCREEN_AGI: Record<'single' | 'joint', [number, number, number, number]> = {
  //          0 kids   1 kid    2 kids   3+ kids
  single: [20_000, 51_000, 58_000, 62_000],
  joint: [27_000, 58_000, 65_000, 69_000],
};
const EITC_INVESTMENT_INCOME_CEILING = 12_000;

/** Above this AGI, alternative minimum tax starts to be a real possibility. */
const AMT_SCREEN_AGI = 500_000;

/** Taxable income above which QBI stops being a flat 20% (SSTB / wage limits). */
const QBI_LIMIT_THRESHOLD: Record<FilingStatus, number> = {
  single: 197_300,
  'married-joint': 394_600,
  'married-separate': 197_300,
  'head-of-household': 197_300,
};

/** AGI at which the deductible-IRA phase-out begins if covered by a work plan. */
const IRA_PHASEOUT_SCREEN: Record<FilingStatus, number> = {
  single: 79_000,
  'married-joint': 126_000,
  'married-separate': 10_000,
  'head-of-household': 79_000,
};

/** Self-only HSA contribution ceiling; more than this implies family coverage. */
const HSA_SELF_ONLY_LIMIT = 4_300;

/** Underpayment below this balance due generally avoids a penalty. */
const ESTIMATED_PENALTY_THRESHOLD = 1_000;

function eitcBand(status: FilingStatus): 'single' | 'joint' | null {
  if (status === 'married-joint') return 'joint';
  if (status === 'married-separate') return null; // generally ineligible
  return 'single';
}

/**
 * Screen a return. `computation` is optional: before a filing status is chosen
 * there is nothing to derive from, and only declared situations are checked.
 */
export function screenReturn(ret: TaxReturn, computation?: TaxComputation | null): ScopeReport {
  const findings: ScopeFinding[] = [];

  // --- 1. Declared situations -------------------------------------------
  for (const situation of ret.situations ?? []) {
    const blocking = BLOCKING_SITUATIONS[situation];
    if (!blocking) continue;
    findings.push({
      id: situation,
      severity: situation === 'multi-state' ? 'caution' : 'blocking',
      title: blocking.title,
      detail: blocking.detail,
      effect: situation === 'education-expenses' || situation === 'child-care-expenses'
        ? 'understates-refund'
        : 'unknown',
    });
  }

  // --- 2. Derived from the numbers --------------------------------------
  const status = ret.filingStatus;
  if (computation && status) {
    const agi = computation.adjustedGrossIncome;
    const declared = new Set(ret.situations ?? []);

    // Likely EITC eligibility — we do not compute it, so the refund is low.
    const band = eitcBand(status);
    if (band) {
      const kids = Math.min(ret.dependents.filter((d) => d.relationship === 'child').length, 3);
      const ceiling = EITC_SCREEN_AGI[band][kids]!;
      const investmentIncome =
        ret.income.int1099s.reduce((sum, f) => sum + f.interestIncome, 0) +
        ret.income.div1099s.reduce((sum, f) => sum + f.ordinaryDividends, 0);
      if (agi > 0 && agi <= ceiling && investmentIncome <= EITC_INVESTMENT_INCOME_CEILING) {
        findings.push({
          id: 'possible-eitc',
          severity: 'blocking',
          title: 'You may qualify for the Earned Income Tax Credit',
          detail:
            'At your income level the EITC is often worth hundreds to several thousand dollars, and it is refundable. This estimator does not compute it, so your actual refund is very likely larger than the figure shown.',
          effect: 'understates-refund',
        });
      }
    }

    // CTC clipped by liability implies the refundable ACTC we do not compute.
    const claimedChildren = ret.dependents.filter((d) => d.relationship === 'child').length;
    if (claimedChildren > 0 && computation.totalCredits < computation.childTaxCredit) {
      findings.push({
        id: 'possible-actc',
        severity: 'blocking',
        title: 'Part of your child tax credit is being lost here',
        detail:
          'Your credit is larger than your income tax, and this estimator treats it as non-refundable. The refundable Additional Child Tax Credit would return part of the difference to you, so your real refund is higher.',
        effect: 'understates-refund',
      });
    }

    // Age 65+ without declaring retirement income is worth a second look.
    const ages = [ret.personal?.taxpayer, ret.personal?.spouse]
      .filter((p) => p != null)
      .map((p) => ret.taxYear - p!.birthYear);
    if (
      ages.some((age) => age >= 65) &&
      !declared.has('social-security') &&
      !declared.has('retirement-income')
    ) {
      findings.push({
        id: 'retirement-age-check',
        severity: 'caution',
        title: 'Double-check retirement income',
        detail:
          'You are at an age where Social Security or a pension is common. If you receive either, this estimate does not apply — go back and check those boxes.',
      });
    }

    // Above the QBI threshold the flat 20% is wrong (SSTB / W-2 wage limits).
    if (computation.qbiDeduction > 0 && computation.taxableIncome > QBI_LIMIT_THRESHOLD[status]) {
      findings.push({
        id: 'qbi-above-threshold',
        severity: 'caution',
        title: 'Your business deduction may be overstated',
        detail:
          'Above your income level the qualified business income deduction is limited by W-2 wages, property, and whether your field is a specified service trade. This estimator applies a flat 20%, so it may show less tax than you owe.',
        effect: 'understates-tax',
      });
    }

    if (agi > AMT_SCREEN_AGI) {
      findings.push({
        id: 'possible-amt',
        severity: 'caution',
        title: 'Alternative minimum tax not calculated',
        detail:
          'At this income the AMT can apply, particularly with incentive stock options or large deductions. It is not computed here, so your tax could be higher.',
        effect: 'understates-tax',
      });
    }

    if (
      ret.deductions.adjustments.traditionalIraContributions > 0 &&
      agi > IRA_PHASEOUT_SCREEN[status]
    ) {
      findings.push({
        id: 'ira-phaseout',
        severity: 'caution',
        title: 'Your IRA deduction may be phased out',
        detail:
          'If you or your spouse are covered by a retirement plan at work, the deductible IRA amount shrinks at your income and can reach zero. This estimator deducts the full contribution.',
        effect: 'understates-tax',
      });
    }

    if (ret.deductions.adjustments.hsaContributions > HSA_SELF_ONLY_LIMIT) {
      findings.push({
        id: 'hsa-coverage',
        severity: 'caution',
        title: 'Confirm your HSA contribution limit',
        detail:
          'The amount entered exceeds the self-only ceiling, so it only holds with family high-deductible coverage for the full year. Eligibility is not checked here.',
        effect: 'understates-tax',
      });
    }

    // A capital loss larger than the annual limit creates a carryforward.
    const netCapital =
      ret.income.capitalGainShortTerm +
      ret.income.capitalGainLongTerm +
      ret.income.div1099s.reduce((sum, f) => sum + f.capitalGainDistributions, 0);
    if (netCapital < -3_000) {
      findings.push({
        id: 'capital-loss-carryforward',
        severity: 'caution',
        title: 'You have a capital loss carryforward',
        detail:
          'Only $3,000 of net capital loss offsets ordinary income each year ($1,500 if married filing separately). The rest carries to future years — this estimator does not track it.',
      });
    }

    if (computation.amountOwed > ESTIMATED_PENALTY_THRESHOLD) {
      findings.push({
        id: 'underpayment-penalty',
        severity: 'caution',
        title: 'An underpayment penalty may apply',
        detail:
          'Owing this much at filing can trigger a Form 2210 penalty when too little was withheld or paid quarterly. The penalty is not included in the total shown.',
        effect: 'understates-tax',
      });
    }

    if (status === 'married-separate') {
      findings.push({
        id: 'mfs-complexity',
        severity: 'caution',
        title: 'Married filing separately has extra rules',
        detail:
          'Filing separately disallows or shrinks several benefits, and both spouses must make the same standard-vs-itemized choice. Compare against a joint estimate before relying on this.',
      });
    }
  }

  const blocking = findings.some((f) => f.severity === 'blocking');
  return {
    status: blocking ? 'unsupported' : findings.length > 0 ? 'review' : 'supported',
    findings,
  };
}

/** Human-readable labels for the screening questionnaire. */
export const SITUATION_LABELS: Record<Situation, string> = {
  'retirement-income': 'Pension, annuity, IRA or 401(k) withdrawal (Form 1099-R)',
  'social-security': 'Social Security benefits (Form SSA-1099)',
  'marketplace-insurance': 'Health insurance bought through a marketplace (Form 1095-A)',
  'rental-or-royalty': 'Rental property or royalty income',
  'k1-partnership-s-corp': 'Income from a partnership, S-corp, estate, or trust (Schedule K-1)',
  'farm-income': 'Farm income',
  'education-expenses': 'Tuition or student loan expenses for school (Form 1098-T)',
  'child-care-expenses': 'Paid child or dependent care so you could work',
  'digital-assets': 'Sold or exchanged crypto or other digital assets',
  'foreign-income-or-accounts': 'Foreign income, foreign accounts, or lived abroad',
  'household-employer': 'Paid a nanny or household employee',
  'prior-year-carryover': 'A carryover from last year (capital loss, credits)',
  'multi-state': 'Moved between states or worked in more than one',
};
