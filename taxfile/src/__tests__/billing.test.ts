import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { createApp, type AppServer } from '../api/server.ts';
import { verifyStripeSignature } from '../service/billingService.ts';
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
  headers: Record<string, string> = {},
): Promise<{ status: number; json: any }> {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

describe('accounts', () => {
  it('registers, logs in, and resolves the session as the owner of returns', async () => {
    const reg = await call('POST', '/auth/register', { email: 'ada@example.com', password: 'hunter2222' });
    assert.equal(reg.status, 201);
    assert.equal(reg.json.user.plan, 'free');
    assert.ok(reg.json.token);
    assert.equal(reg.json.user.passwordHash, undefined); // never leaked

    const auth = { authorization: `Bearer ${reg.json.token}` };
    const mine = await call('POST', '/returns', {}, auth);
    assert.equal(mine.json.taxReturn.ownerId, reg.json.user.id);

    // A different user cannot see it, even via the header fallback.
    const other = await call('GET', `/returns/${mine.json.taxReturn.id}`, undefined, {
      'x-user-id': 'someone-else',
    });
    assert.equal(other.status, 404);

    const login = await call('POST', '/auth/login', { email: 'ADA@example.com', password: 'hunter2222' });
    assert.equal(login.status, 200);
    assert.equal(login.json.user.id, reg.json.user.id);

    const me = await call('GET', '/auth/me', undefined, { authorization: `Bearer ${login.json.token}` });
    assert.equal(me.json.user.email, 'ada@example.com');
  });

  it('rejects duplicate emails, bad credentials, and weak passwords', async () => {
    await call('POST', '/auth/register', { email: 'bob@example.com', password: 'longenough1' });
    assert.equal(
      (await call('POST', '/auth/register', { email: 'bob@example.com', password: 'longenough2' })).status,
      409,
    );
    assert.equal(
      (await call('POST', '/auth/login', { email: 'bob@example.com', password: 'wrongwrong' })).status,
      401,
    );
    assert.equal(
      (await call('POST', '/auth/login', { email: 'ghost@example.com', password: 'whatever123' })).status,
      401,
    );
    assert.equal(
      (await call('POST', '/auth/register', { email: 'carol@example.com', password: 'short' })).status,
      400,
    );
  });

  it('logout invalidates the session token', async () => {
    const reg = await call('POST', '/auth/register', { email: 'dan@example.com', password: 'longenough1' });
    const auth = { authorization: `Bearer ${reg.json.token}` };
    await call('POST', '/auth/logout', {}, auth);
    // Token no longer resolves; identity falls back to the demo header user.
    const me = await call('GET', '/auth/me', undefined, auth);
    assert.equal(me.json.user.id, 'demo');
  });
});

describe('billing and entitlements', () => {
  async function readyReturn(user: string): Promise<string> {
    const headers = { 'x-user-id': user };
    const { json } = await call('POST', '/returns', {}, headers);
    const id = json.taxReturn.id;
    await call('PUT', `/returns/${id}/filing-status`, { filingStatus: 'single' }, headers);
    await call('PUT', `/returns/${id}/income`, {
      w2s: [{ employer: 'Acme', wages: 90000, federalWithholding: 8000 }],
    }, headers);
    return id;
  }

  it('gates scenarios behind the Pro plan with a 402', async () => {
    const id = await readyReturn('freeloader');
    const denied = await call('GET', `/returns/${id}/scenarios`, undefined, { 'x-user-id': 'freeloader' });
    assert.equal(denied.status, 402);
    assert.match(denied.json.error, /Pro feature/);
  });

  it('dev-mode upgrade unlocks scenarios immediately', async () => {
    const id = await readyReturn('buyer');
    const up = await call('POST', '/billing/upgrade', {}, { 'x-user-id': 'buyer' });
    assert.equal(up.status, 200);
    assert.equal(up.json.mode, 'dev');
    assert.equal(up.json.plan, 'pro');

    const res = await call('GET', `/returns/${id}/scenarios`, undefined, { 'x-user-id': 'buyer' });
    assert.equal(res.status, 200);
    const ids = res.json.scenarios.map((s: any) => s.id);
    assert.ok(ids.includes('ira-headroom'));
    assert.ok(ids.includes('next-1000'));
    // 90k wages with only 8k withheld owes money -> payment-planning scenarios.
    assert.ok(ids.includes('quarterly-payments'));
    assert.ok(ids.includes('withholding-fix'));

    const ira = res.json.scenarios.find((s: any) => s.id === 'ira-headroom');
    assert.ok(ira.savings > 0, 'maxing the IRA should save tax at this income');
  });

  it('a signed Stripe webhook flips the plan; a forged one is rejected', async () => {
    const secret = 'whsec_test';
    const webhookApp = createApp(createInMemoryStore(), {
      billing: { stripeWebhookSecret: secret },
    });
    await new Promise<void>((resolve) => webhookApp.server.listen(0, resolve));
    const whBase = `http://localhost:${(webhookApp.server.address() as AddressInfo).port}`;
    try {
      const payload = JSON.stringify({
        type: 'checkout.session.completed',
        data: { object: { client_reference_id: 'subscriber-1', customer: 'cus_123' } },
      });
      const t = '1700000000';
      const v1 = createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');

      const good = await fetch(whBase + '/billing/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': `t=${t},v1=${v1}` },
        body: payload,
      });
      assert.equal(good.status, 200);
      assert.equal((await good.json() as any).applied, true);
      assert.equal(webhookApp.accounts.planFor('subscriber-1'), 'pro');

      const forged = await fetch(whBase + '/billing/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': `t=${t},v1=${'0'.repeat(64)}` },
        body: payload,
      });
      assert.equal(forged.status, 400);
    } finally {
      webhookApp.server.close();
    }
  });

  it('verifyStripeSignature rejects malformed headers', () => {
    assert.equal(verifyStripeSignature('{}', undefined, 's'), false);
    assert.equal(verifyStripeSignature('{}', 'nonsense', 's'), false);
  });
});

