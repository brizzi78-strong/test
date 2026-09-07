/**
 * End-to-end over HTTP: drive the site the way the three pages do — create a
 * request, block a verifier until consent, record consent, then submit a
 * verification — and confirm the pages are served and the admin gate works.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { createApp } from '../api/server.ts';
import { createInMemoryStore } from '../store/store.ts';
import type { Notifier } from '../notify/notifier.ts';

const silent: Notifier = { kind: 'silent', async send() {} };

async function withServer(run: (base: string) => Promise<void>, opts?: { user?: string; password?: string }) {
  const { server } = createApp({ store: createInMemoryStore(), notifier: silent, ...opts });
  await new Promise<void>((r) => server.listen(0, r));
  const { port } = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
}

async function j(base: string, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as any };
}

test('serves the three pages', async () => {
  await withServer(async (base) => {
    assert.match(await (await fetch(`${base}/`)).text(), /Cardinal Verify/);
    assert.match(await (await fetch(`${base}/c/anything`)).text(), /Authorize verification/);
    assert.match(await (await fetch(`${base}/v/anything`)).text(), /Verification request/);
  });
});

test('full consent-gated flow over the API', async () => {
  await withServer(async (base) => {
    const co = (await j(base, 'POST', '/api/companies', { name: 'Blue Ridge Press LLC' })).json;
    const cand = (await j(base, 'POST', '/api/candidates', { companyId: co.id, firstName: 'Jordan', lastName: 'Rivera', email: 'jordan@example.com' })).json;
    const req = (await j(base, 'POST', '/api/requests', {
      companyId: co.id,
      candidateId: cand.id,
      items: [{ type: 'reference', subject: 'Pat Lee', contactEmail: 'pat@example.com' }],
    })).json;
    assert.equal(req.status, 'awaiting_consent');
    const itemToken = req.items[0].token;

    // The consent page can read its context; the verifier link is not active yet.
    const consentInfo = await j(base, 'GET', `/api/consent/${req.consentToken}`);
    assert.equal(consentInfo.json.companyName, 'Blue Ridge Press LLC');
    assert.equal(consentInfo.json.alreadyConsented, false);
    assert.equal((await j(base, 'GET', `/api/verify/${itemToken}`)).status, 409);

    // Candidate consents.
    assert.equal((await j(base, 'POST', `/api/consent/${req.consentToken}`, { signedName: 'Jordan Rivera' })).status, 200);

    // Now the verifier can load and submit.
    const ctx = await j(base, 'GET', `/api/verify/${itemToken}`);
    assert.equal(ctx.json.candidateName, 'Jordan Rivera');
    const done = await j(base, 'POST', `/api/verify/${itemToken}`, { verifierName: 'Pat Lee', confirmed: true, answers: { rehire: 'yes' } });
    assert.equal(done.json.requestCompleted, true);

    const view = await j(base, 'GET', `/api/requests/${req.id}`);
    assert.equal(view.json.request.status, 'completed');
    assert.equal(view.json.request.items[0].response.confirmed, true);
  });
});

test('admin is gated but consent/verify links stay public', async () => {
  await withServer(
    async (base) => {
      assert.equal((await fetch(`${base}/`)).status, 401); // console gated
      assert.equal((await fetch(`${base}/health`)).status, 200); // health open
      assert.equal((await fetch(`${base}/c/tok`)).status, 200); // consent page public
      assert.equal((await fetch(`${base}/v/tok`)).status, 200); // verifier page public
      const auth = { authorization: 'Basic ' + Buffer.from('admin:pw').toString('base64') };
      assert.equal((await j(base, 'POST', '/api/companies', { name: 'X' }, auth)).status, 201);
      assert.equal((await j(base, 'POST', '/api/companies', { name: 'X' })).status, 401);
    },
    { user: 'admin', password: 'pw' },
  );
});
