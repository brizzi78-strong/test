import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../api/server.ts';

async function withServer(fn: (base: string) => Promise<void>): Promise<void> {
  const { server } = createApp({ client: null });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test('GET / serves the chat UI', () =>
  withServer(async (base) => {
    const res = await fetch(base + '/');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /text\/html/);
    assert.match(await res.text(), /Cardinal/);
  }));

test('GET /health reports key status', () =>
  withServer(async (base) => {
    const res = await fetch(base + '/health');
    assert.equal(res.status, 200);
    const body = (await res.json()) as { ok: boolean; keyConfigured: boolean };
    assert.equal(body.ok, true);
    assert.equal(body.keyConfigured, false);
  }));

test('POST /api/chat without a key returns 503', () =>
  withServer(async (base) => {
    const res = await fetch(base + '/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
    });
    assert.equal(res.status, 503);
    const body = (await res.json()) as { error: string };
    assert.match(body.error, /API key/);
  }));

test('unknown routes return 404', () =>
  withServer(async (base) => {
    const res = await fetch(base + '/nope');
    assert.equal(res.status, 404);
  }));
