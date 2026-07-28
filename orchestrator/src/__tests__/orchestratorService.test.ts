/**
 * Unit tests for the OrchestratorService cascade. A FakeProvisioner records the
 * calls it receives and returns synthetic ids (`${service}_ext_N`), so we can
 * assert the cascade order, the recorded link maps, and the failure behavior
 * without any network.
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import type { PersonInput } from '../domain/types.ts';
import type { Provisioner } from '../downstream/provisioner.ts';
import { OrchestratorService } from '../service/orchestratorService.ts';
import { createInMemoryStore, type Store } from '../store/store.ts';

class FakeProvisioner implements Provisioner {
  readonly service: string;
  companies: string[] = [];
  people: Array<{ companyId: string; person: PersonInput }> = [];
  private n = 0;
  private failOn?: 'company' | 'person';

  constructor(service: string, failOn?: 'company' | 'person') {
    this.service = service;
    this.failOn = failOn;
  }

  async ensureCompany(name: string): Promise<string> {
    if (this.failOn === 'company') throw new Error(`${this.service} company boom`);
    this.companies.push(name);
    return `${this.service}_co_${++this.n}`;
  }

  async createPerson(companyId: string, person: PersonInput): Promise<string> {
    if (this.failOn === 'person') throw new Error(`${this.service} person boom`);
    this.people.push({ companyId, person });
    return `${this.service}_ext_${++this.n}`;
  }
}

// Deterministic id + clock injection.
function fixed() {
  let seq = 0;
  return {
    now: () => new Date('2026-07-18T00:00:00.000Z'),
    newId: (prefix: string) => `${prefix}_${++seq}`,
  };
}

describe('OrchestratorService', () => {
  let store: Store;
  let directory: FakeProvisioner;
  let hirecheck: FakeProvisioner;
  let service: OrchestratorService;

  beforeEach(() => {
    store = createInMemoryStore();
    directory = new FakeProvisioner('directory');
    hirecheck = new FakeProvisioner('hirecheck');
    const { now, newId } = fixed();
    service = new OrchestratorService({ store, provisioners: [directory, hirecheck], now, newId });
  });

  const hireInput = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    jobTitle: 'Engineer',
    hireDate: '2026-08-01',
  };

  it('registerCompany cascades into every provisioner and records the link map', async () => {
    const company = await service.registerCompany({ name: 'Acme' });

    assert.equal(company.name, 'Acme');
    assert.deepEqual(company.links, { directory: 'directory_co_1', hirecheck: 'hirecheck_co_1' });
    assert.deepEqual(directory.companies, ['Acme']);
    assert.deepEqual(hirecheck.companies, ['Acme']);
    // Persisted and retrievable.
    assert.deepEqual(service.getCompany(company.id), company);
  });

  it('hire cascades across services with each company link and records external ids', async () => {
    const company = await service.registerCompany({ name: 'Acme' });
    const person = await service.hire(company.id, hireInput);

    assert.equal(person.companyId, company.id);
    assert.equal(person.employmentType, 'full_time'); // defaulted
    assert.deepEqual(person.links, { directory: 'directory_ext_2', hirecheck: 'hirecheck_ext_2' });

    // Each downstream got the *company's* link id, not the canonical id.
    assert.equal(directory.people[0].companyId, 'directory_co_1');
    assert.equal(hirecheck.people[0].companyId, 'hirecheck_co_1');
    assert.equal(directory.people[0].person.email, 'ada@example.com');

    assert.deepEqual(service.getPerson(person.id), person);
    assert.deepEqual(service.listPeople({ companyId: company.id }), [person]);
  });

  it('rejects an invalid email before any cascade', async () => {
    const company = await service.registerCompany({ name: 'Acme' });
    await assert.rejects(() => service.hire(company.id, { ...hireInput, email: 'nope' }), /valid address/);
    assert.equal(hirecheck.people.length, 0);
  });

  it('hire into an unknown company is a not_found', async () => {
    await assert.rejects(() => service.hire('missing', hireInput), /Company not found/);
  });

  it('a downstream failure during registerCompany surfaces as an upstream error (502)', async () => {
    const bad = new OrchestratorService({
      store: createInMemoryStore(),
      provisioners: [new FakeProvisioner('directory'), new FakeProvisioner('hirecheck', 'company')],
    });
    await assert.rejects(() => bad.registerCompany({ name: 'Acme' }), (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /hirecheck/);
      assert.equal((err as { status?: number }).status, 502);
      return true;
    });
  });

  it('a downstream failure during hire surfaces as an upstream error (502)', async () => {
    const s = createInMemoryStore();
    const good = new FakeProvisioner('directory');
    const bad = new FakeProvisioner('hirecheck', 'person');
    const svc = new OrchestratorService({ store: s, provisioners: [good, bad] });
    const company = await svc.registerCompany({ name: 'Acme' });
    await assert.rejects(() => svc.hire(company.id, hireInput), /hirecheck/);
    // Best-effort cascade: the earlier service already holds the record.
    assert.equal(good.people.length, 1);
  });

  it('hire fails cleanly if the company is missing a service link', async () => {
    // A company registered before a new provisioner was wired in.
    const company = await service.registerCompany({ name: 'Acme' });
    const withExtra = new OrchestratorService({
      store,
      provisioners: [directory, hirecheck, new FakeProvisioner('benefits')],
    });
    await assert.rejects(() => withExtra.hire(company.id, hireInput), /not linked to service 'benefits'/);
  });
});
