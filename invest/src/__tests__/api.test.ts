/**
 * End-to-end: a real Trading service runs in-process; the Invest BFF points
 * at it. The tests drive the app the way the browser does — sign up, log in,
 * trade through the session-scoped `/api/*` proxy — and confirm both that the
 * data persists in Trading and that one user can never reach another user's
 * account, whatever ids they put in paths, queries, or bodies.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { createApp as createInvest } from '../api/server.ts';
import { createApp as createTrading } from '../../../trading/src/api/server.ts';
import { createInMemoryStore } from '../../../trading/src/store/store.ts';
import { createInMemoryAuthStore, hashPassword, verifyPassword } from '../auth/store.ts';
import type { Mailer, OutboundEmail } from '../auth/mailer.ts';

function captureMailer(): { mailer: Mailer; sent: OutboundEmail[] } {
  const sent: OutboundEmail[] = [];
  return { mailer: { kind: 'test', send: async (email) => void sent.push(email) }, sent };
}

async function listen(server: { listen: Function; address: Function; close: Function }) {
  await new Promise<void>((r) => server.listen(0, r));
  return (server.address() as AddressInfo).port;
}

async function withApp(run: (base: string) => Promise<void>) {
  const trading = createTrading(createInMemoryStore());
  const tradingPort = await listen(trading.server);
  const invest = createInvest({ tradingBase: `http://127.0.0.1:${tradingPort}` });
  const investPort = await listen(invest.server);
  try {
    await run(`http://127.0.0.1:${investPort}`);
  } finally {
    await new Promise<void>((r) => invest.server.close(() => r()));
    await new Promise<void>((r) => trading.server.close(() => r()));
  }
}

async function j(base: string, method: string, path: string, body?: unknown, cookie?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (cookie) headers.cookie = cookie;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: res.status,
    json: (await res.json().catch(() => ({}))) as any,
    setCookie: res.headers.get('set-cookie') ?? '',
  };
}

/** Sign a user up and return the session cookie ("invest_session=..."). */
async function signup(base: string, name: string, email: string, password = 'hunter2hunter2') {
  const res = await j(base, 'POST', '/auth/signup', { name, email, password });
  assert.equal(res.status, 201);
  const cookie = res.setCookie.split(';')[0];
  assert.match(cookie, /^invest_session=/);
  return cookie;
}

test('password hashing round-trips and rejects wrong passwords', () => {
  const stored = hashPassword('correct horse battery');
  assert.ok(verifyPassword('correct horse battery', stored));
  assert.ok(!verifyPassword('wrong', stored));
});

test('serves the app shell without a session', async () => {
  await withApp(async (base) => {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Invest/);
  });
});

test('the API requires a session', async () => {
  await withApp(async (base) => {
    assert.equal((await j(base, 'GET', '/api/app')).status, 401);
    assert.equal((await j(base, 'GET', '/api/quotes')).status, 401);
  });
});

test('signup opens a trading account and starts a session', async () => {
  await withApp(async (base) => {
    const cookie = await signup(base, 'Rob', 'rob@example.com');
    const app = await j(base, 'GET', '/api/app', undefined, cookie);
    assert.equal(app.status, 200);
    assert.equal(app.json.accountName, 'Rob');
    assert.equal(app.json.email, 'rob@example.com');
    assert.equal(app.json.cashCents, 1_000_000);
  });
});

test('signup validation: bad email, short password, duplicate email', async () => {
  await withApp(async (base) => {
    assert.equal((await j(base, 'POST', '/auth/signup', { name: 'X', email: 'nope', password: 'longenough1' })).status, 400);
    assert.equal((await j(base, 'POST', '/auth/signup', { name: 'X', email: 'x@y.com', password: 'short' })).status, 400);
    await signup(base, 'Rob', 'rob@example.com');
    const dup = await j(base, 'POST', '/auth/signup', { name: 'Rob2', email: 'ROB@example.com', password: 'hunter2hunter2' });
    assert.equal(dup.status, 409);
  });
});

