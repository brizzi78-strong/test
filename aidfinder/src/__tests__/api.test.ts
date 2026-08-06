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

const goodProfile = {
  state: 'nc',
  degreeLevel: 'high-school-senior',
  fieldOfStudy: 'stem',
  gpa: 3.6,
  householdIncome: 48000,
  householdSize: 4,
  communityService: true,
};

describe('AidFinder API', () => {
  it('serves the web app and health check', async () => {
    const health = await fetch(base + '/health');
    assert.equal(health.status, 200);
    const home = await fetch(base + '/');
    assert.equal(home.status, 200);
    assert.match(await home.text(), /AidFinder/);
  });

  it('exposes the opportunity catalog without a profile', async () => {
    const res = await call('GET', '/opportunities');
    assert.equal(res.status, 200);
    assert.ok(res.json.opportunities.length >= 14);
  });

  it('requires a profile before matching or planning', async () => {
    assert.equal((await call('GET', '/matches')).status, 400);
    assert.equal((await call('GET', '/plan')).status, 400);
  });

  it('validates the profile', async () => {
    const badState = await call('PUT', '/profile', { ...goodProfile, state: 'North Carolina' });
    assert.equal(badState.status, 400);
    const badGpa = await call('PUT', '/profile', { ...goodProfile, gpa: 5 });
    assert.equal(badGpa.status, 400);
    const badLevel = await call('PUT', '/profile', { ...goodProfile, degreeLevel: 'phd' });
    assert.equal(badLevel.status, 400);
  });

  it('walks profile → matches → plan → tracked application → won', async () => {
    const saved = await call('PUT', '/profile', goodProfile);
    assert.equal(saved.status, 200);
    assert.equal(saved.json.profile.state, 'NC'); // normalized

    const matches = await call('GET', '/matches');
    assert.equal(matches.status, 200);
    assert.ok(matches.json.matches.length >= 8);
    assert.ok(matches.json.totalEstimated > 0);
    const ids = matches.json.matches.map((m: any) => m.opportunity.id);
    assert.ok(ids.includes('pell-grant'));
    assert.ok(ids.includes('next-nc-scholarship')); // NC resident
    assert.ok(!ids.includes('gi-bill')); // no military affiliation

    const plan = await call('GET', '/plan');
    assert.equal(plan.status, 200);
    // Dated deadlines come before rolling ones, in date order.
    const dated = plan.json.plan.filter((p: any) => p.nextDeadline !== null);
    const rollingIdx = plan.json.plan.findIndex((p: any) => p.nextDeadline === null);
    for (let i = 1; i < dated.length; i++) {
      assert.ok(dated[i - 1].nextDeadline <= dated[i].nextDeadline);
    }
    if (rollingIdx !== -1) assert.equal(rollingIdx, dated.length);

    const tracked = await call('POST', '/applications', { opportunityId: 'dell-scholars' });
    assert.equal(tracked.status, 201);
    const appId = tracked.json.id;
    assert.equal(tracked.json.status, 'planned');

    // Tracking the same opportunity twice conflicts.
    assert.equal((await call('POST', '/applications', { opportunityId: 'dell-scholars' })).status, 409);
    // Unknown opportunity is rejected.
    assert.equal((await call('POST', '/applications', { opportunityId: 'nigerian-prince' })).status, 400);

    const planned = await call('GET', '/plan');
    const dellItem = planned.json.plan.find((p: any) => p.opportunity.id === 'dell-scholars');
    assert.equal(dellItem.status, 'planned');
    assert.equal(dellItem.applicationId, appId);

    const submitted = await call('PUT', `/applications/${appId}`, { status: 'submitted' });
    assert.equal(submitted.status, 200);
    let apps = await call('GET', '/applications');
    assert.equal(apps.json.dashboard.submitted, 20000); // dell midpoint

    const won = await call('PUT', `/applications/${appId}`, { status: 'won', amountWon: 20000 });
    assert.equal(won.status, 200);
    apps = await call('GET', '/applications');
    assert.equal(apps.json.dashboard.won, 20000);
    assert.equal(apps.json.dashboard.submitted, 0);

    // Reverting the status clears the winnings.
    await call('PUT', `/applications/${appId}`, { status: 'in-progress' });
    apps = await call('GET', '/applications');
    assert.equal(apps.json.applications[0].amountWon, 0);

    const removed = await call('DELETE', `/applications/${appId}`);
    assert.equal(removed.status, 200);
    assert.equal((await call('GET', '/applications')).json.applications.length, 0);
  });

  it('keeps a tracked application in the plan after the profile stops matching it', async () => {
    await call('PUT', '/profile', goodProfile, 'u2');
    const tracked = await call('POST', '/applications', { opportunityId: 'next-nc-scholarship' }, 'u2');
    assert.equal(tracked.status, 201);
    // Move out of state: Next NC no longer matches, but the tracked app remains.
    await call('PUT', '/profile', { ...goodProfile, state: 'VA' }, 'u2');
    const matches = await call('GET', '/matches', undefined, 'u2');
    assert.ok(!matches.json.matches.some((m: any) => m.opportunity.id === 'next-nc-scholarship'));
    const plan = await call('GET', '/plan', undefined, 'u2');
    assert.ok(plan.json.plan.some((p: any) => p.opportunity.id === 'next-nc-scholarship'));
  });

  it('scopes data by user', async () => {
    await call('PUT', '/profile', goodProfile, 'alice');
    const tracked = await call('POST', '/applications', { opportunityId: 'pell-grant' }, 'alice');
    assert.equal((await call('GET', `/applications`, undefined, 'bob')).json.applications.length, 0);
    assert.equal(
      (await call('PUT', `/applications/${tracked.json.id}`, { status: 'won' }, 'bob')).status,
      404,
    );
  });

  it('gates every route except /health behind Basic auth when configured', async () => {
    const gated = createApp(createInMemoryStore(), { user: 'u', password: 'p' });
    await new Promise<void>((resolve) => gated.server.listen(0, resolve));
    const gatedBase = `http://localhost:${(gated.server.address() as AddressInfo).port}`;
    try {
      assert.equal((await fetch(gatedBase + '/health')).status, 200);
      assert.equal((await fetch(gatedBase + '/opportunities')).status, 401);
      const authed = await fetch(gatedBase + '/opportunities', {
        headers: { authorization: 'Basic ' + Buffer.from('u:p').toString('base64') },
      });
      assert.equal(authed.status, 200);
    } finally {
      gated.server.close();
    }
  });
});
