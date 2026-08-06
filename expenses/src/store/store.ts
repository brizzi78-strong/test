/**
 * Storage abstraction: a single collection of ExpenseReport documents.
 * In-memory implementation here; a durable SQLite one in sqliteStore.ts.
 */

import type { ExpenseReport } from '../domain/types.ts';

export interface Store {
  get(id: string): ExpenseReport | undefined;
  put(report: ExpenseReport): void;
  list(predicate?: (report: ExpenseReport) => boolean): ExpenseReport[];
  delete(id: string): void;
}

export function createInMemoryStore(): Store {
  const reports = new Map<string, ExpenseReport>();
  return {
    get: (id) => {
      const found = reports.get(id);
      return found ? structuredClone(found) : undefined;
    },
    put: (report) => {
      reports.set(report.id, structuredClone(report));
    },
    list: (predicate) => {
      const all = [...reports.values()].map((r) => structuredClone(r));
      return predicate ? all.filter(predicate) : all;
    },
    delete: (id) => {
      reports.delete(id);
    },
  };
}
