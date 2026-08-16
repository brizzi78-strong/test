/**
 * Storage abstraction: tax returns plus user accounts.
 * In-memory implementation here; a durable SQLite one in sqliteStore.ts.
 */

import type { TaxReturn, User } from '../domain/types.ts';

export interface Store {
  get(id: string): TaxReturn | undefined;
  put(ret: TaxReturn): void;
  list(predicate?: (ret: TaxReturn) => boolean): TaxReturn[];
  delete(id: string): void;

  getUser(id: string): User | undefined;
  getUserByEmail(email: string): User | undefined;
  putUser(user: User): void;
}

export function createInMemoryStore(): Store {
  const returns = new Map<string, TaxReturn>();
  const users = new Map<string, User>();
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
    getUser: (id) => {
      const found = users.get(id);
      return found ? structuredClone(found) : undefined;
    },
    getUserByEmail: (email) => {
      const lower = email.toLowerCase();
      for (const user of users.values()) {
        if (user.email.toLowerCase() === lower) return structuredClone(user);
      }
      return undefined;
    },
    putUser: (user) => {
      users.set(user.id, structuredClone(user));
    },
  };
}
