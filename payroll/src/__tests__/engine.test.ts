import { test } from 'node:test';
import assert from 'node:assert/strict';

import { computePayslip, type EngineInput } from '../domain/engine.ts';
import { RALEIGH_NC } from '../domain/taxTables.ts';
import type { PreTaxDeduction } from '../domain/types.ts';

/** Base case: $52,000/yr salary, biweekly (26), single, no deductions. */
function baseInput(overrides: Partial<EngineInput> = {}): EngineInput {
  return {
    grossCents: 200000, // 52,000,00 / 26 = 2,000.00
    filingStatus: 'single',
    periodsPerYear: 26,
    ncAllowances: 0,
    federalExtraWithholdingCents: 0,
    federalDependentsAnnualCreditCents: 0,
    preTaxDeductions: [],
    postTaxDeductionsCents: 0,
    ytd: { gross: 0, ficaWages: 0 },
    ...overrides,
  };
}

test('a $52k single biweekly paycheck computes to the expected cents', () => {
  const r = computePayslip(baseInput(), RALEIGH_NC);
  assert.equal(r.socialSecurityCents, 12400); // 2000.00 * 6.2%
  assert.equal(r.medicareCents, 2900); // 2000.00 * 1.45%
  assert.equal(r.additionalMedicareCents, 0);
  assert.equal(r.federalIncomeTaxCents, 20129); // annual 5233.50 / 26
  assert.equal(r.stateIncomeTaxCents, 6023); // NC 3.99% on (52000 - 12750) / 26
  assert.equal(r.netCents, 158548);
  assert.equal(r.employer.socialSecurityCents, 12400);
  assert.equal(r.employer.medicareCents, 2900);
  assert.equal(r.employer.futaCents, 1200); // 2000.00 * 0.6% (under FUTA base)
  assert.equal(r.employer.sutaCents, 2000); // 2000.00 * 1.0% (under SUTA base)
});

test('a 401(k) cuts income-tax wages but not FICA', () => {
  const k401: PreTaxDeduction = {
    name: '401(k)',
    amountCents: 20000,
    reducesFederalTaxable: true,
    reducesStateTaxable: true,
    reducesFica: false,
  };
  const r = computePayslip(baseInput({ preTaxDeductions: [k401] }), RALEIGH_NC);
  // FICA unchanged
  assert.equal(r.ficaWagesCents, 200000);
  assert.equal(r.socialSecurityCents, 12400);
  // income-tax wages reduced -> lower income taxes than the base case
  assert.equal(r.federalTaxableCents, 180000);
  assert.ok(r.federalIncomeTaxCents < 20129);
  assert.ok(r.stateIncomeTaxCents < 6023);
  assert.equal(r.netCents, 200000 - 12400 - 2900 - r.federalIncomeTaxCents - r.stateIncomeTaxCents - 20000);
});

test('a Section-125 health premium also cuts FICA wages', () => {
  const premium: PreTaxDeduction = {
    name: 'Medical premium',
    amountCents: 15000,
    reducesFederalTaxable: true,
    reducesStateTaxable: true,
    reducesFica: true,
  };
  const r = computePayslip(baseInput({ preTaxDeductions: [premium] }), RALEIGH_NC);
  assert.equal(r.ficaWagesCents, 185000);
  assert.equal(r.socialSecurityCents, Math.round(185000 * 0.062)); // 11470
});

test('Social Security stops at the annual wage base', () => {
  const nearCap = RALEIGH_NC.socialSecurityWageBaseCents - 100000; // $1,000 of room left
  const r = computePayslip(baseInput({ ytd: { gross: nearCap, ficaWages: nearCap } }), RALEIGH_NC);
  assert.equal(r.socialSecurityCents, Math.round(100000 * 0.062)); // only the remaining $1,000 taxed
});

test('Additional Medicare kicks in above the YTD threshold', () => {
  // YTD FICA wages $199,000; this $2,000 period crosses the $200,000 line by $1,000.
  const r = computePayslip(baseInput({ ytd: { gross: 19900000, ficaWages: 19900000 } }), RALEIGH_NC);
  assert.equal(r.additionalMedicareCents, Math.round(100000 * 0.009)); // 900
  assert.equal(r.socialSecurityCents, 0); // already past the SS wage base
});

test('married filing jointly withholds less federal than single at the same wage', () => {
  const single = computePayslip(baseInput({ filingStatus: 'single' }), RALEIGH_NC);
  const mfj = computePayslip(baseInput({ filingStatus: 'married_joint' }), RALEIGH_NC);
  assert.ok(mfj.federalIncomeTaxCents < single.federalIncomeTaxCents);
});
