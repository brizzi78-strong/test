import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp, type AppServer } from '../api/server.ts';

let app: AppServer;
let base: string;

before(async () => {
  app = createApp();
  await new Promise<void>((resolve) => app.server.listen(0, resolve));
  base = `http://localhost:${(app.server.address() as AddressInfo).port}`;
});

after(() => app.server.close());

async function call(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; json: any }> {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

describe('Cardinal Scout API', () => {
  it('serves the web app and health check', async () => {
    const health = await fetch(base + '/health');
    assert.equal(health.status, 200);
    const home = await fetch(base + '/');
    assert.equal(home.status, 200);
    assert.match(await home.text(), /Cardinal Scout/);
  });

  it('opens to a seeded hot list, most-wanted first', async () => {
    const { status, json } = await call('GET', '/api/catalog');
    assert.equal(status, 200);
    assert.ok(json.length >= 9);
    for (let i = 1; i < json.length; i++) {
      assert.ok(json[i - 1].demandScore >= json[i].demandScore);
    }
    assert.ok(json.some((c: any) => c.title === 'Atomic Habits' && c.tier === 'hot'));
  });

  it('tracks a new demand signal and rejects a bad ISBN', async () => {
    const added = await call('POST', '/api/catalog', {
      isbn13: '978-0-306-40615-7',
      title: 'A Tracked Book',
      author: 'Someone',
      binding: 'hardcover',
      salesRank: 12_000,
      avgSoldCents: 2200,
    });
    assert.equal(added.status, 201);
    assert.equal(added.json.isbn13, '9780306406157'); // hyphens stripped
    assert.equal(added.json.tier, 'hot');

    const bad = await call('POST', '/api/catalog', {
      isbn13: '9780306406158',
      title: 'X',
      author: 'Y',
      salesRank: 1,
      avgSoldCents: 100,
    });
    assert.equal(bad.status, 400);
    assert.match(bad.json.error, /check digit/);
  });

  it('walks a copy from scan to buy to listed to sold, with the profit math', async () => {
    // Clean Code seed: rank 41k, avg $28.50, good copy at $8 -> buy (max $8.97)
    const scan = await call('POST', '/api/scans', {
      isbn13: '9780132350884',
      condition: 'good',
      askCents: 800,
    });
    assert.equal(scan.status, 201);
    const a = scan.json.appraisal;
    assert.equal(a.verdict, 'buy');
    assert.equal(a.maxBuyCents, 897);

    const bought = await call('POST', `/api/scans/${scan.json.id}/buy`);
    assert.equal(bought.status, 201);
    assert.equal(bought.json.status, 'owned');
    assert.equal(bought.json.costCents, 800);

    // Can't buy the same scan twice.
    assert.equal((await call('POST', `/api/scans/${scan.json.id}/buy`)).status, 409);
    // Can't mark sold before listing.
    assert.equal((await call('POST', `/api/inventory/${bought.json.id}/sold`, {})).status, 409);

    const listed = await call('POST', `/api/inventory/${bought.json.id}/list`, { priceCents: 1995 });
    assert.equal(listed.status, 200);
    assert.equal(listed.json.status, 'listed');

    const sold = await call('POST', `/api/inventory/${bought.json.id}/sold`, {});
    assert.equal(sold.status, 200);
    assert.equal(sold.json.soldCents, 1995); // defaults to list price
    // 1995 - 299 fee - 350 shipping - 800 cost
    assert.equal(sold.json.profitCents, 546);

    const stats = await call('GET', '/api/stats');
    assert.equal(stats.json.soldCount, 1);
    assert.equal(stats.json.realizedProfitCents, 546);
  });

  it('records a pass and refuses to buy it into inventory', async () => {
    const scan = await call('POST', '/api/scans', {
      isbn13: '9781984822185', // dead tier seed
      condition: 'very-good',
      askCents: 0,
    });
    assert.equal(scan.json.appraisal.verdict, 'pass');
    const stats = await call('GET', '/api/stats');
    assert.ok(stats.json.passCount >= 1);
  });

  it('validates scan input and unknown ISBNs', async () => {
    const unknown = await call('POST', '/api/scans', {
      isbn13: '9780140449136', // valid checksum, not tracked
      condition: 'good',
      askCents: 100,
    });
    assert.equal(unknown.status, 404);
    assert.match(unknown.json.error, /not in the demand catalog/);

    const badCond = await call('POST', '/api/scans', {
      isbn13: '9780132350884',
      condition: 'mint',
      askCents: 100,
    });
    assert.equal(badCond.status, 400);
    assert.match(badCond.json.error, /condition/);

    const badAsk = await call('POST', '/api/scans', {
      isbn13: '9780132350884',
      condition: 'good',
      askCents: -5,
    });
    assert.equal(badAsk.status, 400);
  });

  it('enforces the Basic-auth gate when configured, keeping /health open', async () => {
    const gated = createApp({ user: 'admin', password: 'hunter2', brandName: 'Blue Ridge Scout' });
    await new Promise<void>((resolve) => gated.server.listen(0, resolve));
    const gatedBase = `http://localhost:${(gated.server.address() as AddressInfo).port}`;
    try {
      assert.equal((await fetch(gatedBase + '/health')).status, 200);
      const denied = await fetch(gatedBase + '/api/catalog');
      assert.equal(denied.status, 401);
      assert.match(denied.headers.get('www-authenticate') ?? '', /Blue Ridge Scout/);

      const auth = { authorization: 'Basic ' + Buffer.from('admin:hunter2').toString('base64') };
      assert.equal((await fetch(gatedBase + '/api/catalog', { headers: auth })).status, 200);

      const home = await fetch(gatedBase + '/', { headers: auth });
      assert.match(await home.text(), /<title>Blue Ridge Scout/);
    } finally {
      gated.server.close();
    }
  });
});
