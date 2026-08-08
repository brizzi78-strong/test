import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG } from '../domain/catalog.ts';
import {
  MAX_PELL,
  checkEligibility,
  daysUntil,
  estimatePell,
  explainEligibility,
  matchProfile,
  nearMisses,
  nextDeadline,
  povertyGuideline,
  totalEstimated,
} from '../domain/engine.ts';
import { buildIcs } from '../domain/ics.ts';
import type { Opportunity, StudentProfile } from '../domain/types.ts';

const TODAY = new Date('2026-08-06T12:00:00Z');

function profile(overrides: Partial<StudentProfile> = {}): StudentProfile {
  return {
    ownerId: 'demo',
    studentName: '',
    state: 'NC',
    degreeLevel: 'high-school-senior',
    fieldOfStudy: 'stem',
    gpa: 3.6,
    householdIncome: 48000,
    householdSize: 4,
    enrolledHalfTimePlus: true,
    usCitizenOrEligibleNoncitizen: true,
    firstGeneration: true,
    communityService: true,
    militaryAffiliation: false,
    employed: false,
    studentIsMinor: false,
    parentEmails: [],
    updatedAt: TODAY.toISOString(),
    ...overrides,
  };
}

describe('Pell estimate', () => {
  it('uses the 2025 poverty guideline table', () => {
    assert.equal(povertyGuideline(1), 15650);
    assert.equal(povertyGuideline(4), 15650 + 3 * 5500);
  });

  it('awards max Pell at or below 175% of poverty', () => {
    assert.equal(estimatePell(0, 1), MAX_PELL);
    // 4-person guideline is $32,150; 175% is $56,262.50.
    assert.equal(estimatePell(56000, 4), MAX_PELL);
  });

  it('awards nothing at 400% of poverty and above', () => {
    assert.equal(estimatePell(400000, 4), 0);
    assert.equal(estimatePell(32150 * 4, 4), 0);
  });

  it('tapers linearly in between, rounded to $5', () => {
    // Halfway between 175% and 400% of poverty → about half of max Pell.
    const guideline = povertyGuideline(4);
    const halfway = guideline * (1.75 + 4.0) / 2;
    const estimate = estimatePell(halfway, 4);
    assert.ok(Math.abs(estimate - MAX_PELL / 2) <= 5, `got ${estimate}`);
    assert.equal(estimate % 5, 0);
  });

  it('drops sub-minimum awards to zero rather than paying $30', () => {
    const guideline = povertyGuideline(4);
    assert.equal(estimatePell(guideline * 3.99, 4), 0);
  });
});

describe('deadlines', () => {
  it('picks this year when the date is still ahead', () => {
    assert.equal(nextDeadline({ month: 12, day: 1 }, TODAY), '2026-12-01');
    assert.equal(daysUntil('2026-12-01', TODAY), 117);
  });

  it('rolls to next year when the date has passed', () => {
    assert.equal(nextDeadline({ month: 6, day: 30 }, TODAY), '2027-06-30');
  });

  it('treats today as still-open', () => {
    assert.equal(nextDeadline({ month: 8, day: 6 }, TODAY), '2026-08-06');
    assert.equal(daysUntil('2026-08-06', TODAY), 0);
  });

  it('returns null for rolling deadlines', () => {
    assert.equal(nextDeadline('rolling', TODAY), null);
  });
});

