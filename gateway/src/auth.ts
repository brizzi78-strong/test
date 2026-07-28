/**
 * API keys and their storage.
 *
 * An API key ties a caller to a tenant (a company). The gateway looks the key
 * up on every request and injects the resolved company id downstream, so the
 * services never see raw keys. Keys are stored durably (SQLite) so they survive
 * a restart, behind a small interface with an in-memory variant for tests.
 */

import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

export interface ApiKey {
  key: string;
  companyId: string;
  name: string;
  createdAt: string;
}

export interface KeyStore {
  get(key: string): ApiKey | undefined;
  put(entry: ApiKey): void;
  list(): ApiKey[];
}

/** Generate an opaque, URL-safe API key. */
export function generateApiKey(): string {
  return `chr_${randomBytes(24).toString('base64url')}`;
}

/** Show only a prefix + suffix of a key (for admin listings). */
export function maskKey(key: string): string {
  if (key.length <= 12) return `${key.slice(0, 4)}…`;
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

export function createInMemoryKeyStore(): KeyStore {
  const m = new Map<string, ApiKey>();
  return {
    get: (k) => m.get(k),
    put: (entry) => {
      m.set(entry.key, entry);
    },
    list: () => [...m.values()],
  };
}

export interface SqliteKeyStore extends KeyStore {
  close(): void;
}

export function createSqliteKeyStore(path: string): SqliteKeyStore {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('CREATE TABLE IF NOT EXISTS apikeys (key TEXT PRIMARY KEY, data TEXT NOT NULL)');
  const getStmt = db.prepare('SELECT data FROM apikeys WHERE key = ?');
  const putStmt = db.prepare(
    'INSERT INTO apikeys (key, data) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET data = excluded.data',
  );
  const allStmt = db.prepare('SELECT data FROM apikeys');
  return {
    get: (k) => {
      const row = getStmt.get(k) as { data: string } | undefined;
      return row ? (JSON.parse(row.data) as ApiKey) : undefined;
    },
    put: (entry) => {
      putStmt.run(entry.key, JSON.stringify(entry));
    },
    list: () => (allStmt.all() as Array<{ data: string }>).map((r) => JSON.parse(r.data) as ApiKey),
    close: () => db.close(),
  };
}

/** Extract the presented key from a request's headers (Bearer or X-API-Key). */
export function readPresentedKey(headers: Record<string, string | string[] | undefined>): string | undefined {
  const auth = headers['authorization'];
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  const x = headers['x-api-key'];
  if (typeof x === 'string' && x.length > 0) return x;
  return undefined;
}
