/**
 * Pure dashboard computations. Given the owner's data and "now", produce the
 * Summary the dashboard renders — no store access, fully unit-testable.
 */

import type { Issue, Recognition, Round, Summary, Unit, UnitSummary } from './types.ts';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function within30Days(iso: string, now: Date): boolean {
  const t = Date.parse(iso);
  return Number.isFinite(t) && now.getTime() - t <= THIRTY_DAYS_MS && t <= now.getTime();
}

export function computeSummary(
  units: Unit[],
  rounds: Round[],
  issues: Issue[],
  recognitions: Recognition[],
  now: Date,
): Summary {
  const issueCounts = { green: 0, yellow: 0, red: 0 };
  for (const issue of issues) issueCounts[issue.status]++;

  const unitSummaries: UnitSummary[] = units.map((unit) => {
    const unitRounds30 = rounds.filter(
      (r) => r.unitId === unit.id && within30Days(r.conductedAt, now),
    );
    const scaleValues: number[] = [];
    for (const round of unitRounds30) {
      for (const answer of round.answers) {
        if (typeof answer.value === 'number') scaleValues.push(answer.value);
      }
    }
    const unitIssues = issues.filter((i) => i.unitId === unit.id);
    return {
      unitId: unit.id,
      unitName: unit.name,
      rounds30Days: unitRounds30.length,
      cadenceGoal: unit.cadenceGoal,
      openIssues: unitIssues.filter((i) => i.status !== 'green').length,
      redIssues: unitIssues.filter((i) => i.status === 'red').length,
      recognitions30Days: recognitions.filter(
        (rec) => rec.unitId === unit.id && within30Days(rec.createdAt, now),
      ).length,
      avgScore:
        scaleValues.length === 0
          ? null
          : Math.round((scaleValues.reduce((a, b) => a + b, 0) / scaleValues.length) * 100) / 100,
    };
  });

  return {
    totals: {
      rounds: rounds.length,
      rounds30Days: rounds.filter((r) => within30Days(r.conductedAt, now)).length,
      issues: issueCounts,
      recognitions: recognitions.length,
    },
    units: unitSummaries,
  };
}
