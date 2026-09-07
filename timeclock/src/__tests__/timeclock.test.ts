import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TimeclockService } from '../service/timeclockService.ts';
import { ValidationError, NotFoundError } from '../service/errors.ts';
import { createInMemoryStore } from '../store/store.ts';

function make() {
  let seq = 0;
  return new TimeclockService({
    store: createInMemoryStore(),
    now: () => new Date('2026-01-10T00:00:00.000Z'),
    newId: (p) => `${p}_${++seq}`,
  });
}

test('records hours as minutes and totals a pay period', () => {
  const svc = make();
  svc.addEntry({ companyId: 'co1', employeeId: 'e1', date: '2026-01-05', hours: 8 });
  svc.addEntry({ companyId: 'co1', employeeId: 'e1', date: '2026-01-06', hours: 7.5 });
  svc.addEntry({ companyId: 'co1', employeeId: 'e1', date: '2026-01-20', hours: 8 }); // outside the period
  svc.addEntry({ companyId: 'co1', employeeId: 'e2', date: '2026-01-06', hours: 9 }); // other employee

  const sum = svc.summary('e1', '2026-01-01', '2026-01-15');
  assert.equal(sum.entries, 2);
  assert.equal(sum.minutes, 8 * 60 + 450);
  assert.equal(sum.hours, 15.5); // 8 + 7.5, nothing from outside the window or e2
});

test('list filters by employee and date range, sorted by date', () => {
  const svc = make();
  svc.addEntry({ companyId: 'co1', employeeId: 'e1', date: '2026-01-06', hours: 8 });
  svc.addEntry({ companyId: 'co1', employeeId: 'e1', date: '2026-01-05', hours: 8 });
  const list = svc.listEntries({ employeeId: 'e1', from: '2026-01-01', to: '2026-01-15' });
  assert.deepEqual(list.map((e) => e.date), ['2026-01-05', '2026-01-06']);
});

test('delete removes an entry; deleting a missing one throws', () => {
  const svc = make();
  const e = svc.addEntry({ companyId: 'co1', employeeId: 'e1', date: '2026-01-06', hours: 8 });
  svc.deleteEntry(e.id);
  assert.equal(svc.listEntries({ employeeId: 'e1' }).length, 0);
  assert.throws(() => svc.deleteEntry(e.id), NotFoundError);
});

test('rejects bad input', () => {
  const svc = make();
  assert.throws(() => svc.addEntry({ companyId: 'co1', employeeId: 'e1', date: 'nope', hours: 8 }), ValidationError);
  assert.throws(() => svc.addEntry({ companyId: 'co1', employeeId: 'e1', date: '2026-01-06', hours: 0 }), ValidationError);
  assert.throws(() => svc.addEntry({ companyId: 'co1', employeeId: 'e1', date: '2026-01-06', hours: 25 }), ValidationError);
  assert.throws(() => svc.summary('e1', 'nope', '2026-01-15'), ValidationError);
});
