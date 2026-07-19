import { test } from 'node:test';
import assert from 'node:assert/strict';

import { BookingService } from '../service/bookingService.ts';
import { createInMemoryStore } from '../store/store.ts';
import { ConflictError, NotFoundError, ValidationError } from '../service/errors.ts';

function svc() {
  let seq = 0;
  return new BookingService({
    store: createInMemoryStore(),
    now: () => new Date('2026-07-20T00:00:00.000Z'),
    newId: (p) => `${p}_${++seq}`,
  });
}

function setup(s: BookingService) {
  const co = s.createCompany({ name: 'Serenity Massage' });
  const service = s.createService({ companyId: co.id, name: '60-min massage', durationMinutes: 60, priceCents: 9000 });
  const worker = s.createWorker({ companyId: co.id, name: 'Robin', licenseState: 'NC', licenseNumber: 'DL12345678' });
  return { co, service, worker };
}

test('an appointment derives its end from the service duration', () => {
  const s = svc();
  const { co, service } = setup(s);
  const a = s.requestAppointment({ companyId: co.id, serviceId: service.id, clientName: 'Pat', start: '2026-08-01T15:00:00.000Z' });
  assert.equal(a.status, 'requested');
  assert.equal(a.durationMinutes, 60);
  assert.equal(a.end, '2026-08-01T16:00:00.000Z');
});

test('a worker cannot be double-booked into an overlapping slot', () => {
  const s = svc();
  const { co, service, worker } = setup(s);
  const a = s.requestAppointment({ companyId: co.id, serviceId: service.id, clientName: 'A', start: '2026-08-01T15:00:00.000Z' });
  s.confirmAppointment(a.id, { workerId: worker.id });

  // Overlaps 15:00–16:00 → rejected.
  const b = s.requestAppointment({ companyId: co.id, serviceId: service.id, clientName: 'B', start: '2026-08-01T15:30:00.000Z' });
  assert.throws(() => s.confirmAppointment(b.id, { workerId: worker.id }), ConflictError);

  // Back-to-back at 16:00 is allowed (touching endpoints don't overlap).
  const c = s.requestAppointment({ companyId: co.id, serviceId: service.id, clientName: 'C', start: '2026-08-01T16:00:00.000Z' });
  assert.doesNotThrow(() => s.confirmAppointment(c.id, { workerId: worker.id }));
});

test('a cancelled appointment frees the worker’s slot', () => {
  const s = svc();
  const { co, service, worker } = setup(s);
  const a = s.requestAppointment({ companyId: co.id, serviceId: service.id, clientName: 'A', start: '2026-08-01T15:00:00.000Z' });
  s.confirmAppointment(a.id, { workerId: worker.id });
  s.cancelAppointment(a.id);
  const b = s.requestAppointment({ companyId: co.id, serviceId: service.id, clientName: 'B', start: '2026-08-01T15:00:00.000Z' });
  assert.doesNotThrow(() => s.confirmAppointment(b.id, { workerId: worker.id }));
});

test('confirm requires a worker; status machine is enforced', () => {
  const s = svc();
  const { co, service, worker } = setup(s);
  const a = s.requestAppointment({ companyId: co.id, serviceId: service.id, clientName: 'A', start: '2026-08-01T15:00:00.000Z' });
  assert.throws(() => s.confirmAppointment(a.id), ValidationError); // no worker assigned
  s.confirmAppointment(a.id, { workerId: worker.id });
  s.completeAppointment(a.id);
  assert.throws(() => s.cancelAppointment(a.id), ConflictError); // completed is terminal
});

test('reschedule moves the time and re-checks for clashes', () => {
  const s = svc();
  const { co, service, worker } = setup(s);
  const a = s.requestAppointment({ companyId: co.id, serviceId: service.id, clientName: 'A', start: '2026-08-01T15:00:00.000Z' });
  s.confirmAppointment(a.id, { workerId: worker.id });
  const b = s.requestAppointment({ companyId: co.id, serviceId: service.id, clientName: 'B', start: '2026-08-01T18:00:00.000Z' });
  s.confirmAppointment(b.id, { workerId: worker.id });
  // Moving B onto A's slot clashes.
  assert.throws(() => s.rescheduleAppointment(b.id, { start: '2026-08-01T15:30:00.000Z' }), ConflictError);
  // Moving to a free slot works and updates end.
  const moved = s.rescheduleAppointment(b.id, { start: '2026-08-02T09:00:00.000Z' });
  assert.equal(moved.end, '2026-08-02T10:00:00.000Z');
});

test('license numbers are masked when a worker is returned', () => {
  const s = svc();
  const { worker } = setup(s);
  assert.equal(worker.licenseNumber, '••••5678');
  assert.equal(s.getWorker(worker.id).licenseNumber, '••••5678');
});

test('references are captured and their responses recorded', () => {
  const s = svc();
  const { co, worker } = setup(s);
  const ref = s.addReference({ companyId: co.id, workerId: worker.id, refereeName: 'Dr. Kim', relationship: 'Former manager', phone: '555-0100' });
  assert.equal(ref.status, 'requested');
  const done = s.recordReference(ref.id, { status: 'received', rating: 5, notes: 'Excellent, would rehire' });
  assert.equal(done.status, 'received');
  assert.equal(done.rating, 5);
  assert.throws(() => s.recordReference(ref.id, { status: 'received', rating: 9 }), ValidationError);
  assert.equal(s.listReferences({ workerId: worker.id }).length, 1);
});

test('cross-company references and services are rejected', () => {
  const s = svc();
  const { co } = setup(s);
  const other = s.createCompany({ name: 'Other Co' });
  const otherWorker = s.createWorker({ companyId: other.id, name: 'Sam' });
  assert.throws(
    () => s.addReference({ companyId: co.id, workerId: otherWorker.id, refereeName: 'X', relationship: 'Y' }),
    ValidationError,
  );
  assert.throws(() => s.getAppointment('nope'), NotFoundError);
});

test('the schedule lists a company’s appointments in time order within a window', () => {
  const s = svc();
  const { co, service, worker } = setup(s);
  const mk = (start: string, name: string) => {
    const a = s.requestAppointment({ companyId: co.id, serviceId: service.id, clientName: name, start });
    s.confirmAppointment(a.id, { workerId: worker.id });
  };
  mk('2026-08-02T09:00:00.000Z', 'later');
  mk('2026-08-01T09:00:00.000Z', 'earlier');
  const day1 = s.listAppointments({ companyId: co.id, from: '2026-08-01T00:00:00.000Z', to: '2026-08-02T00:00:00.000Z' });
  assert.equal(day1.length, 1);
  assert.equal(day1[0].clientName, 'earlier');
  const all = s.listAppointments({ companyId: co.id });
  assert.deepEqual(all.map((a) => a.clientName), ['earlier', 'later']);
});
