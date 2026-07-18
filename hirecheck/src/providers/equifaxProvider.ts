/**
 * Equifax screening-provider adapter.
 *
 * Implements {@link ScreeningProvider} against Equifax Workforce Solutions so a
 * HireCheck deployment can source real screenings from Equifax instead of the
 * mock.
 *
 * IMPORTANT — placeholder payloads: Equifax's screening/verification APIs are
 * credentialed enterprise endpoints, and their exact request/response schemas
 * are governed by your Equifax integration agreement. The request body built in
 * `runCheck` and the response parsing in `mapResponse` are therefore
 * PLACEHOLDERS: reconcile them with Equifax's integration docs once you have
 * credentials and a product mapping. What is real and reusable regardless of
 * that contract is everything around the payload — bearer auth, a per-request
 * timeout, transport/HTTP error handling that degrades to an `error` outcome
 * (so one failed check never crashes an order), and the check-type -> Equifax
 * product mapping.
 */

import type { CheckRecord, CheckType } from '../domain/types.ts';
import type {
  ProviderCheckOutcome,
  ProviderSubject,
  ScreeningProvider,
} from './provider.ts';

export interface EquifaxProviderConfig {
  /** Base URL for the Equifax API environment (sandbox or production). */
  baseUrl: string;
  /** Bearer token / API key issued by Equifax. */
  apiKey: string;
  /** Per-request timeout in milliseconds (default 15000). */
  timeoutMs?: number;
  /** Injected fetch implementation, for testing. Defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /**
   * Maps a HireCheck check type to the Equifax product path/code to call.
   * Override to match the products provisioned on your Equifax account.
   */
  productFor?: (type: CheckType) => string;
}

/** Default check-type -> Equifax product path. Adjust to your provisioning. */
const DEFAULT_PRODUCTS: Record<CheckType, string> = {
  ssn_trace: 'ssn-trace',
  sex_offender_registry: 'sex-offender',
  global_watchlist: 'watchlist',
  national_criminal: 'criminal/national',
  county_criminal: 'criminal/county',
  employment_verification: 'verification/employment',
  education_verification: 'verification/education',
  motor_vehicle_record: 'mvr',
  drug_screen: 'drug-screen',
};

export class EquifaxProvider implements ScreeningProvider {
  readonly name = 'equifax';

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly productFor: (type: CheckType) => string;

  constructor(config: EquifaxProviderConfig) {
    if (!config.baseUrl) throw new Error('EquifaxProvider: baseUrl is required');
    if (!config.apiKey) throw new Error('EquifaxProvider: apiKey is required');
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs ?? 15_000;
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.productFor = config.productFor ?? ((type) => DEFAULT_PRODUCTS[type]);
  }

  async runCheck(type: CheckType, subject: ProviderSubject): Promise<ProviderCheckOutcome> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const url = `${this.baseUrl}/${this.productFor(type)}`;
      const res = await this.fetchImpl(url, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        // PLACEHOLDER request shape — reconcile with Equifax's spec.
        body: JSON.stringify({
          firstName: subject.firstName,
          lastName: subject.lastName,
          email: subject.email,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        return errorOutcome(`Equifax returned HTTP ${res.status} for ${type}`);
      }
      const body: unknown = await res.json();
      return this.mapResponse(type, body);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      return errorOutcome(`Equifax request failed for ${type}: ${reason}`);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * PLACEHOLDER response mapping. Assumes a body shaped like
   * `{ decision: 'clear' | 'review', records?: [{ summary }] }`. Replace the
   * field names/values with Equifax's real schema once known.
   */
  private mapResponse(type: CheckType, body: unknown): ProviderCheckOutcome {
    const obj = (body ?? {}) as { decision?: unknown; records?: unknown };
    const decision = String(obj.decision ?? '').toLowerCase();

    if (decision === 'clear' || decision === 'pass' || decision === 'no_record') {
      return { status: 'clear', records: [] };
    }
    if (decision === 'review' || decision === 'consider' || decision === 'record_found') {
      return { status: 'consider', records: extractRecords(obj.records, type) };
    }
    return errorOutcome(`Unrecognized Equifax decision for ${type}: ${String(obj.decision)}`);
  }
}

function extractRecords(raw: unknown, type: CheckType): CheckRecord[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((r) => {
      const rec = (r ?? {}) as { summary?: unknown };
      return {
        summary: typeof rec.summary === 'string' ? rec.summary : `Equifax record on the ${type} check`,
        detail: { source: 'equifax' },
      };
    });
  }
  return [{ summary: `Equifax flagged the ${type} check for review`, detail: { source: 'equifax' } }];
}

function errorOutcome(summary: string): ProviderCheckOutcome {
  return { status: 'error', records: [{ summary, detail: { source: 'equifax' } }] };
}
