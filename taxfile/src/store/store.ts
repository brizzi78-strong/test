/**
 * Storage abstraction: a single collection of TaxReturn documents.
 * In-memory implementation here; a durable SQLite one in sqliteStore.ts.
 */

import type { TaxReturn } from '../domain/types.ts';

export interface Store {
  get(id: string): TaxReturn | undefined;
  put(ret: TaxReturn): void;
  list(predicate?: (ret: TaxReturn) => boolean): TaxReturn[];
  delete(id: string): void;
}

export function createInMemoryStore(): Store {
  const returns = new Map<string, TaxReturn>();
  return {
    get: (id) => {
      const found = returns.get(id);
      return found ? structuredClone(found) : undefined;
    },
    put: (ret) => {
      returns.set(ret.id, structuredClone(ret));
    },
    list: (predicate) => {
      const all = [...returns.values()].map((r) => structuredClone(r));
      return predicate ? all.filter(predicate) : all;
    },
    delete: (id) => {
      returns.delete(id);
    },
  };
}
