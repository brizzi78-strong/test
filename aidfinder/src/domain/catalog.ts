/**
 * Curated catalog of legitimate "free money for college" sources: federal and
 * state grants, large national scholarships, education tax credits, employer
 * tuition benefits, and military benefits.
 *
 * Amounts and deadlines are typical recent values and shift every award year —
 * each entry carries the official URL so the student verifies at the source.
 * None of these charge an application fee; anything that does is a scam.
 */

import type { Opportunity } from './types.ts';

export const CATALOG: Opportunity[] = [
  {
    id: 'pell-grant',
    name: 'Federal Pell Grant',
    sponsor: 'US Department of Education',
    kind: 'federal-grant',
    amountMin: 740,
    amountMax: 7395,
    renewable: true,
    deadline: { month: 6, day: 30 },
    url: 'https://studentaid.gov/understand-aid/types/grants/pell',
    criteria: {
      degreeLevels: ['high-school-senior', 'undergraduate'],
      maxHouseholdIncome: 100000,
      requiresCitizenOrEligibleNoncitizen: true,
    },
    notes:
      'The foundation of need-based aid — never repaid. One FAFSA form unlocks it (federal deadline June 30; file in the fall for the best state/school aid).',
  },
  {
    id: 'fseog',
    name: 'Federal Supplemental Educational Opportunity Grant (FSEOG)',
    sponsor: 'US Department of Education',
    kind: 'federal-grant',
    amountMin: 100,
    amountMax: 4000,
    renewable: true,
    deadline: { month: 6, day: 30 },
    url: 'https://studentaid.gov/understand-aid/types/grants/fseog',
    criteria: {
      degreeLevels: ['high-school-senior', 'undergraduate'],
      maxHouseholdIncome: 60000,
      requiresCitizenOrEligibleNoncitizen: true,
    },
    notes:
      'Extra grant for students with exceptional need, first-come first-served from each school’s pot — another reason to file the FAFSA early.',
  },
  {
    id: 'next-nc-scholarship',
    name: 'Next NC Scholarship',
    sponsor: 'State of North Carolina',
    kind: 'state-grant',
    amountMin: 3000,
    amountMax: 5000,
    renewable: true,
    deadline: { month: 6, day: 1 },
    url: 'https://www.cfnc.org/pay-for-college/next-nc-scholarship/',
    criteria: {
      degreeLevels: ['high-school-senior', 'undergraduate'],
      states: ['NC'],
      maxHouseholdIncome: 80000,
      requiresCitizenOrEligibleNoncitizen: true,
      requiresHalfTimePlus: true,
    },
    notes:
      'At least $3,000/yr at NC community colleges or $5,000/yr at UNC System schools for most households under ~$80k. Awarded automatically from the FAFSA.',
  },
  {
    id: 'coca-cola-scholars',
    name: 'Coca-Cola Scholars Program',
    sponsor: 'Coca-Cola Scholars Foundation',
    kind: 'scholarship',
    amountMin: 20000,
    amountMax: 20000,
    renewable: false,
    deadline: { month: 9, day: 30 },
    url: 'https://www.coca-colascholarsfoundation.org/apply/',
    criteria: {
      degreeLevels: ['high-school-senior'],
      minGpa: 3.0,
      requiresCommunityService: true,
    },
    notes:
      '150 awards of $20,000 to high-school seniors with strong leadership and service. Application opens in August and closes early fall.',
  },
  {
    id: 'gates-scholarship',
    name: 'The Gates Scholarship',
    sponsor: 'Bill & Melinda Gates Foundation',
    kind: 'scholarship',
    amountMin: 20000,
    amountMax: 70000,
    renewable: true,
    deadline: { month: 9, day: 15 },
    url: 'https://www.thegatesscholarship.org/scholarship',
    criteria: {
      degreeLevels: ['high-school-senior'],
      minGpa: 3.3,
      maxHouseholdIncome: 60000,
      requiresCitizenOrEligibleNoncitizen: true,
    },
    notes:
      'Full cost of attendance not covered by other aid, for Pell-eligible minority high-school seniors. Highly competitive; the essay matters.',
  },
  {
    id: 'jack-kent-cooke',
    name: 'Jack Kent Cooke College Scholarship',
    sponsor: 'Jack Kent Cooke Foundation',
    kind: 'scholarship',
    amountMin: 40000,
    amountMax: 55000,
    renewable: true,
    deadline: { month: 11, day: 14 },
    url: 'https://www.jkcf.org/our-scholarships/college-scholarship-program/',
    criteria: {
      degreeLevels: ['high-school-senior'],
      minGpa: 3.5,
      maxHouseholdIncome: 95000,
    },
    notes:
      'Up to $55,000/yr for high-achieving students with financial need — one of the largest private undergraduate scholarships.',
  },
  {
    id: 'dell-scholars',
    name: 'Dell Scholars Program',
    sponsor: 'Michael & Susan Dell Foundation',
    kind: 'scholarship',
    amountMin: 20000,
    amountMax: 20000,
    renewable: false,
    deadline: { month: 12, day: 1 },
    url: 'https://www.dellscholars.org/scholarship/',
    criteria: {
      degreeLevels: ['high-school-senior'],
      minGpa: 2.4,
      maxHouseholdIncome: 60000,
      requiresCitizenOrEligibleNoncitizen: true,
    },
    notes:
      '$20,000 plus a laptop and ongoing support, aimed at gritty students who’ve overcome obstacles — GPA bar is intentionally low.',
  },
  {
    id: 'horatio-alger',
    name: 'Horatio Alger National Scholarship',
    sponsor: 'Horatio Alger Association',
    kind: 'scholarship',
    amountMin: 10000,
    amountMax: 25000,
    renewable: false,
    deadline: { month: 10, day: 25 },
    url: 'https://scholars.horatioalger.org/apply/',
    criteria: {
      degreeLevels: ['high-school-senior'],
      minGpa: 2.0,
      maxHouseholdIncome: 65000,
      requiresCommunityService: true,
      requiresCitizenOrEligibleNoncitizen: true,
    },
    notes:
      'For students who have faced and overcome great adversity; household income under ~$65k. State and national award tiers.',
  },
  {
    id: 'elks-mvs',
    name: 'Elks Most Valuable Student Scholarship',
    sponsor: 'Elks National Foundation',
    kind: 'scholarship',
    amountMin: 4000,
    amountMax: 50000,
    renewable: true,
    deadline: { month: 11, day: 12 },
    url: 'https://www.elks.org/scholars/scholarships/mvs.cfm',
    criteria: {
      degreeLevels: ['high-school-senior'],
      requiresCitizenOrEligibleNoncitizen: true,
    },
    notes:
      '500 four-year awards ($1,000–$12,500/yr) judged on scholarship, leadership, and need. No GPA cutoff — anyone can enter.',
  },
  {
    id: 'burger-king-scholars',
    name: 'Burger King Scholars Program',
    sponsor: 'Burger King Foundation',
    kind: 'scholarship',
    amountMin: 1000,
    amountMax: 50000,
    renewable: false,
    deadline: { month: 12, day: 15 },
    url: 'https://burgerkingfoundation.org/programs/burger-king-scholars/',
    criteria: {
      degreeLevels: ['high-school-senior'],
      minGpa: 2.5,
    },
    notes:
      'Thousands of $1,000 awards plus larger tiers; open to US and Canadian seniors. A quick application with good odds.',
  },
  {
    id: 'amazon-future-engineer',
    name: 'Amazon Future Engineer Scholarship',
    sponsor: 'Amazon',
    kind: 'scholarship',
    amountMin: 40000,
    amountMax: 40000,
    renewable: true,
    deadline: { month: 1, day: 31 },
    url: 'https://www.amazonfutureengineer.com/scholarships',
    criteria: {
      degreeLevels: ['high-school-senior'],
      fields: ['stem'],
      maxHouseholdIncome: 90000,
    },
    notes:
      '$10,000/yr for four years plus a guaranteed paid Amazon internship offer, for students planning to study computer science.',
  },
  {
    id: 'equitable-excellence',
    name: 'Equitable Excellence Scholarship',
    sponsor: 'Equitable Foundation',
    kind: 'scholarship',
    amountMin: 2500,
    amountMax: 20000,
    renewable: true,
    deadline: { month: 12, day: 18 },
    url: 'https://equitable.com/foundation/equitable-excellence-scholarship',
    criteria: {
      degreeLevels: ['high-school-senior'],
      requiresCommunityService: true,
      requiresCitizenOrEligibleNoncitizen: true,
    },
    notes: 'Rewards students who’ve led positive change through community service; hundreds of awards.',
  },
  {
    id: 'aotc',
    name: 'American Opportunity Tax Credit (AOTC)',
    sponsor: 'IRS',
    kind: 'tax-credit',
    amountMin: 0,
    amountMax: 2500,
    renewable: true,
    deadline: 'rolling',
    url: 'https://www.irs.gov/credits-deductions/individuals/aotc',
    criteria: {
      degreeLevels: ['undergraduate', 'high-school-senior'],
      requiresHalfTimePlus: true,
      maxHouseholdIncome: 180000,
    },
    notes:
      'Up to $2,500/yr back at tax time for each of the first four years of college (40% refundable even with zero tax owed). Claimed on the family’s return.',
  },
  {
    id: 'lifetime-learning-credit',
    name: 'Lifetime Learning Credit',
    sponsor: 'IRS',
    kind: 'tax-credit',
    amountMin: 0,
    amountMax: 2000,
    renewable: true,
    deadline: 'rolling',
    url: 'https://www.irs.gov/credits-deductions/individuals/llc',
    criteria: {
      degreeLevels: ['graduate', 'undergraduate'],
      maxHouseholdIncome: 180000,
    },
    notes:
      'Up to $2,000/yr with no four-year or half-time limit — the grad-school and part-timer counterpart to the AOTC (you can’t claim both for the same student).',
  },
  {
    id: 'employer-tuition-127',
    name: 'Employer Tuition Assistance (IRC §127)',
    sponsor: 'Your employer',
    kind: 'employer-benefit',
    amountMin: 0,
    amountMax: 5250,
    renewable: true,
    deadline: 'rolling',
    url: 'https://www.irs.gov/publications/p970',
    criteria: {
      requiresEmployment: true,
    },
    notes:
      'Many employers reimburse up to $5,250/yr tax-free (some, like Amazon/Starbucks/Chipotle, pay full tuition). Ask HR — this one is pure found money.',
  },
  {
    id: 'gi-bill',
    name: 'Post-9/11 GI Bill & military tuition assistance',
    sponsor: 'US Department of Veterans Affairs / DoD',
    kind: 'military-benefit',
    amountMin: 0,
    amountMax: 29920,
    renewable: true,
    deadline: 'rolling',
    url: 'https://www.va.gov/education/about-gi-bill-benefits/',
    criteria: {
      requiresMilitaryAffiliation: true,
    },
    notes:
      'Covers up to full in-state public tuition plus a housing stipend for service members, veterans, and (via transfer) their dependents.',
  },
];

export function findOpportunity(id: string): Opportunity | undefined {
  return CATALOG.find((o) => o.id === id);
}
