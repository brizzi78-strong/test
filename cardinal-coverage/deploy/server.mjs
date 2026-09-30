// Cardinal Coverage — gated static server.
//
// Serves cardinal-coverage/app/ behind HTTP Basic auth. Zero dependencies, run
// directly under Node 22, same shape as the other Cardinal services.
//
//   CC_USER      username (default "cardinal")
//   CC_PASSWORD  required — the service refuses to start without one
//   PORT         set by Render
//
// Everything except /health is gated. The tools hold resident data in the
// browser, so this must never be reachable without a credential, and must never
// be indexed.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { timingSafeEqual } from "node:crypto";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../app", import.meta.url)));
const PORT = Number(process.env.PORT) || 8080;
const USER = process.env.CC_USER || "cardinal";
const PASS = process.env.CC_PASSWORD || "";

if (!PASS) {
  console.error("CC_PASSWORD is not set — refusing to start an ungated service.");
  process.exit(1);
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".mjs":  "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".ico":  "image/x-icon",
  ".txt":  "text/plain; charset=utf-8",
};

/** Constant-time compare that does not leak length. */
function safeEqual(a, b) {
  const ab = Buffer.from(String(a), "utf8");
  const bb = Buffer.from(String(b), "utf8");
  if (ab.length !== bb.length) {
    // Still burn a comparison so failures cost the same.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

function authorised(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Basic ")) return false;
  let decoded;
  try { decoded = Buffer.from(header.slice(6), "base64").toString("utf8"); }
  catch { return false; }
  const i = decoded.indexOf(":");
  if (i < 0) return false;
  const okUser = safeEqual(decoded.slice(0, i), USER);
  const okPass = safeEqual(decoded.slice(i + 1), PASS);
  return okUser && okPass;         // both always evaluated
}

function securityHeaders(res) {
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");
  // The tools are self-contained: no external scripts, styles, fonts or images.
  res.setHeader("Content-Security-Policy",
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; " +
    "img-src data:; form-action 'none'; base-uri 'none'; frame-ancestors 'none'");
}

const server = createServer(async (req, res) => {
  securityHeaders(res);

  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("ok");
  }

  if (!authorised(req)) {
    res.writeHead(401, {
      "WWW-Authenticate": 'Basic realm="Cardinal Coverage", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
    });
    return res.end("Authentication required.");
  }

  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, "http://x").pathname); }
  catch { res.writeHead(400); return res.end("Bad request"); }

  if (pathname === "/") pathname = "/index.html";

  // Resolve inside ROOT and verify — no traversal out of the app directory.
  const target = resolve(join(ROOT, normalize(pathname)));
  if (target !== ROOT && !target.startsWith(ROOT + "/")) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    return res.end("Forbidden");
  }

  try {
    const info = await stat(target);
    if (!info.isFile()) throw new Error("not a file");
    const body = await readFile(target);
    res.writeHead(200, {
      "Content-Type": TYPES[extname(target).toLowerCase()] || "application/octet-stream",
      "Content-Length": body.length,
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!doctype html><meta charset="utf-8"><title>Not found</title>
      <body style="font:16px system-ui;padding:3rem;max-width:40rem;margin:auto">
      <h1>Not found</h1><p><a href="/">Back to Cardinal Coverage</a></p>`);
  }
});

server.listen(PORT, () => console.log(`Cardinal Coverage (gated) on :${PORT}, serving ${ROOT}`));
