import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RoundingService } from '../service/roundingService.ts';
import { createInMemoryStore } from '../store/store.ts';
import { ConflictError, NotFoundError, ValidationError } from '../service/errors.ts';

const OWNER = 'demo';

function makeService(now = () => new Date('2026-08-06T12:00:00Z')) {
  return new RoundingService({ store: createInMemoryStore(), now });
}

function employeeTemplate(service: RoundingService) {
  return service.listTemplates(OWNER).find((t) => t.name === 'Employee Rounding')!;
}

describe('units', () => {
  it('creates and lists units with a default cadence goal', () => {
    const service = makeService();
    const unit = service.createUnit(OWNER, { name: '4 West' });
    assert.equal(unit.cadenceGoal, 10);
    assert.deepEqual(service.listUnits(OWNER).map((u) => u.name), ['4 West']);
  });

  it('rejects duplicate names and bad cadence goals', () => {
    const service = makeService();
    service.createUnit(OWNER, { name: 'ICU' });
    assert.throws(() => service.createUnit(OWNER, { name: 'icu' }), ConflictError);
    assert.throws(() => service.createUnit(OWNER, { name: 'ED', cadenceGoal: 0 }), ValidationError);
    assert.throws(() => service.createUnit(OWNER, { name: '' }), ValidationError);
  });

  it('isolates tenants', () => {
    const service = makeService();
    service.createUnit('alice', { name: 'ICU' });
    assert.equal(service.listUnits('bob').length, 0);
  });
});

describe('templates', () => {
  it('seeds the two built-in templates once per owner', () => {
    const service = makeService();
    const first = service.listTemplates(OWNER);
    assert.deepEqual(first.map((t) => t.name).sort(), ['Employee Rounding', 'Patient / Nurse-Leader Rounding']);
    assert.equal(service.listTemplates(OWNER).length, 2);
    // A different owner gets their own copies without id collisions.
    const other = service.listTemplates('other');
    assert.equal(other.length, 2);
    assert.equal(service.listTemplates(OWNER).length, 2);
  });

  it('creates a custom template with generated question ids', () => {
    const service = makeService();
    const tmpl = service.createTemplate(OWNER, {
      name: 'Discharge Callback',
      audience: 'patient',
      questions: [{ prompt: 'Do you understand your medications?', kind: 'yesNo' }],
    });
    assert.equal(tmpl.builtIn, false);
    assert.equal(tmpl.questions.length, 1);
    assert.ok(tmpl.questions[0]!.id.length > 0);
  });

  it('validates audience and questions', () => {
    const service = makeService();
    assert.throws(() => service.createTemplate(OWNER, { name: 'X', audience: 'vendor', questions: [] }), ValidationError);
    assert.throws(() => service.createTemplate(OWNER, { name: 'X', audience: 'employee', questions: [] }), ValidationError);
    assert.throws(
      () => service.createTemplate(OWNER, { name: 'X', audience: 'employee', questions: [{ prompt: 'Hi', kind: 'emoji' }] }),
      ValidationError,
    );
  });
});

describe('rounds', () => {
  it('records a round and harvests issues and recognitions', () => {
    const service = makeService();
    const unit = service.createUnit(OWNER, { name: '4 West' });
    const tmpl = employeeTemplate(service);
    const scaleQ = tmpl.questions.find((q) => q.kind === 'scale')!;
    const ynQ = tmpl.questions.find((q) => q.kind === 'yesNo')!;

    const { round, issues, recognitions } = service.createRound(OWNER, {
      templateId: tmpl.id,
      unitId: unit.id,
      leader: 'Dana',
      subject: 'Sam RN',
      answers: [
        { questionId: scaleQ.id, value: 4 },
        { questionId: ynQ.id, value: false },
      ],
      issues: [{ description: 'IV pumps missing from supply room' }],
      recognitions: [{ recipient: 'Priya', message: 'Stayed late to cover a sick call' }],
    });

    assert.equal(round.answers.length, 2);
    assert.equal(issues.length, 1);
    assert.equal(issues[0]!.status, 'yellow');
    assert.equal(issues[0]!.owner, 'Dana'); // defaults to the rounding leader
    assert.equal(issues[0]!.sourceRoundId, round.id);
    assert.equal(recognitions[0]!.sourceRoundId, round.id);
    assert.deepEqual(round.issueIds, [issues[0]!.id]);
    assert.equal(service.listIssues(OWNER).length, 1);
    assert.equal(service.listRecognitions(OWNER).length, 1);
    assert.equal(service.getRound(OWNER, round.id).subject, 'Sam RN');
  });

  it('validates answers against the template', () => {
    const service = makeService();
    const unit = service.createUnit(OWNER, { name: 'ICU' });
    const tmpl = employeeTemplate(service);
    const scaleQ = tmpl.questions.find((q) => q.kind === 'scale')!;
    const base = { templateId: tmpl.id, unitId: unit.id, leader: 'D', subject: 'S' };

    assert.throws(
      () => service.createRound(OWNER, { ...base, answers: [{ questionId: scaleQ.id, value: 9 }] }),
      ValidationError,
    );
    assert.throws(
      () => service.createRound(OWNER, { ...base, answers: [{ questionId: 'nope', value: 1 }] }),
      ValidationError,
    );
    assert.throws(
      () =>
        service.createRound(OWNER, {
          ...base,
          answers: [
            { questionId: scaleQ.id, value: 3 },
            { questionId: scaleQ.id, value: 4 },
          ],
        }),
      ValidationError,
    );
    assert.throws(() => service.createRound(OWNER, { ...base, unitId: 'missing' }), NotFoundError);
  });
});

