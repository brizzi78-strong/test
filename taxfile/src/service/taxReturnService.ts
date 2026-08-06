/**
 * TaxReturnService: the application layer between the HTTP API and the store.
 *
 * Owns input validation, section-by-section updates, the "is this return
 * ready to file" checklist, and the (mock) e-file submission. All tax math is
 * delegated to the pure engine in domain/engine.ts.
 */

import { randomUUID } from 'node:crypto';
import { computeReturn } from '../domain/engine.ts';
import {
  FILING_STATUSES,
  RELATIONSHIPS,
  TAX_YEAR,
  emptyDeductions,
  emptyIncome,
} from '../domain/types.ts';
import type {
  Dependent,
  DeductionsSection,
  FilingStatus,
  IncomeSection,
  PersonalSection,
  Person,
  Section,
  TaxComputation,
  TaxReturn,
} from '../domain/types.ts';
import { ConflictError, NotFoundError, ValidationError } from './errors.ts';
import type { Store } from '../store/store.ts';

const SSN_PATTERN = /^\d{3}-\d{2}-\d{4}$/;
const STATE_PATTERN = /^[A-Z]{2}$/;
const ZIP_PATTERN = /^\d{5}(-\d{4})?$/;

export interface ReturnWithComputation {
  taxReturn: TaxReturn;
  /** Present once a filing status is chosen; null before that. */
  computation: TaxComputation | null;
}

export class TaxReturnService {
  private readonly store: Store;
  private readonly now: () => Date;

  constructor(opts: { store: Store; now?: () => Date }) {
    this.store = opts.store;
    this.now = opts.now ?? (() => new Date());
  }

  createReturn(ownerId: string): ReturnWithComputation {
    const timestamp = this.now().toISOString();
    const ret: TaxReturn = {
      id: randomUUID(),
      ownerId,
      taxYear: TAX_YEAR,
      status: 'in-progress',
      createdAt: timestamp,
      updatedAt: timestamp,
      completedSections: [],
      dependents: [],
      income: emptyIncome(),
      deductions: emptyDeductions(),
    };
    this.store.put(ret);
    return this.withComputation(ret);
  }

  listReturns(ownerId: string): TaxReturn[] {
    return this.store
      .list((r) => r.ownerId === ownerId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  getReturn(ownerId: string, id: string): ReturnWithComputation {
    return this.withComputation(this.load(ownerId, id));
  }

  deleteReturn(ownerId: string, id: string): void {
    const ret = this.load(ownerId, id);
    if (ret.status === 'accepted') {
      throw new ConflictError('an accepted return cannot be deleted');
    }
    this.store.delete(ret.id);
  }

  updatePersonal(ownerId: string, id: string, input: unknown): ReturnWithComputation {
    const ret = this.editable(ownerId, id);
    ret.personal = parsePersonal(input);
    return this.save(ret, 'personal');
  }

  updateFilingStatus(ownerId: string, id: string, input: unknown): ReturnWithComputation {
    const ret = this.editable(ownerId, id);
    const status = asObject(input).filingStatus;
    if (typeof status !== 'string' || !FILING_STATUSES.includes(status as FilingStatus)) {
      throw new ValidationError(`filingStatus must be one of: ${FILING_STATUSES.join(', ')}`);
    }
    ret.filingStatus = status as FilingStatus;
    return this.save(ret, 'filing-status');
  }

  updateDependents(ownerId: string, id: string, input: unknown): ReturnWithComputation {
    const ret = this.editable(ownerId, id);
    const deps = asObject(input).dependents;
    if (!Array.isArray(deps)) throw new ValidationError('dependents must be an array');
    ret.dependents = deps.map((d, i) => parseDependent(d, i));
    return this.save(ret, 'dependents');
  }

  updateIncome(ownerId: string, id: string, input: unknown): ReturnWithComputation {
    const ret = this.editable(ownerId, id);
    ret.income = parseIncome(input);
    return this.save(ret, 'income');
  }

  updateDeductions(ownerId: string, id: string, input: unknown): ReturnWithComputation {
    const ret = this.editable(ownerId, id);
    ret.deductions = parseDeductions(input);
    return this.save(ret, 'deductions');
  }

  /** Problems that must be fixed before the return can be e-filed. */
  fileBlockers(ret: TaxReturn): string[] {
    const blockers: string[] = [];
    if (!ret.personal) blockers.push('complete the About You section');
    if (!ret.filingStatus) blockers.push('choose a filing status');
    if (ret.filingStatus === 'married-joint' && ret.personal && !ret.personal.spouse) {
      blockers.push('married filing jointly requires spouse information');
    }
    if (!ret.completedSections.includes('income')) {
      blockers.push('complete the Income section (enter $0 amounts if none)');
    }
    return blockers;
  }

  /**
   * Mock e-file: validates the return, stamps a submission id, and simulates
   * IRS acceptance. A real product would transmit via IRS MeF here.
   */
  fileReturn(ownerId: string, id: string): ReturnWithComputation {
    const ret = this.load(ownerId, id);
    if (ret.status === 'accepted') throw new ConflictError('return has already been filed and accepted');
    const blockers = this.fileBlockers(ret);
    if (blockers.length > 0) {
      throw new ValidationError(`return is not ready to file: ${blockers.join('; ')}`);
    }
    computeReturn(ret); // must compute cleanly before we transmit
    ret.status = 'accepted';
    ret.efile = {
      submissionId: `TF-${ret.taxYear}-${randomUUID().slice(0, 8).toUpperCase()}`,
      submittedAt: this.now().toISOString(),
      status: 'accepted',
    };
    return this.save(ret);
  }

  private load(ownerId: string, id: string): TaxReturn {
    const ret = this.store.get(id);
    if (!ret || ret.ownerId !== ownerId) throw new NotFoundError(`no return with id ${id}`);
    return ret;
  }

  private editable(ownerId: string, id: string): TaxReturn {
    const ret = this.load(ownerId, id);
    if (ret.status === 'accepted') {
      throw new ConflictError('return has been filed and can no longer be edited');
    }
    return ret;
  }

  private save(ret: TaxReturn, completed?: Section): ReturnWithComputation {
    if (completed && !ret.completedSections.includes(completed)) {
      ret.completedSections.push(completed);
    }
    ret.updatedAt = this.now().toISOString();
    this.store.put(ret);
    return this.withComputation(ret);
  }

  private withComputation(ret: TaxReturn): ReturnWithComputation {
    return {
      taxReturn: ret,
      computation: ret.filingStatus ? computeReturn(ret) : null,
    };
  }
}

// --- input parsing/validation helpers ------------------------------------

function asObject(input: unknown): Record<string, unknown> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('request body must be a JSON object');
  }
  return input as Record<string, unknown>;
}

