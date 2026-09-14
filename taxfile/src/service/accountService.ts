/**
 * AccountService: registration, login, sessions, and plan entitlements.
 *
 * Passwords are hashed with scrypt (node:crypto) and never stored or logged
 * in plaintext. Session tokens are random 256-bit values held in memory —
 * a restart signs everyone out, which is an acceptable trade for a system
 * with no external session store. Durable state (the users themselves) lives
 * in the Store.
 */

import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Plan, User } from '../domain/types.ts';
import { ConflictError, DomainError, ValidationError } from './errors.ts';
import type { Store } from '../store/store.ts';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const SCRYPT_KEYLEN = 64;

export class AuthenticationError extends DomainError {
  override readonly status = 401;
}

/** What the API returns about a user — never the hash or salt. */
export interface PublicUser {
  id: string;
  email: string;
  plan: Plan;
  createdAt: string;
}

export interface SessionResult {
  token: string;
  user: PublicUser;
}

function toPublic(user: User): PublicUser {
  return { id: user.id, email: user.email, plan: user.plan, createdAt: user.createdAt };
}

function hashPassword(password: string, saltHex: string): string {
  return scryptSync(password, Buffer.from(saltHex, 'hex'), SCRYPT_KEYLEN).toString('hex');
}

export class AccountService {
  private readonly store: Store;
  private readonly now: () => Date;
  private readonly sessions = new Map<string, string>(); // token -> userId

  constructor(opts: { store: Store; now?: () => Date }) {
    this.store = opts.store;
    this.now = opts.now ?? (() => new Date());
  }

  register(input: unknown): SessionResult {
    const { email, password } = parseCredentials(input);
    if (this.store.getUserByEmail(email)) {
      throw new ConflictError('an account with this email already exists');
    }
    const salt = randomBytes(16).toString('hex');
    const user: User = {
      id: randomUUID(),
      email,
      passwordHash: hashPassword(password, salt),
      salt,
      plan: 'free',
      createdAt: this.now().toISOString(),
    };
    this.store.putUser(user);
    return this.openSession(user);
  }

  login(input: unknown): SessionResult {
    const { email, password } = parseCredentials(input);
    const user = this.store.getUserByEmail(email);
    // Hash against a constant salt when the user is unknown so the timing of
    // a miss matches a wrong-password attempt.
    const salt = user?.salt ?? '00'.repeat(16);
    const attempted = Buffer.from(hashPassword(password, salt), 'hex');
    const actual = Buffer.from(user?.passwordHash ?? '00'.repeat(SCRYPT_KEYLEN), 'hex');
    if (!user || !timingSafeEqual(attempted, actual)) {
      throw new AuthenticationError('invalid email or password');
    }
    return this.openSession(user);
  }

  logout(token: string): void {
    this.sessions.delete(token);
  }

  /** Resolve a Bearer token to a user id, or undefined if invalid/expired. */
  resolveSession(token: string | undefined): string | undefined {
    return token ? this.sessions.get(token) : undefined;
  }

  getUser(userId: string): PublicUser | undefined {
    const user = this.store.getUser(userId);
    return user ? toPublic(user) : undefined;
  }

  /**
   * Plan for an owner id. Header-identified (sessionless) users are 'free';
   * this is also where a dev-mode upgrade for them is recorded as a user row.
   */
  planFor(ownerId: string): Plan {
    return this.store.getUser(ownerId)?.plan ?? 'free';
  }

  setPlan(ownerId: string, plan: Plan): PublicUser {
    let user = this.store.getUser(ownerId);
    if (!user) {
      // Header-identified owner with no account row yet: create a shell so the
      // plan sticks. Real accounts always exist by the time they upgrade.
      user = {
        id: ownerId,
        email: `${ownerId}@local`,
        passwordHash: '',
        salt: '',
        plan,
        createdAt: this.now().toISOString(),
      };
    }
    user.plan = plan;
    this.store.putUser(user);
    return toPublic(user);
  }

  setStripeCustomer(ownerId: string, customerId: string): void {
    const user = this.store.getUser(ownerId);
    if (!user) return;
    user.stripeCustomerId = customerId;
    this.store.putUser(user);
  }

  private openSession(user: User): SessionResult {
    const token = randomBytes(32).toString('hex');
    this.sessions.set(token, user.id);
    return { token, user: toPublic(user) };
  }
}

function parseCredentials(input: unknown): { email: string; password: string } {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('request body must be a JSON object');
  }
  const obj = input as Record<string, unknown>;
  const email = typeof obj.email === 'string' ? obj.email.trim().toLowerCase() : '';
  const password = typeof obj.password === 'string' ? obj.password : '';
  if (!EMAIL_PATTERN.test(email)) throw new ValidationError('a valid email is required');
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(`password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  return { email, password };
}
