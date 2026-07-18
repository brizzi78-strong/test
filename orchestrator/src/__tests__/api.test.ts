/**
 * End-to-end HTTP tests. The app is built with an in-memory store and fake
 * provisioners so the cascade runs deterministically over the real router,
 * without touching the network or the downstream services.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { createApp } from '../api/server.ts';
import type { PersonInput } from '../domain/types.ts';
import type { Provisioner } from '../downstream/provisioner.ts';
import { createInMemoryStore } from '../store/store.ts';

class FakeProvisioner implements Provisioner {
  readonly service: string;
  private n = 0;
  constructor(service: string) {
    this.service = service;
  }
  async ensureCompany(_name: string): Promise<string> {
    return `${this.service}_co_${++this.n}`;
  }
  async createPerson(_companyId: string, _person: PersonInput): Promise<string> {
    return `${this.service}_ext_${++this.n}`;
  }
}

async function startServer() {
  const provisioners = [new FakeProvisioner('directory'), new FakeProvisioner('myhr')];
  const { server } = createApp(createInMemoryStore(), provisioners);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;
  const close = () => new Promise<void>((resolve) => server.close(() => resolve()));
  return { base, close };
}

async function req(base: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as any };
}

const post = (base: string, path: string, body?: unknown) => req(base, 'POST', path, body);
const get = (base: string, path: string) => req(base, 'GET', path);

test('register a company and hire cascades into one resolvable record', async () => {
  const { base, close } = await startServer();
  try {
    const meta = await get(base, '/meta');
    assert.deepEqual(meta.json.wiredServices, ['directory', 'hirecheck', 'myhr', 'training', 'benefits', 'timeoff']);

    const company = await post(base, '/companies', { name: 'Globex' });
    assert.equal(company.status, 201);
    const companyId = company.json.id as string;
    assert.deepEqual(company.json.links, { directory: 'directory_co_1', myhr: 'myhr_co_1' });

    const hire = await post(base, `/companies/${companyId}/hire`, {
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@globex.com',
      jobTitle: 'Engineer',
      hireDate: '2026-09-01',
    });
    assert.equal(hire.status, 201);
    const personId = hire.json.id as string;
    assert.deepEqual(hire.json.links, { directory: 'directory_ext_2', myhr: 'myhr_ext_2' });

    const fetched = await get(base, `/people/${personId}`);
    assert.equal(fetched.status, 200);
    assert.equal(fetched.json.email, 'grace@globex.com');

    const list = await get(base, `/people?companyId=${companyId}`);
    assert.equal(list.json.length, 1);
    assert.equal(list.json[0].id, personId);
  } finally {
    await close();
  }
});

test('validation and not-found errors map to proper status codes', async () => {
  const { base, close } = await startServer();
  try {
    const bad = await post(base, '/companies', {});
    assert.equal(bad.status, 400);
    assert.equal(bad.json.error.code, 'validation');

    const missing = await get(base, '/companies/nope');
    assert.equal(missing.status, 404);

    const company = await post(base, '/companies', { name: 'Initech' });
    const badHire = await post(base, `/companies/${company.json.id}/hire`, {
      firstName: 'Peter',
      lastName: 'Gibbons',
      email: 'not-an-email',
      jobTitle: 'Engineer',
      hireDate: '2026-09-01',
    });
    assert.equal(badHire.status, 400);
  } finally {
    await close();
  }
});
