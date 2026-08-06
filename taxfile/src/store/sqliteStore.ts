/**
 * Durable Store backed by Node's built-in `node:sqlite` (no external
 * dependency). Each return is one row holding the JSON-serialized document.
 */

import { DatabaseSync } from 'node:sqlite';
import type { TaxReturn } from '../domain/types.ts';
import type { Store } from './store.ts';

export interface SqliteStore extends Store {
  close(): void;
}

export function createSqliteStore(path: string): SqliteStore {
  const db = new DatabaseSync(path);
  db.exec('CREATE TABLE IF NOT EXISTS returns (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
  const getStmt = db.prepare('SELECT data FROM returns WHERE id = ?');
  const putStmt = db.prepare(
    'INSERT INTO returns (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data',
  );
  const allStmt = db.prepare('SELECT data FROM returns');
  const delStmt = db.prepare('DELETE FROM returns WHERE id = ?');

  return {
    get: (id) => {
      const row = getStmt.get(id) as { data: string } | undefined;
      return row ? (JSON.parse(row.data) as TaxReturn) : undefined;
    },
    put: (ret) => {
      putStmt.run(ret.id, JSON.stringify(ret));
    },
    list: (predicate) => {
      const rows = allStmt.all() as Array<{ data: string }>;
      const all = rows.map((r) => JSON.parse(r.data) as TaxReturn);
      return predicate ? all.filter(predicate) : all;
    },
    delete: (id) => {
      delStmt.run(id);
    },
    close: () => db.close(),
  };
}