describe('tax year selection', () => {
  it('computes 2026 returns with 2026 parameters', async () => {
    const h = { 'x-user-id': 'planner' };
    const y26 = await call('POST', '/returns', { taxYear: 2026 }, h);
    assert.equal(y26.json.taxReturn.taxYear, 2026);
    const id = y26.json.taxReturn.id;
    await call('PUT', `/returns/${id}/filing-status`, { filingStatus: 'single' }, h);
    const res = await call('PUT', `/returns/${id}/income`, {
      w2s: [{ employer: 'Acme', wages: 60000, federalWithholding: 7000 }],
    }, h);
    // 2026: 60,000 - 16,100 std = 43,900 taxable;
    // 12,400*10% + (43,900-12,400)*12% = 1,240 + 3,780 = 5,020.
    assert.equal(res.json.computation.deduction, 16100);
    assert.equal(res.json.computation.incomeTax, 5020);

    // Same numbers in 2025 tax more (smaller deduction, tighter brackets).
    const y25 = await call('POST', '/returns', {}, h);
    const id25 = y25.json.taxReturn.id;
    await call('PUT', `/returns/${id25}/filing-status`, { filingStatus: 'single' }, h);
    const res25 = await call('PUT', `/returns/${id25}/income`, {
      w2s: [{ employer: 'Acme', wages: 60000, federalWithholding: 7000 }],
    }, h);
    assert.ok(res25.json.computation.incomeTax > res.json.computation.incomeTax);
  });

  it('rejects unsupported years', async () => {
    const res = await call('POST', '/returns', { taxYear: 2019 });
    assert.equal(res.status, 400);
    assert.match(res.json.error, /2025, 2026/);
  });
});

describe('SSN-free estimates', () => {
  it('accepts personal info without SSN or address, and validates SSN when given', async () => {
    const h = { 'x-user-id': 'private' };
    const { json } = await call('POST', '/returns', {}, h);
    const id = json.taxReturn.id;

    const minimal = await call('PUT', `/returns/${id}/personal`, {
      taxpayer: { firstName: 'Ada', lastName: 'Filer', birthYear: 1985 },
      email: 'ada@example.com',
    }, h);
    assert.equal(minimal.status, 200);
    assert.equal(minimal.json.taxReturn.personal.taxpayer.ssn, undefined);
    assert.equal(minimal.json.taxReturn.personal.address, undefined);

    const bad = await call('PUT', `/returns/${id}/personal`, {
      taxpayer: { firstName: 'Ada', lastName: 'Filer', birthYear: 1985, ssn: '12-34' },
      email: 'ada@example.com',
    }, h);
    assert.equal(bad.status, 400);
    assert.match(bad.json.error, /ssn/);
  });
});
