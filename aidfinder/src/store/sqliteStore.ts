/**
 * Durable Store backed by Node's built-in `node:sqlite` (no external
 * dependency). One row per profile (keyed by owner) and per application,
 * each holding the JSON-serialized document — same pattern as TaxFile.
 */

import { DatabaseSync } from 'node:sqlite';
import type { Application, StudentProfile } from '../domain/types.ts';
import type { Store } from './store.ts';

export interface SqliteStore extends Store {
  close(): void;
}

export function createSqliteStore(path: string): SqliteStore {
  const db = new DatabaseSync(path);
  db.exec('CREATE TABLE IF NOT EXISTS profiles (owner_id TEXT PRIMARY KEY, data TEXT NOT NULL)');
  db.exec(
    'CREATE TABLE IF NOT EXISTS applications (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, data TEXT NOT NULL)',
  );
  db.exec('CREATE INDEX IF NOT EXISTS applications_owner ON applications (owner_id)');

  const getProfileStmt = db.prepare('SELECT data FROM profiles WHERE owner_id = ?');
  const putProfileStmt = db.prepare(
    'INSERT INTO profiles (owner_id, data) VALUES (?, ?) ON CONFLICT(owner_id) DO UPDATE SET data = excluded.data',
  );
  const getAppStmt = db.prepare('SELECT data FROM applications WHERE id = ?');
  const putAppStmt = db.prepare(
    'INSERT INTO applications (id, owner_id, data) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET owner_id = excluded.owner_id, data = excluded.data',
  );
  const listAppsStmt = db.prepare('SELECT data FROM applications WHERE owner_id = ?');
  const delAppStmt = db.prepare('DELETE FROM applications WHERE id = ?');

  return {
    getProfile: (ownerId) => {
      const row = getProfileStmt.get(ownerId) as { data: string } | undefined;
      return row ? (JSON.parse(row.data) as StudentProfile) : undefined;
    },
    putProfile: (profile) => {
      putProfileStmt.run(profile.ownerId, JSON.stringify(profile));
    },
    getApplication: (id) => {
      const row = getAppStmt.get(id) as { data: string } | undefined;
      return row ? (JSON.parse(row.data) as Application) : undefined;
    },
    putApplication: (app) => {
      putAppStmt.run(app.id, app.ownerId, JSON.stringify(app));
    },
    listApplications: (ownerId) => {
      const rows = listAppsStmt.all(ownerId) as Array<{ data: string }>;
      return rows.map((r) => JSON.parse(r.data) as Application);
    },
    deleteApplication: (id) => {
      delAppStmt.run(id);
    },
    close: () => db.close(),
  };
}
