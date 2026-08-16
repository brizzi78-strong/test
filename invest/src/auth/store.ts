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
  /** Set once the user clicks a verification (or reset) link from their inbox. */
  emailVerifiedAt?: string;
  createdAt: string;
}

/** A single-use, expiring token mailed to the user for verify/reset flows. */
export interface EmailToken {
  token: string;
  userId: string;
  purpose: 'verify' | 'reset';
  expiresAt: string;
}

export interface Session {
  token: string;
  userId: string;
  expiresAt: string;
}

/**
 * One line of the append-only audit trail: who did what, from where, when.
 * Auth events (signup, login, failures, logout) and money-moving actions
 * (orders placed/cancelled) are recorded; the trail is never exposed over
 * HTTP — read it straight from the store/database.
 */
export interface AuditEvent {
  at: string;
  action: string;
  ip: string;
  userId?: string;
  email?: string;
  detail?: string;
}

export interface AuthStore {
  getUser(id: string): User | undefined;
  getUserByEmail(email: string): User | undefined;
  putUser(user: User): void;
  getSession(token: string): Session | undefined;
  putSession(session: Session): void;
  deleteSession(token: string): void;
  /** Log the user out everywhere (used after a password reset). */
  deleteSessionsForUser(userId: string): void;
  putEmailToken(token: EmailToken): void;
  /** Return the token if it exists and hasn't expired, deleting it either way is the caller's job. */
  getEmailToken(token: string): EmailToken | undefined;
  deleteEmailToken(token: string): void;
  appendAudit(event: AuditEvent): void;
  /** Most recent events first, capped at `limit` (default 100). */
  listAudit(limit?: number): AuditEvent[];
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
  const emailTokens = new Map<string, EmailToken>();
  const audit: AuditEvent[] = [];
  return {
    getUser: (id) => users.get(id),
    getUserByEmail: (email) => [...users.values()].find((u) => u.email === email),
    putUser: (user) => void users.set(user.id, user),
    getSession: (token) => liveSession(sessions.get(token), (t) => sessions.delete(t)),
    putSession: (session) => void sessions.set(session.token, session),
    deleteSession: (token) => void sessions.delete(token),
    deleteSessionsForUser: (userId) => {
      for (const [token, session] of sessions) if (session.userId === userId) sessions.delete(token);
    },
    putEmailToken: (token) => void emailTokens.set(token.token, token),
    getEmailToken: (token) => liveToken(emailTokens.get(token)),
    deleteEmailToken: (token) => void emailTokens.delete(token),
    appendAudit: (event) => void audit.push(event),
    listAudit: (limit = 100) => audit.slice(-limit).reverse(),
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
  db.exec('CREATE TABLE IF NOT EXISTS audit (seq INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT NOT NULL)');
  db.exec('CREATE TABLE IF NOT EXISTS email_tokens (token TEXT PRIMARY KEY, data TEXT NOT NULL)');

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
  const appendAuditStmt = db.prepare('INSERT INTO audit (data) VALUES (?)');
  const listAuditStmt = db.prepare('SELECT data FROM audit ORDER BY seq DESC LIMIT ?');
  const listSessionsStmt = db.prepare('SELECT token, data FROM sessions');
  const putEmailTokenStmt = db.prepare(
    `INSERT INTO email_tokens (token, data) VALUES (?, ?)
     ON CONFLICT(token) DO UPDATE SET data = excluded.data`,
  );
  const getEmailTokenStmt = db.prepare('SELECT data FROM email_tokens WHERE token = ?');
  const deleteEmailTokenStmt = db.prepare('DELETE FROM email_tokens WHERE token = ?');

  const parse = <T>(row: unknown): T | undefined =>
    row ? (JSON.parse((row as { data: string }).data) as T) : undefined;

  return {
    getUser: (id) => parse<User>(getUserStmt.get(id)),
    getUserByEmail: (email) => parse<User>(getUserByEmailStmt.get(email)),
    putUser: (user) => void putUserStmt.run(user.id, user.email, JSON.stringify(user)),
    getSession: (token) => liveSession(parse<Session>(getSessionStmt.get(token)), (t) => deleteSessionStmt.run(t)),
    putSession: (session) => void putSessionStmt.run(session.token, JSON.stringify(session)),
    deleteSession: (token) => void deleteSessionStmt.run(token),
    deleteSessionsForUser: (userId) => {
      for (const row of listSessionsStmt.all() as Array<{ token: string; data: string }>) {
        if ((JSON.parse(row.data) as Session).userId === userId) deleteSessionStmt.run(row.token);
      }
    },
    putEmailToken: (token) => void putEmailTokenStmt.run(token.token, JSON.stringify(token)),
    getEmailToken: (token) => liveToken(parse<EmailToken>(getEmailTokenStmt.get(token))),
    deleteEmailToken: (token) => void deleteEmailTokenStmt.run(token),
    appendAudit: (event) => void appendAuditStmt.run(JSON.stringify(event)),
    listAudit: (limit = 100) =>
      (listAuditStmt.all(limit) as Array<{ data: string }>).map((r) => JSON.parse(r.data) as AuditEvent),
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

/** Treat an expired email token as absent. */
function liveToken(token: EmailToken | undefined): EmailToken | undefined {
  if (!token) return undefined;
  return token.expiresAt <= new Date().toISOString() ? undefined : token;
}
