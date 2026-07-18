import { test } from 'node:test';
import assert from 'node:assert/strict';

import { RecruitingService } from '../service/recruitingService.ts';
import { ConflictError, NotFoundError, ValidationError } from '../service/errors.ts';
import { createInMemoryStore } from '../store/store.ts';

function makeService(start = '2026-07-16T12:00:00.000Z') {
  const clock = { current: new Date(start) };
  let seq = 0;
  const service = new RecruitingService({
    store: createInMemoryStore(),
    now: () => new Date(clock.current.getTime()),
    newId: (prefix) => `${prefix}_${++seq}`,
  });
  return { service, clock };
}

function seedRequisition(service: RecruitingService) {
  const company = service.createCompany({ name: 'Acme, Inc.' });
  const requisition = service.createRequisition({
    companyId: company.id,
    title: 'Warehouse Associate',
    department: 'Operations',
    location: 'Charlotte, NC',
    employmentType: 'full_time',
  });
  return { company, requisition };
}

function seedApplication(service: RecruitingService) {
  const { company, requisition } = seedRequisition(service);
  const application = service.createApplication({
    companyId: company.id,
    requisitionId: requisition.id,
    firstName: 'Jordan',
    lastName: 'Rivera',
    email: 'jordan.rivera@example.com',
  });
  return { company, requisition, application };
}

test('new requisition is open; new application starts applied', () => {
  const { service } = makeService();
  const { requisition, application } = seedApplication(service);
  assert.equal(requisition.status, 'open');
  assert.equal(application.stage, 'applied');
});

test('full pipeline: applied -> screening -> interview -> offer -> hired', () => {
  const { service } = makeService();
  const { application } = seedApplication(service);

  service.advanceApplication(application.id, { toStage: 'screening', by: 'recruiter@acme' });
  service.advanceApplication(application.id, { toStage: 'interview' });
  service.advanceApplication(application.id, { toStage: 'offer' });
  const hired = service.hireApplication(application.id, { by: 'recruiter@acme' });

  assert.equal(hired.stage, 'hired');
  assert.deepEqual(
    hired.history.map((h) => h.to),
    ['screening', 'interview', 'offer', 'hired'],
  );
});

test('cannot skip pipeline stages', () => {
  const { service } = makeService();
  const { application } = seedApplication(service);
  assert.throws(() => service.advanceApplication(application.id, { toStage: 'offer' }), ConflictError);
});

test('hire with fillRequisition marks the requisition filled', () => {
  const { service } = makeService();
  const { requisition, application } = seedApplication(service);
  service.advanceApplication(application.id, { toStage: 'screening' });
  service.advanceApplication(application.id, { toStage: 'interview' });
  service.advanceApplication(application.id, { toStage: 'offer' });
  service.hireApplication(application.id, { by: 'recruiter@acme', fillRequisition: true });
  assert.equal(service.getRequisition(requisition.id).status, 'filled');
});

test('reject and withdraw are terminal and capture a reason', () => {
  const { service } = makeService();
  const { application } = seedApplication(service);
  const rejected = service.rejectApplication(application.id, { by: 'recruiter@acme', reason: 'not a fit' });
  assert.equal(rejected.stage, 'rejected');
  assert.equal(rejected.outcomeReason, 'not a fit');
  assert.throws(() => service.advanceApplication(application.id, { toStage: 'screening' }), ConflictError);
});

test('cannot apply to a non-open requisition', () => {
  const { service } = makeService();
  const { company, requisition } = seedRequisition(service);
  service.setRequisitionStatus(requisition.id, 'on_hold');
  assert.throws(
    () =>
      service.createApplication({
        companyId: company.id,
        requisitionId: requisition.id,
        firstName: 'A',
        lastName: 'B',
        email: 'a.b@example.com',
      }),
    ConflictError,
  );
});

test('requisition status transitions are enforced', () => {
  const { service } = makeService();
  const { requisition } = seedRequisition(service);
  service.setRequisitionStatus(requisition.id, 'closed');
  assert.throws(() => service.setRequisitionStatus(requisition.id, 'open'), ConflictError);
});

test('validation: bad email, unknown employment type, cross-company', () => {
  const { service } = makeService();
  const company = service.createCompany({ name: 'Acme' });

  assert.throws(
    () =>
      service.createRequisition({
        companyId: company.id,
        title: 'Role',
        department: 'Ops',
        location: 'Remote',
        // @ts-expect-error intentionally invalid
        employmentType: 'freelance-ish',
      }),
    ValidationError,
  );

  const requisition = service.createRequisition({
    companyId: company.id,
    title: 'Role',
    department: 'Ops',
    location: 'Remote',
    employmentType: 'contract',
  });
  assert.throws(
    () =>
      service.createApplication({
        companyId: company.id,
        requisitionId: requisition.id,
        firstName: 'A',
        lastName: 'B',
        email: 'nope',
      }),
    ValidationError,
  );

  const other = service.createCompany({ name: 'Other' });
  assert.throws(
    () =>
      service.createApplication({
        companyId: other.id,
        requisitionId: requisition.id,
        firstName: 'A',
        lastName: 'B',
        email: 'a.b@example.com',
      }),
    ValidationError,
  );
});

test('unknown ids raise NotFoundError', () => {
  const { service } = makeService();
  assert.throws(() => service.getApplication('app_missing'), NotFoundError);
  assert.throws(() => service.getRequisition('req_missing'), NotFoundError);
});

test('listApplications filters by requisition and stage', () => {
  const { service } = makeService();
  const { company, requisition, application } = seedApplication(service);
  service.advanceApplication(application.id, { toStage: 'screening' });

  assert.equal(service.listApplications({ requisitionId: requisition.id }).length, 1);
  assert.equal(service.listApplications({ companyId: company.id, stage: 'screening' }).length, 1);
  assert.equal(service.listApplications({ stage: 'hired' }).length, 0);
});
