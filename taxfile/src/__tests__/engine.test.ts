import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  childTaxCredit,
  computeReturn,
  ordinaryTax,
  saltDeduction,
  selfEmploymentTax,
  standardDeduction,
  studentLoanInterestDeduction,
  taxWithPreferentialRates,
} from '../domain/engine.ts';
import { TAX_YEAR, emptyDeductions, emptyIncome } from '../domain/types.ts';
import type { FilingStatus, TaxReturn } from '../domain/types.ts';

function baseReturn(overrides: Partial<TaxReturn> = {}): TaxReturn {
  return {
    id: 'r1',
    ownerId: 'u1',
    taxYear: TAX_YEAR,
    status: 'in-progress',
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
    completedSections: [],
    filingStatus: 'single',
    dependents: [],
    income: emptyIncome(),
    deductions: emptyDeductions(),
    ...overrides,
  };
}

describe('ordinary brackets (2025)', () => {
  it('taxes a single filer at $50,000 taxable across three brackets', () => {
    // 11,925*10% + (48,475-11,925)*12% + (50,000-48,475)*22% = 5,914.00
    assert.equal(ordinaryTax(50_000, 'single'), 5_914);
  });

  it('taxes MFJ at exactly the top of the 10% bracket', () => {
    assert.equal(ordinaryTax(23_850, 'married-joint'), 2_385);
  });

  it('handles zero and the 37% top bracket', () => {
    assert.equal(ordinaryTax(0, 'single'), 0);
    // 1,000,000: fixed tax through 626,350 plus 37% above.
    const through35 =
      11_925 * 0.1 +
      (48_475 - 11_925) * 0.12 +
      (103_350 - 48_475) * 0.22 +
      (197_300 - 103_350) * 0.24 +
      (250_525 - 197_300) * 0.32 +
      (626_350 - 250_525) * 0.35;
    const expected = Math.round((through35 + (1_000_000 - 626_350) * 0.37) * 100) / 100;
    assert.equal(ordinaryTax(1_000_000, 'single'), expected);
  });
});

describe('standard deduction (2025)', () => {
  const forStatus = (status: FilingStatus, birthYear = 1990): number =>
    standardDeduction(
      baseReturn({
        filingStatus: status,
        personal: {
          taxpayer: { firstName: 'A', lastName: 'B', ssn: '123-45-6789', birthYear, blind: false },
          address: { street: '1 Main', city: 'Raleigh', state: 'NC', zip: '27601' },
          email: 'a@b.co',
        },
      }),
      status,
    );

  it('uses the OBBBA base amounts', () => {
    assert.equal(forStatus('single'), 15_750);
    assert.equal(forStatus('married-joint'), 31_500);
    assert.equal(forStatus('head-of-household'), 23_625);
  });

  it('adds the age-65 extra amount', () => {
    assert.equal(forStatus('single', TAX_YEAR - 70), 15_750 + 2_000);
  });
});

describe('capital gains / qualified dividends worksheet', () => {
  it('applies 0% when everything fits under the 0% ceiling', () => {
    // Single: $40,000 taxable, all of it qualified dividends -> $0 tax.
    assert.equal(taxWithPreferentialRates(40_000, 40_000, 'single'), 0);
  });

  it('stacks preferential income on top of ordinary income', () => {
    // Single: 60,000 taxable of which 10,000 preferential.
    // Ordinary tax on 50,000 = 5,914; pref sits fully above 48,350 -> 15%.
    assert.equal(taxWithPreferentialRates(60_000, 10_000, 'single'), 5_914 + 1_500);
  });

  it('never exceeds all-ordinary treatment', () => {
    const withPref = taxWithPreferentialRates(700_000, 100_000, 'single');
    assert.ok(withPref <= ordinaryTax(700_000, 'single'));
  });
});

