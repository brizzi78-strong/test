/**
 * Checkr screening-provider adapter.
 *
 * Implements {@link ScreeningProvider} against Checkr's REST API so a HireCheck
 * deployment can run real, automated background checks — criminal, verifications,
 * MVR, and drug screening — instead of the mock.
 *
 * Checkr basics this adapter uses (all public API):
 *   - Auth is HTTP Basic with the secret API key as the username and an empty
 *     password: `Authorization: Basic base64(apiKey + ':')`.
 *   - Base URL defaults to https://api.checkr.com/v1 (use a test key for the
 *     sandbox — same base URL, different key).
 *   - A check is run by creating a Candidate, then a Report for that candidate
 *     against a configured Package. The report's `result` is `clear` or
 *     `consider`.
 *
 * IMPORTANT — asynchronous by nature: most Checkr reports do not finish
 * instantly (a drug screen waits for the candidate to visit a clinic; criminal
 * searches take minutes to days). A freshly created report is usually
 * `status: "pending"` with no `result` yet. In production you finish a check by
 * subscribing to Checkr's `report.completed` webhook and feeding that payload
 * through {@link CheckrProvider.mapReport} — the exact same mapping used here.
 * This synchronous `runCheck` maps whatever result is already available and, if
 * the report is still pending, degrades to an `error` outcome that tells the
 * operator to wire the webhook — so one un-finished check never crashes an order.
 *
 * The `package` slugs are configured on YOUR Checkr account; override
 * `packageFor` to match the packages you provision. Everything else — Basic
 * auth, per-request timeout, transport/HTTP error handling, and the
 * check-type -> package mapping — is real and reusable.
 */

import type { CheckRecord, CheckType } from '../domain/types.ts';
import type { ProviderCheckOutcome, ProviderSubject, ScreeningProvider } from './provider.ts';

export interface CheckrProviderConfig {
  /** Secret API key issued by Checkr (test key for sandbox). */
  apiKey: string;
  /** API base URL (default https://api.checkr.com/v1). */
  baseUrl?: string;
  /** Per-request timeout in milliseconds (default 15000). */
  timeoutMs?: number;
  /** Injected fetch implementation, for testing. Defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /**
   * Maps a HireCheck check type to the Checkr package slug to order.
   * Override to match the packages provisioned on your Checkr account.
   */
  packageFor?: (type: CheckType) => string;
}

/**
 * Default check-type -> Checkr package slug. These mirror Checkr's screening
 * names; on a real account you typically create packages that bundle one or
 * more screenings and map to those slugs instead.
 */
const DEFAULT_PACKAGES: Record<CheckType, string> = {
  ssn_trace: 'ssn_trace',
  sex_offender_registry: 'sex_offender_search',
  global_watchlist: 'global_watchlist_search',
  national_criminal: 'national_criminal_search',
  county_criminal: 'county_criminal_search',
  employment_verification: 'employment_verification',
  education_verification: 'education_verification',
  motor_vehicle_record: 'motor_vehicle_report',
  drug_screen: 'drug_screening',
  identity_verification: 'ssn_trace',
};

export class CheckrProvider implements ScreeningProvider {
  readonly name = 'checkr';

  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly packageFor: (type: CheckType) => string;

  constructor(config: CheckrProviderConfig) {
    if (!config.apiKey) throw new Error('CheckrProvider: apiKey is required');
    this.baseUrl = (config.baseUrl ?? 'https://api.checkr.com/v1').replace(/\/+$/, '');
    // Basic auth: API key as username, empty password.
    this.authHeader = `Basic ${Buffer.from(`${config.apiKey}:`).toString('base64')}`;
    this.timeoutMs = config.timeoutMs ?? 15_000;
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.packageFor = config.packageFor ?? ((type) => DEFAULT_PACKAGES[type]);
  }

  async runCheck(type: CheckType, subject: ProviderSubject): Promise<ProviderCheckOutcome> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      // 1. Create (or reference) the candidate. In production you'd create the
      //    candidate once per person and reuse the id across checks.
      const candidate = await this.post('/candidates', {
        first_name: subject.firstName,
        last_name: subject.lastName,
        email: subject.email,
      }, controller.signal);
      const candidateId = (candidate as { id?: unknown }).id;
      if (typeof candidateId !== 'string') {
        return errorOutcome(`Checkr did not return a candidate id for ${type}`);
      }

      // 2. Order the report for the mapped package.
      const report = await this.post('/reports', {
        candidate_id: candidateId,
        package: this.packageFor(type),
      }, controller.signal);

      return this.mapReport(type, report);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      return errorOutcome(`Checkr request failed for ${type}: ${reason}`);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Map a Checkr report object (from report creation OR a `report.completed`
   * webhook) to a HireCheck outcome. `result` is `clear` | `consider`; a report
   * still `pending` has no result yet and degrades to `error` with a pointer to
   * finish it via webhook.
   */
  mapReport(type: CheckType, body: unknown): ProviderCheckOutcome {
    const report = (body ?? {}) as { status?: unknown; result?: unknown };
    const result = String(report.result ?? '').toLowerCase();
    const status = String(report.status ?? '').toLowerCase();

    if (result === 'clear') return { status: 'clear', records: [] };
    if (result === 'consider') {
      return {
        status: 'consider',
        records: [{ summary: `Checkr flagged the ${type} check for review (consider)`, detail: { source: 'checkr' } }],
      };
    }
    if (status === 'pending' || status === '' ) {
      return errorOutcome(
        `Checkr ${type} report is pending — finish it by wiring the report.completed webhook through mapReport()`,
      );
    }
    return errorOutcome(`Unrecognized Checkr report for ${type} (status=${status}, result=${result})`);
  }

  private async post(path: string, body: unknown, signal: AbortSignal): Promise<unknown> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        authorization: this.authHeader,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} on ${path}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
    }
    return res.json();
  }
}

function errorOutcome(summary: string): ProviderCheckOutcome {
  return { status: 'error', records: [{ summary, detail: { source: 'checkr' } } as CheckRecord] };
}
