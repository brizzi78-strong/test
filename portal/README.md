# Cardinal HR — Admin Portal

The **usable app**. Everything else in this repo is a back-end service or an API;
this is the screen a human logs into. It's a single-page HR admin console —
register your company, hire employees, and click any employee to watch that one
canonical record resolve into every downstream service.

## Architecture — backend-for-frontend

The browser never talks to the orchestrator (or the gateway) directly. This
service is a **BFF**: one Node process that both

1. serves the self-contained single-page app (no external CSS/JS/fonts), and
2. exposes a small `/api/*` surface that proxies to the orchestrator
   **server-side**.

That keeps any API key off the client and means there's no CORS to configure —
the page and its API share an origin. It's the honest shape for a real admin
console, and it's still zero-dependency (`node:http` + `fetch`).

```
browser ── /  /api/* ──►  portal (BFF)  ── HTTP ──►  orchestrator  ──►  6 services
             (same origin)                (key server-side)
```

## Run it

```bash
npm start                 # or: node src/index.ts
npm test                  # node --test
npm run typecheck         # tsc --noEmit
```

Then open http://localhost:4000. It expects an orchestrator reachable at
`ORCHESTRATOR_URL` (default `http://orchestrator:3900`; for a local run, start the
orchestrator and its services and set `ORCHESTRATOR_URL=http://127.0.0.1:3900`).

| Env var | Purpose | Default |
|---|---|---|
| `PORT` | HTTP port | `4000` |
| `ORCHESTRATOR_URL` | Orchestrator base URL | `http://orchestrator:3900` |
| `GATEWAY_API_KEY` | Optional Bearer key sent upstream, kept off the browser | — |

## HTTP surface

| Method & path | Purpose |
|---|---|
| `GET /` | The admin single-page app. |
| `GET /health` | Liveness. |
| `GET /api/meta` | Services a hire cascades into. |
| `POST /api/companies` | Register a company (proxied). |
| `GET /api/companies/:id` | Fetch a company + its per-service links. |
| `POST /api/companies/:id/hire` | Hire + provision across services. |
| `GET /api/people?companyId=` | List employees. |
| `GET /api/people/:id` | One employee + the id they hold in each service. |

Upstream error statuses (400/404/502…) pass straight through, so the UI shows
the orchestrator's own message.

## Layout

- **`src/ui/page.ts`** — the entire SPA as one self-contained HTML string
  (Cardinal HR palette, light/dark, no external assets).
- **`src/upstream/orchestratorClient.ts`** — the only module that knows the
  orchestrator's wire shape; injectable (`fetch` + base URL + key), fakeable in
  tests.
- **`src/api/server.ts`** — the BFF: serves the page and maps `/api/*` to the
  client.
- **`src/index.ts`** — entry point.

## Scope

This is a **minimal, single-tenant admin console** — enough to make the platform
usable and to demonstrate the shared-identity payoff end-to-end. It deliberately
does not yet include user accounts/login, roles, or an employee/manager
self-service view; those ride on the "human auth" and "per-tenant isolation"
gaps still open elsewhere in the platform. The company selection lives in the
browser's `localStorage`, not a session.