describe('self-employment tax', () => {
  it('computes 15.3% on 92.35% of net profit', () => {
    const income = { ...emptyIncome(), nec1099s: [{ payer: 'Acme', compensation: 50_000 }] };
    const result = selfEmploymentTax(income);
    // 50,000 * 0.9235 = 46,175; * 15.3% = 7,064.78 (rounded)
    assert.equal(result.seTax, 7_064.78);
    assert.equal(result.halfSeTaxDeduction, 3_532.39);
  });

  it('owes nothing under the $400 floor', () => {
    const income = { ...emptyIncome(), nec1099s: [{ payer: 'Acme', compensation: 400 }] };
    assert.equal(selfEmploymentTax(income).seTax, 0);
  });

  it('caps the social-security portion at the wage base', () => {
    const income = { ...emptyIncome(), nec1099s: [{ payer: 'Acme', compensation: 300_000 }] };
    const net = 300_000 * 0.9235;
    const expected = Math.round((176_100 * 0.124 + net * 0.029) * 100) / 100;
    assert.equal(selfEmploymentTax(income).seTax, expected);
  });
});

describe('child tax credit', () => {
  it('gives $2,200 per child and $500 per other dependent', () => {
    const result = childTaxCredit(2, 1, 100_000, 'married-joint');
    assert.equal(result.childTaxCredit, 4_400);
    assert.equal(result.creditForOtherDependents, 500);
  });

  it('phases out $50 per $1,000 over the threshold', () => {
    // MFJ, AGI 410,000: $10,000 over -> $500 reduction.
    const result = childTaxCredit(2, 0, 410_000, 'married-joint');
    assert.equal(result.childTaxCredit + result.creditForOtherDependents, 4_400 - 500);
  });

  it('phases out fully at high income', () => {
    const result = childTaxCredit(1, 0, 600_000, 'single');
    assert.equal(result.childTaxCredit, 0);
  });
});

describe('student loan interest deduction', () => {
  it('caps at $2,500', () => {
    assert.equal(studentLoanInterestDeduction(4_000, 50_000, 'single'), 2_500);
  });
  it('phases out between $85k and $100k for single filers', () => {
    assert.equal(studentLoanInterestDeduction(2_500, 92_500, 'single'), 1_250);
    assert.equal(studentLoanInterestDeduction(2_500, 120_000, 'single'), 0);
  });
  it('is unavailable for married filing separately', () => {
    assert.equal(studentLoanInterestDeduction(2_500, 50_000, 'married-separate'), 0);
  });
});

describe('SALT cap (OBBBA 2025)', () => {
  it('allows up to $40k below the phase-down threshold', () => {
    assert.equal(saltDeduction(35_000, 300_000, 'married-joint'), 35_000);
    assert.equal(saltDeduction(60_000, 300_000, 'married-joint'), 40_000);
  });
  it('phases the cap down toward the $10k floor at high income', () => {
    // MAGI 550k: cap = 40,000 - 50,000*0.3 = 25,000.
    assert.equal(saltDeduction(60_000, 550_000, 'married-joint'), 25_000);
    // MAGI 700k: 40,000 - 60,000 -> floored at 10,000.
    assert.equal(saltDeduction(60_000, 700_000, 'married-joint'), 10_000);
  });
});