describe('stoplight issues', () => {
  it('requires a reason to go red and records history', () => {
    const service = makeService();
    const unit = service.createUnit(OWNER, { name: 'ED' });
    const issue = service.createIssue(OWNER, { unitId: unit.id, description: 'Broken door badge reader' });
    assert.equal(issue.status, 'yellow');
    assert.equal(issue.owner, 'unassigned');

    assert.throws(() => service.updateIssue(OWNER, issue.id, { status: 'red' }), ValidationError);

    const red = service.updateIssue(OWNER, issue.id, {
      status: 'red',
      statusReason: 'Capital request submitted; vendor lead time is 6 weeks',
    });
    assert.equal(red.status, 'red');
    assert.match(red.statusReason, /vendor lead time/);

    const green = service.updateIssue(OWNER, issue.id, { status: 'green', statusReason: 'Replaced' });
    assert.equal(green.status, 'green');
    assert.deepEqual(green.history.map((h) => h.status), ['yellow', 'red', 'green']);
  });

  it('filters by status and rejects unknown statuses', () => {
    const service = makeService();
    const unit = service.createUnit(OWNER, { name: 'ED' });
    service.createIssue(OWNER, { unitId: unit.id, description: 'A' });
    const b = service.createIssue(OWNER, { unitId: unit.id, description: 'B' });
    service.updateIssue(OWNER, b.id, { status: 'green' });
    assert.equal(service.listIssues(OWNER, 'yellow').length, 1);
    assert.equal(service.listIssues(OWNER, 'green').length, 1);
    assert.throws(() => service.listIssues(OWNER, 'blue'), ValidationError);
  });
});

describe('summary', () => {
  it('rolls up cadence, scores, stoplight counts, and kudos per unit', () => {
    let clock = new Date('2026-08-06T12:00:00Z');
    const service = makeService(() => clock);
    const unit = service.createUnit(OWNER, { name: '4 West', cadenceGoal: 4 });
    const tmpl = employeeTemplate(service);
    const scaleQ = tmpl.questions.find((q) => q.kind === 'scale')!;
    const base = { templateId: tmpl.id, unitId: unit.id, leader: 'D', subject: 'S' };

    // One old round (outside the 30-day window), two fresh ones.
    clock = new Date('2026-06-01T12:00:00Z');
    service.createRound(OWNER, { ...base, answers: [{ questionId: scaleQ.id, value: 1 }] });
    clock = new Date('2026-08-05T12:00:00Z');
    service.createRound(OWNER, {
      ...base,
      answers: [{ questionId: scaleQ.id, value: 4 }],
      recognitions: [{ recipient: 'P', message: 'Great catch' }],
    });
    clock = new Date('2026-08-06T09:00:00Z');
    service.createRound(OWNER, {
      ...base,
      answers: [{ questionId: scaleQ.id, value: 5 }],
      issues: [{ description: 'Thermostat stuck' }],
    });

    clock = new Date('2026-08-06T12:00:00Z');
    const s = service.summary(OWNER);
    assert.equal(s.totals.rounds, 3);
    assert.equal(s.totals.rounds30Days, 2);
    assert.deepEqual(s.totals.issues, { green: 0, yellow: 1, red: 0 });
    assert.equal(s.totals.recognitions, 1);

    const u = s.units[0]!;
    assert.equal(u.rounds30Days, 2);
    assert.equal(u.cadenceGoal, 4);
    assert.equal(u.avgScore, 4.5); // mean of 4 and 5; the June round is excluded
    assert.equal(u.openIssues, 1);
    assert.equal(u.recognitions30Days, 1);
  });
});
