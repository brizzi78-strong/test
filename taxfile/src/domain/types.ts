/**
 * Domain types for TaxFile: a guided federal individual income tax return
 * (Form 1040) for a single tax year.
 *
 * A `TaxReturn` is the interview document the user fills in section by
 * section; `TaxComputation` is the pure, derived output of the tax engine.
 */

export const TAX_YEAR = 2025;

export const FILING_STATUSES = [
  'single',
  'married-joint',
  'married-separate',
  'head-of-household',
] as const;
export type FilingStatus = (typeof FILING_STATUSES)[number];

export const RETURN_STATUSES = ['in-progress', 'accepted', 'rejected'] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

/** Interview sections, in the order the wizard presents them. */
export const SECTIONS = [
  'personal',
  'filing-status',
  'dependents',
  'income',
  'deductions',
] as const;
export type Section = (typeof SECTIONS)[number];

export interface Address {
  street: string;
  city: string;
  state: string; // two-letter code
  zip: string;
}

export interface Person {
  firstName: string;
  lastName: string;
  ssn: string; // formatted 000-00-0000
  birthYear: number;
  blind: boolean;
}

export interface PersonalSection {
  taxpayer: Person;
  spouse?: Person; // required for married-joint
  address: Address;
  email: string;
}

export const RELATIONSHIPS = ['child', 'parent', 'sibling', 'other'] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export interface Dependent {
  firstName: string;
  lastName: string;
  ssn: string;
  birthYear: number;
  relationship: Relationship;
}

export interface W2 {
  employer: string;
  wages: number; // box 1
  federalWithholding: number; // box 2
}

export interface Form1099Int {
  payer: string;
  interestIncome: number; // box 1
  federalWithholding: number; // box 4
}

export interface Form1099Div {
  payer: string;
  ordinaryDividends: number; // box 1a (includes qualified)
  qualifiedDividends: number; // box 1b
  capitalGainDistributions: number; // box 2a (long-term)
  federalWithholding: number; // box 4
}

export interface Form1099Nec {
  payer: string;
  compensation: number; // box 1, self-employment income
}

export interface IncomeSection {
  w2s: W2[];
  int1099s: Form1099Int[];
  div1099s: Form1099Div[];
  nec1099s: Form1099Nec[];
  /** Schedule C expenses against the 1099-NEC self-employment income. */
  businessExpenses: number;
  capitalGainShortTerm: number; // net short-term gain (negative = loss)
  capitalGainLongTerm: number; // net long-term gain (negative = loss)
  unemploymentCompensation: number;
  otherIncome: number;
  estimatedTaxPayments: number; // 1040-ES payments made during the year
}

export const MEDICAL_EXPENSE_CATEGORIES = [
  'doctor-dental',
  'prescriptions',
  'hospital',
  'vision',
  'insurance-premiums',
  'equipment-supplies',
  'medical-travel',
  'other',
] as const;
export type MedicalExpenseCategory = (typeof MEDICAL_EXPENSE_CATEGORIES)[number];

/** One tracked medical expense, kept entry-by-entry for records. */
export interface MedicalExpenseEntry {
  date: string; // YYYY-MM-DD
  provider: string; // who was paid (pharmacy, doctor, insurer, …)
  category: MedicalExpenseCategory;
  amount: number;
}

export interface ItemizedDeductions {
  medicalExpenses: number; // lump-sum medical not tracked entry-by-entry
  medicalExpenseEntries: MedicalExpenseEntry[]; // itemized tracker entries
  stateLocalTaxes: number; // SALT, subject to the cap
  mortgageInterest: number;
  charitableContributions: number;
}

export interface Adjustments {
  studentLoanInterest: number; // gross paid; capped and phased out
  traditionalIraContributions: number;
  hsaContributions: number;
  educatorExpenses: number;
}

export type DeductionMethod = 'auto' | 'standard' | 'itemized';

export interface DeductionsSection {
  method: DeductionMethod;
  itemized: ItemizedDeductions;
  adjustments: Adjustments;
}

export interface EfileRecord {
  submissionId: string;
  submittedAt: string; // ISO timestamp
  status: 'accepted' | 'rejected';
  rejectionReasons?: string[];
}

export interface TaxReturn {
  id: string;
  ownerId: string;
  taxYear: number;
  status: ReturnStatus;
  createdAt: string;
  updatedAt: string;
  completedSections: Section[];
  filingStatus?: FilingStatus;
  personal?: PersonalSection;
  dependents: Dependent[];
  income: IncomeSection;
  deductions: DeductionsSection;
  efile?: EfileRecord;
}

/** One labeled line of the computation, for the review screen. */
export interface ComputationLine {
  label: string;
  amount: number;
}

/** How tracked medical expenses fare against the 7.5%-of-AGI floor. */
export interface MedicalDeductionDetail {
  totalExpenses: number; // lump sum + all tracked entries
  agiFloor: number; // 7.5% of AGI; expenses below this never count
  deductible: number; // portion above the floor that itemizing can use
  amountToThreshold: number; // further spend needed before anything counts
}

export interface TaxComputation {
  taxYear: number;
  filingStatus: FilingStatus;
  totalIncome: number;
  adjustments: number;
  adjustedGrossIncome: number;
  deductionMethod: 'standard' | 'itemized';
  deduction: number;
  medical: MedicalDeductionDetail;
  qbiDeduction: number;
  taxableIncome: number;
  incomeTax: number; // regular tax incl. preferential LTCG/QDI rates
  selfEmploymentTax: number;
  additionalMedicareTax: number;
  netInvestmentIncomeTax: number;
  childTaxCredit: number;
  creditForOtherDependents: number;
  totalCredits: number;
  totalTax: number;
  withholding: number;
  estimatedPayments: number;
  totalPayments: number;
  refund: number; // > 0 when payments exceed tax
  amountOwed: number; // > 0 when tax exceeds payments
  effectiveRate: number; // totalTax / AGI, 0 when AGI <= 0
  marginalRate: number; // top ordinary bracket rate reached
  lines: ComputationLine[]; // ordered, human-readable summary
}

export function emptyIncome(): IncomeSection {
  return {
    w2s: [],
    int1099s: [],
    div1099s: [],
    nec1099s: [],
    businessExpenses: 0,
    capitalGainShortTerm: 0,
    capitalGainLongTerm: 0,
    unemploymentCompensation: 0,
    otherIncome: 0,
    estimatedTaxPayments: 0,
  };
}

export function emptyDeductions(): DeductionsSection {
  return {
    method: 'auto',
    itemized: {
      medicalExpenses: 0,
      medicalExpenseEntries: [],
      stateLocalTaxes: 0,
      mortgageInterest: 0,
      charitableContributions: 0,
    },
    adjustments: {
      studentLoanInterest: 0,
      traditionalIraContributions: 0,
      hsaContributions: 0,
      educatorExpenses: 0,
    },
  };
}
