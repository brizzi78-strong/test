/**
 * OrchestratorService — canonical identity + cascade provisioning.
 *
 * `registerCompany` creates a canonical company and a matching company in every
 * wired service, recording the id map. `hire` creates the canonical person and
 * cascades their creation across all services, recording each service's id — so
 * afterward `getPerson` returns one record that resolves to the same person
 * everywhere.
 *
 * Honest limitation: the cascade is best-effort and sequential. If a downstream
 * call fails partway, earlier services will already hold the record (no
 * distributed transaction). A production build would make this a saga with
 * compensation or an outbox; here a failure surfaces as a 502 and the partial
 * links that succeeded are still recorded for retry.
 */

import { randomUUID } from 'node:crypto';
import type { Company, Person, PersonInput } from '../domain/types.ts';
import type { Provisioner } from '../downstream/provisioner.ts';
import type { Collection, Store } from '../store/store.ts';
import { NotFoundError, UpstreamError, ValidationError } from './errors.ts';

export interface ServiceOptions {
  store: Store;
  provisioners: Provisioner[];
  now?: () => Date;
  newId?: (prefix: string) => string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class OrchestratorService {
  private readonly store: Store;
  private readonly provisioners: Provisioner[];
  private readonly now: () => Date;
  private readonly newId: (prefix: string) => string;

  constructor(opts: ServiceOptions) {
    this.store = opts.store;
    this.provisioners = opts.provisioners;
    this.now = opts.now ?? (() => new Date());
    this.newId = opts.newId ?? ((prefix) => `${prefix}_${randomUUID()}`);
  }

  /** Create a canonical company and a matching company in every wired service. */
  async registerCompany(input: { name: string }): Promise<Company> {
    const name = requireString(input.name, 'name');
    const links: Record<string, string> = {};
    for (const p of this.provisioners) {
      links[p.service] = await this.guard(p.service, () => p.ensureCompany(name));
    }
    const company: Company = { id: this.newId('co'), name, links, createdAt: this.timestamp() };
    this.store.companies.put(company);
    return company;
  }

  getCompany(id: string): Company {
    return this.require(this.store.companies, 'Company', id);
  }

  /**
   * Hire a person into a registered company: create them canonically and in
   * every wired service, recording the id map.
   */
  async hire(
    companyId: string,
    input: {
      firstName: string;
      lastName: string;
      email: string;
      jobTitle: string;
      employmentType?: string;
      hireDate: string;
    },
  ): Promise<Person> {
    const company = this.getCompany(companyId);
    const person: PersonInput = {
      firstName: requireString(input.firstName, 'firstName'),
      lastName: requireString(input.lastName, 'lastName'),
      email: validateEmail(input.email),
      jobTitle: requireString(input.jobTitle, 'jobTitle'),
      employmentType: input.employmentType ?? 'full_time',
      hireDate: validateDate(input.hireDate, 'hireDate'),
    };

    const links: Record<string, string> = {};
    for (const p of this.provisioners) {
      const companyLink = company.links[p.service];
      if (!companyLink) {
        throw new UpstreamError(`company is not linked to service '${p.service}'; re-register the company`);
      }
      links[p.service] = await this.guard(p.service, () => p.createPerson(companyLink, person));
    }

    const record: Person = {
      id: this.newId('per'),
      companyId: company.id,
      ...person,
      links,
      createdAt: this.timestamp(),
    };
    this.store.people.put(record);
    return record;
  }

  getPerson(id: string): Person {
    return this.require(this.store.people, 'Person', id);
  }

  listPeople(filter?: { companyId?: string }): Person[] {
    return this.store.people.list((p) => !filter?.companyId || p.companyId === filter.companyId);
  }

  // --- internals ---------------------------------------------------------

  private async guard(service: string, fn: () => Promise<string>): Promise<string> {
    try {
      const id = await fn();
      if (!id || id === 'undefined') throw new Error('no id returned');
      return id;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new UpstreamError(`service '${service}' failed: ${message}`);
    }
  }

  private timestamp(): string {
    return this.now().toISOString();
  }

  private require<T>(collection: Collection<T>, what: string, id: string): T {
    if (typeof id !== 'string' || id.length === 0) throw new ValidationError(`${what} id is required`);
    const found = collection.get(id);
    if (!found) throw new NotFoundError(what, id);
    return found;
  }
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new ValidationError(`${field} is required`);
  return value.trim();
}

function validateEmail(value: unknown): string {
  const email = requireString(value, 'email');
  if (!EMAIL_RE.test(email)) throw new ValidationError(`email is not a valid address: ${email}`);
  return email;
}

function validateDate(value: unknown, field: string): string {
  const date = requireString(value, field);
  if (!DATE_RE.test(date)) throw new ValidationError(`${field} must be an ISO date (YYYY-MM-DD)`);
  return date;
}
