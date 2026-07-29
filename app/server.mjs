// Cardinal — a real, functional dating backend.
// Zero third-party vendors: only Node.js built-ins (http, node:sqlite, crypto).
// Run: node app/server.mjs   (listens on PORT, default 3000)

import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, normalize } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "public");
const DB_PATH = process.env.CARDINAL_DB || join(__dirname, "cardinal.db");
const PORT = Number(process.env.PORT) || 3000;

/* ----------------------------- Database ----------------------------- */
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    pass_hash TEXT NOT NULL,
    created INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    name TEXT NOT NULL DEFAULT '',
    age INTEGER,
    gender TEXT DEFAULT '',
    seeking TEXT DEFAULT '',
    city TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    prompt TEXT DEFAULT '',
    complete INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    created INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS likes (
    user_id INTEGER NOT NULL,
    target_id INTEGER NOT NULL,
    direction TEXT NOT NULL,
    created INTEGER NOT NULL,
    PRIMARY KEY (user_id, target_id)
  );
  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    a_id INTEGER NOT NULL,
    b_id INTEGER NOT NULL,
    created INTEGER NOT NULL,
    UNIQUE (a_id, b_id)
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL REFERENCES matches(id),
    sender_id INTEGER NOT NULL,
    body TEXT NOT NULL,
    created INTEGER NOT NULL
  );
