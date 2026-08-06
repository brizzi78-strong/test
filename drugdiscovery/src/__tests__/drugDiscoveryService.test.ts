import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DrugDiscoveryService } from '../service/drugDiscoveryService.ts';
import { createInMemoryStore } from '../store/store.ts';
import { ConflictError, ValidationError } from '../service/errors.ts';
import { drugLikeness, lipinski, pPotency, potencyScore, veber } from '../domain/chem.ts';
import type { Descriptors } from '../domain/types.ts';

function svc() {
  let seq = 0;
  return new DrugDiscoveryService({
    store: createInMemoryStore(),
    now: () => new Date('2026-08-06T00:00:00.000Z'),
    newId: (p) => `${p}_${++seq}`,
  });
}

// A clean, drug-like small molecule (aspirin-ish profile).
const clean: Descriptors = {
  molecularWeight: 180,
  logP: 1.2,
  hBondDonors: 1,
  hBondAcceptors: 4,
  rotatableBonds: 3,
  tpsa: 63,
  aromaticRings: 1,
};

// A bloated, greasy molecule that fails Ro5 and Veber.
const bloated: Descriptors = {
  molecularWeight: 720,
  logP: 7.5,
  hBondDonors: 7,
  hBondAcceptors: 13,
  rotatableBonds: 15,
  tpsa: 190,
  aromaticRings: 5,
};

test('a clean small molecule passes Lipinski and Veber and scores high', () => {
  assert.equal(lipinski(clean).pass, true);
  assert.equal(veber(clean).pass, true);
  const dl = drugLikeness(clean);
  assert.ok(dl.score >= 85, `expected excellent, got ${dl.score}`);
  assert.equal(dl.verdict, 'excellent');
  assert.equal(dl.totalViolations, 0);
});

test('a bloated molecule fails the rules and scores poorly', () => {
  const lip = lipinski(bloated);
  assert.equal(lip.pass, false);
  assert.ok(lip.violations.length >= 2);
  const dl = drugLikeness(bloated);
  assert.equal(dl.verdict, 'poor');
  assert.ok(dl.score <= 40, `expected poor, got ${dl.score}`);
});

test('Lipinski tolerates exactly one violation', () => {
  const oneOff: Descriptors = { ...clean, molecularWeight: 520 }; // MW just over 500, nothing else fails
  assert.equal(lipinski(oneOff).pass, true);
  assert.equal(lipinski(oneOff).violations.length, 1);
});

test('potency math: 1 nM -> pPotency 9, 100 nM -> 7; potencyScore is monotonic', () => {
  assert.equal(pPotency(1), 9);
  assert.equal(pPotency(100), 7);
  assert.ok(potencyScore(1) > potencyScore(100));
  assert.throws(() => pPotency(0), /positive/);
});

test('createCompound registers a candidate at the hit stage with a live drug-likeness view', () => {
  const s = svc();
  const p = s.createProgram({ name: 'BTK inhibitors', indication: 'RA' });
  const c = s.createCompound({ programId: p.id, name: 'CPD-1', descriptors: clean, source: 'designed' });
  assert.equal(c.stage, 'hit');
  assert.equal(c.drugLikeness.verdict, 'excellent');
  assert.deepEqual([...c.nextStages], ['lead', 'discontinued']);
});

test('the pipeline advances one stage at a time and rejects skips', () => {
  const s = svc();
  const p = s.createProgram({ name: 'P' });
  const c = s.createCompound({ programId: p.id, name: 'CPD-1', descriptors: clean, source: 'designed' });
  assert.throws(() => s.advanceCompound(c.id, 'candidate'), ConflictError); // can't skip lead
  const lead = s.advanceCompound(c.id, 'lead');
  assert.equal(lead.stage, 'lead');
  const cand = s.advanceCompound(c.id, 'candidate');
  assert.equal(cand.stage, 'candidate');
});

test('a discontinued candidate is terminal', () => {
  const s = svc();
  const p = s.createProgram({ name: 'P' });
  const c = s.createCompound({ programId: p.id, name: 'CPD-1', descriptors: clean, source: 'designed' });
  s.advanceCompound(c.id, 'discontinued');
  assert.throws(() => s.advanceCompound(c.id, 'lead'), ConflictError);
});

test('descriptors are validated: non-numbers rejected, negative logP allowed', () => {
  const s = svc();
  const p = s.createProgram({ name: 'P' });
  assert.throws(
    () => s.createCompound({ programId: p.id, name: 'bad', source: 'designed', descriptors: { ...clean, molecularWeight: NaN } }),
    ValidationError,
  );
  assert.throws(
    () => s.createCompound({ programId: p.id, name: 'bad', source: 'designed', descriptors: { ...clean, hBondDonors: -1 } }),
    ValidationError,
  );
  // negative logP is a real, common value for polar molecules
  const ok = s.createCompound({ programId: p.id, name: 'polar', source: 'designed', descriptors: { ...clean, logP: -0.8 } });
  assert.equal(ok.descriptors.logP, -0.8);
});

