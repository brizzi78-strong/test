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

describe('Cardinal Rounds API', () => {
  it('serves the web app and health check', async () => {
    const health = await fetch(base + '/health');
    assert.equal(health.status, 200);
    const home = await fetch(base + '/');
    assert.equal(home.status, 200);
    assert.match(await home.text(), /Cardinal Rounds/);
  });

  it('walks the full loop: unit -> round -> stoplight -> recognition -> summary', async () => {
    const unit = await call('POST', '/units', { name: '4 West', cadenceGoal: 8 });
    assert.equal(unit.status, 201);

    const templates = await call('GET', '/templates');
    assert.equal(templates.status, 200);
    const tmpl = templates.json.templates.find((t: any) => t.audience === 'employee');
    const scaleQ = tmpl.questions.find((q: any) => q.kind === 'scale');

    const round = await call('POST', '/rounds', {
      unitId: unit.json.id,
      templateId: tmpl.id,
      leader: 'Dana',
      subject: 'Sam RN',
      answers: [{ questionId: scaleQ.id, value: 4 }],
      issues: [{ description: 'Supply room missing IV pumps', owner: 'Materials' }],
      recognitions: [{ recipient: 'Priya', message: 'Covered a sick call' }],
    });
    assert.equal(round.status, 201);
    const issueId = round.json.issues[0].id;

    // Red requires a reason.
    const noReason = await call('PUT', `/issues/${issueId}`, { status: 'red' });
    assert.equal(noReason.status, 400);
    const red = await call('PUT', `/issues/${issueId}`, {
      status: 'red',
      statusReason: 'Backordered until October',
    });
    assert.equal(red.status, 200);
    assert.equal(red.json.status, 'red');

    const redList = await call('GET', '/issues?status=red');
    assert.equal(redList.json.issues.length, 1);

    const recognitions = await call('GET', '/recognitions');
    assert.equal(recognitions.json.recognitions[0].recipient, 'Priya');

    const summary = await call('GET', '/summary');
    assert.equal(summary.status, 200);
    assert.equal(summary.json.totals.rounds, 1);
    assert.equal(summary.json.totals.issues.red, 1);
    assert.equal(summary.json.units[0].unitName, '4 West');
    assert.equal(summary.json.units[0].avgScore, 4);
  });

  it('keeps tenants separate and 404s on unknown resources', async () => {
    const other = await call('GET', '/units', undefined, 'someone-else');
    assert.equal(other.json.units.length, 0);
    const missing = await call('GET', '/rounds/nope');
    assert.equal(missing.status, 404);
  });

  it('rejects malformed JSON and unknown routes', async () => {
    const res = await fetch(base + '/units', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{oops',
    });
    assert.equal(res.status, 400);
    const nowhere = await call('GET', '/nope');
    assert.equal(nowhere.status, 404);
  });
});