describe('eligibility', () => {
  const pell = CATALOG.find((o) => o.id === 'pell-grant')!;
  const nextNc = CATALOG.find((o) => o.id === 'next-nc-scholarship')!;
  const cocaCola = CATALOG.find((o) => o.id === 'coca-cola-scholars')!;
  const amazon = CATALOG.find((o) => o.id === 'amazon-future-engineer')!;
  const giBill = CATALOG.find((o) => o.id === 'gi-bill')!;

  it('matches need-based grants for a low-income student', () => {
    assert.ok(checkEligibility(profile(), pell));
    assert.ok(checkEligibility(profile(), nextNc));
  });

  it('excludes state grants for out-of-state students', () => {
    assert.equal(checkEligibility(profile({ state: 'VA' }), nextNc), null);
  });

  it('enforces GPA floors and treats unknown GPA as not qualifying', () => {
    assert.ok(checkEligibility(profile({ gpa: 3.0 }), cocaCola));
    assert.equal(checkEligibility(profile({ gpa: 2.9 }), cocaCola), null);
    assert.equal(checkEligibility(profile({ gpa: null }), cocaCola), null);
  });

  it('enforces field-of-study restrictions', () => {
    assert.ok(checkEligibility(profile({ fieldOfStudy: 'stem' }), amazon));
    assert.equal(checkEligibility(profile({ fieldOfStudy: 'business' }), amazon), null);
  });

  it('enforces income caps', () => {
    assert.equal(checkEligibility(profile({ householdIncome: 200000 }), pell), null);
  });

  it('gates military benefits on affiliation', () => {
    assert.equal(checkEligibility(profile(), giBill), null);
    assert.ok(checkEligibility(profile({ militaryAffiliation: true }), giBill));
  });

  it('degree level rules out graduate students from HS-senior scholarships', () => {
    assert.equal(checkEligibility(profile({ degreeLevel: 'graduate' }), cocaCola), null);
  });
});

describe('matchProfile', () => {
  it('returns matches sorted by estimated amount, largest first', () => {
    const matches = matchProfile(profile(), TODAY);
    assert.ok(matches.length >= 8, `only ${matches.length} matches`);
    for (let i = 1; i < matches.length; i++) {
      assert.ok(matches[i - 1]!.estimatedAmount >= matches[i]!.estimatedAmount);
    }
  });

  it('computes Pell rather than using the range midpoint', () => {
    const matches = matchProfile(profile({ householdIncome: 20000 }), TODAY);
    const pell = matches.find((m) => m.opportunity.id === 'pell-grant');
    assert.equal(pell?.estimatedAmount, MAX_PELL);
  });

  it('drops a Pell match whose estimate is $0', () => {
    // High income relative to poverty for a 1-person household, but still
    // under the catalog's coarse income screen.
    const matches = matchProfile(
      profile({ householdIncome: 90000, householdSize: 1, degreeLevel: 'undergraduate' }),
      TODAY,
    );
    assert.equal(matches.find((m) => m.opportunity.id === 'pell-grant'), undefined);
  });

  it('attaches next deadlines and day counts', () => {
    const matches = matchProfile(profile(), TODAY);
    const dell = matches.find((m) => m.opportunity.id === 'dell-scholars');
    assert.equal(dell?.nextDeadline, '2026-12-01');
    assert.equal(dell?.daysLeft, 117);
    const employer = matchProfile(profile({ employed: true }), TODAY).find(
      (m) => m.opportunity.id === 'employer-tuition-127',
    );
    assert.equal(employer?.nextDeadline, null);
    assert.equal(employer?.daysLeft, null);
  });

  it('totals the estimated value', () => {
    const matches = matchProfile(profile(), TODAY);
    assert.equal(
      totalEstimated(matches),
      matches.reduce((s, m) => s + m.estimatedAmount, 0),
    );
    assert.ok(totalEstimated(matches) > 50000); // strong profile finds serious money
  });
});

describe('near misses', () => {
  it('surfaces opportunities blocked only by fixable criteria, biggest first', () => {
    // Default test profile: GPA 3.6 (0.1 under Cameron Impact's 3.7), not employed.
    const misses = nearMisses(profile());
    const ids = misses.map((m) => m.opportunity.id);
    assert.ok(ids.includes('cameron-impact'));
    assert.ok(ids.includes('employer-tuition-127'));
    for (let i = 1; i < misses.length; i++) {
      assert.ok(misses[i - 1]!.potentialAmount >= misses[i]!.potentialAmount);
    }
    const cameron = misses.find((m) => m.opportunity.id === 'cameron-impact')!;
    assert.equal(cameron.blockers.length, 1);
    assert.equal(cameron.blockers[0]!.code, 'gpa');
    assert.ok(cameron.blockers.every((b) => b.fixable));
  });

  it('excludes unfixable blockers: state, income, military, degree level', () => {
    const ids = nearMisses(profile()).map((m) => m.opportunity.id);
    assert.ok(!ids.includes('gi-bill')); // military affiliation isn't fixable
    assert.ok(!ids.includes('cal-grant')); // NC resident can't fix CA residency
    assert.ok(!ids.includes('lifetime-learning-credit')); // HS senior, grad/undergrad only
  });

  it('treats a GPA more than 0.5 under the cutoff as out of reach', () => {
    const ids = nearMisses(profile({ gpa: 3.0 })).map((m) => m.opportunity.id);
    assert.ok(!ids.includes('cameron-impact')); // 3.0 vs 3.7 — not a near miss
    const report = explainEligibility(
      profile({ gpa: 3.0 }),
      CATALOG.find((o) => o.id === 'cameron-impact')!,
    );
    assert.equal(report.blockers[0]!.fixable, false);
  });

  it('flags an unknown GPA as fixable — entering it may unlock money', () => {
    const misses = nearMisses(profile({ gpa: null }));
    const cocaCola = misses.find((m) => m.opportunity.id === 'coca-cola-scholars');
    assert.ok(cocaCola);
    assert.match(cocaCola.blockers[0]!.message, /enter yours/);
  });

  it('never lists something the student already matches', () => {
    const p = profile();
    const matchedIds = new Set(matchProfile(p, TODAY).map((m) => m.opportunity.id));
    for (const miss of nearMisses(p)) {
      assert.ok(!matchedIds.has(miss.opportunity.id));
    }
  });
});

