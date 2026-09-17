import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeReturn } from '../domain/engine.ts';
import { screenReturn } from '../domain/scope.ts';
import { SITUATIONS, TAX_YEAR, emptyDeductions, emptyIncome } from '../domain/types.ts';
import type { Situation, TaxReturn } from '../domain/types.ts';

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
    situations: [],
    dependents: [],
    income: emptyIncome(),
    deductions: emptyDeductions(),
    ...overrides,
  };
}

const person = (birthYear: number) => ({
  firstName: 'A',
  lastName: 'B',
  ssn: '123-45-6789',
  birthYear,
  blind: false,
});

const personal = (birthYear: number) => ({
  taxpayer: person(birthYear),
  address: { street: '1 Main', city: 'Raleigh', state: 'NC', zip: '27601' },
  email: 'a@b.co',
});

/** Comfortably-employed filer: well clear of every screening threshold. */
function salaried(overrides: Partial<TaxReturn> = {}): TaxReturn {
  return baseReturn({
    personal: personal(1985),
    income: { ...emptyIncome(), w2s: [{ employer: 'Acme', wages: 90_000, federalWithholding: 14_000 }] },
    ...overrides,
  });
}

const screen = (ret: TaxReturn) => screenReturn(ret, computeReturn(ret));
const ids = (ret: TaxReturn) => screen(ret).findings.map((f) => f.id);

describe('scope screening — declared situations', () => {
  it('passes a plain salaried return with nothing declared', () => {
    const report = screen(salaried());
    assert.equal(report.status, 'supported');
    assert.deepEqual(report.findings, []);
  });

  it('blocks every out-of-scope situation the filer can declare', () => {
    // multi-state is federal-safe, so it warns rather than blocks.
    const blocking = SITUATIONS.filter((s) => s !== 'multi-state');
    for (const situation of blocking) {
      const report = screen(salaried({ situations: [situation] }));
      assert.equal(report.status, 'unsupported', `${situation} should block`);
      assert.ok(report.findings.some((f) => f.id === situation && f.severity === 'blocking'));
    }
  });

  it('treats a multi-state move as a caution, not a block', () => {
    const report = screen(salaried({ situations: ['multi-state'] }));
    assert.equal(report.status, 'review');
    assert.equal(report.findings[0]!.severity, 'caution');
  });

  it('flags missing credits as understating the refund', () => {
    const report = screen(salaried({ situations: ['education-expenses'] }));
    assert.equal(report.findings[0]!.effect, 'understates-refund');
  });

  it('reports every declared situation, not just the first', () => {
    const declared: Situation[] = ['social-security', 'rental-or-royalty', 'farm-income'];
    const found = ids(salaried({ situations: declared }));
    for (const s of declared) assert.ok(found.includes(s));
  });

  it('screens declared situations even before a filing status exists', () => {
    const ret = baseReturn({ filingStatus: undefined, situations: ['social-security'] });
    const report = screenReturn(ret, null);
    assert.equal(report.status, 'unsupported');
  });
});