describe('computeReturn end-to-end', () => {
  it('computes a simple W-2 single filer with a refund', () => {
    const ret = baseReturn({
      income: {
        ...emptyIncome(),
        w2s: [{ employer: 'Acme', wages: 60_000, federalWithholding: 7_000 }],
      },
    });
    const c = computeReturn(ret);
    assert.equal(c.totalIncome, 60_000);
    assert.equal(c.adjustedGrossIncome, 60_000);
    assert.equal(c.deduction, 15_750);
    assert.equal(c.deductionMethod, 'standard');
    assert.equal(c.taxableIncome, 44_250);
    // 11,925*10% + (44,250-11,925)*12% = 5,071.50
    assert.equal(c.incomeTax, 5_071.5);
    assert.equal(c.totalTax, 5_071.5);
    assert.equal(c.refund, 1_928.5);
    assert.equal(c.amountOwed, 0);
    assert.equal(c.marginalRate, 0.12);
  });

  it('applies the CTC for a married couple with two young children', () => {
    const ret = baseReturn({
      filingStatus: 'married-joint',
      dependents: [
        { firstName: 'K', lastName: 'One', ssn: '111-11-1111', birthYear: TAX_YEAR - 5, relationship: 'child' },
        { firstName: 'K', lastName: 'Two', ssn: '222-22-2222', birthYear: TAX_YEAR - 8, relationship: 'child' },
      ],
      income: {
        ...emptyIncome(),
        w2s: [{ employer: 'Acme', wages: 120_000, federalWithholding: 12_000 }],
      },
    });
    const c = computeReturn(ret);
    assert.equal(c.childTaxCredit, 4_400);
    assert.equal(c.totalCredits, 4_400);
  });

  it('excludes 17+ children from the CTC', () => {
    const ret = baseReturn({
      dependents: [
        { firstName: 'T', lastName: 'Teen', ssn: '333-33-3333', birthYear: TAX_YEAR - 18, relationship: 'child' },
      ],
      income: { ...emptyIncome(), w2s: [{ employer: 'A', wages: 80_000, federalWithholding: 0 }] },
    });
    const c = computeReturn(ret);
    assert.equal(c.childTaxCredit, 0);
    assert.equal(c.creditForOtherDependents, 500);
  });

  it('adds SE tax, the half-SE deduction, and the QBI deduction for a freelancer', () => {
    const ret = baseReturn({
      income: { ...emptyIncome(), nec1099s: [{ payer: 'Client', compensation: 80_000 }], businessExpenses: 10_000 },
    });
    const c = computeReturn(ret);
    // Net profit 70,000; SE tax = 70,000*0.9235*0.153 = 9,890.685 -> 9,890.69
    assert.equal(c.selfEmploymentTax, 9_890.69);
    assert.equal(c.adjustments, 4_945.35); // half SE tax
    assert.equal(c.adjustedGrossIncome, 65_054.65);
    assert.ok(c.qbiDeduction > 0);
    assert.ok(c.totalTax > c.selfEmploymentTax);
  });

  it('limits capital losses to $3,000 against ordinary income', () => {
    const ret = baseReturn({
      income: {
        ...emptyIncome(),
        w2s: [{ employer: 'A', wages: 50_000, federalWithholding: 0 }],
        capitalGainShortTerm: -20_000,
      },
    });
    const c = computeReturn(ret);
    assert.equal(c.totalIncome, 47_000);
  });

  it('taxes qualified dividends at 0% for a low-income filer', () => {
    const ret = baseReturn({
      income: {
        ...emptyIncome(),
        div1099s: [{ payer: 'B', ordinaryDividends: 30_000, qualifiedDividends: 30_000, capitalGainDistributions: 0, federalWithholding: 0 }],
      },
    });
    const c = computeReturn(ret);
    assert.equal(c.incomeTax, 0);
  });

  it('itemizes automatically when it beats the standard deduction', () => {
    const ret = baseReturn({
      income: { ...emptyIncome(), w2s: [{ employer: 'A', wages: 200_000, federalWithholding: 0 }] },
      deductions: {
        ...emptyDeductions(),
        itemized: { medicalExpenses: 0, stateLocalTaxes: 15_000, mortgageInterest: 12_000, charitableContributions: 4_000 },
      },
    });
    const c = computeReturn(ret);
    assert.equal(c.deductionMethod, 'itemized');
    assert.equal(c.deduction, 31_000);
  });

  it('charges additional Medicare tax and NIIT for high earners', () => {
    const ret = baseReturn({
      income: {
        ...emptyIncome(),
        w2s: [{ employer: 'A', wages: 300_000, federalWithholding: 0 }],
        int1099s: [{ payer: 'Bank', interestIncome: 50_000, federalWithholding: 0 }],
      },
    });
    const c = computeReturn(ret);
    assert.equal(c.additionalMedicareTax, 900); // 0.9% of 100k over 200k
    assert.equal(c.netInvestmentIncomeTax, 1_900); // 3.8% of min(50k NII, 150k over)
  });
});