test('recording a screen requires the target to belong to the compound program', () => {
  const s = svc();
  const p1 = s.createProgram({ name: 'P1' });
  const p2 = s.createProgram({ name: 'P2' });
  const c = s.createCompound({ programId: p1.id, name: 'CPD-1', descriptors: clean, source: 'designed' });
  const foreign = s.createTarget({ programId: p2.id, name: 'other', kind: 'enzyme' });
  assert.throws(() => s.recordScreen({ compoundId: c.id, targetId: foreign.id, metric: 'IC50', valueNanomolar: 10 }), ValidationError);
});

test('ranking fuses potency with drug-likeness: a screened potent hit beats an unscreened clean design', () => {
  const s = svc();
  const p = s.createProgram({ name: 'P' });
  const tgt = s.createTarget({ programId: p.id, name: 'BTK', kind: 'enzyme' });

  const potent = s.createCompound({ programId: p.id, name: 'POTENT', descriptors: clean, source: 'designed' });
  const untested = s.createCompound({ programId: p.id, name: 'UNTESTED', descriptors: clean, source: 'designed' });
  s.recordScreen({ compoundId: potent.id, targetId: tgt.id, metric: 'IC50', valueNanomolar: 2 });

  const ranked = s.rankCandidates(tgt.id);
  assert.equal(ranked[0].compound.id, potent.id);
  assert.equal(ranked[0].bestPotencyNanomolar, 2);
  assert.ok(ranked[0].overall > ranked[1].overall);
});

test("seedDemo builds the Parkinson's MAO-B program with molecules, screens, and a sensible ranking", () => {
  const s = svc();
  const { program, targetId, compoundIds } = s.seedDemo();
  assert.match(program.indication ?? '', /Parkinson/);
  assert.equal(compoundIds.length, 4);

  const compounds = s.listCompounds({ programId: program.id });
  const names = compounds.map((c) => c.name).sort();
  assert.deepEqual(names, ['Levodopa', 'Rasagiline', 'Safinamide', 'Selegiline']);

  // Levodopa passes the Rule of Five (the teaching point) but its negative logP
  // makes it the lowest-scoring of the four.
  const levodopa = compounds.find((c) => c.name === 'Levodopa')!;
  assert.equal(levodopa.drugLikeness.rules[0].pass, true); // Lipinski Ro5 passes
  assert.ok(levodopa.descriptors.logP < 0);
  const others = compounds.filter((c) => c.name !== 'Levodopa');
  assert.ok(others.every((c) => c.drugLikeness.score > levodopa.drugLikeness.score));
  // Rasagiline is small and clean.
  const rasagiline = compounds.find((c) => c.name === 'Rasagiline')!;
  assert.equal(rasagiline.drugLikeness.verdict, 'excellent');

  // Rasagiline is the most potent seeded screen (14 nM) and drug-like, so it tops the ranking.
  const ranked = s.rankCandidates(targetId);
  assert.equal(ranked[0].compound.name, 'Rasagiline');
  assert.equal(ranked[0].bestPotencyNanomolar, 14);
  // Levodopa was seeded without a screen, so it has no potency figure.
  const levoRank = ranked.find((r) => r.compound.name === 'Levodopa')!;
  assert.equal(levoRank.bestPotencyNanomolar, undefined);
});

test('ranking keeps the best (lowest nM) potency across multiple screens and excludes discontinued', () => {
  const s = svc();
  const p = s.createProgram({ name: 'P' });
  const tgt = s.createTarget({ programId: p.id, name: 'BTK', kind: 'enzyme' });
  const c = s.createCompound({ programId: p.id, name: 'C', descriptors: clean, source: 'designed' });
  s.recordScreen({ compoundId: c.id, targetId: tgt.id, metric: 'IC50', valueNanomolar: 50 });
  s.recordScreen({ compoundId: c.id, targetId: tgt.id, metric: 'IC50', valueNanomolar: 5 });
  assert.equal(s.rankCandidates(tgt.id)[0].bestPotencyNanomolar, 5);

  const dead = s.createCompound({ programId: p.id, name: 'DEAD', descriptors: clean, source: 'designed' });
  s.advanceCompound(dead.id, 'discontinued');
  const ranked = s.rankCandidates(tgt.id);
  assert.ok(!ranked.some((r) => r.compound.id === dead.id));
});
