/**
 * BFF tests. A FakeClient stands in for the orchestrator so the portal's
 * `/api/*` endpoints and page serving are exercised end-to-end over real HTTP,
 * without the orchestrator or any downstream service running.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { createApp } from '../api/server.ts';
import {
  UpstreamError,
  type Company,
  type HireInput,
  type OrchestratorClient,
  type Person,
} from '../upstream/orchestratorClient.ts';

class FakeClient implements OrchestratorClient {
  private companies = new Map<string, Company>();
  private people: Person[] = [];
  private n = 0;
  readonly services = ['directory', 'hirecheck', 'myhr'];

  async meta() {
    return { wiredServices: this.services };
  }
  async registerCompany(name: string): Promise<Company> {
    if (!name.trim()) throw new UpstreamError(400, 'name is required');
    const id = `co_${++this.n}`;
    const links = Object.fromEntries(this.services.map((s) => [s, `${s}_co_${this.n}`]));
    const co: Company = { id, name, links, createdAt: '2026-07-18T00:00:00.000Z' };
    this.companies.set(id, co);
    return co;
  }
  async getCompany(id: string): Promise<Company> {
    const co = this.companies.get(id);
    if (!co) throw new UpstreamError(404, `Company not found: ${id}`);
    return co;
  }
  async hire(companyId: string, input: HireInput): Promise<Person> {
    await this.getCompany(companyId);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new UpstreamError(400, 'bad email');
    const id = `per_${++this.n}`;
    const links = Object.fromEntries(this.services.map((s) => [s, `${s}_ext_${this.n}`]));
    const p: Person = {
      id,
      companyId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      jobTitle: input.jobTitle,
      employmentType: input.employmentType ?? 'full_time',
      hireDate: input.hireDate,
      links,
      createdAt: '2026-07-18T00:00:00.000Z',
    };
    this.people.push(p);
    return p;
  }
  async listPeople(companyId?: string): Promise<Person[]> {
    return this.people.filter((p) => !companyId || p.companyId === companyId);
  }
  async getPerson(id: string): Promise<Person> {
    const p = this.people.find((x) => x.id === id);
    if (!p) throw new UpstreamError(404, `Person not found: ${id}`);
    return p;
  }
}

async function start() {
  const { server } = createApp({ client: new FakeClient() });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;
  return { base, close: () => new Promise<void>((r) => server.close(() => r())) };
}

async function req(base: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = undefined;
  try {
    json = JSON.parse(text);
  } catch {
    /* not json (the HTML page) */
  }
  return { status: res.status, json, text, contentType: res.headers.get('content-type') ?? '' };
}

test('serves the self-contained admin page at /', async () => {
  const { base, close } = await start();
  try {
    const res = await req(base, 'GET', '/');
    assert.equal(res.status, 200);
    assert.match(res.contentType, /text\/html/);
    assert.match(res.text, /Cardinal HR — Admin Console/);
    // No external asset references — fully self-contained.
    assert.doesNotMatch(res.text, /src="https?:|href="https?:\/\/[^"]*\.css/);
  } finally {
    await close();
  }
});

test('health endpoint responds ok', async () => {
  const { base, close } = await start();
  try {
    const res = await req(base, 'GET', '/health');
    assert.equal(res.status, 200);
    assert.equal(res.json.status, 'ok');
  } finally {
    await close();
  }
});

test('register a company, hire, and resolve one record across services', async () => {
  const { base, close } = await start();
  try {
    const meta = await req(base, 'GET', '/api/meta');
    assert.deepEqual(meta.json.wiredServices, ['directory', 'hirecheck', 'myhr']);

    const co = await req(base, 'POST', '/api/companies', { name: 'Globex' });
    assert.equal(co.status, 201);
    const companyId = co.json.id as string;
    assert.equal(Object.keys(co.json.links).length, 3);

    const hire = await req(base, 'POST', `/api/companies/${companyId}/hire`, {
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@globex.com',
      jobTitle: 'Engineer',
      hireDate: '2026-09-01',
      employmentType: 'full_time',
    });
    assert.equal(hire.status, 201);
    const personId = hire.json.id as string;

    const list = await req(base, 'GET', `/api/people?companyId=${companyId}`);
    assert.equal(list.json.length, 1);
    assert.equal(list.json[0].id, personId);

    const person = await req(base, 'GET', `/api/people/${personId}`);
    assert.equal(person.status, 200);
    // The single record resolves into every wired service.
    assert.deepEqual(Object.keys(person.json.links), ['directory', 'hirecheck', 'myhr']);
  } finally {
    await close();
  }
});

test('upstream error statuses pass through the BFF', async () => {
  const { base, close } = await start();
  try {
    const bad = await req(base, 'POST', '/api/companies', { name: '' });
    assert.equal(bad.status, 400);
    assert.equal(bad.json.error.message, 'name is required');

    const missing = await req(base, 'GET', '/api/companies/nope');
    assert.equal(missing.status, 404);

    const co = await req(base, 'POST', '/api/companies', { name: 'Initech' });
    const badHire = await req(base, 'POST', `/api/companies/${co.json.id}/hire`, {
      firstName: 'Peter',
      lastName: 'Gibbons',
      email: 'nope',
      jobTitle: 'Engineer',
      hireDate: '2026-09-01',
    });
    assert.equal(badHire.status, 400);
  } finally {
    await close();
  }
});
