/**
 * Durable Store backed by Node's built-in `node:sqlite` (no external
 * dependency). Each document is one row holding its JSON serialization,
 * keyed by (collection, id).
 */

import { DatabaseSync } from 'node:sqlite';
import type { Collection, Doc, Store } from './store.ts';

export interface SqliteStore extends Store {
  close(): void;
}

export function createSqliteStore(path: string): SqliteStore {
  const db = new DatabaseSync(path);
  db.exec(
    'CREATE TABLE IF NOT EXISTS docs (collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (collection, id))',
  );
  const getStmt = db.prepare('SELECT data FROM docs WHERE collection = ? AND id = ?');
  const putStmt = db.prepare(
    'INSERT INTO docs (collection, id, data) VALUES (?, ?, ?) ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data',
  );
  const listStmt = db.prepare('SELECT data FROM docs WHERE collection = ?');
  const delStmt = db.prepare('DELETE FROM docs WHERE collection = ? AND id = ?');

  return {
    get: (collection: Collection, id: string) => {
      const row = getStmt.get(collection, id) as { data: string } | undefined;
      return row ? (JSON.parse(row.data) as Doc) : undefined;
    },
    put: (collection, doc) => {
      putStmt.run(collection, doc.id, JSON.stringify(doc));
    },
    list: (collection, predicate) => {
      const rows = listStmt.all(collection) as Array<{ data: string }>;
      const all = rows.map((r) => JSON.parse(r.data) as Doc);
      return predicate ? all.filter(predicate) : all;
    },
    delete: (collection, id) => {
      delStmt.run(collection, id);
    },
    close: () => db.close(),
  };
}