`);

// Migration: verification fields. `verif` gates access to the community.
//   unverified -> in_review -> verified | rejected
// The transition out of `in_review` is where a background-check provider
// (e.g. the operator's own background-check company) returns its decision.
{
  const cols = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
  const add = (sql) => { try { db.exec(sql); } catch {} };
  if (!cols.includes("verif")) add("ALTER TABLE users ADD COLUMN verif TEXT NOT NULL DEFAULT 'unverified'");
  if (!cols.includes("legal_name")) add("ALTER TABLE users ADD COLUMN legal_name TEXT DEFAULT ''");
  if (!cols.includes("dob")) add("ALTER TABLE users ADD COLUMN dob TEXT DEFAULT ''");
  if (!cols.includes("consent_at")) add("ALTER TABLE users ADD COLUMN consent_at INTEGER");
  const pcols = db.prepare("PRAGMA table_info(profiles)").all().map((c) => c.name);
  if (!pcols.includes("photo")) add("ALTER TABLE profiles ADD COLUMN photo BLOB");
  if (!pcols.includes("photo_mime")) add("ALTER TABLE profiles ADD COLUMN photo_mime TEXT");
}

/* ----------------------------- Auth helpers ----------------------------- */
function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}
function verifyPassword(password, stored) {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const hash = scryptSync(password, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(hashHex, "hex");
  return hash.length === expected.length && timingSafeEqual(hash, expected);
}
function newToken() {
  return randomBytes(24).toString("hex");
}

const q = {
  userByEmail: db.prepare("SELECT * FROM users WHERE email = ?"),
  userById: db.prepare("SELECT * FROM users WHERE id = ?"),
  insertUser: db.prepare("INSERT INTO users (email, pass_hash, created) VALUES (?, ?, ?)"),
  insertProfile: db.prepare("INSERT INTO profiles (user_id, name) VALUES (?, ?)"),
  profileById: db.prepare("SELECT * FROM profiles WHERE user_id = ?"),
  updateProfile: db.prepare(
    `UPDATE profiles SET name=?, age=?, gender=?, seeking=?, city=?, bio=?, prompt=?, complete=1 WHERE user_id=?`
  ),
  insertSession: db.prepare("INSERT INTO sessions (token, user_id, created) VALUES (?, ?, ?)"),
  sessionByToken: db.prepare("SELECT * FROM sessions WHERE token = ?"),
  deleteSession: db.prepare("DELETE FROM sessions WHERE token = ?"),
  likeExists: db.prepare("SELECT direction FROM likes WHERE user_id=? AND target_id=?"),
  insertLike: db.prepare(
    "INSERT INTO likes (user_id, target_id, direction, created) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, target_id) DO UPDATE SET direction=excluded.direction"
  ),
  insertMatch: db.prepare("INSERT OR IGNORE INTO matches (a_id, b_id, created) VALUES (?, ?, ?)"),
  matchesFor: db.prepare("SELECT * FROM matches WHERE a_id=? OR b_id=? ORDER BY created DESC"),
  matchById: db.prepare("SELECT * FROM matches WHERE id=?"),
  insertMessage: db.prepare(
    "INSERT INTO messages (match_id, sender_id, body, created) VALUES (?, ?, ?, ?)"
  ),
  messagesFor: db.prepare("SELECT * FROM messages WHERE match_id=? ORDER BY created ASC"),
  submitVerif: db.prepare("UPDATE users SET verif='in_review', legal_name=?, dob=?, consent_at=? WHERE id=?"),
  setVerif: db.prepare("UPDATE users SET verif=? WHERE id=?"),
  setPhoto: db.prepare("UPDATE profiles SET photo=?, photo_mime=? WHERE user_id=?"),
  getPhoto: db.prepare("SELECT photo, photo_mime FROM profiles WHERE user_id=?"),
};

function createSession(userId) {
  const token = newToken();
  q.insertSession.run(token, userId, Date.now());
  return token;
}
function userFromReq(req) {
  const cookie = req.headers.cookie || "";
  const m = cookie.match(/(?:^|;\s*)sid=([a-f0-9]+)/);
  if (!m) return null;
  const s = q.sessionByToken.get(m[1]);
  if (!s) return null;
  return q.userById.get(s.user_id) || null;
}

/* ----------------------------- Realtime (SSE) ----------------------------- */
// Each connected member holds an open event-stream; we push live events to it.
const streams = new Map(); // userId -> Set<res>
function addStream(userId, res) {
  if (!streams.has(userId)) streams.set(userId, new Set());
  streams.get(userId).add(res);
}
function removeStream(userId, res) {
  const set = streams.get(userId);
  if (set) { set.delete(res); if (!set.size) streams.delete(userId); }
}
function pushEvent(userId, event, data) {
  const set = streams.get(userId);
  if (!set) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) { try { res.write(payload); } catch {} }
}
// Heartbeat keeps proxies from closing idle streams.
setInterval(() => {
  for (const set of streams.values()) for (const res of set) { try { res.write(":ping\n\n"); } catch {} }
}, 25000).unref();

/* ----------------------------- HTTP helpers ----------------------------- */
function send(res, status, body, headers = {}) {
  const data = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...headers });
  res.end(data);
}
function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 6e6) req.destroy(); // ~6MB, enough for a photo as base64
    });
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { resolve({}); }
    });
  });
}
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};
async function serveStatic(res, urlPath) {
  let rel = normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  if (rel === "/" || rel === "\\" || rel === "") rel = "/index.html";
  const file = join(PUBLIC, rel);
  if (!file.startsWith(PUBLIC)) return send(res, 403, { error: "forbidden" });
  try {
    const buf = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
    res.end(buf);
  } catch {
    // SPA fallback
    try {
      const buf = await readFile(join(PUBLIC, "index.html"));
      res.writeHead(200, { "Content-Type": MIME[".html"] });
      res.end(buf);
    } catch {
      send(res, 404, { error: "not found" });
    }
  }
}

function publicProfile(userId) {
  const p = q.profileById.get(userId);
  if (!p) return null;
  return { id: userId, name: p.name, age: p.age, gender: p.gender, seeking: p.seeking, city: p.city, bio: p.bio, prompt: p.prompt, photo: !!p.photo };
}
// The signed-in member's own profile, without the raw photo bytes.
function selfProfile(userId) {
  const p = q.profileById.get(userId) || {};
  return { name: p.name, age: p.age, gender: p.gender, seeking: p.seeking, city: p.city, bio: p.bio, prompt: p.prompt, complete: p.complete, photo: !!p.photo };
}

/* ----------------------------- API routes ----------------------------- */
async function api(req, res, path) {
  const method = req.method;

  if (path === "/api/signup" && method === "POST") {
    const { email, password, name } = await readBody(req);
    if (!email || !password || password.length < 6)
      return send(res, 400, { error: "Enter an email and a password of at least 6 characters." });
    if (q.userByEmail.get(email.toLowerCase()))
      return send(res, 409, { error: "That email is already registered. Try signing in." });
    const info = q.insertUser.run(email.toLowerCase(), hashPassword(password), Date.now());
    const uid = info.lastInsertRowid;
    q.insertProfile.run(uid, name || "");
    const token = createSession(uid);
    return send(res, 200, { ok: true, user: { id: uid, email } }, { "Set-Cookie": `sid=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000` });
  }

  if (path === "/api/login" && method === "POST") {
    const { email, password } = await readBody(req);
    const user = email ? q.userByEmail.get(email.toLowerCase()) : null;
    if (!user || !verifyPassword(password || "", user.pass_hash))
      return send(res, 401, { error: "Email or password is incorrect." });
    const token = createSession(user.id);
    return send(res, 200, { ok: true, user: { id: user.id, email: user.email } }, { "Set-Cookie": `sid=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000` });
  }

  if (path === "/api/logout" && method === "POST") {
    const cookie = req.headers.cookie || "";
    const m = cookie.match(/(?:^|;\s*)sid=([a-f0-9]+)/);
    if (m) q.deleteSession.run(m[1]);
    return send(res, 200, { ok: true }, { "Set-Cookie": "sid=; HttpOnly; Path=/; Max-Age=0" });
  }

  // Everything below requires auth.
  const user = userFromReq(req);
  if (!user) return send(res, 401, { error: "Please sign in." });

  if (path === "/api/me" && method === "GET") {
    return send(res, 200, {
      user: { id: user.id, email: user.email, verif: user.verif || "unverified" },
      profile: selfProfile(user.id),
    });
  }

  if (path === "/api/verify/submit" && method === "POST") {
    const { legalName, dob, consent } = await readBody(req);
    if (!legalName || !dob || !consent)
      return send(res, 400, { error: "Enter your legal name and date of birth, and agree to the background check." });
    q.submitVerif.run(String(legalName).slice(0, 100), String(dob).slice(0, 20), Date.now(), user.id);
    return send(res, 200, { ok: true, verif: "in_review" });
  }

  if (path === "/api/stream" && method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write("retry: 3000\n\n");
    addStream(user.id, res);
    req.on("close", () => removeStream(user.id, res));
    return; // stream stays open
  }

  // The community (discover, matching, messaging) is gated behind verification.
  const GATED = new Set(["/api/discover", "/api/like", "/api/matches", "/api/messages"]);
  if (GATED.has(path) && (user.verif || "unverified") !== "verified")
    return send(res, 403, { error: "Your account is still being verified.", verif: user.verif || "unverified" });

  if (path === "/api/profile" && method === "PUT") {
    const b = await readBody(req);
    if (!b.name || !b.age) return send(res, 400, { error: "Name and age are required." });
    q.updateProfile.run(
      String(b.name).slice(0, 60), Number(b.age) || null, String(b.gender || "").slice(0, 20),
      String(b.seeking || "").slice(0, 20), String(b.city || "").slice(0, 60),
      String(b.bio || "").slice(0, 600), String(b.prompt || "").slice(0, 300), user.id
    );
    return send(res, 200, { ok: true, profile: selfProfile(user.id) });
  }

  if (path === "/api/profile/photo" && method === "PUT") {
    const { dataUrl } = await readBody(req);
    const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || "");
    if (!m) return send(res, 400, { error: "Please choose a PNG, JPEG, or WebP image." });
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > 4_000_000) return send(res, 400, { error: "That image is too large (max ~4MB)." });
    q.setPhoto.run(buf, m[1], user.id);
    return send(res, 200, { ok: true });
  }

  if (path.startsWith("/api/photo/") && method === "GET") {
    const pid = Number(path.slice("/api/photo/".length));
    const row = pid ? q.getPhoto.get(pid) : null;
    if (!row || !row.photo) return send(res, 404, { error: "No photo." });
    res.writeHead(200, { "Content-Type": row.photo_mime || "image/jpeg", "Cache-Control": "private, max-age=60" });
    return res.end(Buffer.from(row.photo));
  }

  if (path === "/api/discover" && method === "GET") {
    // Other users with complete profiles that this user hasn't acted on yet.
    const rows = db.prepare(`
      SELECT p.user_id FROM profiles p
      JOIN users u ON u.id = p.user_id AND u.verif = 'verified'
      WHERE p.user_id != ? AND p.complete = 1
        AND p.user_id NOT IN (SELECT target_id FROM likes WHERE user_id = ?)
      ORDER BY p.user_id DESC LIMIT 50
    `).all(user.id, user.id);
    return send(res, 200, { profiles: rows.map((r) => publicProfile(r.user_id)).filter(Boolean) });
  }

  if (path === "/api/like" && method === "POST") {
    const { targetId, direction } = await readBody(req);
    const tId = Number(targetId);
    const dir = direction === "like" ? "like" : "pass";
    if (!tId || tId === user.id) return send(res, 400, { error: "Invalid target." });
    q.insertLike.run(user.id, tId, dir, Date.now());
    let matched = false;
    if (dir === "like") {
      const back = q.likeExists.get(tId, user.id);
      if (back && back.direction === "like") {
        const [a, b] = user.id < tId ? [user.id, tId] : [tId, user.id];
        q.insertMatch.run(a, b, Date.now());
        matched = true;
        pushEvent(tId, "match", { with: publicProfile(user.id) });
        pushEvent(user.id, "match", { with: publicProfile(tId) });
      }
    }
    return send(res, 200, { ok: true, matched });
  }

  if (path === "/api/matches" && method === "GET") {
    const rows = q.matchesFor.all(user.id, user.id);
    const out = rows.map((mt) => {
      const otherId = mt.a_id === user.id ? mt.b_id : mt.a_id;
      const msgs = q.messagesFor.all(mt.id);
      const last = msgs[msgs.length - 1];
      return { matchId: mt.id, since: mt.created, with: publicProfile(otherId), lastMessage: last ? last.body : null };
    });
    return send(res, 200, { matches: out });
  }

  if (path === "/api/messages" && method === "GET") {
    const url = new URL(req.url, "http://x");
    const matchId = Number(url.searchParams.get("matchId"));
    const mt = q.matchById.get(matchId);
    if (!mt || (mt.a_id !== user.id && mt.b_id !== user.id))
      return send(res, 403, { error: "Not your conversation." });
    const otherId = mt.a_id === user.id ? mt.b_id : mt.a_id;
    return send(res, 200, {
      with: publicProfile(otherId),
      messages: q.messagesFor.all(matchId).map((m) => ({ mine: m.sender_id === user.id, body: m.body, at: m.created })),
    });
  }

  if (path === "/api/messages" && method === "POST") {
    const { matchId, body } = await readBody(req);
    const mt = q.matchById.get(Number(matchId));
    if (!mt || (mt.a_id !== user.id && mt.b_id !== user.id))
      return send(res, 403, { error: "Not your conversation." });
    const text = String(body || "").trim().slice(0, 2000);
    if (!text) return send(res, 400, { error: "Message is empty." });
    q.insertMessage.run(mt.id, user.id, text, Date.now());
    const otherId = mt.a_id === user.id ? mt.b_id : mt.a_id;
    pushEvent(otherId, "message", { matchId: mt.id, from: publicProfile(user.id).name, body: text });
    return send(res, 200, { ok: true });
  }

  return send(res, 404, { error: "Unknown endpoint." });
}

/* ----------------------------- Server ----------------------------- */
const server = createServer(async (req, res) => {
  try {
    const path = req.url.split("?")[0];
    if (path.startsWith("/api/")) return await api(req, res, path);
    return await serveStatic(res, path);
  } catch (err) {
    send(res, 500, { error: "Server error." });
  }
});
server.listen(PORT, () => {
  console.log(`Cardinal running on http://localhost:${PORT}  (db: ${DB_PATH})`);
});
