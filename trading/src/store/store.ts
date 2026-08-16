/**
 * Persistence abstraction. The service depends on this interface, not on any
 * concrete database, so the in-memory implementation used for tests/demos can
 * be swapped for a real store without touching business logic.
 */

import type { Account, Order, RecurringPlan, WatchlistEntry } from '../domain/types.ts';

export interface Store {
  accounts: Collection<Account>;
  orders: Collection<Order>;
  watchlist: Collection<WatchlistEntry>;
  plans: Collection<RecurringPlan>;
}

export interface Collection<T> {
  get(id: string): T | undefined;
  put(entity: T): void;
  list(predicate?: (entity: T) => boolean): T[];
  delete(id: string): void;
}

class InMemoryCollection<T extends { id: string }> implements Collection<T> {
  private readonly items = new Map<string, T>();

  get(id: string): T | undefined {
    return this.items.get(id);
  }

  put(entity: T): void {
    this.items.set(entity.id, entity);
  }

  list(predicate?: (entity: T) => boolean): T[] {
    const all = [...this.items.values()];
    return predicate ? all.filter(predicate) : all;
  }

  delete(id: string): void {
    this.items.delete(id);
  }
}

export function createInMemoryStore(): Store {
  return {
    accounts: new InMemoryCollection<Account>(),
    orders: new InMemoryCollection<Order>(),
    watchlist: new InMemoryCollection<WatchlistEntry>(),
    plans: new InMemoryCollection<RecurringPlan>(),
  };
}
