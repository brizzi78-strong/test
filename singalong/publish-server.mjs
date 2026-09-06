import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 10000);

const routes = new Map([
  ['/', 'index.html'],
  ['/index.html', 'index.html'],
  ['/demo', 'demo/index.html'],
  ['/demo/', 'demo/index.html'],
  ['/demo/index.html', 'demo/index.html'],
]);

const headers = {
  'Content-Security-Policy': "default-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; script-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-src 'self'; base-uri 'self'; form-action 'self' mailto:; frame-ancestors 'self'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function send(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, { ...headers, 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
  res.end(body);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');

  if (url.pathname === '/health') {
    return send(res, 200, 'ok\n');
  }

  const relative = routes.get(url.pathname);
  if (!relative) {
    return send(res, 404, 'Not found\n');
  }

  const path = normalize(join(here, relative));
  if (!path.startsWith(here)) {
    return send(res, 403, 'Forbidden\n');
  }

  try {
    const info = await stat(path);
    if (!info.isFile()) return send(res, 404, 'Not found\n');

    res.writeHead(200, {
      ...headers,
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    });
    createReadStream(path).pipe(res);
  } catch {
    send(res, 404, 'Not found\n');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Memory Care Music Program listening on :${port}`);
});
