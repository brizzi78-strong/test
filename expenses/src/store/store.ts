/**
 * Storage abstraction: ExpenseReport documents plus the corporate card feed.
 * In-memory implementation here; a durable SQLite one in sqliteStore.ts.
 */

import type { CardTransaction, ExpenseReport } from '../domain/types.ts';

export interface Store {
  get(id: string): ExpenseReport | undefined;
  put(report: ExpenseReport): void;
  list(predicate?: (report: ExpenseReport) => boolean): ExpenseReport[];
  delete(id: string): void;

  getTransaction(id: string): CardTransaction | undefined;
  putTransaction(txn: CardTransaction): void;
  listTransactions(predicate?: (txn: CardTransaction) => boolean): CardTransaction[];
}

export function createInMemoryStore(): Store {
  const reports = new Map<string, ExpenseReport>();
  const transactions = new Map<string, CardTransaction>();
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

    getTransaction: (id) => {
      const found = transactions.get(id);
      return found ? structuredClone(found) : undefined;
    },
    putTransaction: (txn) => {
      transactions.set(txn.id, structuredClone(txn));
    },
    listTransactions: (predicate) => {
      const all = [...transactions.values()].map((t) => structuredClone(t));
      return predicate ? all.filter(predicate) : all;
    },
  };
}
