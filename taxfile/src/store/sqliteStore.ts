/**
 * Durable Store backed by Node's built-in `node:sqlite` (no external
 * dependency). Returns and users are each one row holding the
 * JSON-serialized document.
 */

import { DatabaseSync } from 'node:sqlite';
import type { TaxReturn, User } from '../domain/types.ts';
import type { Store } from './store.ts';

export interface SqliteStore extends Store {
  close(): void;
}

export function createSqliteStore(path: string): SqliteStore {
  const db = new DatabaseSync(path);
  db.exec('CREATE TABLE IF NOT EXISTS returns (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
  db.exec(
    'CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, data TEXT NOT NULL)',
  );
  const getStmt = db.prepare('SELECT data FROM returns WHERE id = ?');
  const putStmt = db.prepare(
    'INSERT INTO returns (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data',
  );
  const allStmt = db.prepare('SELECT data FROM returns');
  const delStmt = db.prepare('DELETE FROM returns WHERE id = ?');
  const getUserStmt = db.prepare('SELECT data FROM users WHERE id = ?');
  const getUserByEmailStmt = db.prepare('SELECT data FROM users WHERE email = ? COLLATE NOCASE');
  const putUserStmt = db.prepare(
    'INSERT INTO users (id, email, data) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET email = excluded.email, data = excluded.data',
  );

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
    getUser: (id) => {
      const row = getUserStmt.get(id) as { data: string } | undefined;
      return row ? (JSON.parse(row.data) as User) : undefined;
    },
    getUserByEmail: (email) => {
      const row = getUserByEmailStmt.get(email) as { data: string } | undefined;
      return row ? (JSON.parse(row.data) as User) : undefined;
    },
    putUser: (user) => {
      putUserStmt.run(user.id, user.email, JSON.stringify(user));
    },
    close: () => db.close(),
  };
}