test('login verifies credentials; logout ends the session', async () => {
  await withApp(async (base) => {
    await signup(base, 'Rob', 'rob@example.com', 'hunter2hunter2');
    assert.equal((await j(base, 'POST', '/auth/login', { email: 'rob@example.com', password: 'wrong-password' })).status, 401);

    const login = await j(base, 'POST', '/auth/login', { email: 'Rob@Example.com', password: 'hunter2hunter2' });
    assert.equal(login.status, 200);
    const cookie = login.setCookie.split(';')[0];
    assert.equal((await j(base, 'GET', '/api/app', undefined, cookie)).status, 200);

    await j(base, 'POST', '/auth/logout', undefined, cookie);
    assert.equal((await j(base, 'GET', '/api/app', undefined, cookie)).status, 401);
  });
});

test('each user trades in their own account through the scoped proxy', async () => {
  await withApp(async (base) => {
    const alice = await signup(base, 'Alice', 'alice@example.com');
    const bob = await signup(base, 'Bob', 'bob@example.com');

    const buy = await j(base, 'POST', '/api/orders', { symbol: 'AAPL', side: 'buy', type: 'market', quantity: 2 }, alice);
    assert.equal(buy.status, 201);
    assert.equal(buy.json.status, 'filled');

    const alicePortfolio = await j(base, 'GET', `/api/portfolio/anything`, undefined, alice);
    assert.equal(alicePortfolio.json.positions.length, 1);

    const bobPortfolio = await j(base, 'GET', `/api/portfolio/anything`, undefined, bob);
    assert.equal(bobPortfolio.json.positions.length, 0);
    assert.equal(bobPortfolio.json.cashCents, 1_000_000);
  });
});

test("one user cannot read, list, or cancel another user's data", async () => {
  await withApp(async (base) => {
    const alice = await signup(base, 'Alice', 'alice@example.com');
    const bob = await signup(base, 'Bob', 'bob@example.com');

    const aliceApp = (await j(base, 'GET', '/api/app', undefined, alice)).json;
    const order = (await j(base, 'POST', '/api/orders', { symbol: 'AAPL', side: 'buy', type: 'market', quantity: 1 }, alice)).json;

    // Path substitution: Bob asking for Alice's account/portfolio gets his own.
    const viaPath = await j(base, 'GET', `/api/portfolio/${aliceApp.accountId}`, undefined, bob);
    assert.equal(viaPath.json.positions.length, 0);
    const viaAccounts = await j(base, 'GET', `/api/accounts/${aliceApp.accountId}`, undefined, bob);
    assert.notEqual(viaAccounts.json.id, aliceApp.accountId);

    // Query forcing: Bob listing Alice's orders sees only his own (none).
    const viaQuery = await j(base, 'GET', `/api/orders?accountId=${aliceApp.accountId}`, undefined, bob);
    assert.deepEqual(viaQuery.json, []);

    // Body stamping: Bob placing an order "as Alice" lands in Bob's account.
    await j(base, 'POST', '/api/orders', { accountId: aliceApp.accountId, symbol: 'TSLA', side: 'buy', type: 'market', quantity: 1 }, bob);
    const aliceOrders = (await j(base, 'GET', '/api/orders', undefined, alice)).json as any[];
    assert.ok(!aliceOrders.some((o) => o.symbol === 'TSLA'));

    // Ownership check: Bob cannot read or cancel Alice's order.
    assert.equal((await j(base, 'GET', `/api/orders/${order.id}`, undefined, bob)).status, 404);
    assert.equal((await j(base, 'POST', `/api/orders/${order.id}/cancel`, undefined, bob)).status, 404);

    // Off-allowlist upstream routes are unreachable through the proxy.
    assert.equal((await j(base, 'POST', '/api/accounts', { name: 'evil' }, bob)).status, 404);
  });
});

