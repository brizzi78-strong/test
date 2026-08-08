import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDigest } from '../domain/digest.ts';
import type { DigestInput } from '../domain/digest.ts';

function input(overrides: Partial<DigestInput> = {}): DigestInput {
  return {
    studentName: 'Ada',
    potential: 45000,
    submitted: 20000,
    won: 0,
    activity: [],
    upcoming: [],
    ...overrides,
  };
}

describe('buildDigest', () => {
  it('leads with the win in the subject once there is one', () => {
    const won = buildDigest(input({ won: 20000 }));
    assert.match(won.subject, /Ada has won \$20,000/);
    const notYet = buildDigest(input());
    assert.match(notYet.subject, /Ada's college money update: \$45,000\/yr matched/);
  });

  it('falls back to a generic label when no name was entered', () => {
    const digest = buildDigest(input({ studentName: '' }));
    assert.match(digest.subject, /^Your student's/);
    assert.match(digest.text, /^Your student's college funding progress/);
  });

  it('renders activity in the order given (the caller sorts newest-first) with plain-language status', () => {
    // buildDigest is a pure formatter — sorting is buildDigestInput's job in
    // the service, exercised end-to-end in api.test.ts.
    const digest = buildDigest(
      input({
        activity: [
          { opportunityName: 'Dell Scholars Program', status: 'submitted', at: '2026-08-05T00:00:00.000Z' },
          { opportunityName: 'Dell Scholars Program', status: 'planned', at: '2026-08-01T00:00:00.000Z' },
        ],
      }),
    );
    const submittedIdx = digest.text.indexOf('submitted Dell Scholars');
    const startedIdx = digest.text.indexOf('started tracking Dell Scholars');
    assert.ok(submittedIdx > 0 && startedIdx > 0);
    assert.ok(submittedIdx < startedIdx); // preserves the given (newest-first) order
  });

  it('shows placeholders when there is nothing to report', () => {
    const digest = buildDigest(input());
    assert.match(digest.text, /\(nothing tracked yet\)/);
    assert.match(digest.text, /\(nothing due soon\)/);
  });

  it('lists upcoming deadlines with days-left and estimated amount', () => {
    const digest = buildDigest(
      input({
        upcoming: [
          { opportunityName: 'Gates Scholarship', nextDeadline: '2026-09-15', daysLeft: 40, estimatedAmount: 45000 },
        ],
      }),
    );
    assert.match(digest.text, /Gates Scholarship: due 2026-09-15 \(40 days\) — est\. \$45,000\/yr/);
  });

  it('caps the activity and upcoming lists rather than dumping everything', () => {
    const activity = Array.from({ length: 20 }, (_, i) => ({
      opportunityName: `Opp ${i}`,
      status: 'planned' as const,
      at: `2026-08-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
    }));
    const digest = buildDigest(input({ activity }));
    const lines = digest.text.split('\n').filter((l) => l.trim().startsWith('- '));
    assert.ok(lines.length <= 8, `expected activity capped, got ${lines.length} lines`);
  });

  it('HTML-escapes a student name so it can never inject markup into the parent email', () => {
    const digest = buildDigest(input({ studentName: '<script>alert(1)</script>' }));
    assert.ok(!digest.html.includes('<script>alert'));
    assert.match(digest.html, /&lt;script&gt;/);
  });

  it('produces both a plain-text and an HTML body', () => {
    const digest = buildDigest(input());
    assert.ok(digest.text.length > 0);
    assert.match(digest.html, /<h2>/);
  });
});
