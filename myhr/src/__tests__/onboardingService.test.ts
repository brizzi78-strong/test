import { test } from 'node:test';
import assert from 'node:assert/strict';

import type { PaperworkType } from '../domain/types.ts';
import { OnboardingService } from '../service/onboardingService.ts';
import { ConflictError, NotFoundError, ValidationError } from '../service/errors.ts';
import { createInMemoryStore } from '../store/store.ts';

function makeService(start = '2026-07-16T12:00:00.000Z') {
  const clock = { current: new Date(start) };
  let seq = 0;
  const service = new OnboardingService({
    store: createInMemoryStore(),
    now: () => new Date(clock.current.getTime()),
    newId: (prefix) => `${prefix}_${++seq}`,
  });
  return { service, clock };
}

const STANDARD: PaperworkType[] = ['i9', 'w4', 'direct_deposit'];

function seedPacket(service: OnboardingService, items = STANDARD) {
  const company = service.createCompany({ name: 'Acme, Inc.' });
  const employee = service.createEmployee({
    companyId: company.id,
    firstName: 'Jordan',
    lastName: 'Rivera',
    email: 'jordan.rivera@example.com',
    position: 'Warehouse Associate',
    startDate: '2026-08-01',
  });
  const template = service.createTemplate({ companyId: company.id, name: 'Full-time', items });
  const packet = service.createPacket({
    companyId: company.id,
    employeeId: employee.id,
    templateId: template.id,
  });
  return { company, employee, template, packet };
}

test('new packet starts not_started with all items assigned', () => {
  const { service } = makeService();
  const { packet } = seedPacket(service);
  assert.equal(packet.status, 'not_started');
  assert.equal(packet.items.length, 3);
  assert.ok(packet.items.every((i) => i.status === 'assigned'));
});

test('full happy path: submit all, approve all -> complete', () => {
  const { service } = makeService();
  const { packet } = seedPacket(service);

  service.submitItem(packet.id, 'i9', { signature: { name: 'Jordan Rivera' }, data: { workAuth: 'citizen' } });
  const afterOne = service.getPacket(packet.id);
  assert.equal(afterOne.status, 'in_progress');

  service.submitItem(packet.id, 'w4', { signature: { name: 'Jordan Rivera' }, data: { allowances: 1 } });
  service.submitItem(packet.id, 'direct_deposit', { data: { routing: '000', account: '111' } });
  assert.equal(service.getPacket(packet.id).status, 'submitted');

  service.approveItem(packet.id, 'i9', { reviewedBy: 'hr@acme' });
  service.approveItem(packet.id, 'w4', { reviewedBy: 'hr@acme' });
  const done = service.approveItem(packet.id, 'direct_deposit', { reviewedBy: 'hr@acme' });
  assert.equal(done.status, 'complete');
  assert.ok(done.items.every((i) => i.status === 'approved'));
});

test('signature-required forms reject submission without a signature', () => {
  const { service } = makeService();
  const { packet } = seedPacket(service);
  assert.throws(() => service.submitItem(packet.id, 'i9', { data: { workAuth: 'citizen' } }), ValidationError);
  // A data-only form submits fine without a signature.
  const p = service.submitItem(packet.id, 'direct_deposit', { data: { routing: '000' } });
  assert.equal(p.items.find((i) => i.type === 'direct_deposit')?.status, 'submitted');
});

test('captured signature carries a timestamp', () => {
  const { service } = makeService();
  const { packet } = seedPacket(service);
  const p = service.submitItem(packet.id, 'w4', { signature: { name: 'Jordan Rivera' } });
  const item = p.items.find((i) => i.type === 'w4');
  assert.equal(item?.signature?.name, 'Jordan Rivera');
  assert.equal(item?.signature?.signedAt, '2026-07-16T12:00:00.000Z');
});

test('return sends an item back and it can be resubmitted', () => {
  const { service } = makeService();
  const { packet } = seedPacket(service);
  service.submitItem(packet.id, 'i9', { signature: { name: 'Jordan Rivera' } });

  const returned = service.returnItem(packet.id, 'i9', { reviewedBy: 'hr@acme', note: 'Section 2 incomplete' });
  assert.equal(returned.items.find((i) => i.type === 'i9')?.status, 'returned');
  assert.equal(returned.status, 'in_progress');

  const resubmitted = service.submitItem(packet.id, 'i9', { signature: { name: 'Jordan Rivera' } });
  assert.equal(resubmitted.items.find((i) => i.type === 'i9')?.status, 'submitted');
});