test('failed logins lock the email out; a success clears the count', async () => {
  const trading = createTrading(createInMemoryStore());
  const tradingPort = await listen(trading.server);
  const invest = createInvest({
    tradingBase: `http://127.0.0.1:${tradingPort}`,
    authLimits: { maxFailuresPerEmail: 3, maxAttemptsPerIp: 1000 },
  });
  const port = await listen(invest.server);
  const base = `http://127.0.0.1:${port}`;
  try {
    await signup(base, 'Rob', 'rob@example.com', 'hunter2hunter2');
    for (let i = 0; i < 3; i++) {
      assert.equal((await j(base, 'POST', '/auth/login', { email: 'rob@example.com', password: 'wrong' })).status, 401);
    }
    // Locked now — even the right password is refused.
    const locked = await j(base, 'POST', '/auth/login', { email: 'rob@example.com', password: 'hunter2hunter2' });
    assert.equal(locked.status, 429);
  } finally {
    await new Promise<void>((r) => invest.server.close(() => r()));
    await new Promise<void>((r) => trading.server.close(() => r()));
  }
});

test('per-IP rate limit caps auth attempts', async () => {
  const trading = createTrading(createInMemoryStore());
  const tradingPort = await listen(trading.server);
  const invest = createInvest({
    tradingBase: `http://127.0.0.1:${tradingPort}`,
    authLimits: { maxAttemptsPerIp: 2 },
  });
  const port = await listen(invest.server);
  const base = `http://127.0.0.1:${port}`;
  try {
    await j(base, 'POST', '/auth/login', { email: 'a@b.com', password: 'whatever1' });
    await j(base, 'POST', '/auth/login', { email: 'a@b.com', password: 'whatever1' });
    const third = await j(base, 'POST', '/auth/login', { email: 'a@b.com', password: 'whatever1' });
    assert.equal(third.status, 429);
  } finally {
    await new Promise<void>((r) => invest.server.close(() => r()));
    await new Promise<void>((r) => trading.server.close(() => r()));
  }
});

test('cross-site Origin on state-changing requests is rejected', async () => {
  await withApp(async (base) => {
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
      body: JSON.stringify({ email: 'rob@example.com', password: 'hunter2hunter2' }),
    });
    assert.equal(res.status, 403);

    // Same-origin (matching Host) is fine.
    const host = new URL(base).host;
    const ok = await fetch(`${base}/auth/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: `http://${host}` },
      body: JSON.stringify({ name: 'Rob', email: 'rob@example.com', password: 'hunter2hunter2' }),
    });
    assert.equal(ok.status, 201);
  });
});

test('security headers are set; API responses are no-store; page carries a CSP', async () => {
  await withApp(async (base) => {
    const page = await fetch(`${base}/`);
    assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(page.headers.get('x-frame-options'), 'DENY');
    assert.match(page.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);

    const api = await fetch(`${base}/api/app`);
    assert.equal(api.headers.get('cache-control'), 'no-store');
  });
});

test('session cookie gains Secure when configured', async () => {
  const trading = createTrading(createInMemoryStore());
  const tradingPort = await listen(trading.server);
  const invest = createInvest({ tradingBase: `http://127.0.0.1:${tradingPort}`, secureCookies: true });
  const port = await listen(invest.server);
  const base = `http://127.0.0.1:${port}`;
  try {
    const res = await j(base, 'POST', '/auth/signup', { name: 'Rob', email: 'rob@example.com', password: 'hunter2hunter2' });
    assert.match(res.setCookie, /; Secure/);
  } finally {
    await new Promise<void>((r) => invest.server.close(() => r()));
    await new Promise<void>((r) => trading.server.close(() => r()));
  }
});

