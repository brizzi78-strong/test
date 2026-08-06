import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp, type AppServer } from '../api/server.ts';
import { createInMemoryStore } from '../store/store.ts';

let app: AppServer;
let base: string;

before(async () => {
  app = createApp(createInMemoryStore());
  await new Promise<void>((resolve) => app.server.listen(0, resolve));
  base = `http://localhost:${(app.server.address() as AddressInfo).port}`;
});

after(() => app.server.close());

async function call(
  method: string,
  path: string,
  body?: unknown,
  user = 'ada',
): Promise<{ status: number; json: any }> {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', 'x-user-id': user },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

const today = new Date().toISOString().slice(0, 10);

describe('Expenses API', () => {
  it('serves the web app, health check, and policy', async () => {
    const health = await fetch(base + '/health');
    assert.equal(health.status, 200);
    const home = await fetch(base + '/');
    assert.equal(home.status, 200);
    assert.match(await home.text(), /Expenses/);
    const policy = await call('GET', '/policy');
    assert.equal(policy.json.policy.mileageRateCentsPerMile, 70);
  });

  it('auto-approves a compliant report on submit', async () => {
    const created = await call('POST', '/reports', { title: 'Client lunch' });
    assert.equal(created.status, 201);
    const id = created.json.report.id;

    const added = await call('POST', `/reports/${id}/expenses`, {
      date: today,
      category: 'meals',
      merchant: 'Bistro',
      amountCents: 2_000,
    });
    assert.equal(added.status, 201);
    assert.deepEqual(added.json.evaluation.violations, []);
    assert.equal(added.json.evaluation.autoApprovable, true);

    const submitted = await call('POST', `/reports/${id}/submit`);
    assert.equal(submitted.json.report.status, 'approved');
    assert.equal(submitted.json.report.autoApproved, true);
    assert.ok(submitted.json.report.history.some((h: any) => h.by === 'policy-engine'));
  });

  it('routes a flagged report through the approver queue', async () => {
    const { json: createdJson } = await call('POST', '/reports', {
      title: 'Conference travel',
      approverId: 'grace',
    });
    const id = createdJson.report.id;

    // $30 meal with no receipt -> MISSING_RECEIPT flag, no auto-approval.
    const added = await call('POST', `/reports/${id}/expenses`, {
      date: today,
      category: 'meals',
      merchant: 'Airport Grill',
      amountCents: 3_000,
    });
    assert.deepEqual(
      added.json.evaluation.violations.map((v: any) => v.code),
      ['MISSING_RECEIPT'],
    );

    const submitted = await call('POST', `/reports/${id}/submit`);
    assert.equal(submitted.json.report.status, 'submitted');

    const queue = await call('GET', '/approvals', undefined, 'grace');
    assert.equal(queue.json.reports.length, 1);
    assert.equal(queue.json.reports[0].report.id, id);

    // Owner cannot approve their own report even if named approver elsewhere.
    const selfApprove = await call('POST', `/reports/${id}/approve`);
    assert.equal(selfApprove.status, 403);

    const approved = await call('POST', `/reports/${id}/approve`, undefined, 'grace');
    assert.equal(approved.json.report.status, 'approved');
    assert.equal(approved.json.report.autoApproved, undefined);

    const reimbursed = await call('POST', `/reports/${id}/reimburse`, undefined, 'grace');
    assert.equal(reimbursed.json.report.status, 'reimbursed');
  });

  it('supports reject and revise-and-resubmit', async () => {
    const { json: createdJson } = await call('POST', '/reports', {
      title: 'Team dinner',
      approverId: 'grace',
    });
    const id = createdJson.report.id;
    await call('POST', `/reports/${id}/expenses`, {
      date: today,
      category: 'entertainment',
      merchant: 'Karaoke Palace',
      amountCents: 12_000,
      receipt: 'karaoke.pdf',
    });
    await call('POST', `/reports/${id}/submit`);

    const rejected = await call('POST', `/reports/${id}/reject`, { reason: 'Over the entertainment limit' }, 'grace');
    assert.equal(rejected.json.report.status, 'rejected');
    assert.equal(rejected.json.report.rejectionReason, 'Over the entertainment limit');

    const reopened = await call('POST', `/reports/${id}/reopen`);
    assert.equal(reopened.json.report.status, 'draft');
    assert.equal(reopened.json.report.rejectionReason, undefined);

    const expenseId = reopened.json.report.expenses[0].id;
    const updated = await call('PUT', `/reports/${id}/expenses/${expenseId}`, {
      date: today,
      category: 'entertainment',
      merchant: 'Karaoke Palace',
      amountCents: 9_500,
      receipt: 'karaoke.pdf',
    });
    assert.deepEqual(updated.json.evaluation.violations, []);

    const resubmitted = await call('POST', `/reports/${id}/submit`);
    assert.equal(resubmitted.json.report.status, 'approved');
    assert.equal(resubmitted.json.report.autoApproved, true);
  });

  it('computes mileage amounts server-side', async () => {
    const { json: createdJson } = await call('POST', '/reports', { title: 'Site visit' });
    const id = createdJson.report.id;
    const added = await call('POST', `/reports/${id}/expenses`, {
      date: today,
      category: 'mileage',
      merchant: 'Personal car',
      miles: 42,
    });
    assert.equal(added.json.report.expenses[0].amountCents, 2_940);
  });

  it('flags duplicates across the same user’s reports', async () => {
    const first = await call('POST', '/reports', { title: 'Week 1' }, 'dup-user');
    await call(
      'POST',
      `/reports/${first.json.report.id}/expenses`,
      { date: today, category: 'ground_transport', merchant: 'Uber', amountCents: 1_800 },
      'dup-user',
    );
    const second = await call('POST', '/reports', { title: 'Week 2' }, 'dup-user');
    const added = await call(
      'POST',
      `/reports/${second.json.report.id}/expenses`,
      { date: today, category: 'ground_transport', merchant: 'uber', amountCents: 1_800 },
      'dup-user',
    );
    assert.deepEqual(
      added.json.evaluation.violations.map((v: any) => v.code),
      ['DUPLICATE'],
    );
  });

  it('validates input and enforces ownership', async () => {
    const bad = await call('POST', '/reports', {});
    assert.equal(bad.status, 400);

    const { json: createdJson } = await call('POST', '/reports', { title: 'Mine' });
    const id = createdJson.report.id;
    const badExpense = await call('POST', `/reports/${id}/expenses`, {
      date: 'not-a-date',
      category: 'meals',
      merchant: 'X',
      amountCents: 100,
    });
    assert.equal(badExpense.status, 400);

    const stranger = await call('GET', `/reports/${id}`, undefined, 'mallory');
    assert.equal(stranger.status, 403);

    const emptySubmit = await call('POST', `/reports/${id}/submit`);
    assert.equal(emptySubmit.status, 400);

    const missing = await call('GET', '/reports/does-not-exist');
    assert.equal(missing.status, 404);
  });

  it('reports analytics per user', async () => {
    const { json } = await call('GET', '/analytics', undefined, 'dup-user');
    assert.equal(json.reportCount, 2);
    assert.equal(json.totalCents, 3_600);
    assert.equal(json.byCategory.ground_transport, 3_600);
  });
});
