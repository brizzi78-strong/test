/**
 * Downstream provisioners — the orchestrator's clients for the HR services.
 *
 * A Provisioner knows how to (a) ensure a company exists in one service and
 * (b) create the person there, returning that service's id. The HTTP
 * implementation calls the real services; tests inject fakes. Each service maps
 * the normalized PersonInput to its own create-body, which is where the
 * per-service shape differences live.
 */

import type { PersonInput } from '../domain/types.ts';

export interface Provisioner {
  readonly service: string;
  ensureCompany(name: string): Promise<string>;
  createPerson(companyId: string, person: PersonInput): Promise<string>;
}

/** Per-service wiring: where to create a person, and how to shape the body. */
interface ServiceConfig {
  service: string;
  /** default upstream base URL (compose service name) */
  defaultBase: string;
  /** env var overriding the base URL */
  envKey: string;
  /** path that creates a person-like record */
  personPath: string;
  /** map the normalized identity to this service's create-body */
  personBody: (companyId: string, p: PersonInput) => Record<string, unknown>;
}

const SERVICES: readonly ServiceConfig[] = [
  {
    service: 'directory',
    defaultBase: 'http://directory:3600',
    envKey: 'DIRECTORY_URL',
    personPath: '/employees',
    personBody: (companyId, p) => ({
      companyId,
      firstName: p.firstName,
      lastName: p.lastName,
      workEmail: p.email,
      jobTitle: p.jobTitle,
      employmentType: p.employmentType,
      hireDate: p.hireDate,
    }),
  },
  {
    service: 'hirecheck',
    defaultBase: 'http://hirecheck:3000',
    envKey: 'HIRECHECK_URL',
    personPath: '/candidates',
    personBody: (companyId, p) => ({
      companyId,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
      position: p.jobTitle,
    }),
  },
  {
    service: 'myhr',
    defaultBase: 'http://myhr:3100',
    envKey: 'MYHR_URL',
    personPath: '/employees',
    personBody: (companyId, p) => ({
      companyId,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
      position: p.jobTitle,
      startDate: p.hireDate,
    }),
  },
  {
    service: 'training',
    defaultBase: 'http://training:3300',
    envKey: 'TRAINING_URL',
    personPath: '/learners',
    personBody: (companyId, p) => ({ companyId, firstName: p.firstName, lastName: p.lastName, email: p.email }),
  },
  {
    service: 'benefits',
    defaultBase: 'http://benefits:3400',
    envKey: 'BENEFITS_URL',
    personPath: '/employees',
    personBody: (companyId, p) => ({ companyId, firstName: p.firstName, lastName: p.lastName, email: p.email }),
  },
  {
    service: 'timeoff',
    defaultBase: 'http://timeoff:3700',
    envKey: 'TIMEOFF_URL',
    personPath: '/employees',
    personBody: (companyId, p) => ({ companyId, firstName: p.firstName, lastName: p.lastName, email: p.email }),
  },
];

async function postJson(
  url: string,
  body: unknown,
  fetchImpl: typeof fetch,
): Promise<Record<string, unknown>> {
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status >= 300) {
    const message = (json.error as { message?: string } | undefined)?.message ?? `HTTP ${res.status}`;
    throw new Error(`${url}: ${message}`);
  }
  return json;
}

function httpProvisioner(cfg: ServiceConfig, base: string, fetchImpl: typeof fetch): Provisioner {
  return {
    service: cfg.service,
    async ensureCompany(name: string): Promise<string> {
      const res = await postJson(`${base}/companies`, { name }, fetchImpl);
      return String(res.id);
    },
    async createPerson(companyId: string, person: PersonInput): Promise<string> {
      const res = await postJson(`${base}${cfg.personPath}`, cfg.personBody(companyId, person), fetchImpl);
      return String(res.id);
    },
  };
}

/** Build the HTTP provisioners for every wired service, honoring URL overrides. */
export function provisionersFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Provisioner[] {
  return SERVICES.map((cfg) => httpProvisioner(cfg, env[cfg.envKey] ?? cfg.defaultBase, fetchImpl));
}

/** The services the orchestrator provisions into, for docs/meta. */
export const WIRED_SERVICES: readonly string[] = SERVICES.map((s) => s.service);
