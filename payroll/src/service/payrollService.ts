/**
 * PayrollService — orchestration for payroll runs.
 *
 * Manages companies (each pinned to a tax jurisdiction) and employees, then
 * runs payroll for a pay period: it derives the period gross from the
 * employee's comp, gathers year-to-date wage bases from prior payslips (needed
 * for the Social Security cap and Additional Medicare threshold), invokes the
 * pure engine, and stores the resulting payslip.
 *
 * Clock and id generator are injected for deterministic tests. Money is cents.
 */

import { randomUUID } from 'node:crypto';
import { computePayslip, type EngineInput } from '../domain/engine.ts';
import { taxConfigFor } from '../domain/taxTables.ts';
import type {
  Company,
  Employee,
  FilingStatus,
  PayFrequency,
  Payslip,
  PostTaxDeduction,
  PreTaxDeduction,
  YtdWages,
} from '../domain/types.ts';
import { FILING_STATUSES, PERIODS_PER_YEAR } from '../domain/types.ts';
import type { Collection, Store } from '../store/store.ts';
import { ConflictError, NotFoundError, ValidationError } from './errors.ts';

export interface ServiceOptions {
  store: Store;
  now?: () => Date;
  newId?: (prefix: string) => string;
}

const FREQUENCIES: readonly PayFrequency[] = ['weekly', 'biweekly', 'semimonthly', 'monthly'];

export class PayrollService {
  private readonly store: Store;
  private readonly now: () => Date;
  private readonly newId: (prefix: string) => string;

  constructor(opts: ServiceOptions) {
    this.store = opts.store;
    this.now = opts.now ?? (() => new Date());
    this.newId = opts.newId ?? ((prefix) => `${prefix}_${randomUUID()}`);
  }

  // --- Companies ---------------------------------------------------------

  createCompany(input: { name: string; jurisdiction?: string }): Company {
    const jurisdiction = input.jurisdiction ?? 'raleigh_nc';
    if (!taxConfigFor(jurisdiction)) {
      throw new ValidationError(`unknown tax jurisdiction: ${jurisdiction}`);
    }
    const company: Company = {
      id: this.newId('co'),
      name: requireString(input.name, 'name'),
      jurisdiction,
      createdAt: this.timestamp(),
    };
    this.store.companies.put(company);
    return company;
  }

  // --- Employees ---------------------------------------------------------

  createEmployee(input: {
    companyId: string;
    firstName: string;
    lastName: string;
    payType: 'salary' | 'hourly';
    annualSalaryCents?: number;
    hourlyRateCents?: number;
    payFrequency: PayFrequency;
    filingStatus: FilingStatus;
    ncAllowances?: number;
    federalExtraWithholdingCents?: number;
    federalDependentsAnnualCreditCents?: number;
    preTaxDeductions?: PreTaxDeduction[];
    postTaxDeductions?: PostTaxDeduction[];
  }): Employee {
    this.requireCompany(input.companyId);
    if (!FREQUENCIES.includes(input.payFrequency)) {
      throw new ValidationError(`unknown payFrequency: ${String(input.payFrequency)}`);
    }
    if (!FILING_STATUSES.includes(input.filingStatus)) {
      throw new ValidationError(`unknown filingStatus: ${String(input.filingStatus)}`);
    }
    if (input.payType === 'salary') {
      assertPositiveInt(input.annualSalaryCents, 'annualSalaryCents');
    } else if (input.payType === 'hourly') {
      assertPositiveInt(input.hourlyRateCents, 'hourlyRateCents');
    } else {
      throw new ValidationError(`payType must be 'salary' or 'hourly'`);
    }

    const employee: Employee = {
      id: this.newId('emp'),
      companyId: input.companyId,
      firstName: requireString(input.firstName, 'firstName'),
      lastName: requireString(input.lastName, 'lastName'),
      payType: input.payType,
      annualSalaryCents: input.annualSalaryCents,
      hourlyRateCents: input.hourlyRateCents,
      payFrequency: input.payFrequency,
      filingStatus: input.filingStatus,
      ncAllowances: input.ncAllowances ?? 0,
      federalExtraWithholdingCents: input.federalExtraWithholdingCents ?? 0,
      federalDependentsAnnualCreditCents: input.federalDependentsAnnualCreditCents ?? 0,
      preTaxDeductions: (input.preTaxDeductions ?? []).map(validatePreTax),
      postTaxDeductions: (input.postTaxDeductions ?? []).map(validatePostTax),
      createdAt: this.timestamp(),
    };
    this.store.employees.put(employee);
    return employee;
  }

  getEmployee(id: string): Employee {
    return this.require(this.store.employees, 'Employee', id);
  }

  listEmployees(filter?: { companyId?: string }): Employee[] {
    return this.store.employees.list((e) => !filter?.companyId || e.companyId === filter.companyId);
  }

  // --- Payroll runs ------------------------------------------------------

