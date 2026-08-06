/**
 * HTTP server wiring: assemble an ExpenseService with a store and expose it
 * over HTTP alongside the single-page web app.
 */

import { createServer, type Server } from 'node:http';
import { DEFAULT_POLICY, type Policy } from '../domain/policy.ts';
import { CATEGORIES, type Category } from '../domain/types.ts';
import { ExpenseService } from '../service/expenseService.ts';
import { createInMemoryStore, type Store } from '../store/store.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';
import { createRequestListener, type ListenerOptions } from './router.ts';

export interface AppServer {
  server: Server;
  service: ExpenseService;
}

export interface AppOptions {
  /** Basic-auth gate; both must be set to enable it (EXPENSES_USER/EXPENSES_PASSWORD). */
  user?: string;
  password?: string;
  /** Site display name (BRAND_NAME), e.g. "Cardinal Expenses". */
  brandName?: string;
  /** Expense policy; defaults to EXPENSES_POLICY overrides merged into the 2025 defaults. */
  policy?: Policy;
}

/**
 * Build the active policy from `EXPENSES_POLICY`, a JSON object of overrides
 * merged shallowly into the defaults (categoryLimitCents merges per category):
 *
 *   EXPENSES_POLICY='{"autoApproveCeilingCents":50000,"categoryLimitCents":{"meals":10000}}'
 *
 * Invalid JSON or non-positive numbers are rejected loudly rather than
 * silently loosening or tightening the policy.
 */
export function policyFromEnv(env: NodeJS.ProcessEnv = process.env): Policy {
  const raw = env.EXPENSES_POLICY;
  if (!raw) return DEFAULT_POLICY;
  let overrides: Record<string, unknown>;
  try {
    overrides = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error('EXPENSES_POLICY must be valid JSON');
  }
  if (typeof overrides !== 'object' || overrides === null || Array.isArray(overrides)) {
    throw new Error('EXPENSES_POLICY must be a JSON object');
  }
  const knownFields = new Set<string>([
    'receiptRequiredCents',
    'categoryLimitCents',
    'mileageRateCentsPerMile',
    'autoApproveCeilingCents',
    'staleAfterDays',
  ]);
  for (const key of Object.keys(overrides)) {
    if (!knownFields.has(key)) {
      throw new Error(`EXPENSES_POLICY.${key} is not a policy field (known: ${[...knownFields].join(', ')})`);
    }
  }
  const numeric = (field: keyof Policy): number => {
    const value = overrides[field];
    if (value === undefined) return DEFAULT_POLICY[field] as number;
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      throw new Error(`EXPENSES_POLICY.${field} must be a positive number`);
    }
    return value;
  };
  const limits = { ...DEFAULT_POLICY.categoryLimitCents };
  if (overrides.categoryLimitCents !== undefined) {
    const given = overrides.categoryLimitCents;
    if (typeof given !== 'object' || given === null || Array.isArray(given)) {
      throw new Error('EXPENSES_POLICY.categoryLimitCents must be a JSON object');
    }
    for (const [category, cap] of Object.entries(given)) {
      if (!CATEGORIES.includes(category as Category)) {
        throw new Error(`EXPENSES_POLICY.categoryLimitCents.${category} is not a category (known: ${CATEGORIES.join(', ')})`);
      }
      if (typeof cap !== 'number' || !Number.isFinite(cap) || cap <= 0) {
        throw new Error(`EXPENSES_POLICY.categoryLimitCents.${category} must be a positive number`);
      }
      limits[category as keyof typeof limits] = cap;
    }
  }
  return {
    receiptRequiredCents: numeric('receiptRequiredCents'),
    categoryLimitCents: limits,
    mileageRateCentsPerMile: numeric('mileageRateCentsPerMile'),
    autoApproveCeilingCents: numeric('autoApproveCeilingCents'),
    staleAfterDays: numeric('staleAfterDays'),
  };
}

/**
 * Select a store from the environment: `EXPENSES_DB=/path/to/data.db` uses the
 * durable SQLite store; unset falls back to the in-memory store.
 */
export function storeFromEnv(env: NodeJS.ProcessEnv = process.env): Store {
  return env.EXPENSES_DB ? createSqliteStore(env.EXPENSES_DB) : createInMemoryStore();
}

const WEB_INDEX = new URL('../web/index.html', import.meta.url);

/**
 * Create (but do not start) an HTTP server. The store and options default to
 * the environment selection; pass them explicitly (e.g. in tests) to override.
 */
export function createApp(store: Store = storeFromEnv(), opts: AppOptions = {}): AppServer {
  const user = opts.user ?? process.env.EXPENSES_USER;
  const password = opts.password ?? process.env.EXPENSES_PASSWORD;
  const listenerOpts: ListenerOptions = {
    gate: user && password ? { user, password } : undefined,
    brandName: opts.brandName ?? process.env.BRAND_NAME,
  };
  const service = new ExpenseService({ store, policy: opts.policy ?? policyFromEnv() });
  const server = createServer(createRequestListener(service, WEB_INDEX, listenerOpts));
  return { server, service };
}
