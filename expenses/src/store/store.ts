/**
 * Storage abstraction: ExpenseReport documents, the corporate card feed, and
 * monthly category budgets.
 * In-memory implementation here; a durable SQLite one in sqliteStore.ts.
 */

import type { Budget, CardTransaction, ExpenseReport } from '../domain/types.ts';

export interface Store {
  get(id: string): ExpenseReport | undefined;
  put(report: ExpenseReport): void;
  list(predicate?: (report: ExpenseReport) => boolean): ExpenseReport[];
  delete(id: string): void;

  getTransaction(id: string): CardTransaction | undefined;
  putTransaction(txn: CardTransaction): void;
  listTransactions(predicate?: (txn: CardTransaction) => boolean): CardTransaction[];

  getBudget(id: string): Budget | undefined;
  putBudget(budget: Budget): void;
  listBudgets(predicate?: (budget: Budget) => boolean): Budget[];
  deleteBudget(id: string): void;
}

export function createInMemoryStore(): Store {
  const reports = new Map<string, ExpenseReport>();
  const transactions = new Map<string, CardTransaction>();
  const budgets = new Map<string, Budget>();
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

    getBudget: (id) => {
      const found = budgets.get(id);
      return found ? structuredClone(found) : undefined;
    },
    putBudget: (budget) => {
      budgets.set(budget.id, structuredClone(budget));
    },
    listBudgets: (predicate) => {
      const all = [...budgets.values()].map((b) => structuredClone(b));
      return predicate ? all.filter(predicate) : all;
    },
    deleteBudget: (id) => {
      budgets.delete(id);
    },
  };
}