function requireString(obj: Record<string, unknown>, field: string, label: string): string {
  const value = obj[field];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`${label}.${field} is required`);
  }
  return value.trim();
}

function money(obj: Record<string, unknown>, field: string, label: string, allowNegative = false): number {
  const value = obj[field] ?? 0;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError(`${label}.${field} must be a number`);
  }
  if (!allowNegative && value < 0) {
    throw new ValidationError(`${label}.${field} cannot be negative`);
  }
  return Math.round(value * 100) / 100;
}

function parseSsn(obj: Record<string, unknown>, label: string): string {
  const raw = requireString(obj, 'ssn', label).replace(/[^\d]/g, '');
  const formatted = `${raw.slice(0, 3)}-${raw.slice(3, 5)}-${raw.slice(5)}`;
  if (!SSN_PATTERN.test(formatted)) {
    throw new ValidationError(`${label}.ssn must be 9 digits (e.g. 123-45-6789)`);
  }
  return formatted;
}

function parseBirthYear(obj: Record<string, unknown>, label: string): number {
  const value = obj.birthYear;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1900 || value > TAX_YEAR) {
    throw new ValidationError(`${label}.birthYear must be a year between 1900 and ${TAX_YEAR}`);
  }
  return value;
}

function parsePerson(input: unknown, label: string): Person {
  const obj = asObject(input);
  return {
    firstName: requireString(obj, 'firstName', label),
    lastName: requireString(obj, 'lastName', label),
    ssn: parseSsn(obj, label),
    birthYear: parseBirthYear(obj, label),
    blind: obj.blind === true,
  };
}

function parsePersonal(input: unknown): PersonalSection {
  const obj = asObject(input);
  const address = asObject(obj.address ?? {});
  const state = requireString(address, 'state', 'address').toUpperCase();
  if (!STATE_PATTERN.test(state)) throw new ValidationError('address.state must be a 2-letter code');
  const zip = requireString(address, 'zip', 'address');
  if (!ZIP_PATTERN.test(zip)) throw new ValidationError('address.zip must be a 5-digit ZIP code');
  return {
    taxpayer: parsePerson(obj.taxpayer, 'taxpayer'),
    spouse: obj.spouse == null ? undefined : parsePerson(obj.spouse, 'spouse'),
    address: {
      street: requireString(address, 'street', 'address'),
      city: requireString(address, 'city', 'address'),
      state,
      zip,
    },
    email: requireString(obj, 'email', 'personal'),
  };
}

