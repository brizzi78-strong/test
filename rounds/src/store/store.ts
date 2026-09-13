/**
 * Storage abstraction: named collections of JSON documents keyed by id.
 * In-memory implementation here; a durable SQLite one in sqliteStore.ts.
 */

export type Collection = 'units' | 'templates' | 'rounds' | 'issues' | 'recognitions';

/** Every stored document is id-keyed and owner-scoped. */
export interface Doc {
  id: string;
  ownerId: string;
}

export interface Store {
  get(collection: Collection, id: string): Doc | undefined;
  put(collection: Collection, doc: Doc): void;
  list(collection: Collection, predicate?: (doc: Doc) => boolean): Doc[];
  delete(collection: Collection, id: string): void;
}

export function createInMemoryStore(): Store {
  const collections = new Map<Collection, Map<string, Doc>>();
  const coll = (name: Collection): Map<string, Doc> => {
    let existing = collections.get(name);
    if (!existing) {
      existing = new Map();
      collections.set(name, existing);
    }
    return existing;
  };
  return {
    get: (collection, id) => {
      const found = coll(collection).get(id);
      return found ? structuredClone(found) : undefined;
    },
    put: (collection, doc) => {
      coll(collection).set(doc.id, structuredClone(doc));
    },
    list: (collection, predicate) => {
      const all = [...coll(collection).values()].map((d) => structuredClone(d));
      return predicate ? all.filter(predicate) : all;
    },
    delete: (collection, id) => {
      coll(collection).delete(id);
    },
  };
}
