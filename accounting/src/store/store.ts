/**
 * Persistence abstraction. The service depends on this interface, not on any
 * concrete database, so the in-memory implementation used for tests/demos can
 * be swapped for a real store without touching business logic.
 */

import type { Account, Company, Customer, Expense, Invoice } from '../domain/types.ts';

export interface Store {
  companies: Collection<Company>;
  accounts: Collection<Account>;
  customers: Collection<Customer>;
  invoices: Collection<Invoice>;
  expenses: Collection<Expense>;
}

export interface Collection<T> {
  get(id: string): T | undefined;
  put(entity: T): void;
  list(predicate?: (entity: T) => boolean): T[];
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
}

export function createInMemoryStore(): Store {
  return {
    companies: new InMemoryCollection<Company>(),
    accounts: new InMemoryCollection<Account>(),
    customers: new InMemoryCollection<Customer>(),
    invoices: new InMemoryCollection<Invoice>(),
    expenses: new InMemoryCollection<Expense>(),
  };
}