test('cannot approve an item that has not been submitted', () => {
  const { service } = makeService();
  const { packet } = seedPacket(service);
  assert.throws(() => service.approveItem(packet.id, 'i9', { reviewedBy: 'hr@acme' }), ConflictError);
});

test('returning requires a note', () => {
  const { service } = makeService();
  const { packet } = seedPacket(service);
  service.submitItem(packet.id, 'direct_deposit', { data: {} });
  assert.throws(
    () => service.returnItem(packet.id, 'direct_deposit', { reviewedBy: 'hr@acme', note: '' }),
    ValidationError,
  );
});

test('history records every item event in order', () => {
  const { service } = makeService();
  const { packet } = seedPacket(service, ['handbook_acknowledgment']);
  service.submitItem(packet.id, 'handbook_acknowledgment', { signature: { name: 'Jordan Rivera' } });
  service.returnItem(packet.id, 'handbook_acknowledgment', { reviewedBy: 'hr@acme', note: 'wrong version' });
  service.submitItem(packet.id, 'handbook_acknowledgment', { signature: { name: 'Jordan Rivera' } });
  const done = service.approveItem(packet.id, 'handbook_acknowledgment', { reviewedBy: 'hr@acme' });
  assert.deepEqual(
    done.history.map((h) => h.event),
    ['item.submitted', 'item.returned', 'item.submitted', 'item.approved'],
  );
  assert.equal(done.status, 'complete');
});

test('cancel is allowed mid-flight but not after terminal', () => {
  const { service } = makeService();
  const { packet } = seedPacket(service);
  const canceled = service.cancelPacket(packet.id, { reason: 'offer rescinded' });
  assert.equal(canceled.status, 'canceled');
  assert.throws(() => service.cancelPacket(packet.id), ConflictError);
});

test('validation: bad email, bad date, empty template, unknown type, cross-company', () => {
  const { service } = makeService();
  const company = service.createCompany({ name: 'Acme' });

  assert.throws(
    () =>
      service.createEmployee({
        companyId: company.id,
        firstName: 'A',
        lastName: 'B',
        email: 'nope',
        position: 'Role',
        startDate: '2026-08-01',
      }),
    ValidationError,
  );
  assert.throws(
    () =>
      service.createEmployee({
        companyId: company.id,
        firstName: 'A',
        lastName: 'B',
        email: 'a.b@example.com',
        position: 'Role',
        startDate: 'August 1',
      }),
    ValidationError,
  );
  assert.throws(
    () => service.createTemplate({ companyId: company.id, name: 'Empty', items: [] }),
    ValidationError,
  );
  assert.throws(
    () => service.createTemplate({ companyId: company.id, name: 'Bad', items: ['telepathy' as PaperworkType] }),
    ValidationError,
  );

  const other = service.createCompany({ name: 'Other' });
  const emp = service.createEmployee({
    companyId: other.id,
    firstName: 'C',
    lastName: 'D',
    email: 'c.d@example.com',
    position: 'Role',
    startDate: '2026-08-01',
  });
  const tpl = service.createTemplate({ companyId: company.id, name: 'Std', items: ['i9'] });
  assert.throws(
    () => service.createPacket({ companyId: company.id, employeeId: emp.id, templateId: tpl.id }),
    ValidationError,
  );
});

test('unknown ids raise NotFoundError', () => {
  const { service } = makeService();
  assert.throws(() => service.getPacket('pkt_missing'), NotFoundError);
});

test('duplicate paperwork types in a template are de-duplicated', () => {
  const { service } = makeService();
  const company = service.createCompany({ name: 'Acme' });
  const tpl = service.createTemplate({
    companyId: company.id,
    name: 'Dupes',
    items: ['i9', 'i9', 'w4'],
  });
  assert.deepEqual(tpl.items, ['i9', 'w4']);
});
