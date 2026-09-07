/**
 * Durable SQLite-backed Store using Node's built-in `node:sqlite` (no external
 * dependency), implementing the same Store/Collection interface as the
 * in-memory store.
 */

import { DatabaseSync } from 'node:sqlite';
import type { Appointment, Company, Reference, Service, Worker } from '../domain/types.ts';
import type { Collection, Store } from './store.ts';

const TABLES = ['companies', 'services', 'workers', 'appointments', 'references'] as const;

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
  close(): void;
}

export function createSqliteStore(path: string): SqliteStore {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL');
  for (const table of TABLES) {
    db.exec(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
  }
  return {
    companies: new SqliteCollection<Company>(db, 'companies'),
    services: new SqliteCollection<Service>(db, 'services'),
    workers: new SqliteCollection<Worker>(db, 'workers'),
    appointments: new SqliteCollection<Appointment>(db, 'appointments'),
    references: new SqliteCollection<Reference>(db, 'references'),
    close: () => db.close(),
  };
}