describe('state grants', () => {
  it('each state grant only matches its own residents', () => {
    const byState: Array<[string, string]> = [
      ['CA', 'cal-grant'],
      ['NY', 'ny-tap'],
      ['TX', 'texas-grant'],
      ['FL', 'fl-bright-futures'],
      ['GA', 'ga-hope'],
      ['NC', 'next-nc-scholarship'],
    ];
    for (const [state, id] of byState) {
      const opp = CATALOG.find((o) => o.id === id)!;
      assert.ok(checkEligibility(profile({ state }), opp), `${id} should match ${state}`);
      assert.equal(checkEligibility(profile({ state: state === 'CA' ? 'NY' : 'CA' }), opp), null);
    }
  });
});

describe('iCalendar export', () => {
  it('builds one all-day event per deadline with two reminders', () => {
    const ics = buildIcs(
      [
        {
          id: 'dell-scholars',
          name: 'Dell Scholars Program',
          date: '2026-12-01',
          estimatedAmount: 20000,
          url: 'https://www.dellscholars.org/scholarship/',
        },
      ],
      TODAY,
    );
    assert.ok(ics.startsWith('BEGIN:VCALENDAR'));
    assert.ok(ics.trimEnd().endsWith('END:VCALENDAR'));
    assert.equal(ics.match(/BEGIN:VEVENT/g)?.length, 1);
    assert.equal(ics.match(/BEGIN:VALARM/g)?.length, 2);
    assert.match(ics, /UID:dell-scholars@aidfinder/);
    assert.match(ics, /DTSTART;VALUE=DATE:20261201/);
    assert.match(ics, /DTEND;VALUE=DATE:20261202/); // exclusive end = next day
    assert.match(ics, /TRIGGER:-P7D/);
    assert.match(ics, /TRIGGER:-P1D/);
    assert.match(ics, /est\. \$20\\,000\/yr/); // comma escaped per RFC 5545
    assert.ok(ics.includes('\r\n')); // CRLF line endings
  });

  it('folds long lines to 75 octets', () => {
    const ics = buildIcs(
      [
        {
          id: 'x',
          name: 'A scholarship with an extremely long name that will absolutely exceed the seventy-five octet line limit',
          date: '2026-09-15',
          estimatedAmount: 0,
          url: 'https://example.com/',
        },
      ],
      TODAY,
    );
    for (const line of ics.split('\r\n')) {
      assert.ok(line.length <= 75, `line too long: ${line}`);
    }
  });
});

describe('catalog sanity', () => {
  it('has unique ids, valid deadlines, and https sources', () => {
    const ids = new Set<string>();
    for (const opp of CATALOG as Opportunity[]) {
      assert.ok(!ids.has(opp.id), `duplicate id ${opp.id}`);
      ids.add(opp.id);
      assert.ok(opp.amountMax >= opp.amountMin);
      assert.match(opp.url, /^https:\/\//);
      if (opp.deadline !== 'rolling') {
        assert.ok(opp.deadline.month >= 1 && opp.deadline.month <= 12);
        assert.ok(opp.deadline.day >= 1 && opp.deadline.day <= 31);
      }
    }
  });
});