describe('scope screening — derived from the numbers', () => {
  it('catches likely EITC eligibility, which would understate the refund', () => {
    const ret = baseReturn({
      personal: personal(1990),
      income: { ...emptyIncome(), w2s: [{ employer: 'A', wages: 18_000, federalWithholding: 500 }] },
    });
    const report = screen(ret);
    assert.equal(report.status, 'unsupported');
    const finding = report.findings.find((f) => f.id === 'possible-eitc');
    assert.ok(finding);
    assert.equal(finding.effect, 'understates-refund');
  });

  it('does not flag EITC for a high earner or for married-filing-separately', () => {
    assert.ok(!ids(salaried()).includes('possible-eitc'));
    const separate = baseReturn({
      filingStatus: 'married-separate',
      personal: personal(1990),
      income: { ...emptyIncome(), w2s: [{ employer: 'A', wages: 15_000, federalWithholding: 0 }] },
    });
    assert.ok(!ids(separate).includes('possible-eitc'));
  });

  it('does not flag EITC when investment income is too large', () => {
    const ret = baseReturn({
      personal: personal(1990),
      income: {
        ...emptyIncome(),
        w2s: [{ employer: 'A', wages: 15_000, federalWithholding: 0 }],
        int1099s: [{ payer: 'Bank', interestIncome: 30_000, federalWithholding: 0 }],
      },
    });
    assert.ok(!ids(ret).includes('possible-eitc'));
  });

  it('catches a child tax credit clipped by a small tax liability (ACTC)', () => {
    const ret = baseReturn({
      filingStatus: 'married-joint',
      personal: personal(1990),
      dependents: [
        { firstName: 'K', lastName: 'A', ssn: '111-11-1111', birthYear: TAX_YEAR - 5, relationship: 'child' },
        { firstName: 'K', lastName: 'B', ssn: '222-22-2222', birthYear: TAX_YEAR - 7, relationship: 'child' },
      ],
      income: { ...emptyIncome(), w2s: [{ employer: 'A', wages: 42_000, federalWithholding: 900 }] },
    });
    const computation = computeReturn(ret);
    assert.ok(computation.totalCredits < computation.childTaxCredit, 'credit should be clipped');
    assert.ok(screenReturn(ret, computation).findings.some((f) => f.id === 'possible-actc'));
  });

  it('nudges a 65-year-old who did not declare retirement income, and stops once declared', () => {
    const senior = salaried({ personal: personal(TAX_YEAR - 70) });
    assert.ok(ids(senior).includes('retirement-age-check'));
    const declared = salaried({
      personal: personal(TAX_YEAR - 70),
      situations: ['social-security'],
    });
    assert.ok(!ids(declared).includes('retirement-age-check'));
  });

  it('warns that QBI is overstated above the threshold', () => {
    const ret = baseReturn({
      personal: personal(1985),
      income: { ...emptyIncome(), nec1099s: [{ payer: 'Client', compensation: 400_000 }] },
    });
    const found = screen(ret).findings.find((f) => f.id === 'qbi-above-threshold');
    assert.ok(found);
    assert.equal(found.effect, 'understates-tax');
  });

  it('warns about AMT only at high income', () => {
    assert.ok(!ids(salaried()).includes('possible-amt'));
    const wealthy = salaried({
      income: { ...emptyIncome(), w2s: [{ employer: 'A', wages: 900_000, federalWithholding: 300_000 }] },
    });
    assert.ok(ids(wealthy).includes('possible-amt'));
  });

  it('warns when an IRA deduction is likely phased out', () => {
    const ret = salaried({
      deductions: {
        ...emptyDeductions(),
        adjustments: { ...emptyDeductions().adjustments, traditionalIraContributions: 7_000 },
      },
    });
    assert.ok(ids(ret).includes('ira-phaseout'));
  });

  it('asks to confirm HSA coverage above the self-only ceiling', () => {
    const ret = salaried({
      deductions: {
        ...emptyDeductions(),
        adjustments: { ...emptyDeductions().adjustments, hsaContributions: 8_000 },
      },
    });
    assert.ok(ids(ret).includes('hsa-coverage'));
  });

  it('notes a capital loss carryforward beyond the annual limit', () => {
    const ret = salaried({
      income: {
        ...emptyIncome(),
        w2s: [{ employer: 'A', wages: 90_000, federalWithholding: 14_000 }],
        capitalGainShortTerm: -12_000,
      },
    });
    assert.ok(ids(ret).includes('capital-loss-carryforward'));
  });

  it('warns about an underpayment penalty on a large balance due', () => {
    const ret = salaried({
      income: { ...emptyIncome(), w2s: [{ employer: 'A', wages: 90_000, federalWithholding: 0 }] },
    });
    assert.ok(ids(ret).includes('underpayment-penalty'));
  });

  it('always cautions on married filing separately', () => {
    const ret = baseReturn({
      filingStatus: 'married-separate',
      personal: personal(1985),
      income: { ...emptyIncome(), w2s: [{ employer: 'A', wages: 90_000, federalWithholding: 14_000 }] },
    });
    assert.ok(ids(ret).includes('mfs-complexity'));
  });

  it('a caution alone never blocks the estimate', () => {
    const report = screen(salaried({ personal: personal(TAX_YEAR - 70) }));
    assert.equal(report.status, 'review');
    assert.ok(report.findings.every((f) => f.severity === 'caution'));
  });
});
