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
  user = 'demo',
): Promise<{ status: number; json: any }> {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', 'x-user-id': user },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

const personal = {
  taxpayer: { firstName: 'Ada', lastName: 'Filer', ssn: '123-45-6789', birthYear: 1985, blind: false },
  address: { street: '1 Main St', city: 'Raleigh', state: 'NC', zip: '27601' },
  email: 'ada@example.com',
};

describe('TaxFile API', () => {
  it('serves the web app and health check', async () => {
    const health = await fetch(base + '/health');
    assert.equal(health.status, 200);
    const home = await fetch(base + '/');
    assert.equal(home.status, 200);
    assert.match(await home.text(), /TaxFile/);
  });

  it('walks a return from creation to acceptance', async () => {
    const created = await call('POST', '/returns');
    assert.equal(created.status, 201);
    const id = created.json.taxReturn.id;
    assert.equal(created.json.taxReturn.status, 'in-progress');
    assert.equal(created.json.computation, null); // no filing status yet

    assert.equal((await call('PUT', `/returns/${id}/personal`, personal)).status, 200);
    assert.equal(
      (await call('PUT', `/returns/${id}/filing-status`, { filingStatus: 'single' })).status,
      200,
    );

    const income = await call('PUT', `/returns/${id}/income`, {
      w2s: [{ employer: 'Acme', wages: 60000, federalWithholding: 7000 }],
    });
    assert.equal(income.status, 200);
    assert.equal(income.json.computation.refund, 1928.5);

    const review = await call('GET', `/returns/${id}/review`);
    assert.deepEqual(review.json.fileBlockers, []);

    const filed = await call('POST', `/returns/${id}/file`);
    assert.equal(filed.status, 200);
    assert.equal(filed.json.taxReturn.status, 'accepted');
    assert.match(filed.json.taxReturn.efile.submissionId, /^TF-2025-/);

    // Filed returns are immutable.
    const edit = await call('PUT', `/returns/${id}/income`, { w2s: [] });
    assert.equal(edit.status, 409);
    const refile = await call('POST', `/returns/${id}/file`);
    assert.equal(refile.status, 409);
  });

  it('refuses to file an incomplete return, listing the blockers', async () => {
    const { json } = await call('POST', '/returns');
    const res = await call('POST', `/returns/${json.taxReturn.id}/file`);
    assert.equal(res.status, 400);
    assert.match(res.json.error, /not ready to file/);
    assert.match(res.json.error, /filing status/);
  });

  it('validates input and reports friendly errors', async () => {
    const { json } = await call('POST', '/returns');
    const id = json.taxReturn.id;

    const badSsn = await call('PUT', `/returns/${id}/personal`, {
      ...personal,
      taxpayer: { ...personal.taxpayer, ssn: '12-34' },
    });
    assert.equal(badSsn.status, 400);
    assert.match(badSsn.json.error, /ssn/);

    const badStatus = await call('PUT', `/returns/${id}/filing-status`, { filingStatus: 'party' });
    assert.equal(badStatus.status, 400);

    const negative = await call('PUT', `/returns/${id}/income`, {
      w2s: [{ employer: 'A', wages: -5, federalWithholding: 0 }],
    });
    assert.equal(negative.status, 400);

    const badDiv = await call('PUT', `/returns/${id}/income`, {
      div1099s: [{ payer: 'B', ordinaryDividends: 100, qualifiedDividends: 200, capitalGainDistributions: 0, federalWithholding: 0 }],
    });
    assert.equal(badDiv.status, 400);
    assert.match(badDiv.json.error, /qualified/);
  });

  it('tracks medical expenses entry by entry and reports the AGI-floor gap', async () => {
    const { json } = await call('POST', '/returns');
    const id = json.taxReturn.id;
    await call('PUT', `/returns/${id}/filing-status`, { filingStatus: 'single' });
    await call('PUT', `/returns/${id}/income`, {
      w2s: [{ employer: 'Acme', wages: 230000, federalWithholding: 0 }],
    });

    const saved = await call('PUT', `/returns/${id}/deductions`, {
      itemized: {
        medicalExpenseEntries: [
          { date: '2025-02-01', provider: 'CVS', category: 'prescriptions', amount: 852.75 },
          { date: '2025-04-18', provider: 'Duke Health', category: 'hospital', amount: 7000 },
        ],
      },
    });
    assert.equal(saved.status, 200);
    const medical = saved.json.computation.medical;
    assert.equal(medical.totalExpenses, 7852.75);
    assert.equal(medical.agiFloor, 17250); // 7.5% of 230,000
    assert.equal(medical.deductible, 0);
    assert.equal(medical.amountToThreshold, 9397.25);
    assert.equal(saved.json.taxReturn.deductions.itemized.medicalExpenseEntries.length, 2);

    const badCategory = await call('PUT', `/returns/${id}/deductions`, {
      itemized: {
        medicalExpenseEntries: [{ date: '2025-02-01', provider: 'CVS', category: 'groceries', amount: 10 }],
      },
    });
    assert.equal(badCategory.status, 400);
    assert.match(badCategory.json.error, /category/);

    const badDate = await call('PUT', `/returns/${id}/deductions`, {
      itemized: {
        medicalExpenseEntries: [{ date: '02/01/2025', provider: 'CVS', category: 'prescriptions', amount: 10 }],
      },
    });
    assert.equal(badDate.status, 400);
    assert.match(badDate.json.error, /date/);
  });

  it('requires spouse info before filing jointly', async () => {
    const { json } = await call('POST', '/returns');
    const id = json.taxReturn.id;
    await call('PUT', `/returns/${id}/personal`, personal);
    await call('PUT', `/returns/${id}/filing-status`, { filingStatus: 'married-joint' });
    await call('PUT', `/returns/${id}/income`, {});
    const res = await call('POST', `/returns/${id}/file`);
    assert.equal(res.status, 400);
    assert.match(res.json.error, /spouse/);
  });

  it('scopes returns to the requesting user', async () => {
    const mine = await call('POST', '/returns', undefined, 'alice');
    const id = mine.json.taxReturn.id;
    const theirs = await call('GET', `/returns/${id}`, undefined, 'mallory');
    assert.equal(theirs.status, 404);

    const list = await call('GET', '/returns', undefined, 'alice');
    assert.ok(list.json.returns.some((r: any) => r.id === id));
    const otherList = await call('GET', '/returns', undefined, 'mallory');
    assert.ok(!otherList.json.returns.some((r: any) => r.id === id));
  });

  it('deletes in-progress returns but never accepted ones', async () => {
    const a = await call('POST', '/returns', undefined, 'bob');
    const del = await call('DELETE', `/returns/${a.json.taxReturn.id}`, undefined, 'bob');
    assert.equal(del.status, 200);

    const b = await call('POST', '/returns', undefined, 'bob');
    const id = b.json.taxReturn.id;
    await call('PUT', `/returns/${id}/personal`, personal, 'bob');
    await call('PUT', `/returns/${id}/filing-status`, { filingStatus: 'single' }, 'bob');
    await call('PUT', `/returns/${id}/income`, {}, 'bob');
    await call('POST', `/returns/${id}/file`, undefined, 'bob');
    const delAccepted = await call('DELETE', `/returns/${id}`, undefined, 'bob');
    assert.equal(delAccepted.status, 409);
  });
});