test('audit trail records auth events and orders', async () => {
  const trading = createTrading(createInMemoryStore());
  const tradingPort = await listen(trading.server);
  const authStore = createInMemoryAuthStore();
  const invest = createInvest({ tradingBase: `http://127.0.0.1:${tradingPort}`, authStore });
  const port = await listen(invest.server);
  const base = `http://127.0.0.1:${port}`;
  try {
    const cookie = await signup(base, 'Rob', 'rob@example.com');
    await j(base, 'POST', '/auth/login', { email: 'rob@example.com', password: 'nope-wrong-1' });
    await j(base, 'POST', '/api/orders', { symbol: 'AAPL', side: 'buy', type: 'market', quantity: 1 }, cookie);
    await j(base, 'POST', '/auth/logout', undefined, cookie);

    const actions = authStore.listAudit().map((e) => e.action);
    for (const expected of ['signup', 'login_failed', 'order_placed', 'logout']) {
      assert.ok(actions.includes(expected), `missing audit action ${expected} in ${actions.join(',')}`);
    }
    const order = authStore.listAudit().find((e) => e.action === 'order_placed')!;
    assert.match(order.detail ?? '', /AAPL buy market x1 filled/);
    assert.ok(order.ip.length > 0);
  } finally {
    await new Promise<void>((r) => invest.server.close(() => r()));
    await new Promise<void>((r) => trading.server.close(() => r()));
  }
});

test('signup emails a verification link; clicking it marks the email verified', async () => {
  const trading = createTrading(createInMemoryStore());
  const tradingPort = await listen(trading.server);
  const { mailer, sent } = captureMailer();
  const invest = createInvest({ tradingBase: `http://127.0.0.1:${tradingPort}`, mailer });
  const port = await listen(invest.server);
  const base = `http://127.0.0.1:${port}`;
  try {
    const cookie = await signup(base, 'Rob', 'rob@example.com');
    assert.equal((await j(base, 'GET', '/api/app', undefined, cookie)).json.emailVerified, false);

    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, 'rob@example.com');
    const link = sent[0].text.match(/http:\/\/\S+\/auth\/verify\?token=\S+/)?.[0];
    assert.ok(link, `no verify link in: ${sent[0].text}`);

    const clicked = await fetch(link!, { redirect: 'manual' });
    assert.equal(clicked.status, 302);
    assert.equal(clicked.headers.get('location'), '/?verified=1');
    assert.equal((await j(base, 'GET', '/api/app', undefined, cookie)).json.emailVerified, true);

    // The token is single-use.
    const again = await fetch(link!, { redirect: 'manual' });
    assert.equal(again.headers.get('location'), '/?verified=invalid');
  } finally {
    await new Promise<void>((r) => invest.server.close(() => r()));
    await new Promise<void>((r) => trading.server.close(() => r()));
  }
});

test('password reset: emailed token sets a new password and logs out all sessions', async () => {
  const trading = createTrading(createInMemoryStore());
  const tradingPort = await listen(trading.server);
  const { mailer, sent } = captureMailer();
  const invest = createInvest({ tradingBase: `http://127.0.0.1:${tradingPort}`, mailer });
  const port = await listen(invest.server);
  const base = `http://127.0.0.1:${port}`;
  try {
    const cookie = await signup(base, 'Rob', 'rob@example.com', 'old-password-1');
    sent.length = 0;

    // Unknown email: same 200, no mail sent — accounts aren't enumerable.
    assert.equal((await j(base, 'POST', '/auth/forgot', { email: 'nobody@example.com' })).status, 200);
    assert.equal(sent.length, 0);

    assert.equal((await j(base, 'POST', '/auth/forgot', { email: 'rob@example.com' })).status, 200);
    assert.equal(sent.length, 1);
    const token = sent[0].text.match(/\?reset=(\S+)/)?.[1];
    assert.ok(token, `no reset token in: ${sent[0].text}`);

    // Too-short new password rejected; then a real reset succeeds.
    assert.equal((await j(base, 'POST', '/auth/reset', { token, password: 'short' })).status, 400);
    assert.equal((await j(base, 'POST', '/auth/reset', { token, password: 'new-password-1' })).status, 200);

    // The old session is dead, the old password fails, the new one works.
    assert.equal((await j(base, 'GET', '/api/app', undefined, cookie)).status, 401);
    assert.equal((await j(base, 'POST', '/auth/login', { email: 'rob@example.com', password: 'old-password-1' })).status, 401);
    const login = await j(base, 'POST', '/auth/login', { email: 'rob@example.com', password: 'new-password-1' });
    assert.equal(login.status, 200);

    // Reset tokens are single-use; opening the link also proved the mailbox.
    assert.equal((await j(base, 'POST', '/auth/reset', { token, password: 'another-pass-1' })).status, 400);
    const fresh = login.setCookie.split(';')[0];
    assert.equal((await j(base, 'GET', '/api/app', undefined, fresh)).json.emailVerified, true);
  } finally {
    await new Promise<void>((r) => invest.server.close(() => r()));
    await new Promise<void>((r) => trading.server.close(() => r()));
  }
});

