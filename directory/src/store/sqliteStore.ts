/**
 * Durable SQLite-backed Store, using Node's built-in `node:sqlite` (no external
 * dependency). It implements the exact same Store/Collection interface as the
 * in-memory store, so the service is unchanged — this is the swap the Store
 * abstraction was built for, and the first real step from prototype toward
 * production: data now survives a restart.
 *
 * Each collection is a table of `(id TEXT PRIMARY KEY, data TEXT)` where `data`
 * is the JSON-serialized entity. Predicate filtering happens in JS to keep the
 * Collection contract identical to the in-memory version; a production build
 * would push hot filters down into SQL, still behind this same interface.
 */

import { DatabaseSync } from 'node:sqlite';
import type { Company, Department, Employee } from '../domain/types.ts';
import type { Collection, Store } from './store.ts';

const TABLES = ['companies', 'departments', 'employees'] as const;

class SqliteCollection<T extends { id: string }> implements Collection<T> {
  private readonly getStmt;
  private readonly putStmt;
  private readonly allStmt;

  constructor(db: DatabaseSync, table: string) {
    this.getStmt = db.prepare(`SELECT data FROM ${table} WHERE id = ?`);
    this.putStmt = db.prepare(
      `INSERT INTO ${table} (id, data) VALUES (?, ?)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data`,
    );
    this.allStmt = db.prepare(`SELECT data FROM ${table}`);
  }

  get(id: string): T | undefined {
    const row = this.getStmt.get(id) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as T) : undefined;
  }

  put(entity: T): void {
    this.putStmt.run(entity.id, JSON.stringify(entity));
  }

  list(predicate?: (entity: T) => boolean): T[] {
    const rows = this.allStmt.all() as Array<{ data: string }>;
    const all = rows.map((r) => JSON.parse(r.data) as T);
    return predicate ? all.filter(predicate) : all;
  }
}

export interface SqliteStore extends Store {
  /** Close the underlying database handle. */
  close(): void;
}

/**
 * Open (creating if needed) a SQLite database at `path` and return a Store
 * backed by it. Use ':memory:' for an ephemeral database.
 */
export function createSqliteStore(path: string): SqliteStore {
  const db = new DatabaseSync(path);
  // WAL improves durability and read/write concurrency for a server.
  db.exec('PRAGMA journal_mode = WAL');
  for (const table of TABLES) {
    db.exec(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
  }
  return {
    companies: new SqliteCollection<Company>(db, 'companies'),
    departments: new SqliteCollection<Department>(db, 'departments'),
    employees: new SqliteCollection<Employee>(db, 'employees'),
    close: () => db.close(),
  };
}
