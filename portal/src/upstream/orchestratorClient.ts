/**
 * Client for the orchestrator's HTTP API. The portal is a backend-for-frontend:
 * the browser never talks to the orchestrator (or the gateway) directly, so any
 * API key stays server-side and there's no CORS to configure. This module is the
 * single place that knows the orchestrator's wire shape; tests inject a fake.
 */

export interface Company {
  id: string;
  name: string;
  links: Record<string, string>;
  createdAt: string;
}

export interface Person {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  employmentType: string;
  hireDate: string;
  links: Record<string, string>;
  createdAt: string;
}

export interface HireInput {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  hireDate: string;
  employmentType?: string;
}

export interface OrchestratorClient {
  meta(): Promise<{ wiredServices: string[] }>;
  registerCompany(name: string): Promise<Company>;
  getCompany(id: string): Promise<Company>;
  hire(companyId: string, input: HireInput): Promise<Person>;
  listPeople(companyId?: string): Promise<Person[]>;
  getPerson(id: string): Promise<Person>;
}

/** An upstream call failed; carries the status so the BFF can pass it through. */
export class UpstreamError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'UpstreamError';
    this.status = status;
  }
}

export interface HttpClientOptions {
  baseUrl?: string;
  /** Optional gateway API key, sent as a Bearer token, kept off the browser. */
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

export function httpOrchestratorClient(opts: HttpClientOptions = {}): OrchestratorClient {
  const baseUrl = (opts.baseUrl ?? 'http://orchestrator:3900').replace(/\/$/, '');
  const fetchImpl = opts.fetchImpl ?? fetch;

  async function call(method: string, path: string, body?: unknown): Promise<unknown> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (opts.apiKey) headers.authorization = `Bearer ${opts.apiKey}`;
    let res: Response;
    try {
      res = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new UpstreamError(502, `orchestrator unreachable: ${message}`);
    }
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.status >= 300) {
      const message = (json.error as { message?: string } | undefined)?.message ?? `HTTP ${res.status}`;
      throw new UpstreamError(res.status, message);
    }
    return json;
  }

  return {
    meta: () => call('GET', '/meta') as Promise<{ wiredServices: string[] }>,
    registerCompany: (name) => call('POST', '/companies', { name }) as Promise<Company>,
    getCompany: (id) => call('GET', `/companies/${encodeURIComponent(id)}`) as Promise<Company>,
    hire: (companyId, input) =>
      call('POST', `/companies/${encodeURIComponent(companyId)}/hire`, input) as Promise<Person>,
    listPeople: (companyId) =>
      call('GET', `/people${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''}`) as Promise<Person[]>,
    getPerson: (id) => call('GET', `/people/${encodeURIComponent(id)}`) as Promise<Person>,
  };
}

/** Build the client from the environment (ORCHESTRATOR_URL, GATEWAY_API_KEY). */
export function clientFromEnv(env: NodeJS.ProcessEnv = process.env): OrchestratorClient {
  return httpOrchestratorClient({ baseUrl: env.ORCHESTRATOR_URL, apiKey: env.GATEWAY_API_KEY });
}
