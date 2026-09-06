import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_POLICY } from '../domain/policy.ts';
import { policyFromEnv } from '../api/server.ts';

describe('policyFromEnv', () => {
  it('returns the defaults when EXPENSES_POLICY is unset', () => {
    assert.deepEqual(policyFromEnv({}), DEFAULT_POLICY);
  });

  it('merges scalar overrides into the defaults', () => {
    const policy = policyFromEnv({ EXPENSES_POLICY: '{"autoApproveCeilingCents":50000}' });
    assert.equal(policy.autoApproveCeilingCents, 50_000);
    assert.equal(policy.receiptRequiredCents, DEFAULT_POLICY.receiptRequiredCents);
    assert.deepEqual(policy.categoryLimitCents, DEFAULT_POLICY.categoryLimitCents);
  });

  it('merges category limits per category', () => {
    const policy = policyFromEnv({
      EXPENSES_POLICY: '{"categoryLimitCents":{"meals":10000,"software":20000}}',
    });
    assert.equal(policy.categoryLimitCents.meals, 10_000);
    assert.equal(policy.categoryLimitCents.software, 20_000);
    assert.equal(policy.categoryLimitCents.lodging, DEFAULT_POLICY.categoryLimitCents.lodging);
  });

  it('rejects invalid JSON and non-positive numbers', () => {
    assert.throws(() => policyFromEnv({ EXPENSES_POLICY: 'not json' }), /valid JSON/);
    assert.throws(() => policyFromEnv({ EXPENSES_POLICY: '[1]' }), /JSON object/);
    assert.throws(() => policyFromEnv({ EXPENSES_POLICY: '{"staleAfterDays":0}' }), /positive/);
    assert.throws(
      () => policyFromEnv({ EXPENSES_POLICY: '{"categoryLimitCents":{"meals":-5}}' }),
      /positive/,
    );
  });

  it('rejects typo’d field names and unknown categories instead of silently ignoring them', () => {
    assert.throws(
      () => policyFromEnv({ EXPENSES_POLICY: '{"autoAproveCeilingCents":50000}' }),
      /not a policy field/,
    );
    assert.throws(
      () => policyFromEnv({ EXPENSES_POLICY: '{"categoryLimitCents":{"meal":10000}}' }),
      /not a category/,
    );
  });
});
