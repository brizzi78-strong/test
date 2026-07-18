/**
 * Service routing table: the first path segment selects the upstream service.
 * Defaults use the docker-compose service names; override any with an env var
 * (e.g. DIRECTORY_URL=http://127.0.0.1:3600) for local runs and tests.
 */

export type RouteTable = Record<string, string>;

export function routesFromEnv(env: NodeJS.ProcessEnv = process.env): RouteTable {
  return {
    recruiting: env.RECRUITING_URL ?? 'http://recruiting:3200',
    hirecheck: env.HIRECHECK_URL ?? 'http://hirecheck:3000',
    myhr: env.MYHR_URL ?? 'http://myhr:3100',
    training: env.TRAINING_URL ?? 'http://training:3300',
    benefits: env.BENEFITS_URL ?? 'http://benefits:3400',
    payroll: env.PAYROLL_URL ?? 'http://payroll:3500',
    directory: env.DIRECTORY_URL ?? 'http://directory:3600',
  };
}
