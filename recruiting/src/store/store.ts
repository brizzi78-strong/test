/**
 * Persistence abstraction. The service depends on this interface, not on any
 * concrete database, so the in-memory implementation used for tests/demos can
 * be swapped for a real store without touching business logic.
 */

import type { Application, Company, JobRequisition } from '../domain/types.ts';

export interface Store {
  companies: Collection<Company>;
  requisitions: Collection<JobRequisition>;
  applications: Collection<Application>;
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
    requisitions: new InMemoryCollection<JobRequisition>(),
    applications: new InMemoryCollection<Application>(),
  };
}
