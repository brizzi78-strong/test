import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { createApp } from '../api/server.ts';

async function start() {
  const { server } = createApp();
  await new Promise<void>((r) => server.listen(0, r));
  const { port } = server.address() as AddressInfo;
  return { base: `http://127.0.0.1:${port}`, close: () => new Promise<void>((r) => server.close(() => r())) };
}

async function req(base: string, method: string, path: string, opts: { body?: unknown; auth?: [string, string] } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.auth) headers.authorization = 'Basic ' + Buffer.from(opts.auth.join(':')).toString('base64');
  const res = await fetch(`${base}${path}`, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
  return { status: res.status, json: (await res.json()) as any };
}

const clean = {
  molecularWeight: 180,
  logP: 1.2,
  hBondDonors: 1,
  hBondAcceptors: 4,
  rotatableBonds: 3,
  tpsa: 63,
  aromaticRings: 1,
};

test('the workbench page and health check are served', async () => {
  const { base, close } = await start();
  try {
    const page = await fetch(`${base}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Drug Discovery/);
    assert.equal((await req(base, 'GET', '/health')).json.status, 'ok');
  } finally {
    await close();
  }
});

test('a full flow over HTTP: program, target, candidate, screen, ranking', async () => {
  const { base, close } = await start();
  try {
    const program = (await req(base, 'POST', '/api/programs', { body: { name: 'BTK inhibitors', indication: 'RA' } })).json.id as string;
    const target = (await req(base, 'POST', '/api/targets', { body: { programId: program, name: 'BTK', kind: 'enzyme' } })).json.id as string;

    const created = await req(base, 'POST', '/api/compounds', {
      body: { programId: program, name: 'CPD-1', descriptors: clean, source: 'designed', targetId: target },
    });
    assert.equal(created.status, 201);
    assert.equal(created.json.stage, 'hit');
    assert.equal(created.json.drugLikeness.verdict, 'excellent');
    const compound = created.json.id as string;

    // evaluate-only endpoint scores without persisting
    const evalRes = await req(base, 'POST', '/api/evaluate', { body: { descriptors: clean } });
    assert.equal(evalRes.status, 200);
    assert.ok(evalRes.json.score >= 85);

    // record a potent screen and rank
    await req(base, 'POST', '/api/screens', { body: { compoundId: compound, targetId: target, metric: 'IC50', valueNanomolar: 3 } });
    const ranking = await req(base, 'GET', `/api/targets/${target}/ranking`);
    assert.equal(ranking.json[0].compound.id, compound);
    assert.equal(ranking.json[0].bestPotencyNanomolar, 3);

    // advance the pipeline
    const advanced = await req(base, 'POST', `/api/compounds/${compound}/advance`, { body: { stage: 'lead' } });
    assert.equal(advanced.json.stage, 'lead');

    // an illegal skip is a 409
    const skip = await req(base, 'POST', `/api/compounds/${compound}/advance`, { body: { stage: 'approved' } });
    assert.equal(skip.status, 409);
  } finally {
    await close();
  }
});

test('when a password gate is configured, the workbench requires it but /health stays open', async () => {
  const { server } = createApp({ user: 'admin', password: 'secret' });
  await new Promise<void>((r) => server.listen(0, r));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;
  try {
    assert.equal((await fetch(`${base}/`)).status, 401);
    assert.equal((await fetch(`${base}/health`)).status, 200);
    const ok = await req(base, 'GET', '/api/meta', { auth: ['admin', 'secret'] });
    assert.equal(ok.status, 200);
    const bad = await req(base, 'GET', '/api/meta', { auth: ['admin', 'wrong'] });
    assert.equal(bad.status, 401);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
});
