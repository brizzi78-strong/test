import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { createInMemoryKeyStore, type ApiKey } from '../auth.ts';
import { createGateway } from '../gateway.ts';
import { createTokenBucket, type RateLimiter } from '../rateLimit.ts';

/** A fake upstream that echoes the method, path, and the injected tenant header. */
async function startUpstream(): Promise<{ base: string; server: Server; close: () => Promise<void> }> {
  const server = createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        method: req.method,
        path: req.url,
        companyId: req.headers['x-company-id'] ?? null,
        authenticated: req.headers['x-gateway-authenticated'] ?? null,
        // echo back whether a spoofed header made it through (it must not)
        sawClientTenant: req.headers['x-gateway-tenant'] ?? null,
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  return {
    base: `http://127.0.0.1:${port}`,
    server,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

async function startGateway(opts: {
  keyStore: ReturnType<typeof createInMemoryKeyStore>;
  upstreamBase: string;
  rateLimiter?: RateLimiter;
  adminToken?: string;
}) {
  const gw = createGateway({
    keyStore: opts.keyStore,
    routes: { directory: opts.upstreamBase },
    rateLimiter: opts.rateLimiter ?? createTokenBucket(1000),
    adminToken: opts.adminToken,
  });
  await new Promise<void>((resolve) => gw.listen(0, resolve));
  const { port } = gw.address() as AddressInfo;
  return {
    base: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => gw.close(() => resolve())),
  };
}

function seedKey(store: ReturnType<typeof createInMemoryKeyStore>, key: string, companyId: string): ApiKey {
  const entry: ApiKey = { key, companyId, name: 'test', createdAt: '2026-01-01T00:00:00.000Z' };
  store.put(entry);
  return entry;
}

test('health needs no auth', async () => {
  const up = await startUpstream();
  const store = createInMemoryKeyStore();
  const gw = await startGateway({ keyStore: store, upstreamBase: up.base });
  try {
    const res = await fetch(`${gw.base}/health`);
    assert.equal(res.status, 200);
    assert.equal(((await res.json()) as any).status, 'ok');
  } finally {
    await gw.close();
    await up.close();
  }
});

test('a request without a key is rejected 401', async () => {
  const up = await startUpstream();
  const store = createInMemoryKeyStore();
  const gw = await startGateway({ keyStore: store, upstreamBase: up.base });
  try {
    const res = await fetch(`${gw.base}/directory/employees`);
    assert.equal(res.status, 401);
  } finally {
    await gw.close();
    await up.close();
  }
});

test('a valid key is proxied with the tenant injected and path stripped', async () => {
  const up = await startUpstream();
  const store = createInMemoryKeyStore();
  seedKey(store, 'chr_test', 'co_42');
  const gw = await startGateway({ keyStore: store, upstreamBase: up.base });
  try {
    // Try to spoof the tenant header — the gateway must overwrite it.
    const res = await fetch(`${gw.base}/directory/employees/123?q=1`, {
      headers: { authorization: 'Bearer chr_test', 'x-gateway-tenant': 'co_hacker' },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.path, '/employees/123?q=1'); // /directory stripped
    assert.equal(body.companyId, 'co_42'); // tenant resolved from the key
    assert.equal(body.sawClientTenant, 'co_42'); // spoof overwritten, not 'co_hacker'
    assert.equal(body.authenticated, 'true');
  } finally {
    await gw.close();
    await up.close();
  }
});

test('X-API-Key header also authenticates', async () => {
  const up = await startUpstream();
  const store = createInMemoryKeyStore();
  seedKey(store, 'chr_test', 'co_1');
  const gw = await startGateway({ keyStore: store, upstreamBase: up.base });
  try {
    const res = await fetch(`${gw.base}/directory/health`, { headers: { 'x-api-key': 'chr_test' } });
    assert.equal(res.status, 200);
  } finally {
    await gw.close();
    await up.close();
  }
});

test('unknown service returns 404', async () => {
  const up = await startUpstream();
  const store = createInMemoryKeyStore();
  seedKey(store, 'chr_test', 'co_1');
  const gw = await startGateway({ keyStore: store, upstreamBase: up.base });
  try {
    const res = await fetch(`${gw.base}/nope/x`, { headers: { authorization: 'Bearer chr_test' } });
    assert.equal(res.status, 404);
  } finally {
    await gw.close();
    await up.close();
  }
});

test('rate limiting returns 429 once the bucket is empty', async () => {
  const up = await startUpstream();
  const store = createInMemoryKeyStore();
  seedKey(store, 'chr_test', 'co_1');
  // burst of 1, no refill within the test window
  const gw = await startGateway({
    keyStore: store,
    upstreamBase: up.base,
    rateLimiter: createTokenBucket(1, 1, () => 1000),
  });
  try {
    const h = { authorization: 'Bearer chr_test' };
    assert.equal((await fetch(`${gw.base}/directory/health`, { headers: h })).status, 200);
    assert.equal((await fetch(`${gw.base}/directory/health`, { headers: h })).status, 429);
  } finally {
    await gw.close();
    await up.close();
  }
});

test('admin key issuance requires the admin token', async () => {
  const up = await startUpstream();
  const store = createInMemoryKeyStore();
  const gw = await startGateway({ keyStore: store, upstreamBase: up.base, adminToken: 'secret' });
  try {
    // no token -> 403
    const bad = await fetch(`${gw.base}/admin/keys`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ companyId: 'co_9', name: 'Acme' }),
    });
    assert.equal(bad.status, 403);

    // with token -> 201 and a usable key
    const ok = await fetch(`${gw.base}/admin/keys`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-admin-token': 'secret' },
      body: JSON.stringify({ companyId: 'co_9', name: 'Acme' }),
    });
    assert.equal(ok.status, 201);
    const issued = (await ok.json()) as any;
    assert.ok(String(issued.key).startsWith('chr_'));

    const proxied = await fetch(`${gw.base}/directory/health`, { headers: { authorization: `Bearer ${issued.key}` } });
    assert.equal(proxied.status, 200);
    assert.equal(((await proxied.json()) as any).companyId, 'co_9');
  } finally {
    await gw.close();
    await up.close();
  }
});