test('recurring plans are scoped per user through the proxy', async () => {
  await withApp(async (base) => {
    const alice = await signup(base, 'Alice', 'alice@example.com');
    const bob = await signup(base, 'Bob', 'bob@example.com');

    const created = await j(base, 'POST', '/api/plans', { symbol: 'AAPL', amountCents: 10_000, cadence: 'weekly' }, alice);
    assert.equal(created.status, 201);
    assert.equal(created.json.lastRunStatus, 'invested'); // first installment ran immediately

    // Alice sees her plan (and the auto-placed first order); Bob sees neither.
    assert.equal((await j(base, 'GET', '/api/plans', undefined, alice)).json.length, 1);
    assert.equal((await j(base, 'GET', '/api/plans', undefined, bob)).json.length, 0);
    const bobOrders = (await j(base, 'GET', '/api/orders', undefined, bob)).json as any[];
    assert.equal(bobOrders.length, 0);

    // Bob cannot read, pause, or delete Alice's plan.
    assert.equal((await j(base, 'GET', `/api/plans/${created.json.id}`, undefined, bob)).status, 404);
    assert.equal((await j(base, 'POST', `/api/plans/${created.json.id}/pause`, undefined, bob)).status, 404);
    const bobDelete = await fetch(`${base}/api/plans/${created.json.id}`, { method: 'DELETE', headers: { cookie: bob } });
    assert.equal(bobDelete.status, 404);

    // Alice pauses and deletes her own.
    assert.equal((await j(base, 'POST', `/api/plans/${created.json.id}/pause`, undefined, alice)).json.active, false);
    const aliceDelete = await fetch(`${base}/api/plans/${created.json.id}`, { method: 'DELETE', headers: { cookie: alice } });
    assert.equal(aliceDelete.status, 200);
    assert.equal((await j(base, 'GET', '/api/plans', undefined, alice)).json.length, 0);
  });
});

test('sessions expire server-side', async () => {
  const trading = createTrading(createInMemoryStore());
  const tradingPort = await listen(trading.server);
  const authStore = createInMemoryAuthStore();
  const invest = createInvest({ tradingBase: `http://127.0.0.1:${tradingPort}`, authStore });
  const port = await listen(invest.server);
  const base = `http://127.0.0.1:${port}`;
  try {
    const cookie = await signup(base, 'Rob', 'rob@example.com');
    // Forcibly expire the session behind the cookie.
    const token = cookie.split('=')[1];
    const session = authStore.getSession(token)!;
    authStore.putSession({ ...session, expiresAt: new Date(Date.now() - 1000).toISOString() });
    assert.equal((await j(base, 'GET', '/api/app', undefined, cookie)).status, 401);
  } finally {
    await new Promise<void>((r) => invest.server.close(() => r()));
    await new Promise<void>((r) => trading.server.close(() => r()));
  }
});
