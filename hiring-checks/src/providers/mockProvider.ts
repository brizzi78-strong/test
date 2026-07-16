/**
 * Deterministic mock CRA used for tests, demos, and local development.
 *
 * Results are derived from a hash of the subject's email plus the check type,
 * so the same candidate always yields the same outcomes (reproducible tests)
 * without any network calls or real personal data. It never contacts an
 * external service.
 *
 * Convention for demos: an email whose local part contains "consider" forces a
 * `consider` outcome, and "error" forces an `error`, so specific workflow paths
 * can be exercised on demand.
 */

import { createHash } from 'node:crypto';
import type { CheckRecord, CheckType } from '../domain/types.ts';
import type {
  ProviderCheckOutcome,
  ProviderSubject,
  ScreeningProvider,
} from './provider.ts';

function hashToUnit(input: string): number {
  const hex = createHash('sha256').update(input).digest('hex').slice(0, 8);
  return parseInt(hex, 16) / 0xffffffff;
}

const RECORD_SUMMARIES: Record<CheckType, string> = {
  ssn_trace: 'Address history discrepancy requires review',
  sex_offender_registry: 'Possible registry match on name and DOB',
  global_watchlist: 'Name similarity hit on a sanctions list',
  national_criminal: 'Misdemeanor record found in national database',
  county_criminal: 'County record found; disposition pending review',
  employment_verification: 'Reported employer could not confirm dates',
  education_verification: 'Degree could not be verified with institution',
  motor_vehicle_record: 'Moving violation on record within lookback period',
};

export class MockProvider implements ScreeningProvider {
  readonly name = 'mock-cra';

  async runCheck(
    type: CheckType,
    subject: ProviderSubject,
  ): Promise<ProviderCheckOutcome> {
    const local = subject.email.split('@')[0]?.toLowerCase() ?? '';
    if (local.includes('error')) {
      return { status: 'error', records: [] };
    }
    if (local.includes('consider')) {
      return { status: 'consider', records: [this.recordFor(type)] };
    }

    const roll = hashToUnit(`${subject.email}:${type}`);
    // ~15% of checks surface something to review; the rest come back clear.
    if (roll < 0.15) {
      return { status: 'consider', records: [this.recordFor(type)] };
    }
    return { status: 'clear', records: [] };
  }

  private recordFor(type: CheckType): CheckRecord {
    return { summary: RECORD_SUMMARIES[type], detail: { source: this.name } };
  }
}
