/**
 * Reverse-proxy a request to an upstream service, streaming the body both ways.
 *
 * Hop-by-hop headers are dropped, and any inbound X-Company-Id / X-Gateway-Tenant
 * headers are stripped and replaced with the gateway's own trusted values — so a
 * client can never spoof its tenant.
 */

import { request as httpRequest, type IncomingMessage, type ServerResponse } from 'node:http';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

const CLIENT_UNTRUSTED = new Set(['x-company-id', 'x-gateway-tenant', 'authorization', 'x-api-key']);

export function proxyRequest(
  req: IncomingMessage,
  res: ServerResponse,
  upstreamBase: string,
  path: string,
  inject: Record<string, string>,
): void {
  let target: URL;
  try {
    target = new URL(path, upstreamBase);
  } catch {
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: { code: 'bad_upstream', message: 'invalid upstream URL' } }));
    return;
  }

  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    const lk = k.toLowerCase();
    if (HOP_BY_HOP.has(lk) || CLIENT_UNTRUSTED.has(lk)) continue;
    if (typeof v === 'string') headers[k] = v;
    else if (Array.isArray(v)) headers[k] = v.join(', ');
  }
  Object.assign(headers, inject);

  const upstream = httpRequest(
    target,
    { method: req.method, headers },
    (upRes) => {
      res.writeHead(upRes.statusCode ?? 502, upRes.headers);
      upRes.pipe(res);
    },
  );
  upstream.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'bad_gateway', message: 'upstream unreachable' } }));
    } else {
      res.end();
    }
  });
  req.pipe(upstream);
}
