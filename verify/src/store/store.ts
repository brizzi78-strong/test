/**
 * Persistence abstraction — the service depends on this interface, not a
 * concrete database, so the in-memory store (tests/demos) swaps for SQLite
 * without touching business logic.
 */

import type { Candidate, Company, VerificationRequest } from '../domain/types.ts';

export interface Store {
  companies: Collection<Company>;
  candidates: Collection<Candidate>;
  requests: Collection<VerificationRequest>;
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
    candidates: new InMemoryCollection<Candidate>(),
    requests: new InMemoryCollection<VerificationRequest>(),
  };
}
