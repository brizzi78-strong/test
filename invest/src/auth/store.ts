/**
 * Users, sessions, and password hashing for the Invest app — all with
 * Node built-ins, no external dependencies.
 *
 * A User maps a login (email + scrypt-hashed password) to the Trading
 * account that holds their money; a Session is an opaque random token,
 * delivered as an HttpOnly cookie, that expires server-side. The store is
 * SQLite when `INVEST_DB` is set (durable across restarts) and in-memory
 * otherwise — the same selection pattern as the other services.
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

export interface User {
  id: string;
  name: string;
  /** Stored lowercased; unique. */
  email: string;
  /** `saltHex:hashHex` (scrypt). */
  passwordHash: string;
  /** The Trading account that belongs to this user. */
  accountId: string;
  createdAt: string;
}

export interface Session {
  token: string;
  userId: string;
  expiresAt: string;
}

export interface AuthStore {
  getUser(id: string): User | undefined;
  getUserByEmail(email: string): User | undefined;
  putUser(user: User): void;
  getSession(token: string): Session | undefined;
  putSession(session: Session): void;
  deleteSession(token: string): void;
}

// --- password hashing ---------------------------------------------------

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const sep = stored.indexOf(':');
  if (sep < 0) return false;
  const salt = Buffer.from(stored.slice(0, sep), 'hex');
  const expected = Buffer.from(stored.slice(sep + 1), 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function newSessionToken(): string {
  return randomBytes(32).toString('hex');
}

// --- in-memory store ------------------------------------------------------

export function createInMemoryAuthStore(): AuthStore {
  const users = new Map<string, User>();
  const sessions = new Map<string, Session>();
  return {
    getUser: (id) => users.get(id),
    getUserByEmail: (email) => [...users.values()].find((u) => u.email === email),
    putUser: (user) => void users.set(user.id, user),
    getSession: (token) => liveSession(sessions.get(token), (t) => sessions.delete(t)),
    putSession: (session) => void sessions.set(session.token, session),
    deleteSession: (token) => void sessions.delete(token),
  };
}

// --- SQLite store -----------------------------------------------------------

export interface SqliteAuthStore extends AuthStore {
  close(): void;
}

export function createSqliteAuthStore(path: string): SqliteAuthStore {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, data TEXT NOT NULL)');
  db.exec('CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, data TEXT NOT NULL)');

  const getUserStmt = db.prepare('SELECT data FROM users WHERE id = ?');
  const getUserByEmailStmt = db.prepare('SELECT data FROM users WHERE email = ?');
  const putUserStmt = db.prepare(
    `INSERT INTO users (id, email, data) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET email = excluded.email, data = excluded.data`,
  );
  const getSessionStmt = db.prepare('SELECT data FROM sessions WHERE token = ?');
  const putSessionStmt = db.prepare(
    `INSERT INTO sessions (token, data) VALUES (?, ?)
     ON CONFLICT(token) DO UPDATE SET data = excluded.data`,
  );
  const deleteSessionStmt = db.prepare('DELETE FROM sessions WHERE token = ?');

  const parse = <T>(row: unknown): T | undefined =>
    row ? (JSON.parse((row as { data: string }).data) as T) : undefined;

  return {
    getUser: (id) => parse<User>(getUserStmt.get(id)),
    getUserByEmail: (email) => parse<User>(getUserByEmailStmt.get(email)),
    putUser: (user) => void putUserStmt.run(user.id, user.email, JSON.stringify(user)),
    getSession: (token) => liveSession(parse<Session>(getSessionStmt.get(token)), (t) => deleteSessionStmt.run(t)),
    putSession: (session) => void putSessionStmt.run(session.token, JSON.stringify(session)),
    deleteSession: (token) => void deleteSessionStmt.run(token),
    close: () => db.close(),
  };
}

/** `INVEST_DB=/path/to/data.db` → durable SQLite; unset → in-memory. */
export function authStoreFromEnv(env: NodeJS.ProcessEnv = process.env): AuthStore {
  return env.INVEST_DB ? createSqliteAuthStore(env.INVEST_DB) : createInMemoryAuthStore();
}

/** Treat an expired session as absent (and lazily delete it). */
function liveSession(session: Session | undefined, evict: (token: string) => void): Session | undefined {
  if (!session) return undefined;
  if (session.expiresAt <= new Date().toISOString()) {
    evict(session.token);
    return undefined;
  }
  return session;
}