  /**
   * Run payroll for one employee and pay period. `payDate` is the ISO date of
   * the check; its calendar year scopes the YTD wage bases. For hourly
   * employees `hours` is required.
   */
  runPayroll(employeeId: string, input: { payDate: string; hours?: number }): Payslip {
    const employee = this.getEmployee(employeeId);
    const company = this.requireCompany(employee.companyId);
    const config = taxConfigFor(company.jurisdiction);
    if (!config) throw new ConflictError(`company jurisdiction '${company.jurisdiction}' has no tax config`);

    const payDate = requireString(input.payDate, 'payDate');
    const year = payDate.slice(0, 4);
    const gross = this.grossForPeriod(employee, input.hours);
    const ytd = this.ytdWages(employee.id, year);

    const engineInput: EngineInput = {
      grossCents: gross,
      filingStatus: employee.filingStatus,
      periodsPerYear: PERIODS_PER_YEAR[employee.payFrequency],
      ncAllowances: employee.ncAllowances,
      federalExtraWithholdingCents: employee.federalExtraWithholdingCents,
      federalDependentsAnnualCreditCents: employee.federalDependentsAnnualCreditCents,
      preTaxDeductions: employee.preTaxDeductions,
      postTaxDeductionsCents: employee.postTaxDeductions.reduce((t, d) => t + d.amountCents, 0),
      ytd,
    };
    const result = computePayslip(engineInput, config);

    const payslip: Payslip = {
      id: this.newId('slip'),
      companyId: company.id,
      employeeId: employee.id,
      payDate,
      hours: input.hours,
      grossCents: result.grossCents,
      ficaWagesCents: result.ficaWagesCents,
      federalTaxableCents: result.federalTaxableCents,
      stateTaxableCents: result.stateTaxableCents,
      socialSecurityCents: result.socialSecurityCents,
      medicareCents: result.medicareCents,
      additionalMedicareCents: result.additionalMedicareCents,
      federalIncomeTaxCents: result.federalIncomeTaxCents,
      stateIncomeTaxCents: result.stateIncomeTaxCents,
      preTaxDeductionsCents: result.preTaxDeductionsCents,
      postTaxDeductionsCents: result.postTaxDeductionsCents,
      netCents: result.netCents,
      employer: result.employer,
      createdAt: this.timestamp(),
    };
    this.store.payslips.put(payslip);
    return payslip;
  }

  getPayslip(id: string): Payslip {
    return this.require(this.store.payslips, 'Payslip', id);
  }

  listPayslips(filter?: { companyId?: string; employeeId?: string }): Payslip[] {
    return this.store.payslips.list((p) => {
      if (filter?.companyId && p.companyId !== filter.companyId) return false;
      if (filter?.employeeId && p.employeeId !== filter.employeeId) return false;
      return true;
    });
  }

  // --- internals ---------------------------------------------------------

  private grossForPeriod(employee: Employee, hours?: number): number {
    if (employee.payType === 'salary') {
      const perYear = PERIODS_PER_YEAR[employee.payFrequency];
      return Math.round((employee.annualSalaryCents ?? 0) / perYear);
    }
    if (typeof hours !== 'number' || Number.isNaN(hours) || hours < 0) {
      throw new ValidationError('hourly employees require non-negative hours');
    }
    return Math.round((employee.hourlyRateCents ?? 0) * hours);
  }

  private ytdWages(employeeId: string, year: string): YtdWages {
    const prior = this.store.payslips.list(
      (p) => p.employeeId === employeeId && p.payDate.slice(0, 4) === year,
    );
    return {
      gross: prior.reduce((t, p) => t + p.grossCents, 0),
      ficaWages: prior.reduce((t, p) => t + p.ficaWagesCents, 0),
    };
  }

  private timestamp(): string {
    return this.now().toISOString();
  }

  private requireCompany(id: string): Company {
    return this.require(this.store.companies, 'Company', id);
  }

  private require<T>(collection: Collection<T>, what: string, id: string): T {
    if (typeof id !== 'string' || id.length === 0) {
      throw new ValidationError(`${what} id is required`);
    }
    const found = collection.get(id);
    if (!found) throw new NotFoundError(what, id);
    return found;
  }
}

function validatePreTax(d: PreTaxDeduction): PreTaxDeduction {
  assertPositiveInt(d?.amountCents, 'deduction amountCents');
  return {
    name: requireString(d.name, 'deduction name'),
    amountCents: d.amountCents,
    reducesFederalTaxable: d.reducesFederalTaxable !== false,
    reducesStateTaxable: d.reducesStateTaxable !== false,
    reducesFica: d.reducesFica === true,
  };
}

function validatePostTax(d: PostTaxDeduction): PostTaxDeduction {
  assertPositiveInt(d?.amountCents, 'deduction amountCents');
  return { name: requireString(d.name, 'deduction name'), amountCents: d.amountCents };
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${field} is required`);
  }
  return value.trim();
}

function assertPositiveInt(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new ValidationError(`${field} must be a non-negative integer (cents)`);
  }
}
