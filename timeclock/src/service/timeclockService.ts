/**
 * TimeclockService — record hours worked and total them for a pay period.
 *
 * Deliberately small: the value is in the summary, which turns a list of dated
 * entries into "hours in [from, to]" — exactly what payroll needs to pay an
 * hourly worker for a period. Clock and id generator are injected for
 * deterministic tests. Hours are stored as integer minutes.
 */

import { randomUUID } from 'node:crypto';
import type { PeriodSummary, TimeEntry } from '../domain/types.ts';
import type { Store } from '../store/store.ts';
import { NotFoundError, ValidationError } from './errors.ts';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface ServiceOptions {
  store: Store;
  now?: () => Date;
  newId?: (prefix: string) => string;
}

export class TimeclockService {
  private readonly store: Store;
  private readonly now: () => Date;
  private readonly newId: (prefix: string) => string;

  constructor(opts: ServiceOptions) {
    this.store = opts.store;
    this.now = opts.now ?? (() => new Date());
    this.newId = opts.newId ?? ((prefix) => `${prefix}_${randomUUID().replace(/-/g, '')}`);
  }

  addEntry(input: { companyId: string; employeeId: string; date: string; hours: number; note?: string }): TimeEntry {
    const companyId = requireString(input.companyId, 'companyId');
    const employeeId = requireString(input.employeeId, 'employeeId');
    const date = requireString(input.date, 'date');
    if (!DATE_RE.test(date)) throw new ValidationError('date must be an ISO date (YYYY-MM-DD)');
    const minutes = hoursToMinutes(input.hours);
    const entry: TimeEntry = {
      id: this.newId('te'),
      companyId,
      employeeId,
      date,
      minutes,
      note: optionalString(input.note),
      createdAt: this.now().toISOString(),
    };
    this.store.entries.put(entry);
    return entry;
  }

  getEntry(id: string): TimeEntry {
    const entry = this.store.entries.get(id);
    if (!entry) throw new NotFoundError('TimeEntry', id);
    return entry;
  }

  deleteEntry(id: string): void {
    this.getEntry(id);
    this.store.entries.remove(id);
  }

  listEntries(filter: { employeeId?: string; companyId?: string; from?: string; to?: string } = {}): TimeEntry[] {
    return this.store.entries
      .list((e) => {
        if (filter.employeeId && e.employeeId !== filter.employeeId) return false;
        if (filter.companyId && e.companyId !== filter.companyId) return false;
        if (filter.from && e.date < filter.from) return false;
        if (filter.to && e.date > filter.to) return false;
        return true;
      })
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }

  /** Total hours for one employee over an inclusive [from, to] date range. */
  summary(employeeId: string, from: string, to: string): PeriodSummary {
    const id = requireString(employeeId, 'employeeId');
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
      throw new ValidationError('from and to must be ISO dates (YYYY-MM-DD)');
    }
    const entries = this.listEntries({ employeeId: id, from, to });
    const minutes = entries.reduce((t, e) => t + e.minutes, 0);
    return { employeeId: id, from, to, entries: entries.length, minutes, hours: minutesToHours(minutes) };
  }
}

function hoursToMinutes(hours: unknown): number {
  if (typeof hours !== 'number' || !Number.isFinite(hours) || hours <= 0) {
    throw new ValidationError('hours must be a positive number');
  }
  if (hours > 24) throw new ValidationError('hours cannot exceed 24 for a single entry');
  return Math.round(hours * 60);
}

function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new ValidationError(`${field} is required`);
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new ValidationError('expected a string');
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}