function parseDependent(input: unknown, index: number): Dependent {
  const label = `dependents[${index}]`;
  const obj = asObject(input);
  const relationship = requireString(obj, 'relationship', label);
  if (!RELATIONSHIPS.includes(relationship as Dependent['relationship'])) {
    throw new ValidationError(`${label}.relationship must be one of: ${RELATIONSHIPS.join(', ')}`);
  }
  return {
    firstName: requireString(obj, 'firstName', label),
    lastName: requireString(obj, 'lastName', label),
    ssn: parseSsn(obj, label),
    birthYear: parseBirthYear(obj, label),
    relationship: relationship as Dependent['relationship'],
  };
}

function parseIncome(input: unknown): IncomeSection {
  const obj = asObject(input);
  const list = (field: string): unknown[] => {
    const value = obj[field] ?? [];
    if (!Array.isArray(value)) throw new ValidationError(`income.${field} must be an array`);
    return value;
  };
  return {
    w2s: list('w2s').map((raw, i) => {
      const o = asObject(raw);
      const label = `income.w2s[${i}]`;
      return {
        employer: requireString(o, 'employer', label),
        wages: money(o, 'wages', label),
        federalWithholding: money(o, 'federalWithholding', label),
      };
    }),
    int1099s: list('int1099s').map((raw, i) => {
      const o = asObject(raw);
      const label = `income.int1099s[${i}]`;
      return {
        payer: requireString(o, 'payer', label),
        interestIncome: money(o, 'interestIncome', label),
        federalWithholding: money(o, 'federalWithholding', label),
      };
    }),
    div1099s: list('div1099s').map((raw, i) => {
      const o = asObject(raw);
      const label = `income.div1099s[${i}]`;
      const ordinaryDividends = money(o, 'ordinaryDividends', label);
      const qualifiedDividends = money(o, 'qualifiedDividends', label);
      if (qualifiedDividends > ordinaryDividends) {
        throw new ValidationError(`${label}: qualified dividends cannot exceed ordinary dividends`);
      }
      return {
        payer: requireString(o, 'payer', label),
        ordinaryDividends,
        qualifiedDividends,
        capitalGainDistributions: money(o, 'capitalGainDistributions', label),
        federalWithholding: money(o, 'federalWithholding', label),
      };
    }),
    nec1099s: list('nec1099s').map((raw, i) => {
      const o = asObject(raw);
      const label = `income.nec1099s[${i}]`;
      return {
        payer: requireString(o, 'payer', label),
        compensation: money(o, 'compensation', label),
      };
    }),
    businessExpenses: money(obj, 'businessExpenses', 'income'),
    capitalGainShortTerm: money(obj, 'capitalGainShortTerm', 'income', true),
    capitalGainLongTerm: money(obj, 'capitalGainLongTerm', 'income', true),
    unemploymentCompensation: money(obj, 'unemploymentCompensation', 'income'),
    otherIncome: money(obj, 'otherIncome', 'income'),
    estimatedTaxPayments: money(obj, 'estimatedTaxPayments', 'income'),
  };
}

function parseDeductions(input: unknown): DeductionsSection {
  const obj = asObject(input);
  const method = (obj.method ?? 'auto') as DeductionsSection['method'];
  if (!['auto', 'standard', 'itemized'].includes(method)) {
    throw new ValidationError("deductions.method must be 'auto', 'standard', or 'itemized'");
  }
  const itemized = asObject(obj.itemized ?? {});
  const adjustments = asObject(obj.adjustments ?? {});
  return {
    method,
    itemized: {
      medicalExpenses: money(itemized, 'medicalExpenses', 'itemized'),
      stateLocalTaxes: money(itemized, 'stateLocalTaxes', 'itemized'),
      mortgageInterest: money(itemized, 'mortgageInterest', 'itemized'),
      charitableContributions: money(itemized, 'charitableContributions', 'itemized'),
    },
    adjustments: {
      studentLoanInterest: money(adjustments, 'studentLoanInterest', 'adjustments'),
      traditionalIraContributions: money(adjustments, 'traditionalIraContributions', 'adjustments'),
      hsaContributions: money(adjustments, 'hsaContributions', 'adjustments'),
      educatorExpenses: money(adjustments, 'educatorExpenses', 'adjustments'),
    },
  };
}
