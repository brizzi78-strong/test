/**
 * Persistence abstraction — the service depends on this interface, not on a
 * concrete database, so the in-memory store used in tests can be swapped for
 * SQLite without touching business logic.
 */

import type { TimeEntry } from '../domain/types.ts';

export interface Store {
  entries: Collection<TimeEntry>;
}

export interface Collection<T> {
  get(id: string): T | undefined;
  put(entity: T): void;
  remove(id: string): void;
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

  remove(id: string): void {
    this.items.delete(id);
  }

  list(predicate?: (entity: T) => boolean): T[] {
    const all = [...this.items.values()];
    return predicate ? all.filter(predicate) : all;
  }
}

export function createInMemoryStore(): Store {
  return { entries: new InMemoryCollection<TimeEntry>() };
}
