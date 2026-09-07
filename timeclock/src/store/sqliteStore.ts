/**
 * Durable SQLite-backed Store using Node's built-in `node:sqlite` (no external
 * dependency), implementing the same Store/Collection interface as the
 * in-memory store.
 */

import { DatabaseSync } from 'node:sqlite';
import type { TimeEntry } from '../domain/types.ts';
import type { Collection, Store } from './store.ts';

class SqliteCollection<T extends { id: string }> implements Collection<T> {
  private readonly getStmt;
  private readonly putStmt;
  private readonly delStmt;
  private readonly allStmt;

  constructor(db: DatabaseSync, table: string) {
    this.getStmt = db.prepare(`SELECT data FROM ${table} WHERE id = ?`);
    this.putStmt = db.prepare(
      `INSERT INTO ${table} (id, data) VALUES (?, ?)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data`,
    );
    this.delStmt = db.prepare(`DELETE FROM ${table} WHERE id = ?`);
    this.allStmt = db.prepare(`SELECT data FROM ${table}`);
  }

  get(id: string): T | undefined {
    const row = this.getStmt.get(id) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as T) : undefined;
  }

  put(entity: T): void {
    this.putStmt.run(entity.id, JSON.stringify(entity));
  }

  remove(id: string): void {
    this.delStmt.run(id);
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
  db.exec('CREATE TABLE IF NOT EXISTS entries (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
  return {
    entries: new SqliteCollection<TimeEntry>(db, 'entries'),
    close: () => db.close(),
  };
}
